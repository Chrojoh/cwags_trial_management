// src/app/dashboard/admin/all-trials-summary/page.tsx
'use client';

import { useState, useEffect, Fragment } from 'react';
import ClassJudgeStatistics from '@/components/ClassJudgeStatistics';
import DogPerformanceHistory from '@/components/admin/DogPerformanceHistory';
import { useRouter } from 'next/navigation';
import { getClassOrder } from '@/lib/cwagsClassNames';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import {
  FileSpreadsheet,
  BarChart3,
  Loader2,
  AlertCircle,
  Trophy,
  TrendingUp,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ClassAggregate {
  class_name: string;
  class_type: string;
  regular_runs: number; // Only regular, non-FEO, non-ABS runs
  pass_count: number;
  pass_rate: number;
}

interface OverallStats {
  total_classes: number;
  total_regular_runs: number;
  total_passes: number;
  overall_pass_rate: number;
}

export default function AllTrialsSummaryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = getSupabaseBrowser();
  const [selectedClassForStats, setSelectedClassForStats] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState<ClassAggregate[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState<string>('all');
  const [clubs, setClubs] = useState<Array<{ name: string; count: number }>>([]);
  const [activeTab, setActiveTab] = useState('summary'); // NEW: Tab state

  useEffect(() => {
    if (user) {
      loadClubsList();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAllTrialsData();
    }
  }, [user, selectedClub]);

  const loadClubsList = async () => {
    try {
      // Get all unique clubs with trial counts
      const { data: trials, error } = await supabase.from('trials').select('club_name');

      if (error) throw error;

      // Count trials per club
      const clubCounts: Record<string, number> = {};
      (trials || []).forEach((trial: any) => {
        if (trial.club_name) {
          clubCounts[trial.club_name] = (clubCounts[trial.club_name] || 0) + 1;
        }
      });

      // Convert to array and sort by name
      const clubsList = Object.entries(clubCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setClubs(clubsList);
      console.log(`Loaded ${clubsList.length} clubs`);
    } catch (err) {
      console.error('Error loading clubs list:', err);
    }
  };

  const loadAllTrialsData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading aggregate data across all trials using summary page query structure...');

      // STEP 1: Load ALL scores with pagination (like summary page does)
      let allScores: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      console.log('📊 Loading ALL scores with pagination...');

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

        hasMore = data.length === pageSize;
        from += pageSize;
      }

      console.log(`✅ Loaded ${allScores.length} total scores`);

      // Build scores map
      const scoresMap = new Map();
      allScores.forEach((score) => {
        scoresMap.set(score.entry_selection_id, score);
      });

      // STEP 2: Load classes with rounds and entries
      let query = supabase.from('trial_classes').select(`
          id,
          class_name,
          class_type,
          trial_rounds!inner(
            id,
            entry_selections!inner(
              id,
              entry_type,
              entry_status
            )
          ),
          trial_days!inner(
            trials!inner(
              club_name
            )
          )
        `);

      if (selectedClub !== 'all') {
        query = query.eq('trial_days.trials.club_name', selectedClub);
      }

      const { data: allClasses, error: classError } = await query;

      if (classError) {
        console.error('Error loading classes:', classError);
        throw classError;
      }

      const filterMessage =
        selectedClub !== 'all' ? ` (filtered to club: ${selectedClub})` : ' (all clubs)';

      console.log(`\n=== ALL TRIALS SUMMARY DEBUG${filterMessage} ===`);
      console.log(`Total classes loaded: ${allClasses?.length || 0}`);

      // Group by class name (normalized)
      const classGroups: Record<
        string,
        {
          class_name: string;
          class_type: string;
          runs: Array<{
            selection_id: string;
            entry_type: string;
            entry_status: string;
          }>;
        }
      > = {};

      (allClasses || []).forEach((cls: any) => {
        const className = cls.class_name;
        if (!className) return;

        if (!classGroups[className]) {
          classGroups[className] = {
            class_name: className,
            class_type: cls.class_type || 'unknown',
            runs: [],
          };
        }

        // Process all rounds for this class
        (cls.trial_rounds || []).forEach((round: any) => {
          (round.entry_selections || []).forEach((selection: any) => {
            // Skip withdrawn entries
            if (selection.entry_status?.toLowerCase() === 'withdrawn') return;

            classGroups[className].runs.push({
              selection_id: selection.id,
              entry_type: selection.entry_type || 'regular',
              entry_status: selection.entry_status || 'entered',
            });
          });
        });
      });

      console.log(`Grouped into ${Object.keys(classGroups).length} unique classes`);

      // Calculate aggregates for each class using the scores map
      const aggregates: ClassAggregate[] = Object.values(classGroups).map((group) => {
        // Filter for REGULAR runs only (exclude FEO)
        const regularRuns = group.runs.filter((r) => r.entry_type?.toLowerCase() === 'regular');

        // ✅ ONLY count SCORED runs (that have a score entered)
        // Exclude runs without scores AND exclude ABS
        const scoredRegularRuns = regularRuns.filter((r) => {
          const score = scoresMap.get(r.selection_id);
          // Must have a score
          if (!score) return false;
          // Exclude ABS (absent)
          if (score.entry_status?.toUpperCase() === 'ABS') return false;
          // Must have a result: Pass/Fail/NQ OR numerical_score OR games results
          return (
            score.pass_fail || score.numerical_score !== null || score.numerical_score !== undefined
          );
        });

        const regularRunCount = scoredRegularRuns.length;

        // Count passes from the scored runs
        const passCount = scoredRegularRuns.filter((r) => {
          const score = scoresMap.get(r.selection_id);
          return score?.pass_fail === 'Pass';
        }).length;

        // Pass rate = passes / regular runs
        const passRate = regularRunCount > 0 ? (passCount / regularRunCount) * 100 : 0;

        return {
          class_name: group.class_name,
          class_type: group.class_type,
          regular_runs: regularRunCount,
          pass_count: passCount,
          pass_rate: passRate,
        };
      });

      // Sort by C-WAGS order
      aggregates.sort((a, b) => getClassOrder(a.class_name) - getClassOrder(b.class_name));

      // Calculate overall stats
      const totalRegularRuns = aggregates.reduce((sum, a) => sum + a.regular_runs, 0);
      const totalPasses = aggregates.reduce((sum, a) => sum + a.pass_count, 0);

      const overall: OverallStats = {
        total_classes: aggregates.length,
        total_regular_runs: totalRegularRuns,
        total_passes: totalPasses,
        overall_pass_rate: totalRegularRuns > 0 ? (totalPasses / totalRegularRuns) * 100 : 0,
      };

      setClassData(aggregates);
      setOverallStats(overall);

      console.log('✅ All Trials Summary loaded successfully');
      console.log(`Total classes: ${overall.total_classes}`);
      console.log(`Total runs: ${overall.total_regular_runs}`);
      console.log(`Overall pass rate: ${overall.overall_pass_rate.toFixed(1)}%`);
    } catch (err) {
      console.error('Error loading all trials data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      classData.map((cls) => ({
        'Class Name': cls.class_name,
        'Total Runs': cls.regular_runs,
        Passes: cls.pass_count,
        'Pass Rate': `${cls.pass_rate.toFixed(1)}%`,
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Class Summary');

    const date = new Date().toISOString().split('T')[0];
    const clubSuffix =
      selectedClub !== 'all' ? `_${selectedClub.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    XLSX.writeFile(wb, `All_Trials_Class_Summary${clubSuffix}_${date}.xlsx`);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Trials Summary</h1>
          <p className="text-gray-600">
            Aggregate statistics and dog performance across all trials
          </p>
        </div>

        {/* 🆕 TAB NAVIGATION */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="summary">All Classes Summary</TabsTrigger>
            <TabsTrigger value="dog-history">Dog Performance</TabsTrigger>
          </TabsList>

          {/* TAB 1: ALL CLASSES SUMMARY (Existing Content) */}
          <TabsContent value="summary" className="space-y-6">
            {/* Export Button */}
            <div className="flex justify-end">
              <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
            </div>

            {/* Club Filter */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-base">Filter by Club</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedClub} onValueChange={setSelectedClub}>
                  <SelectTrigger className="w-full max-w-md bg-white">
                    <SelectValue placeholder="Select a club" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">
                      All Clubs ({clubs.reduce((sum, c) => sum + c.count, 0)} trials)
                    </SelectItem>
                    {clubs.map((club) => (
                      <SelectItem key={club.name} value={club.name}>
                        {club.name} ({club.count} {club.count === 1 ? 'trial' : 'trials'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClub !== 'all' && (
                  <p className="text-sm text-blue-700 mt-2">
                    Showing statistics for: <strong>{selectedClub}</strong>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Overall Statistics */}
            {overallStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-orange-600">
                      {overallStats.total_classes}
                    </div>
                    <div className="text-sm text-gray-600">Total Classes</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {overallStats.total_regular_runs}
                    </div>
                    <div className="text-sm text-gray-600">Scored Regular Runs</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {overallStats.total_passes}
                    </div>
                    <div className="text-sm text-gray-600">Total Passes</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-emerald-600">
                      {overallStats.overall_pass_rate.toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">Overall Pass Rate</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* All Classes Summary Table */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-yellow-600" />
                  <span>All Classes Summary</span>
                </CardTitle>
                <CardDescription>
                  Classes ordered by C-WAGS standard progression •{' '}
                  {selectedClub === 'all' ? 'All clubs' : selectedClub}
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
                          Total Runs
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-center font-semibold">
                          Passes
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-center font-semibold">
                          Pass Rate
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-center font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {classData.map((cls, index) => (
                        <Fragment key={index}>
                          <tr className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-3 font-medium">
                              {cls.class_name}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center font-mono">
                              {cls.regular_runs}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center font-mono">
                              {cls.pass_count}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center">
                              <span
                                className={`font-semibold ${
                                  cls.pass_rate >= 80
                                    ? 'text-green-600'
                                    : cls.pass_rate >= 60
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                }`}
                              >
                                {cls.pass_rate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setSelectedClassForStats(
                                    selectedClassForStats === index ? null : index
                                  )
                                }
                                className="text-xs"
                              >
                                {selectedClassForStats === index ? (
                                  <>
                                    <X className="h-3 w-3 mr-1" />
                                    Hide Stats
                                  </>
                                ) : (
                                  <>
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    Judge Stats
                                  </>
                                )}
                              </Button>
                            </td>
                          </tr>

                          {/* Judge Statistics Row */}
                          {selectedClassForStats === index && (
                            <tr>
                              <td colSpan={5} className="border border-gray-300 p-0">
                                <div className="bg-blue-50 p-4">
                                  <ClassJudgeStatistics
                                    clubName={selectedClub === 'all' ? undefined : selectedClub}
                                    preSelectedClass={cls.class_name}
                                  />
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {classData.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No class data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 🆕 TAB 2: DOG PERFORMANCE HISTORY (New Content) */}
          <TabsContent value="dog-history" className="space-y-6">
            <DogPerformanceHistory />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
