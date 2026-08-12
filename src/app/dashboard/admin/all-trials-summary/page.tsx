'use client';

import { Fragment, useEffect, useState } from 'react';
import { AlertCircle, BarChart3, FileSpreadsheet, Loader2, TrendingUp, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import ClassJudgeStatistics from '@/components/ClassJudgeStatistics';
import DogPerformanceHistory from '@/components/admin/DogPerformanceHistory';
import MainLayout from '@/components/layout/mainLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { localDateOnly } from '@/lib/dateOnly';

interface ClassAggregate {
  class_name: string;
  class_type: string;
  regular_runs: number;
  pass_count: number;
  fail_count: number;
  pass_rate: number;
}

interface OverallStats {
  total_classes: number;
  total_regular_runs: number;
  total_passes: number;
  overall_pass_rate: number;
}

interface ReportResponse {
  aggregates?: ClassAggregate[];
  overall?: OverallStats;
  clubs?: Array<{ name: string; count: number }>;
  error?: string;
}

export default function AllTrialsSummaryPage() {
  const [selectedClassForStats, setSelectedClassForStats] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState<ClassAggregate[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState('all');
  const [clubs, setClubs] = useState<Array<{ name: string; count: number }>>([]);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    let cancelled = false;
    const loadReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const query =
          selectedClub !== 'all' ? `?clubName=${encodeURIComponent(selectedClub)}` : '';
        const response = await fetch(`/api/admin/class-statistics${query}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const report = (await response.json()) as ReportResponse;
        if (!response.ok) throw new Error(report.error || 'Failed to load all-trials summary.');
        if (cancelled) return;
        setClassData(report.aggregates || []);
        setOverallStats(report.overall || null);
        setClubs(report.clubs || []);
        setSelectedClassForStats(null);
      } catch (reportError) {
        if (!cancelled) {
          setError(reportError instanceof Error ? reportError.message : 'Failed to load data.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadReport();
    return () => {
      cancelled = true;
    };
  }, [selectedClub]);

  const exportToExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(
      classData.map((trialClass) => ({
        'Class Name': trialClass.class_name,
        'Total Runs': trialClass.regular_runs,
        Passes: trialClass.pass_count,
        Fails: trialClass.fail_count,
        'Pass Rate': `${trialClass.pass_rate.toFixed(1)}%`,
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Class Summary');
    const date = localDateOnly();
    const clubSuffix =
      selectedClub !== 'all' ? `_${selectedClub.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    XLSX.writeFile(workbook, `All_Trials_Class_Summary${clubSuffix}_${date}.xlsx`);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-screen items-center justify-center">
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
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">All Trials Summary</h1>
          <p className="text-gray-600">Aggregate statistics and dog performance across all trials</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="summary">All Classes Summary</TabsTrigger>
            <TabsTrigger value="dog-history">Dog Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export to Excel
              </Button>
            </div>

            <Card className="border-blue-200 bg-blue-50">
              <CardHeader><CardTitle className="text-base">Filter by Club</CardTitle></CardHeader>
              <CardContent>
                <Select value={selectedClub} onValueChange={setSelectedClub}>
                  <SelectTrigger className="w-full max-w-md bg-white">
                    <SelectValue placeholder="Select a club" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">
                      All Clubs ({clubs.reduce((sum, club) => sum + club.count, 0)} trials)
                    </SelectItem>
                    {clubs.map((club) => (
                      <SelectItem key={club.name} value={club.name}>
                        {club.name} ({club.count} {club.count === 1 ? 'trial' : 'trials'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {overallStats && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {[
                  ['Total Classes', overallStats.total_classes, 'text-orange-600'],
                  ['Scored Regular Runs', overallStats.total_regular_runs, 'text-purple-600'],
                  ['Total Passes', overallStats.total_passes, 'text-green-600'],
                  ['Overall Pass Rate', `${overallStats.overall_pass_rate.toFixed(0)}%`, 'text-emerald-600'],
                ].map(([label, value, color]) => (
                  <Card key={String(label)}><CardContent className="pt-6 text-center">
                    <div className={`text-3xl font-bold ${color}`}>{value}</div>
                    <div className="text-sm text-gray-600">{label}</div>
                  </CardContent></Card>
                ))}
              </div>
            )}

            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-yellow-600" /> All Classes Summary
                </CardTitle>
                <CardDescription>
                  Classes ordered by C-WAGS standard progression • {selectedClub === 'all' ? 'All clubs' : selectedClub}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead><tr className="bg-gray-50">
                      {['Class Name', 'Total Runs', 'Passes', 'Pass Rate', 'Actions'].map((heading) => (
                        <th key={heading} className="border border-gray-300 px-4 py-3 text-center font-semibold first:text-left">{heading}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {classData.map((trialClass, index) => (
                        <Fragment key={trialClass.class_name}>
                          <tr className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-3 font-medium">{trialClass.class_name}</td>
                            <td className="border border-gray-300 px-4 py-3 text-center font-mono">{trialClass.regular_runs}</td>
                            <td className="border border-gray-300 px-4 py-3 text-center font-mono">{trialClass.pass_count}</td>
                            <td className="border border-gray-300 px-4 py-3 text-center font-semibold">{trialClass.pass_rate.toFixed(1)}%</td>
                            <td className="border border-gray-300 px-4 py-3 text-center">
                              <Button variant="outline" size="sm" onClick={() => setSelectedClassForStats(selectedClassForStats === index ? null : index)}>
                                {selectedClassForStats === index ? <><X className="mr-1 h-3 w-3" />Hide Stats</> : <><TrendingUp className="mr-1 h-3 w-3" />Judge Stats</>}
                              </Button>
                            </td>
                          </tr>
                          {selectedClassForStats === index && (
                            <tr><td colSpan={5} className="border border-gray-300 p-0">
                              <div className="bg-blue-50 p-4"><ClassJudgeStatistics clubName={selectedClub === 'all' ? undefined : selectedClub} preSelectedClass={trialClass.class_name} /></div>
                            </td></tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                {classData.length === 0 && <p className="py-8 text-center text-gray-500">No class data available</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dog-history" className="space-y-6">
            <DogPerformanceHistory />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
