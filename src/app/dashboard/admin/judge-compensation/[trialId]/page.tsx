// src/app/dashboard/admin/judge-compensation/[trialId]/page.tsx
'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calculator, AlertCircle, Loader2, ArrowLeft, CheckCircle, DollarSign } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { isActiveSelection } from '@/lib/selectionStatus';

interface PricingInputs {
  standardEntryFee: string;
  cwagsPerRunFee: string;
  reducedEntryFee: string;
  judgePaymentPerRun: string;
}

interface HandlerEntry {
  handler_name: string;
  handler_email: string;
  cwags_number: string;
  total_runs: number;
}

interface JudgeReference {
  name: string;
  email: string;
}

interface SelectionSummary {
  entry_type: string | null;
  entry_status: string | null;
}

interface TrialHandlerRow {
  handler_name: string;
  handler_email: string | null;
  cwags_number: string;
  entry_selections: SelectionSummary[];
}

interface JudgedRoundRow {
  judge_name: string | null;
  entry_selections: SelectionSummary[];
}

const normalizePersonName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(judge|mr|mrs|ms|dr)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const editDistance = (left: string, right: string): number => {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    let diagonal = previous[0];
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const above = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
      diagonal = above;
    }
  }
  return previous[right.length];
};

const nameSimilarity = (leftValue: string, rightValue: string): number => {
  const left = normalizePersonName(leftValue);
  const right = normalizePersonName(rightValue);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if ((left.length >= 5 && right.includes(left)) || (right.length >= 5 && left.includes(right))) {
    return 0.96;
  }

  const leftTokens = left.split(' ');
  const rightTokens = right.split(' ');
  const leftLast = leftTokens[leftTokens.length - 1];
  const rightLast = rightTokens[rightTokens.length - 1];
  const sameLastName = leftLast === rightLast;
  const compatibleFirstName =
    leftTokens[0] === rightTokens[0] || leftTokens[0][0] === rightTokens[0][0];
  if (sameLastName && compatibleFirstName) return 0.94;

  const wholeNameScore = 1 - editDistance(left, right) / Math.max(left.length, right.length);
  const shorterTokens = leftTokens.length <= rightTokens.length ? leftTokens : rightTokens;
  const longerTokens = leftTokens.length <= rightTokens.length ? rightTokens : leftTokens;
  let bestWindowScore = wholeNameScore;
  for (let index = 0; index <= longerTokens.length - shorterTokens.length; index++) {
    const windowName = longerTokens.slice(index, index + shorterTokens.length).join(' ');
    const shorterName = shorterTokens.join(' ');
    bestWindowScore = Math.max(
      bestWindowScore,
      1 - editDistance(shorterName, windowName) / Math.max(shorterName.length, windowName.length)
    );
  }
  return bestWindowScore;
};

const bestNameMatch = <T extends { name: string }>(
  sourceName: string,
  candidates: T[]
): T | null => {
  const ranked = candidates
    .map((candidate) => ({ candidate, score: nameSimilarity(sourceName, candidate.name) }))
    .sort((a, b) => b.score - a.score);
  if (!ranked[0] || ranked[0].score < 0.78) return null;
  if (ranked[1] && ranked[0].score - ranked[1].score < 0.08 && ranked[0].score < 0.94) {
    return null;
  }
  return ranked[0].candidate;
};

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
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const trialId = params.trialId as string;

  const [step, setStep] = useState(1); // 1: Pricing, 2: Select Judges, 3: Match, 4: Results
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [trialName, setTrialName] = useState('');
  const [pricing, setPricing] = useState<PricingInputs>({
    standardEntryFee: '',
    cwagsPerRunFee: '',
    reducedEntryFee: '',
    judgePaymentPerRun: '',
  });

  const [handlers, setHandlers] = useState<HandlerEntry[]>([]);
  const [judgeNames, setJudgeNames] = useState<string[]>([]);
  const [judgeMatches, setJudgeMatches] = useState<Map<string, string | null>>(new Map());
  const [competingJudgeNames, setCompetingJudgeNames] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<JudgeData[]>([]);

  const loadTrialData = useCallback(async () => {
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
        .select(
          `
          judge_name,
          trial_classes!inner(
            trial_days!inner(
              trial_id
            )
          )
        `
        )
        .eq('trial_classes.trial_days.trial_id', trialId);

      if (roundsError) throw roundsError;

      // Get all handlers and their run counts
      const { data: entries, error: entriesError } = await supabase
        .from('entries')
        .select(
          `
          handler_name,
          handler_email,
          cwags_number,
          entry_selections!entry_selections_entry_id_fkey!inner(
            entry_type,
            entry_status
          )
        `
        )
        .eq('trial_id', trialId);

      if (entriesError) throw entriesError;

      const { data: judgeReferences, error: judgesError } = await supabase
        .from('judges')
        .select('name,email')
        .eq('is_active', true);
      if (judgesError) {
        console.warn('Judge reference table could not be loaded; matching by round names only.');
      }
      const activeJudges = (judgeReferences || []) as JudgeReference[];

      // Aggregate runs per handler (sum across ALL their dogs)
      const handlerMap = new Map<string, HandlerEntry>();

      (entries as TrialHandlerRow[]).forEach((entry) => {
        const handlerName = entry.handler_name;
        if (!handlerMap.has(handlerName)) {
          handlerMap.set(handlerName, {
            handler_name: entry.handler_name,
            handler_email: entry.handler_email || '',
            cwags_number: entry.cwags_number, // Store one for display
            total_runs: 0,
          });
        }

        // Count valid runs (not FEO, not withdrawn)
        const validRuns = entry.entry_selections.filter(
          (sel) =>
            sel.entry_type?.toLowerCase() !== 'feo' &&
            isActiveSelection(sel.entry_status)
        ).length;

        handlerMap.get(handlerName)!.total_runs += validRuns;
      });

      const loadedHandlers = Array.from(handlerMap.values()).sort((a, b) =>
        a.handler_name.localeCompare(b.handler_name)
      );
      const roundJudgeNames = [
        ...new Set(rounds.map((round) => round.judge_name).filter((name) => name?.trim())),
      ];
      const canonicalJudgeNames = [
        ...new Set(
          roundJudgeNames.map(
            (roundJudgeName) => bestNameMatch(roundJudgeName, activeJudges)?.name || roundJudgeName
          )
        ),
      ].sort();
      const automaticMatches = new Map<string, string | null>();

      canonicalJudgeNames.forEach((judgeName) => {
        const judgeReference =
          activeJudges.find(
            (judge) => normalizePersonName(judge.name) === normalizePersonName(judgeName)
          ) || bestNameMatch(judgeName, activeJudges);
        const matchingEmail = judgeReference?.email?.trim().toLowerCase();
        const emailHandler = matchingEmail
          ? loadedHandlers.find(
              (handler) => handler.handler_email.trim().toLowerCase() === matchingEmail
            )
          : undefined;
        const nameHandler = bestNameMatch(
          judgeReference?.name || judgeName,
          loadedHandlers.map((handler) => ({ ...handler, name: handler.handler_name }))
        );
        const matchedHandler = emailHandler || nameHandler;
        automaticMatches.set(judgeName, matchedHandler?.handler_name || null);
      });

      setJudgeNames(canonicalJudgeNames);
      setJudgeMatches(automaticMatches);
      setCompetingJudgeNames(
        new Set(
          Array.from(automaticMatches.entries())
            .filter(([, handlerName]) => handlerName !== null)
            .map(([judgeName]) => judgeName)
        )
      );
      setHandlers(loadedHandlers);
    } catch (err) {
      console.error('Error loading trial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trial data');
    } finally {
      setLoading(false);
    }
  }, [supabase, trialId]);

  useEffect(() => {
    if (user?.role === 'administrator') {
      void loadTrialData();
    } else {
      setLoading(false);
    }
  }, [loadTrialData, user?.role]);

  if (user?.role !== 'administrator') {
    return (
      <MainLayout title="Access Denied">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Only administrators can access this feature.</AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  const handlePricingSubmit = () => {
    // Validate all pricing inputs
    const { standardEntryFee, cwagsPerRunFee, reducedEntryFee, judgePaymentPerRun } = pricing;

    if (!standardEntryFee || !cwagsPerRunFee || !reducedEntryFee || !judgePaymentPerRun) {
      setError('All pricing fields are required');
      return;
    }

    if (
      parseFloat(standardEntryFee) <= 0 ||
      parseFloat(cwagsPerRunFee) <= 0 ||
      parseFloat(reducedEntryFee) <= 0 ||
      parseFloat(judgePaymentPerRun) <= 0
    ) {
      setError('All prices must be greater than zero');
      return;
    }

    setError(null);
    setStep(2);
  };

  const toggleJudgeSelection = (judgeName: string) => {
    setCompetingJudgeNames((previous) => {
      const next = new Set(previous);
      if (next.has(judgeName)) {
        next.delete(judgeName);
        setJudgeMatches((matches) => new Map(matches).set(judgeName, null));
      } else {
        next.add(judgeName);
        const suggestedHandler = bestNameMatch(
          judgeName,
          handlers.map((handler) => ({ ...handler, name: handler.handler_name }))
        );
        if (suggestedHandler) {
          setJudgeMatches((matches) =>
            new Map(matches).set(judgeName, suggestedHandler.handler_name)
          );
        }
      }
      return next;
    });
  };

  const handleJudgeSelectionSubmit = () => {
    setError(null);
    setStep(3);
  };

  const getSuggestedMatches = (judgeName: string): string[] => {
    const currentMatch = judgeMatches.get(judgeName);
    const suggestions = handlers
      .map((handler) => ({
        name: handler.handler_name,
        score: nameSimilarity(judgeName, handler.handler_name),
      }))
      .filter((candidate) => candidate.score >= 0.65 || candidate.name === currentMatch)
      .sort((a, b) => b.score - a.score)
      .map((candidate) => candidate.name)
      .slice(0, 3);
    if (currentMatch && !suggestions.includes(currentMatch)) suggestions.unshift(currentMatch);
    return suggestions.slice(0, 3);
  };

  const selectMatch = (judgeName: string, handlerName: string | null) => {
    setJudgeMatches((prev) => new Map(prev).set(judgeName, handlerName));
  };

  const handleMatchingSubmit = async () => {
    const unmatchedCompetingJudges = Array.from(competingJudgeNames).filter(
      (judgeName) => !judgeMatches.get(judgeName)
    );
    if (unmatchedCompetingJudges.length > 0) {
      setError(`Choose a handler match for: ${unmatchedCompetingJudges.join(', ')}`);
      return;
    }
    setLoading(true);
    try {
      // Calculate runs judging for each judge
      const { data: rounds, error: roundsError } = await supabase
        .from('trial_rounds')
        .select(
          `
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
        `
        )
        .eq('trial_classes.trial_days.trial_id', trialId);

      if (roundsError) throw roundsError;

      // Count valid entries per judge
      const judgeRunCounts = new Map<string, number>();

      (rounds as JudgedRoundRow[]).forEach((round) => {
        const rawJudgeName = round.judge_name;
        if (!rawJudgeName) return;
        const judgeName =
          bestNameMatch(
            rawJudgeName,
            judgeNames.map((name) => ({ name }))
          )?.name || rawJudgeName;

        const validEntries = round.entry_selections.filter(
          (sel) =>
            sel.entry_type?.toLowerCase() !== 'feo' &&
            isActiveSelection(sel.entry_status)
        ).length;

        judgeRunCounts.set(judgeName, (judgeRunCounts.get(judgeName) || 0) + validEntries);
      });

      // Calculate results for each judge
      const calculatedResults: JudgeData[] = [];
      const prices = {
        standard: parseFloat(pricing.standardEntryFee),
        cwags: parseFloat(pricing.cwagsPerRunFee),
        reduced: parseFloat(pricing.reducedEntryFee),
        payment: parseFloat(pricing.judgePaymentPerRun),
      };

      judgeMatches.forEach((handlerName, judgeName) => {
        const runsJudging = judgeRunCounts.get(judgeName) || 0;
        let runsCompeting = 0;

        if (handlerName) {
          const handler = handlers.find((h) => h.handler_name === handlerName);
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
          savings,
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

  const totals = results.reduce(
    (acc, r) => ({
      runsCompeting: acc.runsCompeting + r.runsCompeting,
      runsJudging: acc.runsJudging + r.runsJudging,
      scenarioAWaiveCost: acc.scenarioAWaiveCost + r.scenarioAWaiveCost,
      scenarioBReducedPayNet: acc.scenarioBReducedPayNet + r.scenarioBReducedPayNet,
      savings: acc.savings + r.savings,
    }),
    {
      runsCompeting: 0,
      runsJudging: 0,
      scenarioAWaiveCost: 0,
      scenarioBReducedPayNet: 0,
      savings: 0,
    }
  );

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

        <Button variant="outline" onClick={() => router.push('/dashboard')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step >= s ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {s}
              </div>
              {s < 4 && (
                <div className={`w-12 h-1 ${step > s ? 'bg-orange-600' : 'bg-gray-200'}`} />
              )}
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
            <CardDescription>Enter the pricing details for this trial</CardDescription>
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
                  onChange={(e) =>
                    setPricing((prev) => ({ ...prev, standardEntryFee: e.target.value }))
                  }
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
                  onChange={(e) =>
                    setPricing((prev) => ({ ...prev, cwagsPerRunFee: e.target.value }))
                  }
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
                  onChange={(e) =>
                    setPricing((prev) => ({ ...prev, reducedEntryFee: e.target.value }))
                  }
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
                  onChange={(e) =>
                    setPricing((prev) => ({ ...prev, judgePaymentPerRun: e.target.value }))
                  }
                />
              </div>
            </div>

            <Button
              onClick={handlePricingSubmit}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
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
              Check the judges who are also entered as handlers. Matches found by email or name are
              checked automatically ({competingJudgeNames.size} competing)
              <br />
              <span className="text-xs text-gray-500">
                Note: If a handler has multiple dogs, all their runs are summed together
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Competing</TableHead>
                      <TableHead>Judge from Trial</TableHead>
                      <TableHead>Matched Handler</TableHead>
                      <TableHead className="text-right">Runs Competing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {judgeNames.map((judgeName) => {
                      const handlerName = judgeMatches.get(judgeName);
                      const handler = handlers.find(
                        (candidate) => candidate.handler_name === handlerName
                      );
                      return (
                        <TableRow key={judgeName}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={competingJudgeNames.has(judgeName)}
                              onChange={() => toggleJudgeSelection(judgeName)}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{judgeName}</TableCell>
                          <TableCell className="text-gray-600">
                            {handler?.handler_name || 'Not matched'}
                          </TableCell>
                          <TableCell className="text-right">{handler?.total_runs || 0}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
              </Table>
            </div>

            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={handleJudgeSelectionSubmit}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
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
              Confirm the automatically matched handler entry for each judge
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {judgeNames.filter((judgeName) => competingJudgeNames.has(judgeName)).map((judgeName) => {
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
                              variant={currentMatch === suggestion ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => selectMatch(judgeName, suggestion)}
                              className={
                                currentMatch === suggestion
                                  ? 'bg-orange-600 hover:bg-orange-700'
                                  : ''
                              }
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">No matching handler entries found</p>
                      )}

                      <Button
                        variant={currentMatch === null ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          selectMatch(judgeName, null);
                          setCompetingJudgeNames((previous) => {
                            const next = new Set(previous);
                            next.delete(judgeName);
                            return next;
                          });
                        }}
                        className={currentMatch === null ? 'bg-gray-600 hover:bg-gray-700' : ''}
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
                <p>
                  <strong>Runs Competing:</strong> Total runs across all dogs for this judge
                  (excludes FEO and withdrawn)
                </p>
                <p>
                  <strong>Runs Judging:</strong> Total entries in all rounds this person is judging
                </p>
                <p>
                  <strong>Waive Cost:</strong> Cost if the judge does not pay (CWAGS fees only) =
                  -(Runs
                  × ${pricing.cwagsPerRunFee})
                </p>
                <p>
                  <strong>Reduced+Pay Net:</strong> (Runs × ${pricing.reducedEntryFee}) - (Runs × $
                  {pricing.cwagsPerRunFee}) - (Runs Judged × ${pricing.judgePaymentPerRun})
                </p>
                <p className="pt-2 font-semibold">
                  <strong>Savings:</strong> Positive = Reduced+Pay saves money | Negative = Waive is
                  cheaper
                </p>
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
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(result.scenarioAWaiveCost)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${result.scenarioBReducedPayNet >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {formatCurrency(result.scenarioBReducedPayNet)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${result.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {formatCurrency(result.savings)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals Row */}
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell colSpan={2}>TOTALS</TableCell>
                    <TableCell className="text-right">{totals.runsCompeting}</TableCell>
                    <TableCell className="text-right">{totals.runsJudging}</TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(totals.scenarioAWaiveCost)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${totals.scenarioBReducedPayNet >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(totals.scenarioBReducedPayNet)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${totals.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
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
                  <>
                    Using the <strong>reduced rate + payment</strong> model would save you{' '}
                    <strong>{formatCurrency(totals.savings)}</strong> compared to waiving fees.
                  </>
                ) : (
                  <>
                    Waiving fees would save you{' '}
                    <strong>{formatCurrency(Math.abs(totals.savings))}</strong> compared to the
                    reduced rate + payment model.
                  </>
                )}
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setStep(1);
                setPricing({
                  standardEntryFee: '',
                  cwagsPerRunFee: '',
                  reducedEntryFee: '',
                  judgePaymentPerRun: '',
                });
                setHandlers((prev) => prev.map((h) => ({ ...h, isJudge: false })));
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
