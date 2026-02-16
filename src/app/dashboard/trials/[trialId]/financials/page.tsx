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
import { logPaymentReceived, logPaymentEdited, logRefundProcessed, logFeesWaived } from '@/lib/journalLogger';

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
  // Judge data for expense rows
const [trialJudges, setTrialJudges] = useState<{
  name: string;
  runsJudged: number;
}[]>([]);
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
    regular_entry_fee: 0,
    regular_cwags_fee: 0,
    regular_judge_fee: 0,
    feo_entry_fee: 0,
    feo_judge_fee: 0,
    waived_entry_fee: 0,
    waived_cwags_fee: 0,
    waived_judge_fee: 0,
    waived_feo_entry_fee: 0,
    waived_feo_judge_fee: 0,
    judge_volunteer_rate: 0,
    feo_volunteer_rate: 0
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

   // Judge/Volunteer status tracking
  const [judgeVolunteerStatus, setJudgeVolunteerStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, [trialId]);

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
      // Load judges and their run counts from this trial
const { data: rounds } = await supabase
  .from('trial_rounds')
  .select(`
    judge_name,
    entry_selections!inner(entry_type, entry_status),
    trial_classes!inner(trial_days!inner(trial_id))
  `)
  .eq('trial_classes.trial_days.trial_id', trialId);

if (rounds) {
  const judgeRunMap = new Map<string, number>();
  rounds.forEach((round: any) => {
    const name = round.judge_name;
    if (!name || name.trim() === '') return;
    const validRuns = (round.entry_selections || []).filter((s: any) =>
      s.entry_type?.toLowerCase() !== 'feo' &&
      s.entry_status?.toLowerCase() !== 'withdrawn'
    ).length;
    judgeRunMap.set(name, (judgeRunMap.get(name) || 0) + validRuns);
  });
  setTrialJudges(
    Array.from(judgeRunMap.entries())
      .map(([name, runsJudged]) => ({ name, runsJudged }))
      .sort((a, b) => a.name.localeCompare(b.name))
  );
}
      setCompetitors(competitorsResult.data || []);
      
      // Load J/V status for each competitor
      const jvStatusPromises = (competitorsResult.data || []).map(async (comp: CompetitorFinancial) => {
        const { data } = await supabase
          .from('entries')
          .select('is_judge_volunteer')
          .eq('id', comp.entry_id)
          .single();
        
        return { entryId: comp.entry_id, isJV: data?.is_judge_volunteer || false };
      });
      
      const jvResults = await Promise.all(jvStatusPromises);
      const jvStatus: Record<string, boolean> = {};
      jvResults.forEach(result => {
        jvStatus[result.entryId] = result.isJV;
      });
      
      setJudgeVolunteerStatus(jvStatus);

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
    
    // ✅ Convert date to noon timestamp to avoid timezone issues
    const paymentDateTime = `${paymentDate}T12:00:00Z`;
    
    const result = await financialOperations.addPaymentTransaction({
      entry_id: selectedCompetitor.entry_id,
      amount: parseFloat(paymentAmount),
      payment_method: paymentMethod,
      payment_received_by: paymentReceivedBy,
      payment_date: paymentDateTime,  // ✅ CORRECT - sends "2025-01-13T12:00:00Z"
      notes: paymentNotes
    });

     if (!result.success) throw new Error('Failed to record payment');

      // ✅ LOG TO JOURNAL WITH SNAPSHOT
      await logPaymentReceived(
        trialId,
        selectedCompetitor.entry_id,
        {
          amount: parseFloat(paymentAmount),
          payment_method: paymentMethod,
          payment_received_by: paymentReceivedBy,
          payment_date: paymentDateTime,
          notes: paymentNotes
        },
        {
          handler_name: selectedCompetitor.handler_name,
          dog_call_name: selectedCompetitor.dog_call_name,
          amount_owed: selectedCompetitor.amount_owed,
          amount_paid_before: selectedCompetitor.amount_paid,
          amount_paid_after: selectedCompetitor.amount_paid + parseFloat(paymentAmount)
        }
      );

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
    
    // ✅ Convert date to noon timestamp
    const paymentDateTime = `${editPaymentDate}T12:00:00Z`;
    
    const { error: updateError } = await supabase
      .from('entry_payment_transactions')
      .update({
        amount: parseFloat(editPaymentAmount),
        payment_method: editPaymentMethod,
        payment_received_by: editPaymentReceivedBy,
        payment_date: paymentDateTime,  // ✅ CORRECT
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

      // ✅ LOG TO JOURNAL WITH SNAPSHOT
      await logPaymentEdited(
        trialId,
        editingPayment.entry_id,
        {
          amount: editingPayment.amount,
          payment_method: editingPayment.payment_method,
          payment_date: editingPayment.payment_date
        },
        {
          amount: parseFloat(editPaymentAmount),
          payment_method: editPaymentMethod,
          payment_date: paymentDateTime
        },
        {
          handler_name: selectedCompetitor?.handler_name || 'Unknown',
          dog_call_name: selectedCompetitor?.dog_call_name || 'Unknown'
        }
      );

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
    
    // ✅ Convert date to noon timestamp
    const refundDateTime = `${refundDate}T12:00:00Z`;
    
    const result = await financialOperations.addPaymentTransaction({
      entry_id: selectedCompetitor.entry_id,
      amount: -parseFloat(refundAmount),
      payment_method: refundMethod,
      payment_received_by: refundIssuedBy,
      payment_date: refundDateTime,  // ✅ CORRECT
      notes: `REFUND: ${refundNotes || 'Overpayment refund'}`
    });

      if (!result.success) throw new Error('Failed to process refund');

      // ✅ LOG TO JOURNAL WITH SNAPSHOT
      await logRefundProcessed(
        trialId,
        selectedCompetitor.entry_id,
        {
          amount: parseFloat(refundAmount),
          refund_method: refundMethod,
          refund_issued_by: refundIssuedBy,
          refund_date: refundDateTime,
          notes: refundNotes
        },
        {
          handler_name: selectedCompetitor.handler_name,
          dog_call_name: selectedCompetitor.dog_call_name,
          amount_owed: selectedCompetitor.amount_owed,
          amount_paid_before: selectedCompetitor.amount_paid,
          amount_paid_after: selectedCompetitor.amount_paid - parseFloat(refundAmount)
        }
      );

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

  const toggleJudgeVolunteer = async (competitor: CompetitorFinancial) => {
    const currentStatus = judgeVolunteerStatus[competitor.entry_id] || false;
    const newStatus = !currentStatus;
    
    try {
      setSaving(true);
      
      // Update database
      const entryIds = competitor.entry_ids || [competitor.entry_id];
      
      for (const entryId of entryIds) {
        await supabase
          .from('entries')
          .update({ is_judge_volunteer: newStatus })
          .eq('id', entryId);
      }
      
      // Update local state
      setJudgeVolunteerStatus(prev => ({
        ...prev,
        [competitor.entry_id]: newStatus
      }));
      
      // Recalculate fees if enabling J/V
      if (newStatus && !competitor.fees_waived) {
        await recalculateFeesForJV(competitor, newStatus);
      } else if (!newStatus) {
        // Restore original fees
        await recalculateFeesForJV(competitor, newStatus);
      }
      
      await loadData();
      
    } catch (err) {
      console.error('Error toggling J/V status:', err);
      alert('Failed to update J/V status');
    } finally {
      setSaving(false);
    }
  };

  const recalculateFeesForJV = async (competitor: CompetitorFinancial, isJV: boolean) => {
    // Get entry selections to recalculate fees
    const { data: entries } = await supabase
      .from('entries')
      .select(`
        id,
        entry_selections (
          id,
          entry_type,
          fee
        )
      `)
      .in('id', competitor.entry_ids || [competitor.entry_id]);
    
    if (!entries) return;
    
    // Calculate new fees based on J/V status
    for (const entry of entries) {
      let newTotalFee = 0;
      
      for (const selection of entry.entry_selections) {
        let newFee = selection.fee;
        
        if (isJV) {
          // Apply J/V rates
          if (selection.entry_type === 'feo') {
            newFee = breakEvenData.feo_volunteer_rate || selection.fee;
          } else {
            newFee = breakEvenData.judge_volunteer_rate || selection.fee;
          }
        } else {
          // Restore original rates
          if (selection.entry_type === 'feo') {
            newFee = breakEvenData.feo_entry_fee || selection.fee;
          } else {
            newFee = breakEvenData.regular_entry_fee || selection.fee;
          }
        }
        
        // Update selection fee
        await supabase
          .from('entry_selections')
          .update({ fee: newFee })
          .eq('id', selection.id);
        
        newTotalFee += newFee;
      }
      
      // Update total fee on entry
      await supabase
        .from('entries')
        .update({ 
          amount_owed: newTotalFee,
          total_fee: newTotalFee 
        })
        .eq('id', entry.id);
    }
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

      // Use the entryIds that was already declared on line 587
      for (const entryId of entryIds) {
        await logFeesWaived(
          trialId,
          entryId,
          {
            handler_name: selectedCompetitor.handler_name,
            dog_call_name: selectedCompetitor.dog_call_name,
            amount_owed: selectedCompetitor.amount_owed,
            reason: waiveReason
          }
        );
      }

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
    const totalFixedCosts = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

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

EXPENSES
───────────────────────────────────────────────────────────
${expenses.map(e => 
  `${(e.expense_category + (e.description ? ` (${e.description})` : '')).padEnd(22)}$${(e.amount || 0).toFixed(2)}`
).join('\n')}
───────────────────────────────────────────────────────────
TOTAL EXPENSES:       $${totalFixedCosts.toFixed(2)}

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
// Auto-calculate C-WAGS fee across ALL regular runs (paid + waived)
const allRegularRuns = competitors.reduce((sum, c) => 
  sum + (c.regular_runs || 0) + (c.waived_regular_runs || 0), 0);
const cwagsFeeTotal = allRegularRuns * (breakEvenData.regular_cwags_fee || 0);
 // Calculate totals //
const totals = {
  totalExpenses: expenses.reduce((sum, e) => {
  if (e.expense_category === 'Judge Fees' && e.paid_to === 'per_run') {
    const judge = trialJudges.find(j => j.name === e.description);
    const runs = judge?.runsJudged || 0;
    return sum + ((e.amount || 0) * runs);
  }
  if (e.expense_category === 'Judge Fees' && e.paid_to === 'waived') {
    return sum; // $0 contribution
  }
  return sum + (e.amount || 0);
}, 0) + cwagsFeeTotal,
  totalOwed: competitors.reduce((sum, c) => sum + (c.fees_waived ? 0 : c.amount_owed), 0),
  totalPaid: competitors.reduce((sum, c) => sum + c.amount_paid, 0),
  totalOutstanding: competitors.reduce((sum, c) => {
    const balance = c.fees_waived ? 0 : (c.amount_owed - c.amount_paid);
    return sum + balance; // ✅ CORRECT - includes negative balances (refunds)
  }, 0),
  netIncome: 0 // calculated below
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
                  <div className="text-sm text-gray-600">Total Entry Fees</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${totals.totalOwed.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-600">Entry Fees Collected</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${totals.totalPaid.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-600">Entry Fees Outstanding</div>
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
                      {/* Volunteer Rate Config */}
<Card className="border-blue-200">
  <CardContent className="pt-4 pb-4">
    <div className="flex items-center gap-6">
      <div className="flex-1">
        <div className="text-sm font-semibold text-gray-700">Volunteer / Reduced Entry Rate</div>
        <div className="text-xs text-gray-500 mt-0.5">
          Reduced fee applied when you click "Volunteer" on a competitor's payment row.
          Set to $0 to disable.
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Rate per run: $</span>
        <Input
          type="number"
          step="0.01"
          min="0"
          className="w-24"
          value={breakEvenData.judge_volunteer_rate || ''}
          placeholder="0.00"
          onChange={(e) => setBreakEvenData({
            ...breakEvenData,
            judge_volunteer_rate: parseFloat(e.target.value) || 0
          })}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleSaveBreakEven}
          disabled={saving}
        >
          <Save className="h-3 w-3 mr-1" />
          Save
        </Button>
      </div>
    </div>
  </CardContent>
</Card>
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
  {/* Category dropdown */}
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

  {/* Description — judge dropdown if Judge Fees, text input otherwise */}
  <div className="col-span-3">
    {expense.expense_category === 'Judge Fees' ? (
      <Select
        value={expense.description || ''}
        onValueChange={(value) => updateExpense(index, 'description', value)}
      >
        <SelectTrigger className="bg-white">
          <SelectValue placeholder="Select judge..." />
        </SelectTrigger>
        <SelectContent className="bg-white">
          {trialJudges.map(j => (
            <SelectItem key={j.name} value={j.name}>
              {j.name} ({j.runsJudged} runs)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : (
      <Input
        placeholder="Description"
        value={expense.description || ''}
        onChange={(e) => updateExpense(index, 'description', e.target.value)}
      />
    )}
  </div>

  {/* Amount — rate input with total shown if per run, locked if waived */}
  <div className="col-span-2">
    {expense.expense_category === 'Judge Fees' && expense.paid_to === 'waived' ? (
      <div className="px-3 py-2 bg-gray-100 rounded text-sm text-gray-500">
        $0.00
      </div>
    ) : (
      <div>
        <Input
          type="number"
          step="0.01"
          placeholder={expense.expense_category === 'Judge Fees' && expense.paid_to === 'per_run' ? '$/run' : 'Amount'}
          value={expense.amount || ''}
          onChange={(e) => updateExpense(index, 'amount', parseFloat(e.target.value) || 0)}
        />
        {expense.expense_category === 'Judge Fees' && expense.paid_to === 'per_run' && expense.description && (
          <div className="text-xs text-blue-600 mt-0.5">
            = ${((expense.amount || 0) * (trialJudges.find(j => j.name === expense.description)?.runsJudged || 0)).toFixed(2)} total
          </div>
        )}
      </div>
    )}
  </div>

  {/* Paid To — payment type dropdown if Judge Fees, text input otherwise */}
  <div className="col-span-3">
    {expense.expense_category === 'Judge Fees' ? (
      <Select
        value={expense.paid_to || 'flat'}
        onValueChange={(value) => {
          updateExpense(index, 'paid_to', value);
          if (value === 'waived') updateExpense(index, 'amount', 0);
        }}
      >
        <SelectTrigger className="bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="flat">Flat Fee</SelectItem>
          <SelectItem value="per_run">Per Run</SelectItem>
          <SelectItem value="waived">Waived (free entry)</SelectItem>
        </SelectContent>
      </Select>
    ) : (
      <Input
        placeholder="Paid To"
        value={expense.paid_to || ''}
        onChange={(e) => updateExpense(index, 'paid_to', e.target.value)}
      />
    )}
  </div>

  {/* Delete */}
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
                  {/* Auto-calculated C-WAGS line */}
          {allRegularRuns > 0 && (
            <div className="flex items-center gap-2 px-2 py-2 bg-blue-50 border border-blue-200 rounded mt-1">
              <div className="w-36">
                <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  C-WAGS (auto)
                </span>
              </div>
              <div className="flex-1 text-sm text-blue-800">
                {breakEvenData.regular_cwags_fee > 0 ? (
                  <>C-WAGS Fees — {allRegularRuns} runs × ${breakEvenData.regular_cwags_fee.toFixed(2)}</>
                ) : (
                  <span className="italic text-blue-500">
                    Set C-WAGS fee per run in Break-Even tab to calculate
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold text-blue-800 min-w-[80px] text-right">
                ${cwagsFeeTotal.toFixed(2)}
              </div>
            </div>
          )}

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
                        <th className="text-center p-2 text-sm font-semibold w-16">J/V</th>
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
                                {(comp.regular_runs || 0) + (comp.waived_regular_runs || 0)}
                              </td>
                              <td className="p-2 text-center" rowSpan={hasPayments ? payments.length + 2 : 2}>
  {(comp.feo_runs || 0) + (comp.waived_feo_runs || 0)}
</td>
<td className="p-2 text-center" rowSpan={hasPayments ? payments.length + 2 : 2}>
  <input
    type="checkbox"
    checked={judgeVolunteerStatus[comp.entry_id] || false}
    onChange={() => toggleJudgeVolunteer(comp)}
    className="w-4 h-4 cursor-pointer"
    disabled={comp.fees_waived || saving}
    title={comp.fees_waived ? "Cannot modify waived entries" : "Apply Judge/Volunteer reduced rate"}
  />
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
       {/* Header */}
<div className="flex items-center justify-between">
  <div>
    <h2 className="text-2xl font-bold text-gray-900">Break-Even Analysis</h2>
    <p className="text-gray-600 mt-1">Estimate how many runs you need to cover your costs</p>
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

{/* Section 1 — Fixed Costs (read-only from Tab 1) */}
<Card>
  <CardHeader>
    <CardTitle>Fixed Costs</CardTitle>
    <CardDescription>
      Auto-pulled from your Trial Expenses — these are your known costs before entries are counted.
      C-WAGS fees are excluded here because they are calculated per run below.
    </CardDescription>
  </CardHeader>
  <CardContent>
    {expenses.length === 0 ? (
      <p className="text-sm text-gray-500 italic">
        No expenses added yet. Add expenses in the Expenses & Payments tab.
      </p>
    ) : (
      <div className="space-y-2">
        {expenses.map((expense, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span className="text-gray-600">
              {expense.expense_category}
              {expense.description ? ` — ${expense.description}` : ''}
            </span>
            <span className="font-semibold">
              ${(expense.expense_category === 'Judge Fees' && expense.paid_to === 'per_run'
                ? (expense.amount || 0) * (trialJudges.find(j => j.name === expense.description)?.runsJudged || 0)
                : expense.paid_to === 'waived'
                ? 0
                : (expense.amount || 0)
              ).toFixed(2)}
            </span>
          </div>
        ))}
        <div className="flex justify-between pt-2 border-t font-semibold text-red-700">
          <span>Total Fixed Costs</span>
          <span>${expenses.reduce((sum, e) => {
            if (e.expense_category === 'Judge Fees' && e.paid_to === 'per_run') {
              return sum + ((e.amount || 0) * (trialJudges.find(j => j.name === e.description)?.runsJudged || 0));
            }
            if (e.paid_to === 'waived') return sum;
            return sum + (e.amount || 0);
          }, 0).toFixed(2)}</span>
        </div>
      </div>
    )}
  </CardContent>
</Card>

{/* Section 2 — Entry Fee Configuration */}
<Card>
  <CardHeader>
    <CardTitle>Entry Fee Configuration</CardTitle>
    <CardDescription>
      Set your entry fee and C-WAGS fee per run. 
      <span className="text-blue-600 font-medium"> The C-WAGS fee you enter here also drives 
      the auto-calculated C-WAGS expense line on the Expenses & Payments tab.</span>
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 gap-6">
      <div>
        <Label>Regular Entry Fee (per run)</Label>
        <p className="text-xs text-gray-500 mb-1">
          What you charge competitors per run
        </p>
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-gray-500">$</span>
          <Input
            type="number"
            step="0.01"
            value={breakEvenData.regular_entry_fee}
            onChange={(e) => setBreakEvenData({...breakEvenData, regular_entry_fee: parseFloat(e.target.value) || 0})}
            className="pl-7"
          />
        </div>
      </div>
      <div>
        <Label>C-WAGS Fee (per run)</Label>
        <p className="text-xs text-gray-500 mb-1">
          What C-WAGS charges per regular run — also used on Expenses & Payments tab
        </p>
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-gray-500">$</span>
          <Input
            type="number"
            step="0.01"
            value={breakEvenData.regular_cwags_fee}
            onChange={(e) => setBreakEvenData({...breakEvenData, regular_cwags_fee: parseFloat(e.target.value) || 0})}
            className="pl-7"
          />
        </div>
      </div>
    </div>

    {/* Net per run preview */}
    {breakEvenData.regular_entry_fee > 0 && (
      <div className="mt-4 p-3 bg-gray-50 rounded border text-sm">
        <span className="text-gray-600">Net per paid run: </span>
        <span className="font-semibold">
          ${breakEvenData.regular_entry_fee.toFixed(2)} entry − ${breakEvenData.regular_cwags_fee.toFixed(2)} C-WAGS = 
        </span>
        <span className="font-bold text-green-700 ml-1">
          ${(breakEvenData.regular_entry_fee - breakEvenData.regular_cwags_fee).toFixed(2)}
        </span>
      </div>
    )}
  </CardContent>
</Card>

{/* Section 3 — Estimated Waived Runs */}
<Card>
  <CardHeader>
    <CardTitle>Estimated Waived Runs</CardTitle>
    <CardDescription>
      Enter how many runs you expect to waive (judges, volunteers, etc.). 
      These runs cost you C-WAGS fees but bring in no entry fee revenue, 
      so they increase how many paid runs you need to break even.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 gap-6">
      <div>
        <Label>Estimated Waived Regular Runs</Label>
        <p className="text-xs text-gray-500 mb-1">
          Each waived run costs ${breakEvenData.regular_cwags_fee.toFixed(2)} in C-WAGS fees with no revenue
        </p>
        <Input
          type="number"
          step="1"
          min="0"
          value={breakEvenData.waived_entry_fee || 0}
          onChange={(e) => setBreakEvenData({...breakEvenData, waived_entry_fee: parseFloat(e.target.value) || 0})}
          placeholder="e.g. 10"
        />
        {(breakEvenData.waived_entry_fee || 0) > 0 && (
          <p className="text-xs text-red-600 mt-1">
            = ${((breakEvenData.waived_entry_fee || 0) * breakEvenData.regular_cwags_fee).toFixed(2)} C-WAGS burden with no revenue
          </p>
        )}
      </div>
    </div>
  </CardContent>
</Card>

{/* Section 4 — Break-Even Results */}
<Card className="border-orange-300">
  <CardHeader>
    <CardTitle className="flex items-center">
      <Calculator className="h-5 w-5 mr-2 text-orange-600" />
      Break-Even Calculation
    </CardTitle>
  </CardHeader>
  <CardContent>
    {(() => {
      const fixedCosts = expenses.reduce((sum, e) => {
        if (e.expense_category === 'Judge Fees' && e.paid_to === 'per_run') {
          return sum + ((e.amount || 0) * (trialJudges.find(j => j.name === e.description)?.runsJudged || 0));
        }
        if (e.paid_to === 'waived') return sum;
        return sum + (e.amount || 0);
      }, 0);

      const estimatedWaived = breakEvenData.waived_entry_fee || 0;
      const waivedBurden = estimatedWaived * breakEvenData.regular_cwags_fee;
      const totalTocover = fixedCosts + waivedBurden;
      const netPerRun = breakEvenData.regular_entry_fee - breakEvenData.regular_cwags_fee;
      const breakEvenRuns = netPerRun > 0 ? Math.ceil(totalTocover / netPerRun) : 0;

      const totalPaidRuns = competitors.reduce((sum, c) => sum + (c.regular_runs || 0), 0);
      const currentRevenue = totalPaidRuns * netPerRun;
      const currentNetIncome = currentRevenue - totalTocover;
      const isProfitable = currentNetIncome >= 0;

      return (
        <div className="space-y-4">

          {/* The math shown clearly */}
          <div className="bg-gray-50 rounded p-4 space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-gray-600">Fixed Costs (from expenses):</span>
              <span>${fixedCosts.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">+ Waived Burden ({estimatedWaived} runs × ${breakEvenData.regular_cwags_fee.toFixed(2)}):</span>
              <span className="text-red-600">+${waivedBurden.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>= Total to Cover:</span>
              <span>${totalTocover.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">÷ Net per paid run (${breakEvenData.regular_entry_fee.toFixed(2)} − ${breakEvenData.regular_cwags_fee.toFixed(2)}):</span>
              <span>${netPerRun.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-lg font-bold text-orange-700">
              <span>= Break-Even Paid Runs Needed:</span>
              <span>{breakEvenRuns}</span>
            </div>
          </div>

          {/* Current status */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <div className="text-xs text-blue-600">Current Paid Runs</div>
              <div className="text-2xl font-bold text-blue-700">{totalPaidRuns}</div>
            </div>
            <div className="bg-orange-50 p-3 rounded border border-orange-200">
              <div className="text-xs text-orange-600">Break-Even Target</div>
              <div className="text-2xl font-bold text-orange-700">{breakEvenRuns}</div>
            </div>
            <div className={`p-3 rounded border ${isProfitable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className={`text-xs ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>Net Income</div>
              <div className={`text-2xl font-bold ${isProfitable ? 'text-green-700' : 'text-red-700'}`}>
                ${Math.abs(currentNetIncome).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Result */}
          <Alert className={isProfitable ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50'}>
            {isProfitable ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-orange-600" />
            )}
            <AlertDescription className={isProfitable ? 'text-green-800' : 'text-orange-800'}>
              {isProfitable ? (
                <span className="font-semibold">
                  ✓ Profitable! You are ${currentNetIncome.toFixed(2)} above break-even with {totalPaidRuns} paid runs.
                </span>
              ) : (
                <span className="font-semibold">
                  You need {breakEvenRuns - totalPaidRuns} more paid runs to break even.
                </span>
              )}
            </AlertDescription>
          </Alert>

          {/* Progress bar */}
          {breakEvenRuns > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress to Break-Even</span>
                <span>{Math.min(100, Math.round((totalPaidRuns / breakEvenRuns) * 100))}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${isProfitable ? 'bg-green-500' : 'bg-orange-500'}`}
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