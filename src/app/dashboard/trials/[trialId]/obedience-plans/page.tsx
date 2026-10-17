'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle, Eye, GripVertical, Info, LockKeyhole, Plus, Save, Trash2 } from 'lucide-react';
import MainLayout from '@/components/layout/mainLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import {
  OBEDIENCE_GENERAL_NON_QUALIFYING,
  OBEDIENCE_RULES,
  defaultObediencePlan,
  validateObediencePlan,
  type ObedienceClassPlan,
  type ObedienceLevel,
  type ObediencePlanStatus,
} from '@/lib/obedienceRules';

interface RoundModel {
  id: string;
  round_number: number;
  judge_name: string;
  trial_classes: { class_name: string; trial_days?: { day_number?: number; trial_date?: string } };
}

const formatTrialDay = (round: RoundModel) => {
  const day = round.trial_classes.trial_days;
  const date = day?.trial_date ? new Date(`${day.trial_date}T12:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  return [day?.day_number ? `Day ${day.day_number}` : '', date].filter(Boolean).join(' · ');
};

const levelFromName = (name: string): ObedienceLevel => {
  const match = name.match(/(?:obedience\s*)?(?:level\s*)?([1-5])\b/i);
  return (match ? Number(match[1]) : 1) as ObedienceLevel;
};

const linkedPerformanceBlocks = (items: ObedienceClassPlan['items']) => {
  const blocks: ObedienceClassPlan['items'][] = [];
  const used = new Set<number>();
  items.forEach((item, index) => {
    if (used.has(index)) return;
    if (item.exerciseId === 'l2-position-change') {
      const callIndex = items.findIndex((candidate) => candidate.exerciseId === 'l2-call-to-heel');
      if (callIndex >= 0 && !used.has(callIndex)) return;
    }
    if (item.exerciseId === 'l2-call-to-heel') {
      const positionIndex = items.findIndex((candidate) => candidate.exerciseId === 'l2-position-change');
      if (positionIndex >= 0) {
        used.add(index);
        used.add(positionIndex);
        blocks.push([item, items[positionIndex]]);
        return;
      }
    }
    used.add(index);
    blocks.push([item]);
  });
  return blocks;
};

const renumberBlocks = (blocks: ObedienceClassPlan['items'][]) => {
  const items = blocks.flat();
  items.forEach((item, index) => item.performanceOrder = index + 1);
  return items;
};

export default function ObediencePlansPage() {
  const { trialId } = useParams<{ trialId: string }>();
  const [rounds, setRounds] = useState<RoundModel[]>([]);
  const [savedPlans, setSavedPlans] = useState<Record<string, { plan: ObedienceClassPlan }>>({});
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [plan, setPlan] = useState<ObedienceClassPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const authHeaders = async () => {
    const { data } = await getSupabaseBrowser().auth.getSession();
    if (!data.session?.access_token) throw new Error('Your session has expired.');
    return { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' };
  };

  const load = async () => {
    try {
      setError('');
      const response = await fetch(`/api/trials/${trialId}/obedience-plans`, { headers: await authHeaders(), cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to load Obedience plans.');
      setRounds(body.rounds || []);
      setSavedPlans(body.plans || {});
      setSetupRequired(!!body.setupRequired);
      if (body.rounds?.length) setSelectedRoundId((current) => current || body.rounds[0].id);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load Obedience plans.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [trialId]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const selectedRound = useMemo(() => rounds.find((round) => round.id === selectedRoundId), [rounds, selectedRoundId]);
  useEffect(() => {
    if (!selectedRound) return;
    const saved = savedPlans[selectedRound.id]?.plan;
    const nextPlan = saved || defaultObediencePlan(levelFromName(selectedRound.trial_classes.class_name), selectedRound.id, selectedRound.judge_name);
    setPlan({ ...nextPlan, items: renumberBlocks(linkedPerformanceBlocks([...nextPlan.items])) });
    setDirty(false);
    setMessage(''); setError('');
  }, [selectedRound, savedPlans]);

  const rules = plan ? OBEDIENCE_RULES[plan.level] : null;
  const issues = plan ? validateObediencePlan(plan) : [];
  const isLocked = (index: number) => {
    if (!plan || !rules) return true;
    const definition = rules.exercises.find((exercise) => exercise.id === plan.items[index]?.exerciseId);
    return Boolean(definition?.fixedPosition) && (plan.items[index]?.segment || 1) === 1;
  };

  const addHeelingSection = (exerciseId: string) => {
    if (!plan || !rules) return;
    const definition = rules.exercises.find((exercise) => exercise.id === exerciseId);
    if (!definition?.allowsPerformanceSegments) return;
    const segments = plan.items.filter((item) => item.exerciseId === exerciseId).map((item) => item.segment || 1);
    if (definition.maximumPerformanceSegments && segments.length >= definition.maximumPerformanceSegments) return;
    const nextSegment = Math.max(...segments, 0) + 1;
    const items = [...plan.items];
    const fixedEndingIndex = items.findIndex((item) => {
      const itemDefinition = rules.exercises.find((exercise) => exercise.id === item.exerciseId);
      return itemDefinition?.fixedPosition === 'last-off-leash' || itemDefinition?.fixedPosition === 'last';
    });
    const insertAt = fixedEndingIndex >= 0 ? fixedEndingIndex : items.length;
    items.splice(insertAt, 0, { exerciseId, performanceOrder: insertAt + 1, segment: nextSegment, exerciseFinished: true });
    items.forEach((item, itemIndex) => item.performanceOrder = itemIndex + 1);
    setPlan({ ...plan, status: 'draft', items });
    setDirty(true);
  };

  const removeHeelingSection = (index: number) => {
    if (!plan || (plan.items[index]?.segment || 1) === 1) return;
    const items = plan.items.filter((_, itemIndex) => itemIndex !== index);
    items.forEach((item, itemIndex) => item.performanceOrder = itemIndex + 1);
    const removedSegment = plan.items[index]?.segment || 1;
    const judgeOptions = { ...plan.judgeOptions };
    if (plan.level === 5 && Number(judgeOptions.level5FigureEightSegment) === removedSegment) delete judgeOptions.level5FigureEightSegment;
    setPlan({ ...plan, status: 'draft', items, judgeOptions });
    setDirty(true);
  };

  const updateJudgeOption = (key: string, value: string) => {
    if (!plan) return;
    setPlan({ ...plan, status: 'draft', judgeOptions: { ...plan.judgeOptions, [key]: value } });
    setDirty(true);
  };

  const toggleHeelingCombination = (index: number, combined: boolean) => {
    if (!plan) return;
    const items = plan.items.map((item, itemIndex) => itemIndex === index ? { ...item, exerciseFinished: !combined } : item);
    setPlan({ ...plan, status: 'draft', items });
    setDirty(true);
  };
  const move = (index: number, direction: -1 | 1) => {
    if (!plan) return;
    const blocks = linkedPerformanceBlocks([...plan.items]);
    const blockIndex = blocks.findIndex((block) => block.includes(plan.items[index]));
    const targetBlockIndex = blockIndex + direction;
    if (blockIndex < 0 || targetBlockIndex < 0 || targetBlockIndex >= blocks.length) return;
    const sourceLocked = blocks[blockIndex].some((item) => isLocked(plan.items.indexOf(item)));
    const targetLocked = blocks[targetBlockIndex].some((item) => isLocked(plan.items.indexOf(item)));
    if (sourceLocked || targetLocked) return;
    [blocks[blockIndex], blocks[targetBlockIndex]] = [blocks[targetBlockIndex], blocks[blockIndex]];
    const items = renumberBlocks(blocks);
    setPlan({ ...plan, status: 'draft', items });
    setDirty(true);
  };

  const moveTo = (fromIndex: number, toIndex: number) => {
    if (!plan || fromIndex === toIndex || isLocked(fromIndex) || isLocked(toIndex)) return;
    const blocks = linkedPerformanceBlocks([...plan.items]);
    const fromBlockIndex = blocks.findIndex((block) => block.includes(plan.items[fromIndex]));
    const toBlockIndex = blocks.findIndex((block) => block.includes(plan.items[toIndex]));
    if (fromBlockIndex < 0 || toBlockIndex < 0 || fromBlockIndex === toBlockIndex) return;
    if (blocks[fromBlockIndex].some((item) => isLocked(plan.items.indexOf(item))) || blocks[toBlockIndex].some((item) => isLocked(plan.items.indexOf(item)))) return;
    const [moved] = blocks.splice(fromBlockIndex, 1);
    blocks.splice(toBlockIndex, 0, moved);
    const items = renumberBlocks(blocks);
    setPlan({ ...plan, status: 'draft', items });
    setDirty(true);
  };

  const save = async (status: ObediencePlanStatus) => {
    if (!plan) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/trials/${trialId}/obedience-plans`, {
        method: 'PUT', headers: await authHeaders(), body: JSON.stringify({ roundId: selectedRoundId, plan, status }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to save the plan.');
      setMessage(status === 'finalized' ? 'Plan finalized. Official score sheets may now use this revision.' : `Plan saved as ${status}.`);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save the plan.'); }
    finally { setSaving(false); }
  };

  const preview = async () => {
    if (!plan || !selectedRound) return;
    setSaving(true); setError(''); setMessage('');
    try {
      if (issues.length > 0) throw new Error('Resolve the displayed plan issues before previewing the score sheet.');
      const [{ createDisciplineScoreSheetPdf }, templateResponse, logoResponse] = await Promise.all([
        import('@/lib/disciplineScoreSheetPdf'),
        fetch(`/templates/obedience-pdf/level-${plan.level}.pdf`),
        fetch('/cwags-logo.png'),
      ]);
      if (!templateResponse.ok || !logoResponse.ok) throw new Error('Unable to load the Obedience preview resources.');
      const bytes = await createDisciplineScoreSheetPdf(
        [{
          id: selectedRound.id,
          class_name: selectedRound.trial_classes.class_name,
          class_type: 'obedience',
          judge_name: selectedRound.judge_name,
          round_number: selectedRound.round_number,
        }],
        [{ selectionId: 'preview', roundId: selectedRound.id, handler: 'Preview Handler', dog: 'Preview Dog', registration: '00-0000-00', runningPosition: 1 }],
        'Class Plan Preview',
        selectedRound.trial_classes.trial_days?.trial_date || 'Date TBA',
        { [plan.level]: new Uint8Array(await templateResponse.arrayBuffer()) },
        new Uint8Array(await logoResponse.arrayBuffer()),
        { [selectedRound.id]: plan },
        { draftPreview: plan.status !== 'finalized' },
      );
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: 'application/pdf' }));
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage('Score-sheet preview opened in a new tab. Draft and submitted plans are marked as previews.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to preview the score sheet.'); }
    finally { setSaving(false); }
  };

  return (
    <MainLayout title="Obedience Class Plans">
      <div className="mx-auto max-w-5xl space-y-5 p-6">
        <Button variant="outline" onClick={() => history.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back to Trial</Button>
        <div><h1 className="text-3xl font-bold">Obedience Class Plans</h1><p className="text-gray-600">Arrange each judge&apos;s verified exercise order for the actual class and round.</p></div>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        {message && <Alert><CheckCircle className="h-4 w-4" /><AlertDescription>{message}</AlertDescription></Alert>}
        {setupRequired && <Alert><AlertDescription>Install <strong>20261016_obedience_class_plans.sql</strong> before saving. You may review and arrange a draft now.</AlertDescription></Alert>}
        {loading ? <p>Loading Obedience rounds…</p> : rounds.length === 0 ? <Alert><AlertDescription>This trial has no Obedience rounds.</AlertDescription></Alert> : (
          <>
            <Card><CardHeader><CardTitle>Select the class and round</CardTitle></CardHeader><CardContent>
              <Label>Obedience round</Label>
              <Select value={selectedRoundId} onValueChange={setSelectedRoundId}><SelectTrigger className="mt-2 bg-white"><SelectValue /></SelectTrigger><SelectContent className="bg-white">
                {rounds.map((round) => <SelectItem key={round.id} value={round.id}>{formatTrialDay(round)} · {round.trial_classes.class_name} · Round {round.round_number} · {round.judge_name || 'Judge TBA'}</SelectItem>)}
              </SelectContent></Select>
            </CardContent></Card>
            {plan && rules && <Card><CardHeader><CardTitle className="flex flex-wrap items-center gap-2">Obedience {plan.level} <Badge>{rules.maximumPoints} points · {rules.qualifyingPoints} to qualify</Badge><Badge variant="outline">Revision {plan.revision}</Badge><Badge className={plan.status === 'finalized' ? 'bg-green-700' : plan.status === 'submitted' ? 'bg-blue-700' : 'bg-amber-600'}>{plan.status === 'finalized' ? 'Finalized' : plan.status === 'submitted' ? 'Submitted' : 'Draft'}</Badge>{dirty && <Badge variant="destructive">Unsaved changes</Badge>}</CardTitle></CardHeader><CardContent className="space-y-4">
              <p className="text-sm text-gray-600">Drag rows into the judge&apos;s order, or use the arrow buttons. Moving a row changes performance order only; official points and exercise identity cannot be edited.</p>
              {rules.exercises.some((exercise) => exercise.allowsPerformanceSegments) && <Alert className="border-blue-300 bg-blue-50 text-blue-950"><Info className="h-4 w-4" /><AlertDescription>
                <strong>One Heeling exercise, one score:</strong> {rules.exercises.find((exercise) => exercise.allowsPerformanceSegments)?.maximumPerformanceSegments === 2 ? 'At this level, the judge may keep Heeling together or divide it between two course locations.' : 'At this level, the judge may divide Heeling among multiple course locations.'} Added sections do <strong>not</strong> create another exercise or add points. Every section shares the one official {rules.exercises.find((exercise) => exercise.allowsPerformanceSegments)?.maximumPoints}-point maximum; the judge combines deductions from all sections and records one final Heeling score with one 50% qualification check.
              </AlertDescription></Alert>}
              {plan.level === 3 && <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <Label htmlFor="level-3-heeling-element">Required Heeling element</Label>
                <p className="mb-2 text-xs text-blue-900">Select the element the judge included in at least one Heeling section.</p>
                <Select value={plan.judgeOptions.level3HeelingRequiredElement || ''} onValueChange={(value) => updateJudgeOption('level3HeelingRequiredElement', value)}>
                  <SelectTrigger id="level-3-heeling-element" className="max-w-sm bg-white"><SelectValue placeholder="Choose circle, Figure 8, or 270° turn" /></SelectTrigger>
                  <SelectContent className="bg-white"><SelectItem value="circle">Circle</SelectItem><SelectItem value="figure-8">Figure 8</SelectItem><SelectItem value="270-turn">270° turn</SelectItem></SelectContent>
                </Select>
              </div>}
              <div className="space-y-2">{plan.items.map((item, index) => {
                const definition = rules.exercises.find((exercise) => exercise.id === item.exerciseId);
                const segment = item.segment || 1;
                const continuation = Boolean(definition?.allowsPerformanceSegments && segment > 1);
                const locked = Boolean(definition?.fixedPosition) && !continuation;
                const linkedLeader = item.exerciseId === 'l2-call-to-heel';
                const linkedFollower = item.exerciseId === 'l2-position-change';
                return <div
                  key={`${item.exerciseId}-segment-${segment}`}
                  draggable={!locked && !linkedFollower}
                  onDragStart={(event) => {
                    setDraggedIndex(index);
                    setDragOverIndex(index);
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', item.exerciseId);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDragOverIndex(index);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedIndex !== null) moveTo(draggedIndex, index);
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition ${locked ? 'cursor-not-allowed border-slate-300 bg-slate-100' : linkedFollower ? 'border-blue-200 bg-blue-50' : 'cursor-grab bg-white active:cursor-grabbing'} ${dragOverIndex === index && draggedIndex !== index && !locked ? 'border-orange-500 bg-orange-50 shadow-sm' : ''} ${draggedIndex === index ? 'opacity-50' : ''}`}
                >
                  {locked ? <LockKeyhole className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" /> : <GripVertical className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />}
                  <span className="w-7 text-center font-bold">{index + 1}</span><div className="min-w-0 flex-1"><p className="font-semibold">{definition?.name || item.exerciseId}{definition?.allowsPerformanceSegments ? ` — Section ${segment}` : ''}</p><p className="text-xs text-gray-500">{continuation ? `Continuation of the same ${definition?.maximumPoints}-point score; no additional points` : definition?.passFail ? 'Pass / Fail' : `${definition?.maximumPoints} points`} · stable ID: {item.exerciseId}</p>
                    {definition && <details className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm" onClick={(event) => event.stopPropagation()}>
                      <summary className="cursor-pointer font-medium text-slate-800">Exercise description and deductions</summary>
                      <p className="mt-2 text-slate-700">{definition.description}</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {(['nonQualifying', 'major', 'minor', 'slight'] as const).map((category) => definition.deductions[category]?.length ? <div key={category} className="rounded bg-white p-2">
                          <strong className="text-xs uppercase tracking-wide text-slate-600">{category === 'nonQualifying' ? 'Non-qualifying' : category} deductions</strong>
                          <ul className="mt-1 list-disc pl-5 text-xs text-slate-700">{definition.deductions[category]!.map((note) => <li key={note}>{note}</li>)}</ul>
                        </div> : null)}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">Source: official C-Wags score-sheet template and 2020 rulebook, page{definition.sourcePages.length > 1 ? 's' : ''} {definition.sourcePages.join(', ')}.</p>
                    </details>}
                    {plan.level === 5 && item.exerciseId === 'l5-heeling-figure-8' && <div className="mt-2 flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                      <Button type="button" size="sm" variant={Number(plan.judgeOptions.level5FigureEightSegment) === segment ? 'default' : 'outline'} onClick={() => updateJudgeOption('level5FigureEightSegment', String(segment))}>
                        {Number(plan.judgeOptions.level5FigureEightSegment) === segment ? 'Figure 8 is in this section' : 'Mark this section for Figure 8'}
                      </Button>
                      <Button type="button" size="sm" variant={item.exerciseFinished === false ? 'default' : 'outline'} disabled={!plan.items[index + 1] || plan.items[index + 1]?.exerciseId === item.exerciseId} onClick={() => toggleHeelingCombination(index, item.exerciseFinished !== false)}>
                        {item.exerciseFinished === false ? `Combined with ${rules.exercises.find((exercise) => exercise.id === plan.items[index + 1]?.exerciseId)?.name || 'next exercise'}` : 'Combine with next exercise'}
                      </Button>
                    </div>}
                  </div>
                  {locked && <Badge variant="outline" className="border-slate-400 bg-white text-slate-700">Rule-locked</Badge>}
                  {linkedLeader && <Badge variant="outline" className="border-blue-400 bg-blue-50 text-blue-800">Linked block</Badge>}
                  {linkedFollower && <Badge variant="outline" className="border-blue-400 bg-white text-blue-800">Moves with Call to Heel</Badge>}
                  {definition?.allowsPerformanceSegments && !continuation && (!definition.maximumPerformanceSegments || plan.items.filter((candidate) => candidate.exerciseId === item.exerciseId).length < definition.maximumPerformanceSegments) && <Button variant="outline" size="sm" onClick={() => addHeelingSection(item.exerciseId)}><Plus className="mr-1 h-4 w-4" />{definition.maximumPerformanceSegments === 2 ? 'Split Heeling into Two Sections' : 'Add Heeling Section'}</Button>}
                  {continuation && <Button variant="outline" size="sm" onClick={() => removeHeelingSection(index)} aria-label={`Remove ${definition?.name} section ${segment}`}><Trash2 className="h-4 w-4" /></Button>}
                  <Button variant="outline" size="sm" disabled={locked || linkedFollower || index === 0 || isLocked(index - 1)} onClick={() => move(index, -1)} aria-label={`Move ${definition?.name} up`}><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" disabled={locked || linkedFollower || index === plan.items.length - 1 || isLocked(index + 1)} onClick={() => move(index, 1)} aria-label={`Move ${definition?.name} down`}><ArrowDown className="h-4 w-4" /></Button>
                </div>;
              })}</div>
              {issues.length > 0 && <Alert variant="destructive"><AlertDescription><strong>Resolve before finalizing:</strong><ul className="mt-2 list-disc pl-5">{issues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul></AlertDescription></Alert>}
              <div className="rounded-lg bg-slate-50 p-3 text-sm"><strong>Judge setup notes</strong><ul className="mt-1 list-disc pl-5">{rules.notes.map((note) => <li key={note}>{note}</li>)}</ul></div>
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><strong>General non-qualifying conditions</strong><p className="mt-1 text-xs">These apply across the score sheet in addition to each exercise&apos;s specific deductions.</p><ul className="mt-2 grid list-disc gap-x-6 pl-5 sm:grid-cols-2">{OBEDIENCE_GENERAL_NON_QUALIFYING.map((note) => <li key={note}>{note}</li>)}</ul></div>
              <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={saving || issues.length > 0} onClick={() => void preview()}><Eye className="mr-2 h-4 w-4" />Preview Score Sheet</Button><Button variant="outline" disabled={saving || setupRequired} onClick={() => void save('draft')}><Save className="mr-2 h-4 w-4" />Save Draft</Button><Button variant="outline" disabled={saving || setupRequired} onClick={() => void save('submitted')}>Mark Submitted</Button><Button disabled={saving || setupRequired || issues.length > 0} onClick={() => void save('finalized')}><CheckCircle className="mr-2 h-4 w-4" />Finalize for Printing</Button></div>
            </CardContent></Card>}
          </>
        )}
      </div>
    </MainLayout>
  );
}
