// src/components/ClassJudgeStatistics.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Loader2, Users } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { getClassOrder } from '@/lib/cwagsClassNames';

interface JudgeClassStats {
  judge_name: string;
  runs: number;
  passes: number;
  pass_rate: number;
  rounds_judged: number;
}

interface ClassJudgeStatisticsProps {
  clubName?: string;
  preSelectedClass?: string; // If provided, auto-select this class and hide dropdown
}

export default function ClassJudgeStatistics({ clubName, preSelectedClass }: ClassJudgeStatisticsProps) {
  const [selectedClass, setSelectedClass] = useState<string>(preSelectedClass || '');
  const [judgeStats, setJudgeStats] = useState<JudgeClassStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);

  // Load available classes on mount
  useEffect(() => {
    loadAvailableClasses();
  }, [clubName]);

  // Load judge stats when class is selected
  useEffect(() => {
    if (selectedClass) {
      loadJudgeStatistics();
    }
  }, [selectedClass, clubName]);

  const loadAvailableClasses = async () => {
    try {
      const supabase = getSupabaseBrowser();
      
      // STEP 1: Get all trial_class_ids that have scores
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select('trial_round_id');

      if (scoresError) throw scoresError;

      // Get unique trial_round_ids
      const roundIdsWithScores = new Set(
        scoresData?.map(s => s.trial_round_id) || []
      );

      console.log(`Found ${roundIdsWithScores.size} rounds with scores`);

      if (roundIdsWithScores.size === 0) {
        setAvailableClasses([]);
        return;
      }

      // STEP 2: Get class info for those rounds
      let query = supabase
        .from('trial_rounds')
        .select(`
          id,
          trial_classes!inner(
            class_name,
            trial_days!inner(
              trials!inner(
                club_name
              )
            )
          )
        `)
        .in('id', Array.from(roundIdsWithScores));

      if (clubName) {
        query = query.eq('trial_classes.trial_days.trials.club_name', clubName);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log(`Found ${data?.length || 0} rounds with class info`);

      // Normalize class names (database stores "Patrol", display shows "Patrol 1", etc.)
      const normalizeClassName = (className: string): string => {
        const corrections: Record<string, string> = {
          'Patrol': 'Patrol 1',
          'Detective': 'Detective 2',
          'Investigator': 'Investigator 3',
          'Super Sleuth': 'Super Sleuth 4',
        };
        return corrections[className] || className;
      };

      // Get unique class names
      const classNames = new Set<string>();
      data?.forEach(round => {
        const trialClasses = round.trial_classes as any;
        const className = trialClasses?.class_name;
        
        if (className) {
          const normalized = normalizeClassName(className);
          classNames.add(normalized);
        }
      });

      console.log('Classes with scores:', Array.from(classNames));

      // Sort by C-WAGS order using helper function
      const sortedClasses = Array.from(classNames).sort((a, b) => 
        getClassOrder(a) - getClassOrder(b)
      );

      setAvailableClasses(sortedClasses);
      
      // Auto-select first class only if no preSelectedClass is provided
      if (!preSelectedClass && sortedClasses.length > 0 && !selectedClass) {
        setSelectedClass(sortedClasses[0]);
      } else if (preSelectedClass && !selectedClass) {
        // If preSelectedClass is provided, use it
        setSelectedClass(preSelectedClass);
      }
    } catch (err) {
      console.error('Error loading available classes:', err);
    }
  };

  const loadJudgeStatistics = async () => {
    if (!selectedClass) return;

    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabaseBrowser();

      console.log('Loading judge statistics for class:', selectedClass);

      // Reverse normalization map (to query database with original names)
      const denormalizeClassName = (className: string): string[] => {
        const reverseMap: Record<string, string> = {
          'Patrol 1': 'Patrol',
          'Detective 2': 'Detective',
          'Investigator 3': 'Investigator',
          'Super Sleuth 4': 'Super Sleuth',
        };
        // Return both normalized and denormalized versions
        const denormalized = reverseMap[className];
        return denormalized ? [className, denormalized] : [className];
      };

      const classNamesToQuery = denormalizeClassName(selectedClass);
      console.log('Querying database for class names:', classNamesToQuery);

      // STEP 1: Get all rounds for this class (query with both normalized and original names)
      let roundsQuery = supabase
        .from('trial_rounds')
        .select(`
          id,
          judge_name,
          trial_classes!inner(
            class_name,
            trial_days!inner(
              trials!inner(
                id,
                club_name
              )
            )
          )
        `)
        .in('trial_classes.class_name', classNamesToQuery);

      if (clubName) {
        roundsQuery = roundsQuery.eq('trial_classes.trial_days.trials.club_name', clubName);
      }

      const { data: rounds, error: roundsError } = await roundsQuery;

      if (roundsError) throw roundsError;

      if (!rounds || rounds.length === 0) {
        console.log('No rounds found for this class');
        setJudgeStats([]);
        setLoading(false);
        return;
      }

      console.log(`Found ${rounds.length} rounds for ${selectedClass}`);

      // STEP 2: Get all scores for these rounds
      const roundIds = rounds.map(r => r.id);
      
      const { data: scores, error: scoresError } = await supabase
        .from('scores')
        .select(`
          pass_fail,
          entry_status,
          trial_round_id,
          entry_selections!inner(
            entry_type
          )
        `)
        .in('trial_round_id', roundIds);

      if (scoresError) throw scoresError;

      console.log(`Loaded ${scores?.length || 0} scores`);

      // Map scores to rounds
      const scoresMap = new Map<string, any[]>();
      (scores || []).forEach((score: any) => {
        if (!scoresMap.has(score.trial_round_id)) {
          scoresMap.set(score.trial_round_id, []);
        }
        scoresMap.get(score.trial_round_id)!.push(score);
      });

      // STEP 3: Calculate stats per judge
      const judgeStatsMap = new Map<string, {
        runs: number;
        passes: number;
        rounds: Set<string>;
      }>();

      rounds.forEach((round: any) => {
        const judgeName = round.judge_name;
        if (!judgeName) return;

        // Initialize judge stats
        if (!judgeStatsMap.has(judgeName)) {
          judgeStatsMap.set(judgeName, {
            runs: 0,
            passes: 0,
            rounds: new Set()
          });
        }

        const judgeData = judgeStatsMap.get(judgeName)!;
        judgeData.rounds.add(round.id);

        // Process scores for this round
        const roundScores = scoresMap.get(round.id) || [];
        
        roundScores.forEach((score: any) => {
          // Only count regular runs
          if (score.entry_selections?.entry_type !== 'regular') return;
          
          // Skip if ABS
          if (score.entry_status === 'ABS') return;

          // Count this run
          judgeData.runs++;

          // Count passes
          if (score.pass_fail === 'Pass') {
            judgeData.passes++;
          }
        });
      });

      // Convert to array and sort alphabetically
      const judgeStatsArray = Array.from(judgeStatsMap.entries())
        .map(([judgeName, data]) => ({
          judge_name: judgeName,
          runs: data.runs,
          passes: data.passes,
          pass_rate: data.runs > 0 ? (data.passes / data.runs) * 100 : 0,
          rounds_judged: data.rounds.size
        }))
        .filter(j => j.runs > 0)  // Only include judges with scored runs
        .sort((a, b) => a.judge_name.localeCompare(b.judge_name));

      setJudgeStats(judgeStatsArray);

      console.log(`${judgeStatsArray.length} judges with statistics for ${selectedClass}`);

    } catch (err) {
      console.error('Error loading class judge statistics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const getPassRateColor = (rate: number): string => {
    if (rate >= 90) return 'bg-green-100 text-green-800 border-green-300';
    if (rate >= 80) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (rate >= 70) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  if (!availableClasses.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Class Judge Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No classes with scores available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {preSelectedClass ? (
            // Show class name as title when pre-selected
            <span>Judge Statistics: {selectedClass}</span>
          ) : (
            // Show generic title when user selecting
            <span>Class Judge Statistics</span>
          )}
        </CardTitle>
        
        {!preSelectedClass && (
          <div className="mt-4">
            <label className="text-sm font-medium mb-2 block">Select Class</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a class..." />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {availableClasses.map((className) => (
                  <SelectItem key={className} value={className}>
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : judgeStats.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No statistics available for this class</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Judges</p>
                  <p className="text-2xl font-bold text-gray-900">{judgeStats.length}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Runs</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {judgeStats.reduce((sum, j) => sum + j.runs, 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Judge List */}
            <div className="space-y-3">
              {judgeStats.map((judge) => (
                <div
                  key={judge.judge_name}
                  className="border rounded-lg p-4 hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{judge.judge_name}</h3>
                      <p className="text-sm text-gray-600">
                        {judge.runs} run{judge.runs !== 1 ? 's' : ''} in {judge.rounds_judged} round{judge.rounds_judged !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={getPassRateColor(judge.pass_rate)}
                    >
                      {judge.pass_rate.toFixed(1)}% pass
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${judge.pass_rate}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>{judge.passes} passes</span>
                    <span>{judge.runs - judge.passes} fails</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}