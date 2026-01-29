// src/components/JudgeStatistics.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Loader2 } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { getClassOrder } from '@/lib/cwagsClassNames';

interface JudgeStats {
  total_runs: number;
  total_passes: number;
  overall_pass_rate: number;
  classes_judged: number;
  trials_judged: number;
  class_breakdown: Array<{
    class_name: string;
    runs: number;
    passes: number;
    pass_rate: number;
    rounds_judged: number;
  }>;
}

interface JudgeStatisticsProps {
  judgeName: string;
  className?: string;
}

export default function JudgeStatistics({ judgeName, className = '' }: JudgeStatisticsProps) {
  const [stats, setStats] = useState<JudgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJudgeStatistics();
  }, [judgeName]);

  const loadJudgeStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabaseBrowser();

      console.log('========================================');
      console.log('Loading statistics for judge:', judgeName);
      console.log('Judge name length:', judgeName.length);
      console.log('Judge name (trimmed):', judgeName.trim());

      // STEP 1: First check if this judge has ANY rounds at all
      const { data: simpleCheck, error: simpleError } = await supabase
        .from('trial_rounds')
        .select('id, judge_name, trial_class_id')
        .eq('judge_name', judgeName)
        .limit(5);

      console.log('Simple check - rounds found:', simpleCheck?.length || 0);
      if (simpleCheck && simpleCheck.length > 0) {
        console.log('Sample rounds:', simpleCheck);
      } else {
        console.log('❌ No rounds found for this judge name');
        console.log('Trying case-insensitive search...');
        
        // Try case-insensitive search
        const { data: caseInsensitive } = await supabase
          .from('trial_rounds')
          .select('id, judge_name')
          .ilike('judge_name', judgeName)
          .limit(5);
        
        console.log('Case-insensitive search found:', caseInsensitive?.length || 0);
        if (caseInsensitive && caseInsensitive.length > 0) {
          console.log('Found with different case:', caseInsensitive[0].judge_name);
        }
      }

      // STEP 2: Get all rounds with full details
      const { data: rounds, error: roundsError } = await supabase
        .from('trial_rounds')
        .select(`
          id,
          judge_name,
          trial_class_id,
          trial_classes!inner(
            class_name,
            class_type,
            trial_day_id,
            trial_days!inner(
              trial_id,
              trials!inner(id)
            )
          )
        `)
        .eq('judge_name', judgeName);

      if (roundsError) {
        console.error('Query error:', roundsError);
        throw roundsError;
      }

      console.log(`Query returned ${rounds?.length || 0} rounds with classes`);
      
      if (!rounds || rounds.length === 0) {
        console.log('❌ No rounds found after joining with classes');
        setStats(null);
        setLoading(false);
        return;
      }

      // STEP 3: Get scores directly for these rounds using trial_round_id
      const roundIds = rounds.map(r => r.id);
      console.log(`Loading scores for ${roundIds.length} rounds...`);

      const { data: scores, error: scoresError } = await supabase
        .from('scores')
        .select(`
          *,
          entry_selections!inner(
            id,
            entry_type
          )
        `)
        .in('trial_round_id', roundIds);

      if (scoresError) {
        console.error('Scores error:', scoresError);
        throw scoresError;
      }

      console.log(`Loaded ${scores?.length || 0} scores directly`);
      
      if (scores && scores.length > 0) {
        console.log('Sample score:', scores[0]);
      }
      
      // Map scores back to rounds by trial_round_id
      const scoresByRound = new Map<string, any[]>();
      (scores || []).forEach((score: any) => {
        if (!scoresByRound.has(score.trial_round_id)) {
          scoresByRound.set(score.trial_round_id, []);
        }
        scoresByRound.get(score.trial_round_id)!.push(score);
      });

      console.log(`Scores mapped to ${scoresByRound.size} rounds`);

      // STEP 4: Process the data to calculate statistics
      const classStats = new Map<string, {
        runs: number;
        passes: number;
        rounds: Set<string>;
      }>();

      let totalRuns = 0;
      let totalPasses = 0;
      const trialsSet = new Set<string>();

      console.log('Processing rounds data...');
      
      // Debug counters
      let debugCounters = {
        totalSelections: 0,
        notRegular: 0,
        noScores: 0,
        isABS: 0,
        processed: 0
      };

      (rounds || []).forEach((round: any) => {
        const className = round.trial_classes?.class_name;
        if (!className) {
          console.log('⚠️ Round missing class name:', round.id);
          return;
        }

        // Track trials
        const trialId = round.trial_classes?.trial_days?.trials?.id;
        if (trialId) trialsSet.add(trialId);

        // Initialize class stats
        if (!classStats.has(className)) {
          classStats.set(className, {
            runs: 0,
            passes: 0,
            rounds: new Set()
          });
        }

        const classData = classStats.get(className)!;
        classData.rounds.add(round.id);

        // Get scores for this round
        const roundScores = scoresByRound.get(round.id) || [];
        debugCounters.totalSelections += roundScores.length;
        
        // Debug first few scores
        if (debugCounters.totalSelections <= 3 && roundScores.length > 0) {
          console.log(`Score ${debugCounters.totalSelections}:`, {
            entry_type: roundScores[0].entry_selections?.entry_type,
            pass_fail: roundScores[0].pass_fail,
            entry_status: roundScores[0].entry_status
          });
        }

        // Process scores
        roundScores.forEach((score: any) => {
          // Only count regular runs
          if (score.entry_selections?.entry_type !== 'regular') {
            debugCounters.notRegular++;
            return;
          }
          
          // Skip if ABS
          if (score.entry_status === 'ABS') {
            debugCounters.isABS++;
            return;
          }

          debugCounters.processed++;

          // Count this run
          classData.runs++;
          totalRuns++;

          // Count passes
          if (score.pass_fail === 'Pass') {
            classData.passes++;
            totalPasses++;
          }
        });
      });
      
      console.log('Debug counters:', debugCounters);

      console.log(`Processed: ${totalRuns} total runs, ${totalPasses} passes`);
      console.log(`Classes with data: ${classStats.size}`);
      console.log(`Trials: ${trialsSet.size}`);

    
      // Convert to array and calculate pass rates
      const classBreakdown = Array.from(classStats.entries()).map(([className, data]) => ({
        class_name: className,
        runs: data.runs,
        passes: data.passes,
        pass_rate: data.runs > 0 ? (data.passes / data.runs) * 100 : 0,
        rounds_judged: data.rounds.size
      }))
      .filter(c => c.runs > 0)  // Only include classes with scored runs
      .sort((a, b) => getClassOrder(a.class_name) - getClassOrder(b.class_name));  // Sort by C-WAGS order

      const overallPassRate = totalRuns > 0 ? (totalPasses / totalRuns) * 100 : 0;

      setStats({
        total_runs: totalRuns,
        total_passes: totalPasses,
        overall_pass_rate: overallPassRate,
        classes_judged: classBreakdown.length,
        trials_judged: trialsSet.size,
        class_breakdown: classBreakdown
      });

      console.log('Judge statistics loaded:', {
        judgeName,
        totalRuns,
        totalPasses,
        overallPassRate: overallPassRate.toFixed(1),
        classesJudged: classBreakdown.length,
        trialsJudged: trialsSet.size
      });

      if (classBreakdown.length > 0) {
        console.log('Class breakdown:', classBreakdown);
      } else {
        console.log('⚠️ No classes with scored runs found');
      }

      console.log('========================================');

    } catch (err) {
      console.error('Error loading judge statistics:', err);
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

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6 flex items-center justify-center">
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
            <p className="text-sm text-gray-500 mt-2">Loading statistics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total_runs === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-500">No judging statistics available yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-base">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <span>📊 Judging Statistics</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">• {stats.total_runs} runs judged</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">• {stats.overall_pass_rate.toFixed(0)}% overall pass rate</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">• {stats.classes_judged} classes, {stats.trials_judged} trials</span>
          </div>
        </div>

        {/* Classes Judged Breakdown */}
        <div className="border-t pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Classes Judged:</p>
          <div className="space-y-2">
            {stats.class_breakdown.map((cls, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2 flex-1">
                  <span className="text-gray-700">• {cls.class_name}:</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-2 py-0 ${getPassRateColor(cls.pass_rate)}`}
                  >
                    {cls.pass_rate.toFixed(0)}%
                  </Badge>
                </div>
                <span className="text-gray-500 text-xs ml-2">
                  ({cls.runs} runs, {cls.rounds_judged} {cls.rounds_judged === 1 ? 'round' : 'rounds'})
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}