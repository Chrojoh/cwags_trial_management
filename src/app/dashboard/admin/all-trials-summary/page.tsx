// src/app/dashboard/admin/all-trials-summary/page.tsx
'use client';

import { useState, useEffect, Fragment } from 'react';
import ClassJudgeStatistics from '@/components/ClassJudgeStatistics';
import { useRouter } from 'next/navigation';
import { getClassOrder } from '@/lib/cwagsClassNames';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import {
  FileSpreadsheet,
  BarChart3,
  Loader2,
  AlertCircle,
  Trophy,
  TrendingUp,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ClassAggregate {
  class_name: string;
  class_type: string;
  regular_runs: number;  // Only regular, non-FEO, non-ABS runs
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
      const { data: trials, error } = await supabase
        .from('trials')
        .select('club_name');

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
        console.log(`  ✓ Batch ${Math.floor(from / pageSize) + 1}: loaded ${data.length} scores (total: ${allScores.length})`);
        
        hasMore = data.length === pageSize;
        from += pageSize;
      }

      console.log('✅ Loaded total scores:', allScores.length);

      // Build scores map by entry_selection_id
      const scoresMap = new Map();
      allScores.forEach(score => {
        scoresMap.set(score.entry_selection_id, score);
      });

      // STEP 2: Get ALL trial classes with their rounds and entry selections (NO scores in nested query)
      // Filter by club if one is selected
      let query = supabase
        .from('trial_classes')
        .select(`
          id,
          class_name,
          class_type,
          games_subclass,
          trial_days!inner(
            trial_id,
            trials!inner(
              club_name
            )
          ),
          trial_rounds!inner(
            id,
            judge_name,
            entry_selections(
              id,
              entry_type,
              entry_status,
              entries!inner(
                handler_name,
                dog_call_name,
                cwags_number
              )
            )
          )
        `);

      // Apply club filter if selected
      if (selectedClub !== 'all') {
        query = query.eq('trial_days.trials.club_name', selectedClub);
      }

      const { data: allClasses, error: classesError } = await query;

      if (classesError) {
        console.error('Query error:', classesError);
        throw classesError;
      }

      const filterMessage = selectedClub !== 'all' 
        ? ` (filtered to club: ${selectedClub})`
        : ' (all clubs)';
      
      console.log(`\n=== ALL TRIALS SUMMARY DEBUG${filterMessage} ===`);
      console.log(`Total classes loaded: ${allClasses?.length || 0}`);

      // Group by class name (normalized)
      const classGroups: Record<string, {
        class_name: string;
        class_type: string;
        runs: Array<{
          selection_id: string;
          entry_type: string;
          entry_status: string;
        }>;
      }> = {};

      (allClasses || []).forEach((cls: any) => {
  const className = cls.class_name;
  if (!className) return;

  if (!classGroups[className]) {
    classGroups[className] = {
      class_name: className,
      class_type: cls.class_type || 'unknown',
      runs: []
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
        entry_status: selection.entry_status || 'entered'
      });
    });
  });
});

      console.log(`Grouped into ${Object.keys(classGroups).length} unique classes`);

      // Calculate aggregates for each class using the scores map
      const aggregates: ClassAggregate[] = Object.values(classGroups).map(group => {
        // Filter for REGULAR runs only (exclude FEO)
        const regularRuns = group.runs.filter(r => 
          r.entry_type?.toLowerCase() === 'regular'
        );

        // ✅ ONLY count SCORED runs (that have a score entered)
        // Exclude runs without scores AND exclude ABS
        const scoredRegularRuns = regularRuns.filter(r => {
          const score = scoresMap.get(r.selection_id);
          // Must have a score
          if (!score) return false;
          // Exclude ABS (absent)
          if (score.entry_status?.toUpperCase() === 'ABS') return false;
          // Must have a result: Pass/Fail/NQ OR numerical_score OR games results
          return score.pass_fail || score.numerical_score !== null || score.numerical_score !== undefined;
        });

        const regularRunCount = scoredRegularRuns.length;
        
        // Count passes from the scored runs
        const passCount = scoredRegularRuns.filter(r => {
          const score = scoresMap.get(r.selection_id);
          return score?.pass_fail === 'Pass';
        }).length;

        // Pass rate = passes / regular runs
        const passRate = regularRunCount > 0 ? (passCount / regularRunCount) * 100 : 0;

        // Debug first few classes
        if (group.class_name === 'Patrol 1' || group.class_name === 'Detective 2') {
          console.log(`\n=== ${group.class_name} Debug ===`);
          console.log('Total entries in group:', group.runs.length);
          console.log('Regular entries (non-FEO):', regularRuns.length);
          console.log('SCORED regular runs (with results):', regularRunCount);
          console.log('Passes found:', passCount);
          console.log('Sample scored runs:', scoredRegularRuns.slice(0, 3).map(r => {
            const score = scoresMap.get(r.selection_id);
            return {
              has_score: !!score,
              pass_fail: score?.pass_fail,
              numerical_score: score?.numerical_score,
              entry_status: score?.entry_status
            };
          }));
        }

        return {
          class_name: group.class_name,
          class_type: group.class_type,
          regular_runs: regularRunCount,
          pass_count: passCount,
          pass_rate: passRate
        };
      });

      // ✅ FILTER OUT classes with 0 scored runs
      const aggregatesWithScores = aggregates.filter(agg => agg.regular_runs > 0);

      console.log(`\nFiltered from ${aggregates.length} total classes to ${aggregatesWithScores.length} classes with scored runs`);

      // Sort by C-WAGS class order
      aggregatesWithScores.sort((a, b) => getClassOrder(a.class_name) - getClassOrder(b.class_name));

      // Calculate overall statistics
      const totalRegularRuns = aggregatesWithScores.reduce((sum, c) => sum + c.regular_runs, 0);
      const totalPasses = aggregatesWithScores.reduce((sum, c) => sum + c.pass_count, 0);
      const overallPassRate = totalRegularRuns > 0 ? (totalPasses / totalRegularRuns) * 100 : 0;

      console.log(`\nTotal SCORED regular runs: ${totalRegularRuns}`);
      console.log(`Total passes: ${totalPasses}`);
      console.log(`Overall pass rate: ${overallPassRate.toFixed(1)}%`);
      console.log(`(Note: Only counting runs with scores entered)`);
      console.log(`================================\n`);

      setOverallStats({
        total_classes: aggregatesWithScores.length,
        total_regular_runs: totalRegularRuns,
        total_passes: totalPasses,
        overall_pass_rate: overallPassRate
      });

      setClassData(aggregatesWithScores);
      console.log('Aggregate data loaded successfully');

    } catch (err) {
      console.error('Error loading aggregate data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  
  const exportToExcel = () => {
    if (!classData.length) return;

    const wb = XLSX.utils.book_new();

    // Summary sheet data - simplified to 3 columns
    const summaryData: Array<{
      'Class Name': string;
      '# of Runs': number | string;
      'Pass %': string;
    }> = classData.map(cls => ({
      'Class Name': cls.class_name,
      '# of Runs': cls.regular_runs,
      'Pass %': `${cls.pass_rate.toFixed(0)}%`
    }));

    // Add overall stats at the end
    if (overallStats) {
      summaryData.push({
        'Class Name': '',
        '# of Runs': '',
        'Pass %': ''
      });
      summaryData.push({
        'Class Name': 'OVERALL TOTALS',
        '# of Runs': overallStats.total_regular_runs,
        'Pass %': `${overallStats.overall_pass_rate.toFixed(0)}%`
      });
    }

    const ws = XLSX.utils.json_to_sheet(summaryData);

    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Class Name
      { wch: 12 }, // # of Runs
      { wch: 12 }  // Pass %
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'All Trials Summary');

    // Generate filename with current date and club filter
    const date = new Date().toISOString().split('T')[0];
    const clubSuffix = selectedClub !== 'all' ? `_${selectedClub.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
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
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">All Trials Summary</h1>
            <Button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
          </div>
          <p className="text-gray-600">Aggregate statistics across all trials in the database</p>
        </div>

        {/* Club Filter */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
              Classes ordered by C-WAGS standard progression • {selectedClub === 'all' ? 'Aggregated across all trials' : `Filtered to: ${selectedClub}`}
              <br />
              <span className="text-orange-600 font-medium">Click a class name to expand and see judge statistics</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-yellow-300 bg-yellow-100">
                    <th className="text-left p-3 font-semibold text-gray-700">Class Name</th>
                    <th className="text-center p-3 font-semibold text-gray-700"># of Runs</th>
                    <th className="text-center p-3 font-semibold text-gray-700">Pass %</th>
                  </tr>
                </thead>
                <tbody>
                  {classData.map((cls, idx) => (
                    <Fragment key={idx}>
                      <tr 
                        className="border-b border-yellow-200 hover:bg-yellow-50 transition-colors"
                      >
                        <td className="p-3 font-medium text-gray-900">
                          <button
                            onClick={() => setSelectedClassForStats(selectedClassForStats === idx ? null : idx)}
                            className="text-orange-600 hover:text-orange-700 hover:underline cursor-pointer text-left font-medium flex items-center gap-2"
                          >
                            {cls.class_name}
                            {selectedClassForStats === idx && (
                              <span className="text-xs text-gray-500">(click to close)</span>
                            )}
                          </button>
                        </td>
                        <td className="p-3 text-center text-gray-700">
                          {cls.regular_runs}
                        </td>
                        <td className="p-3 text-center">
                          <Badge 
                            variant="outline"
                            className={
                              cls.pass_rate >= 80 ? 'bg-green-100 text-green-800 border-green-300' :
                              cls.pass_rate >= 60 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                              cls.pass_rate >= 40 ? 'bg-orange-100 text-orange-800 border-orange-300' :
                              'bg-red-100 text-red-800 border-red-300'
                            }
                          >
                            {cls.pass_rate.toFixed(0)}%
                          </Badge>
                        </td>
                      </tr>
                      
                      {/* Expanded row for judge statistics */}
                      {selectedClassForStats === idx && (
                        <tr>
                          <td colSpan={3} className="p-0 bg-gray-50 border-b-2 border-yellow-300">
                            <div className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                  <BarChart3 className="h-5 w-5 text-orange-600" />
                                  Judge Statistics for {cls.class_name}
                                </h3>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedClassForStats(null)}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Close
                                </Button>
                              </div>
                              
                              <ClassJudgeStatistics
                                clubName={selectedClub !== 'all' ? selectedClub : undefined}
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
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="mt-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span>Notes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-2">
            <p>• <strong># of Runs:</strong> SCORED regular runs only (excludes FEO, ABS, and unscored entries)</p>
            <p>• <strong>Pass %:</strong> Pass Count ÷ # of Runs × 100</p>
            <p>• A run must have a score entered (Pass/Fail/NQ or numerical) to be counted</p>
            <p>• Classes with 0 scored runs are not displayed</p>
            <p>• Withdrawn entries are excluded from all calculations</p>
            <p>• Classes are displayed in standard C-WAGS progression order</p>
            <p>• <strong>Click any class name</strong> to expand the row and see judge statistics for that class</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}