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
  Download,
  Edit2,
  RefreshCcw
} from 'lucide-react';
import { simpleTrialOperations } from '@/lib/trialOperationsSimple';
import { financialOperations, type TrialExpense, type CompetitorFinancial } from '@/lib/financialOperations';
import { breakEvenOperations, type BreakEvenConfig } from '@/lib/breakEvenOperations';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

const supabase = getSupabaseBrowser();

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

  // Edit payment modal states
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editPaymentReceivedBy, setEditPaymentReceivedBy] = useState('');
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [editPaymentNotes, setEditPaymentNotes] = useState('');

  // Refund modal states
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState('');
  const [refundIssuedBy, setRefundIssuedBy] = useState('');
  const [refundDate, setRefundDate] = useState(new Date().toISOString().split('T')[0]);
  const [refundNotes, setRefundNotes] = useState('');

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
  const remaining = competitor.fees_waived ? 0 : (competitor.amount_owed - competitor.amount_paid);

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

  const openEditPaymentModal = (payment: any, competitor: CompetitorFinancial) => {
    setEditingPayment(payment);
    setSelectedCompetitor(competitor);
    setEditPaymentAmount(payment.amount.toString());
    setEditPaymentMethod(payment.payment_method || '');
    setEditPaymentReceivedBy(payment.payment_received_by || '');
    setEditPaymentDate(payment.payment_date || new Date().toISOString().split('T')[0]);
    setEditPaymentNotes(payment.notes || '');
    setShowEditPaymentModal(true);
  };

  const updatePayment = async () => {
    if (!editingPayment || !editPaymentAmount || parseFloat(editPaymentAmount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    try {
      setSaving(true);
      
      // Update the payment transaction
      const { error: updateError } = await supabase
        .from('entry_payment_transactions')
        .update({
          amount: parseFloat(editPaymentAmount),
          payment_method: editPaymentMethod,
          payment_received_by: editPaymentReceivedBy,
          payment_date: editPaymentDate,
          notes: editPaymentNotes
        })
        .eq('id', editingPayment.id);

      if (updateError) throw updateError;

      // Recalculate total paid for the entry
      const { data: payments } = await supabase
        .from('entry_payment_transactions')
        .select('amount')
        .eq('entry_id', editingPayment.entry_id);

      const totalPaid = (payments || []).reduce((sum: any, p: any) => sum + p.amount, 0);

      await supabase
        .from('entries')
        .update({ amount_paid: totalPaid })
        .eq('id', editingPayment.entry_id);

      alert('Payment updated successfully!');
      setShowEditPaymentModal(false);
      setEditingPayment(null);
      await loadData();

    } catch (err) {
      console.error('Error updating payment:', err);
      alert('Failed to update payment');
    } finally {
      setSaving(false);
    }
  };

  const openRefundModal = (competitor: CompetitorFinancial) => {
    setSelectedCompetitor(competitor);
    
    // Calculate overpayment amount (negative balance means overpaid)
    const balance = competitor.fees_waived ? 0 : (competitor.amount_owed - competitor.amount_paid);
    const overpayment = balance < 0 ? Math.abs(balance) : 0;

    setRefundAmount(overpayment > 0 ? overpayment.toFixed(2) : '');
    setRefundMethod('');
    setRefundIssuedBy('');
    setRefundDate(new Date().toISOString().split('T')[0]);
    setRefundNotes('');
    setShowRefundModal(true);
  };

  const processRefund = async () => {
    if (!selectedCompetitor || !refundAmount || parseFloat(refundAmount) <= 0) {
      alert('Please enter a valid refund amount');
      return;
    }

    if (!refundMethod) {
      alert('Please select a refund method');
      return;
    }

    try {
      setSaving(true);
      
      // Create a negative payment transaction to represent the refund
      const result = await financialOperations.addPaymentTransaction({
        entry_id: selectedCompetitor.entry_id,
        amount: -parseFloat(refundAmount), // Negative amount for refund
        payment_method: refundMethod,
        payment_received_by: refundIssuedBy,
        payment_date: refundDate,
        notes: `REFUND: ${refundNotes || 'Overpayment refund'}`
      });

      if (!result.success) throw new Error('Failed to process refund');

      alert('Refund processed successfully!');
      setShowRefundModal(false);
      await loadData();

    } catch (err) {
      console.error('Error processing refund:', err);
      alert('Failed to process refund');
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
      const result = await financialOperations.unwaiveFees(entryId);
      
      if (!result.success) throw new Error('Failed to unwaive fees');

      alert('Fee waiver removed successfully!');
      await loadData();

    } catch (err) {
      console.error('Error unwaiving fees:', err);
      alert('Failed to unwaive fees');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBreakEven = async () => {
    try {
      setSaving(true);
      setError(null);

      const result = await breakEvenOperations.saveConfig(breakEvenData);
      if (!result.success) throw new Error('Failed to save break-even configuration');

      alert('Break-even analysis saved successfully!');

    } catch (err) {
      console.error('Error saving break-even:', err);
      setError(err instanceof Error ? err.message : 'Failed to save break-even analysis');
    } finally {
      setSaving(false);
    }
  };

  const exportBreakEvenAnalysis = () => {
    // Calculate totals
    const totalFixedCosts = 
      breakEvenData.hall_rental + 
      breakEvenData.ribbons + 
      breakEvenData.insurance + 
      breakEvenData.other_fixed_costs;

    const regularNetPerRun = 
      breakEvenData.regular_entry_fee - 
      breakEvenData.regular_cwags_fee - 
      breakEvenData.regular_judge_fee;

    const feoNetPerRun = 
      breakEvenData.feo_entry_fee - 
      breakEvenData.feo_judge_fee;

    // Calculate current status
    const totalPaidRuns = competitors.reduce((sum, c) => sum + (c.regular_runs || 0), 0);
    const totalFeoRuns = competitors.reduce((sum, c) => sum + (c.feo_runs || 0), 0);
    const totalWaivedRegular = competitors.reduce((sum, c) => sum + (c.waived_regular_runs || 0), 0);
    const totalWaivedFeo = competitors.reduce((sum, c) => sum + (c.waived_feo_runs || 0), 0);

    const currentRevenue = (totalPaidRuns * regularNetPerRun) + (totalFeoRuns * feoNetPerRun);
    const currentNetIncome = currentRevenue - totalFixedCosts;

    const breakEvenRuns = regularNetPerRun > 0 ? Math.ceil(totalFixedCosts / regularNetPerRun) : 0;
    const paidRunsNeeded = Math.max(0, breakEvenRuns - totalPaidRuns);

    const analysis = `
═══════════════════════════════════════════════════════════
                 BREAK-EVEN ANALYSIS REPORT
                   ${trial?.trial_name || 'Trial'}
           Generated: ${new Date().toLocaleString()}
═══════════════════════════════════════════════════════════

FIXED COSTS
───────────────────────────────────────────────────────────
Hall Rental:          $${breakEvenData.hall_rental.toFixed(2)}
Ribbons:              $${breakEvenData.ribbons.toFixed(2)}
Insurance:            $${breakEvenData.insurance.toFixed(2)}
Other Fixed Costs:    $${breakEvenData.other_fixed_costs.toFixed(2)}
───────────────────────────────────────────────────────────
TOTAL FIXED COSTS:    $${totalFixedCosts.toFixed(2)}

ENTRY FEE STRUCTURE
───────────────────────────────────────────────────────────
Regular Entry Fee:    $${breakEvenData.regular_entry_fee.toFixed(2)}
  - C-WAGS Fee:       $${breakEvenData.regular_cwags_fee.toFixed(2)}
  - Judge Fee:        $${breakEvenData.regular_judge_fee.toFixed(2)}
  NET PER RUN:        $${regularNetPerRun.toFixed(2)}

FEO Entry Fee:        $${breakEvenData.feo_entry_fee.toFixed(2)}
  - Judge Fee:        $${breakEvenData.feo_judge_fee.toFixed(2)}
  NET PER RUN:        $${feoNetPerRun.toFixed(2)}

BREAK-EVEN CALCULATION
───────────────────────────────────────────────────────────
Runs needed:          ${breakEvenRuns} regular paid runs
At $${regularNetPerRun.toFixed(2)}/run to cover $${totalFixedCosts.toFixed(2)} in costs

CURRENT STATUS
───────────────────────────────────────────────────────────
Paid Regular Runs:    ${totalPaidRuns}
Paid FEO Runs:        ${totalFeoRuns}
Waived Regular Runs:  ${totalWaivedRegular}
Waived FEO Runs:      ${totalWaivedFeo}

Revenue Generated:    $${currentRevenue.toFixed(2)}
Net Income:           $${currentNetIncome.toFixed(2)}

ANALYSIS
───────────────────────────────────────────────────────────
${currentNetIncome >= 0 
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

  // Calculate totals
  const totals = {
    totalExpenses: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    totalOwed: competitors.reduce((sum, c) => sum + (c.fees_waived ? 0 : c.amount_owed), 0),
    totalPaid: competitors.reduce((sum, c) => sum + c.amount_paid, 0),
    totalOutstanding: competitors.reduce((sum, c) => {
    const balance = c.fees_waived ? 0 : (c.amount_owed - c.amount_paid);
    return sum + Math.max(0, balance);
  }, 0),
    netIncome: 0
  };

  totals.netIncome = totals.totalPaid - totals.totalExpenses;

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
                  <div className={`text-2xl font-bold ${totals.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${totals.netIncome.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trial Expenses */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Trial Expenses</CardTitle>
                    <CardDescription>Track all expenses for this trial</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => addExpenseRow('Judge Fees')}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Judge
                    </Button>
                    <Button
                      onClick={() => addExpenseRow()}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Expense
                    </Button>
                    <Button
                      onClick={saveExpenses}
                      disabled={saving}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Save className="h-4 w-4 mr-1" />
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
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
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

            {/* Competitor Payments */}
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
                        <th className="text-center p-2 text-sm font-semibold w-20"></th>
                        <th className="text-center p-2 text-sm font-semibold w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {competitors.map((comp, compIndex) => {
                        const payments = comp.payment_history || [];
                        const hasPayments = payments.length > 0;
                        const effectiveOwed = comp.fees_waived ? 0 : comp.amount_owed;
                        const balance = comp.fees_waived ? 0 : (comp.amount_owed - comp.amount_paid); 

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
                              <td className="p-2"></td>
                              <td className="p-2" rowSpan={hasPayments ? payments.length + 2 : 2}>
                                <div className="flex flex-col space-y-1">
                                  {!comp.fees_waived && balance > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openPaymentModal(comp)}
                                      className="w-full"
                                    >
                                      <CreditCard className="h-3 w-3 mr-1" />
                                      Pay
                                    </Button>
                                  )}
                                  {!comp.fees_waived && balance < 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openRefundModal(comp)}
                                      className="w-full border-purple-600 text-purple-600 hover:bg-purple-50"
                                    >
                                      <RefreshCcw className="h-3 w-3 mr-1" />
                                      Refund
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

                              const isRefund = payment.amount < 0;

                              return (
                                <tr 
                                  key={`payment-${paymentIndex}`} 
                                  className={`border-b ${compIndex % 2 === 0 ? 'bg-orange-50' : 'bg-white'}`}
                                >
                                  <td className="p-2 text-sm text-gray-600">
                                    {isRefund ? '🔄 REFUND: ' : ''}{payment.notes || 'Payment'}
                                  </td>
                                  <td className="p-2 text-sm">{payment.payment_method}</td>
                                  <td className="p-2 text-sm">{payment.payment_received_by || '-'}</td>
                                  <td className="p-2 text-sm">
                                    {new Date(payment.payment_date || '').toLocaleDateString()}
                                  </td>
                                  <td className={`p-2 text-right font-mono ${isRefund ? 'text-purple-600' : 'text-green-600'}`}>
                                    {isRefund ? '-' : ''}${Math.abs(payment.amount).toFixed(2)}
                                  </td>
                                  <td className="p-2 text-right font-mono">
                                    ${remainingAfterThisPayment.toFixed(2)}
                                  </td>
                                  <td className="p-2 text-center">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openEditPaymentModal(payment, comp)}
                                      className="h-7 px-2"
                                    >
                                      <Edit2 className="h-3 w-3 mr-1" />
                                      Edit
                                    </Button>
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
                              <td className="p-2"></td>
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
                        <td></td>
                      </tr>
                      <tr className="bg-gray-100 font-semibold">
                        <td className="p-2" colSpan={7}>Total Collected</td>
                        <td className="p-2 text-right text-green-600">${totals.totalPaid.toFixed(2)}</td>
                        <td></td>
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
          /* BREAK-EVEN TAB */
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
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </div>

            {/* Break-Even Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Fixed Costs</CardTitle>
                <CardDescription>These are auto-populated from your expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Hall Rental</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={breakEvenData.hall_rental}
                      onChange={(e) => setBreakEvenData({...breakEvenData, hall_rental: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>Ribbons</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={breakEvenData.ribbons}
                      onChange={(e) => setBreakEvenData({...breakEvenData, ribbons: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>Insurance</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={breakEvenData.insurance}
                      onChange={(e) => setBreakEvenData({...breakEvenData, insurance: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>Other Fixed Costs</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={breakEvenData.other_fixed_costs}
                      onChange={(e) => setBreakEvenData({...breakEvenData, other_fixed_costs: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Entry Fee Structure</CardTitle>
                <CardDescription>Configure your entry fees and costs per run</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Regular Entry Fee</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={breakEvenData.regular_entry_fee}
                        onChange={(e) => setBreakEvenData({...breakEvenData, regular_entry_fee: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <Label>C-WAGS Fee (per run)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={breakEvenData.regular_cwags_fee}
                        onChange={(e) => setBreakEvenData({...breakEvenData, regular_cwags_fee: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <Label>Judge Fee (per run)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={breakEvenData.regular_judge_fee}
                        onChange={(e) => setBreakEvenData({...breakEvenData, regular_judge_fee: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>FEO Entry Fee</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={breakEvenData.feo_entry_fee}
                        onChange={(e) => setBreakEvenData({...breakEvenData, feo_entry_fee: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <Label>FEO Judge Fee (per run)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={breakEvenData.feo_judge_fee}
                        onChange={(e) => setBreakEvenData({...breakEvenData, feo_judge_fee: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Break-Even Results */}
            <Card className="border-orange-300">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2 text-orange-600" />
                  Break-Even Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const totalFixedCosts = 
                    breakEvenData.hall_rental + 
                    breakEvenData.ribbons + 
                    breakEvenData.insurance + 
                    breakEvenData.other_fixed_costs;

                  const regularNetPerRun = 
                    breakEvenData.regular_entry_fee - 
                    breakEvenData.regular_cwags_fee - 
                    breakEvenData.regular_judge_fee;

                  const feoNetPerRun = 
                    breakEvenData.feo_entry_fee - 
                    breakEvenData.feo_judge_fee;

                  const breakEvenRuns = regularNetPerRun > 0 
                    ? Math.ceil(totalFixedCosts / regularNetPerRun) 
                    : 0;

                  // Calculate current status with waived runs separated
                  const totalPaidRuns = competitors.reduce((sum, c) => sum + (c.regular_runs || 0), 0);
                  const totalFeoRuns = competitors.reduce((sum, c) => sum + (c.feo_runs || 0), 0);
                  const totalWaivedRegular = competitors.reduce((sum, c) => sum + (c.waived_regular_runs || 0), 0);
                  const totalWaivedFeo = competitors.reduce((sum, c) => sum + (c.waived_feo_runs || 0), 0);

                  // Calculate waived run costs
                  const waivedRegularCostPerRun = breakEvenData.regular_cwags_fee + breakEvenData.regular_judge_fee;
                  const waivedFeoCostPerRun = breakEvenData.feo_judge_fee;
                  const waivedRegularCosts = totalWaivedRegular * waivedRegularCostPerRun;
                  const waivedFeoCosts = totalWaivedFeo * waivedFeoCostPerRun;
                  const totalWaivedCosts = waivedRegularCosts + waivedFeoCosts;

                  const currentRevenue = (totalPaidRuns * regularNetPerRun) + (totalFeoRuns * feoNetPerRun);
                  const totalAllCosts = totalFixedCosts + totalWaivedCosts;
                  const currentNetIncome = currentRevenue - totalAllCosts;
                  const paidRunsNeeded = Math.max(0, breakEvenRuns - totalPaidRuns);

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded">
                          <div className="text-sm text-gray-600">Total Fixed Costs</div>
                          <div className="text-2xl font-bold text-red-600">
                            ${totalFixedCosts.toFixed(2)}
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded">
                          <div className="text-sm text-gray-600">Net Per Regular Run</div>
                          <div className="text-2xl font-bold text-green-600">
                            ${regularNetPerRun.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Break-Even Point:</strong> You need <strong>{breakEvenRuns} paid regular runs</strong> to cover 
                          ${totalFixedCosts.toFixed(2)} in fixed costs at ${regularNetPerRun.toFixed(2)} net profit per run.
                        </AlertDescription>
                      </Alert>

                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-4 rounded border border-blue-200">
                          <div className="text-sm text-blue-600">Paid Regular Runs</div>
                          <div className="text-2xl font-bold text-blue-700">{totalPaidRuns}</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded border border-green-200">
                          <div className="text-sm text-green-600">Paid FEO Runs</div>
                          <div className="text-2xl font-bold text-green-700">{totalFeoRuns}</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded border border-purple-200">
                          <div className="text-sm text-purple-600">Waived Regular</div>
                          <div className="text-2xl font-bold text-purple-700">{totalWaivedRegular}</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded border border-purple-200">
                          <div className="text-sm text-purple-600">Waived FEO</div>
                          <div className="text-2xl font-bold text-purple-700">{totalWaivedFeo}</div>
                        </div>
                      </div>

                      {/* Waived Runs Expense Display */}
                      {(totalWaivedRegular > 0 || totalWaivedFeo > 0) && (
                        <Alert className="bg-purple-50 border-purple-300">
                          <Ban className="h-4 w-4 text-purple-700" />
                          <AlertDescription>
                            <div className="space-y-2">
                              <div className="font-semibold text-purple-900">Waived Runs Expense (No Revenue):</div>
                              {totalWaivedRegular > 0 && (
                                <div className="text-sm text-purple-800">
                                  • Regular Waived: {totalWaivedRegular} runs × ${waivedRegularCostPerRun.toFixed(2)} = 
                                  <span className="font-semibold ml-1">-${waivedRegularCosts.toFixed(2)}</span>
                                </div>
                              )}
                              {totalWaivedFeo > 0 && (
                                <div className="text-sm text-purple-800">
                                  • FEO Waived: {totalWaivedFeo} runs × ${waivedFeoCostPerRun.toFixed(2)} = 
                                  <span className="font-semibold ml-1">-${waivedFeoCosts.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="text-sm font-bold text-purple-900 pt-2 border-t border-purple-300">
                                Total Waived Expense: -${totalWaivedCosts.toFixed(2)}
                              </div>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-green-50 p-4 rounded border border-green-200">
                          <div className="text-sm text-green-600">Revenue (Paid Runs)</div>
                          <div className="text-2xl font-bold text-green-700">
                            ${currentRevenue.toFixed(2)}
                          </div>
                        </div>
                        <div className="bg-red-50 p-4 rounded border border-red-200">
                          <div className="text-sm text-red-600">Total Costs</div>
                          <div className="text-sm text-red-500 font-medium">
                            Fixed: ${totalFixedCosts.toFixed(2)}<br/>
                            Waived: ${totalWaivedCosts.toFixed(2)}
                          </div>
                          <div className="text-2xl font-bold text-red-700">
                            ${totalAllCosts.toFixed(2)}
                          </div>
                        </div>
                        <div className={`p-4 rounded border ${
                          currentNetIncome >= 0 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}>
                          <div className={`text-sm ${currentNetIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Net Income
                          </div>
                          <div className={`text-2xl font-bold ${currentNetIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            ${currentNetIncome.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {currentNetIncome >= 0 ? (
                        <Alert className="bg-green-50 border-green-200">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            <strong>✓ Profitable!</strong> You are ${Math.abs(currentNetIncome).toFixed(2)} above break-even.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>⚠ Need more entries:</strong> You need <strong>{paidRunsNeeded} more PAID regular runs</strong> to 
                            break even. Currently ${Math.abs(currentNetIncome).toFixed(2)} short.
                          </AlertDescription>
                        </Alert>
                      )}

                      {breakEvenRuns > 0 && (
                        <div className="bg-gray-50 p-4 rounded">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Progress to Break-Even</span>
                            <span className="text-sm font-bold">
                              {Math.min(100, Math.round((totalPaidRuns / breakEvenRuns) * 100))}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-4">
                            <div 
                              className={`h-4 rounded-full transition-all ${
                                totalPaidRuns >= breakEvenRuns ? 'bg-green-600' : 'bg-orange-600'
                              }`}
                              style={{ width: `${Math.min(100, (totalPaidRuns / breakEvenRuns) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payment Modal */}
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
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
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

        {/* Edit Payment Modal */}
        <Dialog open={showEditPaymentModal} onOpenChange={setShowEditPaymentModal}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Edit Payment</DialogTitle>
              <DialogDescription>
                Correct the payment details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Editing this payment will recalculate the entry balance automatically.
                </AlertDescription>
              </Alert>

              <div>
                <Label>Payment Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editPaymentAmount}
                  onChange={(e) => setEditPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Payment Method *</Label>
                <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {PAYMENT_METHODS.map(method => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Received By</Label>
                <Input
                  value={editPaymentReceivedBy}
                  onChange={(e) => setEditPaymentReceivedBy(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div>
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={editPaymentDate}
                  onChange={(e) => setEditPaymentDate(e.target.value)}
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editPaymentNotes}
                  onChange={(e) => setEditPaymentNotes(e.target.value)}
                  placeholder="Optional notes"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditPaymentModal(false)}>
                  Cancel
                </Button>
                <Button onClick={updatePayment} disabled={saving}>
                  {saving ? 'Saving...' : 'Update Payment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Refund Modal */}
        <Dialog open={showRefundModal} onOpenChange={setShowRefundModal}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Process Refund</DialogTitle>
              <DialogDescription>
                {selectedCompetitor?.handler_name} - {selectedCompetitor?.dog_call_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Alert className="bg-purple-50 border-purple-200">
                <AlertCircle className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-800">
                  This competitor has overpaid. Process a refund to correct the balance.
                  {selectedCompetitor && (() => {
                    const effectiveOwed = selectedCompetitor.fees_waived ? 0 : selectedCompetitor.amount_owed;
                    const overpayment = selectedCompetitor.amount_paid - effectiveOwed;
                    return overpayment > 0 ? ` Overpayment: $${overpayment.toFixed(2)}` : '';
                  })()}
                </AlertDescription>
              </Alert>

              <div>
                <Label>Refund Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Refund Method *</Label>
                <Select value={refundMethod} onValueChange={setRefundMethod}>
                  <SelectTrigger className="bg-white">
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
                <Label>Issued By</Label>
                <Input
                  value={refundIssuedBy}
                  onChange={(e) => setRefundIssuedBy(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div>
                <Label>Refund Date</Label>
                <Input
                  type="date"
                  value={refundDate}
                  onChange={(e) => setRefundDate(e.target.value)}
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="Reason for refund"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowRefundModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={processRefund} 
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {saving ? 'Processing...' : 'Process Refund'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Waive Fees Modal */}
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