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
  History,
  Ban
} from 'lucide-react';
import { simpleTrialOperations } from '@/lib/trialOperationsSimple';
import { financialOperations, type TrialExpense, type CompetitorFinancial } from '@/lib/financialOperations';

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

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [trialResult, expensesResult, competitorsResult] = await Promise.all([
        simpleTrialOperations.getTrial(trialId),
        financialOperations.getTrialExpenses(trialId),
        financialOperations.getCompetitorFinancials(trialId)
      ]);

      if (!trialResult.success) throw new Error('Failed to load trial');
      if (!expensesResult.success) throw new Error('Failed to load expenses');
      if (!competitorsResult.success) throw new Error('Failed to load competitor data');

      setTrial(trialResult.data);
      setExpenses(expensesResult.data);
      setCompetitors(competitorsResult.data || []);

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
    const remaining = competitor.amount_owed - competitor.amount_paid;
    setPaymentAmount(remaining > 0 ? remaining.toFixed(2) : '');
    setPaymentMethod('');
    setPaymentReceivedBy('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const recordPayment = async () => {
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
      const result = await financialOperations.waiveFees(selectedCompetitor.entry_id, waiveReason);
      
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

      alert('Fee waiver removed!');
      await loadData();

    } catch (err) {
      console.error('Error unwaiving fees:', err);
      alert('Failed to unwaive fees');
    } finally {
      setSaving(false);
    }
  };

  const calculateTotals = () => {
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalOwed = competitors.reduce((sum, comp) => sum + comp.amount_owed, 0);
    const totalPaid = competitors.reduce((sum, comp) => sum + comp.amount_paid, 0);
    const totalOutstanding = totalOwed - totalPaid;
    const netIncome = totalPaid - totalExpenses;

    return { totalExpenses, totalOwed, totalPaid, totalOutstanding, netIncome };
  };

  const totals = calculateTotals();

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
                  {saving ? 'Saving...' : 'Save Expenses'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-sm font-semibold w-40">Category</th>
                    <th className="text-left p-2 text-sm font-semibold">Description / Judge Name</th>
                    <th className="text-left p-2 text-sm font-semibold w-32">Amount</th>
                    <th className="text-left p-2 text-sm font-semibold">Paid To</th>
                    <th className="text-left p-2 text-sm font-semibold w-40">Payment Date</th>
                    <th className="text-left p-2 text-sm font-semibold w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2">
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
                      </td>
                      <td className="p-2">
                        <Input
                          value={expense.description || ''}
                          onChange={(e) => updateExpense(index, 'description', e.target.value)}
                          placeholder={expense.expense_category === 'Judge Fees' ? 'Judge name, rate, hours...' : 'Details...'}
                          className="bg-white"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={expense.amount || ''}
                          onChange={(e) => updateExpense(index, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="bg-white text-right"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={expense.paid_to || ''}
                          onChange={(e) => updateExpense(index, 'paid_to', e.target.value)}
                          placeholder="Payee name"
                          className="bg-white"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="date"
                          value={expense.payment_date || ''}
                          onChange={(e) => updateExpense(index, 'payment_date', e.target.value)}
                          className="bg-white"
                        />
                      </td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteExpense(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td className="p-2" colSpan={2}>Total Expenses</td>
                    <td className="p-2 text-right">${totals.totalExpenses.toFixed(2)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

       {/* Competitor Payments */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center space-x-2">
      <CheckCircle className="h-5 w-5 text-orange-600" />
      <span>Competitor Entry Fees</span>
    </CardTitle>
    <CardDescription>Detailed payment tracking with full history</CardDescription>
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
            const balance = comp.amount_owed - comp.amount_paid;
            const payments = comp.payment_history || [];
            const hasPayments = payments.length > 0;

            return (
              <React.Fragment key={compIndex}>
                {/* Main Entry Row - Amount Owed */}
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
                    {comp.regular_runs}
                  </td>
                  <td className="p-2 text-center" rowSpan={hasPayments ? payments.length + 2 : 2}>
                    {comp.feo_runs}
                  </td>
                  <td className="p-2">
                    <span className="font-semibold text-gray-700">Total Entry Fees</span>
                  </td>
                  <td className="p-2 text-gray-400">-</td>
                  <td className="p-2 text-gray-400">-</td>
                  <td className="p-2 text-gray-400">-</td>
                  <td className="p-2 text-right font-mono font-semibold">
                    ${comp.amount_owed.toFixed(2)}
                  </td>
                  <td className="p-2 text-right font-mono font-semibold">
                    ${comp.amount_owed.toFixed(2)}
                  </td>
                  <td className="p-2" rowSpan={hasPayments ? payments.length + 2 : 2}>
                    <div className="flex flex-col space-y-1">
                      {!comp.fees_waived && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPaymentModal(comp)}
                          disabled={comp.amount_owed <= 0}
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

                {/* Payment Rows */}
                {payments.map((payment, paymentIndex) => {
                  const remainingAfterThisPayment = comp.amount_owed - payments
                    .slice(0, paymentIndex + 1)
                    .reduce((sum, p) => sum + p.amount, 0);

                  return (
                    <tr 
                      key={`payment-${paymentIndex}`} 
                      className={`border-b ${compIndex % 2 === 0 ? 'bg-orange-50' : 'bg-white'}`}
                    >
                      <td className="p-2 pl-6">
                        <span className="text-sm text-gray-600">Payment {paymentIndex + 1}</span>
                        {payment.notes && (
                          <div className="text-xs text-gray-500 italic">{payment.notes}</div>
                        )}
                      </td>
                      <td className="p-2 text-sm">
                        {payment.payment_method || '-'}
                      </td>
                      <td className="p-2 text-sm">
                        {payment.payment_received_by || '-'}
                      </td>
                      <td className="p-2 text-sm">
                        {payment.payment_date 
                          ? new Date(payment.payment_date).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="p-2 text-right font-mono text-green-600">
                        -${payment.amount.toFixed(2)}
                      </td>
                      <td className="p-2 text-right font-mono font-semibold">
                        ${remainingAfterThisPayment.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}

                {/* Current Balance Row */}
                <tr className={`border-b-2 border-gray-300 ${compIndex % 2 === 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                  <td className="p-2 font-bold">
                    Current Balance
                  </td>
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
                <Label>Amount Owed: ${selectedCompetitor?.amount_owed.toFixed(2)}</Label>
                <br />
                <Label>Already Paid: ${selectedCompetitor?.amount_paid.toFixed(2)}</Label>
                <br />
                <Label className="text-orange-600 font-bold">
                  Remaining: ${(selectedCompetitor ? selectedCompetitor.amount_owed - selectedCompetitor.amount_paid : 0).toFixed(2)}
                </Label>
              </div>

              <div>
                <Label>Payment Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1 bg-white">
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
                  placeholder="Name of person who collected payment"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  className="mt-1"
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
                  className="mt-1"
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