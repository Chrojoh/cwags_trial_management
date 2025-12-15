// src/components/financials/BreakEvenTab.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, 
  TrendingUp, 
  Save, 
  Calculator,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { BreakEvenConfig } from '@/lib/breakEvenOperations';

interface BreakEvenTabProps {
  expenses: any[];
  competitors: any[];
  trialId: string;
  onSave: (data: BreakEvenConfig) => Promise<void>;
}

export default function BreakEvenTab({ expenses, competitors, trialId, onSave }: BreakEvenTabProps) {
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<BreakEvenConfig>({
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

  useEffect(() => {
    // Auto-populate from expenses
    const hallRental = expenses.find(e => e.expense_category === 'Hall Rental')?.amount || 0;
    const ribbons = expenses.find(e => e.expense_category === 'Ribbons')?.amount || 0;
    const insurance = expenses.find(e => e.expense_category === 'Insurance')?.amount || 0;
    
    // Sum up other expenses as "other fixed costs"
    const otherExpenses = expenses
      .filter(e => !['Hall Rental', 'Ribbons', 'Insurance', 'Judge Fees'].includes(e.expense_category))
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    setData(prev => ({
      ...prev,
      hall_rental: hallRental,
      ribbons: ribbons,
      insurance: insurance,
      other_fixed_costs: otherExpenses
    }));
  }, [expenses]);

  const updateField = (field: keyof BreakEvenConfig, value: string) => {
    const numValue = parseFloat(value) || 0;
    setData(prev => ({ ...prev, [field]: numValue }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(data);
      alert('Break-even analysis saved!');
    } catch (error) {
      alert('Failed to save break-even analysis');
    } finally {
      setSaving(false);
    }
  };

  // Calculate current runs
  const regularRuns = competitors.reduce((sum: number, comp: any) => sum + (comp.regular_runs || 0), 0);
  const feoRuns = competitors.reduce((sum: number, comp: any) => sum + (comp.feo_runs || 0), 0);

  // Calculate totals
  const totalFixedCosts = data.hall_rental + data.ribbons + data.insurance + data.other_fixed_costs;
  
  const regularNetPerRun = data.regular_entry_fee - data.regular_cwags_fee - data.regular_judge_fee;
  const feoNetPerRun = data.feo_entry_fee - data.feo_judge_fee;
  
  const totalRegularRevenue = regularRuns * regularNetPerRun;
  const totalFeoRevenue = feoRuns * feoNetPerRun;
  const totalNetRevenue = totalRegularRevenue + totalFeoRevenue;
  
  const currentNetIncome = totalNetRevenue - totalFixedCosts;
  
  // Calculate break-even
  const totalRuns = regularRuns + feoRuns;
  const weightedAvgNetPerRun = totalRuns > 0 
    ? (totalRegularRevenue + totalFeoRevenue) / totalRuns 
    : regularNetPerRun;
  
  const breakEvenRuns = weightedAvgNetPerRun > 0 
    ? Math.ceil(totalFixedCosts / weightedAvgNetPerRun)
    : 0;
  
  const runsNeeded = breakEvenRuns - totalRuns;
  const isProfitable = currentNetIncome >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Break-Even Analysis</h2>
          <p className="text-gray-600 mt-1">Calculate how many entries needed to cover costs</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Analysis'}
        </Button>
      </div>

      {/* Status Alert */}
      {totalRuns > 0 && (
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
                Need {runsNeeded} more run{runsNeeded !== 1 ? 's' : ''} to break even (${Math.abs(currentNetIncome).toFixed(2)} short)
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fixed Costs Section */}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hall Rental
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={data.hall_rental}
                  onChange={(e) => updateField('hall_rental', e.target.value)}
                  className="pl-7 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ribbons
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={data.ribbons}
                  onChange={(e) => updateField('ribbons', e.target.value)}
                  className="pl-7 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Insurance
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={data.insurance}
                  onChange={(e) => updateField('insurance', e.target.value)}
                  className="pl-7 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Other Fixed Costs
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={data.other_fixed_costs}
                  onChange={(e) => updateField('other_fixed_costs', e.target.value)}
                  className="pl-7 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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

        {/* Per-Run Rates Section */}
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
              <h3 className="font-semibold text-gray-900 border-b pb-2">Regular Runs</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entry Fee
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={data.regular_entry_fee}
                    onChange={(e) => updateField('regular_entry_fee', e.target.value)}
                    className="pl-7 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CWAGS Fee per Run
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={data.regular_cwags_fee}
                    onChange={(e) => updateField('regular_cwags_fee', e.target.value)}
                    className="pl-7 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Judge Fee per Run
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={data.regular_judge_fee}
                    onChange={(e) => updateField('regular_judge_fee', e.target.value)}
                    className="pl-7 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Net per Regular Run:</span>
                  <span className="font-bold text-green-700">
                    ${regularNetPerRun.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* FEO Runs */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 border-b pb-2">FEO Runs</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entry Fee
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={data.feo_entry_fee}
                    onChange={(e) => updateField('feo_entry_fee', e.target.value)}
                    className="pl-7 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CWAGS Fee per Run
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    value="0.00"
                    disabled
                    className="pl-7 w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">No CWAGS fee for FEO runs</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Judge Fee per Run
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={data.feo_judge_fee}
                    onChange={(e) => updateField('feo_judge_fee', e.target.value)}
                    className="pl-7 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Net per FEO Run:</span>
                  <span className="font-bold text-purple-700">
                    ${feoNetPerRun.toFixed(2)}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Status */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700 border-b pb-2">Current Entries</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Regular Runs:</span>
                  <span className="font-semibold">{regularRuns}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">FEO Runs:</span>
                  <span className="font-semibold">{feoRuns}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-sm font-semibold text-gray-700">Total Runs:</span>
                  <span className="font-bold text-lg">{totalRuns}</span>
                </div>
              </div>
            </div>

            {/* Revenue */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700 border-b pb-2">Revenue Analysis</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Regular Revenue:</span>
                  <span className="font-semibold text-green-700">${totalRegularRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">FEO Revenue:</span>
                  <span className="font-semibold text-purple-700">${totalFeoRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Fixed Costs:</span>
                  <span className="font-semibold text-red-700">-${totalFixedCosts.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-sm font-semibold text-gray-700">Net Income:</span>
                  <span className={`font-bold text-lg ${currentNetIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ${currentNetIncome.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Break-Even Target */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700 border-b pb-2">Break-Even Target</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Net per Run:</span>
                  <span className="font-semibold">${weightedAvgNetPerRun.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Runs Needed:</span>
                  <span className="font-semibold">{breakEvenRuns}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-sm font-semibold text-gray-700">Status:</span>
                  <span className={`font-bold text-lg ${isProfitable ? 'text-green-700' : 'text-orange-700'}`}>
                    {isProfitable ? '✓ Profitable' : `Need ${runsNeeded}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Progress Bar */}
          {totalRuns > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress to Break-Even</span>
                <span className="text-sm text-gray-600">
                  {totalRuns} / {breakEvenRuns} runs ({Math.min(100, Math.round((totalRuns / breakEvenRuns) * 100))}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    isProfitable ? 'bg-green-600' : 'bg-orange-600'
                  }`}
                  style={{ width: `${Math.min(100, (totalRuns / breakEvenRuns) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}