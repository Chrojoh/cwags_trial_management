'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { generateCloseToTitlesReport, type DogCloseToTitle } from '@/lib/closeToTitlesAnalyzer';
import {
  CENTAUR_2026_PRODUCTS,
  ribbonProduct,
  ribbonUnitPrice,
  type RibbonCurrency,
} from '@/lib/centaurRibbonCatalog';
import {
  buildTitleConfirmationWorkbook,
  type TitleConfirmationExportRow,
} from '@/lib/titleConfirmationWorkbook';

type AwardKey = 'q' | 'placement' | 'highClass' | 'highTrial' | 'title' | `ace${number}`;
type QuestionnaireItem = { enabled: boolean; productCode: string; quantity: number };
type Questionnaire = Record<string, QuestionnaireItem>;
interface PassResult {
  selectionId: string;
  cwagsNumber: string;
  dogName: string;
  handlerName: string;
  className: string;
  judgeName: string;
  gamesSubclass?: string;
}
interface LiveData {
  trial: { trial_name: string };
  automaticCurrency: RibbonCurrency;
  activeRegularRuns: number;
  scoredRuns: number;
  passResults: PassResult[];
  config: any;
  clubProfile?: any;
  setupRequired?: boolean;
  canManageFinancials: boolean;
}

const defaults: Questionnaire = {
  q: { enabled: true, productCode: 'CF7', quantity: 0 },
  placement: { enabled: false, productCode: '101', quantity: 0 },
  highClass: { enabled: false, productCode: '203', quantity: 0 },
  highTrial: { enabled: false, productCode: '305', quantity: 0 },
  title: { enabled: true, productCode: '203', quantity: 0 },
  ace1: { enabled: true, productCode: '307', quantity: 0 },
  ace2: { enabled: true, productCode: '307', quantity: 0 },
  ace3: { enabled: true, productCode: '307', quantity: 0 },
};

const labels: Record<string, string> = {
  q: 'Qualifying ribbons',
  placement: 'Placement rosettes',
  highClass: 'High in Class',
  highTrial: 'High in Trial',
  title: 'Titles',
};

function awardLabel(key: string) {
  if (!key.startsWith('ace')) return labels[key] || key;
  const level = Number(key.slice(3)) || 1;
  return level === 1 ? 'Ace' : `Ace ${level}`;
}

function candidateKey(kind: 'title' | 'ace', dog: DogCloseToTitle) {
  return `${kind}:${dog.cwagsNumber}:${dog.className}:${kind === 'ace' ? dog.aceNumber : 0}`;
}

function uniqueJudgeNames(names: Array<string | undefined>) {
  return Array.from(new Set(names.map((name) => name?.trim()).filter(Boolean) as string[])).sort(
    (a, b) => a.localeCompare(b)
  );
}

export default function RibbonExpenseEstimator({
  trialId,
  awardsOnly = false,
  exportOnly = false,
}: {
  trialId: string;
  awardsOnly?: boolean;
  exportOnly?: boolean;
}) {
  const [live, setLive] = useState<LiveData | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire>(defaults);
  const [currency, setCurrency] = useState<RibbonCurrency>('CAD');
  const [expectedPassRate, setExpectedPassRate] = useState(50);
  const [shipping, setShipping] = useState(0);
  const [tax, setTax] = useState(0);
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [titleCandidates, setTitleCandidates] = useState<DogCloseToTitle[]>([]);
  const [aceCandidates, setAceCandidates] = useState<DogCloseToTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const headers = async () => {
    const { data } = await getSupabaseBrowser().auth.getSession();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token || ''}`,
    };
  };
  const load = async () => {
    setLoading(true);
    setMessage('');
    try {
      const auth = await headers();
      const [liveResponse, trackerResponse] = await Promise.all([
        fetch(`/api/trials/${trialId}/ribbon-estimate`, { headers: auth, cache: 'no-store' }),
        fetch(`/api/trials/${trialId}/close-to-titles`, { headers: auth, cache: 'no-store' }),
      ]);
      const data = await liveResponse.json();
      if (!liveResponse.ok) throw new Error(data.error || 'Unable to load ribbon estimate');
      setLive(data);
      setCurrency(data.config?.currency || data.automaticCurrency);
      setExpectedPassRate(Number(data.config?.expected_pass_rate ?? 50));
      setShipping(Number(data.config?.shipping_estimate || 0));
      setTax(Number(data.config?.tax_estimate || 0));
      const clubSelections = Object.fromEntries(
        Object.entries(data.clubProfile?.questionnaire || {}).map(([award, value]) => {
          const selection = (value || {}) as Partial<QuestionnaireItem>;
          return [
            award,
            {
              enabled: selection.enabled !== false,
              productCode: selection.productCode || '307',
              quantity: 0,
            },
          ];
        })
      );
      const saved = data.config?.questionnaire || clubSelections;
      const legacyAce = saved.ace;
      const { ace: _ignoredLegacyAce, ...currentSaved } = saved;
      setQuestionnaire({
        ...defaults,
        ...currentSaved,
        ...(legacyAce && !currentSaved.ace1 ? { ace1: legacyAce } : {}),
      });
      const savedConfirmed: string[] = Array.isArray(data.config?.confirmed_awards)
        ? data.config.confirmed_awards
        : [];
      const savedDismissed: string[] = Array.isArray(data.config?.dismissed_awards)
        ? data.config.dismissed_awards
        : [];
      setDismissed(savedDismissed);
      if (trackerResponse.ok) {
        const source = await trackerResponse.json();
        const report = await generateCloseToTitlesReport(trialId, source);
        const passes: PassResult[] = data.passResults || [];
        const matching = (dog: DogCloseToTitle) =>
          passes.filter((p) => p.cwagsNumber === dog.cwagsNumber && p.className === dog.className);
        const titleThresholdCandidates = report.allDogs.filter((d) => !d.hasTitle).filter((d) => {
          const p = matching(d);
          return p.length >= d.qsNeededForTitle;
        });
        const earnedAces = report.closeToAces.filter(
          (d) => matching(d).length >= d.qsNeededForNextAce
        );
        setTitleCandidates(titleThresholdCandidates);
        setAceCandidates(earnedAces);
        const detected = [
          ...titleThresholdCandidates
            .filter((dog) => {
              const trialPasses = matching(dog);
              const combinedJudges = uniqueJudgeNames([
                ...dog.currentJudgeNames,
                ...trialPasses.map((pass) => pass.judgeName),
              ]);
              const trialGames = new Set(
                trialPasses.map((pass) => pass.gamesSubclass).filter(Boolean)
              ).size;
              return (
                combinedJudges.length >= dog.judgesRequiredForTitle &&
                dog.currentGameTypes + trialGames >= dog.currentGameTypes + dog.gamesNeededForTitle
              );
            })
            .map((dog) => candidateKey('title', dog)),
          ...earnedAces.map((dog) => candidateKey('ace', dog)),
        ];
        setConfirmed(
          Array.from(
            new Set([...detected.filter((key) => !savedDismissed.includes(key)), ...savedConfirmed])
          )
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load ribbon estimate');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [trialId]);

  const scoredPasses = live?.passResults.length || 0;
  const unscored = Math.max(0, (live?.activeRegularRuns || 0) - (live?.scoredRuns || 0));
  const projectedQ = scoredPasses + Math.round((unscored * expectedPassRate) / 100);
  const confirmedTitleCount = titleCandidates.filter((d) =>
    confirmed.includes(candidateKey('title', d))
  ).length;
  const aceLevels = useMemo(() => {
    const highest = Math.max(3, ...aceCandidates.map((dog) => Number(dog.aceNumber) || 1));
    return Array.from({ length: highest }, (_, index) => index + 1);
  }, [aceCandidates]);
  const awardKeys = useMemo<AwardKey[]>(
    () => [
      'q',
      'placement',
      'highClass',
      'highTrial',
      'title',
      ...aceLevels.map((level) => `ace${level}` as const),
    ],
    [aceLevels]
  );
  const confirmedAceCounts = useMemo(
    () =>
      Object.fromEntries(
        aceLevels.map((level) => [
          level,
          aceCandidates.filter(
            (dog) =>
              (Number(dog.aceNumber) || 1) === level && confirmed.includes(candidateKey('ace', dog))
          ).length,
        ])
      ),
    [aceCandidates, aceLevels, confirmed]
  );
  const lines = useMemo(
    () =>
      awardKeys.map((award) => {
        const value = questionnaire[award] || {
          enabled: true,
          productCode: '307',
          quantity: 0,
        };
        const aceLevel = award.startsWith('ace') ? Number(award.slice(3)) || 1 : null;
        const quantity =
          award === 'q'
            ? projectedQ
            : award === 'title'
              ? confirmedTitleCount
              : aceLevel
                ? confirmedAceCounts[aceLevel] || 0
                : Number(value.quantity || 0);
        const unit = ribbonUnitPrice(value.productCode, currency, quantity);
        return {
          award,
          quantity,
          unit,
          total: value.enabled ? quantity * unit : 0,
          enabled: value.enabled,
          productCode: value.productCode,
        };
      }),
    [questionnaire, currency, projectedQ, confirmedTitleCount, confirmedAceCounts, awardKeys]
  );
  const merchandise = lines.reduce((sum, line) => sum + line.total, 0);
  const production = merchandise > 0 ? 30 : 0;
  const total = merchandise + production + shipping + tax;

  const update = (key: AwardKey, patch: Partial<QuestionnaireItem>) =>
    setQuestionnaire((current) => ({
      ...current,
      [key]: {
        ...(current[key] || { enabled: true, productCode: '307', quantity: 0 }),
        ...patch,
      },
    }));
  const toggleCandidate = (key: string) => {
    const isConfirmed = confirmed.includes(key);
    setConfirmed((current) =>
      isConfirmed ? current.filter((item) => item !== key) : [...current, key]
    );
    setDismissed((current) =>
      isConfirmed
        ? current.includes(key)
          ? current
          : [...current, key]
        : current.filter((item) => item !== key)
    );
  };
  const exportConfirmation = () => {
    if (!live) return;
    const passesFor = (dog: DogCloseToTitle) =>
      live.passResults.filter(
        (pass) => pass.cwagsNumber === dog.cwagsNumber && pass.className === dog.className
      );
    const exportRow = (kind: 'title' | 'ace', dog: DogCloseToTitle): TitleConfirmationExportRow => {
      const passes = passesFor(dog);
      const trialJudgeNames = uniqueJudgeNames(passes.map((pass) => pass.judgeName));
      const combinedJudgeNames = uniqueJudgeNames([
        ...dog.currentJudgeNames,
        ...trialJudgeNames,
      ]);
      const judgeRequirementMet = combinedJudgeNames.length >= dog.judgesRequiredForTitle;
      return {
        award: kind === 'title' ? 'Title' : awardLabel(`ace${dog.aceNumber || 1}`),
        confirmed:
          kind === 'title'
            ? confirmed.includes(candidateKey(kind, dog)) && judgeRequirementMet
            : confirmed.includes(candidateKey(kind, dog)),
        cwagsNumber: dog.cwagsNumber,
        dogName: dog.dogName,
        handlerName: dog.handlerName,
        className: dog.className,
        priorQs: dog.currentQs,
        trialQs: passes.length,
        qsRequired: kind === 'title' ? dog.qsNeededForTitle : dog.qsNeededForNextAce,
        priorJudges: dog.currentJudges,
        trialJudges: new Set(passes.map((pass) => pass.judgeName).filter(Boolean)).size,
        judgesRequired: kind === 'title' ? dog.judgesRequiredForTitle : 0,
        priorJudgeNames: kind === 'title' ? dog.currentJudgeNames.join(', ') || 'None' : 'N/A',
        trialJudgeNames: kind === 'title' ? trialJudgeNames.join(', ') || 'None' : 'N/A',
        judgeRequirementMet: kind === 'title' ? (judgeRequirementMet ? 'Met' : 'NOT MET') : 'N/A',
        priorGameTypes: dog.currentGameTypes,
        trialGameTypes: new Set(passes.map((pass) => pass.gamesSubclass).filter(Boolean)).size,
        gameTypesRequired: kind === 'title' ? dog.gamesNeededForTitle : 0,
      };
    };
    const rows = [
      ...titleCandidates.map((dog) => exportRow('title', dog)),
      ...aceCandidates.map((dog) => exportRow('ace', dog)),
    ];
    const bytes = buildTitleConfirmationWorkbook(live.trial.trial_name, rows);
    const blob = new Blob([bytes as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${live.trial.trial_name.replace(/[^a-z0-9]+/gi, '_')}_Title_Confirmation.xlsx`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };
  const save = async (saveExpense: boolean, saveClubProfile = false) => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`/api/trials/${trialId}/ribbon-estimate`, {
        method: 'PUT',
        headers: await headers(),
        body: JSON.stringify({
          currency,
          expectedPassRate,
          questionnaire,
          confirmedAwards: confirmed,
          dismissedAwards: dismissed,
          shippingEstimate: shipping,
          taxEstimate: tax,
          estimatedTotal: total,
          saveExpense,
          saveClubProfile,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to save');
      setMessage(
        saveClubProfile
          ? 'Ribbon types saved as this club’s default. Quantities will always be recalculated for each trial.'
          : saveExpense
            ? 'Estimate saved to Trial Expenses. Replace this same estimate with the receipt amount later.'
            : awardsOnly
              ? 'Award confirmations saved for this trial.'
              : 'Questionnaire saved for this trial.'
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading && exportOnly)
    return (
      <Button variant="outline" disabled>
        Loading Title Verification...
      </Button>
    );
  if (loading)
    return (
      <Card>
        <CardContent className="py-8 text-center">Loading ribbon estimate...</CardContent>
      </Card>
    );
  if (exportOnly) {
    return (
      <Button
        variant="outline"
        disabled={titleCandidates.length + aceCandidates.length === 0}
        onClick={exportConfirmation}
        title={
          titleCandidates.length + aceCandidates.length === 0
            ? 'No title or Ace candidates have been detected from saved scores.'
            : 'Export title and Ace awards for verification.'
        }
      >
        Export Title Verification
      </Button>
    );
  }
  if (awardsOnly) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Track Awards Requiring Confirmation</CardTitle>
          <CardDescription>
            Review title and Ace awards detected from saved trial results. Confirm or exclude an
            award before the host posts title winners, then export the confirmation workbook.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void load()}>
              Refresh Saved Results
            </Button>
            <Button
              variant="outline"
              disabled={titleCandidates.length + aceCandidates.length === 0}
              onClick={exportConfirmation}
            >
              Export Confirmation XLSX
            </Button>
            <Button
              disabled={saving || live?.setupRequired || !live?.canManageFinancials}
              onClick={() => void save(false)}
            >
              Save Confirmations
            </Button>
          </div>
          {live?.setupRequired && (
            <p className="text-sm text-amber-800">
              Confirmations can be reviewed and exported, but saving requires the optional award
              confirmation table.
            </p>
          )}
          {live && !live.canManageFinancials && (
            <p className="text-sm text-gray-600">
              You have report access. A secretary or administrator must save confirmation changes.
            </p>
          )}
          {titleCandidates.length + aceCandidates.length === 0 ? (
            <p className="text-sm text-gray-600">
              No title or Ace candidates have been triggered by saved scores yet.
            </p>
          ) : (
            [
              ...titleCandidates.map((d) => ({ kind: 'title' as const, d })),
              ...aceCandidates.map((d) => ({ kind: 'ace' as const, d })),
            ].map(({ kind, d }) => {
              const key = candidateKey(kind, d);
              const trialPasses = live ? live.passResults.filter(
                (pass) => pass.cwagsNumber === d.cwagsNumber && pass.className === d.className
              ) : [];
              const trialJudgeNames = uniqueJudgeNames(
                trialPasses.map((pass) => pass.judgeName)
              );
              const combinedJudgeNames = uniqueJudgeNames([
                ...d.currentJudgeNames,
                ...trialJudgeNames,
              ]);
              const judgeRequirementMet =
                kind === 'ace' || combinedJudgeNames.length >= d.judgesRequiredForTitle;
              return (
                <label
                  key={key}
                  className="flex items-center justify-between gap-4 rounded border p-3"
                >
                  <span className="space-y-1">
                    <strong>{d.dogName}</strong> ({d.cwagsNumber}) - {d.className} -{' '}
                    {kind === 'title' ? 'Title' : `Ace ${d.aceNumber}`}
                    {kind === 'title' && (
                      <span className="block text-sm text-gray-600">
                        Prior qualifying judges: {d.currentJudgeNames.join(', ') || 'None'}
                        <br />
                        Qualifying judges this trial: {trialJudgeNames.join(', ') || 'None'}
                        <br />
                        Unique judges: {combinedJudgeNames.length} of {d.judgesRequiredForTitle}{' '}
                        required — {judgeRequirementMet ? 'requirement met' : 'requirement not met'}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={confirmed.includes(key)}
                      disabled={!judgeRequirementMet || !live?.canManageFinancials}
                      onChange={() => toggleCandidate(key)}
                    />
                    <Badge>
                      {!judgeRequirementMet
                        ? 'Judge requirement not met'
                        : confirmed.includes(key)
                          ? 'Confirmed'
                          : 'Excluded'}
                    </Badge>
                  </span>
                </label>
              );
            })
          )}
          {message && <p className="text-sm font-medium">{message}</p>}
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-6">
      {live?.setupRequired && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Preview mode: counts and estimates are available, but saving is disabled until the
          optional ribbon-estimator database table is installed.
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Optional Ribbon Expense Estimator</CardTitle>
          <CardDescription>
            Uses the Centaur 2026 {currency} price list. Day-of entries and new scores are included
            whenever this page refreshes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>Price list</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as RibbonCurrency)}>
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="CAD">Canadian price list (CAD)</SelectItem>
                  <SelectItem value="USD">US price list (USD)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Automatically selected from trial location: {live?.automaticCurrency}. Manual
                changes are journaled.
              </p>
            </div>
            <div>
              <Label>Expected pass rate for unscored runs</Label>
              <Input
                className="w-32"
                type="number"
                min="0"
                max="100"
                value={expectedPassRate}
                onChange={(e) => setExpectedPassRate(Number(e.target.value) || 0)}
              />
            </div>
            <Button variant="outline" onClick={() => void load()}>
              Refresh entries and scores
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded border p-3">
              <div className="text-2xl font-bold">{live?.activeRegularRuns || 0}</div>
              <div className="text-xs text-gray-600">Eligible regular runs</div>
            </div>
            <div className="rounded border p-3">
              <div className="text-2xl font-bold text-green-700">{scoredPasses}</div>
              <div className="text-xs text-gray-600">Qualifying scores saved</div>
            </div>
            <div className="rounded border p-3">
              <div className="text-2xl font-bold text-orange-700">{projectedQ}</div>
              <div className="text-xs text-gray-600">Projected Q ribbons</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Ribbon Questionnaire</CardTitle>
          <CardDescription>
            Check only awards the club provides, choose the Centaur style, and enter quantities
            where they cannot be derived from scores. Club defaults remember ribbon types only;
            every trial calculates its own quantities from its entries and results.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {awardKeys.map((key) => {
            const value = questionnaire[key] || {
              enabled: true,
              productCode: '307',
              quantity: 0,
            };
            const computed = key === 'q' || key === 'title' || key.startsWith('ace');
            const aceLevel = key.startsWith('ace') ? Number(key.slice(3)) || 1 : null;
            return (
              <div
                key={key}
                className="grid grid-cols-[auto_1.1fr_1.4fr_110px_110px] items-center gap-3 rounded border p-3"
              >
                <input
                  type="checkbox"
                  checked={value.enabled}
                  onChange={(e) => update(key, { enabled: e.target.checked })}
                />
                <Label>{awardLabel(key)}</Label>
                <Select
                  value={value.productCode}
                  onValueChange={(v) => update(key, { productCode: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {CENTAUR_2026_PRODUCTS.map((product) => (
                      <SelectItem key={product.code} value={product.code}>
                        {product.code} - {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  disabled={computed}
                  value={
                    key === 'q'
                      ? projectedQ
                      : key === 'title'
                        ? confirmedTitleCount
                        : aceLevel
                          ? confirmedAceCounts[aceLevel] || 0
                          : value.quantity
                  }
                  onChange={(e) => update(key, { quantity: Number(e.target.value) || 0 })}
                />
                <div className="text-right font-semibold">
                  {currency} ${lines.find((line) => line.award === key)?.total.toFixed(2)}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tracker Awards Requiring Confirmation</CardTitle>
          <CardDescription>
            Awards supported by the tracker and saved trial results are confirmed automatically.
            Toggle off an exception if later review shows the award was not earned.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            disabled={titleCandidates.length + aceCandidates.length === 0}
            onClick={exportConfirmation}
          >
            Export Confirmation XLSX
          </Button>
          {titleCandidates.length + aceCandidates.length === 0 ? (
            <p className="text-sm text-gray-600">
              No title or Ace candidates have been triggered by saved scores yet.
            </p>
          ) : (
            [
              ...titleCandidates.map((d) => ({ kind: 'title' as const, d })),
              ...aceCandidates.map((d) => ({ kind: 'ace' as const, d })),
            ].map(({ kind, d }) => {
              const key = candidateKey(kind, d);
              return (
                <label
                  key={key}
                  className="flex items-center justify-between gap-4 rounded border p-3"
                >
                  <span>
                    <strong>{d.dogName}</strong> ({d.cwagsNumber}) - {d.className} -{' '}
                    {kind === 'title' ? 'Title' : `Ace ${d.aceNumber}`}
                  </span>
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={confirmed.includes(key)}
                      onChange={() => toggleCandidate(key)}
                    />
                    <Badge>{confirmed.includes(key) ? 'Confirmed' : 'Excluded'}</Badge>
                  </span>
                </label>
              );
            })
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Estimated Ribbon Expense</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {lines
            .filter((l) => l.enabled && l.quantity > 0)
            .map((line) => (
              <div key={line.award} className="flex justify-between text-sm">
                <span>
                  {awardLabel(line.award)}: {line.quantity} x{' '}
                  {ribbonProduct(line.productCode)?.name} @ {currency} ${line.unit.toFixed(2)}
                </span>
                <span>${line.total.toFixed(2)}</span>
              </div>
            ))}
          <div className="flex justify-between text-sm">
            <span>Centaur production charge</span>
            <span>${production.toFixed(2)}</span>
          </div>
          <div className="flex gap-4">
            <div>
              <Label>Estimated shipping</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={shipping}
                onChange={(e) => setShipping(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Estimated tax</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={tax}
                onChange={(e) => setTax(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="flex justify-between border-t pt-3 text-xl font-bold">
            <span>Estimated total ({currency})</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-500">
            Approximation only. Product options and special line changes may alter the invoice.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={saving || live?.setupRequired}
              onClick={() => void save(false)}
            >
              Save for This Trial
            </Button>
            <Button
              variant="outline"
              disabled={saving || live?.setupRequired}
              onClick={() => void save(false, true)}
            >
              Save Ribbon Types as Club Default
            </Button>
            <Button disabled={saving || live?.setupRequired} onClick={() => void save(true)}>
              Save or Update Estimated Expense
            </Button>
          </div>
          {message && <p className="text-sm font-medium">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
