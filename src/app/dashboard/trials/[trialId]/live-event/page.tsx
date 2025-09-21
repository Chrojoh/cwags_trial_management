'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
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
  Eye,
  AlertTriangle,
  Loader2,
  AlertCircle,
  Calendar,
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
  id: string;
  class_name: string;
  class_type: string;
  games_subclass?: string | null;
  judge_name: string;
  trial_date: string;
  trial_day_id: string;
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
  id: string; // entry_selection_id
  entry_id: string;
  running_position: number;
  entry_type: string;
  entry_status: string;
  round_number: number; // Add this
  round_id: string; // Add this
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

// Add this function near the top of your live event page component, 
// after the interfaces and before the component export
const getClassOrder = (className: string): number => {
  const classOrder = [
    'Patrol', 'Detective', 'Investigator', 'Super Sleuth', 'Private Inv',
    'Detective Diversions', 'Ranger 1', 'Ranger 2', 'Ranger 3', 'Ranger 4', 'Ranger 5',
    'Dasher 3', 'Dasher 4', 'Dasher 5', 'Dasher 6',
    'Obedience 1', 'Obedience 2', 'Obedience 3', 'Obedience 4', 'Obedience 5',
    'Starter', 'Advanced', 'Pro', 'ARF',
    'Zoom 1', 'Zoom 1.5', 'Zoom 2',
    'Games 1', 'Games 2', 'Games 3', 'Games 4'
  ];
  
  const index = classOrder.findIndex(order => {
    if (className.includes('Games')) {
      return className.startsWith(order);
    }
    return className === order;
  });
  
  return index === -1 ? 999 : index;
};

// Place this function right after your interface definitions and before:
// export default function LiveEventManagementPage() {
export default function LiveEventManagementPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const trialId = params.trialId as string;
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [trial, setTrial] = useState<Trial | null>(null);
  const [trialClasses, setTrialClasses] = useState<TrialClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<TrialClass | null>(null);
  const [classEntries, setClassEntries] = useState<ClassEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [draggedEntry, setDraggedEntry] = useState<ClassEntry | null>(null);
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [showDaySelector, setShowDaySelector] = useState(false);
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
    entry_type: 'regular'
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
    const dayKey = trialDate ? 
      `Day ${new Date(trialDate).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}` :
      'Day 1';
    
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

  const renderClassCard = (cls: any) => (
    <div
      key={cls.id}
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        selectedClass?.id === cls.id
          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
          : 'border-gray-200 hover:bg-gray-50'
      }`}
      onClick={() => setSelectedClass(cls)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{cls.class_name}</h3>
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
  );

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
        
        {dayKeys.map((dayKey) => (
          <TabsContent key={dayKey} value={dayKey}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {classesByDay[dayKey].map(renderClassCard)}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    );
  } else {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {trialClasses.map(renderClassCard)}
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

  const loadTrialData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading trial data for live event management:', trialId);

      // Load trial basic info
      const trialResult = await simpleTrialOperations.getTrial(trialId);
      if (!trialResult.success) {
        throw new Error('Failed to load trial data');
      }

      setTrial(trialResult.data);

      // Load all trial classes with judges and Games subclass
      const classesResult = await simpleTrialOperations.getAllTrialClasses(trialId);
      if (!classesResult.success) {
        throw new Error('Failed to load trial classes');
      }

      // Get judges for each class
      const classesWithJudges = await Promise.all(
        (classesResult.data || []).map(async (cls: any) => {
          try {
            const roundsResult = await simpleTrialOperations.getTrialRounds(cls.id);
            const judge = roundsResult.success && roundsResult.data.length > 0 
              ? roundsResult.data[0].judge_name 
              : 'No Judge Assigned';
            
            return {
              id: cls.id,
              class_name: cls.class_name,
              class_type: cls.class_type || 'scent',
              games_subclass: cls.games_subclass || null,
              judge_name: judge,
              trial_date: cls.trial_days?.trial_date || '',
              trial_day_id: cls.trial_day_id
            };
          } catch (error) {
            console.error(`Error loading judge for class ${cls.id}:`, error);
            return {
              id: cls.id,
              class_name: cls.class_name,
              class_type: cls.class_type || 'scent',
              games_subclass: cls.games_subclass || null,
              judge_name: 'Error Loading Judge',
              trial_date: cls.trial_days?.trial_date || '',
              trial_day_id: cls.trial_day_id
            };
          }
        })
      );

      setTrialClasses(classesWithJudges);

      if (classesWithJudges.length > 0 && !selectedClass) {
        setSelectedClass(classesWithJudges[0]);
      }

      console.log('Trial data loaded successfully with Games subclass');
    } catch (err) {
      console.error('Error loading trial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trial data');
    } finally {
      setLoading(false);
    }
  };

const loadClassEntries = async () => {
  if (!selectedClass) return;

  try {
    setError(null);
    console.log('Loading entries for class:', selectedClass.id);

    // Get all rounds for this class
    const roundsResult = await simpleTrialOperations.getTrialRounds(selectedClass.id);
    if (!roundsResult.success) {
      console.error('Failed to load rounds for class:', roundsResult.error);
      setClassEntries([]);
      return;
    }

    const classRounds: TrialRound[] = roundsResult.data || [];
    console.log('Found rounds for class:', classRounds);

    // Get entries for this trial
    const entriesResult = await simpleTrialOperations.getTrialEntriesWithSelections(trialId);
    if (!entriesResult.success) {
      throw new Error('Failed to load entries');
    }

    // Filter and structure entries for this class's rounds
    const classEntriesData: ClassEntry[] = [];
    (entriesResult.data || []).forEach((entry: any) => {
      const selections = entry.entry_selections || [];
      selections.forEach((selection: any) => {
        // Check if this selection is for any round in our selected class
        const roundForSelection = classRounds.find((r: TrialRound) => r.id === selection.trial_round_id);
        if (roundForSelection) {
          // FILTER OUT WITHDRAWN ENTRIES - DON'T ADD THEM TO THE LIST
          const entryStatus = selection.entry_status || 'entered';
          if (entryStatus.toLowerCase() !== 'withdrawn') {
            classEntriesData.push({
              id: selection.id,
              entry_id: entry.id,
              running_position: selection.running_position || 1,
              entry_type: selection.entry_type || 'regular',
              entry_status: entryStatus, // Use the checked status
              round_number: roundForSelection.round_number,
              round_id: roundForSelection.id,
              entries: {
                handler_name: entry.handler_name,
                dog_call_name: entry.dog_call_name,
                cwags_number: entry.cwags_number
              },
              trial_rounds: {
                judge_name: roundForSelection.judge_name,
                trial_classes: {
                  class_name: selectedClass.class_name,
                  class_type: selectedClass.class_type,
                  games_subclass: selectedClass.games_subclass
                }
              },
              scores: []
            });
          } else {
            console.log('Excluding withdrawn entry:', entry.handler_name, entry.dog_call_name);
          }
        }
      });
    });

    // Sort by round number first, THEN by running position within each round
    classEntriesData.sort((a, b) => {
      if (a.round_number !== b.round_number) {
        return a.round_number - b.round_number;
      }
      return a.running_position - b.running_position;
    });

    // IMPORTANT: Fix running positions after filtering out withdrawn entries
    // Reset positions to be consecutive within each round (1, 2, 3, 4...)
    const entriesByRound = classEntriesData.reduce((acc, entry) => {
      if (!acc[entry.round_number]) acc[entry.round_number] = [];
      acc[entry.round_number].push(entry);
      return acc;
    }, {} as Record<number, ClassEntry[]>);

    // Reassign running positions within each round to be consecutive
    Object.values(entriesByRound).forEach(roundEntries => {
      roundEntries.forEach((entry, index) => {
        entry.running_position = index + 1; // Reset to 1, 2, 3, 4... within each round
      });
    });

    // Flatten back to single array, maintaining round grouping
    const correctedEntries = Object.keys(entriesByRound)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .flatMap(roundNum => entriesByRound[parseInt(roundNum)]);

    // Load existing scores for all entries
    const entriesWithScores = await Promise.all(
      correctedEntries.map(async (entry) => {
        try {
          const { data: scores, error } = await supabase
            .from('scores')
            .select('*')
            .eq('entry_selection_id', entry.id);

          if (!error && scores && scores.length > 0) {
            entry.scores = scores;
          }
          return entry;
        } catch (error) {
          console.error('Error loading scores for entry:', entry.id, error);
          return entry;
        }
      })
    );

    setClassEntries(entriesWithScores);
    console.log(`Loaded ${entriesWithScores.length} active entries for class (withdrawn entries excluded)`);

  } catch (err) {
    console.error('Error loading class entries:', err);
    setError(err instanceof Error ? err.message : 'Failed to load class entries');
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
      if (field === 'entry_type') updates.entry_type = value;
      if (field === 'entry_status') updates.entry_status = value;
      
      // Use updateEntrySelection function
      const result = await simpleTrialOperations.updateEntrySelection(entryId, updates);
      if (!result.success) {
        console.error('Failed to update entry selection:', result.error);
        loadClassEntries(); // Reload on error
        return;
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
    
const loadAllClassCounts = async () => {
  if (trialClasses.length === 0) return;
  
  try {
    console.log('Loading entry counts for', trialClasses.length, 'classes');
    const entriesResult = await simpleTrialOperations.getTrialEntriesWithSelections(trialId);
    if (!entriesResult.success) return;

    const counts: Record<string, number> = {};
    
    trialClasses.forEach(cls => {
      const classEntryCount = (entriesResult.data || []).reduce((count: number, entry: any) => {
        const selectionsForClass = entry.entry_selections?.filter((selection: any) => 
          selection.trial_rounds?.trial_class_id === cls.id
        ) || [];
        return count + selectionsForClass.length;
      }, 0);
      
      counts[cls.id] = classEntryCount;
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
      const daysWithFormatting = (result.data || []).map((day: any) => ({
        ...day,
        formatted_date: new Date(day.trial_date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
      })).sort((a: any, b: any) => a.day_number - b.day_number);
      
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

   const updateScore = (entryId: string, scoreField: string, value: string | number | null) => {
    // Update local state immediately
    setClassEntries(prev =>
      prev.map(entry => {
        if (entry.id === entryId) {
          const updatedScores = entry.scores || [{}];
          if (updatedScores.length === 0) updatedScores.push({});
          updatedScores[0] = {
            ...updatedScores[0],
            [scoreField]: value
          };
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
        
        // Handle Games subclass results
        let result = '';
        if (selectedClass.class_type === 'games' && score?.pass_fail === 'Pass' && selectedClass.games_subclass) {
          result = selectedClass.games_subclass;
        } else {
          result = score?.pass_fail || '';
        }

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
    if (!cwagsNumber.trim()) return;

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
      } else {
        setNewEntryData(prev => ({ ...prev, cwags_number: formattedNumber }));
      }
    } catch (error) {
      console.error('Error looking up C-WAGS number:', error);
      setNewEntryData(prev => ({ ...prev, cwags_number: formattedNumber }));
    }
  };

// FIXED addNewEntry function for live event page
const addNewEntry = async () => {
  if (!selectedClass || !newEntryData.handler_name || !newEntryData.dog_call_name || !newEntryData.cwags_number) {
    setError('All entry fields are required');
    return;
  }

  try {
    setSaving(true);
    setError(null);

    console.log('Adding new entry to class:', selectedClass.class_name, 'Round:', selectedRound);

    // Get all rounds for this class
    const roundsResult = await simpleTrialOperations.getTrialRounds(selectedClass.id);
    if (!roundsResult.success || !roundsResult.data) {
      throw new Error('Failed to get class rounds');
    }

    const classRounds = roundsResult.data;
    console.log('Available rounds for class:', classRounds.map((r: any) => `Round ${r.round_number} (ID: ${r.id})`));

    // Find the specific round the user selected
    const targetRound = classRounds.find((round: any) => round.round_number === selectedRound);
    if (!targetRound) {
      throw new Error(`Round ${selectedRound} not found for this class`);
    }

    console.log('Target round found:', targetRound.id, 'for round number:', selectedRound);

    // CALCULATE PROPER FEE BASED ON ENTRY TYPE - THIS IS THE KEY FIX!
    let calculatedFee = 0;
    const isFeO = newEntryData.entry_type.toLowerCase() === 'feo';
    
    console.log('Fee calculation debug:', {
      entry_type: newEntryData.entry_type,
      isFeO: isFeO,
      feo_available: targetRound.feo_available,
      trial_classes: targetRound.trial_classes
    });

    if (isFeO) {
      // Check if FEO pricing is available for this round
      if (targetRound.feo_available && targetRound.trial_classes?.feo_price !== undefined) {
        calculatedFee = targetRound.trial_classes.feo_price;
        console.log('Using FEO pricing from database:', calculatedFee);
      } else if (targetRound.trial_classes?.entry_fee) {
        // Fallback: some trials offer FEO at reduced rate (e.g., 50% of regular)
        calculatedFee = Math.round(targetRound.trial_classes.entry_fee * 0.5);
        console.log('Using 50% of regular fee for FEO:', calculatedFee);
      } else {
        calculatedFee = 0; // Some trials offer FEO for free
        console.log('FEO entry set to free');
      }
    } else {
      // Regular entry
      calculatedFee = targetRound.trial_classes?.entry_fee || 0;
      console.log('Using regular pricing:', calculatedFee);
    }

    console.log('Final calculated fee:', calculatedFee);

    // Create the main entry record WITH the calculated total fee
    const entryResult = await simpleTrialOperations.createEntry({
      trial_id: trialId,
      handler_name: newEntryData.handler_name,
      dog_call_name: newEntryData.dog_call_name,
      cwags_number: newEntryData.cwags_number,
      dog_breed: '',
      dog_sex: '',
      handler_email: '',
      handler_phone: '',
      is_junior_handler: false,
      waiver_accepted: true,
      total_fee: calculatedFee, // ← SET THE CORRECT TOTAL FEE HERE
      payment_status: 'pending',
      entry_status: 'submitted'
    });

    if (!entryResult.success) {
      throw new Error(entryResult.error as string);
    }

    // Calculate next running position for the SELECTED round (not all rounds)
    const roundEntries = classEntries.filter(e => e.round_number === selectedRound);
    const nextPosition = roundEntries.length > 0 
      ? Math.max(...roundEntries.map(e => e.running_position)) + 1 
      : 1;

    console.log('Next running position for round', selectedRound, ':', nextPosition);

    // Create entry selection with the SAME calculated fee
    const selectionResult = await simpleTrialOperations.createEntrySelections(entryResult.data.id, [{
      trial_round_id: targetRound.id,
      entry_type: newEntryData.entry_type,
      fee: calculatedFee, // ← USE THE SAME CALCULATED FEE HERE
      running_position: nextPosition,
      entry_status: 'entered'
    }]);

    if (!selectionResult.success) {
      throw new Error(selectionResult.error as string);
    }

    // Reload the class entries to show the new entry
    await loadClassEntries();
    await loadAllClassCounts();

    // Reset form and close modal
    setNewEntryData({
      handler_name: '',
      dog_call_name: '',
      cwags_number: '',
      entry_type: 'regular'
    });
    setSelectedRound(1); // Reset to round 1
    setShowAddEntryModal(false);

    alert(`Entry added successfully to Round ${selectedRound} with fee: $${calculatedFee}!`);

  } catch (error) {
    console.error('Error adding entry:', error);
    setError(error instanceof Error ? error.message : 'Failed to add entry');
  } finally {
    setSaving(false);
  }
};

  const removeEntry = async (entryId: string, entryName: string) => {
    if (!confirm(`Remove ${entryName} from this class? This cannot be undone.`)) {
      return;
    }

    try {
      setSaving(true);

      const entry = classEntries.find(e => e.id === entryId);
      if (!entry) {
        throw new Error('Entry not found');
      }

      const result = await simpleTrialOperations.updateEntrySelection(entryId, {
        entry_status: 'withdrawn'
      });

      if (!result.success) {
        throw new Error(result.error as string);
      }

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

  const editDogName = async (entryId: string, currentName: string) => {
    const newName = prompt('Enter new dog name:', currentName);
    if (newName && newName !== currentName) {
      try {
        const entry = classEntries.find(e => e.id === entryId);
        if (entry) {
          await updateEntryField(entry.entry_id, 'dog_call_name', newName);
          await loadClassEntries();
        }
      } catch (error) {
        console.error('Error updating dog name:', error);
        setError('Failed to update dog name');
      }
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

    // Get all classes and rounds for the selected day
    const dayClasses = trialClasses.filter(cls => 
      cls.trial_date === selectedDay.trial_date
    );

    // Get all rounds for all classes on this day
    const classRounds: any[] = [];
    for (const cls of dayClasses) {
      const roundsResult = await simpleTrialOperations.getTrialRounds(cls.id);
      if (roundsResult.success && roundsResult.data) {
        roundsResult.data.forEach((round: any) => {
          classRounds.push({
            className: cls.class_name,
            roundNumber: round.round_number,
            judgeName: round.judge_name,
            classId: cls.id,
            roundId: round.id,
            columnHeader: `${cls.class_name} Round ${round.round_number}`,
            entries: []
          });
        });
      }
    }

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

   // Populate entries for each column
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
                const handlerName = entry.handler_name; // Always use clean handler name
                
                // Add "feo" suffix to dog name if it's an FEO entry
                const dogName = isFeo 
                  ? `${entry.dog_call_name} FEO`
                  : entry.dog_call_name;
                
                entries.push({
                  position: selection.running_position,
                  handlerName: handlerName, 
                  dogName: dogName, // Now includes "feo" suffix when applicable
                  status: selection.entry_status
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
    const shortDate = new Date(selectedDay.trial_date).toLocaleDateString('en-US', {
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
          cellValue = `${firstName} - ${entry.dogName}`; // Now dogName includes "feo" suffix if applicable
          
          console.log('Excel Cell Creation:', {
            originalHandlerName: entry.handlerName,
            firstName: firstName,
            dogName: entry.dogName,
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

  const getEntryStatusColor = (status: string) => {
    switch (status) {
      case 'entered': return 'bg-green-100 border-green-200';
      case 'confirmed': return 'bg-blue-100 border-blue-200';
      case 'withdrawn': return 'bg-red-100 border-red-200'; 
      case 'no_show': return 'bg-gray-100 border-gray-200';
      default: return 'bg-blue-100 border-blue-200';
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
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout title="Live Event Management">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
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
      <FileText className="h-5 w-5 text-blue-600" />
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
          const dayKey = trialDate ? 
            `Day ${new Date(trialDate).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}` :
            'Day 1';
          
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
            <TabsList className="grid w-full mb-4" style={{ gridTemplateColumns: `repeat(${dayKeys.length}, minmax(0, 1fr))` }}>
              {dayKeys.map((dayKey) => (
                <TabsTrigger key={dayKey} value={dayKey} className="text-sm px-2">
                  {dayKey}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {dayKeys.map((dayKey) => (
              <TabsContent key={dayKey} value={dayKey}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {classesByDay[dayKey].map((cls) => (
                    <div
                      key={cls.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedClass?.id === cls.id
                          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedClass(cls)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{cls.class_name}</h3>
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
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trialClasses.map((cls) => (
              <div
                key={cls.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedClass?.id === cls.id
                    ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedClass(cls)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{cls.class_name}</h3>
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
    <TabsList>
      <TabsTrigger value="setup">Running Order Setup</TabsTrigger>
      <TabsTrigger value="scoring">Score Entry</TabsTrigger>
    </TabsList>

    <TabsContent value="setup" className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span>{selectedClass.class_name} - Running Order Setup</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
             <Button onClick={() => setShowDaySelector(true)} variant="outline">
              <FileDown className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
              <Button onClick={() => setShowAddEntryModal(true)} variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Add Entry
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
                            <Badge variant="outline" className="bg-blue-100 text-blue-800">
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
                            const score = entry.scores?.[0];
                            let resultDisplay = '';
                            let resultClass = 'bg-gray-100 text-gray-600 border-gray-200';
                            
                            if (score?.pass_fail) {
                              if (selectedClass.class_type === 'games' && score.pass_fail === 'Pass' && selectedClass.games_subclass) {
                                resultDisplay = selectedClass.games_subclass;
                                resultClass = 'bg-purple-100 text-purple-700 border-purple-200';
                              } else if (score.pass_fail === 'Pass') {
                                resultDisplay = 'Pass';
                                resultClass = 'bg-green-100 text-green-700 border-green-200';
                              } else if (score.pass_fail === 'Fail') {
                                resultDisplay = 'Fail';
                                resultClass = 'bg-red-100 text-red-700 border-red-200';
                              } else {
                                resultDisplay = score.pass_fail;
                                resultClass = 'bg-blue-100 text-blue-700 border-blue-200';
                              }
                            }

                            return (
                            <div
                              key={entry.id}
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, entry)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, entry)}
                              className={`p-4 border rounded-lg shadow-sm hover:shadow-md transition-all bg-white cursor-move ${getEntryStatusColor(entry.entry_status)} ${
                                draggedEntry?.id === entry.id ? 'opacity-50' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-2">
                                    <GripVertical className="h-4 w-4 text-gray-400" />
                                    <span className="text-lg font-bold text-blue-600 min-w-[2rem]">
                                      #{entry.entry_status === 'withdrawn' ? 'X' : entry.running_position}
                                    </span>
                                  </div>
                                  
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                      <div>
                                        <p className="font-semibold text-gray-900">
                                          {entry.entries.handler_name}
                                        </p>
                                        <div className="flex items-center space-x-2">
                                          {editingEntry === entry.id ? (
                                            <div className="flex items-center space-x-2">
                                              <Input
                                                defaultValue={entry.entries.dog_call_name}
                                                className="w-32 h-8"
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') {
                                                    updateEntryField(entry.id, 'dog_call_name', (e.target as HTMLInputElement).value);
                                                    setEditingEntry(null);
                                                  } else if (e.key === 'Escape') {
                                                    setEditingEntry(null);
                                                  }
                                                }}
                                                onBlur={(e) => {
                                                  updateEntryField(entry.id, 'dog_call_name', e.target.value);
                                                  setEditingEntry(null);
                                                }}
                                                autoFocus
                                              />
                                            </div>
                                          ) : (
                                            <p 
                                              className="text-sm text-gray-600 cursor-pointer hover:text-blue-600"
                                              onClick={() => setEditingEntry(entry.id)}
                                            >
                                              {entry.entries.dog_call_name} • {entry.entries.cwags_number}
                                              <Edit className="h-3 w-3 inline ml-1" />
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <Badge className={`${getEntryTypeColor(entry.entry_type)} border`}>
                                      {entry.entry_type}
                                    </Badge>
                                    <Badge variant="outline">
                                      {entry.entry_status}
                                    </Badge>
                                    {resultDisplay && (
                                      <Badge className={`border ${resultClass}`}>
                                        {resultDisplay}
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
  <DropdownMenuItem onClick={() => updateEntryField(entry.id, 'entry_status', 'entered')}>
    Mark Present
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => updateEntryField(entry.id, 'entry_status', 'confirmed')}>
    Mark Confirmed
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => updateEntryField(entry.id, 'entry_status', 'withdrawn')}>
    Withdraw Entry (Remove from running order)
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => updateEntryField(entry.id, 'entry_status', 'no_show')}>
    Mark No Show
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-green-600" />
                <span>{selectedClass.class_name} - Score Entry</span>
              </CardTitle>
              <CardDescription className="flex items-center space-x-4">
                <span>Enter scores as judge sheets are returned</span>
                {selectedClass.class_type === 'games' && selectedClass.games_subclass && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    <Trophy className="h-3 w-3 mr-1" />
                    Games: {selectedClass.games_subclass} (Pass = {selectedClass.games_subclass})
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={saveAllScores} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save All Scores
              </Button>
              <Button variant="outline" onClick={exportScores}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => setShowAddEntryModal(true)}>
                <Users className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {classEntries.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No entries for this class</p>
            </div>
          ) : (
            // GROUP SCORING BY ROUND TOO
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
                    const roundInfo = roundEntries[0];
                    
                    return (
                      <div key={roundKey} className="border rounded-lg p-4 bg-gray-50">
                        <div className="mb-4 pb-3 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                            <Badge variant="outline" className="bg-green-100 text-green-800">
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

                        <div className="space-y-4">
                          {roundEntries.map((entry) => {
                            const score = entry.scores?.[0] || {};
                            
                            return (
                              <div key={entry.id} className="bg-white border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center space-x-4">
                                    <span className="text-lg font-bold text-blue-600 min-w-[2rem]">
                                      #{entry.entry_status === 'withdrawn' ? 'X' : entry.running_position}
                                    </span>
                                    <div>
                                      <p className="font-semibold text-gray-900">
                                        {entry.entries.handler_name}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        {entry.entries.dog_call_name} • {entry.entries.cwags_number}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge className={`${getEntryTypeColor(entry.entry_type)} border`}>
                                      {entry.entry_type}
                                    </Badge>
                                    <Badge variant="outline">
                                      {entry.entry_status}
                                    </Badge>
                                  </div>
                                </div>

{/* Scoring fields based on class type */}
{selectedClass.class_type === 'scent' && (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
    <div className="space-y-1">
      <Label className="text-xs">Scent 1</Label>
      <Select
        value={score.scent1 || ''}
        onValueChange={(value) => updateScore(entry.id, 'scent1', value)}
      >
        <SelectTrigger className="h-8">
          <SelectValue placeholder="-" />
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
          <SelectItem value="Pass">Pass</SelectItem>
          <SelectItem value="Fail">Fail</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-1">
      <Label className="text-xs">Scent 2</Label>
      <Select
        value={score.scent2 || ''}
        onValueChange={(value) => updateScore(entry.id, 'scent2', value)}
      >
        <SelectTrigger className="h-8">
          <SelectValue placeholder="-" />
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
          <SelectItem value="Pass">Pass</SelectItem>
          <SelectItem value="Fail">Fail</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-1">
      <Label className="text-xs">Scent 3</Label>
      <Select
        value={score.scent3 || ''}
        onValueChange={(value) => updateScore(entry.id, 'scent3', value)}
      >
        <SelectTrigger className="h-8">
          <SelectValue placeholder="-" />
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
          <SelectItem value="Pass">Pass</SelectItem>
          <SelectItem value="Fail">Fail</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-1">
      <Label className="text-xs">Scent 4</Label>
      <Select
        value={score.scent4 || ''}
        onValueChange={(value) => updateScore(entry.id, 'scent4', value)}
      >
        <SelectTrigger className="h-8">
          <SelectValue placeholder="-" />
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
          <SelectItem value="Pass">Pass</SelectItem>
          <SelectItem value="Fail">Fail</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
)}

                                {selectedClass.class_type === 'rally' && (
                                  <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Time (seconds)</Label>
                                      <Input
                                        type="number"
                                        className="h-8"
                                        value={score.time_seconds || ''}
                                        onChange={(e) => updateScore(entry.id, 'time_seconds', parseFloat(e.target.value) || null)}
                                        placeholder="0"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Score</Label>
                                      <Input
                                        type="number"
                                        className="h-8"
                                        value={score.numerical_score || ''}
                                        onChange={(e) => updateScore(entry.id, 'numerical_score', parseFloat(e.target.value) || null)}
                                        placeholder="0"
                                      />
                                    </div>
                                  </div>
                                )}

                                {selectedClass.class_type === 'games' && (
                                  <div className="space-y-4 mb-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <Label className="text-xs">Time (seconds)</Label>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          className="h-8"
                                          value={score.time_seconds || ''}
                                          onChange={(e) => updateScore(entry.id, 'time_seconds', parseFloat(e.target.value) || null)}
                                          placeholder="0.00"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs">Faults</Label>
                                        <Input
                                          type="number"
                                          className="h-8"
                                          value={score.fault1 || ''}
                                          onChange={(e) => updateScore(entry.id, 'fault1', e.target.value)}
                                          placeholder="0"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  <div className="space-y-1">
    <Label className="text-xs">Entry Type</Label>
    <Select
      value={entry.entry_type || 'regular'}
      onValueChange={(value) => updateEntryField(entry.id, 'entry_type', value)}
    >
      <SelectTrigger className="h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
        <SelectItem value="regular">Regular</SelectItem>
        <SelectItem value="feo">FEO</SelectItem>
      </SelectContent>
    </Select>
  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Result</Label>
                                    <Select
  value={score.pass_fail || ''}
  onValueChange={(value) => updateScore(entry.id, 'pass_fail', value)}
>
  <SelectTrigger className="h-8">
    <SelectValue placeholder="Select result..." />
  </SelectTrigger>
  <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
    <SelectItem value="Pass">Pass</SelectItem>
    <SelectItem value="Fail">Fail</SelectItem>
    {selectedClass.class_type === 'games' && selectedClass.games_subclass && (
      <SelectItem value={selectedClass.games_subclass.toLowerCase()}>
        {selectedClass.games_subclass}
      </SelectItem>
    )}
  </SelectContent>
</Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Status</Label>
                                    <Select
                                      value={entry.entry_status}
                                      onValueChange={(value) => updateEntryField(entry.id, 'entry_status', value)}
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                     <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                                        <SelectItem value="entered">Present</SelectItem>
                                        <SelectItem value="confirmed">Confirmed</SelectItem>
                                        <SelectItem value="withdrawn">Withdrawn</SelectItem>
                                        <SelectItem value="no_show">No Show</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-xs">Judge Notes</Label>
                                  <Textarea
                                    className="h-16 text-xs"
                                    value={score.judge_notes || ''}
                                    onChange={(e) => updateScore(entry.id, 'judge_notes', e.target.value)}
                                    placeholder="Optional notes..."
                                  />
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
                  <div className="text-2xl font-bold text-blue-600">{classEntries.length}</div>
                  <div className="text-sm text-gray-600">Total Entries</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {classEntries.filter(e => e.entry_status === 'entered').length}
                  </div>
                  <div className="text-sm text-gray-600">Present</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
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
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                >
                  {/* Show all available rounds for this class */}
                  {(() => {
                    const availableRounds = classEntries
                      .map(entry => entry.round_number)
                      .filter((round, index, arr) => arr.indexOf(round) === index)
                      .sort((a, b) => a - b);
                    
                    // If no entries exist yet, default to showing Round 1
                    if (availableRounds.length === 0) {
                      availableRounds.push(1);
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
                  <SelectContent>
                    <SelectItem value="regular">regular</SelectItem>
                    <SelectItem value="feo">feo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowAddEntryModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button 
                onClick={addNewEntry}
                disabled={saving || !newEntryData.handler_name || !newEntryData.dog_call_name || !newEntryData.cwags_number}
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
      {/* Day Selection Modal */}
      {showDaySelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Select Day to Export</h3>
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
                  className="w-full text-left justify-start"
                 onClick={() => {
                  setSelectedPrintDay(day.id);
                  exportRunningOrderToExcel(day.id);
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