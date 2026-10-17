import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth';
import {
  OBEDIENCE_RULES,
  OBEDIENCE_RULESET_ID,
  defaultObediencePlan,
  validateObediencePlan,
  type ObedienceClassPlan,
  type ObedienceLevel,
  type ObediencePlanStatus,
} from '@/lib/obedienceRules';

export const dynamic = 'force-dynamic';

const levelFromName = (name: string): ObedienceLevel => {
  const match = name.match(/(?:obedience\s*)?(?:level\s*)?([1-5])\b/i);
  return (match ? Number(match[1]) : 1) as ObedienceLevel;
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ trialId: string }> }) {
  const { trialId } = await params;
  const auth = await requireTrialPermission(request, trialId, 'view_trial');
  if (!auth.authorized) return auth.response;
  const service = getServiceRoleClient();
  const { data: rounds, error: roundError } = await service
    .from('trial_rounds')
    .select('id,round_number,judge_name,trial_classes!inner(class_name,class_type,trial_days!inner(day_number,trial_date,trial_id))')
    .eq('trial_classes.trial_days.trial_id', trialId)
    .eq('trial_classes.class_type', 'obedience')
    .order('round_number');
  if (roundError) return NextResponse.json({ error: 'Unable to load Obedience rounds.' }, { status: 500 });

  const { data: revisions, error: planError } = await service
    .from('obedience_class_plan_revisions')
    .select('*')
    .eq('trial_id', trialId)
    .order('revision', { ascending: false });
  const setupRequired = !!planError && ['42P01', 'PGRST205'].includes(planError.code || '');
  if (planError && !setupRequired) return NextResponse.json({ error: 'Unable to load Obedience plans.' }, { status: 500 });
  const latest = new Map<string, unknown>();
  const latestFinalized = new Map<string, unknown>();
  for (const revision of revisions || []) {
    if (!latest.has(revision.trial_round_id)) latest.set(revision.trial_round_id, revision);
    if (revision.status === 'finalized' && !latestFinalized.has(revision.trial_round_id)) latestFinalized.set(revision.trial_round_id, revision);
  }
  return NextResponse.json({
    rounds: rounds || [],
    plans: Object.fromEntries(latest),
    finalizedPlans: Object.fromEntries(latestFinalized),
    setupRequired,
    rulesetId: OBEDIENCE_RULESET_ID,
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ trialId: string }> }) {
  const { trialId } = await params;
  const auth = await requireTrialPermission(request, trialId, 'edit_trial');
  if (!auth.authorized) return auth.response;
  try {
    const body = await request.json() as { roundId?: string; plan?: Partial<ObedienceClassPlan>; status?: ObediencePlanStatus };
    if (!body.roundId) return NextResponse.json({ error: 'A trial round is required.' }, { status: 400 });
    const service = getServiceRoleClient();
    const { data: round, error: roundError } = await service
      .from('trial_rounds')
      .select('id,round_number,judge_name,trial_classes!inner(class_name,class_type,trial_days!inner(trial_id))')
      .eq('id', body.roundId)
      .eq('trial_classes.trial_days.trial_id', trialId)
      .eq('trial_classes.class_type', 'obedience')
      .single();
    if (roundError || !round) return NextResponse.json({ error: 'Obedience round not found in this trial.' }, { status: 404 });
    const relation = round.trial_classes as unknown as { class_name: string };
    const level = levelFromName(relation.class_name);
    const base = defaultObediencePlan(level, body.roundId, round.judge_name || '');
    const status: ObediencePlanStatus = body.status === 'finalized' ? 'finalized' : body.status === 'submitted' ? 'submitted' : 'draft';
    const plan: ObedienceClassPlan = {
      ...base,
      ...body.plan,
      rulesetId: OBEDIENCE_RULESET_ID,
      trialRoundId: body.roundId,
      level,
      judgeName: round.judge_name || body.plan?.judgeName || '',
      status,
      items: Array.isArray(body.plan?.items) ? body.plan.items : base.items,
      judgeOptions: body.plan?.judgeOptions || {},
    };
    const issues = validateObediencePlan(plan);
    if (status === 'finalized' && issues.length) return NextResponse.json({ error: 'The plan cannot be finalized until all rule checks pass.', issues }, { status: 409 });
    const { data: previous } = await service
      .from('obedience_class_plan_revisions')
      .select('id,revision')
      .eq('trial_round_id', body.roundId)
      .order('revision', { ascending: false })
      .limit(1)
      .maybeSingle();
    plan.revision = (previous?.revision || 0) + 1;
    const { data: saved, error: saveError } = await service
      .from('obedience_class_plan_revisions')
      .insert({
        trial_id: trialId,
        trial_round_id: body.roundId,
        ruleset_id: OBEDIENCE_RULESET_ID,
        level,
        judge_name: plan.judgeName,
        status,
        revision: plan.revision,
        plan,
        ruleset_snapshot: OBEDIENCE_RULES[level],
        validation_issues: issues,
        supersedes_id: previous?.id || null,
        created_by: auth.userId,
      })
      .select('*')
      .single();
    if (saveError) throw saveError;
    return NextResponse.json({ saved, issues });
  } catch (error) {
    console.error('Obedience plan save failed', { trialId, error });
    return NextResponse.json({ error: 'Unable to save the Obedience plan. The database migration may still be required.' }, { status: 500 });
  }
}
