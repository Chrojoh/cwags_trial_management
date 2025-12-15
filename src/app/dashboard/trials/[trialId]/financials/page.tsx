'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DollarSign,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Loader2,
  CreditCard,
  Calculator,
  Ban,
  Download
} from 'lucide-react';
import { simpleTrialOperations } from '@/lib/trialOperationsSimple';
import { financialOperations, type TrialExpense, type CompetitorFinancial } from '@/lib/financialOperations';
import { breakEvenOperations, type BreakEvenConfig } from '@/lib/breakEvenOperations';

const EXPENSE_CATEGORIES = [
  'Hall Rental',
  'Judge Fees',
  'Ribbons',
  'Insurance',
  'Cleaning',
  'Food',
  'Theme Materials',
  'Fuel Reimbursement',
  'Other'
];

const PAYMENT_METHODS = [
  'Cash',
  'Check',
  'E-Transfer',
  'Credit Card',
  'Debit Card',
  'PayPal',
  'Venmo',
  'Other'
];

export default function TrialFinancialsPage() {
  const params = useParams();
  const router = useRouter();
  const trialId = params.trialId as string;

  const [trial, setTrial] = useState<any>(null);
  const [expenses, setExpenses] = useState<TrialExpense[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorFinancial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'expenses' | 'breakeven'>('expenses');
  
  // Break-even state
  const [breakEvenData, setBreakEvenData] = useState<BreakEvenConfig>({
    trial_id: trialId,
    hall_rental: 0,
    ribbons: 0,
    insurance: 0,
    other_fixed_costs: 0,
    regular_entry_fee: 25.00,
    regular_cwags_fee: 3.00,
    regular_judge_fee: 2.00,
    feo_entry_fee: 12.50,
    feo_judge_fee: 2.00
  });

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorFinancial | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReceivedBy, setPaymentReceivedBy] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');

  // Waive fees modal state
  const [showWaiveModal, setShowWaiveModal] = useState(false);
  const [waiveReason, setWaiveReason] = useState('');

  useEffect(() => {
    loadData();
  }, [trialId]);

  // Auto-populate break-even fixed costs when expenses change
  useEffect(() => {
    if (expenses.length > 0) {
      const hallRental = expenses.find(e => e.expense_category === 'Hall Rental')?.amount || 0;
      const ribbons = expenses.find(e => e.expense_category === 'Ribbons')?.amount || 0;
      const insurance = expenses.find(e => e.expense_category === 'Insurance')?.amount || 0;
      
      const otherExpenses = expenses
        .filter(e => !['Hall Rental', 'Ribbons', 'Insurance', 'Judge Fees'].includes(e.expense_category))
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      setBreakEvenData(prev => ({
        ...prev,
        hall_rental: hallRental,
        ribbons: ribbons,
        insurance: insurance,
        other_fixed_costs: otherExpenses
      }));
    }
  }, [expenses]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [trialResult, expensesResult, competitorsResult, breakEvenResult] = await Promise.all([
        simpleTrialOperations.getTrial(trialId),
        financialOperations.getTrialExpenses(trialId),
        financialOperations.getCompetitorFinancials(trialId),
        breakEvenOperations.getConfig(trialId)
      ]);

      if (!trialResult.success) throw new Error('Failed to load trial');
      if (!expensesResult.success) throw new Error('Failed to load expenses');
      if (!competitorsResult.success) throw new Error('Failed to load competitor data');

      setTrial(trialResult.data);
      setExpenses(expensesResult.data);
      setCompetitors(competitorsResult.data || []);

      // Load break-even config if exists
      if (breakEvenResult.success && breakEvenResult.data) {
        setBreakEvenData(breakEvenResult.data);
      }

      if (expensesResult.data.length === 0) {
        initializeDefaultExpenses();
      }

    } catch (err) {
      console.error('Error loading financial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultExpenses = () => {
    const defaultExpenses: TrialExpense[] = [
      { trial_id: trialId, expense_category: 'Hall Rental', amount: 0 },
      { trial_id: trialId, expense_category: 'Judge Fees', amount: 0, description: 'Judge 1' },
      { trial_id: trialId, expense_category: 'Ribbons', amount: 0 },
      { trial_id: trialId, expense_category: 'Insurance', amount: 0 },
      { trial_id: trialId, expense_category: 'Cleaning', amount: 0 },
      { trial_id: trialId, expense_category: 'Food', amount: 0 },
      { trial_id: trialId, expense_category: 'Theme Materials', amount: 0 },
      { trial_id: trialId, expense_category: 'Fuel Reimbursement', amount: 0 },
      { trial_id: trialId, expense_category: 'Other', amount: 0 },
      { trial_id: trialId, expense_category: 'Other', amount: 0 },
      { trial_id: trialId, expense_category: 'Other', amount: 0 }
    ];
    setExpenses(defaultExpenses);
  };

  const addExpenseRow = (category?: string) => {
    setExpenses([...expenses, {
      trial_id: trialId,
      expense_category: category || 'Other',
      amount: 0,
      description: category === 'Judge Fees' ? `Judge ${expenses.filter(e => e.expense_category === 'Judge Fees').length + 1}` : ''
    }]);
  };

  const updateExpense = (index: number, field: keyof TrialExpense, value: any) => {
    const updated = [...expenses];
    updated[index] = { ...updated[index], [field]: value };
    setExpenses(updated);
  };

  const deleteExpense = async (index: number) => {
    const expense = expenses[index];
    if (expense.id) {
      if (!confirm('Delete this expense?')) return;
      
      setSaving(true);
      const result = await financialOperations.deleteExpense(expense.id);
      setSaving(false);
      
      if (!result.success) {
        alert('Failed to delete expense');
        return;
      }
    }
    
    const updated = expenses.filter((_, i) => i !== index);
    setExpenses(updated);
  };

  const saveExpenses = async () => {
    try {
      setSaving(true);
      setError(null);

      for (const expense of expenses) {
        if (!expense.amount && !expense.description && !expense.paid_to) continue;
        
        const result = await financialOperations.saveExpense(expense);
        if (!result.success) {
          throw new Error(`Failed to save ${expense.expense_category}`);
        }
      }

      alert('Expenses saved successfully!');
      await loadData();

    } catch (err) {
      console.error('Error saving expenses:', err);
      setError(err instanceof Error ? err.message : 'Failed to save expenses');
    } finally {
      setSaving(false);
    }
  };

  const openPaymentModal = (competitor: CompetitorFinancial) => {
    setSelectedCompetitor(competitor);

    const effectiveOwed = competitor.fees_waived ? 0 : competitor.amount_owed;
    const remaining = effectiveOwed - competitor.amount_paid;

    setPaymentAmount(remaining > 0 ? remaining.toFixed(2) : '');
    setPaymentMethod('');
    setPaymentReceivedBy('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const recordPayment = async () => {
    if (selectedCompetitor?.fees_waived) {
      alert('Payments cannot be recorded for waived entries.');
      return;
    }

    if (!selectedCompetitor || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    try {
      setSaving(true);
      const result = await financialOperations.addPaymentTransaction({
        entry_id: selectedCompetitor.entry_id,
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        payment_received_by: paymentReceivedBy,
        payment_date: paymentDate,
        notes: paymentNotes
      });

      if (!result.success) throw new Error('Failed to record payment');

      alert('Payment recorded successfully!');
      setShowPaymentModal(false);
      await loadData();

    } catch (err) {
      console.error('Error recording payment:', err);
      alert('Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const openWaiveModal = (competitor: CompetitorFinancial) => {
    setSelectedCompetitor(competitor);
    setWaiveReason(competitor.waiver_reason || '');
    setShowWaiveModal(true);
  };

  const waiveFees = async () => {
  if (!selectedCompetitor || !waiveReason.trim()) {
    alert('Please provide a reason for waiving fees');
    return;
  }

  try {
    setSaving(true);
    // Use entry_ids (plural) to waive ALL entries for this owner
    const entryIds = selectedCompetitor.entry_ids || [selectedCompetitor.entry_id];
    const result = await financialOperations.waiveFees(entryIds, waiveReason);
      if (!result.success) throw new Error('Failed to waive fees');

      alert('Fees waived successfully!');
      setShowWaiveModal(false);
      await loadData();

    } catch (err) {
      console.error('Error waiving fees:', err);
      alert('Failed to waive fees');
    } finally {
      setSaving(false);
    }
  };

  const unwaiveFees = async (entryId: string) => {
  if (!confirm('Remove fee waiver and restore original fees?')) return;

  try {
    setSaving(true);
    // Find the competitor to get ALL their entry IDs
    const competitor = competitors.find(c => c.entry_id === entryId);
    const entryIds = competitor?.entry_ids || [entryId];
    const result = await financialOperations.unwaiveFees(entryIds);
      
      if (!result.success) throw new Error('Failed to unwaive fees');

      alert('Fee waiver removed!');
      await loadData();

    } catch (err) {
      console.error('Error unwaiving fees:', err);
      alert('Failed to unwaive fees');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBreakEven = async () => {
    setSaving(true);
    try {
      const result = await breakEvenOperations.saveConfig(breakEvenData);
      if (result.success) {
        alert('Break-even analysis saved!');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      alert('Failed to save break-even analysis');
    } finally {
      setSaving(false);
    }
  };

  const updateBreakEvenField = (field: keyof BreakEvenConfig, value: string) => {
    const numValue = parseFloat(value) || 0;
    setBreakEvenData(prev => ({ ...prev, [field]: numValue }));
  };

  const calculateTotals = () => {
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalOwed = competitors.reduce((sum, comp) => {
      if (comp.fees_waived) return sum;
      return sum + comp.amount_owed;
    }, 0);

    const totalPaid = competitors.reduce((sum, comp) => {
      if (comp.fees_waived) return sum;
      return sum + comp.amount_paid;
    }, 0);

    const totalOutstanding = totalOwed - totalPaid;
    const netIncome = totalPaid - totalExpenses;

    return { totalExpenses, totalOwed, totalPaid, totalOutstanding, netIncome };
  };

  const totals = calculateTotals();

  // UPDATED BREAK-EVEN CALCULATIONS WITH WAIVED RUNS
  // Separate PAID runs from WAIVED runs
  const paidRegularRuns = competitors.reduce((sum: number, comp: any) => sum + (comp.regular_runs || 0), 0);
  const paidFeoRuns = competitors.reduce((sum: number, comp: any) => sum + (comp.feo_runs || 0), 0);
  const waivedRegularRuns = competitors.reduce((sum: number, comp: any) => sum + (comp.waived_regular_runs || 0), 0);
  const waivedFeoRuns = competitors.reduce((sum: number, comp: any) => sum + (comp.waived_feo_runs || 0), 0);
  
  const totalFixedCosts = breakEvenData.hall_rental + breakEvenData.ribbons + breakEvenData.insurance + breakEvenData.other_fixed_costs;
  
  // Net per PAID run (revenue after costs)
  const regularNetPerRun = breakEvenData.regular_entry_fee - breakEvenData.regular_cwags_fee - breakEvenData.regular_judge_fee;
  const feoNetPerRun = breakEvenData.feo_entry_fee - breakEvenData.feo_judge_fee;
  
  // Revenue from PAID runs
  const paidRegularRevenue = paidRegularRuns * regularNetPerRun;
  const paidFeoRevenue = paidFeoRuns * feoNetPerRun;
  
  // COST per WAIVED run (we pay fees but get no income)
  const waivedRegularCostPerRun = breakEvenData.regular_cwags_fee + breakEvenData.regular_judge_fee;
  const waivedFeoCostPerRun = breakEvenData.feo_judge_fee; // No CWAGS fee for FEO
  
  // Total COSTS from waived runs
  const waivedRegularCosts = waivedRegularRuns * waivedRegularCostPerRun;
  const waivedFeoCosts = waivedFeoRuns * waivedFeoCostPerRun;
  const totalWaivedCosts = waivedRegularCosts + waivedFeoCosts;
  
  // Total revenue and costs
  const totalNetRevenue = paidRegularRevenue + paidFeoRevenue;
  const totalAllCosts = totalFixedCosts + totalWaivedCosts;
  const currentNetIncome = totalNetRevenue - totalAllCosts;
  
  // Total runs
  const totalPaidRuns = paidRegularRuns + paidFeoRuns;
  const totalWaivedRuns = waivedRegularRuns + waivedFeoRuns;
  const totalRuns = totalPaidRuns + totalWaivedRuns;
  
  // For break-even, we need to cover: fixed costs + waived run costs
  // Using only PAID runs (waived runs only add cost, not revenue)
  const weightedAvgNetPerRun = totalPaidRuns > 0 
    ? (paidRegularRevenue + paidFeoRevenue) / totalPaidRuns 
    : regularNetPerRun;
  
  const breakEvenRuns = weightedAvgNetPerRun > 0 
    ? Math.ceil(totalAllCosts / weightedAvgNetPerRun)
    : 0;
  
  const paidRunsNeeded = breakEvenRuns - totalPaidRuns;
  const isProfitable = currentNetIncome >= 0;

  // Export function with waived runs
  const exportBreakEvenAnalysis = () => {
    const analysis = `
BREAK-EVEN ANALYSIS REPORT
Trial: ${trial?.trial_name || 'Unknown Trial'}
Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}

═══════════════════════════════════════════════════════════

FIXED COSTS
───────────────────────────────────────────────────────────
Hall Rental:          $${breakEvenData.hall_rental.toFixed(2)}
Ribbons:              $${breakEvenData.ribbons.toFixed(2)}
Insurance:            $${breakEvenData.insurance.toFixed(2)}
Other Fixed Costs:    $${breakEvenData.other_fixed_costs.toFixed(2)}
───────────────────────────────────────────────────────────
TOTAL FIXED COSTS:    $${totalFixedCosts.toFixed(2)}

═══════════════════════════════════════════════════════════

PER-RUN RATES
───────────────────────────────────────────────────────────
REGULAR RUNS (PAID):
  Entry Fee:          $${breakEvenData.regular_entry_fee.toFixed(2)}
  CWAGS Fee:         -$${breakEvenData.regular_cwags_fee.toFixed(2)}
  Judge Fee:         -$${breakEvenData.regular_judge_fee.toFixed(2)}
  ─────────────────────────────────────
  NET PER RUN:        $${regularNetPerRun.toFixed(2)}

FEO RUNS (PAID):
  Entry Fee:          $${breakEvenData.feo_entry_fee.toFixed(2)}
  CWAGS Fee:         -$0.00 (No fee for FEO)
  Judge Fee:         -$${breakEvenData.feo_judge_fee.toFixed(2)}
  ─────────────────────────────────────
  NET PER RUN:        $${feoNetPerRun.toFixed(2)}

WAIVED RUNS (COSTS ONLY - NO REVENUE):
  Regular Waived:    -$${waivedRegularCostPerRun.toFixed(2)} per run
  FEO Waived:        -$${waivedFeoCostPerRun.toFixed(2)} per run

═══════════════════════════════════════════════════════════

CURRENT STATUS
───────────────────────────────────────────────────────────
PAID RUNS:
  Regular Runs:       ${paidRegularRuns} runs
  FEO Runs:           ${paidFeoRuns} runs
  ─────────────────────────────────────
  Total Paid Runs:    ${totalPaidRuns} runs

WAIVED RUNS:
  Regular Waived:     ${waivedRegularRuns} runs
  FEO Waived:         ${waivedFeoRuns} runs
  ─────────────────────────────────────
  Total Waived Runs:  ${totalWaivedRuns} runs

TOTAL ALL RUNS:       ${totalRuns} runs

═══════════════════════════════════════════════════════════

REVENUE & COST ANALYSIS
───────────────────────────────────────────────────────────
REVENUE (from paid runs):
  Regular Revenue:    $${paidRegularRevenue.toFixed(2)}
  FEO Revenue:        $${paidFeoRevenue.toFixed(2)}
  ─────────────────────────────────────
  Total Revenue:      $${totalNetRevenue.toFixed(2)}

COSTS:
  Fixed Costs:       -$${totalFixedCosts.toFixed(2)}
  Waived Run Costs:  -$${totalWaivedCosts.toFixed(2)}
    (${waivedRegularRuns} reg @ $${waivedRegularCostPerRun.toFixed(2)} + ${waivedFeoRuns} feo @ $${waivedFeoCostPerRun.toFixed(2)})
  ─────────────────────────────────────
  Total Costs:       -$${totalAllCosts.toFixed(2)}

───────────────────────────────────────────────────────────
NET INCOME:           $${currentNetIncome.toFixed(2)}

═══════════════════════════════════════════════════════════

BREAK-EVEN CALCULATION
───────────────────────────────────────────────────────────
Costs to Cover:       $${totalAllCosts.toFixed(2)}
Avg Net per Paid Run: $${weightedAvgNetPerRun.toFixed(2)}
Paid Runs Needed:     ${breakEvenRuns} runs
Current Paid Runs:    ${totalPaidRuns} runs
───────────────────────────────────────────────────────────
STATUS:               ${isProfitable 
  ? `✓ PROFITABLE - $${Math.abs(currentNetIncome).toFixed(2)} above break-even`
  : `⚠ Need ${paidRunsNeeded} more PAID runs - $${Math.abs(currentNetIncome).toFixed(2)} short`
}

Progress:             ${Math.min(100, Math.round((totalPaidRuns / breakEvenRuns) * 100))}%

═══════════════════════════════════════════════════════════
End of Report
    `.trim();

    const blob = new Blob([analysis], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `break-even-analysis-${trial?.trial_name?.replace(/\s+/g, '-') || 'trial'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <MainLayout title="Trial Financials">
        <div className="flex items-center justify-center min-h-64">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      </MainLayout>
    );
  }

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Trials', href: '/dashboard/trials' },
    { label: trial?.trial_name || 'Trial', href: `/dashboard/trials/${trialId}` },
    { label: 'Financials' }
  ];

  return (
    <MainLayout title="Trial Financials" breadcrumbItems={breadcrumbItems}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Summary</h1>
            <p className="text-gray-600 mt-1">{trial?.trial_name}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/trials/${trialId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trial
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* TABS */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'expenses'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Expenses & Payments
            </button>
            <button
              onClick={() => setActiveTab('breakeven')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'breakeven'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Break-Even Analysis
            </button>
          </nav>
        </div>

        {/* TAB CONTENT */}
        {activeTab === 'expenses' ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-600">Total Expenses</div>
                  <div className="text-2xl font-bold text-red-600">
                    ${totals.totalExpenses.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-600">Entry Fees Owed</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${totals.totalOwed.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-600">Fees Collected</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${totals.totalPaid.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-600">Outstanding</div>
                  <div className={`text-2xl font-bold ${totals.totalOutstanding > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                    ${totals.totalOutstanding.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card className={totals.netIncome >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}>
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-600 flex items-center">
                    {totals.netIncome >= 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1 text-red-600" />
                    )}
                    Net Income
                  </div>
                  <div className={`text-2xl font-bold ${totals.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ${totals.netIncome.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Expenses Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-orange-600" />
                      <span>Trial Expenses</span>
                    </CardTitle>
                    <CardDescription>Track all expenses including judge fees</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addExpenseRow('Judge Fees')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Judge
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addExpenseRow()}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Row
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveExpenses}
                      disabled={saving}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save All'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {expenses.map((expense, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <Select
                          value={expense.expense_category}
                          onValueChange={(value) => updateExpense(index, 'expense_category', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPENSE_CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Input
                          placeholder="Description"
                          value={expense.description || ''}
                          onChange={(e) => updateExpense(index, 'description', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Amount"
                          value={expense.amount || ''}
                          onChange={(e) => updateExpense(index, 'amount', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          placeholder="Paid To"
                          value={expense.paid_to || ''}
                          onChange={(e) => updateExpense(index, 'paid_to', e.target.value)}
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteExpense(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Competitor Payments - keeping existing table */}
            <Card>
              <CardHeader>
                <CardTitle>Entry Payments</CardTitle>
                <CardDescription>Track payments from competitors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-100">
                        <th className="text-left p-2 text-sm font-semibold">Handler / Dog</th>
                        <th className="text-center p-2 text-sm font-semibold w-24">Regular</th>
                        <th className="text-center p-2 text-sm font-semibold w-24">FEO</th>
                        <th className="text-left p-2 text-sm font-semibold w-48">Description</th>
                        <th className="text-left p-2 text-sm font-semibold w-32">Method</th>
                        <th className="text-left p-2 text-sm font-semibold w-32">Received By</th>
                        <th className="text-left p-2 text-sm font-semibold w-32">Date</th>
                        <th className="text-right p-2 text-sm font-semibold w-32">Amount</th>
                        <th className="text-right p-2 text-sm font-semibold w-32">Balance</th>
                        <th className="text-center p-2 text-sm font-semibold w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {competitors.map((comp, compIndex) => {
                        const payments = comp.payment_history || [];
                        const hasPayments = payments.length > 0;
                        const effectiveOwed = comp.fees_waived ? 0 : comp.amount_owed;
                        const balance = effectiveOwed - comp.amount_paid;

                        return (
                          <React.Fragment key={compIndex}>
                            <tr className={`border-b ${compIndex % 2 === 0 ? 'bg-orange-50' : 'bg-white'}`}>
                              <td className="p-2 font-semibold" rowSpan={hasPayments ? payments.length + 2 : 2}>
                                <div className="font-bold">{comp.handler_name}</div>
                                <div className="text-sm text-gray-600">{comp.dog_call_name}</div>
                                <div className="text-xs text-gray-500 font-mono">{comp.cwags_number}</div>
                                {comp.fees_waived && (
                                  <Badge variant="outline" className="mt-1 bg-purple-50 text-purple-700 text-xs">
                                    Waived: {comp.waiver_reason}
                                  </Badge>
                                )}
                              </td>
                              <td className="p-2 text-center" rowSpan={hasPayments ? payments.length + 2 : 2}>
                                {comp.regular_runs || comp.waived_regular_runs || 0}
                              </td>
                              <td className="p-2 text-center" rowSpan={hasPayments ? payments.length + 2 : 2}>
                                {comp.feo_runs || comp.waived_feo_runs || 0}
                              </td>
                              <td className="p-2">
                                <span className="font-semibold text-gray-700">Total Entry Fees</span>
                              </td>
                              <td className="p-2 text-gray-400">-</td>
                              <td className="p-2 text-gray-400">-</td>
                              <td className="p-2 text-gray-400">-</td>
                              <td className="p-2 text-right font-mono font-semibold">
                                ${effectiveOwed.toFixed(2)}
                              </td>
                              <td className="p-2 text-right font-mono font-semibold">
                                ${effectiveOwed.toFixed(2)}
                              </td>
                              <td className="p-2" rowSpan={hasPayments ? payments.length + 2 : 2}>
                                <div className="flex flex-col space-y-1">
                                  {!comp.fees_waived && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openPaymentModal(comp)}
                                      disabled={effectiveOwed <= 0}
                                      className="w-full"
                                    >
                                      <CreditCard className="h-3 w-3 mr-1" />
                                      Pay
                                    </Button>
                                  )}
                                  {comp.fees_waived ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => unwaiveFees(comp.entry_id)}
                                      className="w-full"
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Unwaive
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openWaiveModal(comp)}
                                      className="w-full"
                                    >
                                      <Ban className="h-3 w-3 mr-1" />
                                      Waive
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {payments.map((payment, paymentIndex) => {
                              const remainingAfterThisPayment = effectiveOwed - payments
                                .slice(0, paymentIndex + 1)
                                .reduce((sum, p) => sum + p.amount, 0);

                              return (
                                <tr 
                                  key={`payment-${paymentIndex}`} 
                                  className={`border-b ${compIndex % 2 === 0 ? 'bg-orange-50' : 'bg-white'}`}
                                >
                                  <td className="p-2 text-sm text-gray-600">{payment.notes || 'Payment'}</td>
                                  <td className="p-2 text-sm">{payment.payment_method}</td>
                                  <td className="p-2 text-sm">{payment.payment_received_by || '-'}</td>
                                  <td className="p-2 text-sm">
                                    {new Date(payment.payment_date || '').toLocaleDateString()}
                                  </td>
                                  <td className="p-2 text-right font-mono text-green-600">
                                    ${payment.amount.toFixed(2)}
                                  </td>
                                  <td className="p-2 text-right font-mono">
                                    ${remainingAfterThisPayment.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}

                            <tr className={`border-b font-semibold ${compIndex % 2 === 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                              <td className="p-2 font-bold">Current Balance</td>
                              <td className="p-2 text-gray-400">-</td>
                              <td className="p-2 text-gray-400">-</td>
                              <td className="p-2 text-gray-400">-</td>
                              <td className="p-2 text-gray-400"></td>
                              <td className={`p-2 text-right font-mono font-bold text-lg ${
                                balance > 0 ? 'text-red-600' : balance < 0 ? 'text-orange-600' : 'text-green-600'
                              }`}>
                                ${balance.toFixed(2)}
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-200 font-bold border-t-2">
                        <td className="p-3" colSpan={7}>Grand Totals</td>
                        <td className="p-3 text-right">${totals.totalOwed.toFixed(2)}</td>
                        <td className="p-3 text-right text-lg">${totals.totalOutstanding.toFixed(2)}</td>
                        <td></td>
                      </tr>
                      <tr className="bg-gray-100 font-semibold">
                        <td className="p-2" colSpan={7}>Total Collected</td>
                        <td className="p-2 text-right text-green-600">${totals.totalPaid.toFixed(2)}</td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          /* BREAK-EVEN TAB WITH WAIVED RUNS */
          <div className="space-y-6">
            {/* Header with Export Button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Break-Even Analysis</h2>
                <p className="text-gray-600 mt-1">Calculate how many entries needed to cover costs</p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={exportBreakEvenAnalysis}
                  className="border-orange-600 text-orange-600 hover:bg-orange-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Analysis
                </Button>
                <Button
                  onClick={handleSaveBreakEven}
                  disabled={saving}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Analysis'}
                </Button>
              </div>
            </div>

            {/* Status Alert */}
            {totalPaidRuns > 0 && (
              <Alert className={isProfitable ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50'}>
                {isProfitable ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                )}
                <AlertDescription className={isProfitable ? 'text-green-800' : 'text-orange-800'}>
                  {isProfitable ? (
                    <span className="font-semibold">
                      ✓ Profitable! You're ${Math.abs(currentNetIncome).toFixed(2)} above break-even
                    </span>
                  ) : (
                    <span className="font-semibold">
                      Need {paidRunsNeeded} more PAID run{paidRunsNeeded !== 1 ? 's' : ''} to break even (${Math.abs(currentNetIncome).toFixed(2)} short)
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Waived Runs Warning */}
            {totalWaivedRuns > 0 && (
              <Alert className="border-purple-300 bg-purple-50">
                <AlertCircle className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-800">
                  <span className="font-semibold">
                    Note: You have {totalWaivedRuns} waived run{totalWaivedRuns !== 1 ? 's' : ''} costing $-{totalWaivedCosts.toFixed(2)} 
                    ({waivedRegularRuns} regular @ ${waivedRegularCostPerRun.toFixed(2)}/run, {waivedFeoRuns} FEO @ ${waivedFeoCostPerRun.toFixed(2)}/run)
                  </span>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fixed Costs Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="h-5 w-5 mr-2 text-red-600" />
                    Fixed Costs
                  </CardTitle>
                  <CardDescription>One-time expenses (auto-filled from expenses)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Hall Rental</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={breakEvenData.hall_rental}
                        onChange={(e) => updateBreakEvenField('hall_rental', e.target.value)}
                        className="pl-7"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Ribbons</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={breakEvenData.ribbons}
                        onChange={(e) => updateBreakEvenField('ribbons', e.target.value)}
                        className="pl-7"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Insurance</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={breakEvenData.insurance}
                        onChange={(e) => updateBreakEvenField('insurance', e.target.value)}
                        className="pl-7"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Other Fixed Costs</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={breakEvenData.other_fixed_costs}
                        onChange={(e) => updateBreakEvenField('other_fixed_costs', e.target.value)}
                        className="pl-7"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Cleaning, Food, Theme Materials, etc.</p>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Total Fixed Costs:</span>
                      <span className="text-xl font-bold text-red-600">
                        ${totalFixedCosts.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Per-Run Rates Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="h-5 w-5 mr-2 text-blue-600" />
                    Per-Run Rates
                  </CardTitle>
                  <CardDescription>Configure rates for this trial</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Regular Runs */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 border-b pb-2">Regular Runs (Paid)</h3>
                    
                    <div>
                      <Label>Entry Fee</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={breakEvenData.regular_entry_fee}
                          onChange={(e) => updateBreakEvenField('regular_entry_fee', e.target.value)}
                          className="pl-7"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>CWAGS Fee per Run</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={breakEvenData.regular_cwags_fee}
                          onChange={(e) => updateBreakEvenField('regular_cwags_fee', e.target.value)}
                          className="pl-7"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Judge Fee per Run</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={breakEvenData.regular_judge_fee}
                          onChange={(e) => updateBreakEvenField('regular_judge_fee', e.target.value)}
                          className="pl-7"
                        />
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Net per Paid Run:</span>
                        <span className="font-bold text-green-700">
                          ${regularNetPerRun.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Cost per Waived Run:</span>
                        <span className="font-bold text-red-700">
                          -${waivedRegularCostPerRun.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* FEO Runs */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 border-b pb-2">FEO Runs (Paid)</h3>
                    
                    <div>
                      <Label>Entry Fee</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={breakEvenData.feo_entry_fee}
                          onChange={(e) => updateBreakEvenField('feo_entry_fee', e.target.value)}
                          className="pl-7"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>CWAGS Fee per Run</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <Input
                          type="number"
                          value="0.00"
                          disabled
                          className="pl-7 bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">No CWAGS fee for FEO runs</p>
                    </div>

                    <div>
                      <Label>Judge Fee per Run</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={breakEvenData.feo_judge_fee}
                          onChange={(e) => updateBreakEvenField('feo_judge_fee', e.target.value)}
                          className="pl-7"
                        />
                      </div>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Net per Paid Run:</span>
                        <span className="font-bold text-purple-700">
                          ${feoNetPerRun.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Cost per Waived Run:</span>
                        <span className="font-bold text-red-700">
                          -${waivedFeoCostPerRun.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Break-Even Summary */}
            <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center">
                  <TrendingUp className="h-6 w-6 mr-2 text-orange-600" />
                  Break-Even Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Current Runs */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-700 border-b pb-2">Current Runs</h3>
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-gray-500 uppercase">Paid Runs</div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Regular:</span>
                        <span className="font-semibold">{paidRegularRuns}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">FEO:</span>
                        <span className="font-semibold">{paidFeoRuns}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t">
                        <span className="text-sm font-semibold text-gray-700">Subtotal:</span>
                        <span className="font-bold">{totalPaidRuns}</span>
                      </div>
                      
                      {totalWaivedRuns > 0 && (
                        <>
                          <div className="text-xs font-semibold text-purple-600 uppercase mt-3">Waived Runs</div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Regular:</span>
                            <span className="font-semibold text-purple-700">{waivedRegularRuns}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">FEO:</span>
                            <span className="font-semibold text-purple-700">{waivedFeoRuns}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t">
                            <span className="text-sm font-semibold text-gray-700">Subtotal:</span>
                            <span className="font-bold text-purple-700">{totalWaivedRuns}</span>
                          </div>
                        </>
                      )}
                      
                      <div className="flex justify-between pt-2 border-t-2 border-gray-400">
                        <span className="text-sm font-bold text-gray-900">Total Runs:</span>
                        <span className="font-bold text-lg">{totalRuns}</span>
                      </div>
                    </div>
                  </div>

                  {/* Revenue from Paid */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-700 border-b pb-2">Revenue (Paid)</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Regular:</span>
                        <span className="font-semibold text-green-700">${paidRegularRevenue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">FEO:</span>
                        <span className="font-semibold text-purple-700">${paidFeoRevenue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-sm font-semibold text-gray-700">Total Revenue:</span>
                        <span className="font-bold text-lg text-green-700">${totalNetRevenue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Costs */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-700 border-b pb-2">Costs</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Fixed Costs:</span>
                        <span className="font-semibold text-red-700">-${totalFixedCosts.toFixed(2)}</span>
                      </div>
                      {totalWaivedRuns > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Waived Costs:</span>
                          <span className="font-semibold text-red-700">-${totalWaivedCosts.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-sm font-semibold text-gray-700">Total Costs:</span>
                        <span className="font-bold text-lg text-red-700">-${totalAllCosts.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t-2 border-gray-400">
                        <span className="text-sm font-bold text-gray-900">Net Income:</span>
                        <span className={`font-bold text-lg ${currentNetIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          ${currentNetIncome.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Break-Even Target */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-700 border-b pb-2">Break-Even</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Avg Net/Run:</span>
                        <span className="font-semibold">${weightedAvgNetPerRun.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Runs Needed:</span>
                        <span className="font-semibold">{breakEvenRuns}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Current Paid:</span>
                        <span className="font-semibold">{totalPaidRuns}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-sm font-semibold text-gray-700">Status:</span>
                        <span className={`font-bold text-lg ${isProfitable ? 'text-green-700' : 'text-orange-700'}`}>
                          {isProfitable ? '✓ Profit' : `Need ${paidRunsNeeded}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                {totalPaidRuns > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Progress to Break-Even (Paid Runs Only)</span>
                      <span className="text-sm text-gray-600">
                        {totalPaidRuns} / {breakEvenRuns} runs ({Math.min(100, Math.round((totalPaidRuns / breakEvenRuns) * 100))}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          isProfitable ? 'bg-green-600' : 'bg-orange-600'
                        }`}
                        style={{ width: `${Math.min(100, (totalPaidRuns / breakEvenRuns) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payment Modal - keep existing */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                {selectedCompetitor?.handler_name} - {selectedCompetitor?.dog_call_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCompetitor?.payment_history && selectedCompetitor.payment_history.length > 0 && (
                <div className="bg-gray-50 p-3 rounded border">
                  <div className="text-sm font-semibold mb-2">Payment History:</div>
                  {selectedCompetitor.payment_history.map((payment, idx) => (
                    <div key={idx} className="text-xs text-gray-600 mb-1">
                      ${payment.amount.toFixed(2)} - {payment.payment_method} - {new Date(payment.payment_date || '').toLocaleDateString()}
                      {payment.payment_received_by && ` (by ${payment.payment_received_by})`}
                    </div>
                  ))}
                </div>
              )}
              
              <div>
                <Label>Amount Owed: ${selectedCompetitor?.fees_waived ? '0.00' : (selectedCompetitor?.amount_owed || 0).toFixed(2)}</Label>
                <Label>Already Paid: ${(selectedCompetitor?.amount_paid || 0).toFixed(2)}</Label>
                <Label>Remaining: ${((selectedCompetitor?.fees_waived ? 0 : (selectedCompetitor?.amount_owed || 0)) - (selectedCompetitor?.amount_paid || 0)).toFixed(2)}</Label>
              </div>

              <div>
                <Label>Payment Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(method => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Received By</Label>
                <Input
                  value={paymentReceivedBy}
                  onChange={(e) => setPaymentReceivedBy(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div>
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Optional notes"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </Button>
                <Button onClick={recordPayment} disabled={saving}>
                  {saving ? 'Saving...' : 'Record Payment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Waive Fees Modal - keep existing */}
        <Dialog open={showWaiveModal} onOpenChange={setShowWaiveModal}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Waive Entry Fees</DialogTitle>
              <DialogDescription>
                {selectedCompetitor?.handler_name} - {selectedCompetitor?.dog_call_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will set the amount owed to $0. Common reasons: volunteering, working for entries, club member discount.
                </AlertDescription>
              </Alert>

              <div>
                <Label>Reason for Waiving Fees *</Label>
                <Textarea
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  placeholder="e.g., Working trial for entries, Club volunteer, etc."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowWaiveModal(false)}>
                  Cancel
                </Button>
                <Button onClick={waiveFees} disabled={saving}>
                  {saving ? 'Saving...' : 'Waive Fees'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}