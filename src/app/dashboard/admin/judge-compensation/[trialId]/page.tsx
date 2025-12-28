// src/app/dashboard/admin/judge-compensation/[trialId]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Calculator, 
  AlertCircle, 
  Loader2,
  ArrowLeft,
  CheckCircle,
  DollarSign
} from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

interface PricingInputs {
  standardEntryFee: string;
  cwagsPerRunFee: string;
  reducedEntryFee: string;
  judgePaymentPerRun: string;
}

interface HandlerEntry {
  handler_name: string;
  cwags_number: string;
  total_runs: number;
  isJudge: boolean;
}

interface JudgeData {
  judgeName: string;
  handlerName: string | null;
  runsCompeting: number;
  runsJudging: number;
  scenarioAWaiveCost: number;
  scenarioBReducedPayNet: number;
  savings: number;
}

export default function JudgeCompensationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const supabase = getSupabaseBrowser();
  const trialId = params.trialId as string;

  const [step, setStep] = useState(1); // 1: Pricing, 2: Select Judges, 3: Match, 4: Results
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [trialName, setTrialName] = useState('');
  const [pricing, setPricing] = useState<PricingInputs>({
    standardEntryFee: '',
    cwagsPerRunFee: '',
    reducedEntryFee: '',
    judgePaymentPerRun: ''
  });
  
  const [handlers, setHandlers] = useState<HandlerEntry[]>([]);
  const [judgeNames, setJudgeNames] = useState<string[]>([]);
  const [judgeMatches, setJudgeMatches] = useState<Map<string, string | null>>(new Map());
  const [results, setResults] = useState<JudgeData[]>([]);

  // Load data - always call this hook
  useEffect(() => {
    if (user?.role === 'administrator') {
      loadTrialData();
    } else {
      setLoading(false);
    }
  }, [trialId, user]);

  // Admin-only access check - AFTER all hooks
  if (user?.role !== 'administrator') {
    return (
      <MainLayout title="Access Denied">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Only administrators can access this feature.
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  const loadTrialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get trial info
      const { data: trial, error: trialError } = await supabase
        .from('trials')
        .select('trial_name')
        .eq('id', trialId)
        .single();

      if (trialError) throw trialError;
      setTrialName(trial.trial_name);

      // Get all unique judges from trial rounds
      const { data: rounds, error: roundsError } = await supabase
        .from('trial_rounds')
        .select(`
          judge_name,
          trial_classes!inner(
            trial_days!inner(
              trial_id
            )
          )
        `)
        .eq('trial_classes.trial_days.trial_id', trialId);

      if (roundsError) throw roundsError;

      const uniqueJudges = [...new Set(
        rounds
          .map(r => r.judge_name)
          .filter(name => name && name.trim() !== '')
      )].sort();

      setJudgeNames(uniqueJudges);

      // Get all handlers and their run counts
      const { data: entries, error: entriesError } = await supabase
        .from('entries')
        .select(`
          handler_name,
          cwags_number,
          entry_selections!inner(
            entry_type,
            entry_status
          )
        `)
        .eq('trial_id', trialId);

      if (entriesError) throw entriesError;

      // Aggregate runs per handler (sum across ALL their dogs)
      const handlerMap = new Map<string, HandlerEntry>();
      
      entries.forEach((entry: any) => {
        const handlerName = entry.handler_name;
        if (!handlerMap.has(handlerName)) {
          handlerMap.set(handlerName, {
            handler_name: entry.handler_name,
            cwags_number: entry.cwags_number, // Store one for display
            total_runs: 0,
            isJudge: false
          });
        }
        
        // Count valid runs (not FEO, not withdrawn)
        const validRuns = entry.entry_selections.filter((sel: any) => 
          sel.entry_type?.toLowerCase() !== 'feo' && 
          sel.entry_status?.toLowerCase() !== 'withdrawn'
        ).length;
        
        handlerMap.get(handlerName)!.total_runs += validRuns;
      });

      setHandlers(Array.from(handlerMap.values()).sort((a, b) => 
        a.handler_name.localeCompare(b.handler_name)
      ));

    } catch (err) {
      console.error('Error loading trial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trial data');
    } finally {
      setLoading(false);
    }
  };

  const handlePricingSubmit = () => {
    // Validate all pricing inputs
    const { standardEntryFee, cwagsPerRunFee, reducedEntryFee, judgePaymentPerRun } = pricing;
    
    if (!standardEntryFee || !cwagsPerRunFee || !reducedEntryFee || !judgePaymentPerRun) {
      setError('All pricing fields are required');
      return;
    }

    if (parseFloat(standardEntryFee) <= 0 || parseFloat(cwagsPerRunFee) <= 0 || 
        parseFloat(reducedEntryFee) <= 0 || parseFloat(judgePaymentPerRun) <= 0) {
      setError('All prices must be greater than zero');
      return;
    }

    setError(null);
    setStep(2);
  };

  const toggleJudgeSelection = (handler_name: string) => {
    setHandlers(prev => prev.map(h => 
      h.handler_name === handler_name ? { ...h, isJudge: !h.isJudge } : h
    ));
  };

  const handleJudgeSelectionSubmit = () => {
    const selectedJudges = handlers.filter(h => h.isJudge);
    if (selectedJudges.length === 0) {
      setError('Please select at least one judge');
      return;
    }
    setError(null);
    setStep(3);
  };

  const getSuggestedMatches = (judgeName: string): string[] => {
    const lowerJudge = judgeName.toLowerCase();
    
    return handlers
      .filter(h => h.isJudge)
      .filter(h => {
        const lowerHandler = h.handler_name.toLowerCase();
        // Exact match
        if (lowerHandler === lowerJudge) return true;
        // Judge name appears in handler name (e.g., "Lane Michie" in "Nina and Lane Michie")
        if (lowerHandler.includes(lowerJudge)) return true;
        // Handler name appears in judge name
        if (lowerJudge.includes(lowerHandler)) return true;
        return false;
      })
      .map(h => h.handler_name)
      .slice(0, 3); // Top 3 suggestions
  };

  const selectMatch = (judgeName: string, handlerName: string | null) => {
    setJudgeMatches(prev => new Map(prev).set(judgeName, handlerName));
  };

  const handleMatchingSubmit = async () => {
    setLoading(true);
    try {
      // Calculate runs judging for each judge
      const { data: rounds, error: roundsError } = await supabase
        .from('trial_rounds')
        .select(`
          id,
          judge_name,
          entry_selections!inner(
            entry_type,
            entry_status
          ),
          trial_classes!inner(
            trial_days!inner(
              trial_id
            )
          )
        `)
        .eq('trial_classes.trial_days.trial_id', trialId);

      if (roundsError) throw roundsError;

      // Count valid entries per judge
      const judgeRunCounts = new Map<string, number>();
      
      rounds.forEach((round: any) => {
        const judgeName = round.judge_name;
        if (!judgeName) return;
        
        const validEntries = round.entry_selections.filter((sel: any) =>
          sel.entry_type?.toLowerCase() !== 'feo' &&
          sel.entry_status?.toLowerCase() !== 'withdrawn'
        ).length;
        
        judgeRunCounts.set(
          judgeName,
          (judgeRunCounts.get(judgeName) || 0) + validEntries
        );
      });

      // Calculate results for each judge
      const calculatedResults: JudgeData[] = [];
      const prices = {
        standard: parseFloat(pricing.standardEntryFee),
        cwags: parseFloat(pricing.cwagsPerRunFee),
        reduced: parseFloat(pricing.reducedEntryFee),
        payment: parseFloat(pricing.judgePaymentPerRun)
      };

      judgeMatches.forEach((handlerName, judgeName) => {
        const runsJudging = judgeRunCounts.get(judgeName) || 0;
        let runsCompeting = 0;
        
        if (handlerName) {
          const handler = handlers.find(h => h.handler_name === handlerName);
          runsCompeting = handler?.total_runs || 0;
        }

        // Scenario A: Waive fees
        const scenarioAWaiveCost = -(runsCompeting * prices.cwags);

        // Scenario B: Reduced rate + payment
        const revenueFromEntries = runsCompeting * prices.reduced;
        const cwagsExpense = runsCompeting * prices.cwags;
        const judgePayment = runsJudging * prices.payment;
        const scenarioBReducedPayNet = revenueFromEntries - cwagsExpense - judgePayment;

        const savings = scenarioBReducedPayNet - scenarioAWaiveCost;

        calculatedResults.push({
          judgeName,
          handlerName,
          runsCompeting,
          runsJudging,
          scenarioAWaiveCost,
          scenarioBReducedPayNet,
          savings
        });
      });

      setResults(calculatedResults.sort((a, b) => b.savings - a.savings));
      setStep(4);

    } catch (err) {
      console.error('Error calculating results:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate results');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    const absValue = Math.abs(value);
    const formatted = `$${absValue.toFixed(2)}`;
    return value < 0 ? `-${formatted}` : formatted;
  };

  const totals = results.reduce((acc, r) => ({
    runsCompeting: acc.runsCompeting + r.runsCompeting,
    runsJudging: acc.runsJudging + r.runsJudging,
    scenarioAWaiveCost: acc.scenarioAWaiveCost + r.scenarioAWaiveCost,
    scenarioBReducedPayNet: acc.scenarioBReducedPayNet + r.scenarioBReducedPayNet,
    savings: acc.savings + r.savings
  }), { runsCompeting: 0, runsJudging: 0, scenarioAWaiveCost: 0, scenarioBReducedPayNet: 0, savings: 0 });

  if (loading && step === 1) {
    return (
      <MainLayout title="Judge Compensation Analysis">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Judge Compensation Analysis">
      <div className="mb-6">
        {trialName && (
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{trialName}</h2>
          </div>
        )}
        
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= s ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {s}
              </div>
              {s < 4 && <div className={`w-12 h-1 ${step > s ? 'bg-orange-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Pricing Inputs */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-600" />
              Step 1: Enter Pricing Information
            </CardTitle>
            <CardDescription>
              Enter the pricing details for this trial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="standardEntryFee">Standard Entry Fee (per run)</Label>
                <Input
                  id="standardEntryFee"
                  type="number"
                  step="0.01"
                  placeholder="22.00"
                  value={pricing.standardEntryFee}
                  onChange={(e) => setPricing(prev => ({ ...prev, standardEntryFee: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="cwagsPerRunFee">CWAGS Per-Run Fee</Label>
                <Input
                  id="cwagsPerRunFee"
                  type="number"
                  step="0.01"
                  placeholder="3.00"
                  value={pricing.cwagsPerRunFee}
                  onChange={(e) => setPricing(prev => ({ ...prev, cwagsPerRunFee: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="reducedEntryFee">Reduced Entry Fee for Judges (per run)</Label>
                <Input
                  id="reducedEntryFee"
                  type="number"
                  step="0.01"
                  placeholder="15.00"
                  value={pricing.reducedEntryFee}
                  onChange={(e) => setPricing(prev => ({ ...prev, reducedEntryFee: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="judgePaymentPerRun">Judge Payment (per run judged)</Label>
                <Input
                  id="judgePaymentPerRun"
                  type="number"
                  step="0.01"
                  placeholder="2.50"
                  value={pricing.judgePaymentPerRun}
                  onChange={(e) => setPricing(prev => ({ ...prev, judgePaymentPerRun: e.target.value }))}
                />
              </div>
            </div>
            
            <Button onClick={handlePricingSubmit} className="w-full bg-orange-600 hover:bg-orange-700">
              Continue to Judge Selection
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Judges */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-orange-600" />
              Step 2: Select Which Handlers are Judges
            </CardTitle>
            <CardDescription>
              Check all handlers who are judging at this trial ({handlers.filter(h => h.isJudge).length} selected)
              <br />
              <span className="text-xs text-gray-500">Note: If a handler has multiple dogs, all their runs are summed together</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Judge</TableHead>
                    <TableHead>Handler Name</TableHead>
                    <TableHead>C-WAGS Number</TableHead>
                    <TableHead className="text-right">Runs Competing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {handlers.map((handler) => (
                    <TableRow key={handler.handler_name}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={handler.isJudge}
                          onChange={() => toggleJudgeSelection(handler.handler_name)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{handler.handler_name}</TableCell>
                      <TableCell className="text-gray-600">{handler.cwags_number}</TableCell>
                      <TableCell className="text-right">{handler.total_runs}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleJudgeSelectionSubmit} className="flex-1 bg-orange-600 hover:bg-orange-700">
                Continue to Matching
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Match Judges to Handlers */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-orange-600" />
              Step 3: Match Judge Names to Handler Entries
            </CardTitle>
            <CardDescription>
              Confirm which handler entry belongs to each judge
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {judgeNames.map((judgeName) => {
                const suggestions = getSuggestedMatches(judgeName);
                const currentMatch = judgeMatches.get(judgeName);
                
                return (
                  <div key={judgeName} className="border rounded-lg p-4">
                    <div className="font-semibold mb-2">Judge: {judgeName}</div>
                    
                    <div className="flex flex-wrap gap-2">
                      {suggestions.length > 0 ? (
                        <>
                          {suggestions.map((suggestion) => (
                            <Button
                              key={suggestion}
                              variant={currentMatch === suggestion ? "default" : "outline"}
                              size="sm"
                              onClick={() => selectMatch(judgeName, suggestion)}
                              className={currentMatch === suggestion ? "bg-orange-600 hover:bg-orange-700" : ""}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">No matching handler entries found</p>
                      )}
                      
                      <Button
                        variant={currentMatch === null ? "default" : "outline"}
                        size="sm"
                        onClick={() => selectMatch(judgeName, null)}
                        className={currentMatch === null ? "bg-gray-600 hover:bg-gray-700" : ""}
                      >
                        Not Competing
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button 
                onClick={handleMatchingSubmit} 
                disabled={loading}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  'Calculate Comparison'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Results */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-orange-600" />
              Compensation Analysis Results
            </CardTitle>
            <CardDescription>
              Comparison of waiving fees vs. reduced rate with payment
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Explanation Box */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-sm mb-2">Understanding the Columns:</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Runs Competing:</strong> Total runs across all dogs for this judge (excludes FEO and withdrawn)</p>
                <p><strong>Runs Judging:</strong> Total entries in all rounds this person is judging</p>
                <p><strong>Waive Cost:</strong> Cost if judge doesn't pay (CWAGS fees only) = -(Runs × ${pricing.cwagsPerRunFee})</p>
                <p><strong>Reduced+Pay Net:</strong> (Runs × ${pricing.reducedEntryFee}) - (Runs × ${pricing.cwagsPerRunFee}) - (Runs Judged × ${pricing.judgePaymentPerRun})</p>
                <p className="pt-2 font-semibold"><strong>Savings:</strong> Positive = Reduced+Pay saves money | Negative = Waive is cheaper</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judge Name</TableHead>
                    <TableHead>Handler Name</TableHead>
                    <TableHead className="text-right">Runs Competing</TableHead>
                    <TableHead className="text-right">Runs Judging</TableHead>
                    <TableHead className="text-right">Waive Cost</TableHead>
                    <TableHead className="text-right">Reduced+Pay Net</TableHead>
                    <TableHead className="text-right">Savings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{result.judgeName}</TableCell>
                      <TableCell>{result.handlerName || 'Not Competing'}</TableCell>
                      <TableCell className="text-right">{result.runsCompeting}</TableCell>
                      <TableCell className="text-right">{result.runsJudging}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(result.scenarioAWaiveCost)}</TableCell>
                      <TableCell className={`text-right ${result.scenarioBReducedPayNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(result.scenarioBReducedPayNet)}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${result.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(result.savings)}
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Totals Row */}
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell colSpan={2}>TOTALS</TableCell>
                    <TableCell className="text-right">{totals.runsCompeting}</TableCell>
                    <TableCell className="text-right">{totals.runsJudging}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(totals.scenarioAWaiveCost)}</TableCell>
                    <TableCell className={`text-right ${totals.scenarioBReducedPayNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(totals.scenarioBReducedPayNet)}
                    </TableCell>
                    <TableCell className={`text-right ${totals.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(totals.savings)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            
            {/* Summary */}
            <div className="mt-6 p-4 bg-orange-50 rounded-lg">
              <h3 className="font-semibold mb-2">Summary</h3>
              <p className="text-sm text-gray-700">
                {totals.savings >= 0 ? (
                  <>Using the <strong>reduced rate + payment</strong> model would save you <strong>{formatCurrency(totals.savings)}</strong> compared to waiving fees.</>
                ) : (
                  <>Waiving fees would save you <strong>{formatCurrency(Math.abs(totals.savings))}</strong> compared to the reduced rate + payment model.</>
                )}
              </p>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => {
                setStep(1);
                setPricing({ standardEntryFee: '', cwagsPerRunFee: '', reducedEntryFee: '', judgePaymentPerRun: '' });
                setHandlers(prev => prev.map(h => ({ ...h, isJudge: false })));
                setJudgeMatches(new Map());
                setResults([]);
              }}
              className="w-full mt-4"
            >
              Start New Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </MainLayout>
  );
}