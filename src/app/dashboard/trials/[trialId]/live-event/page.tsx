'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import * as XLSX from 'xlsx-js-style';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdownMenu';
import { 
  Users, 
  FileText,
  FileDown,
  Edit,
  Save,
  X,
  Download,
  MoreVertical,
  GripVertical,
  Loader2,
  AlertCircle,
  Calendar,
  Trophy,
  AlertTriangle
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
  class_id?: string;
  round_number?: number;
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
}

interface ClassEntry {
  id: string;
  entry_id: string;
  running_position: number;
  entry_type: string;
  entry_status: string;
  round_number: number;
  round_id: string;
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

const getClassOrder = (className: string): number => {
  const classOrder = [
    'Patrol', 'Detective', 'Investigator', 'Super Sleuth', 
    'Private Investigator',
    'Detective Diversions', 
    'Ranger 1', 'Ranger 2', 'Ranger 3', 'Ranger 4', 'Ranger 5',
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

const getPassingScore = (className: string): number => {
  if (className.toLowerCase().includes('obedience 5')) {
    return 120;
  }
  return 70;
};

const isRallyOrObedienceClass = (classType: string, className: string): boolean => {
  return classType === 'rally' || className.toLowerCase().includes('obedience');
};

const getDisplayResult = (entry: ClassEntry, selectedClass: TrialClass | null): string => {
  const score = entry.scores?.[0];
  
  if (entry.entry_status === 'no_show' || 
      entry.entry_status === 'absent' || 
      score?.entry_status === 'no_show' ||
      score?.entry_status === 'absent' ||
      score?.pass_fail === 'Abs') {
    return 'Abs';
  }
  
  if (entry.entry_type === 'feo' || score?.pass_fail === 'FEO') {
    return 'FEO';
  }
  
  if (selectedClass && isRallyOrObedienceClass(selectedClass.class_type, selectedClass.class_name)) {
    if (score?.numerical_score !== null && score?.numerical_score !== undefined) {
      const passingScore = getPassingScore(selectedClass.class_name);
      
      if (score.numerical_score >= passingScore && score.pass_fail === 'Pass') {
        return score.numerical_score.toString();
      } else {
        return 'NQ';
      }
    }
    return '-';
  }
  
  if (score?.pass_fail === 'Pass') {
    if (selectedClass?.class_type === 'games' && selectedClass?.games_subclass) {
      return selectedClass.games_subclass;
    }
    return 'Pass';
  } else if (score?.pass_fail === 'Fail') {
    return 'Fail';
  }
  
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
      if (!isNaN(Number(result)) && result !== '-') {
        return 'bg-green-100 text-green-700 border-green-200';
      }
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

// Score Entry Tab Component Props
interface ScoreEntryTabProps {
  classEntries: ClassEntry[];
  selectedClass: TrialClass;
  scoreEntry: any;
  setScoreEntry: (entry: any) => void;
  editingEntryId: string | null;
  savingScore: boolean;
  loadScoreForEditing: (entry: ClassEntry) => void;
  saveScore: (id: string) => Promise<void>;
  setEditingEntryId: (id: string | null) => void;
}

// Score Entry Tab Component
const ScoreEntryTab: React.FC<ScoreEntryTabProps> = ({
  classEntries,
  selectedClass,
  scoreEntry,
  setScoreEntry,
  editingEntryId,
  savingScore,
  loadScoreForEditing,
  saveScore,
  setEditingEntryId
}) => {
  const activeEntries = classEntries.filter(e => e.entry_status !== 'withdrawn');
  
  return (
    <div className="space-y-4">
      {activeEntries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No entries to score in this round
        </div>
      ) : (
        <div className="space-y-3">
          {activeEntries.map((entry) => {
            const isEditing = editingEntryId === entry.id;
            const hasScore = entry.scores && entry.scores.length > 0;
            const score = entry.scores?.[0];
            
            return (
              <div key={entry.id} className="border rounded-lg p-4 bg-white shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold text-lg">
                      #{entry.running_position} - {entry.entries.handler_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {entry.entries.dog_call_name} • {entry.entries.cwags_number}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {hasScore && !isEditing && (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        Scored: {score?.pass_fail}
                      </Badge>
                    )}
                    
                    {!isEditing ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadScoreForEditing(entry)}
                      >
                        {hasScore ? 'Edit Score' : 'Enter Score'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingEntryId(null)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
                
                {isEditing && (
                  <div className="border-t pt-3 space-y-3">
                    {selectedClass.class_type === 'scent' && (
                      <>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <Label className="text-xs">Scent 1</Label>
                            <Select
                              value={scoreEntry.scent1}
                              onValueChange={(value) => setScoreEntry({...scoreEntry, scent1: value})}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-2 border-gray-300 shadow-2xl z-[9999] max-h-60 overflow-y-auto">
                                <SelectItem value="✓">✓</SelectItem>
                                <SelectItem value="✗">✗</SelectItem>
                                <SelectItem value="-">-</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Scent 2</Label>
                            <Select
                              value={scoreEntry.scent2}
                              onValueChange={(value) => setScoreEntry({...scoreEntry, scent2: value})}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-2 border-gray-300 shadow-2xl z-[9999] max-h-60 overflow-y-auto">
                                <SelectItem value="✓">✓</SelectItem>
                                <SelectItem value="✗">✗</SelectItem>
                                <SelectItem value="-">-</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Scent 3</Label>
                            <Select
                              value={scoreEntry.scent3}
                              onValueChange={(value) => setScoreEntry({...scoreEntry, scent3: value})}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-2 border-gray-300 shadow-2xl z-[9999] max-h-60 overflow-y-auto">
                                <SelectItem value="✓">✓</SelectItem>
                                <SelectItem value="✗">✗</SelectItem>
                                <SelectItem value="-">-</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Scent 4</Label>
                            <Select
                              value={scoreEntry.scent4}
                              onValueChange={(value) => setScoreEntry({...scoreEntry, scent4: value})}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-2 border-gray-300 shadow-2xl z-[9999] max-h-60 overflow-y-auto">
                                <SelectItem value="✓">✓</SelectItem>
                                <SelectItem value="✗">✗</SelectItem>
                                <SelectItem value="-">-</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Fault 1</Label>
                            <Input
                              value={scoreEntry.fault1}
                              onChange={(e) => setScoreEntry({...scoreEntry, fault1: e.target.value})}
                              placeholder="Fault description"
                              className="h-8"
                            />
                          </div>
                          
                          <div>
                            <Label className="text-xs">Fault 2</Label>
                            <Input
                              value={scoreEntry.fault2}
                              onChange={(e) => setScoreEntry({...scoreEntry, fault2: e.target.value})}
                              placeholder="Fault description"
                              className="h-8"
                            />
                          </div>
                          
                          <div>
                            <Label className="text-xs">Time (seconds)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={scoreEntry.time_seconds}
                              onChange={(e) => setScoreEntry({...scoreEntry, time_seconds: e.target.value})}
                              placeholder="0.00"
                              className="h-8"
                            />
                          </div>
                        </div>
                      </>
                    )}
                    
                    <div>
                      <Label className="text-xs">Result *</Label>
                      <Select
                        value={scoreEntry.pass_fail}
                        onValueChange={(value) => setScoreEntry({...scoreEntry, pass_fail: value})}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select result" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-2 border-gray-300 shadow-2xl z-[9999] max-h-60 overflow-y-auto">
                          <SelectItem value="Pass">Pass</SelectItem>
                          <SelectItem value="Fail">Fail</SelectItem>
                          <SelectItem value="ABS">Absent</SelectItem>
                          <SelectItem value="WD">Withdrawn</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button
                      onClick={() => saveScore(entry.id)}
                      disabled={savingScore || !scoreEntry.pass_fail}
                      className="w-full"
                    >
                      {savingScore ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Score
                        </>
                      )}
                    </Button>
                  </div>
                )}
                
                {hasScore && !isEditing && score && (
                  <div className="border-t pt-3 text-sm text-gray-600">
                    <div className="grid grid-cols-4 gap-2">
                      {selectedClass.class_type === 'scent' && (
                        <>
                          <div>Scent 1: {score.scent1 || '-'}</div>
                          <div>Scent 2: {score.scent2 || '-'}</div>
                          <div>Scent 3: {score.scent3 || '-'}</div>
                          <div>Scent 4: {score.scent4 || '-'}</div>
                        </>
                      )}
                    </div>
                    {(score.fault1 || score.fault2) && (
                      <div className="mt-2">
                        Faults: {[score.fault1, score.fault2].filter(Boolean).join(', ')}
                      </div>
                    )}
                    {score.time_seconds && (
                      <div className="mt-1">Time: {score.time_seconds}s</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

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
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
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
    entry_type: 'regular'
  });

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
            roundsResult.data.forEach((round: any, index: number) => {
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
            });
          }
        } catch (error) {
          console.error(`Error loading rounds for class ${cls.id}:`, error);
        }
      }

      setTrialClasses(allClassRounds);

      if (allClassRounds.length > 0 && !selectedClass) {
        setSelectedClass(allClassRounds[0]);
      }
      
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

      const entriesResult = await simpleTrialOperations.getTrialEntriesWithSelections(trialId);
      if (!entriesResult.success) {
        throw new Error('Failed to load entries');
      }

      const classEntriesData: ClassEntry[] = [];
      (entriesResult.data || []).forEach((entry: any) => {
        const selections = entry.entry_selections || [];
        selections.forEach((selection: any) => {
          if (selection.trial_round_id === selectedClass.id) {
            const entryStatus = selection.entry_status || 'entered';
            if (entryStatus.toLowerCase() !== 'withdrawn') {
              classEntriesData.push({
                id: selection.id,
                entry_id: entry.id,
                running_position: selection.running_position || 0,
                entry_type: selection.entry_type || 'regular',
                entry_status: entryStatus,
                round_number: selectedClass.round_number || 1,
                round_id: selectedClass.id,
                entries: {
                  handler_name: entry.handler_name,
                  dog_call_name: entry.dog_call_name,
                  cwags_number: entry.cwags_number
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

      classEntriesData.sort((a, b) => a.running_position - b.running_position);
      setClassEntries(classEntriesData);
      
    } catch (err) {
      console.error('Error loading class entries:', err);
      setError(err instanceof Error ? err.message : 'Failed to load entries');
      setClassEntries([]);
    }
  };

  const saveScore = async (entrySelectionId: string) => {
    if (!selectedClass) return;
    
    try {
      setSavingScore(true);
      setError(null);

      if (selectedClass.class_type === 'scent') {
        if (!scoreEntry.pass_fail) {
          setError('Pass/Fail result is required');
          return;
        }
      }

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

      const { data: existingScore } = await supabase
        .from('scores')
        .select('id')
        .eq('entry_selection_id', entrySelectionId)
        .single();

      if (existingScore) {
        const { error: updateError } = await supabase
          .from('scores')
          .update(scoreData)
          .eq('id', existingScore.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('scores')
          .insert(scoreData);

        if (insertError) throw insertError;
      }

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

  const loadAllClassCounts = async () => {
    if (trialClasses.length === 0) return;
    
    try {
      const entriesResult = await simpleTrialOperations.getTrialEntriesWithSelections(trialId);
      if (!entriesResult.success) return;

      const counts: Record<string, number> = {};
      
      trialClasses.forEach(cls => {
        const roundEntryCount = (entriesResult.data || []).reduce((count: number, entry: any) => {
          const selectionsForRound = entry.entry_selections?.filter((selection: any) => 
            selection.trial_round_id === cls.id
          ) || [];
          return count + selectionsForRound.length;
        }, 0);
        
        counts[cls.id] = roundEntryCount;
      });
      
      setClassCounts(counts);
    } catch (error) {
      console.error('Error loading class counts:', error);
    }
  };

  const loadAvailableDays = async () => {
    if (!trialId) return;

    try {
      const result = await simpleTrialOperations.getTrialDays(trialId);
      
      if (result.success) {
        const daysWithFormatting = (result.data || []).map((day: any) => {
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
      }
    } catch (error) {
      console.error('Error loading trial days:', error);
    }
  };

  const updateRunningPosition = async (entryId: string, newPosition: number) => {
    const entry = classEntries.find(e => e.id === entryId);
    if (!entry) return;

    const sameRoundEntries = classEntries.filter(e => e.round_number === entry.round_number);
    const positionUpdates: Array<{id: string, running_position: number}> = [];
    const otherEntries = sameRoundEntries.filter(e => e.id !== entryId);
    otherEntries.splice(newPosition - 1, 0, entry);
    
    otherEntries.forEach((e, index) => {
      positionUpdates.push({
        id: e.id,
        running_position: index + 1
      });
    });

    setClassEntries(prev => {
      const updated = [...prev];
      positionUpdates.forEach(update => {
        const entryToUpdate = updated.find(e => e.id === update.id);
        if (entryToUpdate) {
          entryToUpdate.running_position = update.running_position;
        }
      });
      return updated.sort((a, b) => {
        if (a.round_number !== b.round_number) {
          return a.round_number - b.round_number;
        }
        return a.running_position - b.running_position;
      });
    });

    try {
      const result = await simpleTrialOperations.updateRunningPositions(positionUpdates);
      if (!result.success) {
        console.error('Failed to update running positions:', result.error);
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
  const updateEntryField = async (entryId: string, field: string, value: string | number) => {
    setClassEntries(prev =>
      prev.map(entry =>
        entry.id === entryId
          ? { ...entry, [field]: value }
          : entry
      )
    );

    try {
      if (field === 'dog_call_name') {
        const entry = classEntries.find(e => e.id === entryId);
        if (entry) {
          await simpleTrialOperations.updateEntry(entry.entry_id, { dog_call_name: value as string });
        }
      } else {
        const updates: Record<string, any> = {};
        
        if (field === 'entry_type') {
          updates.entry_type = value;
          
          if (selectedClass) {
            let newFee = 0;
            
            if (value === 'feo') {
              if (selectedClass.feo_available && selectedClass.feo_price !== undefined && selectedClass.feo_price !== null) {
                newFee = selectedClass.feo_price;
              } else {
                newFee = selectedClass.entry_fee ? Math.round(selectedClass.entry_fee * 0.5) : 0;
              }
            } else {
              newFee = selectedClass.entry_fee || 0;
            }
            
            updates.fee = newFee;
            
            setClassEntries(prev =>
              prev.map(e =>
                e.id === entryId
                  ? { ...e, fee: newFee }
                  : e
              )
            );
            
            const entry = classEntries.find(e => e.id === entryId);
            if (entry && entry.entry_id) {
              await simpleTrialOperations.updateEntry(entry.entry_id, { total_fee: newFee });
            }
          }
        }
        
        if (field === 'entry_status') {
          updates.entry_status = value;
        }
        
        const result = await simpleTrialOperations.updateEntrySelection(entryId, updates);
        if (!result.success) {
          console.error('Failed to update entry selection:', result.error);
          loadClassEntries();
          return;
        }
      }

      if (field === 'entry_status' && value === 'withdrawn') {
        await loadClassEntries();
        await loadAllClassCounts();
      }
    } catch (error) {
      console.error('Error updating entry field:', error);
      loadClassEntries();
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

  const addNewEntry = async () => {
    if (!selectedClass || !newEntryData.handler_name || !newEntryData.dog_call_name || !newEntryData.cwags_number) {
      setError('All entry fields are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const roundsResult = await simpleTrialOperations.getTrialRounds(selectedClass.id);
      if (!roundsResult.success || !roundsResult.data) {
        throw new Error('Failed to get class rounds');
      }

      const classRounds = roundsResult.data;
      const targetRound = classRounds.find((round: any) => round.round_number === selectedRound);
      if (!targetRound) {
        throw new Error(`Round ${selectedRound} not found for this class`);
      }

      let calculatedFee = 0;
      const isFeO = newEntryData.entry_type.toLowerCase() === 'feo';
      
      if (isFeO) {
        if (targetRound.feo_available && targetRound.trial_classes?.feo_price !== undefined) {
          calculatedFee = targetRound.trial_classes.feo_price;
        } else if (targetRound.trial_classes?.entry_fee) {
          calculatedFee = Math.round(targetRound.trial_classes.entry_fee * 0.5);
        } else {
          calculatedFee = 0;
        }
      } else {
        calculatedFee = targetRound.trial_classes?.entry_fee || 0;
      }

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

      const roundEntries = classEntries.filter(e => e.round_number === selectedRound);
      const nextPosition = roundEntries.length > 0 
        ? Math.max(...roundEntries.map(e => e.running_position)) + 1 
        : 1;

      const { error: insertError } = await supabase
        .from('entry_selections')
        .insert({
          entry_id: entryResult.data.id,
          trial_round_id: targetRound.id,
          entry_type: newEntryData.entry_type,
          fee: calculatedFee,
          running_position: nextPosition,
          entry_status: 'entered'
        });

      if (insertError) {
        throw new Error('Failed to save entry selection: ' + insertError.message);
      }

      await loadClassEntries();
      await loadAllClassCounts();

      setNewEntryData({
        handler_name: '',
        dog_call_name: '',
        cwags_number: '',
        entry_type: 'regular'
      });
      setSelectedRound(1);
      setShowAddEntryModal(false);

      alert(`Entry added successfully to Round ${selectedRound} with fee: $${calculatedFee}!`);

    } catch (error) {
      console.error('Error adding entry:', error);
      setError(error instanceof Error ? error.message : 'Failed to add entry');
    } finally {
      setSaving(false);
    }
  };

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

  const exportScoreSheetsForDay = async (dayId: string) => {
    // Score sheet export implementation would go here
    alert('Score sheet export functionality - implementation needed');
  };

  const exportRunningOrderToExcel = async (selectedDayId: string) => {
    // Running order export implementation would go here
    alert('Running order export functionality - implementation needed');
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
                        <p className="text-sm text-gray-600">Round {cls.round_number}</p>
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
                      <span>{selectedClass.class_name} - Round {selectedClass.round_number} - Running Order Setup</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button onClick={handleExportRunningOrder} variant="outline">
                        <FileDown className="h-4 w-4 mr-2" />
                        Export to Excel
                      </Button>
                      <Button onClick={() => setShowAddEntryModal(true)} variant="outline">
                        <Users className="h-4 w-4 mr-2" />
                        Add Entry
                      </Button>
                      <Button onClick={exportScoreSheets} variant="outline">
                        <FileDown className="h-4 w-4 mr-2" />
                        Export Score Sheets
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
                    <div className="space-y-2">
                      {classEntries.map((entry) => {
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
        draggedEntry?.id === entry.id ? 'opacity-50' : ''
      } ${selectedEntryId === entry.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
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
                  {/* REMOVED THE EDIT ICON - just show the text */}
                  <div className="text-sm text-gray-600">
                    {entry.entries.dog_call_name} • {entry.entries.cwags_number}
                  </div>
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
            {resultDisplay && resultDisplay !== '-' && (
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
            <DropdownMenuItem onClick={() => updateEntryField(entry.id, 'entry_status', 'no_show')}>
              Mark No Show (Absent)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateEntryField(entry.id, 'entry_status', 'withdrawn')}>
              Withdraw Entry
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
})}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scoring" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    <span>{selectedClass.class_name} - Round {selectedClass.round_number} - Score Entry</span>
                  </CardTitle>
                  <CardDescription>
                    Enter scores for Round {selectedClass.round_number} - Judge: {selectedClass.judge_name}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <ScoreEntryTab 
                    classEntries={classEntries}
                    selectedClass={selectedClass}
                    scoreEntry={scoreEntry}
                    setScoreEntry={setScoreEntry}
                    editingEntryId={editingEntryId}
                    savingScore={savingScore}
                    loadScoreForEditing={loadScoreForEditing}
                    saveScore={saveScore}
                    setEditingEntryId={setEditingEntryId}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

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
                        if (value.length >= 8) {
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
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="feo">FEO</SelectItem>
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
                <h3 className="text-lg font-semibold">
                  {exportType === 'running-order' ? 'Select Day to Export Running Order' : 'Select Day to Export Score Sheets'}
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowDaySelector(false);
                    setIsExportProcessing(false);
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
                      setShowDaySelector(false);
                      setIsExportProcessing(false);
                      
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
                    setIsExportProcessing(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}