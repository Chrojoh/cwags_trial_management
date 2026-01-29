'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import * as XLSX from 'xlsx-js-style';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getDivisionColor } from '@/lib/divisionUtils';
import { logSubstitution } from '@/lib/journalLogger';
import { getClassOrder } from '@/lib/cwagsClassNames';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import DigitalScoreEntry from '@/components/trials/DigitalScoreEntry';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
 import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdownMenu';
import { 
  Users, 
  FileText,
  FileDown,
  Printer,
  Edit,
  Save,
  X,
  CheckCircle,
  Download,
  Upload,
  MoreVertical,
  GripVertical,
  RefreshCw,
  Settings,
  Trash2,
  Eye,
  AlertTriangle,
  Loader2,
  AlertCircle,
  Calendar,
  DollarSign,
  Clock,
  Trophy
} from 'lucide-react';
import { simpleTrialOperations } from '@/lib/trialOperationsSimple';

interface Trial {
  id: string;
  trial_name: string;
  club_name: string;
  location: string;
  start_date: string;
  end_date: string;
}

interface TrialClass {
  id: string;                    // This will be the ROUND ID
  class_id?: string;             // Store original class ID
  round_number?: number;         // Round number
  class_name: string;
  class_type: string;
  games_subclass?: string | null;
  judge_name: string;
  trial_date: string;
  trial_day_id: string;
  entry_fee: number;
  feo_price?: number;
  feo_available: boolean;
  max_entries: number;
  class_level?: string;
  class_order?: number;
  class_status?: string;
  // ✅ ADD THIS: Array of rounds for displaying round numbers
  trial_rounds?: Array<{
    id: string;
    round_number: number;
    judge_name?: string;
  }>;
}

interface TrialRound {
  id: string;
  round_number: number;
  judge_name: string;
  trial_class_id: string;
  feo_available: boolean; // This field determines if feo shows
  trial_classes?: {
    class_name: string;
    class_level: string;
    class_type: string;
    games_subclass?: string;
    entry_fee: number;
    feo_price?: number;
    trial_days?: {
      day_number: number;
      trial_date: string;
        };
  };
}

interface ClassEntry {
  id: string;
  entry_id: string;
  running_position: number;
  entry_type: string;
  entry_status: string;
  round_number: number;
  round_id: string;
  division?: string | null;
  jump_height?: string | null;
  fee: number;
  entries: {
    handler_name: string;
    dog_call_name: string;
    cwags_number: string;
  };
  trial_rounds: {
    judge_name: string;
    trial_classes: {
      class_name: string;
      class_type: string;
      games_subclass?: string | null;
    };
  };
  scores?: Array<{
    id?: string;
    scent1?: string | null;
    scent2?: string | null;
    scent3?: string | null;
    scent4?: string | null;
    fault1?: string | null;
    fault2?: string | null;
    time_seconds?: number | null;
    numerical_score?: number | null;
    pass_fail?: string | null;
    entry_status?: string | null;
    judge_notes?: string | null;
  }>;
}

// New helper functions for rally/obedience scoring
const getPassingScore = (className: string): number => {
  if (className.toLowerCase().includes('obedience 5')) {
    return 120;
  }
  return 70;
};

const isRallyOrObedienceClass = (classType: string, className: string): boolean => {
  return classType === 'rally' || className.toLowerCase().includes('obedience');
};

// Updated display result function
const getDisplayResult = (entry: ClassEntry, selectedClass: TrialClass | null): string => {
  // ✅ FIX: Normalize scores to always be an array with proper typing
  const scoresArray: Array<{
    scent1?: string | null;
    scent2?: string | null;
    scent3?: string | null;
    scent4?: string | null;
    fault1?: string | null;
    fault2?: string | null;
    time_seconds?: number | null;
    numerical_score?: number | null;
    pass_fail?: string | null;
    entry_status?: string | null;
    judge_notes?: string | null;
  }> = Array.isArray(entry.scores) 
    ? entry.scores 
    : (entry.scores && typeof entry.scores === 'object')
      ? [entry.scores] 
      : [];
  
  const score = scoresArray[0]; // Now safely get first score
  
  // Check if dog is marked as No Show or Absent - show "Abs"
  if (entry.entry_status === 'no_show' || 
      entry.entry_status === 'absent' || 
      score?.entry_status === 'no_show' ||
      score?.entry_status === 'absent' ||
      score?.pass_fail === 'Abs') {
    return 'Abs';
  }
  
  // CHECK FOR FEO FIRST - regardless of class type or score
  if (entry.entry_type === 'feo' || score?.pass_fail === 'FEO') {
    return 'FEO';
  }
  
  // Handle Rally and Obedience scoring
  if (selectedClass && isRallyOrObedienceClass(selectedClass.class_type, selectedClass.class_name)) {
    if (score?.numerical_score !== null && score?.numerical_score !== undefined) {
      const passingScore = getPassingScore(selectedClass.class_name);
      
      // Regular entries that pass show the score
      if (score.numerical_score >= passingScore && score.pass_fail === 'Pass') {
        return score.numerical_score.toString();
      }
      // Regular entries that don't pass show "NQ"
      else {
        return 'NQ';
      }
    }
    return '-'; // No score yet
  }
  
  // Normal scoring logic for other class types (scent, games)
  // Check if it's a Games subclass result FIRST
  const gamesSubclasses = ['GB', 'BJ', 'T', 'P', 'C'];
  if (score && gamesSubclasses.includes(score.pass_fail || '')) {
    return score.pass_fail || '-';
  }

  if (score?.pass_fail === 'Pass') {
    return 'Pass';
  } else if (score?.pass_fail === 'Fail') {
    return 'Fail';
  }
  
  // No score yet
  return '-';
};

const canScore = (entry: ClassEntry): boolean => {
  const isNoShow = entry.entry_status === 'no_show' || 
                   entry.entry_status === 'absent' ||
                   entry.entry_status === 'withdrawn';
  return !isNoShow;
};

const getResultBadgeClass = (result: string): string => {
  switch (result) {
    case 'Pass':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'Fail':
    case 'NQ':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'Abs':
      return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'FEO':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'GB': case 'BJ': case 'C': case 'T': case 'P':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    default:
      // Check if it's a numerical score (for rally/obedience)
      if (!isNaN(Number(result)) && result !== '-') {
        return 'bg-green-100 text-green-700 border-green-200';
      }
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

// Place this function right after your interface definitions and before:
// export default function LiveEventManagementPage() {
export default function LiveEventManagementPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [selectedGamesSubclass, setSelectedGamesSubclass] = useState<string | null>(null);
  const trialId = params.trialId as string;
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [substitutingEntryId, setSubstitutingEntryId] = useState<string | null>(null);
  const [newCwagsNumber, setNewCwagsNumber] = useState('');
  const [trial, setTrial] = useState<Trial | null>(null);
  const [trialClasses, setTrialClasses] = useState<TrialClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<TrialClass | null>(null);
  const [classEntries, setClassEntries] = useState<ClassEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDigitalScoreEntry, setShowDigitalScoreEntry] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseBrowser();
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [draggedEntry, setDraggedEntry] = useState<ClassEntry | null>(null);
  const [touchStartY, setTouchStartY] = useState<number>(0);
  const [touchedEntry, setTouchedEntry] = useState<ClassEntry | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [showDaySelector, setShowDaySelector] = useState(false);
  const [activeTab, setActiveTab] = useState<'running-order' | 'score-entry'>('running-order');
  const [scoreEntry, setScoreEntry] = useState<{
  scent1: string;
  scent2: string;
  scent3: string;
  scent4: string;
  fault1: string;
  fault2: string;
  time_seconds: string;
  pass_fail: string;
  }>({
  scent1: '',
  scent2: '',
  scent3: '',
  scent4: '',
  fault1: '',
  fault2: '',
  time_seconds: '',
  pass_fail: ''
});
const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
const [savingScore, setSavingScore] = useState(false);
  const [isExportProcessing, setIsExportProcessing] = useState(false);
  const [exportType, setExportType] = useState<'running-order' | 'score-sheets'>('running-order');
  const [availableDays, setAvailableDays] = useState<Array<{
    id: string;
    day_number: number;
    trial_date: string;
    formatted_date: string;
  }>>([]);
  const [selectedPrintDay, setSelectedPrintDay] = useState<string | null>(null);
 const [newEntryData, setNewEntryData] = useState({
    handler_name: '',
    dog_call_name: '',
    cwags_number: '',
    entry_type: 'regular',
    jump_height: ''
  });


const renderClassesByDay = () => {
  if (trialClasses.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No classes configured for this trial</p>
      </div>
    );
  }

  // Group classes by day using trial_date from the classes
  const classesByDay = trialClasses.reduce((acc, cls) => {
    const trialDate = cls.trial_date;
    // Fix timezone issue for day grouping
    const [year, month, day] = trialDate.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    const dayKey = `Day ${date.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}`;
    
    if (!acc[dayKey]) acc[dayKey] = [];
    acc[dayKey].push(cls);
    return acc;
  }, {} as Record<string, typeof trialClasses>);

  const dayKeys = Object.keys(classesByDay).sort((a, b) => {
    const dateA = classesByDay[a][0]?.trial_date;
    const dateB = classesByDay[b][0]?.trial_date;
    if (dateA && dateB) {
      const [yearA, monthA, dayA] = dateA.split('-').map(Number);
      const [yearB, monthB, dayB] = dateB.split('-').map(Number);
      const dateObjA = new Date(yearA, monthA - 1, dayA);
      const dateObjB = new Date(yearB, monthB - 1, dayB);
      return dateObjA.getTime() - dateObjB.getTime();
    }
    return a.localeCompare(b);
  });

  // Group classes by class name (and games_subclass for Games)
  const groupClassesByName = (classes: typeof trialClasses) => {
    const grouped = new Map<string, typeof trialClasses>();
    
    classes.forEach(cls => {
      // Create unique key for grouping - same class name groups together
      const key = cls.class_type === 'games' && cls.games_subclass
        ? `${cls.class_name}-${cls.games_subclass}`
        : cls.class_name;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(cls);
    });
    
    return grouped;
  };

  const renderClassCard = (classGroup: typeof trialClasses) => {
  const firstClass = classGroup[0];
  const classKey = firstClass.class_type === 'games' && firstClass.games_subclass
    ? `${firstClass.class_name}-${firstClass.games_subclass}`
    : firstClass.class_name;
  
  // Calculate total entries across all rounds
  const totalEntries = classGroup.reduce((sum, cls) => sum + (classCounts[cls.id] || 0), 0);
  
  // Sort rounds by round number
  const sortedRounds = [...classGroup].sort((a, b) => {
    return (a.round_number || 1) - (b.round_number || 1);
  });
  
  return (
    <div
      key={classKey}
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        sortedRounds.some(cls => selectedClass?.id === cls.id)
          ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-200'
          : 'border-gray-200 hover:bg-gray-50'
      }`}
      onClick={() => setSelectedClass(sortedRounds[0])}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {firstClass.class_name}
            {sortedRounds.length > 1 && (
              <span className="ml-2 text-orange-600">- {sortedRounds.length} Rounds</span>
            )}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Type: {firstClass.class_type}</p>
          {firstClass.class_type === 'games' && firstClass.games_subclass && (
            <div className="mt-1">
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                <Trophy className="h-3 w-3 mr-1" />
                {firstClass.games_subclass}
              </Badge>
            </div>
          )}
        </div>
        <div className="ml-2">
          <Badge variant="outline">
            {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}
          </Badge>
        </div>
      </div>
      
      {/* List all rounds with judges */}
      <div className="space-y-1.5 mt-2 pt-2 border-t border-gray-200">
        {sortedRounds.map((round) => (
          <div 
            key={round.id}
            className={`flex items-center justify-between text-sm p-1.5 rounded hover:bg-orange-50 transition-colors ${
              selectedClass?.id === round.id ? 'bg-orange-100' : ''
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedClass(round);
            }}
          >
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-gray-600">Round {round.round_number}:</span>
              <span className="text-gray-700">{round.judge_name || 'No Judge Assigned'}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {classCounts[round.id] || 0}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};

  if (dayKeys.length > 1) {
    return (
      <Tabs defaultValue={dayKeys[0]} className="w-full">
        <TabsList className="grid w-full mb-4" style={{ gridTemplateColumns: `repeat(${dayKeys.length}, minmax(0, 1fr))` }}>
          {dayKeys.map((dayKey) => (
            <TabsTrigger key={dayKey} value={dayKey} className="text-sm px-2">
              {dayKey}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {dayKeys.map((dayKey) => {
          const groupedClasses = groupClassesByName(classesByDay[dayKey]);
          return (
            <TabsContent key={dayKey} value={dayKey}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from(groupedClasses.values()).map(renderClassCard)}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    );
  } else {
    const groupedClasses = groupClassesByName(trialClasses);
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from(groupedClasses.values()).map(renderClassCard)}
      </div>
    );
  }
};

 useEffect(() => {
  if (trialId) {
    loadTrialData();
    loadAvailableDays();
  }
}, [trialId]);

  useEffect(() => {
    if (trialClasses.length > 0) {
      loadAllClassCounts();
    }
  }, [trialClasses]);

  useEffect(() => {
    if (selectedClass) {
      loadClassEntries();
    }
  }, [selectedClass]);

  useEffect(() => {
  if (selectedClass) {
    loadClassEntries();
  }
}, [selectedClass]);

// ✅ ADD THIS NEW useEffect:
useEffect(() => {
  // Listen for score updates from Score Entry tab
  const handleScoresUpdated = () => {
    console.log('🔄 Scores updated, reloading class entries...');
    if (selectedClass) {
      loadClassEntries();
    }
  };

  window.addEventListener('scoresUpdated', handleScoresUpdated);
  
  return () => {
    window.removeEventListener('scoresUpdated', handleScoresUpdated);
  };
}, [selectedClass]); // Re-run when selectedClass changes

const loadTrialData = async () => {
  try {
    setLoading(true);
    setError(null);

    console.log('Loading trial data for live event management:', trialId);

    const trialResult = await simpleTrialOperations.getTrial(trialId);
    if (!trialResult.success) {
      throw new Error('Failed to load trial data');
    }

    setTrial(trialResult.data);

    const classesResult = await simpleTrialOperations.getAllTrialClasses(trialId);
    if (!classesResult.success) {
      throw new Error('Failed to load trial classes');
    }

    const allClassRounds: TrialClass[] = [];
    
    for (const cls of (classesResult.data || [])) {
      try {
        const roundsResult = await simpleTrialOperations.getTrialRounds(cls.id);
        
        if (roundsResult.success && roundsResult.data && roundsResult.data.length > 0) {
          console.log(`Found ${roundsResult.data.length} rounds for class ${cls.class_name}`);
          
          roundsResult.data.forEach((round: any, index: number) => {
            // ✅ For Games classes, check if we need to split by subclass
            if (cls.class_type === 'games' && cls.games_subclass) {
              // Split Games classes by their subclass (GB, T, etc.)
              const subclasses = cls.games_subclass.split(',').map((s: string) => s.trim());
              
              subclasses.forEach((subclass: string) => {
                allClassRounds.push({
                  id: `${round.id}-${subclass}`, // Unique ID combining round + subclass
                  class_id: cls.id,
                  round_number: round.round_number || (index + 1),
                  class_name: cls.class_name,
                  class_type: cls.class_type || 'games',
                  games_subclass: subclass, // Individual subclass
                  judge_name: round.judge_name || 'No Judge Assigned',
                  trial_date: cls.trial_days?.trial_date || '',
                  trial_day_id: cls.trial_day_id,
                  entry_fee: cls.entry_fee || 0,
                  feo_available: cls.feo_available || false,
                  feo_price: cls.feo_price || 0,
                  max_entries: cls.max_entries || 0,
                  class_level: cls.class_level || '',
                  class_order: cls.class_order || 999,
                  class_status: cls.class_status || 'active'
                });
              });
            } else {
              // Non-games classes work as before
              allClassRounds.push({
                id: round.id,
                class_id: cls.id,
                round_number: round.round_number || (index + 1),
                class_name: cls.class_name,
                class_type: cls.class_type || 'scent',
                games_subclass: cls.games_subclass || null,
                judge_name: round.judge_name || 'No Judge Assigned',
                trial_date: cls.trial_days?.trial_date || '',
                trial_day_id: cls.trial_day_id,
                entry_fee: cls.entry_fee || 0,
                feo_available: cls.feo_available || false,
                feo_price: cls.feo_price || 0,
                max_entries: cls.max_entries || 0,
                class_level: cls.class_level || '',
                class_order: cls.class_order || 999,
                class_status: cls.class_status || 'active'
              });
            }
          });
        }
      } catch (error) {
        console.error(`Error loading rounds for class ${cls.id}:`, error);
      }
    }

   console.log(`Total rounds loaded: ${allClassRounds.length}`);

// ✅ ADD THIS SORTING CODE HERE
allClassRounds.sort((a, b) => {
  // First sort by trial_date (day)
  if (a.trial_date !== b.trial_date) {
    return a.trial_date.localeCompare(b.trial_date);
  }
  
  // Then sort by class order within the same day
  const classOrderA = getClassOrder(a.class_name);
  const classOrderB = getClassOrder(b.class_name);
  
  if (classOrderA !== classOrderB) {
    return classOrderA - classOrderB;
  }
  
  // Finally sort by round number within the same class
  const roundA = a.round_number || 1;
  const roundB = b.round_number || 1;
  return roundA - roundB;
});

setTrialClasses(allClassRounds);  // Now they're sorted!

    if (allClassRounds.length > 0 && !selectedClass) {
      setSelectedClass(allClassRounds[0]);
    }

    console.log('Trial data loaded with all rounds');
    
  } catch (err) {
    console.error('Error loading trial data:', err);
    setError(err instanceof Error ? err.message : 'Failed to load trial data');
  } finally {
    setLoading(false);
  }
};

const getStatusBackgroundColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'waitlisted':
      return 'FFF9C4'; // Light yellow background for waitlisted
    case 'confirmed':
      return 'C8E6C9'; // Light green for confirmed
    case 'withdrawn':
      return 'FFCDD2'; // Light red for withdrawn
    default:
      return 'FFFFFF'; // White for others
  }
};


const loadClassEntries = async () => {
  if (!selectedClass) return;

  try {
    setError(null);
    console.log('Loading entries for round:', selectedClass.id, selectedClass.class_name, 'Round', selectedClass.round_number);

    // Get entries for this trial
    const entriesResult = await simpleTrialOperations.getTrialEntriesWithSelections(trialId);
    if (!entriesResult.success) {
      throw new Error('Failed to load entries');
    }

    // ✅ FIX: Extract base round ID if this is a compound ID (for Games subclasses)
    let baseRoundId = selectedClass.id;
    let targetSubclass = selectedClass.games_subclass;
    
    // If the ID contains a hyphen followed by a subclass (GB, BJ, T, P, C)
    if (selectedClass.class_type === 'games' && selectedClass.id.includes('-')) {
      const parts = selectedClass.id.split('-');
      const lastPart = parts[parts.length - 1];
      
      // Check if last part is a games subclass (single or double letter)
      if (['GB', 'BJ', 'T', 'P', 'C'].includes(lastPart)) {
        // This is a compound ID - extract base round ID
        baseRoundId = parts.slice(0, -1).join('-');
        targetSubclass = lastPart;
        console.log('Compound ID detected. Base round ID:', baseRoundId, 'Target subclass:', targetSubclass);
      }
    }

    // Filter entries for THIS SPECIFIC ROUND (and subclass for Games)
    const classEntriesData: ClassEntry[] = [];
    (entriesResult.data || []).forEach((entry: any) => {
      const selections = entry.entry_selections || [];
      selections.forEach((selection: any) => {
        // Check if this selection is for the selected round
        const roundMatches = selection.trial_round_id === selectedClass.id || 
                            selection.trial_round_id === baseRoundId;
        
        // For Games classes with subclasses, also check the subclass matches
        let subclassMatches = true;
        if (selectedClass.class_type === 'games' && targetSubclass) {
          // Check if the selection has a games_subclass field and it matches
          subclassMatches = !selection.games_subclass || selection.games_subclass === targetSubclass;
          
          console.log('Checking subclass match:', {
            entryHandler: entry.handler_name,
            selectionSubclass: selection.games_subclass,
            targetSubclass: targetSubclass,
            matches: subclassMatches
          });
        }
        
        if (roundMatches && subclassMatches) {
          // FILTER OUT WITHDRAWN ENTRIES
          const entryStatus = selection.entry_status || 'entered';
          if (entryStatus.toLowerCase() !== 'withdrawn' && entryStatus.toLowerCase() !== 'waitlisted') {
           classEntriesData.push({
  id: selection.id,
  entry_id: entry.id,
  running_position: selection.running_position || 0,
  entry_type: selection.entry_type || 'regular',
  entry_status: entryStatus,
  round_number: selectedClass.round_number || 1,
  round_id: selectedClass.id,
  division: selection.division || null,
  jump_height: selection.jump_height || null,
  fee: selection.fee || 0,
  entries: {
    handler_name: selection.substitute_handler_name || entry.handler_name,  // ✅ Use substitute if exists
    dog_call_name: selection.substitute_dog_name || entry.dog_call_name,      // ✅ Use substitute if exists
    cwags_number: selection.substitute_cwags_number || entry.cwags_number      // ✅ Use substitute if exists
  },
  trial_rounds: {
    judge_name: selectedClass.judge_name,
    trial_classes: {
      class_name: selectedClass.class_name,
      class_type: selectedClass.class_type,
      games_subclass: selectedClass.games_subclass
    }
  },
  scores: selection.scores || []
});
          }
        }
      });
    });

 // Sort by running position
classEntriesData.sort((a, b) => a.running_position - b.running_position);

// Optional: Keep minimal logging
console.log(`✅ Loaded ${classEntriesData.length} entries for ${selectedClass.class_name} Round ${selectedClass.round_number}`);

console.log(`Loaded ${classEntriesData.length} entries for round ${selectedClass.id}`);
setClassEntries(classEntriesData);
    
    console.log(`Loaded ${classEntriesData.length} entries for round ${selectedClass.id} (base: ${baseRoundId}, subclass: ${targetSubclass})`);
    setClassEntries(classEntriesData);
    
  } catch (err) {
    console.error('Error loading class entries:', err);
    setError(err instanceof Error ? err.message : 'Failed to load entries');
    setClassEntries([]);
  }
};

const updateEntryField = async (entryId: string, field: string, value: string | number) => {
  // Update local state immediately
  setClassEntries(prev =>
    prev.map(entry =>
      entry.id === entryId
        ? { ...entry, [field]: value }
        : entry
    )
  );

  // Update database based on field type
  try {
    if (field === 'dog_call_name') {
      // Update the main entry record
      const entry = classEntries.find(e => e.id === entryId);
      if (entry) {
        await simpleTrialOperations.updateEntry(entry.entry_id, { dog_call_name: value as string });
      }
    } else {
      // Update entry selection record
      const updates: Record<string, any> = {};
      
      if (field === 'entry_type') {
        updates.entry_type = value;
        
        // 🔥 FEE RECALCULATION FIX - Calculate new fee when entry type changes
        if (selectedClass) {
          let newFee = 0;
          
          if (value === 'feo') {
            // Switching TO FEO - use FEO price if available
            if (selectedClass.feo_available && selectedClass.feo_price !== undefined && selectedClass.feo_price !== null) {
              newFee = selectedClass.feo_price;
              console.log('🔄 Switching to FEO, new fee:', newFee);
            } else {
              // Fallback: 50% of regular fee
              newFee = selectedClass.entry_fee ? Math.round(selectedClass.entry_fee * 0.5) : 0;
              console.log('🔄 Switching to FEO (fallback), new fee:', newFee);
            }
          } else {
            // Switching TO REGULAR - use regular entry fee
            newFee = selectedClass.entry_fee || 0;
            console.log('🔄 Switching to REGULAR, new fee:', newFee);
          }
          
          // Update the fee in the entry_selections table
          updates.fee = newFee;
          
          // Also update the local state with the new fee
          setClassEntries(prev =>
            prev.map(e =>
              e.id === entryId
                ? { ...e, fee: newFee }
                : e
            )
          );
          
          // Update the main entry record's total_fee as well
          const entry = classEntries.find(e => e.id === entryId);
          if (entry && entry.entry_id) {
            await simpleTrialOperations.updateEntry(entry.entry_id, { total_fee: newFee });
            console.log('✅ Updated total_fee in main entry record:', newFee);
          }
        }
      }
      
      if (field === 'entry_status') {
        updates.entry_status = value;
      }
      
      // Use updateEntrySelection function with the updates (including fee if changed)
      const result = await simpleTrialOperations.updateEntrySelection(entryId, updates);
      if (!result.success) {
        console.error('Failed to update entry selection:', result.error);
        loadClassEntries(); // Reload on error
        return;
      }
      
      console.log('✅ Entry field updated successfully:', field, '=', value);
      if (updates.fee !== undefined) {
        console.log('✅ Fee updated to:', updates.fee);
      }
    }

    // If the status was changed to withdrawn, reload to remove from list
    if (field === 'entry_status' && value === 'withdrawn') {
      console.log('Entry withdrawn, reloading class entries to update running order');
      await loadClassEntries();
      await loadAllClassCounts();
    }
  } catch (error) {
    console.error('Error updating entry field:', error);
    // Reload to get correct data
    loadClassEntries();
  }
};
const substituteDog = async (entrySelectionId: string, newCwags: string) => {
  if (!newCwags) return;
  
  try {
    setSaving(true);
    console.log('🔄 Starting dog substitution...');
    console.log('Original entry_selection_id:', entrySelectionId);
    console.log('Substitute C-WAGS#:', newCwags);
    
    // STEP 1: Look up the substitute dog in registry
    const registryResult = await simpleTrialOperations.getCwagsRegistryByNumber(newCwags);
    
    let substituteDogInfo = {
      cwags_number: newCwags,
      dog_call_name: '',
      handler_name: '',
      handler_email: '',
      handler_phone: ''
    };
    
    if (!registryResult.success || !registryResult.data) {
      // Dog not in registry - get manual entry
      if (!confirm('Dog not found in registry. Continue with manual entry?')) {
        return;
      }
      
      const subDogName = prompt('Enter substitute dog name:');
      const subHandlerName = prompt('Enter substitute handler name:');
      
      if (!subDogName || !subHandlerName) {
        setSaving(false);
        return;
      }
      
      substituteDogInfo.dog_call_name = subDogName;
      substituteDogInfo.handler_name = subHandlerName;
      console.log('✏️ Using manual entry for substitute dog');
    } else {
      // Found in registry - use that data
      substituteDogInfo.dog_call_name = registryResult.data.dog_call_name;
      substituteDogInfo.handler_name = registryResult.data.handler_name;
      substituteDogInfo.handler_email = registryResult.data.handler_email || '';
      substituteDogInfo.handler_phone = registryResult.data.handler_phone || '';
      console.log('✅ Found substitute dog in registry:', substituteDogInfo.dog_call_name);
    }
    
    // STEP 2: Get info about the original entry_selection we're substituting
    const originalSelection = classEntries.find(e => e.id === entrySelectionId);
    if (!originalSelection) {
      throw new Error('Original entry selection not found');
    }
    
    const originalEntryId = originalSelection.entry_id;
    const originalDogName = originalSelection.entries.dog_call_name;
    const originalHandlerName = originalSelection.entries.handler_name;
    const originalRoundId = originalSelection.round_id;
    const originalRunningPosition = originalSelection.running_position;
    // Get the DISPLAY position (what user sees)
const displayPosition = classEntries
  .filter(e => e.round_number === originalSelection.round_number)
  .sort((a, b) => a.running_position - b.running_position)
  .findIndex(e => e.id === entrySelectionId) + 1;
    const originalFee = originalSelection.fee;
    const originalEntryType = originalSelection.entry_type;
    const originalDivision = originalSelection.division;
    const originalJumpHeight = originalSelection.jump_height;
    
    console.log('📋 Original dog:', originalDogName);
    console.log('📋 Original running position:', originalRunningPosition);
    console.log('📋 Fee to transfer:', originalFee);
    
    // STEP 3: Check if original entry_selection has any scores
    const { data: scores, error: scoresCheckError } = await supabase
      .from('scores')
      .select('id')
      .eq('entry_selection_id', entrySelectionId);
      
    if (scoresCheckError) {
      throw new Error('Failed to check for scores: ' + scoresCheckError.message);
    }
    
    if (scores && scores.length > 0) {
      throw new Error(
        `Cannot substitute - ${originalDogName} already has scores recorded. ` +
        `Please delete the scores first if you want to substitute this dog.`
      );
    }
    
    console.log('✅ No scores found - safe to substitute');
    
    // STEP 4: Check if substitute dog already has an entry in this trial
    const { data: existingEntries, error: entriesError } = await supabase
      .from('entries')
      .select('id, total_fee')
      .eq('trial_id', trialId)
      .eq('cwags_number', newCwags);
      
    if (entriesError) {
      throw new Error('Failed to check for existing entries: ' + entriesError.message);
    }
    
    let substituteEntryId: string;
    let isNewEntry = false;
    
    if (existingEntries && existingEntries.length > 0) {
      // Substitute dog already has an entry in this trial - REUSE IT
      substituteEntryId = existingEntries[0].id;
      console.log('♻️ Reusing existing entry for substitute dog:', substituteEntryId);
      
      // Update the existing entry's total_fee (add the new class fee)
      const newTotalFee = existingEntries[0].total_fee + originalFee;
      await simpleTrialOperations.updateEntry(substituteEntryId, {
        total_fee: newTotalFee
      });
      console.log('💰 Updated substitute total_fee:', newTotalFee);
      
    } else {
      // Substitute dog NOT in this trial - CREATE NEW ENTRY
      console.log('🆕 Creating new entry for substitute dog');
      
      const entryResult = await simpleTrialOperations.createEntry({
        trial_id: trialId,
        handler_name: substituteDogInfo.handler_name,
        dog_call_name: substituteDogInfo.dog_call_name,
        cwags_number: substituteDogInfo.cwags_number,
        dog_breed: null,
        dog_sex: null,
        handler_email: substituteDogInfo.handler_email,
        handler_phone: substituteDogInfo.handler_phone,
        is_junior_handler: false,
        waiver_accepted: true,
        total_fee: originalFee,
        payment_status: 'pending',
        entry_status: 'confirmed'
      });
      
      if (!entryResult.success || !entryResult.data) {
        throw new Error('Failed to create entry for substitute dog: ' + entryResult.error);
      }
      
      substituteEntryId = entryResult.data.id;
      isNewEntry = true;
      console.log('✅ Created new entry:', substituteEntryId);
    }
    
    // STEP 5: Delete the original entry_selection (no scores, so safe to delete)
    console.log('🗑️ Deleting original entry_selection:', entrySelectionId);
    
    const { error: deleteError } = await supabase
      .from('entry_selections')
      .delete()
      .eq('id', entrySelectionId);
      
    if (deleteError) {
      throw new Error('Failed to delete original entry_selection: ' + deleteError.message);
    }
    
    console.log('✅ Original entry_selection deleted');
    
   // STEP 6: Update original entry's total_fee AND add audit trail
const { data: originalEntry, error: originalEntryError } = await supabase
  .from('entries')
  .select('total_fee, audit_trail, handler_name, dog_call_name')
  .eq('id', originalEntryId)
  .single();
  
if (originalEntry) {
  const newOriginalTotalFee = Math.max(0, originalEntry.total_fee - originalFee);
  
  // Get the class name for the audit trail
  const { data: roundData } = await supabase
    .from('trial_rounds')
    .select('trial_class_id')
    .eq('id', originalRoundId)
    .single();

  let className = 'Unknown Class';
  if (roundData?.trial_class_id) {
    const { data: classData } = await supabase
      .from('trial_classes')
      .select('class_name')
      .eq('id', roundData.trial_class_id)
      .single();
    
    className = classData?.class_name || 'Unknown Class';
  }
  
  // Build audit trail message
  const timestamp = new Date().toISOString();
  const auditMessage = `Substituted ${originalDogName} with ${substituteDogInfo.dog_call_name} (${substituteDogInfo.cwags_number}) in ${className} at ${timestamp}`;
  
  const existingAudit = originalEntry.audit_trail || '';
  const newAudit = existingAudit 
    ? `${existingAudit}\n${auditMessage}`
    : auditMessage;
  
  await simpleTrialOperations.updateEntry(originalEntryId, {
    total_fee: newOriginalTotalFee,
    audit_trail: newAudit
  });
  
  console.log('💰 Updated original entry total_fee:', newOriginalTotalFee);
  console.log('📝 Added audit trail to original entry');
}
    
    // STEP 7: Create NEW entry_selection for substitute dog with SAME running position
    console.log('➕ Creating new entry_selection for substitute dog');
    
    const { error: insertError } = await supabase
      .from('entry_selections')
      .insert({
        entry_id: substituteEntryId,
        trial_round_id: originalRoundId,
        entry_type: originalEntryType,
        fee: originalFee,
        running_position: originalRunningPosition,  // Keep same position!
        entry_status: 'entered',
        division: originalDivision,
        jump_height: originalJumpHeight
      });
      
    if (insertError) {
      throw new Error('Failed to create entry_selection for substitute: ' + insertError.message);
    }
    
    console.log('✅ Created new entry_selection for substitute dog at position', originalRunningPosition);
    
    // STEP 7.5: Add audit trail to substitute dog's entry
const { data: substituteEntry } = await supabase
  .from('entries')
  .select('audit_trail, handler_name, dog_call_name')
  .eq('id', substituteEntryId)
  .single();

if (substituteEntry) {
  // Get the class name for the audit trail
  const { data: roundData } = await supabase
    .from('trial_rounds')
    .select('trial_class_id')
    .eq('id', originalRoundId)
    .single();

  let className = 'Unknown Class';
  if (roundData?.trial_class_id) {
    const { data: classData } = await supabase
      .from('trial_classes')
      .select('class_name')
      .eq('id', roundData.trial_class_id)
      .single();
    
    className = classData?.class_name || 'Unknown Class';
  }
  
  // Build audit trail message for substitute
  const timestamp = new Date().toISOString();
  const auditMessage = `Substituted for ${originalDogName} (${originalHandlerName}) in ${className} at ${timestamp}`;
  
  const existingAudit = substituteEntry.audit_trail || '';
  const newAudit = existingAudit 
    ? `${existingAudit}\n${auditMessage}`
    : auditMessage;
  
  await simpleTrialOperations.updateEntry(substituteEntryId, {
    audit_trail: newAudit
  });
  
  console.log('📝 Added audit trail to substitute entry');
}
    
// STEP 7.6: LOG TO JOURNAL ACTIVITY
    try {
      // We need to get the class info for logging
      const { data: classInfo } = await supabase
        .from('trial_rounds')
        .select(`
          round_number,
          trial_class_id,
          trial_classes (
            class_name,
            trial_days (
              day_number,
              trial_date
            )
          )
        `)
        .eq('id', originalRoundId)
        .single();

      console.log('🔍 DEBUG classInfo structure:', JSON.stringify(classInfo, null, 2));

      // Extract class name and trial day info (trial_classes might be an array)
      const trialClassData: any = Array.isArray(classInfo?.trial_classes) 
        ? classInfo.trial_classes[0] 
        : classInfo?.trial_classes;
      
      const logClassName = trialClassData?.class_name || 'Unknown Class';
      
      // Supabase returns nested relations as arrays, extract first element
      const trialDaysArray: any = trialClassData?.trial_days;
      const logDayNumber = Array.isArray(trialDaysArray) && trialDaysArray.length > 0
        ? trialDaysArray[0]?.day_number
        : trialDaysArray?.day_number; // Try direct access as fallback
      const logTrialDate = Array.isArray(trialDaysArray) && trialDaysArray.length > 0
        ? trialDaysArray[0]?.trial_date
        : trialDaysArray?.trial_date; // Try direct access as fallback
      
      console.log('📅 Logging substitution with date info:', {
        day_number: logDayNumber,
        trial_date: logTrialDate,
        class_name: logClassName
      });

      // Get original entry's cwags number
      const { data: originalEntryFull } = await supabase
        .from('entries')
        .select('cwags_number')
        .eq('id', originalEntryId)
        .single();

      await logSubstitution(trialId, {
        original_entry_id: originalEntryId,
        original_dog_name: originalDogName,
        original_handler_name: originalHandlerName,
        original_cwags: originalEntryFull?.cwags_number || 'Unknown',
        substitute_entry_id: substituteEntryId,
        substitute_dog_name: substituteDogInfo.dog_call_name,
        substitute_handler_name: substituteDogInfo.handler_name,
        substitute_cwags: substituteDogInfo.cwags_number,
        class_name: logClassName,
        round_number: classInfo?.round_number || 1,
        running_position: originalRunningPosition,
        day_number: logDayNumber,
        trial_date: logTrialDate 
          ? logTrialDate + 'T12:00:00'  // Noon fix
          : undefined
      });
      
      console.log('✅ Logged substitution to journal activity');
    } catch (logError) {
      console.error('⚠️ Failed to log substitution to journal:', logError);
      // Don't fail the substitution if logging fails
    }

    // STEP 8: Reload the display
    await loadClassEntries();
    await loadAllClassCounts();
    
    // STEP 9: Close modal and show success message
    setSubstitutingEntryId(null);
    setNewCwagsNumber('');
    
    alert(
      `✅ Substitution Complete!\n\n` +
      `${originalDogName} has been replaced with ${substituteDogInfo.dog_call_name}\n` +
      `Running position #${displayPosition} maintained.\n\n` +
      (isNewEntry ? 
        `${substituteDogInfo.dog_call_name} was added as a new entry to this trial.` :
        `${substituteDogInfo.dog_call_name}'s existing entry was updated with the new class.`)
    );
    
  } catch (error) {
    console.error('❌ Error during substitution:', error);
    setError(error instanceof Error ? error.message : 'Failed to substitute dog');
    alert('Error: ' + (error instanceof Error ? error.message : 'Failed to substitute dog'));
  } finally {
    setSaving(false);
  }
};
const saveScore = async (entrySelectionId: string) => {
  if (!selectedClass) return;
  
  try {
    setSavingScore(true);
    setError(null);

    // Validate required fields for scent detection
    if (selectedClass.class_type === 'scent') {
      if (!scoreEntry.pass_fail) {
        setError('Pass/Fail result is required');
        return;
      }
    }

    // Prepare score data
    const scoreData = {
      entry_selection_id: entrySelectionId,
      trial_round_id: selectedClass.id,
      scent1: scoreEntry.scent1 || null,
      scent2: scoreEntry.scent2 || null,
      scent3: scoreEntry.scent3 || null,
      scent4: scoreEntry.scent4 || null,
      fault1: scoreEntry.fault1 || null,
      fault2: scoreEntry.fault2 || null,
      time_seconds: scoreEntry.time_seconds ? parseFloat(scoreEntry.time_seconds) : null,
      pass_fail: scoreEntry.pass_fail as 'Pass' | 'Fail' | 'ABS' | 'WD',
      entry_status: 'present' as const,
      scored_at: new Date().toISOString(),
      scored_by: user?.id || null
    };

    // Check if score already exists
    const { data: existingScore } = await supabase
      .from('scores')
      .select('id')
      .eq('entry_selection_id', entrySelectionId)
      .single();

    if (existingScore) {
      // Update existing score
      const { error: updateError } = await supabase
        .from('scores')
        .update(scoreData)
        .eq('id', existingScore.id);

      if (updateError) throw updateError;
    } else {
      // Insert new score
      const { error: insertError } = await supabase
        .from('scores')
        .insert(scoreData);

      if (insertError) throw insertError;
    }

    // Clear form and reload entries
    setScoreEntry({
      scent1: '',
      scent2: '',
      scent3: '',
      scent4: '',
      fault1: '',
      fault2: '',
      time_seconds: '',
      pass_fail: ''
    });
    setEditingEntryId(null);
    
    await loadClassEntries();
    
  } catch (err) {
    console.error('Error saving score:', err);
    setError('Failed to save score');
  } finally {
    setSavingScore(false);
  }
};
const loadScoreForEditing = (entry: ClassEntry) => {
  const score = entry.scores?.[0];
  
  if (score) {
    setScoreEntry({
      scent1: score.scent1 || '',
      scent2: score.scent2 || '',
      scent3: score.scent3 || '',
      scent4: score.scent4 || '',
      fault1: score.fault1 || '',
      fault2: score.fault2 || '',
      time_seconds: score.time_seconds?.toString() || '',
      pass_fail: score.pass_fail || ''
    });
  } else {
    setScoreEntry({
      scent1: '',
      scent2: '',
      scent3: '',
      scent4: '',
      fault1: '',
      fault2: '',
      time_seconds: '',
      pass_fail: ''
    });
  }
  
  setEditingEntryId(entry.id);
};

// ADD this debug function to your live-event/page.tsx file
// Add it right after the updateEntryField function

const debugSelectedClassData = () => {
  console.log('=== SELECTED CLASS DEBUG ===');
  console.log('selectedClass object:', selectedClass);
  
  if (selectedClass) {
    console.log('Class ID:', selectedClass.id);
    console.log('Class Name:', selectedClass.class_name);
    console.log('Entry Fee:', selectedClass.entry_fee); // Should be 21
    console.log('FEO Price:', selectedClass.feo_price);  // Should be 15
    console.log('FEO Available:', selectedClass.feo_available); // Should be true
    console.log('All properties:', Object.keys(selectedClass));
  } else {
    console.log('❌ selectedClass is null/undefined');
  }
  
  console.log('trialClasses array:', trialClasses);
  if (trialClasses && trialClasses.length > 0) {
    console.log('First class in array:', trialClasses[0]);
    console.log('First class properties:', Object.keys(trialClasses[0]));
  }
  
  console.log('===========================');
};

// Call this from your browser console: debugSelectedClassData()
    
const loadAllClassCounts = async () => {
  try {
    const entriesResult = await simpleTrialOperations.getTrialEntriesWithSelections(trialId);
    if (!entriesResult.success) return;
    
    const counts: Record<string, number> = {};
    
    // Now cls.id is a ROUND ID (or compound ID for Games subclasses)
    trialClasses.forEach(cls => {
      // ✅ FIX: Handle compound IDs for Games subclasses
      let baseRoundId = cls.id;
      let targetSubclass = cls.games_subclass;
      
      // If this is a Games class with a compound ID
      if (cls.class_type === 'games' && cls.id.includes('-')) {
        const parts = cls.id.split('-');
        const lastPart = parts[parts.length - 1];
        
        // Check if last part is a games subclass (GB, BJ, T, P, C)
        if (['GB', 'BJ', 'T', 'P', 'C'].includes(lastPart)) {
          baseRoundId = parts.slice(0, -1).join('-');
          targetSubclass = lastPart;
        }
      }
      
      const roundEntryCount = (entriesResult.data || []).reduce((count: number, entry: any) => {
        const selectionsForRound = entry.entry_selections?.filter((selection: any) => {
          // Check if round ID matches
          const roundMatches = selection.trial_round_id === cls.id || 
                              selection.trial_round_id === baseRoundId;
          
          // For Games with subclass, also check subclass matches
          let subclassMatches = true;
          if (cls.class_type === 'games' && targetSubclass) {
            subclassMatches = !selection.games_subclass || selection.games_subclass === targetSubclass;
          }
          
          // Not withdrawn
          const notWithdrawn = selection.entry_status?.toLowerCase() !== 'withdrawn';
          
          return roundMatches && subclassMatches && notWithdrawn;
        }) || [];
        
        return count + selectionsForRound.length;
      }, 0);
      
      counts[cls.id] = roundEntryCount;
      console.log(`Round ${cls.id} (${cls.class_name} R${cls.round_number}${targetSubclass ? ` - ${targetSubclass}` : ''}): ${roundEntryCount} entries`);
    });
    
    setClassCounts(counts);
  } catch (error) {
    console.error('Error loading class counts:', error);
  }
};

const loadAvailableDays = async () => {
  if (!trialId) return;

  try {
    console.log('Loading available days for trial:', trialId);
    
    const result = await simpleTrialOperations.getTrialDays(trialId);
    
    if (result.success) {
     const daysWithFormatting = (result.data || []).map((day: any) => {
  // Manual date parsing to avoid timezone shift
  const [year, month, dayNum] = day.trial_date.split('-').map(Number);
  const date = new Date(year, month - 1, dayNum, 12, 0, 0);
  
  return {
    ...day,
    formatted_date: date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  };
}).sort((a: any, b: any) => a.day_number - b.day_number);
      
      setAvailableDays(daysWithFormatting);
      console.log('Loaded days:', daysWithFormatting);
    }
  } catch (error) {
    console.error('Error loading trial days:', error);
  }
};

  const updateRunningPosition = async (entryId: string, newPosition: number) => {
  const entry = classEntries.find(e => e.id === entryId);
  if (!entry) return;

  // Get all entries in the SAME ROUND as this entry
  const sameRoundEntries = classEntries.filter(e => e.round_number === entry.round_number);
  
  // Create position updates for entries in this round only
  const positionUpdates: Array<{id: string, running_position: number}> = [];
  
  // Remove the dragged entry from its current position
  const otherEntries = sameRoundEntries.filter(e => e.id !== entryId);
  
  // Insert the dragged entry at the new position
  otherEntries.splice(newPosition - 1, 0, entry);
  
  // Reassign positions within this round (1, 2, 3, 4...)
  otherEntries.forEach((e, index) => {
    positionUpdates.push({
      id: e.id,
      running_position: index + 1
    });
  });

  // Update local state immediately for responsive UI
  setClassEntries(prev => {
    const updated = [...prev];
    positionUpdates.forEach(update => {
      const entryToUpdate = updated.find(e => e.id === update.id);
      if (entryToUpdate) {
        entryToUpdate.running_position = update.running_position;
      }
    });
    // Sort by round, then by running position
    return updated.sort((a, b) => {
      if (a.round_number !== b.round_number) {
        return a.round_number - b.round_number;
      }
      return a.running_position - b.running_position;
    });
  });

  // Update database
  try {
    const result = await simpleTrialOperations.updateRunningPositions(positionUpdates);
    
    if (!result.success) {
      console.error('Failed to update running positions:', result.error);
      // Reload to get correct positions
      loadClassEntries();
    }
  } catch (error) {
    console.error('Error updating running positions:', error);
    loadClassEntries();
  }
};
const handleKeyNavigation = (e: React.KeyboardEvent<HTMLDivElement>, entry: ClassEntry) => {
  // Only handle arrow keys
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  
  e.preventDefault(); // Prevent page scrolling
  
  const currentPosition = entry.running_position;
  const sameRoundEntries = classEntries.filter(e => 
    e.round_number === entry.round_number && 
    e.entry_status !== 'withdrawn'
  ).sort((a, b) => a.running_position - b.running_position);
  
  let newPosition: number;
  
  if (e.key === 'ArrowUp') {
    // Move up (decrease position number)
    newPosition = Math.max(1, currentPosition - 1);
  } else {
    // Move down (increase position number)
    newPosition = Math.min(sameRoundEntries.length, currentPosition + 1);
  }
  
  // Only update if position actually changed
  if (newPosition !== currentPosition) {
    updateRunningPosition(entry.id, newPosition);
  }
};
  // Updated updateScore function with rally/obedience logic
  const updateScore = (entryId: string, scoreField: string, value: string | number | null) => {
    // Update local state immediately
    setClassEntries(prev =>
      prev.map(entry => {
        if (entry.id === entryId) {
          const updatedScores = entry.scores || [{}];
          if (updatedScores.length === 0) updatedScores.push({});
          
          // Update the specific field
          updatedScores[0] = {
            ...updatedScores[0],
            [scoreField]: value
          };

          // Auto-calculate pass/fail for rally and obedience when numerical_score changes
          if (scoreField === 'numerical_score' && value !== null && selectedClass) {
            const isRallyObedience = isRallyOrObedienceClass(selectedClass.class_type, selectedClass.class_name);
            
            if (isRallyObedience && typeof value === 'number') {
              const passingScore = getPassingScore(selectedClass.class_name);
              
              // Check entry status and type to determine proper pass_fail value
              if (entry.entry_status === 'no_show' || entry.entry_status === 'absent') {
                updatedScores[0].pass_fail = 'Abs';
              } else if (entry.entry_type === 'feo') {
                // FEO entries: ALWAYS "FEO" regardless of score
                updatedScores[0].pass_fail = 'FEO';
              } else {
                // Regular entries: "Pass" if passing score, "Fail" if not
                updatedScores[0].pass_fail = value >= passingScore ? 'Pass' : 'Fail';
              }
            }
          }
          
          return { ...entry, scores: updatedScores };
        }
        return entry;
      })
    );
  };

  const saveAllScores = async () => {
    if (!selectedClass) return;

    try {
      setSaving(true);
      console.log('Saving all scores for class:', selectedClass.class_name);

      // Get trial round ID for this class
      const roundsResult = await simpleTrialOperations.getTrialRounds(selectedClass.id);
      if (!roundsResult.success || !roundsResult.data.length) {
        throw new Error('No round found for this class');
      }

      const trialRoundId = roundsResult.data[0].id;

      // Prepare scores to update - only include entries with meaningful scoring data
      const scoresToUpdate = classEntries
        .filter(entry => {
          // Only save if there are scores AND they have at least pass_fail or other scoring fields
          if (!entry.scores || entry.scores.length === 0) return false;
          
          const score = entry.scores[0];
          // Check if any meaningful scoring data exists
          return score.pass_fail || 
                 score.scent1 || score.scent2 || score.scent3 || score.scent4 ||
                 score.time_seconds !== null || score.numerical_score !== null ||
                 score.fault1 || score.judge_notes;
        })
        .map(entry => ({
          entry_selection_id: entry.id,
          trial_round_id: trialRoundId,
          scoreData: {
            ...entry.scores![0],
            scored_by: user?.id || null,
            scored_at: new Date().toISOString()
          }
        }));

      if (scoresToUpdate.length === 0) {
        alert('No scores to save');
        return;
      }

      const result = await simpleTrialOperations.bulkUpdateScores(scoresToUpdate);
      
      if (result.success) {
        alert(`Saved ${scoresToUpdate.length} scores successfully!`);
      } else {
        throw new Error(result.error as string);
      }

    } catch (error) {
      console.error('Error saving scores:', error);
      setError(error instanceof Error ? error.message : 'Failed to save scores');
    } finally {
      setSaving(false);
    }
  };

  const exportScores = async () => {
    if (!selectedClass) return;

    try {
      console.log('Exporting scores for class:', selectedClass.class_name);
      
      const csvHeaders = ['Running Position', 'Handler Name', 'Dog Name', 'Entry Type', 'Result', 'Pass/Fail', 'Score', 'Status'];
      const csvRows = classEntries.map(entry => {
        const score = entry.scores?.[0];
        
        // Use the new display result function
        const result = getDisplayResult(entry, selectedClass);

        return [
          entry.entry_status === 'withdrawn' ? 'X' : entry.running_position,
          entry.entries.handler_name,
          entry.entries.dog_call_name,
          entry.entry_type,
          result,
          score?.pass_fail || '',
          score?.numerical_score || '',
          entry.entry_status
        ];
      });

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedClass.class_name.replace(/[^a-zA-Z0-9]/g, '_')}-scores.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error exporting scores:', error);
      setError('Failed to export scores');
    }
  };

  const formatCwagsNumber = (input: string) => {
    const cleaned = input.replace(/[^a-zA-Z0-9]/g, '');
    
    if (cleaned.length >= 8) {
      return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 6)}-${cleaned.substring(6, 8)}`;
    } else if (cleaned.length === 7) {
      return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 6)}-0${cleaned.substring(6)}`;
    } else if (cleaned.length >= 6) {
      return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 6)}-`;
    } else if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}-${cleaned.substring(2)}`;
    }
    
    return cleaned;
  };

  const lookupCwagsNumber = async (cwagsNumber: string) => {
    if (!cwagsNumber.trim()) return null;

    const formattedNumber = formatCwagsNumber(cwagsNumber);
    
    if (formattedNumber !== cwagsNumber) {
      setNewEntryData(prev => ({ ...prev, cwags_number: formattedNumber }));
    }

    try {
      console.log('Looking up C-WAGS number:', formattedNumber);

      const result = await simpleTrialOperations.getCwagsRegistryByNumber(formattedNumber.trim());
      
      if (result.success && result.data) {
        setNewEntryData(prev => ({
          ...prev,
          cwags_number: formattedNumber,
          handler_name: result.data.handler_name,
          dog_call_name: result.data.dog_call_name
        }));
        return result.data;
      } else {
        setNewEntryData(prev => ({ ...prev, cwags_number: formattedNumber }));
        return null;
      }
    } catch (error) {
      console.error('Error looking up C-WAGS number:', error);
      setNewEntryData(prev => ({ ...prev, cwags_number: formattedNumber }));
      return null;
    }
  };

const addNewEntry = async () => {
  if (!selectedClass || !newEntryData.handler_name || !newEntryData.dog_call_name || !newEntryData.cwags_number) {
    setError('All entry fields are required');
    return;
  }

  if (!selectedClass.class_id) {
    setError('Invalid class selection - class ID missing');
    return;
  }

  // For Games classes, require subclass selection
  if (selectedClass.class_type?.toLowerCase() === 'games' && !selectedGamesSubclass) {
    setError('Please select a Games subclass (GB, BJ, T, P, or C)');
    return;
  }

  try {
    setSaving(true);
    setError(null);

    console.log('Adding new entry to class:', selectedClass.class_name, 'Round:', selectedRound);

    const roundToUse = trialClasses.find(
      tc => tc.class_id === selectedClass.class_id && 
            tc.round_number === selectedRound
    );
    
    if (!roundToUse) {
      throw new Error(`Round ${selectedRound} not found for this class`);
    }

    console.log('Target round found:', roundToUse.id, 'for round number:', selectedRound);

    // CALCULATE PROPER FEE BASED ON ENTRY TYPE
    let calculatedFee = 0;
    const isFeO = newEntryData.entry_type.toLowerCase() === 'feo';
    
    if (isFeO) {
      if (roundToUse.feo_available && roundToUse.feo_price !== undefined) {
        calculatedFee = roundToUse.feo_price;
      } else if (roundToUse.entry_fee) {
        calculatedFee = Math.round(roundToUse.entry_fee * 0.5);
      } else {
        calculatedFee = 0;
      }
    } else {
      calculatedFee = roundToUse.entry_fee || 0;
    }

    // ✅ NEW: Check if an entry already exists for this dog in this trial
    const existingEntriesResult = await simpleTrialOperations.getTrialEntries(trialId);
    let entryId: string;
    let isNewEntry = false;

    if (existingEntriesResult.success && existingEntriesResult.data) {
      const existingEntry = existingEntriesResult.data.find((e: any) => 
        e.cwags_number === newEntryData.cwags_number &&
        e.handler_name === newEntryData.handler_name &&
        e.dog_call_name === newEntryData.dog_call_name
      );

      if (existingEntry) {
        console.log('✅ Found existing entry, reusing entry_id:', existingEntry.id);
        entryId = existingEntry.id;
        
        // Update the total_fee to include the new class
        const newTotalFee = existingEntry.total_fee + calculatedFee;
        await simpleTrialOperations.updateEntry(entryId, { total_fee: newTotalFee });
      } else {
        console.log('🆕 No existing entry found, creating new one');
        isNewEntry = true;
        
        // Create new entry record
        const entryResult = await simpleTrialOperations.createEntry({
          trial_id: trialId,
          handler_name: newEntryData.handler_name,
          dog_call_name: newEntryData.dog_call_name,
          cwags_number: newEntryData.cwags_number,
          dog_breed: null,
          dog_sex: null,
          handler_email: '',
          handler_phone: '',
          is_junior_handler: false,
          waiver_accepted: true,
          total_fee: calculatedFee,
          payment_status: 'pending',
          entry_status: 'submitted'
        });

        if (!entryResult.success) {
          throw new Error(entryResult.error as string);
        }
        
        entryId = entryResult.data.id;
      }
    } else {
      throw new Error('Failed to check for existing entries');
    }

    // Calculate next running position for the SELECTED round (exclude withdrawn)
const roundEntries = classEntries.filter(e => 
  e.round_number === selectedRound &&
  e.entry_status !== 'withdrawn'
);
const nextPosition = roundEntries.length > 0 
  ? Math.max(...roundEntries.map(e => e.running_position)) + 1 
  : 1;

    console.log('Next running position for round', selectedRound, ':', nextPosition);

    // Extract base UUID from compound ID for Games classes
    let actualRoundId = roundToUse.id;
    if (selectedClass.class_type?.toLowerCase() === 'games' && roundToUse.id.includes('-')) {
      const parts = roundToUse.id.split('-');
      const lastPart = parts[parts.length - 1];
      
      if (['GB', 'BJ', 'T', 'P', 'C'].includes(lastPart)) {
        actualRoundId = parts.slice(0, -1).join('-');
        console.log('Extracted base round ID:', actualRoundId, 'from compound:', roundToUse.id);
      }
    }

   // Create entry selection with games_subclass and jump_height
    const insertData: any = {
      entry_id: entryId,
      trial_round_id: actualRoundId,
      entry_type: newEntryData.entry_type,
      fee: calculatedFee,
      running_position: nextPosition,
      entry_status: 'entered'
    };

    // Add jump_height if applicable
    if (newEntryData.jump_height && ['rally', 'obedience', 'games'].includes(selectedClass.class_type?.toLowerCase() || '')) {
      insertData.jump_height = newEntryData.jump_height;
    }

   // Add games_subclass if this is a Games class
    if (selectedClass.class_type?.toLowerCase() === 'games' && selectedGamesSubclass) {
      insertData.games_subclass = selectedGamesSubclass;
      console.log('Adding games_subclass to entry:', selectedGamesSubclass);
    }

    // ✅ CHECK FOR DUPLICATE BEFORE INSERTING
    console.log('Checking for existing selection...');
    const { data: existingSelection } = await supabase
      .from('entry_selections')
      .select('id, scores(id)')
      .eq('entry_id', entryId)
      .eq('trial_round_id', actualRoundId)
      .maybeSingle();

    if (existingSelection) {
      // Selection already exists for this dog in this round
      if (existingSelection.scores && existingSelection.scores.length > 0) {
        // Has scores - cannot add duplicate
        throw new Error(
          `${newEntryData.dog_call_name} already has a scored run in ${selectedClass.class_name} Round ${selectedRound}. ` +
          `Cannot create duplicate entry.`
        );
      } else {
        // No scores - update the existing selection's running position
        console.log('Found existing selection without scores, updating running position...');
        const { error: updateError } = await supabase
          .from('entry_selections')
          .update({ 
            running_position: nextPosition,
            entry_type: insertData.entry_type,
            fee: insertData.fee
          })
          .eq('id', existingSelection.id);
        
        if (updateError) {
          throw new Error('Failed to update existing entry: ' + updateError.message);
        }

        // Reload and notify
        await loadClassEntries();
        await loadAllClassCounts();
        
        setNewEntryData({
      handler_name: '',
      dog_call_name: '',
      cwags_number: '',
      entry_type: 'regular',
      jump_height: ''
    });
        setSelectedRound(1);
        setSelectedGamesSubclass(null);
        setShowAddEntryModal(false);

        alert(
          `${newEntryData.dog_call_name} was already entered in ${selectedClass.class_name} Round ${selectedRound}.\n\n` +
          `Running position has been updated to #${nextPosition}.`
        );
        
        return; // Exit early - don't insert duplicate
      }
    }

    // No existing selection found - proceed with insert
    console.log('No duplicate found, inserting new selection...');
    const { error: insertError } = await supabase
      .from('entry_selections')
      .insert(insertData);

    if (insertError) {
      throw new Error('Failed to save entry selection: ' + insertError.message);
    }

    // Reload the class entries to show the new entry
    await loadClassEntries();
    await loadAllClassCounts();

    // Reset form and close modal
    setNewEntryData({
      handler_name: '',
      dog_call_name: '',
      cwags_number: '',
      entry_type: 'regular',
      jump_height: ''
    });
    setSelectedRound(1);
    setSelectedGamesSubclass(null);
    setShowAddEntryModal(false);

    alert(`Entry ${isNewEntry ? 'added' : 'selection added to existing entry'} successfully to Round ${selectedRound} with fee: $${calculatedFee}!`);

  } catch (error) {
    console.error('Error adding entry:', error);
    setError(error instanceof Error ? error.message : 'Failed to add entry');
  } finally {
    setSaving(false);
  }
};

 const removeEntry = async (entryId: string, entryName: string) => {
  if (!confirm(`Are you sure you want to remove ${entryName}? This will permanently delete this entry.`)) {
    return;
  }

  try {
    setSaving(true);

    const entry = classEntries.find(e => e.id === entryId);
    if (!entry) {
      throw new Error('Entry not found');
    }

    console.log('🗑️ Deleting entry selection:', entryId);

    // Step 1: Delete any scores first (foreign key constraint)
    const { error: scoresError } = await supabase
      .from('scores')
      .delete()
      .eq('entry_selection_id', entryId);

    if (scoresError) {
      console.error('Error deleting scores:', scoresError);
      throw new Error('Failed to delete scores: ' + scoresError.message);
    }

    console.log('✅ Scores deleted (if any existed)');

    // Step 2: Get the fee before deleting so we can update total_fee
    const entryFee = entry.fee || 0;

    // Step 3: Delete the entry_selection
    const { error: deleteError } = await supabase
      .from('entry_selections')
      .delete()
      .eq('id', entryId);

    if (deleteError) {
      console.error('Error deleting entry selection:', deleteError);
      throw new Error('Failed to delete entry: ' + deleteError.message);
    }

    console.log('✅ Entry selection deleted');

    // Step 4: Update the main entry's total_fee (subtract the removed fee)
    if (entry.entry_id) {
      const { data: mainEntry } = await supabase
        .from('entries')
        .select('total_fee')
        .eq('id', entry.entry_id)
        .single();

      if (mainEntry) {
        const newTotalFee = Math.max(0, (mainEntry.total_fee || 0) - entryFee);
        
        await supabase
          .from('entries')
          .update({ total_fee: newTotalFee })
          .eq('id', entry.entry_id);

        console.log('✅ Updated main entry total_fee:', newTotalFee);
      }
    }

    // Step 5: Reload the display
    await loadClassEntries();
    await loadAllClassCounts();

    alert(`${entryName} removed from class successfully!`);

  } catch (error) {
    console.error('Error removing entry:', error);
    setError(error instanceof Error ? error.message : 'Failed to remove entry');
  } finally {
    setSaving(false);
  }
};



// Update the existing Export to Excel button click to set the type:
const handleExportRunningOrder = () => {
  setIsExportProcessing(true);
  setExportType('running-order');
  setShowDaySelector(true);
};

const exportScoreSheets = async () => {
  if (!trial) return;
  
  try {
    setIsExportProcessing(true);
    setExportType('score-sheets');
    setShowDaySelector(true);
  } catch (error) {
    console.error('Error initiating score sheet export:', error);
    alert('Failed to export score sheets');
    setIsExportProcessing(false);
  }
};

{showDaySelector && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {exportType === 'running-order' ? 'Select Day to Export Running Order' : 'Select Day to Export Score Sheets'}
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            setShowDaySelector(false);
            setIsExportProcessing(false); // ADD THIS
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-3">
        {availableDays.map((day) => (
          <Button
            key={day.id}
            variant="outline"
            className="w-full text-left justify-start"
            onClick={() => {
              // Close modal and reset state immediately
              setShowDaySelector(false);
              setIsExportProcessing(false);
              
              // Then start the export
              if (exportType === 'running-order') {
                setSelectedPrintDay(day.id);
                exportRunningOrderToExcel(day.id);
              } else {
               exportScoreSheetsForDay(day.id);


              }
            }}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Day {day.day_number} - {day.formatted_date}
          </Button>
        ))}
      </div>
      
      <div className="flex justify-end mt-4">
        <Button 
          variant="outline" 
          onClick={() => {
            setShowDaySelector(false);
            setIsExportProcessing(false); // ADD THIS
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  </div>
)}

// COMPLETE REPLACEMENT for exportScoreSheetsForDay with FULL FORMATTING

const exportScoreSheetsForDay = async (dayId: string) => {
  if (!trial) {
    alert('Trial data not loaded');
    return;
  }

  try {
    const selectedDay = availableDays.find(d => d.id === dayId);
    if (!selectedDay) return;

    const roundsForDay = trialClasses.filter(cls => cls.trial_day_id === dayId);

    
    if (roundsForDay.length === 0) {
      alert('No rounds found for this day');
      return;
    }

    const entriesResult = await simpleTrialOperations.getTrialEntriesWithSelections(trialId);
    if (!entriesResult.success) {
      alert('Failed to load entries');
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Fix date parsing to avoid timezone bug
    const [year, month, day] = selectedDay.trial_date.split('-').map(Number);
    const formattedDate = new Date(year, month - 1, day, 12, 0, 0).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    for (const round of roundsForDay) {
    console.log('Processing round for score sheet:', {
    roundId: round.id,
    className: round.class_name,
    classType: round.class_type,
    gamesSubclass: round.games_subclass,
    roundNumber: round.round_number
  });

  // Get entries for this round
  const roundEntries: Array<{
    runningOrder: number;
    cwagsNumber: string;
    dogName: string;
    handlerName: string;
  }> = [];

  // ✅ Extract base round ID for Games classes with compound IDs
  let baseRoundId = round.id;
  let targetSubclass = round.games_subclass;
  
  if (round.class_type === 'games' && round.id.includes('-')) {
    const parts = round.id.split('-');
    const lastPart = parts[parts.length - 1];
    
    if (['GB', 'BJ', 'T', 'P', 'C'].includes(lastPart)) {
      baseRoundId = parts.slice(0, -1).join('-');
      targetSubclass = lastPart;
      console.log('Compound Games ID detected:', {
        fullId: round.id,
        baseRoundId: baseRoundId,
        targetSubclass: targetSubclass
      });
    }
  }
     
      (entriesResult.data || []).forEach((entry: any) => {
    const selections = entry.entry_selections || [];
    selections.forEach((selection: any) => {
      // Check if round ID matches
      const roundMatches = selection.trial_round_id === round.id || 
                          selection.trial_round_id === baseRoundId;
      
      // For Games classes, also check subclass matches
      let subclassMatches = true;
      if (round.class_type === 'games' && targetSubclass) {
        subclassMatches = selection.games_subclass === targetSubclass;
        
        console.log('Games entry check:', {
          handler: entry.handler_name,
          dog: entry.dog_call_name,
          selectionRoundId: selection.trial_round_id,
          selectionSubclass: selection.games_subclass,
          targetSubclass: targetSubclass,
          roundMatches: roundMatches,
          subclassMatches: subclassMatches
        });
      }
      
      if (roundMatches && subclassMatches && selection.entry_status !== 'withdrawn') {
        const isFeo = selection.entry_type === 'feo';
        const dogName = isFeo
          ? `${entry.dog_call_name} (FEO)`
                    : (entry.dog_call_name || '');
                    {entry.division && (
  <Badge className={`ml-2 ${getDivisionColor(entry.division)}`}>
    {entry.division}
  </Badge>
)}
        roundEntries.push({
          runningOrder: selection.running_position || 0,
          cwagsNumber: entry.cwags_number || '',
          dogName,
          handlerName: entry.handler_name || ''
        });
      }
    });
  });

  console.log(`Found ${roundEntries.length} entries for ${round.class_name} - ${targetSubclass || 'no subclass'}`);

  roundEntries.sort((a, b) => a.runningOrder - b.runningOrder);

      // Create array - 20 columns (A-T)
      const wsData: any[][] = [];
      const emptyRow = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];

      // Row 1: Title and Date
      wsData.push(['Scent Detection Master Score Sheet', '','','','','','','','','','','Date:','','','', formattedDate, '','','','']);

      // Row 2: CLASS (and logo area B2:D5)
      wsData.push(['', '', '', '', 'CLASS:', "", round.class_name, '', '', '', '', '', '', '', '', '', '', '', '', '']);

      // Row 3: Empty
      wsData.push([...emptyRow]);

      // Row 4: ROUND and JUDGE
      // ✅ FIX: Include games subclass in the round text
      let roundText = `Round ${round.round_number || 1}`;
      if (round.class_type === 'games' && round.games_subclass) {
        roundText += ` - ${round.games_subclass}`;
      }
      
      wsData.push(['', '', '', '', 'ROUND:', '', roundText, '', '', '', 'JUDGE:', '', round.judge_name, '', '', '']);

      // Row 5: Empty
      wsData.push([...emptyRow]);

      // Row 6: Scent headers
      wsData.push(['Scent 1', '', '', '', '', 'Scent 2', '', '', '', '', 'Scent 3', '', '', '', '', 'Scent 4', '', '', '', '']);

      // Row 7: Located in/on
      wsData.push(['Located in/on', '', '', '', '', 'Located in/on', '', '', '', '', 'Located in/on', '', '', '', '', 'Located in/on', '', '', '', '']);

      // Row 8: Instructions
      wsData.push(['Faults: Dropped food. Dog stops working. Handler guiding dog. Incorrect find. Destructive behavior. Disturbing search area by dog or handler. Verbally naming item. Continue search after "alert". SR crossing line less then half.', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);

      // Row 9: Column headers
wsData.push(['Running Order Position', '', 'Handler / Dog', '', '', '', 'Scent 1', 'Scent 2', 'Scent 3', 'Scent 4', 'Fault 1', '', '', 'Fault 2', '', '', 'TIME', '', 'Pass / Fail', '']);

// Rows 10+: Entry data (2 rows per entry)
// ✅ MODIFIED: Running order on top, CWAGS number on bottom (NO MERGE)
roundEntries.forEach((entry) => {
  // First row of entry: Running Order Position in column A
  wsData.push([entry.runningOrder, '', entry.handlerName, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  // Second row of entry: CWAGS Number in column A
  wsData.push([entry.cwagsNumber, '', entry.dogName, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
});
      // Add empty rows to reach row 57 (2-row entries until A56:B57)
      while (wsData.length < 49) {
        wsData.push([...emptyRow]);
        wsData.push([...emptyRow]);
      }

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(wsData);
      // ✅ Disable gridlines (screen + print)
worksheet['!view'] = [{ showGridLines: false }];
worksheet['!printGridlines'] = false;



      // Set ALL column widths to 8
      worksheet['!cols'] = Array(20).fill({ wch: 8});

      // Set row heights
      worksheet['!rows'] = [];
      worksheet['!rows'][5] = { hpt: 80 };  // Row 6 double height (60 instead of 30)
      worksheet['!rows'][6] = { hpt: 80};   // Row 7 double height
      worksheet['!rows'][7] = { hpt: 43 };  // Row 8 same height
      worksheet['!rows'][8] = { hpt: 43};   // Row 9 same height

      // 🔥 Set row heights for rows 10 to 49 (indexes 9–48)
      for (let r = 9; r <= 48; r++) {
        worksheet['!rows'][r] = { hpt: 24 };  // ← change height as desired
      }

      // Set merged cells
      const merges = [
        // Row 1: Title merged A1:K1
        { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
        
        // Row 1: Date label P1:Q1, Date value S1:T1
        { s: { r: 0, c: 11 }, e: { r: 0, c: 14 } },  // L1:O1 "Date:"
        { s: { r: 0, c: 15 }, e: { r: 0, c: 19 } },  // P1:T1 date value
        
        // Row 2: CLASS: E2:F2, Class name G2:I2
        { s: { r: 1, c: 4 }, e: { r: 1, c: 5 } },    // E2:F2 CLASS:
        { s: { r: 1, c: 6 }, e: { r: 1, c: 11 } },    // G2:K2 class name

        // Row 4: ROUND: E4:F4, Round name G4:I4
        { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } },    // E4:F4 ROUND:
        { s: { r: 3, c: 6 }, e: { r: 3, c: 9 } },    // G4:I4 round name
        
        // Row 4: JUDGE O4:P4 (label), Q4:T4 (judge name)
        { s: { r: 3, c: 10 }, e: { r: 3, c: 11 } },  // O4:P4 JUDGE:
        { s: { r: 3, c: 12 }, e: { r: 3, c: 19 } },  // Q4:T4 judge name

        // Row 6: Scent headers
        { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } },    // A6:E6 Scent 1
        { s: { r: 5, c: 5 }, e: { r: 5, c: 9 } },    // F6:J6 Scent 2
        { s: { r: 5, c: 10 }, e: { r: 5, c: 14 } },  // K6:O6 Scent 3
        { s: { r: 5, c: 15 }, e: { r: 5, c: 19 } },  // P6:T6 Scent 4

        // Row 7: Located in/on
        { s: { r: 6, c: 0 }, e: { r: 6, c: 4 } },    // A7:E7
        { s: { r: 6, c: 5 }, e: { r: 6, c: 9 } },    // F7:J7
        { s: { r: 6, c: 10 }, e: { r: 6, c: 14 } },  // K7:O7
        { s: { r: 6, c: 15 }, e: { r: 6, c: 19 } },  // P7:T7

        // Row 8: Instructions
        { s: { r: 7, c: 0 }, e: { r: 7, c: 19 } },   // A8:T8

        // Row 9: Headers
        { s: { r: 8, c: 0 }, e: { r: 8, c: 1 } },    // A9:B9 Registration Number
        { s: { r: 8, c: 2 }, e: { r: 8, c: 5 } },    // C9:F9 Handler/Dog
        { s: { r: 8, c: 10 }, e: { r: 8, c: 12 } },  // K9:M9 Fault 1
        { s: { r: 8, c: 13 }, e: { r: 8, c: 15 } },  // N9:P9 Fault 2
        { s: { r: 8, c: 16 }, e: { r: 8, c: 17 } },  // Q9:R9 TIME
        { s: { r: 8, c: 18 }, e: { r: 8, c: 19 } },  // S9:T9 Pass/Fail
      ];

      // Add entry row merges (starting at row 10, index 9)
      // Create merges for ALL rows from 10 to 57 (24 two-row entries total)
      const totalEntrySlots = 20; // Rows 10-57 = 48 rows = 24 two-row entries
      
      for (let i = 0; i < totalEntrySlots; i++) {
        const rowIndex = 9 + (i * 2);  // Each entry is 2 rows
        
        
// First row of entry: merge A-B for running order
merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 1 } });
// Second row of entry: merge A-B for CWAGS number
merges.push({ s: { r: rowIndex + 1, c: 0 }, e: { r: rowIndex + 1, c: 1 } });
        
        // Handler name (C:F first row)
        merges.push({ s: { r: rowIndex, c: 2 }, e: { r: rowIndex, c: 5 } });
        
        // Dog name (C:F second row)
        merges.push({ s: { r: rowIndex + 1, c: 2 }, e: { r: rowIndex + 1, c: 5 } });
        
        // Scent columns (G:J individual cells, merged vertically)
        merges.push({ s: { r: rowIndex, c: 6 }, e: { r: rowIndex + 1, c: 6 } });   // G
        merges.push({ s: { r: rowIndex, c: 7 }, e: { r: rowIndex + 1, c: 7 } });   // H
        merges.push({ s: { r: rowIndex, c: 8 }, e: { r: rowIndex + 1, c: 8 } });   // I
        merges.push({ s: { r: rowIndex, c: 9 }, e: { r: rowIndex + 1, c: 9 } });   // J
        
        // Fault 1 (K:M)
        merges.push({ s: { r: rowIndex, c: 10 }, e: { r: rowIndex + 1, c: 12 } });
        
        // Fault 2 (N:P)
        merges.push({ s: { r: rowIndex, c: 13 }, e: { r: rowIndex + 1, c: 15 } });
        
        // Time (Q:R)
        merges.push({ s: { r: rowIndex, c: 16 }, e: { r: rowIndex + 1, c: 17 } });
        
        // Pass/Fail (S:T)
        merges.push({ s: { r: rowIndex, c: 18 }, e: { r: rowIndex + 1, c: 19 } });
      }

      worksheet['!merges'] = merges;

      // Apply cell styling
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:T49');
      
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cellAddress]) worksheet[cellAddress] = { v: '' };
          
          const cell = worksheet[cellAddress];
          
          // Determine if this is in columns C-F (2-5) and in a 2-row entry (rows 10+)
          const isHandlerDogColumn = C >= 2 && C <= 5;
          const isDataRow = R >= 9;
          const entryRowIndex = isDataRow ? (R - 9) % 2 : -1;
          
         // NO BORDERS for rows 1-6 (R 0-5)
// BORDERS for rows 7-57 (R >= 6)
let border;
if (R >= 5) {
  border = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } }
  };
  
  // ✅ NEW: A-B columns (Running Order/CWAGS) - remove middle border
  const isRunningOrderCWAGSColumn = C >= 0 && C <= 1;
  
  if (isRunningOrderCWAGSColumn && isDataRow) {
    if (entryRowIndex === 0) {
      border.bottom = { style: 'thin', color: { rgb: 'FFFFFF' } };
    } else if (entryRowIndex === 1) {
      border.top = { style: 'thin', color: { rgb: 'FFFFFF' } };
    }
  }
  
  // Special case: C-F columns in data rows - remove middle border
  if (isHandlerDogColumn && isDataRow) {
    if (entryRowIndex === 0) {
      border.bottom = { style: 'thin', color: { rgb: 'FFFFFF' } };
    } else if (entryRowIndex === 1) {
      border.top = { style: 'thin', color: { rgb: 'FFFFFF' } };
    }
  }
}

          // Rows 1-7: Font size 28, BOLD
         if (R <= 6) {
  if (R === 0) {
    // Row 1: Title (size 34) and Date
    let horizontalAlign = 'left';

    // L:O → right aligned
    if (C >= 11 && C <= 14) {
      horizontalAlign = 'right';
    }

    cell.s = {
      font: { bold: true, sz: 34, name: 'Calibri' },
      alignment: {
        horizontal: horizontalAlign,
        vertical: 'center',
        wrapText: false
      },
      border
    };


            } else if (R === 1) {
              // Row 2: CLASS/Logo area
              cell.s = {
                font: { bold: true, sz: 28, name: 'Calibri' },
                alignment: { 
                  horizontal: (C === 4 || C === 5) ? 'right' : 'left', 
                  vertical: 'center', 
                  wrapText: true 
                },
                border
              };
            } else if (R === 3) {
              cell.s = {
                font: { 
                  bold: true, 
                  sz: 26,              
                  name: 'Calibri' 
                },
                alignment: { 
                  horizontal: (C === 4 || C === 5 || C === 14 || C === 15) ? 'right' : 'left',
                  vertical: 'center',
                  wrapText: true,
                  shrinkToFit: (C === 6) ? true : false   // 👈 SHRINK ONLY JUDGE NAME CELL
                },
                border
              };
            } else if (R === 5) {
              // Row 6: Scent headers
              cell.s = {
                font: { bold: true, sz: 28, name: 'Calibri' },
                alignment: { horizontal: 'center', vertical: 'top', wrapText: true },
                fill: { fgColor: { rgb: 'E8E8E8' } },
                border
              };
            } else if (R === 6) {
              // Row 7: Located in/on
              cell.s = {
                font: { bold: true, sz: 28, name: 'Calibri' },
                alignment: { horizontal: 'center', vertical: 'top', wrapText: true },
                border
              };
            } else {
              // Rows 3, 5
              cell.s = {
                font: { bold: true, sz: 17, name: 'Calibri' },
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                border
              };
            }
          }
          // Rows 8-57: Font size 18
          else {
            cell.s = {
              font: { sz: 18, name: 'Calibri' },
              alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
              border
            };
            
            if (R === 7) {
              // Row 8: Instructions - CENTERED
              cell.s.font.bold = false;
              cell.s.font.italic = false;
              cell.s.alignment.horizontal = 'center';
            } else if (R === 8) {
              // Row 9: Headers
              cell.s.font.bold = true;
              cell.s.fill = { fgColor: { rgb: 'D3D3D3' } };
              
              // Columns G, H, I, J: Shrink to fit
              if (C >= 6 && C <= 9) {
                cell.s.alignment.shrinkToFit = false;
              }
            }
          }
        }
      }

      // Add worksheet
      let sheetName = `${round.class_name} R${round.round_number || 1}`;
      
      if (round.class_type === 'games' && round.games_subclass) {
        sheetName += ` ${round.games_subclass}`;
      }
      
      if (sheetName.length > 31) {
        sheetName = sheetName.substring(0, 31);
      }
      sheetName = sheetName.replace(/[:\\/?*[\]]/g, '');
      
      console.log('Creating worksheet with name:', sheetName);
      
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    const fileName = `Score-Sheets-${trial.trial_name.replace(/[^a-zA-Z0-9]/g, '_')}-${formattedDate.replace(/[,\/]/g, '')}.xlsx`;
 XLSX.writeFile(workbook, fileName);
alert(`Score sheets exported successfully`);



  } catch (error) {
    console.error('Error exporting score sheets:', error);
    alert('Error exporting score sheets. Please try again.');
  }
};

const exportRunningOrderToExcel = async (selectedDayId: string) => {
  if (!selectedClass || !trial) return;

  try {
    const selectedDay = availableDays.find(day => day.id === selectedDayId);
    if (!selectedDay) {
      alert('Selected day not found');
      return;
    }

  interface ClassRoundColumn {
  className: string;
  roundNumber: number;
  judgeName: string;
  classId?: string;
  roundId: string;
  columnHeader: string;
  entries: Array<{
    position: number;
    handlerName: string;
    dogName: string;
    division?: string | null;  // ✅ ADD THIS LINE
    jump_height?: string | null,  // ADD THIS after division
    status: string;
    result: string;
      }>;
}
    
    // Get all classes and rounds for the selected day
    const dayClasses = trialClasses.filter(cls => 
      cls.trial_date === selectedDay.trial_date
    );

    // dayClasses already contains all round info!
    const classRounds: ClassRoundColumn[] = dayClasses.map(cls => ({
      className: cls.class_name,
      roundNumber: cls.round_number || 1,
      judgeName: cls.judge_name,
      classId: cls.class_id,
      roundId: cls.id,
      columnHeader: `${cls.class_name} Round ${cls.round_number || 1}`,
      entries: []
    }));

    // Sort columns - First by class order, then by round number within each class
    classRounds.sort((a, b) => {
      const aClassName = a.className || '';
      const bClassName = b.className || '';
      
      // First sort by class order
      const classOrderA = getClassOrder(aClassName);
      const classOrderB = getClassOrder(bClassName);
      
      if (classOrderA !== classOrderB) {
        return classOrderA - classOrderB;
      }
      
      // Then sort by round number within the same class
      return a.roundNumber - b.roundNumber;
    });

    // Get all scores at once
    const { data: allScores } = await supabase
      .from('scores')
      .select('*');
    
    const scoresMap = new Map();
    if (allScores) {
      allScores.forEach(score => {
        scoresMap.set(score.entry_selection_id, score);
      });
    }
    console.log('Loaded scores for lookup:', allScores?.length || 0);

    // Populate entries for each column with updated result logic
    const entriesResult = await simpleTrialOperations.getTrialEntriesWithSelections(trialId);
    if (entriesResult.success) {
      classRounds.forEach(col => {
        const entries: any[] = [];
        (entriesResult.data || []).forEach((entry: any) => {
          (entry.entry_selections || []).forEach((selection: any) => {
            if (selection.trial_round_id === col.roundId) {
              // FILTER OUT WITHDRAWN ENTRIES FROM EXCEL EXPORT
              const entryStatus = selection.entry_status?.toLowerCase() || 'entered';
              if (entryStatus !== 'withdrawn') {
                const isFeo = selection.entry_type === 'feo';
                const handlerName = entry.handler_name;
                
                // Add "(FEO)" suffix to dog name if it's an FEO entry
                const dogName = isFeo 
                  ? `${entry.dog_call_name} (FEO)`
                  : entry.dog_call_name;
                
                // UPDATED: Get the score data and determine proper result display
                let resultDisplay = '';
                
                // Get score for this entry selection
                const score = scoresMap?.get(selection.id);
                console.log('Excel Debug:', {
                  handlerName: entry.handler_name,
                  className: col.className,
                  score: score,
                  entryType: selection.entry_type,
                  entryStatus: entryStatus
                });

                if (entryStatus === 'no_show' || entryStatus === 'absent') {
                  resultDisplay = 'Abs';
                } else if (isFeo) {
                  resultDisplay = 'FEO';
                } else if (score) {
                  // Check if this is a rally or obedience class
                  const className = col.className || '';
                  const isRallyOrObedience = className.toLowerCase().includes('starter') || 
                          className.toLowerCase().includes('advanced') || 
                          className.toLowerCase().includes('pro') ||
                          className.toLowerCase().includes('obedience') ||
                          className.toLowerCase().includes('zoom') ||
                          className.toLowerCase().includes('rally');
                  
                  if (isRallyOrObedience && score.numerical_score !== null && score.numerical_score !== undefined) {
                    // Rally/Obedience: show score or NQ
                    const passingScore = className.toLowerCase().includes('obedience 5') ? 120 : 70;
                    if (score.numerical_score >= passingScore && score.pass_fail === 'Pass') {
                      resultDisplay = score.numerical_score.toString(); // Show actual score
                    } else {
                      resultDisplay = 'NQ'; // Not Qualified
                    }
                 } else {
  // Other class types (scent, games)
  // Check if it's a Games subclass symbol (GB, BJ, P, T, C)
  const gamesSubclasses = ['GB', 'BJ', 'P', 'T', 'C'];
  if (gamesSubclasses.includes(score.pass_fail)) {
    resultDisplay = score.pass_fail; // Show subclass symbol directly
  } else if (score.pass_fail === 'Pass') {
    resultDisplay = 'Pass';
  } else if (score.pass_fail === 'Fail') {
    resultDisplay = 'F';
  } else if (score.pass_fail === 'FEO') {
    resultDisplay = 'FEO';
  } else if (score.pass_fail === 'ABS') {
    resultDisplay = 'Abs';
  } else {
    resultDisplay = '-';
  }
}
                } else {
                  resultDisplay = '-'; // No score
                }
                
              entries.push({
  position: selection.running_position,
  handlerName: handlerName, 
  dogName: dogName,
  division: selection.division || null,  // ✅ ADD THIS LINE
  jump_height: selection.jump_height || null,  // ADD THIS after division
  status: selection.entry_status,
  result: resultDisplay
});
              } else {
                console.log('Excluding withdrawn entry from Excel:', entry.handler_name, entry.dog_call_name);
              }
            }
          });
        });
        
        // Sort entries and renumber positions to be consecutive (1, 2, 3, 4...)
        const sortedEntries = entries.sort((a, b) => a.position - b.position);
        sortedEntries.forEach((entry, index) => {
          entry.position = index + 1; // Renumber to be consecutive after filtering out withdrawn
        });
        
        col.entries = sortedEntries;
      });
    }

    // Create workbook first
    const workbook = XLSX.utils.book_new();
    
    // Create worksheet with cell objects that include values and styles
    const worksheet: any = {};
    const numColumns = classRounds.length;

    // Row 1: Trial name with full date (merged)
    const titleText = `${trial.trial_name} - ${selectedDay.formatted_date}`;
    worksheet['A1'] = {
      v: titleText,
      s: {
        font: { bold: true, sz: 16, name: 'Calibri' },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    };

    // Fill empty cells for merge
    for (let col = 1; col < numColumns; col++) {
      const cellRef = XLSX.utils.encode_cell({ c: col, r: 0 });
      worksheet[cellRef] = {
        v: '',
        s: {
          font: { bold: true, sz: 16, name: 'Calibri' },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      };
    }

    // Row 2: Short date format
    const [year, month, day] = selectedDay.trial_date.split('-').map(Number);
    const shortDate = new Date(year, month - 1, day, 12, 0, 0).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    for (let col = 0; col < numColumns; col++) {
      const cellRef = XLSX.utils.encode_cell({ c: col, r: 1 });
      worksheet[cellRef] = {
        v: shortDate,
        s: {
          font: { bold: true, sz: 14, name: 'Calibri' },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      };
    }

    // Row 3: Judge names
    for (let col = 0; col < numColumns; col++) {
      const cellRef = XLSX.utils.encode_cell({ c: col, r: 2 });
      worksheet[cellRef] = {
        v: classRounds[col].judgeName,
        s: {
          font: { bold: true, sz: 14, name: 'Calibri' },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      };
    }

    // Row 4: Class headers
    for (let col = 0; col < numColumns; col++) {
      const cellRef = XLSX.utils.encode_cell({ c: col, r: 3 });
      worksheet[cellRef] = {
        v: classRounds[col].columnHeader,
        s: {
          font: { bold: true, sz: 14, name: 'Calibri' },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      };
    }

    // Entry rows
    const maxEntries = Math.max(...classRounds.map(col => col.entries.length));

    for (let entryIndex = 0; entryIndex < maxEntries; entryIndex++) {
      for (let col = 0; col < numColumns; col++) {
        const cellRef = XLSX.utils.encode_cell({ c: col, r: 4 + entryIndex });
        const entry = classRounds[col].entries[entryIndex];
        let cellValue = '';
        
     if (entry) {
  const firstName = entry.handlerName.split(' ')[0];
  // ✅ ADD DIVISION TO CELL VALUE
 // Build info text with division and/or jump height
let infoText = '';
if (entry.division && entry.jump_height) {
  infoText = ` (${entry.division} / ${entry.jump_height}")`;
} else if (entry.division) {
  infoText = ` (${entry.division})`;
} else if (entry.jump_height) {
  infoText = ` (${entry.jump_height}")`;
}

cellValue = `${firstName} - ${entry.dogName}${infoText}`;
  
  console.log('Excel Cell Creation:', {
    originalHandlerName: entry.handlerName,
    firstName: firstName,
    dogName: entry.dogName,
    division: entry.division,
    result: entry.result,
    finalCellValue: cellValue
  });
}

        worksheet[cellRef] = {
          v: cellValue,
          s: {
            font: { sz: 10, name: 'Calibri' },
            alignment: { horizontal: 'center', vertical: 'center' }
          }
        };
      }
    }

    // Set worksheet range
    const lastCol = numColumns - 1;
    const lastRow = 3 + maxEntries;
    worksheet['!ref'] = `A1:${XLSX.utils.encode_col(lastCol)}${lastRow + 1}`;

    // Set column widths - 15 for all columns, except column C (index 2) which is 25
    const columnWidths = Array(numColumns).fill(null).map((_, index) => ({
      wch: index === 2 ? 25 : 15
    }));
    
    worksheet['!cols'] = columnWidths;

    // Merge Row 1
    worksheet['!merges'] = [{ s: { c: 0, r: 0 }, e: { c: numColumns - 1, r: 0 } }];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Running Order');
    // ✅ Excel view settings (no gridlines)
worksheet['!view'] = [{ showGridLines: false }];


    // Download as Excel file
    const fileName = `Running-Order-${selectedDay.formatted_date.replace(/[,\/]/g, '')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    setShowDaySelector(false);
    setSelectedPrintDay(null);

    alert('Running order exported successfully as Excel file!');

  } catch (error) {
    console.error('Error exporting running order:', error);
    alert('Error exporting running order. Please try again.');
  }
};


  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, entry: ClassEntry) => {
    setDraggedEntry(entry);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetEntry: ClassEntry) => {
  e.preventDefault();
  if (draggedEntry && targetEntry && draggedEntry.id !== targetEntry.id) {
    updateRunningPosition(draggedEntry.id, targetEntry.running_position);
  }
  setDraggedEntry(null);
};

// ✅ ADD THESE NEW TOUCH HANDLERS:
// Touch event handlers for mobile drag and drop - ONLY from drag handle
const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, entry: ClassEntry) => {
  e.preventDefault();
  e.stopPropagation();
  
  setTouchStartY(e.touches[0].clientY);
  setTouchedEntry(entry);
  setDraggedEntry(entry);
  setIsDragging(true);
};

const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
  if (!isDragging || !draggedEntry) return;
  
  e.preventDefault();
  e.stopPropagation();
};

const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>, targetEntry: ClassEntry) => {
  if (!isDragging || !draggedEntry || !targetEntry) {
    setTouchedEntry(null);
    setIsDragging(false);
    setDraggedEntry(null);
    return;
  }
  
  if (draggedEntry.id !== targetEntry.id) {
    updateRunningPosition(draggedEntry.id, targetEntry.running_position);
  }
  
  setDraggedEntry(null);
  setTouchedEntry(null);
  setIsDragging(false);
};
  
  const getEntryStatusColor = (status: string) => {
    switch (status) {
      case 'entered': return 'bg-green-100 border-green-200';
      case 'confirmed': return 'bg-orange-100 border-orange-200';
      case 'withdrawn': return 'bg-red-100 border-red-200'; 
      case 'no_show': return 'bg-gray-100 border-gray-200';
      default: return 'bg-orange-100 border-orange-200';
    }
  };

  const getEntryTypeColor = (type: string) => {
    switch (type) {
      case 'feo': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  if (!user) {
    return (
      <MainLayout title="Live Event Management">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>You must be logged in to access this page.</AlertDescription>
        </Alert>
      {showDigitalScoreEntry && selectedClass && (
        <DigitalScoreEntry
  selectedClass={selectedClass}
  trial={trial}
/>

      )}
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout title="Live Event Management">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-600" />
            <p className="text-gray-600">Loading trial data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !trial) {
    return (
      <MainLayout title="Live Event Management">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Trial not found. Please check the trial ID and try again.'}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push(`/dashboard/trials/${trialId}`)}>
            Back to Trial
          </Button>
        </div>
      </MainLayout>
    );
  }

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Trials', href: '/dashboard/trials' },
    { label: trial.trial_name, href: `/dashboard/trials/${trialId}` },
        { label: 'Live Event' }
  ];

  return (
    <MainLayout 
      title="Live Event Management"
      breadcrumbItems={breadcrumbItems}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Live Event Management</h1>
            <p className="text-gray-600">{trial.trial_name} • {trial.location}</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
       
<Card>
  <CardHeader>
    <CardTitle className="flex items-center space-x-2">
      <FileText className="h-5 w-5 text-orange-600" />
      <span>Class Selection</span>
    </CardTitle>
    <CardDescription>
      Select a class to manage running order and scoring
    </CardDescription>
  </CardHeader>
  <CardContent>
    {trialClasses.length === 0 ? (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No classes configured for this trial</p>
      </div>
    ) : (
      (() => {
        // Group classes by day using trial_date from the classes
      const classesByDay = trialClasses.reduce((acc, cls) => {
  const trialDate = cls.trial_date;
  const dayKey = trialDate
    ? (() => {
        const [year, month, day] = trialDate.split('-').map(Number);
        const date = new Date(year, month - 1, day, 12, 0, 0);
        // Sat, Dec 6 style
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
      })()
    : 'Unknown date';


          
          if (!acc[dayKey]) acc[dayKey] = [];
          acc[dayKey].push(cls);
          return acc;
        }, {} as Record<string, typeof trialClasses>);

        const dayKeys = Object.keys(classesByDay).sort((a, b) => {
          // Sort by actual date if available
          const dateA = classesByDay[a][0]?.trial_date;
          const dateB = classesByDay[b][0]?.trial_date;
          if (dateA && dateB) {
            return new Date(dateA).getTime() - new Date(dateB).getTime();
          }
          return a.localeCompare(b);
        });

       return dayKeys.length > 1 ? (
  <Tabs defaultValue={dayKeys[0]} className="w-full">
    <TabsList
      className="grid w-full mb-4 gap-2"
      style={{ gridTemplateColumns: `repeat(${dayKeys.length}, minmax(0, 1fr))` }}
    >
      {dayKeys.map((dayKey) => (
        <TabsTrigger
          key={dayKey}
          value={dayKey}
          className="
            text-sm px-3 py-2 rounded-md
            border-2 border-[#5b3214] text-[#5b3214]
            data-[state=active]:bg-[#5b3214] data-[state=active]:text-white
            hover:bg-white
            transition-colors
          "
        >
          {dayKey}
        </TabsTrigger>
      ))}
    </TabsList>

            
            {dayKeys.map((dayKey) => {
  // ✅ SORT classes by C-WAGS order before displaying
  const sortedClasses = [...classesByDay[dayKey]].sort((a, b) => {
    return getClassOrder(a.class_name) - getClassOrder(b.class_name);
  });
  
  return (
    <TabsContent key={dayKey} value={dayKey}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedClasses.map((cls) => (
          <div
            key={cls.id}
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              selectedClass?.id === cls.id
                ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-200'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => setSelectedClass(cls)}
          >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
  {cls.class_name}
  {cls.round_number && (
    <span className="ml-2 text-orange-600">- Round {cls.round_number}</span>
  )}
</h3>
              <p className="text-sm text-gray-600">Judge: {cls.judge_name}</p>

              {/* NEW — Add rounds */}
              {cls.trial_rounds && cls.trial_rounds.length > 0 && (
                <p className="text-sm text-gray-600">
                  Rounds: {cls.trial_rounds.map(r => r.round_number).join(", ")}
                </p>
              )}

              <p className="text-xs text-gray-500">Type: {cls.class_type}</p>

              {cls.class_type === 'games' && cls.games_subclass && (
                <div className="mt-1">
                  <Badge
                    variant="outline"
                    className="bg-purple-50 text-purple-700 border-purple-200"
                  >
                    <Trophy className="h-3 w-3 mr-1" />
                    {cls.games_subclass}
                  </Badge>
                </div>
              )}
            </div>

            <div className="ml-2">
              <Badge variant="outline">
                {classCounts[cls.id] || 0} entries
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
 </TabsContent>
      );
    })}

          </Tabs>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...trialClasses]
              .sort((a, b) => getClassOrder(a.class_name) - getClassOrder(b.class_name))
              .map((cls) => (
              <div
                key={cls.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedClass?.id === cls.id
                    ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-200'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedClass(cls)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
  {cls.class_name}
  {cls.round_number && (
    <span className="ml-2 text-orange-600">- Round {cls.round_number}</span>
  )}
</h3>
                    <p className="text-sm text-gray-600">Judge: {cls.judge_name}</p>
                    <p className="text-xs text-gray-500">Type: {cls.class_type}</p>
                    {cls.class_type === 'games' && cls.games_subclass && (
                      <div className="mt-1">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          <Trophy className="h-3 w-3 mr-1" />
                          {cls.games_subclass}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="ml-2">
                    <Badge variant="outline">
                      {classCounts[cls.id] || 0} entries
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()
    )}
  </CardContent>
</Card>

{selectedClass && (
  <Tabs defaultValue="setup" className="w-full">

    <TabsList className="flex space-x-2 mb-4">
      <TabsTrigger
        value="setup"
        className="border-2 border-purple-600 rounded-md px-4 py-2 
                   data-[state=active]:bg-purple-600 data-[state=active]:text-white
                   hover:bg-purple-50 transition-colors"
      >
        Running Order Setup
      </TabsTrigger>

      <TabsTrigger
        value="scoring"
        className="border-2 border-purple-600 rounded-md px-4 py-2
                   data-[state=active]:bg-purple-600 data-[state=active]:text-white
                   hover:bg-purple-50 transition-colors"
      >
        Score Entry
      </TabsTrigger>
    </TabsList>

    <TabsContent value="setup" className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-orange-600" />
                <span>{selectedClass.class_name} - Running Order Setup</span>
              </div>

              <p className="text-sm text-muted-foreground ml-7">
  <span className="hidden sm:inline">Entries can be re-arranged with arrow keys or drag and drop</span>
  <span className="sm:hidden">Touch and hold the ⋮⋮ icon to reorder entries</span>
</p>
            </CardTitle>


            <div className="flex items-center space-x-2">
             <Button onClick={() => {
  // Auto-select the currently displayed round
  if (selectedClass?.round_number) {
    setSelectedRound(selectedClass.round_number);
  }
  setShowAddEntryModal(true);
}} variant="outline">
  <Users className="h-4 w-4 mr-2" />
  Add Entry
</Button>
             <Button onClick={handleExportRunningOrder} variant="outline">
              <FileDown className="h-4 w-4 mr-2" />
               Export Running Order
              </Button>
              <Button onClick={exportScoreSheets} variant="outline">
             <FileDown className="h-4 w-4 mr-2" />
              Export Scent Score Sheets
            </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {classEntries.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No entries for this class</p>
            </div>
          ) : (
            // GROUP ENTRIES BY ROUND
            (() => {
              const entriesByRound = classEntries.reduce((acc, entry) => {
                const roundKey = `Round ${entry.round_number}`;
                if (!acc[roundKey]) acc[roundKey] = [];
                acc[roundKey].push(entry);
                return acc;
              }, {} as Record<string, ClassEntry[]>);

              const roundKeys = Object.keys(entriesByRound).sort((a, b) => {
                const numA = parseInt(a.replace('Round ', ''));
                const numB = parseInt(b.replace('Round ', ''));
                return numA - numB;
              });

              return (
                <div className="space-y-6">
                  {roundKeys.map((roundKey) => {
                    const roundEntries = entriesByRound[roundKey];
                    const roundInfo = roundEntries[0]; // Get round info from first entry
                    
                    return (
                      <div key={roundKey} className="border rounded-lg p-4 bg-gray-50">
                        <div className="mb-4 pb-3 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                            <Badge variant="outline" className="bg-orange-100 text-orange-800">
                              {roundKey}
                            </Badge>
                            <span>
                              {selectedClass?.class_name}
                              {selectedClass?.games_subclass && ` - ${selectedClass.games_subclass}`}
                            </span>
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Judge: {roundInfo.trial_rounds.judge_name} • {roundEntries.length} entries
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          {roundEntries.map((entry) => {
                            // FIXED: Use the new display result function
                           const resultDisplay = getDisplayResult(entry, selectedClass);
  const resultClass = getResultBadgeClass(resultDisplay);

 return (
  <div
    key={entry.id}
    draggable={true}
    onDragStart={(e) => handleDragStart(e, entry)}
    onDragOver={handleDragOver}
    onDrop={(e) => handleDrop(e, entry)}
    onClick={() => setSelectedEntryId(entry.id)}
    onKeyDown={(e) => handleKeyNavigation(e, entry)}
    tabIndex={0}
    className={`p-4 border rounded-lg shadow-sm hover:shadow-md transition-all bg-white cursor-pointer ${getEntryStatusColor(entry.entry_status)} ${
      draggedEntry?.id === entry.id ? 'opacity-50 scale-95' : ''
    } ${selectedEntryId === entry.id ? 'ring-2 ring-orange-500 ring-offset-2' : ''}`}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {/* ✅ MODIFIED: Touch handlers ONLY on drag handle */}
        <div 
          className="flex items-center space-x-2"
          onTouchStart={(e) => handleTouchStart(e, entry)}
          onTouchMove={handleTouchMove}
          onTouchEnd={(e) => handleTouchEnd(e, entry)}
        >
          <GripVertical className="h-4 w-4 text-gray-400 cursor-grab active:cursor-grabbing" />
          <span className="text-lg font-bold text-orange-600 min-w-[2rem]">
  #{entry.entry_status === 'withdrawn' 
    ? 'X' 
    : roundEntries
        .filter(e => e.entry_status !== 'withdrawn')
        .filter(e => e.running_position <= entry.running_position)
        .length
  }
</span>
        </div>
  
 <div className="flex-1">
    <div className="flex items-center space-x-3">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900">
            {entry.entries.handler_name}
          </p>
          {entry.division && (
            <Badge 
              variant="outline" 
              className={`text-xs ${
                entry.division === 'A' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                entry.division === 'B' ? 'bg-green-100 text-green-700 border-green-300' :
                entry.division === 'TO' ? 'bg-purple-100 text-purple-700 border-purple-300' :
                entry.division === 'JR' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                'bg-gray-100 text-gray-700 border-gray-300'
              }`}
            >
              Div {entry.division}
            </Badge>
          )}
          {entry.jump_height && (
            <Badge 
              variant="outline" 
              className="text-xs bg-teal-100 text-teal-700 border-teal-300"
            >
              {entry.jump_height}" jump
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-600">
            {entry.entries.dog_call_name} • {entry.entries.cwags_number}
          </div>
        </div>
      </div>
    </div>
  </div>

  <div className="flex items-center space-x-2">
    <div className="flex items-center space-x-2">
      {/* Entry Type Badge (FEO/REGULAR) */}
      <Badge className={`text-xs ${getEntryTypeColor(entry.entry_type)}`}>
        {entry.entry_type.toUpperCase()}
      </Badge>
      
      {/* Result Badge */}
      <Badge className={`text-xs ${resultClass}`}>
        {resultDisplay || 'Pending'}
      </Badge>
    </div>
          
          </div>
        </div>

        <DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="sm">
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="bg-white">
  <DropdownMenuItem onClick={() => updateEntryField(entry.id, 'entry_status', 'entered')}>
    Mark Present
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => updateEntryField(entry.id, 'entry_status', 'confirmed')}>
    Mark Confirmed
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => updateEntryField(entry.id, 'entry_status', 'no_show')}>
    Mark No Show (Absent)
  </DropdownMenuItem>
  <DropdownMenuSeparator />
 <DropdownMenuItem 
  onClick={() => {
    const newType = entry.entry_type === 'feo' ? 'regular' : 'feo';
    updateEntryField(entry.id, 'entry_type', newType);
  }}
>
  <RefreshCw className="h-4 w-4 mr-2" />
  {entry.entry_type === 'feo' ? 'Switch to Regular' : 'Switch to FEO'}
</DropdownMenuItem>
  <DropdownMenuSeparator />
  <DropdownMenuItem onClick={() => {
    setSubstitutingEntryId(entry.id);
    setNewCwagsNumber(entry.entries.cwags_number);
  }}>
    Substitute Dog
  </DropdownMenuItem>
  <DropdownMenuSeparator />
  <DropdownMenuItem onClick={() => removeEntry(entry.id, `${entry.entries.handler_name} - ${entry.entries.dog_call_name}`)}>
    <Trash2 className="h-4 w-4 mr-2 text-red-600" />
    <span className="text-red-600">Remove Entry</span>
  </DropdownMenuItem>
</DropdownMenuContent>
</DropdownMenu>
      </div>
    </div>
  );
})}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </CardContent>
      </Card>
    </TabsContent>
    

    <TabsContent value="scoring" className="space-y-6">
  <DigitalScoreEntry selectedClass={selectedClass} trial={trial} />
</TabsContent>
  </Tabs>
)}

        {/* Quick Stats */}
        {selectedClass && classEntries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-purple-600" />
                <span>Class Summary</span>
                {selectedClass.class_type === 'games' && selectedClass.games_subclass && (
                  <Badge className="bg-purple-100 text-purple-800">
                    <Trophy className="h-3 w-3 mr-1" />
                    {selectedClass.games_subclass}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{classEntries.length}</div>
                  <div className="text-sm text-gray-600">Total Entries</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {classEntries.filter(e => e.entry_status === 'entered').length}
                  </div>
                  <div className="text-sm text-gray-600">Present</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {classEntries.filter(e => e.entry_status === 'confirmed').length}
                  </div>
                  <div className="text-sm text-gray-600">Confirmed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {classEntries.filter(e => e.entry_status === 'withdrawn').length}
                  </div>
                  <div className="text-sm text-gray-600">Withdrawn</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {classEntries.filter(e => e.entry_status === 'no_show').length}
                  </div>
                  <div className="text-sm text-gray-600">No Show</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {classEntries.filter(e => e.entry_type === 'feo').length}
                  </div>
                  <div className="text-sm text-gray-600">FEO</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {classEntries.filter(e => e.scores && e.scores.length > 0 && e.scores[0].pass_fail).length}
                  </div>
                  <div className="text-sm text-gray-600">Scored</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Entry Modal */}
      {showAddEntryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Add New Entry to {selectedClass?.class_name}</h3>
                {selectedClass?.class_type === 'games' && selectedClass?.games_subclass && (
                  <p className="text-sm text-purple-600 mt-1">
                    Games Class - Pass results will show as: {selectedClass.games_subclass}
                  </p>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAddEntryModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="cwags_number">C-WAGS Number *</Label>
                <div className="flex space-x-2">
                  <Input
                    id="cwags_number"
                    value={newEntryData.cwags_number}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewEntryData(prev => ({ ...prev, cwags_number: value }));
                      // Auto-lookup after a brief pause in typing
                      if (value.length >= 8) { // Minimum length for C-WAGS numbers
                        setTimeout(() => lookupCwagsNumber(value), 500);
                      }
                    }}
                    placeholder="e.g. 17-1234-56"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => lookupCwagsNumber(newEntryData.cwags_number)}
                    disabled={!newEntryData.cwags_number}
                  >
                    Lookup
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter C-WAGS number to auto-fill handler and dog name
                </p>
              </div>
                {/* Add this new field AFTER the C-WAGS Number input */}
              <div>
          <Label htmlFor="round_selection">Select Round *</Label>
        <select
        id="round_selection"
        value={selectedRound}
        onChange={(e) => setSelectedRound(parseInt(e.target.value))}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500"
  >
    {/* Show ALL rounds for this class from trialClasses */}
    {(() => {
      if (!selectedClass?.class_id) return <option value="1">Round 1</option>;
      
      // Get ALL rounds for this class from trialClasses
      const availableRounds = trialClasses
        .filter(tc => tc.class_id === selectedClass.class_id)
        .map(tc => tc.round_number)
        .filter((round): round is number => round !== undefined) // ✅ Remove undefined values
        .filter((round, index, arr) => arr.indexOf(round) === index)
        .sort((a, b) => a - b); // ✅ Now a and b are guaranteed to be numbers
      
      // Fallback if no rounds found
      if (availableRounds.length === 0) {
        return <option value="1">Round 1</option>;
      }
      
      return availableRounds.map(roundNum => (
        <option key={roundNum} value={roundNum}>
          Round {roundNum}
        </option>
      ));
    })()}
  </select>
  <p className="text-xs text-gray-500 mt-1">
    Choose which round to add this entry to
  </p>
</div>
              <div>
                <Label htmlFor="handler_name">Handler Name *</Label>
                <Input
                  id="handler_name"
                  value={newEntryData.handler_name}
                  onChange={(e) => setNewEntryData(prev => ({ ...prev, handler_name: e.target.value }))}
                  placeholder="Enter handler name or use C-WAGS lookup"
                />
              </div>

              <div>
                <Label htmlFor="dog_call_name">Dog Name *</Label>
                <Input
                  id="dog_call_name"
                  value={newEntryData.dog_call_name}
                  onChange={(e) => setNewEntryData(prev => ({ ...prev, dog_call_name: e.target.value }))}
                  placeholder="Enter dog name or use C-WAGS lookup"
                />
              </div>

             <div>
                <Label htmlFor="entry_type">Entry Type</Label>
                <Select
                  value={newEntryData.entry_type}
                  onValueChange={(value) => setNewEntryData(prev => ({ ...prev, entry_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
                    <SelectItem value="regular">regular</SelectItem>
                    <SelectItem value="feo">feo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Jump Height - Only for Rally, Obedience, and Games */}
              {selectedClass && ['rally', 'obedience', 'games'].includes(selectedClass.class_type?.toLowerCase() || '') && (
                <div>
                  <Label htmlFor="jump_height">Jump Height (inches) *</Label>
                  <select
                    id="jump_height"
                    value={newEntryData.jump_height || ''}
                    onChange={(e) => setNewEntryData(prev => ({ ...prev, jump_height: e.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500"
                  >
                    <option value="">Select Jump Height</option>
                    <option value="4">4"</option>
                    <option value="8">8"</option>
                    <option value="12">12"</option>
                    <option value="16">16"</option>
                    <option value="20">20"</option>
                    <option value="24">24"</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Required for Rally, Obedience, and Games classes
                  </p>
                </div>
              )}

{/* ✅ NEW: Games Subclass Selector */}
             {selectedClass?.class_type?.toLowerCase() === 'games' && (
                <div>
                  <Label htmlFor="games_subclass">Games Subclass *</Label>
                  <select
                    id="games_subclass"
                    value={selectedGamesSubclass || ''}
                    onChange={(e) => setSelectedGamesSubclass(e.target.value || null)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500"
                  >
                    <option value="">Select Subclass</option>
                    <option value="GB">GB - Grab Bag</option>
                    <option value="BJ">BJ - Blackjack</option>
                    <option value="T">T - Teams</option>
                    <option value="P">P - Pairs</option>
                    <option value="C">C - Colors</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select which Games subclass this entry is for
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 mt-6">
              <Button
  variant="outline"
  onClick={() => {
    setShowAddEntryModal(false);
    setNewEntryData({
      handler_name: '',
      dog_call_name: '',
      cwags_number: '',
      entry_type: 'regular',
      jump_height: ''
    });
    setSelectedRound(1);
    setSelectedGamesSubclass(null);
  }}
  disabled={saving}
>
  Cancel
</Button>
             <Button 
  onClick={addNewEntry}
  disabled={
    saving || 
    !newEntryData.handler_name || 
    !newEntryData.dog_call_name || 
    !newEntryData.cwags_number ||
    (selectedClass?.class_type?.toLowerCase() === 'games' && !selectedGamesSubclass) ||
    (['rally', 'obedience', 'games'].includes(selectedClass?.class_type?.toLowerCase() || '') && !newEntryData.jump_height)
  }
>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Users className="h-4 w-4 mr-2" />
                )}
                Add Entry
              </Button>
            </div>
           </div>
        </div>
      )}
        {/* ✅ ADD SUBSTITUTE DOG MODAL HERE */}
      {substitutingEntryId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Substitute Dog</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSubstitutingEntryId(null);
                  setNewCwagsNumber('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Enter the new C-WAGS registration number. The dog and handler information will be automatically updated from the registry.
              </p>

              <div>
                <Label htmlFor="new_cwags_number">C-WAGS Registration Number *</Label>
                <Input
                  id="new_cwags_number"
                  value={newCwagsNumber}
                  onChange={(e) => setNewCwagsNumber(e.target.value)}
                  onBlur={(e) => setNewCwagsNumber(formatCwagsNumber(e.target.value))}
                  placeholder="XX-XXXX-XX"
                  className="mt-1"
                  maxLength={12}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: XX-XXXX-XX (will auto-format)
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSubstitutingEntryId(null);
                    setNewCwagsNumber('');
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => substituteDog(substitutingEntryId, newCwagsNumber)}
                  disabled={saving || !newCwagsNumber || newCwagsNumber.length < 10}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Users className="h-4 w-4 mr-2" />
                  )}
                  Substitute Dog
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Day Selection Modal */}
      {showDaySelector && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {exportType === 'running-order' ? 'Select Day to Export Running Order' : 'Select Day to Export Score Sheets'}
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowDaySelector(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-3">
  {availableDays.map((day) => (
    <Button
      key={day.id}
      variant="outline"
      className={`w-full text-left justify-start transition-colors
        ${selectedPrintDay === day.id ? "bg-purple-600 text-white" : ""}`}
      onClick={() => {
        // set highlight / store selected day
        setSelectedPrintDay(day.id);

        // run proper export action
        if (exportType === "running-order") {
          exportRunningOrderToExcel(day.id);
        } else {
          exportScoreSheetsForDay(day.id);
        }
      }}
    >
      <Calendar
        className={`h-4 w-4 mr-2 ${
          selectedPrintDay === day.id ? "text-white" : ""
        }`}
      />
      Day {day.day_number} - {day.formatted_date}
    </Button>
  ))}
</div>

<div className="flex justify-end mt-4">
  <Button 
    variant="outline" 
    onClick={() => setShowDaySelector(false)}
  >
    Cancel
  </Button>
</div>

    </div>
  </div>
)}
      </MainLayout>
  );
}