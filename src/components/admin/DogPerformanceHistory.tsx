'use client';

import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, FileSpreadsheet, MapPin, Search, Trophy } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatCwagsNumber } from '@/lib/utils';
import { localDateOnly } from '@/lib/dateOnly';

interface RunDetail {
  trial_date: string;
  trial_name: string;
  judge_name: string;
  result: string;
}
interface DogClassStats {
  class_name: string;
  total_runs: number;
  passes: number;
  pass_rate: number;
  class_order: number;
  run_details: RunDetail[];
}
interface DogPerformanceData {
  dog_info: { cwags_number: string; dog_call_name: string; handler_name: string };
  date_range: { earliest: string; latest: string };
  trial_count: number;
  club_count: number;
  class_stats: DogClassStats[];
}
interface DogPerformanceResponse extends Partial<DogPerformanceData> { error?: string }

const safeDateFromISO = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
};

export default function DogPerformanceHistory() {
  const [cwagsNumber, setCwagsNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState<DogPerformanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  const searchDogHistory = async () => {
    if (!cwagsNumber.trim()) {
      setError('Please enter a C-WAGS registration number');
      return;
    }
    setLoading(true);
    setError(null);
    setPerformanceData(null);
    try {
      const formatted = formatCwagsNumber(cwagsNumber);
      setCwagsNumber(formatted);
      const response = await fetch(
        `/api/admin/dog-performance?cwags=${encodeURIComponent(formatted)}`,
        { credentials: 'include', cache: 'no-store' }
      );
      const result = (await response.json()) as DogPerformanceResponse;
      if (!response.ok) throw new Error(result.error || 'Failed to load dog performance data.');
      setPerformanceData(result as DogPerformanceData);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Failed to load dog performance data.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'Unknown') return dateString;
    try {
      return safeDateFromISO(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const exportToExcel = () => {
    if (!performanceData) return;
    const workbook = XLSX.utils.book_new();
    const summary = [
      ['Dog Performance Summary'], [],
      ['Dog Name:', performanceData.dog_info.dog_call_name],
      ['Handler Name:', performanceData.dog_info.handler_name],
      ['C-WAGS Number:', performanceData.dog_info.cwags_number], [],
      ['Date Range:', `${formatDate(performanceData.date_range.earliest)} - ${formatDate(performanceData.date_range.latest)}`],
      ['Total Trials:', performanceData.trial_count],
      ['Total Clubs:', performanceData.club_count], [],
      ['Class Summary'], ['Class Name', 'Total Runs', 'Passes', 'Pass Rate'],
      ...performanceData.class_stats.map((item) => [item.class_name, item.total_runs, item.passes, `${item.pass_rate.toFixed(1)}%`]),
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summary);
    summarySheet['!cols'] = [{ wch: 25 }, { wch: 22 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    performanceData.class_stats.forEach((item) => {
      const rows = [
        [item.class_name], [], ['Total Runs:', item.total_runs], ['Passes:', item.passes],
        ['Pass Rate:', `${item.pass_rate.toFixed(1)}%`], [], ['Run Details'],
        ['Trial Date', 'Trial Name', 'Judge', 'Result'],
        ...item.run_details.map((run) => [formatDate(run.trial_date), run.trial_name, run.judge_name, run.result]),
      ];
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      sheet['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 22 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(
        workbook,
        sheet,
        item.class_name.replace(/[:\/?*\[\]]/g, '').substring(0, 31)
      );
    });
    const dog = performanceData.dog_info.dog_call_name.replace(/[^a-zA-Z0-9]/g, '_');
    const number = performanceData.dog_info.cwags_number.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `Dog_Performance_${dog}_${number}_${localDateOnly()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-blue-600" />Dog Performance History</CardTitle>
          <CardDescription>Search for a dog&apos;s performance across all trials in the database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={cwagsNumber}
              onChange={(event) => setCwagsNumber(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && void searchDogHistory()}
              placeholder="C-WAGS number (for example 12-3456-78)"
              className="bg-white"
            />
            <Button onClick={() => void searchDogHistory()} disabled={loading}>
              <Search className="mr-2 h-4 w-4" />{loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {performanceData && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <CardTitle>{performanceData.dog_info.dog_call_name}</CardTitle>
                  <CardDescription>
                    {performanceData.dog_info.cwags_number} • Handler: {performanceData.dog_info.handler_name}
                  </CardDescription>
                </div>
                <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-blue-600" />{formatDate(performanceData.date_range.earliest)} – {formatDate(performanceData.date_range.latest)}</div>
                <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-orange-600" />{performanceData.trial_count} trials</div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-green-600" />{performanceData.club_count} clubs</div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {performanceData.class_stats.map((item) => {
              const expanded = expandedClass === item.class_name;
              return (
                <Card key={item.class_name}>
                  <button
                    type="button"
                    onClick={() => setExpandedClass(expanded ? null : item.class_name)}
                    className="flex w-full items-center justify-between p-5 text-left"
                  >
                    <div>
                      <h3 className="font-semibold">{item.class_name}</h3>
                      <p className="text-sm text-gray-600">{item.total_runs} runs • {item.passes} passes • {item.pass_rate.toFixed(1)}%</p>
                    </div>
                    {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  {expanded && (
                    <CardContent className="border-t pt-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="text-left text-gray-600"><th className="py-2">Date</th><th>Trial</th><th>Judge</th><th>Result</th></tr></thead>
                          <tbody>{item.run_details.map((run, index) => (
                            <tr key={`${run.trial_date}-${run.trial_name}-${index}`} className="border-t">
                              <td className="py-2">{formatDate(run.trial_date)}</td><td>{run.trial_name}</td><td>{run.judge_name}</td><td>{run.result}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
