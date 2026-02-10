'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Trophy, Calendar, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { getClassOrder } from '@/lib/cwagsClassNames';

interface RunDetail {
  trial_date: string;
  trial_name: string;
  judge_name: string;
  result: string; // 'Pass', 'Fail', 'NQ', etc.
}

interface DogClassStats {
  class_name: string;
  total_runs: number;
  passes: number;
  pass_rate: number;
  class_order: number;
  run_details: RunDetail[]; // NEW: Store individual run details
}

interface DogPerformanceData {
  dog_info: {
    cwags_number: string;
    dog_call_name: string;
    handler_name: string;
  };
  date_range: {
    earliest: string;
    latest: string;
  };
  trial_count: number;
  club_count: number;
  class_stats: DogClassStats[];
}

// Safe date formatter to avoid timezone issues
const safeDateFromISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // force noon local time
};

export default function DogPerformanceHistory() {
  const [cwagsNumber, setCwagsNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState<DogPerformanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null); // NEW: Track expanded class
  const supabase = getSupabaseBrowser();

  const searchDogHistory = async () => {
    if (!cwagsNumber.trim()) {
      setError('Please enter a C-WAGS registration number');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setPerformanceData(null);

      console.log(`🔍 Searching for dog history: ${cwagsNumber}`);

      // Step 1: Get all entries for this dog
      const { data: entries, error: entriesError } = await supabase
        .from('entries')
        .select(`
          id,
          cwags_number,
          dog_call_name,
          handler_name,
          trial_id,
          trials!inner(
            trial_name,
            club_name,
            trial_days(
              trial_date
            )
          ),
          entry_selections!inner(
            id,
            entry_type,
            entry_status,
            trial_round_id,
            trial_rounds!inner(
              id,
              judge_name,
              trial_classes!inner(
                class_name,
                trial_days!inner(
                  trial_date
                )
              )
            )
          )
        `)
        .eq('cwags_number', cwagsNumber.trim())
        .neq('entry_status', 'withdrawn');

      if (entriesError) {
        console.error('Error fetching entries:', entriesError);
        throw entriesError;
      }

      if (!entries || entries.length === 0) {
        setError(`No trial history found for C-WAGS number: ${cwagsNumber}`);
        return;
      }

      console.log(`✅ Found ${entries.length} entries`);
      
      // Debug: Log first entry structure to verify query
      if (entries.length > 0 && entries[0].entry_selections && entries[0].entry_selections.length > 0) {
        const firstSelection = entries[0].entry_selections[0];
        // Handle trial_rounds as either array or object
        const trialRound = Array.isArray(firstSelection.trial_rounds)
          ? firstSelection.trial_rounds[0]
          : firstSelection.trial_rounds;
        console.log('📋 Sample entry structure:', {
          has_trial_rounds: !!trialRound,
          judge_name: trialRound?.judge_name,
          has_trial_classes: !!trialRound?.trial_classes,
          class_name: trialRound?.trial_classes?.class_name,
          has_trial_days: !!trialRound?.trial_classes?.trial_days,
          trial_date: trialRound?.trial_classes?.trial_days?.trial_date
        });
      }

      // Step 2: Get all selection IDs to fetch scores
      const selectionIds: string[] = [];
      entries.forEach((entry: any) => {
        entry.entry_selections?.forEach((selection: any) => {
          // Only count regular runs (not FEO)
          if (selection.entry_type?.toLowerCase() === 'regular' &&
              selection.entry_status?.toLowerCase() !== 'withdrawn') {
            selectionIds.push(selection.id);
          }
        });
      });

      console.log(`📊 Loading scores for ${selectionIds.length} selections...`);

      // Step 3: Fetch all scores for these selections
      const { data: scores, error: scoresError } = await supabase
        .from('scores')
        .select('entry_selection_id, pass_fail, entry_status')
        .in('entry_selection_id', selectionIds);

      if (scoresError) {
        console.error('Error fetching scores:', scoresError);
        throw scoresError;
      }

      // Create scores map
      const scoresMap = new Map();
      (scores || []).forEach((score: any) => {
        scoresMap.set(score.entry_selection_id, score);
      });

      console.log(`✅ Loaded ${scores?.length || 0} scores`);

      // Step 4: Process data
      const classStatsMap = new Map<string, { 
        total_runs: number; 
        passes: number;
        run_details: RunDetail[];
      }>();
      const trialDates: string[] = [];
      const trialIds = new Set<string>();
      const clubs = new Set<string>();

      let dogInfo = {
        cwags_number: cwagsNumber,
        dog_call_name: '',
        handler_name: ''
      };

      entries.forEach((entry: any) => {
        // Get dog info from first entry
        if (!dogInfo.dog_call_name) {
          dogInfo.dog_call_name = entry.dog_call_name || 'Unknown';
          dogInfo.handler_name = entry.handler_name || 'Unknown';
        }

        // Collect trial info
        if (entry.trial_id) {
          trialIds.add(entry.trial_id);
        }
        if (entry.trials?.club_name) {
          clubs.add(entry.trials.club_name);
        }
        if (entry.trials?.trial_days) {
          entry.trials.trial_days.forEach((day: any) => {
            if (day.trial_date) {
              trialDates.push(day.trial_date);
            }
          });
        }

        // Process selections
        entry.entry_selections?.forEach((selection: any) => {
          // Only count regular runs (not FEO) and not withdrawn
          if (selection.entry_type?.toLowerCase() !== 'regular' ||
              selection.entry_status?.toLowerCase() === 'withdrawn') {
            return;
          }

          // Extract trial_rounds as object (not array)
          // Supabase returns this as a single object for many-to-one relationships
          const trialRound = Array.isArray(selection.trial_rounds) 
            ? selection.trial_rounds[0] 
            : selection.trial_rounds;
          
          const className = trialRound?.trial_classes?.class_name;
          if (!className) return;

          // Check if this run was scored
          const score = scoresMap.get(selection.id);
          
          // Only count if scored (exclude no-shows/absent)
          if (!score || score.entry_status?.toUpperCase() === 'ABS') {
            return;
          }

          // Initialize class stats if needed
          if (!classStatsMap.has(className)) {
            classStatsMap.set(className, { 
              total_runs: 0, 
              passes: 0,
              run_details: []
            });
          }

          const stats = classStatsMap.get(className)!;
          stats.total_runs++;

          // Get trial date from the round's trial_class -> trial_day
          const trialDate = trialRound?.trial_classes?.trial_days?.trial_date || 'Unknown';
          const trialName = entry.trials?.trial_name || 'Unknown Trial';
          const judgeName = trialRound?.judge_name || 'Unknown Judge';
          const result = score.pass_fail || 'Unknown';

          // Debug logging for first few runs to verify data
          if (stats.run_details.length < 2) {
            console.log('📋 Run detail sample:', {
              className,
              trialDate,
              trialName,
              judgeName,
              result,
              raw_trial_round: trialRound,
              judge_from_round: trialRound?.judge_name
            });
          }

          // Add run detail
          stats.run_details.push({
            trial_date: trialDate,
            trial_name: trialName,
            judge_name: judgeName,
            result: result
          });

          // Count passes
          if (score.pass_fail === 'Pass') {
            stats.passes++;
          }
        });
      });

      // Step 5: Build class stats array
      const classStats: DogClassStats[] = Array.from(classStatsMap.entries()).map(([className, stats]) => {
        // Sort run details by date (newest first)
        const sortedRunDetails = stats.run_details.sort((a, b) => {
          try {
            const dateA = safeDateFromISO(a.trial_date).getTime();
            const dateB = safeDateFromISO(b.trial_date).getTime();
            return dateB - dateA; // Newest first
          } catch {
            return 0; // If dates can't be parsed, maintain order
          }
        });

        return {
          class_name: className,
          total_runs: stats.total_runs,
          passes: stats.passes,
          pass_rate: stats.total_runs > 0 ? (stats.passes / stats.total_runs) * 100 : 0,
          class_order: getClassOrder(className),
          run_details: sortedRunDetails
        };
      });

      // Sort by C-WAGS order
      classStats.sort((a, b) => a.class_order - b.class_order);

      // Step 6: Calculate date range
      trialDates.sort((a, b) => {
        try {
          return safeDateFromISO(a).getTime() - safeDateFromISO(b).getTime();
        } catch {
          return 0;
        }
      });
      const dateRange = {
        earliest: trialDates[0] || 'Unknown',
        latest: trialDates[trialDates.length - 1] || 'Unknown'
      };

      const result: DogPerformanceData = {
        dog_info: dogInfo,
        date_range: dateRange,
        trial_count: trialIds.size,
        club_count: clubs.size,
        class_stats: classStats
      };

      console.log('✅ Performance data compiled:', result);
      setPerformanceData(result);

    } catch (err) {
      console.error('Error loading dog performance:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dog performance data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString || dateString === 'Unknown') return dateString;
      const date = safeDateFromISO(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-blue-600" />
            <span>Dog Performance History</span>
          </CardTitle>
          <CardDescription>
            Search for a dog's performance across all trials in the database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="text"
              placeholder="Enter C-WAGS Registration Number (e.g., 12-3456-78)"
              value={cwagsNumber}
              onChange={(e) => setCwagsNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  searchDogHistory();
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={searchDogHistory}
              disabled={loading || !cwagsNumber.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {performanceData && (
        <>
          {/* Dog Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {performanceData.dog_info.dog_call_name}
              </CardTitle>
              <CardDescription>
                Handler: {performanceData.dog_info.handler_name} • C-WAGS #{performanceData.dog_info.cwags_number}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="text-sm text-gray-600">Date Range</div>
                    <div className="font-semibold">
                      {formatDate(performanceData.date_range.earliest)} - {formatDate(performanceData.date_range.latest)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-lg">
                  <Trophy className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="text-sm text-gray-600">Trials</div>
                    <div className="font-semibold text-2xl">{performanceData.trial_count}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-lg">
                  <MapPin className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="text-sm text-gray-600">Clubs</div>
                    <div className="font-semibold text-2xl">{performanceData.club_count}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Class Performance</CardTitle>
              <CardDescription>
                Performance statistics by class (C-WAGS order) • Click class name to see run details
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
                    </tr>
                  </thead>
                  <tbody>
                    {performanceData.class_stats.map((classData, index) => (
                      <React.Fragment key={index}>
                        {/* Main Class Row - Clickable */}
                        <tr 
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setExpandedClass(
                            expandedClass === classData.class_name ? null : classData.class_name
                          )}
                        >
                          <td className="border border-gray-300 px-4 py-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{classData.class_name}</span>
                              {expandedClass === classData.class_name ? (
                                <ChevronUp className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              )}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-mono">
                            {classData.total_runs}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-mono">
                            {classData.passes}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <span
                              className={`font-semibold ${
                                classData.pass_rate >= 80
                                  ? 'text-green-600'
                                  : classData.pass_rate >= 60
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {classData.pass_rate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>

                        {/* Expanded Detail Row */}
                        {expandedClass === classData.class_name && (
                          <tr>
                            <td colSpan={4} className="border border-gray-300 p-0">
                              <div className="bg-blue-50 p-4">
                                <h4 className="font-semibold text-sm text-gray-700 mb-3">
                                  Run-by-Run Breakdown for {classData.class_name}
                                </h4>
                                <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
                                  <table className="w-full">
                                    <thead>
                                      <tr className="bg-gray-100 text-xs">
                                        <th className="px-3 py-2 text-left font-semibold">Trial Date</th>
                                        <th className="px-3 py-2 text-left font-semibold">Trial Name</th>
                                        <th className="px-3 py-2 text-left font-semibold">Judge</th>
                                        <th className="px-3 py-2 text-center font-semibold">Result</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {classData.run_details.map((run, runIndex) => (
                                        <tr key={runIndex} className="border-t border-gray-100 hover:bg-gray-50">
                                          <td className="px-3 py-2 text-sm">
                                            {formatDate(run.trial_date)}
                                          </td>
                                          <td className="px-3 py-2 text-sm">
                                            {run.trial_name}
                                          </td>
                                          <td className="px-3 py-2 text-sm">
                                            {run.judge_name}
                                          </td>
                                          <td className="px-3 py-2 text-center">
                                            <span
                                              className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                                run.result === 'Pass'
                                                  ? 'bg-green-100 text-green-800'
                                                  : run.result === 'Fail'
                                                  ? 'bg-red-100 text-red-800'
                                                  : 'bg-gray-100 text-gray-800'
                                              }`}
                                            >
                                              {run.result}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              {performanceData.class_stats.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No scored runs found for this dog
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}