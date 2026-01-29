// File: src/app/dashboard/trials/[trialId]/summary/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import {
  FileSpreadsheet,
  Users,
  Trophy,
  CheckCircle,
  XCircle,
  Loader2,
  BarChart3,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { simpleTrialOperations } from '@/lib/trialOperationsSimple';
import { getClassOrder } from '@/lib/cwagsClassNames';

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
  total_rounds: number;
  participant_count: number;
  pass_count: number;
  fail_count: number;
  completed_runs: number;
  entries: ClassEntry[];
}

interface ClassEntry {
  id: string;
  entry_id: string;
  running_position: number;
  entry_type: string;
  entry_status: string;
  entries: {
    handler_name: string;
    dog_call_name: string;
    cwags_number: string;
  };
  scores?: Array<{
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

const abbreviateClassNameForExcel = (className: string): string => {
  const abbreviations: Record<string, string> = {
    'Super Sleuth': 'Super Sleuth 4',
    'Detective Diversions': 'Det Diversions',
    'Private Investigator': 'Private Inv'
  };
  
  return abbreviations[className] || className;
};
export default function ClassSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const trialId = params.trialId as string;
  const supabase = getSupabaseBrowser();
  const [summaryData, setSummaryData] = useState<{
    trial: Trial;
    classes: TrialClass[];
    statistics: any;
  } | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [classDisplayData, setClassDisplayData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trialId) {
      loadSummaryData();
    }
  }, [trialId]);

  useEffect(() => {
  if (selectedClassId && selectedClassId !== 'all') {
    generateClassDisplayData(selectedClassId).then(data => {
      console.log('Generated class display data:', data);
      setClassDisplayData(data);
    });
  } else {
    setClassDisplayData(null);
  }
}, [selectedClassId, summaryData]);

  const loadSummaryData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading trial summary data for:', trialId);

      const result = await simpleTrialOperations.getTrialSummaryWithScores(trialId);
      if (!result.success) {
        throw new Error(result.error as string);
      }

      setSummaryData(result.data);
      console.log('Trial summary data loaded successfully');

    } catch (err) {
      console.error('Error loading trial summary data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trial data');
    } finally {
      setLoading(false);
    }
  };

function safeDateFromISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // force noon local time
}

const generateClassDisplayData = async (classId: string) => {
  if (!summaryData) return null;

  try {
    // Get complete trial structure including rounds
    const allRoundsResult = await simpleTrialOperations.getAllTrialRounds(trialId);
    if (!allRoundsResult.success) return null;
    const allTrialRounds = allRoundsResult.data || [];

    // Get all entries with selections
    const entriesResult = await simpleTrialOperations.getTrialEntriesWithSelections(trialId);
    if (!entriesResult.success) return null;

    // Get all scores
   // Fetch ALL scores using pagination (handles unlimited rows)
let allScores: any[] = [];
let from = 0;
const pageSize = 1000;
let hasMore = true;

console.log('📊 [DISPLAY] Loading scores with pagination...');

while (hasMore) {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .range(from, from + pageSize - 1);
  
  if (error) {
    console.error('Error loading scores:', error);
    throw error;
  }
  
  if (!data || data.length === 0) {
    hasMore = false;
    break;
  }
  
  allScores = [...allScores, ...data];
  console.log(`  ✓ Batch ${Math.floor(from / pageSize) + 1}: loaded ${data.length} scores (total: ${allScores.length})`);
  
  // If we got fewer than pageSize, we've reached the end
  hasMore = data.length === pageSize;
  from += pageSize;
}

console.log('✅ DISPLAY FIX: Loaded total scores:', allScores.length);

// Build the scores map
const scoresMap = new Map();
allScores.forEach(score => {
  scoresMap.set(score.entry_selection_id, score);
});

    // Find the selected class info
const selectedClass = summaryData.classes.find(c => c.id === classId);
if (!selectedClass) return null;

// Normalize class name function
const normalizeClassName = (className: string): string => {
  const corrections: Record<string, string> = {
    'Patrol': 'Patrol 1',
    'Detective': 'Detective 2',
    'Investigator': 'Investigator 3',
    'Super Sleuth': 'Super Sleuth 4',
    'Private Inv': 'Private Investigator',
    'Det Diversions': 'Detective Diversions'
  };
  return corrections[className] || className;
};

// ✅ REVERTED FIX: Filter by class NAME to show ALL DAYS (like Excel export)
const normalizedSelectedClassName = (selectedClass.class_name);

const roundsForThisClass = allTrialRounds.filter((round: any) => {
  const roundClassName = round.trial_classes?.class_name;
  if (!roundClassName) return false;
  const roundNormalized = (roundClassName);
  return roundNormalized === normalizedSelectedClassName;
});

console.log(`🔍 DISPLAY: Found ${roundsForThisClass.length} rounds across ALL DAYS for "${normalizedSelectedClassName}"`);

    console.log(`Found ${roundsForThisClass.length} rounds for class ${selectedClass.class_name} (ID: ${classId})`);

    // Sort rounds chronologically
    roundsForThisClass.sort((a: any, b: any) => {
      const dateA = new Date(a.trial_classes?.trial_days?.trial_date || 0);
      const dateB = new Date(b.trial_classes?.trial_days?.trial_date || 0);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      return (a.round_number || 0) - (b.round_number || 0);
    });

    // Build class data structure
    const classData: any = {
      className: selectedClass.class_name,
      allParticipants: new Map(),
      allRounds: roundsForThisClass.map((round: any) => ({
        roundId: round.id,
        judgeInfo: round.judge_name || 'TBD',
        trialDate: round.trial_classes?.trial_days?.trial_date || '',
        roundNumber: round.round_number || 1,
        results: new Map()
      }))
    };

    // Process entries and scores
    (entriesResult.data || []).forEach((entry: any) => {
      (entry.entry_selections || []).forEach((selection: any) => {
        if (selection.entry_type?.toLowerCase() === 'feo') return;
        if (selection.entry_status?.toLowerCase() === 'withdrawn') return;

        const roundId = selection.trial_round_id;
        
        // Find the target round in OUR rounds
        const targetRound = classData.allRounds.find((r: any) => r.roundId === roundId);
        if (!targetRound) return;  // Not for this class

        // Add participant
        const cwagsNumber = entry.cwags_number;
        if (!classData.allParticipants.has(cwagsNumber)) {
          classData.allParticipants.set(cwagsNumber, {
            cwagsNumber: entry.cwags_number,
            dogName: entry.dog_call_name,
            handlerName: entry.handler_name
          });
        }

        // Determine result
        const score = scoresMap.get(selection.id);
        let result = '-';

        if (selection.entry_status === 'no_show' || selection.entry_status === 'absent') {
          result = 'Abs';
        } else if (score) {
          if (['GB', 'BJ', 'T', 'P', 'C'].includes(score.pass_fail || '')) {
            result = score.pass_fail;
          } else if (score.pass_fail === 'Pass') {
            result = 'P';
          } else if (score.pass_fail === 'Fail') {
            result = 'F';
          }
        }

        targetRound.results.set(cwagsNumber, result);
      });
    });

    console.log('Final class data:', {
      className: classData.className,
      participants: classData.allParticipants.size,
      rounds: classData.allRounds.length
    });
    
    return classData;

  } catch (error) {
    console.error('Error generating class display data:', error);
    return null;
  }
};

const generateExcelReport = async () => {
  if (!summaryData) {
    alert('No data available to export');
    return;
  }

  try {
    setExporting(true);
    console.log('Generating Excel report...');

    // Get complete trial structure including rounds without entries
    const allRoundsResult = await simpleTrialOperations.getAllTrialRounds(trialId);
    if (!allRoundsResult.success) {
      throw new Error('Failed to load complete trial structure');
    }
    const allTrialRounds = allRoundsResult.data || [];

    // Get all entries with selections
    const entriesResult = await simpleTrialOperations.getTrialEntriesWithSelections(trialId);
    
    if (!entriesResult.success) {
      throw new Error('Failed to load entries');
    }
// Get all scores at once (removed 1000 default limit)
// Fetch ALL scores using pagination (handles unlimited rows)
let allScores: any[] = [];
let from = 0;
const pageSize = 1000;
let hasMore = true;

console.log('📊 [EXCEL] Loading scores with pagination...');

while (hasMore) {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .range(from, from + pageSize - 1);
  
  if (error) {
    console.error('Error loading scores:', error);
    throw error;
  }
  
  if (!data || data.length === 0) {
    hasMore = false;
    break;
  }
  
  allScores = [...allScores, ...data];
  console.log(`  ✓ Batch ${Math.floor(from / pageSize) + 1}: loaded ${data.length} scores (total: ${allScores.length})`);
  
  // If we got fewer than pageSize, we've reached the end
  hasMore = data.length === pageSize;
  from += pageSize;
}

console.log('✅ EXCEL FIX: Loaded total scores:', allScores.length);

// Build the scores map
const scoresMap = new Map();
allScores.forEach(score => {
  scoresMap.set(score.entry_selection_id, score);
});

        
   // Build complete class structure with all rounds
    const classesByName = new Map<string, {
      className: string;
      allParticipants: Map<string, {
        cwagsNumber: string;
        dogName: string;
        handlerName: string;
      }>;
      allRounds: Array<{
        roundId: string;
        judgeInfo: string;
        trialDate: string;
        roundNumber: number;
        sortOrder: number;
        results: Map<string, string>;
      }>;
      totalPasses: number;
      totalRuns: number;
      classOrder: number;
    }>();

    // Process all trial rounds to create complete structure
    allTrialRounds.forEach((round: any) => {
      const className = round.trial_classes?.class_name;
      if (!className) return;

      const trialDate = round.trial_classes?.trial_days?.trial_date;
      if (!trialDate) return;

      if (!classesByName.has(className)) {  // ✅ FIXED
        classesByName.set(className, {
          className: className,
          allParticipants: new Map(),
          allRounds: [],
          totalPasses: 0,
          totalRuns: 0,
          classOrder: getClassOrder(className)
        });
      }

      const classData = classesByName.get(className)!;
      
     const dateSort = safeDateFromISO(trialDate).getTime();

      const sortOrder = dateSort + round.round_number;

      classData.allRounds.push({
        roundId: round.id,
        judgeInfo: round.judge_name || 'TBD',
        trialDate: trialDate,
        roundNumber: round.round_number,
        sortOrder: sortOrder,
        results: new Map()
      });
    });

    // Sort rounds chronologically within each class
    classesByName.forEach(classData => {
      classData.allRounds.sort((a, b) => a.sortOrder - b.sortOrder);
    });

    // Process actual entries and scores
    (entriesResult.data || []).forEach((entry: any) => {
      (entry.entry_selections || []).forEach((selection: any) => {
        if (selection.entry_type?.toLowerCase() === 'feo') {
          return;
        }
        if (selection.entry_status?.toLowerCase() === 'withdrawn') {
          return;
        }
        
        const roundId = selection.trial_round_id;
        const cwagsNumber = entry.cwags_number;

        let targetClassData: any = null;
        let targetRound: any = null;

        classesByName.forEach(classData => {
          const round = classData.allRounds.find(r => r.roundId === roundId);
          if (round) {
            targetClassData = classData;
            targetRound = round;
          }
        });

        if (!targetClassData || !targetRound) {
          return;
        }

        if (!targetClassData.allParticipants.has(cwagsNumber)) {
          targetClassData.allParticipants.set(cwagsNumber, {
            cwagsNumber: entry.cwags_number,
            dogName: entry.dog_call_name,
            handlerName: entry.handler_name
          });
        }

        const score = scoresMap.get(selection.id);
        let result = '-';

        if (selection.entry_status === 'no_show' || 
            selection.entry_status === 'absent' || 
            score?.entry_status === 'no_show' ||
            score?.entry_status === 'absent') {
          result = 'Abs';
          targetClassData.totalRuns++;
        } 
        else if (selection.entry_status === 'withdrawn' || score?.entry_status === 'withdrawn') {
          result = 'Wth';
        } 
        else if (score?.entry_status === 'scratched') {
          result = 'X';
          targetClassData.totalRuns++;
        }
       else if (score) {
          const className = targetClassData.className || '';
          const isRallyOrObedience = className.toLowerCase().includes('starter') || 
                                 className.toLowerCase().includes('advanced') || 
                                 className.toLowerCase().includes('pro') ||
                                 className.toLowerCase().includes('obedience') ||
                                 className.toLowerCase().includes('zoom') ||
                                 className.toLowerCase().includes('rally');
          
          if (selection.entry_type === 'feo' || score.pass_fail === 'FEO') {
            result = 'FEO';
            targetClassData.totalRuns++;
          }
          else if (isRallyOrObedience && score.numerical_score !== null && score.numerical_score !== undefined) {
            const passingScore = className.toLowerCase().includes('obedience 5') ? 120 : 70;
            
            if (score.numerical_score >= passingScore && score.pass_fail === 'Pass') {
              result = score.numerical_score.toString();
              targetClassData.totalPasses++;
            } else {
              result = 'NQ';
            }
            targetClassData.totalRuns++;
          }
          // ✅ FIX: Check for Games subclass symbols first
          else if (['GB', 'BJ', 'T', 'P', 'C'].includes(score.pass_fail || '')) {
            result = score.pass_fail; // Show the subclass symbol (GB, BJ, T, P, C)
            targetClassData.totalPasses++;
            targetClassData.totalRuns++;
          }
          else if (score.pass_fail === 'Pass') {
            result = 'Pass';
            targetClassData.totalPasses++;
            targetClassData.totalRuns++;
          } 
          else if (score.pass_fail === 'Fail') {
            result = 'F';
            targetClassData.totalRuns++;
          }
        }

        targetRound.results.set(cwagsNumber, result);
      });
    });

// ========== DIAGNOSTIC START ==========
console.log('\n🔍 ========== EXPORT DIAGNOSTIC ==========');

// Check entries data
console.log(`\n📋 Entries Data:`);
console.log(`  Total entries: ${entriesResult.data?.length || 0}`);

if (entriesResult.data && entriesResult.data.length > 0) {
  const hiroEntry = entriesResult.data.find((e: any) => e.cwags_number === '17-1955-01');
  if (hiroEntry) {
    console.log(`\n  ✅ Found Hiro (17-1955-01):`);
    console.log(`    - Dog: ${hiroEntry.dog_call_name}`);
    console.log(`    - Handler: ${hiroEntry.handler_name}`);
    console.log(`    - Selections: ${hiroEntry.entry_selections?.length || 0}`);
    
    const ranger1Selections = hiroEntry.entry_selections?.filter((s: any) => {
      const round = allTrialRounds.find((r: any) => r.id === s.trial_round_id);
      return round?.trial_classes?.class_name === 'Ranger 1';
    });
    console.log(`    - Ranger 1 selections: ${ranger1Selections?.length || 0}`);
    ranger1Selections?.forEach((sel: any, idx: number) => {
      const round = allTrialRounds.find((r: any) => r.id === sel.trial_round_id);
      console.log(`      ${idx + 1}. Round ${round?.round_number}, Day ${round?.trial_classes?.trial_days?.day_number}, Round ID: ${sel.trial_round_id}`);
    });
  } else {
    console.log(`\n  ❌ Hiro (17-1955-01) NOT FOUND in entries data!`);
  }
}

// Check Ranger 1 rounds
console.log(`\n📍 Ranger 1 Rounds in allTrialRounds:`);
const ranger1Rounds = allTrialRounds.filter((r: any) => 
  r.trial_classes?.class_name === 'Ranger 1'
);
console.log(`  Total: ${ranger1Rounds.length} rounds`);
ranger1Rounds.forEach((round: any, idx: number) => {
  console.log(`  ${idx + 1}. Round ${round.round_number}, Day ${round.trial_classes?.trial_days?.day_number}, Date: ${round.trial_classes?.trial_days?.trial_date}, ID: ${round.id}`);
});

// Check final Ranger 1 class data
console.log(`\n📊 Final Ranger 1 Class Data:`);
const ranger1ClassData = classesByName.get('Ranger 1');
if (ranger1ClassData) {
  console.log(`  ✅ Ranger 1 class found`);
  console.log(`  - Participants: ${ranger1ClassData.allParticipants.size}`);
  console.log(`  - Rounds: ${ranger1ClassData.allRounds.length}`);
  
  // Check if Hiro is in participants
  const hiroInClass = ranger1ClassData.allParticipants.has('17-1955-01');
  console.log(`  - Hiro in participants: ${hiroInClass ? '✅ YES' : '❌ NO'}`);
  
  if (hiroInClass) {
    const hiroData = ranger1ClassData.allParticipants.get('17-1955-01');
    console.log(`    - Dog: ${hiroData?.dogName}`);
    console.log(`    - Handler: ${hiroData?.handlerName}`);
  }
  
  // Show rounds and Hiro's results
  console.log(`\n  Rounds breakdown:`);
  ranger1ClassData.allRounds.forEach((round: any, idx: number) => {
    const hiroResult = round.results.get('17-1955-01');
    console.log(`    ${idx + 1}. Round ${round.roundNumber}, Date: ${round.trialDate}`);
    console.log(`       - Total results: ${round.results.size}`);
    console.log(`       - Hiro's result: ${hiroResult || '(not entered)'}`);
    console.log(`       - Round ID: ${round.roundId}`);
  });
  
  // Show first 5 participants
  console.log(`\n  First 5 participants (sorted by C-WAGS):`);
  const participants = Array.from(ranger1ClassData.allParticipants.values())
    .sort((a: any, b: any) => a.cwagsNumber.localeCompare(b.cwagsNumber))
    .slice(0, 5);
  participants.forEach((p: any, idx: number) => {
    console.log(`    ${idx + 1}. ${p.cwagsNumber}: ${p.dogName} (${p.handlerName})`);
  });
} else {
  console.log(`  ❌ Ranger 1 class NOT FOUND in classesByName!`);
  console.log(`  Available classes:`, Array.from(classesByName.keys()));
}

console.log('\n========== END DIAGNOSTIC ==========\n');
// ADD THIS RIGHT AFTER THE EXISTING DIAGNOSTIC (before the Excel workbook creation)

console.log('\n🔬 DEEP DIVE: Hiro Round 1 Score Matching');

// Find Hiro's entry
const hiroEntry = entriesResult.data?.find((e: any) => e.cwags_number === '17-1955-01');
if (hiroEntry) {
  // Find Hiro's Ranger 1 Round 1 selection
  const round1Selection = hiroEntry.entry_selections?.find((s: any) => 
    s.trial_round_id === '99694c46-32ef-4dde-8f76-a07ec840acfb'  // Round 1, Day 2
  );
  
  if (round1Selection) {
    console.log('  ✅ Found Round 1 selection:');
    console.log('    - entry_selection_id:', round1Selection.id);
    console.log('    - trial_round_id:', round1Selection.trial_round_id);
    console.log('    - entry_type:', round1Selection.entry_type);
    console.log('    - entry_status:', round1Selection.entry_status);
    
    // Check if score exists in scoresMap
    const scoreInMap = scoresMap.get(round1Selection.id);
    console.log('    - Score in scoresMap?', scoreInMap ? '✅ YES' : '❌ NO');
    
    if (scoreInMap) {
      console.log('    - Score data:', {
        pass_fail: scoreInMap.pass_fail,
        numerical_score: scoreInMap.numerical_score,
        entry_status: scoreInMap.entry_status
      });
    } else {
      console.log('    - ❌ Score NOT in scoresMap!');
      console.log('    - Searching allScores array directly...');
      
      // Get the raw scores data
      const { data: allScores } = await supabase.from('scores').select('*').limit(50000);
      const directScore = allScores?.find((s: any) => s.entry_selection_id === round1Selection.id);
      
      if (directScore) {
        console.log('    - ✅ Found score in database:', {
          score_id: directScore.id,
          entry_selection_id: directScore.entry_selection_id,
          pass_fail: directScore.pass_fail
        });
        console.log('    - ⚠️ Score exists in DB but not in scoresMap! This is the bug!');
      } else {
        console.log('    - ❌ Score not even in database for this entry_selection_id');
      }
    }
  } else {
    console.log('  ❌ Round 1 selection not found in entry_selections!');
  }
  
  // Also check Round 2 (which works)
  const round2Selection = hiroEntry.entry_selections?.find((s: any) => 
    s.trial_round_id === '7798b1eb-027c-4eef-9e7c-4564b17c13d9'  // Round 2, Day 2
  );
  
  if (round2Selection) {
    console.log('\n  Comparing to Round 2 (which works):');
    console.log('    - entry_selection_id:', round2Selection.id);
    const scoreInMap = scoresMap.get(round2Selection.id);
    console.log('    - Score in scoresMap?', scoreInMap ? '✅ YES' : '❌ NO');
    if (scoreInMap) {
      console.log('    - pass_fail:', scoreInMap.pass_fail);
    }
  }
}

console.log('\n🔬 END DEEP DIVE\n');

    // Create Excel workbook
    const XLSX = await import('xlsx-js-style');
    const workbook = XLSX.utils.book_new();

   // Create summary overview sheet with NEW FORMATTING
const summarySheetData: any[][] = [
  ['Trial Summary'], // Row 1
  [], // Row 2
  ['Class Name', 'Total Runs', 'Actually Ran', 'Passes', 'Fails', 'Billable Runs'], // Row 3
  [], // Row 4 - BLANK ROW
];

    // Sort classes by orangeprint order for summary
    const sortedClasses = Array.from(classesByName.values()).sort((a, b) => a.classOrder - b.classOrder);

    sortedClasses.forEach((classData) => {
      let totalRuns = 0;
      let actuallyRan = 0;
      let passes = 0;
      let fails = 0;
      let billableRuns = 0;

      classData.allRounds.forEach(round => {
        round.results.forEach((result, cwagsNumber) => {
          totalRuns++;
          
          if (result !== '-') {
            actuallyRan++;
          }
          
          if (result === 'Pass' || result === 'GB' || result === 'BJ' || result === 'C' || result === 'T' || result === 'P') {
            passes++;
            billableRuns++;
          } else if (!isNaN(Number(result))) {
            const score = Number(result);
            const passingScore = classData.className.toLowerCase().includes('obedience 5') ? 120 : 70;
            if (score >= passingScore) {
              passes++;
              billableRuns++;
            }
          }
          else if (result === 'F' || result === 'NQ') {
            fails++;
            billableRuns++;
          }
          else if (result === 'Abs') {
            billableRuns++;
          }
        });
      });

     summarySheetData.push([
  abbreviateClassNameForExcel(classData.className),  // ← ADD THIS
  totalRuns,
  actuallyRan,
  passes,
  fails,
  billableRuns
]);
    });

   // Data starts at row 5 (array index 4), so adjust calculations
const firstDataRow = 5; // Row 5 in Excel
const lastDataRow = 5 + sortedClasses.length; // Last row with class data
const sumRow = lastDataRow + 1; // Row with SUM formula
const runFeeRow = sumRow + 1; // Row for manual Run Fee entry
const totalOwingRow = runFeeRow + 1; // Row with Total Owing formula

// Add blank row, then SUM formula row
summarySheetData.push([]); // Blank row after all classes

summarySheetData.push([
  '', '', '', '', 'Total Billable Runs:', 
  { f: `SUM(F${firstDataRow}:F${lastDataRow})` } as any
]);

// Blank row for Run Fee manual entry
summarySheetData.push(['', '', '', '', 'Run Fee:', '']);

// Total Owing formula
summarySheetData.push([
  '', '', '', '', 'Total Owing:', 
  { f: `F${sumRow}*F${runFeeRow}` } as any
]);

    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summarySheetData);

    // APPLY NEW FORMATTING
    // Set column widths: A&B=20, C=27, D+=20
    summaryWorksheet['!cols'] = [
      { wch: 20 }, // A
      { wch: 20 }, // B
      { wch: 27 }, // C
      { wch: 20 }, // D
      { wch: 20 }, // E
      { wch: 20 }, // F
      { wch: 20 }, // G
    ];

    // Merge cells A1:C1 for "Trial Summary"
    summaryWorksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } } // A1:C1
    ];

    // Apply cell formatting
    const range = XLSX.utils.decode_range(summaryWorksheet['!ref'] || 'A1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!summaryWorksheet[cellAddress]) continue;
        
        const cell = summaryWorksheet[cellAddress];
        
        // Row 1 (index 0): Left aligned, font size 20, merged A-C
        if (R === 0) {
          cell.s = {
            font: { sz: 20, name: 'Calibri' },
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        }
        // Row 3 (index 2): Center aligned, font size 20, bold
        else if (R === 2) {
          cell.s = {
            font: { sz: 20, bold: true, name: 'Calibri' },
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        }
        // Row 4 and greater (index 3+): Center aligned
        else if (R >= 3) {
          // Row 5 (index 4 - first data row after headers): Bold
          if (R === 3) {
            cell.s = {
              font: { bold: true, name: 'Calibri' },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          }
          // Row 6 (index 5): Bold, size 14
          else if (R === 4) {
            cell.s = {
              font: { sz: 14, bold: true, name: 'Calibri' },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          }
          // All other rows: Center aligned
          else {
            cell.s = {
              font: { name: 'Calibri' },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
        // Helper to sort registration numbers like 17-1734-01 numerically
    const getRegSortValue = (reg: string | undefined | null): number => {
      if (!reg) return Number.MAX_SAFE_INTEGER; // blanks go to bottom
      const numeric = Number(reg.replace(/[^0-9]/g, '')); // strip dashes
      return Number.isNaN(numeric) ? Number.MAX_SAFE_INTEGER : numeric;
    };


    // Create individual class matrix sheets in orangeprint order
    sortedClasses.forEach((classData) => {
      const sheetData = [];
      
      for (let i = 0; i < 6; i++) {
        sheetData.push([]);
      }
      
      sheetData[0] = [summaryData.trial.trial_name];
      sheetData[2] = ['', '', '', '', '', abbreviateClassNameForExcel(classData.className)];
      
      const row4Headers = ['', '', ''];
      classData.allRounds.forEach(round => {
        row4Headers.push(`Round ${round.roundNumber}`);
      });
      sheetData[3] = row4Headers;
      
      const row5Headers = ['', '', ''];
      classData.allRounds.forEach(round => {
        row5Headers.push(round.judgeInfo);
      });
      sheetData[4] = row5Headers;
      
      const row6Headers = ['C-WAGS Number', 'Dog Name', 'Handler Name'];
      classData.allRounds.forEach(round => {
        const formattedDate = safeDateFromISO(round.trialDate).toLocaleDateString('en-US', {

          month: 'short',
          day: '2-digit',
          year: 'numeric'
        });
        row6Headers.push(formattedDate);
      });
      sheetData[5] = row6Headers;

      const participantEntries = Array.from(classData.allParticipants.values());
      
      participantEntries.forEach(participant => {
        const row = [
          participant.cwagsNumber,
          participant.dogName,
          participant.handlerName          
        ];
        
        classData.allRounds.forEach(round => {
          const result = round.results.get(participant.cwagsNumber) || '-';
          row.push(result);
        });
        
        sheetData.push(row);
      });

      // 🔧 Sort rows A7:Z by column A (registration) numerically ascending
      // Keep rows 1–6 (indexes 0–5) exactly as they are
      const headerRows = sheetData.slice(0, 6);
      const dataRows = sheetData.slice(6);

      dataRows.sort((a, b) => {
        const aVal = getRegSortValue(a[0] as string | undefined);
        const bVal = getRegSortValue(b[0] as string | undefined);
        return aVal - bVal;
      });

      const sortedSheetData = [...headerRows, ...dataRows];

      const worksheet = XLSX.utils.aoa_to_sheet(sortedSheetData);
      
      // APPLY FORMATTING TO CLASS SHEETS
      // Set column widths: A&B=20, C=27, D+=20
      const numCols = Math.max(3 + classData.allRounds.length, 7);
      worksheet['!cols'] = [
        { wch: 20 }, // A
        { wch: 20 }, // B
        { wch: 27 }, // C
      ];
      // Add column D and beyond with width 20
      for (let i = 3; i < numCols; i++) {
        worksheet['!cols'].push({ wch: 20 });
      }

      // Merge cells A1:C1 for trial name
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } } // A1:C1
      ];

      // Merge cells F3:G3 for trial name
      worksheet['!merges'] = [
        { s: { r: 0, c: 2 }, e: { r: 0, c: 3 } } // A1:C1
      ];

      // Apply cell formatting to class sheet
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cellAddress]) continue;
          
          const cell = worksheet[cellAddress];
          
          // Row 1 (index 0): Left aligned, font size 20, merged A-C
          if (R === 0) {
            cell.s = {
              font: { sz: 20, name: 'Calibri' },
              alignment: { horizontal: 'left', vertical: 'center' }
            };
          }
          // Row 3 (index 2): Center aligned, font size 20, bold
          else if (R === 2) {
            cell.s = {
              font: { sz: 20, bold: true, name: 'Calibri' },
              alignment: { horizontal: 'left', vertical: 'center' }
            };
          }
          // Row 4 (index 3): Center aligned, bold
          else if (R === 3) {
            cell.s = {
              font: { bold: true, name: 'Calibri' },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          }
          // Row 5 (index 4): Center aligned, bold
          else if (R === 4) {
            cell.s = {
              font: { bold: true, name: 'Calibri' },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          }
          // Row 6 (index 5): Center aligned, bold, size 14
          else if (R === 5) {
            cell.s = {
              font: { sz: 14, bold: true, name: 'Calibri' },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          }
          // Row 7+ (index 6+): Center aligned
          else if (R >= 6) {
            cell.s = {
              font: { name: 'Calibri' },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          }
        }
      }
      
      let sheetName = abbreviateClassNameForExcel(classData.className).replace(/[:\\/?*[\]]/g, '');
      if (sheetName.length > 31) {
        sheetName = sheetName.substring(0, 31);
      }
      
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    const fileName = `${summaryData.trial.trial_name.replace(/[^a-zA-Z0-9]/g, '_')}_ClassSummary.xlsx`;
    XLSX.writeFile(workbook, fileName);

    console.log('Excel report generated successfully');

  } catch (error) {
    console.error('Error generating Excel report:', error);
    setError('Failed to generate Excel report: ' + (error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    setExporting(false);
  }
};
  const getDisplayClassName = (cls: TrialClass): string => {
    if (cls.class_type === 'games' && cls.games_subclass) {
      return `${cls.class_name} - ${cls.games_subclass}`;
    }
    return cls.class_name;
  };

  const getResultDisplay = (entry: ClassEntry, classInfo: TrialClass): { result: string; color: string } => {
  const score = entry.scores?.[0];
  if (!score || !score.pass_fail) {
    return { result: '-', color: 'text-gray-500' };
  }

  // Check for Games subclass results FIRST
  const gamesSubclasses = ['GB', 'BJ', 'T', 'P', 'C'];
  if (gamesSubclasses.includes(score.pass_fail)) {
    return { result: score.pass_fail, color: 'text-purple-600 font-semibold' };
  }

  // FEO entries
  if (score.pass_fail === 'FEO') {
    return { result: 'FEO', color: 'text-yellow-600 font-semibold' };
  }

  // Handle rally/obedience classes - show score or NQ
  const isRallyOrObedience = classInfo.class_name.toLowerCase().includes('starter') || 
                         classInfo.class_name.toLowerCase().includes('advanced') || 
                         classInfo.class_name.toLowerCase().includes('pro') ||
                         classInfo.class_name.toLowerCase().includes('obedience') ||
                         classInfo.class_name.toLowerCase().includes('zoom') ||
                         classInfo.class_type === 'rally';

  if (isRallyOrObedience && score.numerical_score !== null && score.numerical_score !== undefined) {
    const passingScore = classInfo.class_name.toLowerCase().includes('obedience 5') ? 120 : 70;
    if (score.numerical_score >= passingScore && score.pass_fail === 'Pass') {
      return { result: score.numerical_score.toString(), color: 'text-green-600 font-semibold' };
    } else {
      return { result: 'NQ', color: 'text-red-600 font-semibold' };
    }
  }

  // Handle other class types
  if (score.pass_fail === 'Pass') {
    return { result: 'P', color: 'text-green-600 font-semibold' };
  } else if (score.pass_fail === 'Fail') {
    return { result: 'F', color: 'text-red-600 font-semibold' };
  }

  return { result: '-', color: 'text-gray-500' };
};

  const selectedClassData = selectedClassId === 'all' 
    ? null 
    : summaryData?.classes.find(cls => cls.id === selectedClassId);

  if (!user) {
    return (
      <MainLayout title="Class Summary Sheet">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>You must be logged in to access this page.</AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout title="Class Summary Sheet">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-600" />
            <p className="text-gray-600">Loading trial summary data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !summaryData) {
    return (
      <MainLayout title="Class Summary Sheet">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Trial not found. Please check the trial ID and try again.'}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push(`/dashboard/trials/${trialId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trial
          </Button>
        </div>
      </MainLayout>
    );
  }

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Trials', href: '/dashboard/trials' },
    { label: summaryData.trial.trial_name, href: `/dashboard/trials/${trialId}` },
    { label: 'Class Summary' }
  ];

  return (
    <MainLayout 
      title="Class Summary Sheet"
      breadcrumbItems={breadcrumbItems}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-orange-600" />
              <span>Class Summary Sheet</span>
            </h1>
            <p className="text-gray-600 mt-1">Track competitor progress across all rounds of a class</p>
          </div>
          <Button onClick={() => router.push(`/dashboard/trials/${trialId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trial
          </Button>
        </div>

        {/* Trial and Class Selection */}
        <Card>
  <CardHeader>
    <CardTitle>{summaryData.trial.trial_name}</CardTitle>
    <CardDescription>
      {summaryData.trial.club_name} • {summaryData.trial.location}
    </CardDescription>
  </CardHeader>

  <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* Select Class */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Select Class:
        </label>

        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
  <SelectTrigger
    className="border-2 border-purple-600 rounded-md hover:bg-purple-50 transition-colors"
  >
    <SelectValue placeholder="Select a class" />
  </SelectTrigger>

 <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
  <SelectItem value="all">📊 Select All Classes</SelectItem>

  {[...summaryData.classes]
    .sort((a, b) => getClassOrder(a.class_name) - getClassOrder(b.class_name))
    .map((cls) => (
      <SelectItem key={cls.id} value={cls.id}>
        {getDisplayClassName(cls)}
      </SelectItem>
    ))}
</SelectContent>
</Select>
      </div>

      {/* Export Button */}
      <div className="flex items-end">
        <Button
          onClick={generateExcelReport}
          disabled={exporting}
          className="
            w-full md:w-auto border-2 border-purple-600
            hover:bg-purple-600 hover:text-white transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to Excel
            </>
          )}
        </Button>
      </div>

    </div>
  </CardContent>
</Card>


        {summaryData.classes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No classes with entries found for this trial</p>
            </CardContent>
          </Card>
        ) : selectedClassId === 'all' ? (
         // All Classes Summary View
<>
 <Card>
   <CardHeader>
     <CardTitle>All Classes Summary</CardTitle>
     <CardDescription>
       {summaryData.trial.trial_name} • {(() => {
         const normalizeClassName = (className: string): string => {
  const corrections: Record<string, string> = {
    'Patrol': 'Patrol 1',
    'Detective': 'Detective 2',
    'Investigator': 'Investigator 3',
    'Super Sleuth': 'Super Sleuth 4',  // ✅ ADD THIS LINE
    'Private Inv': 'Private Investigator',
    'Det Diversions': 'Detective Diversions'
  };
  return corrections[className] || className;
};
         
         const uniqueClasses = new Set(summaryData.classes.map(cls => normalizeClassName(cls.class_name)));
         return uniqueClasses.size;
       })()} Classes
     </CardDescription>
   </CardHeader>
   <CardContent>
     <div className="overflow-x-auto">
       <table className="w-full border-collapse">
         <thead>
           <tr className="bg-gray-50">
             <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Class Name</th>
             <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Runs</th>
             <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Rounds</th>
             <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Completion Rate</th>
             <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Pass Rate</th>
           </tr>
         </thead>
         <tbody>

{(() => {
  // Simple sort using the master class order
  const sortedClasses = [...summaryData.classes].sort((a, b) => 
    getClassOrder(a.class_name) - getClassOrder(b.class_name)
  );
  
  return sortedClasses.map((cls, index) => (
    <tr key={index} className="hover:bg-gray-50">
      <td className="border border-gray-300 px-4 py-3">
        <div className="flex items-center space-x-2">
          <span className="font-medium">{cls.class_name}</span>
          {cls.class_type === 'games' && cls.games_subclass && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              <Trophy className="h-3 w-3 mr-1" />
              {cls.games_subclass}
            </Badge>
          )}
        </div>
      </td>
      <td className="border border-gray-300 px-4 py-3 text-center font-mono">
        {cls.participant_count}
      </td>
      <td className="border border-gray-300 px-4 py-3 text-center font-mono">
        {cls.total_rounds || 1}
      </td>
      <td className="border border-gray-300 px-4 py-3 text-center">
        <span className="text-green-600 font-medium">
          {cls.participant_count > 0 ? Math.round((cls.completed_runs / cls.participant_count) * 100) : 0}%
        </span>
      </td>
      <td className="border border-gray-300 px-4 py-3 text-center">
        <span className="font-medium">
          {cls.completed_runs > 0 ? Math.round((cls.pass_count / cls.completed_runs) * 100) : 0}%
        </span>
      </td>
    </tr>
  ));
})()}
         </tbody>
       </table>
     </div>
   </CardContent>
 </Card>

            {/* Overall Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-orange-600">{summaryData.statistics.total_classes}</div>
                  <div className="text-sm text-gray-600">Total Classes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-green-600">{summaryData.statistics.total_participants}</div>
                  <div className="text-sm text-gray-600">Total Participants</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-orange-600">{summaryData.statistics.total_completed}</div>
                  <div className="text-sm text-gray-600">Completed Runs</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-teal-600">{summaryData.statistics.total_passes}</div>
                  <div className="text-sm text-gray-600">Total Passes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(summaryData.statistics.overall_pass_rate)}%
                  </div>
                  <div className="text-sm text-gray-600">Overall Pass Rate</div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
  // Individual Class Detail View - using processed data like Excel
  classDisplayData && (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{summaryData.trial.trial_name}</CardTitle>
          <CardDescription className="text-lg font-semibold mt-2">
            {classDisplayData.className}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
  <table className="w-full border-collapse text-xs sm:text-sm">
    <thead>
      {/* Row 1: Round headers */}
      <tr className="bg-gray-100">
        <th className="sticky left-0 z-20 bg-gray-100 border border-gray-300 px-2 py-2 font-bold text-xs whitespace-nowrap min-w-[110px]">
          C-WAGS
        </th>
        <th className="sticky left-[110px] z-20 bg-gray-100 border border-gray-300 px-2 py-2 font-bold text-xs whitespace-nowrap min-w-[100px]">
          Dog
        </th>
        <th className="sticky left-[210px] z-20 bg-gray-100 border border-gray-300 px-2 py-2 font-bold text-xs whitespace-nowrap min-w-[120px]">
          Handler
        </th>
        {classDisplayData.allRounds.map((round: any) => (
          <th key={round.roundId} className="border border-gray-300 px-3 py-2 text-center font-bold bg-orange-50 min-w-[100px] text-xs">
            Round {round.roundNumber}
          </th>
        ))}
      </tr>
      {/* Row 2: Judge and date */}
      <tr className="bg-gray-50">
        <th className="sticky left-0 z-20 bg-gray-50 border border-gray-300"></th>
        <th className="sticky left-[110px] z-20 bg-gray-50 border border-gray-300"></th>
        <th className="sticky left-[210px] z-20 bg-gray-50 border border-gray-300"></th>
        {classDisplayData.allRounds.map((round: any) => (
          <th key={`judge-${round.roundId}`} className="border border-gray-300 px-2 py-1 text-center bg-orange-50">
            <div className="text-xs font-semibold">{round.judgeInfo}</div>
            <div className="text-[10px] font-normal text-gray-600">
  {(() => {
    const [y, m, d] = round.trialDate.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  })()}
</div>
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {Array.from(classDisplayData.allParticipants.values()).map((participant: any) => (
        <tr key={participant.cwagsNumber} className="hover:bg-gray-50">
          <td className="sticky left-0 z-10 bg-white border border-gray-300 px-2 py-2 text-xs whitespace-nowrap">
            {participant.cwagsNumber}
          </td>
          <td className="sticky left-[110px] z-10 bg-white border border-gray-300 px-2 py-2 text-xs whitespace-nowrap">
            {participant.dogName}
          </td>
          <td className="sticky left-[210px] z-10 bg-white border border-gray-300 px-2 py-2 text-xs whitespace-nowrap">
            {participant.handlerName}
          </td>
          {classDisplayData.allRounds.map((round: any) => {
            const result = round.results.get(participant.cwagsNumber) || '-';
            const isPassing = result === 'P' || ['GB', 'BJ', 'T', 'C'].includes(result) || (!isNaN(Number(result)) && result !== '-');
            const isFailing = result === 'F' || result === 'NQ';
            const isAbsent = result === 'Abs';
            
            return (
              <td 
                key={`${participant.cwagsNumber}-${round.roundId}`}
                className={`border border-gray-300 px-3 py-2 text-center font-semibold text-xs ${
                  isPassing ? 'bg-green-50 text-green-700' :
                  isFailing ? 'bg-red-50 text-red-700' :
                  isAbsent ? 'bg-gray-100 text-gray-500' :
                  'text-gray-400'
                }`}
              >
                {result}
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  </table>
</div>
          <p className="text-xs text-gray-500 mt-2 sm:hidden text-center">← Scroll right to see all rounds →</p>
        </CardContent>
      </Card>
    </>
  )
)}    
      </div>
    </MainLayout>
  );
}