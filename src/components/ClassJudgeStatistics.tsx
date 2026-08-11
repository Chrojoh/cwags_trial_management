'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Loader2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface JudgeClassStats {
  judge_name: string;
  runs: number;
  passes: number;
  pass_rate: number;
  rounds_judged: number;
}

interface ClassStatisticsResponse {
  classes?: string[];
  statistics?: Record<string, JudgeClassStats[]>;
  error?: string;
}

interface ClassJudgeStatisticsProps {
  clubName?: string;
  preSelectedClass?: string;
}

export default function ClassJudgeStatistics({
  clubName,
  preSelectedClass,
}: ClassJudgeStatisticsProps) {
  const [selectedClass, setSelectedClass] = useState(preSelectedClass || '');
  const [statistics, setStatistics] = useState<Record<string, JudgeClassStats[]>>({});
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = clubName ? `?clubName=${encodeURIComponent(clubName)}` : '';
        const response = await fetch(`/api/admin/class-statistics${query}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const result = (await response.json()) as ClassStatisticsResponse;
        if (!response.ok) throw new Error(result.error || 'Failed to load class statistics.');
        if (cancelled) return;

        const classes = result.classes || [];
        setStatistics(result.statistics || {});
        setAvailableClasses(classes);
        setSelectedClass((current) => {
          if (preSelectedClass) return preSelectedClass;
          return current && classes.includes(current) ? current : classes[0] || '';
        });
      } catch (reportError) {
        if (!cancelled) {
          setAvailableClasses([]);
          setStatistics({});
          setError(
            reportError instanceof Error
              ? reportError.message
              : 'Failed to load class statistics.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadReport();
    return () => {
      cancelled = true;
    };
  }, [clubName, preSelectedClass]);

  const judgeStats = selectedClass ? statistics[selectedClass] || [] : [];
  const getPassRateColor = (rate: number): string => {
    if (rate >= 90) return 'bg-green-100 text-green-800 border-green-300';
    if (rate >= 80) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (rate >= 70) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  if (loading || error || availableClasses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Class Judge Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading classes with scores...
            </div>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <p className="text-sm text-gray-500">No classes with scores available</p>
          )}
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
            <span>Judge Statistics: {selectedClass}</span>
          ) : (
            <span>Class Judge Statistics</span>
          )}
        </CardTitle>

        {!preSelectedClass && (
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium">Select Class</label>
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
        {judgeStats.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-sm text-gray-500">No statistics available for this class</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Judges</p>
                  <p className="text-2xl font-bold text-gray-900">{judgeStats.length}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Runs</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {judgeStats.reduce((sum, judge) => sum + judge.runs, 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {judgeStats.map((judge) => (
                <div
                  key={judge.judge_name}
                  className="rounded-lg border p-4 transition-colors hover:border-orange-300"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{judge.judge_name}</h3>
                      <p className="text-sm text-gray-600">
                        {judge.runs} run{judge.runs !== 1 ? 's' : ''} in {judge.rounds_judged}{' '}
                        round{judge.rounds_judged !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Badge variant="outline" className={getPassRateColor(judge.pass_rate)}>
                      {judge.pass_rate.toFixed(1)}% pass
                    </Badge>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-green-500 transition-all"
                      style={{ width: `${judge.pass_rate}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-gray-500">
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
