// File: src/app/dashboard/trials/[trialId]/summary/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
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

export default function ClassSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const trialId = params.trialId as string;

  const [summaryData, setSummaryData] = useState<{
    trial: Trial;
    classes: TrialClass[];
    statistics: any;
  } | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trialId) {
      loadSummaryData();
    }
  }, [trialId]);

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

// Replace the generateExcelReport function in src/app/dashboard/trials/[trialId]/summary/page.tsx

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

    // Normalize class names
    const normalizeClassName = (className: string): string => {
      const corrections: Record<string, string> = {
        'Patrol': 'Patrol 1',
        'Detective': 'Detective 2',
        'Investigator': 'Investigator 3',
        
      };
      return corrections[className] || className;
    };

    // Blueprint class ordering
    const blueprintOrder = [
      'Patrol 1', 'Detective 2', 'Investigator 3', 'Super Sleuth', 
      'Private Investigator', 'Detective Diversions',
      'Ranger 1', 'Ranger 2', 'Ranger 3', 'Ranger 4', 'Ranger 5',
      'Dasher 3', 'Dasher 4', 'Dasher 5', 'Dasher 6',
      'Obedience 1', 'Obedience 2', 'Obedience 3', 'Obedience 4', 'Obedience 5',
      'Starter', 'Advanced', 'Pro', 'ARF',
      'Zoom 1', 'Zoom 1.5', 'Zoom 2',
      'Games 1', 'Games 2', 'Games 3', 'Games 4'
    ];

    const getClassOrder = (className: string): number => {
      const index = blueprintOrder.indexOf(className);
      return index === -1 ? 999 : index;
    };

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

      const normalizedName = normalizeClassName(className);
      const trialDate = round.trial_classes?.trial_days?.trial_date;
      if (!trialDate) return;

      if (!classesByName.has(normalizedName)) {
        classesByName.set(normalizedName, {
          className: normalizedName,
          allParticipants: new Map(),
          allRounds: [],
          totalPasses: 0,
          totalRuns: 0,
          classOrder: getClassOrder(normalizedName)
        });
      }

      const classData = classesByName.get(normalizedName)!;
      
      const dateSort = new Date(trialDate).getTime();
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
          else if (score.pass_fail === 'Pass') {
            const classInfo = selection.trial_rounds?.trial_classes;
            const isGamesClass = classInfo?.class_type === 'games';
            const gamesSubclass = classInfo?.games_subclass;
            result = (isGamesClass && gamesSubclass) ? gamesSubclass : 'Pass';
            targetClassData.totalPasses++;
            targetClassData.totalRuns++;
          } else if (score.pass_fail === 'Fail') {
            result = 'F';
            targetClassData.totalRuns++;
          }
        }

        targetRound.results.set(cwagsNumber, result);
      });
    });

    // Create Excel workbook
    const XLSX = await import('xlsx-js-style');
    const workbook = XLSX.utils.book_new();

    // Create summary overview sheet with NEW FORMATTING
    const summarySheetData: any[][] = [
      ['Trial Summary'], // Row 1
      [], // Row 2
      ['Class Name', 'Total Runs', 'Actually Ran', 'Passes', 'Fails', 'Billable Runs'], // Row 3
      [], // Row 4 (will be first data row)
    ];

    // Sort classes by blueprint order for summary
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
        classData.className,
        totalRuns,
        actuallyRan,
        passes,
        fails,
        billableRuns
      ]);
    });

    const lastDataRow = 3 + sortedClasses.length;
    const totalRow = lastDataRow + 1;
    const runFeeRow = totalRow + 1;
    const totalOwingRow = runFeeRow + 1;

    summarySheetData.push([
      '', '', '', '', '', 
      { f: `SUM(F4:F${lastDataRow})` } as any
    ]);

    summarySheetData.push(['', '', '', '', 'Run Fee', '']);

    summarySheetData.push([
      '', '', '', '', 'Total Owing', 
      { f: `F${totalRow}*F${runFeeRow}` } as any
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

    // Create individual class matrix sheets in blueprint order
    sortedClasses.forEach((classData) => {
      const sheetData = [];
      
      for (let i = 0; i < 6; i++) {
        sheetData.push([]);
      }
      
      sheetData[0] = [summaryData.trial.trial_name];
      sheetData[2] = ['', '', '', '', '', classData.className];
      
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
        const date = new Date(round.trialDate);
        const formattedDate = date.toLocaleDateString('en-US', {
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

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      
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
              alignment: { horizontal: 'center', vertical: 'center' }
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
      
      let sheetName = classData.className.replace(/[:\\/?*[\]]/g, '');
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

  // Handle Games subclass results
  if (classInfo.class_type === 'games' && score.pass_fail === 'Pass' && classInfo.games_subclass) {
    return { result: classInfo.games_subclass, color: 'text-purple-600 font-semibold' };
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

  // FEO entries
  if (score.pass_fail === 'FEO') {
    return { result: 'FEO', color: 'text-yellow-600 font-semibold' };
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
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
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
              <BarChart3 className="h-8 w-8 text-blue-600" />
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
            <CardDescription>{summaryData.trial.club_name} • {summaryData.trial.location}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Select Class:
                </label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
  <SelectTrigger>
    <SelectValue placeholder="Select a class" />
  </SelectTrigger>
  <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
    <SelectItem value="all">📊 Select All Classes</SelectItem>
    {summaryData.classes.map(cls => (
      <SelectItem key={cls.id} value={cls.id}>
        {getDisplayClassName(cls)}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={generateExcelReport} 
                  disabled={exporting}
                  className="w-full md:w-auto"
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
             <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Participants</th>
             <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Rounds</th>
             <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Completion Rate</th>
             <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Pass Rate</th>
           </tr>
         </thead>
         <tbody>

{(() => {
  // Since the backend now provides consolidated classes with total_rounds already calculated,
  // we can directly use the data without additional consolidation
  
  return summaryData.classes.map((cls, index) => (
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
                  <div className="text-2xl font-bold text-blue-600">{summaryData.statistics.total_classes}</div>
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
          // Individual Class Detail View
          selectedClassData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <span>Class Summary: {getDisplayClassName(selectedClassData)}</span>
                    {selectedClassData.class_type === 'games' && selectedClassData.games_subclass && (
                      <Badge className="bg-purple-100 text-purple-800">
                        <Trophy className="h-3 w-3 mr-1" />
                        Games: {selectedClassData.games_subclass}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {summaryData.trial.trial_name} • {selectedClassData.judge_name} • {selectedClassData.entries.length} Participants
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold">C-WAGS Number</th>
                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Dog Name</th>
                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Handler Name</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">
                            {selectedClassData.judge_name}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedClassData.entries
                          .sort((a, b) => a.running_position - b.running_position)
                          .map(entry => {
                            const { result, color } = getResultDisplay(entry, selectedClassData);
                            
                            return (
                              <tr key={entry.id} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-3 py-2 font-mono text-sm">
                                  {entry.entries.cwags_number}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 font-medium">
                                  {entry.entries.dog_call_name}
                                </td>
                                <td className="border border-gray-300 px-3 py-2">
                                  {entry.entries.handler_name}
                                </td>
                                <td className={`border border-gray-300 px-3 py-2 text-center ${color}`}>
                                  {result}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Individual Class Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="text-center p-4">
                    <div className="text-2xl font-bold text-blue-600">{selectedClassData.entries.length}</div>
                    <div className="text-sm text-gray-600">Total Participants</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="text-center p-4">
                    <div className="text-2xl font-bold text-purple-600">1</div>
                    <div className="text-sm text-gray-600">Total Rounds</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="text-center p-4">
                    <div className="text-2xl font-bold text-green-600 flex items-center justify-center space-x-1">
                      <CheckCircle className="h-5 w-5" />
                      <span>{selectedClassData.pass_count}</span>
                    </div>
                    <div className="text-sm text-gray-600">Passes</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="text-center p-4">
                    <div className="text-2xl font-bold text-red-600 flex items-center justify-center space-x-1">
                      <XCircle className="h-5 w-5" />
                      <span>{selectedClassData.fail_count}</span>
                    </div>
                    <div className="text-sm text-gray-600">Fails</div>
                  </CardContent>
                </Card>
              </div>
            </>
          )
        )}
      </div>
    </MainLayout>
  );
}