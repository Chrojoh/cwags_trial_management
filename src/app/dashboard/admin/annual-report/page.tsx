'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { financialOperations } from '@/lib/financialOperations';
import { isActiveSelection } from '@/lib/selectionStatus';
import { useAuth } from '@/hooks/useAuth';
import { AlertCircle, ChevronDown, ChevronUp, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

type MetricKey =
  | 'trials'
  | 'trialDays'
  | 'classes'
  | 'entries'
  | 'runs'
  | 'passes'
  | 'fails'
  | 'abs'
  | 'passRate'
  | 'assessed'
  | 'collected'
  | 'outstanding'
  | 'waived'
  | 'expenses'
  | 'net';

interface TrialBase {
  id: string;
  trial_name: string;
  start_date: string;
  end_date: string;
  club_name: string | null;
  trial_status: string;
}

interface TrialAnnualRow extends TrialBase {
  trialDays: number;
  classes: number;
  entries: number;
  runs: number;
  passes: number;
  fails: number;
  abs: number;
  passRate: number;
  assessed: number;
  collected: number;
  outstanding: number;
  waived: number;
  expenses: number;
  net: number;
}

const money = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });
const number = new Intl.NumberFormat('en-CA');

const metricDefinitions: Array<{
  key: MetricKey;
  label: string;
  section: 'Activity' | 'Results' | 'Financials';
  format: 'number' | 'money' | 'percent';
  description: string;
}> = [
  { key: 'trials', label: 'Trials', section: 'Activity', format: 'number', description: 'Trials beginning in the selected year.' },
  { key: 'trialDays', label: 'Trial Days', section: 'Activity', format: 'number', description: 'Configured trial dates.' },
  { key: 'classes', label: 'Classes Offered', section: 'Activity', format: 'number', description: 'Class offerings across all selected trial days.' },
  { key: 'entries', label: 'Entries', section: 'Activity', format: 'number', description: 'Dog registration records, not individual runs.' },
  { key: 'runs', label: 'Runs', section: 'Activity', format: 'number', description: 'Active class and round selections, including FEO.' },
  { key: 'passes', label: 'Passes', section: 'Results', format: 'number', description: 'Recorded regular-run passes.' },
  { key: 'fails', label: 'Fails / NQ', section: 'Results', format: 'number', description: 'Recorded regular-run failures or NQs.' },
  { key: 'abs', label: 'ABS', section: 'Results', format: 'number', description: 'Recorded absent results.' },
  { key: 'passRate', label: 'Pass Rate', section: 'Results', format: 'percent', description: 'Passes divided by passes plus fails; ABS is excluded.' },
  { key: 'assessed', label: 'Fees Assessed', section: 'Financials', format: 'money', description: 'Billable fees after waivers.' },
  { key: 'collected', label: 'Fees Collected', section: 'Financials', format: 'money', description: 'Recorded payment transactions.' },
  { key: 'outstanding', label: 'Outstanding', section: 'Financials', format: 'money', description: 'Positive unpaid balances only.' },
  { key: 'waived', label: 'Fees Waived', section: 'Financials', format: 'money', description: 'Run fees waived by the secretary.' },
  { key: 'expenses', label: 'Recorded Expenses', section: 'Financials', format: 'money', description: 'Expenses entered on trial financial pages.' },
  { key: 'net', label: 'Net Cash Result', section: 'Financials', format: 'money', description: 'Fees collected minus recorded expenses.' },
];

const formatMetric = (value: number, format: 'number' | 'money' | 'percent') => {
  if (format === 'money') return money.format(value);
  if (format === 'percent') return `${value.toFixed(1)}%`;
  return number.format(value);
};

export default function AnnualReportPage() {
  const { user } = useAuth();
  const supabase = getSupabaseBrowser();
  const currentYear = new Date().getFullYear();
  const [allTrials, setAllTrials] = useState<TrialBase[]>([]);
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedClub, setSelectedClub] = useState('all');
  const [completedOnly, setCompletedOnly] = useState(false);
  const [rows, setRows] = useState<TrialAnnualRow[]>([]);
  const [expandedMetric, setExpandedMetric] = useState<MetricKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const loadTrialOptions = async () => {
      const { data: roleRecord, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      if (roleError || roleRecord?.role !== 'administrator') {
        setError('Administrator access is required for the annual report.');
        setLoading(false);
        return;
      }

      const { data, error: trialsError } = await supabase
        .from('trials')
        .select('id, trial_name, start_date, end_date, club_name, trial_status')
        .order('start_date', { ascending: false });
      if (trialsError) {
        setError(trialsError.message);
        setLoading(false);
        return;
      }
      const trials = (data || []) as TrialBase[];
      setAllTrials(trials);
      if (trials.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
      const availableYears = trials.map((trial) => new Date(trial.start_date).getFullYear());
      if (availableYears.length && !availableYears.includes(currentYear)) {
        setSelectedYear(String(Math.max(...availableYears)));
      }
    };
    loadTrialOptions();
  }, [supabase, user, currentYear]);

  const filteredTrials = useMemo(
    () => allTrials.filter((trial) => {
      const matchesYear = new Date(trial.start_date).getFullYear() === Number(selectedYear);
      const matchesClub = selectedClub === 'all' || trial.club_name === selectedClub;
      const matchesStatus = !completedOnly || trial.trial_status === 'completed';
      return matchesYear && matchesClub && matchesStatus;
    }),
    [allTrials, selectedYear, selectedClub, completedOnly]
  );

  const loadReport = useCallback(async () => {
    if (!user || allTrials.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const trialIds = filteredTrials.map((trial) => trial.id);
      if (trialIds.length === 0) {
        setRows([]);
        return;
      }

      const { data: days, error: daysError } = await supabase
        .from('trial_days')
        .select('id, trial_id')
        .in('trial_id', trialIds);
      if (daysError) throw daysError;
      const dayIds = (days || []).map((day) => day.id);

      const classesResult = dayIds.length
        ? await supabase.from('trial_classes').select('id, trial_day_id').in('trial_day_id', dayIds)
        : { data: [], error: null };
      if (classesResult.error) throw classesResult.error;
      const classIds = (classesResult.data || []).map((trialClass) => trialClass.id);

      const roundsResult = classIds.length
        ? await supabase.from('trial_rounds').select('id, trial_class_id').in('trial_class_id', classIds)
        : { data: [], error: null };
      if (roundsResult.error) throw roundsResult.error;
      const roundIds = (roundsResult.data || []).map((round) => round.id);

      const selectionsResult = roundIds.length
        ? await supabase
            .from('entry_selections')
            .select('id, entry_id, trial_round_id, entry_type, entry_status')
            .in('trial_round_id', roundIds)
        : { data: [], error: null };
      if (selectionsResult.error) throw selectionsResult.error;

      const { data: entries, error: entriesError } = await supabase
        .from('entries')
        .select('id, trial_id')
        .in('trial_id', trialIds);
      if (entriesError) throw entriesError;

      let scores: Array<{ entry_selection_id: string; pass_fail: string | null; entry_status: string | null }> = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data: scorePage, error: scoreError } = await supabase
          .from('scores')
          .select('entry_selection_id, pass_fail, entry_status')
          .range(from, from + pageSize - 1);
        if (scoreError) throw scoreError;
        scores = scores.concat(scorePage || []);
        if (!scorePage || scorePage.length < pageSize) break;
        from += pageSize;
      }

      const dayToTrial = new Map((days || []).map((day) => [day.id, day.trial_id]));
      const classToTrial = new Map(
        (classesResult.data || []).map((trialClass) => [trialClass.id, dayToTrial.get(trialClass.trial_day_id)])
      );
      const roundToTrial = new Map(
        (roundsResult.data || []).map((round) => [round.id, classToTrial.get(round.trial_class_id)])
      );
      const entryToTrial = new Map((entries || []).map((entry) => [entry.id, entry.trial_id]));
      const selectionToTrial = new Map(
        (selectionsResult.data || []).map((selection) => [selection.id, roundToTrial.get(selection.trial_round_id)])
      );
      const financialResults = await Promise.all(
        filteredTrials.map(async (trial) => {
          const [financials, expenses] = await Promise.all([
            financialOperations.getCompetitorFinancials(trial.id),
            financialOperations.getTrialExpenses(trial.id),
          ]);
          return { trialId: trial.id, financials: financials.data || [], expenses: expenses.data || [] };
        })
      );
      const financialMap = new Map(financialResults.map((result) => [result.trialId, result]));

      const reportRows = filteredTrials.map((trial) => {
        const trialSelections = (selectionsResult.data || []).filter(
          (selection) => roundToTrial.get(selection.trial_round_id) === trial.id
        );
        const activeSelections = trialSelections.filter((selection) => isActiveSelection(selection.entry_status));
        const regularSelectionIds = new Set(
          activeSelections
            .filter((selection) => String(selection.entry_type).toLowerCase() !== 'feo')
            .map((selection) => selection.id)
        );
        const trialScores = scores.filter(
          (score) => selectionToTrial.get(score.entry_selection_id) === trial.id && regularSelectionIds.has(score.entry_selection_id)
        );
        const passes = trialScores.filter((score) => String(score.pass_fail).toLowerCase() === 'pass').length;
        const fails = trialScores.filter((score) => ['fail', 'nq'].includes(String(score.pass_fail).toLowerCase())).length;
        const abs = trialScores.filter(
          (score) => String(score.pass_fail).toUpperCase() === 'ABS' || String(score.entry_status).toUpperCase() === 'ABS'
        ).length;
        const finance = financialMap.get(trial.id);
        const assessed = finance?.financials.reduce((sum: number, competitor: any) => sum + Number(competitor.amount_owed || 0), 0) || 0;
        const collected = finance?.financials.reduce((sum: number, competitor: any) => sum + Number(competitor.amount_paid || 0), 0) || 0;
        const outstanding = finance?.financials.reduce((sum: number, competitor: any) => {
          const balance = competitor.fees_waived ? 0 : Number(competitor.amount_owed || 0) - Number(competitor.amount_paid || 0);
          return sum + Math.max(0, balance);
        }, 0) || 0;
        const waived = finance?.financials.reduce((sum: number, competitor: any) => sum + Number(competitor.waived_amount || 0), 0) || 0;
        const expenses = finance?.expenses.reduce((sum: number, expense: any) => sum + Number(expense.amount || 0), 0) || 0;

        return {
          ...trial,
          trialDays: (days || []).filter((day) => day.trial_id === trial.id).length,
          classes: (classesResult.data || []).filter((trialClass) => classToTrial.get(trialClass.id) === trial.id).length,
          entries: (entries || []).filter((entry) => entryToTrial.get(entry.id) === trial.id).length,
          runs: activeSelections.length,
          passes,
          fails,
          abs,
          passRate: passes + fails > 0 ? (passes / (passes + fails)) * 100 : 0,
          assessed,
          collected,
          outstanding,
          waived,
          expenses,
          net: collected - expenses,
        } satisfies TrialAnnualRow;
      });

      setRows(reportRows.sort((a, b) => a.start_date.localeCompare(b.start_date)));
    } catch (caught) {
      console.error('Annual report failed:', caught);
      setError(caught instanceof Error ? caught.message : 'Unable to load the annual report.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [allTrials.length, filteredTrials, supabase, user]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const totals = useMemo(() => {
    const sum = (key: keyof TrialAnnualRow) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);
    const passes = sum('passes');
    const fails = sum('fails');
    return {
      trials: rows.length,
      trialDays: sum('trialDays'),
      classes: sum('classes'),
      entries: sum('entries'),
      runs: sum('runs'),
      passes,
      fails,
      abs: sum('abs'),
      passRate: passes + fails > 0 ? (passes / (passes + fails)) * 100 : 0,
      assessed: sum('assessed'),
      collected: sum('collected'),
      outstanding: sum('outstanding'),
      waived: sum('waived'),
      expenses: sum('expenses'),
      net: sum('net'),
    } as Record<MetricKey, number>;
  }, [rows]);

  const years = useMemo(
    () => Array.from(new Set(allTrials.map((trial) => new Date(trial.start_date).getFullYear()))).sort((a, b) => b - a),
    [allTrials]
  );
  const clubs = useMemo(
    () => Array.from(new Set(allTrials.map((trial) => trial.club_name).filter(Boolean) as string[])).sort(),
    [allTrials]
  );

  const exportExcel = () => {
    const exportRows = rows.map((row) => ({
      Trial: row.trial_name,
      Club: row.club_name || '',
      'Start Date': row.start_date,
      Status: row.trial_status,
      'Trial Days': row.trialDays,
      Classes: row.classes,
      Entries: row.entries,
      Runs: row.runs,
      Passes: row.passes,
      'Fails / NQ': row.fails,
      ABS: row.abs,
      'Pass Rate': row.passRate / 100,
      'Fees Assessed': row.assessed,
      'Fees Collected': row.collected,
      Outstanding: row.outstanding,
      'Fees Waived': row.waived,
      Expenses: row.expenses,
      'Net Cash Result': row.net,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet['!cols'] = [{ wch: 28 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, ...Array(14).fill({ wch: 14 })];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Annual Report');
    XLSX.writeFile(workbook, `CWAGS_Annual_Report_${selectedYear}.xlsx`);
  };

  const getTrialMetric = (row: TrialAnnualRow, key: MetricKey) => {
    if (key === 'trials') return 1;
    return row[key];
  };

  return (
    <MainLayout title="Annual Report" breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Annual Report' }]}>
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Annual Trial and Financial Report</CardTitle>
            <CardDescription>Click any total to view its trial-by-trial breakdown.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4 items-end">
            <div>
              <Label>Calendar Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  {years.map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Club</Label>
              <Select value={selectedClub} onValueChange={setSelectedClub}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All clubs</SelectItem>
                  {clubs.map((club) => <SelectItem key={club} value={club}>{club}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox id="completed-only" checked={completedOnly} onCheckedChange={(value) => setCompletedOnly(Boolean(value))} />
              <Label htmlFor="completed-only">Completed trials only</Label>
            </div>
            <Button onClick={exportExcel} disabled={loading || rows.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Export Excel
            </Button>
          </CardContent>
        </Card>

        {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
        {loading ? (
          <Card><CardContent className="py-16 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />Loading annual totals...</CardContent></Card>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-gray-500">No trials match the selected filters.</CardContent></Card>
        ) : (
          ['Activity', 'Results', 'Financials'].map((section) => (
            <div key={section} className="space-y-3">
              <h2 className="text-xl font-semibold">{section}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {metricDefinitions.filter((metric) => metric.section === section).map((metric) => (
                  <button key={metric.key} onClick={() => setExpandedMetric(expandedMetric === metric.key ? null : metric.key)} className="text-left">
                    <Card className={`h-full transition-colors hover:border-orange-400 ${expandedMetric === metric.key ? 'border-orange-500 ring-2 ring-orange-100' : ''}`}>
                      <CardContent className="pt-5">
                        <div className="flex justify-between gap-2">
                          <div>
                            <p className="text-sm text-gray-600">{metric.label}</p>
                            <p className="text-2xl font-bold mt-1">{formatMetric(totals[metric.key], metric.format)}</p>
                          </div>
                          {expandedMetric === metric.key ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{metric.description}</p>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}

        {expandedMetric && rows.length > 0 && (() => {
          const definition = metricDefinitions.find((metric) => metric.key === expandedMetric)!;
          return (
            <Card>
              <CardHeader><CardTitle>{definition.label} by Trial</CardTitle><CardDescription>{definition.description}</CardDescription></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50"><th className="p-3 text-left">Trial</th><th className="p-3 text-left">Club</th><th className="p-3 text-left">Date</th><th className="p-3 text-left">Status</th><th className="p-3 text-right">{definition.label}</th></tr></thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{row.trial_name}</td><td className="p-3">{row.club_name || '-'}</td><td className="p-3">{row.start_date}</td><td className="p-3 capitalize">{row.trial_status}</td><td className="p-3 text-right font-semibold">{formatMetric(Number(getTrialMetric(row, expandedMetric)), definition.format)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </MainLayout>
  );
}
