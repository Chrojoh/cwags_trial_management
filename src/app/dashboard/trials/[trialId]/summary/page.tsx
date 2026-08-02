// File: src/app/dashboard/trials/[trialId]/summary/page.tsx
// Summary sheet: landscape XLSX export with dynamic fit-to-page scaling

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import {
  FileSpreadsheet,
  Users,
  Trophy,
  Loader2,
  BarChart3,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { simpleTrialOperations } from '@/lib/trialOperationsSimple';
import { getClassOrder } from '@/lib/cwagsClassNames';
import { buildLeagueResultsWorkbook } from '@/lib/leagueResultsWorkbook';
import {
  isAbsentSelection,
  isActiveSelection,
  isScorableSelection,
} from '@/lib/selectionStatus';

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
  abs_count: number;
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
      generateClassDisplayData(selectedClassId).then((data) => {
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
        console.log(
          `  ✓ Batch ${Math.floor(from / pageSize) + 1}: loaded ${data.length} scores (total: ${allScores.length})`
        );

        // If we got fewer than pageSize, we've reached the end
        hasMore = data.length === pageSize;
        from += pageSize;
      }

      console.log('✅ DISPLAY FIX: Loaded total scores:', allScores.length);

      // Build the scores map
      const scoresMap = new Map();
      allScores.forEach((score) => {
        scoresMap.set(score.entry_selection_id, score);
      });

      // Find the selected class info
      const selectedClass = summaryData.classes.find((c) => c.id === classId);
      if (!selectedClass) return null;

      // ✅ REVERTED FIX: Filter by class NAME to show ALL DAYS (like Excel export)
      const normalizedSelectedClassName = selectedClass.class_name;

      const roundsForThisClass = allTrialRounds.filter((round: any) => {
        const roundClassName = round.trial_classes?.class_name;
        if (!roundClassName) return false;
        const roundNormalized = roundClassName;
        return roundNormalized === normalizedSelectedClassName;
      });

      console.log(
        `🔍 DISPLAY: Found ${roundsForThisClass.length} rounds across ALL DAYS for "${normalizedSelectedClassName}"`
      );

      console.log(
        `Found ${roundsForThisClass.length} rounds for class ${selectedClass.class_name} (ID: ${classId})`
      );

      // Sort rounds chronologically
      roundsForThisClass.sort((a: any, b: any) => {
        const dateA = safeDateFromISO(a.trial_classes?.trial_days?.trial_date || '');
        const dateB = safeDateFromISO(b.trial_classes?.trial_days?.trial_date || '');
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
          results: new Map(),
        })),
      };

      // Process entries and scores
      (entriesResult.data || []).forEach((entry: any) => {
        (entry.entry_selections || []).forEach((selection: any) => {
          if (selection.entry_type?.toLowerCase() === 'feo') return;
          if (!isActiveSelection(selection.entry_status)) return;

          const roundId = selection.trial_round_id;

          // Find the target round in OUR rounds
          const targetRound = classData.allRounds.find((r: any) => r.roundId === roundId);
          if (!targetRound) return; // Not for this class

          // Add participant
          const cwagsNumber = entry.cwags_number;
          if (!classData.allParticipants.has(cwagsNumber)) {
            classData.allParticipants.set(cwagsNumber, {
              cwagsNumber: entry.cwags_number,
              dogName: entry.dog_call_name,
              handlerName: entry.handler_name,
            });
          }

          // Determine result
          const score = scoresMap.get(selection.id);
          let result = '-';

          if (
            isAbsentSelection(selection.entry_status) ||
            isAbsentSelection(score?.entry_status)
          ) {
            result = 'Abs';
          } else if (score) {
            if (['GB', 'BJ', 'T', 'P', 'C'].includes(score.pass_fail || '')) {
              result = score.pass_fail;
            } else if (score.pass_fail === 'Pass') {
              result = 'P';
            } else if (score.pass_fail === 'Fail') {
              result = 'F';
            } else if (score.pass_fail === 'NQ') {
              result = 'NQ';
            }
          }

          targetRound.results.set(cwagsNumber, result);
        });
      });

      console.log('Final class data:', {
        className: classData.className,
        participants: classData.allParticipants.size,
        rounds: classData.allRounds.length,
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
    const exportSummaryData = summaryData;

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
        console.log(
          `  ✓ Batch ${Math.floor(from / pageSize) + 1}: loaded ${data.length} scores (total: ${allScores.length})`
        );

        // If we got fewer than pageSize, we've reached the end
        hasMore = data.length === pageSize;
        from += pageSize;
      }

      console.log('✅ EXCEL FIX: Loaded total scores:', allScores.length);

      // Build the scores map
      const scoresMap = new Map();
      allScores.forEach((score) => {
        scoresMap.set(score.entry_selection_id, score);
      });

      // Build complete class structure with all rounds
      const classesByName = new Map<
        string,
        {
          className: string;
          allParticipants: Map<
            string,
            {
              cwagsNumber: string;
              dogName: string;
              handlerName: string;
            }
          >;
          allRounds: Array<{
            roundId: string;
            judgeInfo: string;
            trialDate: string;
            roundNumber: number;
            sortOrder: number;
            results: Map<string, string | number>;
          }>;
          totalPasses: number;
          totalRuns: number;
          classOrder: number;
        }
      >();

      // Process all trial rounds to create complete structure
      allTrialRounds.forEach((round: any) => {
        const className = round.trial_classes?.class_name;
        if (!className) return;

        const trialDate = round.trial_classes?.trial_days?.trial_date;
        if (!trialDate) return;

        if (!classesByName.has(className)) {
          // ✅ FIXED
          classesByName.set(className, {
            className: className,
            allParticipants: new Map(),
            allRounds: [],
            totalPasses: 0,
            totalRuns: 0,
            classOrder: getClassOrder(className),
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
          results: new Map(),
        });
      });

      // Sort rounds chronologically within each class
      classesByName.forEach((classData) => {
        classData.allRounds.sort((a, b) => a.sortOrder - b.sortOrder);
      });

      // Process actual entries and scores
      (entriesResult.data || []).forEach((entry: any) => {
        (entry.entry_selections || []).forEach((selection: any) => {
          if (selection.entry_type?.toLowerCase() === 'feo') {
            return;
          }
          if (
            !isScorableSelection(selection.entry_status) &&
            !isAbsentSelection(selection.entry_status)
          ) {
            return;
          }

          const roundId = selection.trial_round_id;
          const cwagsNumber = entry.cwags_number;

          let targetClassData: any = null;
          let targetRound: any = null;

          classesByName.forEach((classData) => {
            const round = classData.allRounds.find((r) => r.roundId === roundId);
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
              handlerName: entry.handler_name,
            });
          }

          const score = scoresMap.get(selection.id);
          let result: string | number = '-';

          if (
            isAbsentSelection(selection.entry_status) ||
            isAbsentSelection(score?.entry_status)
          ) {
            result = 'Abs';
            targetClassData.totalRuns++;
          } else if (
            !isScorableSelection(selection.entry_status) ||
            score?.entry_status === 'withdrawn'
          ) {
            result = 'Wth';
          } else if (score?.entry_status === 'scratched') {
            result = 'X';
            targetClassData.totalRuns++;
          } else if (score) {
            const className = targetClassData.className || '';
            const isRallyOrObedience =
              className.toLowerCase().includes('starter') ||
              className.toLowerCase().includes('advanced') ||
              className.toLowerCase().includes('pro') ||
              className.toLowerCase().includes('obedience') ||
              className.toLowerCase().includes('zoom') ||
              className.toLowerCase().includes('rally');

            if (selection.entry_type === 'feo' || score.pass_fail === 'FEO') {
              result = 'FEO';
              targetClassData.totalRuns++;
            } else if (
              isRallyOrObedience &&
              score.numerical_score !== null &&
              score.numerical_score !== undefined
            ) {
              const passingScore = className.toLowerCase().includes('obedience 5') ? 120 : 70;

              if (score.numerical_score >= passingScore && score.pass_fail === 'Pass') {
                // Preserve qualifying numerical scores as numbers so Excel does
                // not flag them as "Number stored as text."
                result = Number(score.numerical_score);
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
            } else if (score.pass_fail === 'Pass') {
              result = 'Pass';
              targetClassData.totalPasses++;
              targetClassData.totalRuns++;
            } else if (score.pass_fail === 'Fail') {
              result = 'F';
              targetClassData.totalRuns++;
            } else if (score.pass_fail === 'NQ') {
              result = 'NQ';
              targetClassData.totalRuns++;
            }
          }

          targetRound.results.set(cwagsNumber, result);
        });
      });

      // Populate the official league results workbook without rebuilding it. This
      // preserves its directions, logo, recap layout, styles, and print settings.
      {
        const exportClasses = Array.from(classesByName.values())
          .sort((a, b) => a.classOrder - b.classOrder)
          .filter((classData) =>
            classData.allRounds.some((round) =>
              Array.from(round.results.values()).some((result) => result !== '-')
            )
          )
          .map((classData) => ({
            className: classData.className,
            participants: Array.from(classData.allParticipants.values()),
            rounds: classData.allRounds,
          }));

        const templateResponse = await fetch('/templates/league-results-template-v3.xlsx');
        if (!templateResponse.ok) {
          throw new Error('Could not load the league results workbook template.');
        }

        const workbookBytes = buildLeagueResultsWorkbook(
          new Uint8Array(await templateResponse.arrayBuffer()),
          {
            trialName: exportSummaryData.trial.trial_name,
            clubName: exportSummaryData.trial.club_name,
            location: exportSummaryData.trial.location,
            startDate: exportSummaryData.trial.start_date,
            endDate: exportSummaryData.trial.end_date,
          },
          exportClasses
        );
        const workbookBuffer = workbookBytes.buffer.slice(
          workbookBytes.byteOffset,
          workbookBytes.byteOffset + workbookBytes.byteLength
        ) as ArrayBuffer;
        const blob = new Blob([workbookBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${exportSummaryData.trial.trial_name.replace(/[^a-zA-Z0-9]/g, '_')}_League_Results.xlsx`;
        anchor.click();
        URL.revokeObjectURL(url);
        console.log('League results workbook generated successfully');
        return;
      }

    } catch (error) {
      console.error('Error generating Excel report:', error);
      setError(
        'Failed to generate Excel report: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
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
    { label: 'Class Summary' },
  ];

  return (
    <MainLayout title="Class Summary Sheet" breadcrumbItems={breadcrumbItems}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-orange-600" />
              <span>Class Summary Sheet</span>
            </h1>
            <p className="text-gray-600 mt-1">
              Track competitor progress across all rounds of a class
            </p>
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
                  <SelectTrigger className="border-2 border-purple-600 rounded-md hover:bg-purple-50 transition-colors">
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
                  {summaryData.trial.trial_name} •{' '}
                  {(() => {
                    const normalizeClassName = (className: string): string => {
                      const corrections: Record<string, string> = {
                        Patrol: 'Patrol 1',
                        Detective: 'Detective 2',
                        Investigator: 'Investigator 3',
                        'Super Sleuth': 'Super Sleuth 4', 
                        'Private Inv': 'Private Investigator',
                        'Det Diversions': 'Detective Diversions',
                      };
                      return corrections[className] || className;
                    };

                    const uniqueClasses = new Set(
                      summaryData.classes.map((cls) => normalizeClassName(cls.class_name))
                    );
                    return uniqueClasses.size;
                  })()}{' '}
                  Classes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                          Class Name
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-center font-semibold">
                          Runs
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-center font-semibold">
                          Rounds
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-center font-semibold">
                          Pass
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-center font-semibold">
                          F
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-center font-semibold">
                          Abs
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-center font-semibold">
                          Completion Rate
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-center font-semibold">
                          Pass Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Simple sort using the master class order
                        const sortedClasses = [...summaryData.classes].sort(
                          (a, b) => getClassOrder(a.class_name) - getClassOrder(b.class_name)
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
                            <td className="border border-gray-300 px-4 py-3 text-center font-mono text-green-700">
                              {cls.pass_count}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center font-mono text-red-600">
                              {cls.fail_count}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center font-mono text-gray-500">
                              {cls.abs_count}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center">
                              <span className="text-green-600 font-medium">
                                {cls.participant_count > 0
                                  ? Math.round((cls.completed_runs / cls.participant_count) * 100)
                                  : 0}
                                %
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center">
                              <span className="font-medium">
                                {cls.completed_runs > 0
                                  ? Math.round((cls.pass_count / cls.completed_runs) * 100)
                                  : 0}
                                %
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
            <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-orange-600">
                    {summaryData.statistics.total_classes}
                  </div>
                  <div className="text-sm text-gray-600">Total Classes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {summaryData.statistics.total_participants}
                  </div>
                  <div className="text-sm text-gray-600">Total Entered Runs</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-orange-600">
                    {summaryData.statistics.total_completed}
                  </div>
                  <div className="text-sm text-gray-600">Completed Runs</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-teal-600">
                    {summaryData.statistics.total_passes}
                  </div>
                  <div className="text-sm text-gray-600">Total Passes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-red-600">
                    {summaryData.statistics.total_fails}
                  </div>
                  <div className="text-sm text-gray-600">Total F</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-gray-500">
                    {summaryData.statistics.total_abs}
                  </div>
                  <div className="text-sm text-gray-600">Total Abs</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {summaryData.statistics.total_completed > 0
                      ? Math.round((summaryData.statistics.total_passes / summaryData.statistics.total_completed) * 100)
                      : 0}%
                  </div>
                  <div className="text-sm text-gray-600">Pass Rate</div>
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
                            <th
                              key={round.roundId}
                              className="border border-gray-300 px-3 py-2 text-center font-bold bg-orange-50 min-w-[100px] text-xs"
                            >
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
                            <th
                              key={`judge-${round.roundId}`}
                              className="border border-gray-300 px-2 py-1 text-center bg-orange-50"
                            >
                              <div className="text-xs font-semibold">{round.judgeInfo}</div>
                              <div className="text-[10px] font-normal text-gray-600">
                                {(() => {
                                  const [y, m, d] = round.trialDate.split('-').map(Number);
                                  const date = new Date(y, m - 1, d, 12, 0, 0);
                                  return date.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  });
                                })()}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(classDisplayData.allParticipants.values()).map(
                          (participant: any) => (
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
                                const isPassing =
                                  result === 'P' ||
                                  ['GB', 'BJ', 'T', 'C'].includes(result) ||
                                  (!isNaN(Number(result)) && result !== '-');
                                const isFailing = result === 'F' || result === 'NQ';
                                const isAbsent = result === 'Abs';

                                return (
                                  <td
                                    key={`${participant.cwagsNumber}-${round.roundId}`}
                                    className={`border border-gray-300 px-3 py-2 text-center font-semibold text-xs ${
                                      isPassing
                                        ? 'bg-green-50 text-green-700'
                                        : isFailing
                                          ? 'bg-red-50 text-red-700'
                                          : isAbsent
                                            ? 'bg-gray-100 text-gray-500'
                                            : 'text-gray-400'
                                    }`}
                                  >
                                    {result}
                                  </td>
                                );
                              })}
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 sm:hidden text-center">
                    ← Scroll right to see all rounds →
                  </p>
                </CardContent>
              </Card>
            </>
          )
        )}
      </div>
    </MainLayout>
  );
}
