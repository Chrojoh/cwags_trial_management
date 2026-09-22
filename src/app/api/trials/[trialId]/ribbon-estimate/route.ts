import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth';
import { fetchAllPages, fetchInBatches } from '@/lib/supabasePagination';
import { isScorableSelection } from '@/lib/selectionStatus';
import { hasTrialPermission } from '@/lib/trialPermissions';

export const dynamic = 'force-dynamic';

function currencyForLocation(location: string) {
  return /united states|\busa\b|\bu\.s\.\b/i.test(location || '') ? 'USD' : 'CAD';
}

function clubKey(clubName: string) {
  return String(clubName || '')
    .trim()
    .toLocaleLowerCase('en-CA')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function loadLiveCounts(trialId: string) {
  const db = getServiceRoleClient();
  const { data: trial, error: trialError } = await db
    .from('trials')
    .select('id,location,trial_name,club_name')
    .eq('id', trialId)
    .single();
  if (trialError) throw trialError;
  const entries = await fetchAllPages<any>((from, to) =>
    db
      .from('entries')
      .select('id,cwags_number,dog_call_name,handler_name')
      .eq('trial_id', trialId)
      .order('id')
      .range(from, to)
  );
  const selections = await fetchInBatches<any>(
    entries.map((entry) => entry.id),
    (ids, from, to) =>
      db
        .from('entry_selections')
        .select('id,entry_id,trial_round_id,entry_type,entry_status,games_subclass')
        .in('entry_id', ids)
        .order('id')
        .range(from, to)
  );
  const active = selections.filter(
    (selection) =>
      selection.entry_type?.toLowerCase() !== 'feo' && isScorableSelection(selection.entry_status)
  );
  const scores = await fetchInBatches<any>(
    active.map((selection) => selection.id),
    (ids, from, to) =>
      db
        .from('scores')
        .select('entry_selection_id,pass_fail')
        .in('entry_selection_id', ids)
        .order('id')
        .range(from, to)
  );
  const rounds = await fetchInBatches<any>(
    active.map((selection) => selection.trial_round_id),
    (ids, from, to) =>
      db
        .from('trial_rounds')
        .select('id,trial_class_id,judge_name')
        .in('id', ids)
        .order('id')
        .range(from, to)
  );
  const classes = await fetchInBatches<any>(
    rounds.map((round) => round.trial_class_id),
    (ids, from, to) =>
      db.from('trial_classes').select('id,class_name').in('id', ids).order('id').range(from, to)
  );
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const roundById = new Map(rounds.map((round) => [round.id, round]));
  const classById = new Map(classes.map((trialClass) => [trialClass.id, trialClass]));
  const scoreBySelection = new Map(scores.map((score) => [score.entry_selection_id, score]));
  const passResults = active.flatMap((selection) => {
    const score = scoreBySelection.get(selection.id);
    if (String(score?.pass_fail || '').toLowerCase() !== 'pass') return [];
    const entry = entryById.get(selection.entry_id);
    const round = roundById.get(selection.trial_round_id);
    const trialClass = round ? classById.get(round.trial_class_id) : null;
    return entry && round && trialClass
      ? [
          {
            selectionId: selection.id,
            cwagsNumber: entry.cwags_number,
            dogName: entry.dog_call_name,
            handlerName: entry.handler_name,
            className: trialClass.class_name,
            judgeName: round.judge_name,
            gamesSubclass: selection.games_subclass,
          },
        ]
      : [];
  });
  return {
    trial,
    automaticCurrency: currencyForLocation(trial.location),
    activeRegularRuns: active.length,
    scoredRuns: new Set(scores.map((score) => score.entry_selection_id)).size,
    passResults,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string }> }
) {
  const { trialId } = await params;
  const auth = await requireTrialPermission(request, trialId, 'generate_reports');
  if (!auth.authorized) return auth.response;
  try {
    const db = getServiceRoleClient();
    const live = await loadLiveCounts(trialId);
    const key = clubKey(live.trial.club_name);
    const [configResult, clubResult] = await Promise.all([
      db.from('trial_ribbon_estimates').select('*').eq('trial_id', trialId).maybeSingle(),
      key
        ? db.from('club_ribbon_profiles').select('*').eq('club_key', key).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    const missingTableCodes = ['42P01', 'PGRST205'];
    const setupRequired = [configResult.error, clubResult.error].some((error) =>
      missingTableCodes.includes(error?.code || '')
    );
    if (configResult.error && !missingTableCodes.includes(configResult.error.code || ''))
      throw configResult.error;
    if (clubResult.error && !missingTableCodes.includes(clubResult.error.code || ''))
      throw clubResult.error;
    const canManageFinancials = hasTrialPermission(auth.role, 'manage_financials');
    const reportConfig = canManageFinancials
      ? configResult.data
      : configResult.data
        ? {
            confirmed_awards: configResult.data.confirmed_awards,
            dismissed_awards: configResult.data.dismissed_awards,
          }
        : null;
    return NextResponse.json({
      ...live,
      config: reportConfig,
      clubProfile: canManageFinancials ? clubResult.data || null : null,
      setupRequired,
      canManageFinancials,
    });
  } catch (error) {
    console.error('Ribbon estimate read failed', { trialId, error });
    return NextResponse.json({ error: 'Failed to load ribbon estimate' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string }> }
) {
  const { trialId } = await params;
  const auth = await requireTrialPermission(request, trialId, 'manage_financials');
  if (!auth.authorized) return auth.response;
  try {
    const body = await request.json();
    const live = await loadLiveCounts(trialId);
    const automaticCurrency = live.automaticCurrency;
    const currency = body.currency === 'USD' ? 'USD' : 'CAD';
    const amount = Math.max(0, Number(body.estimatedTotal || 0));
    const db = getServiceRoleClient();
    const key = clubKey(live.trial.club_name);
    const { data: existing, error: existingError } = await db
      .from('trial_ribbon_estimates')
      .select('expense_id')
      .eq('trial_id', trialId)
      .maybeSingle();
    if (existingError) throw existingError;
    let expenseId = existing?.expense_id || null;
    if (body.saveExpense === true) {
      const expense = {
        trial_id: trialId,
        expense_category: 'Ribbons',
        description: `Estimated ribbons - Centaur 2026 (${currency})`,
        amount,
        paid_to: 'Centaur Awards',
        notes:
          'Estimate only. Replace this amount with the exact receipt; do not add a second ribbon expense.',
        updated_at: new Date().toISOString(),
      };
      if (expenseId) {
        const { error } = await db.from('trial_expenses').update(expense).eq('id', expenseId);
        if (error) throw error;
      } else {
        const { data, error } = await db
          .from('trial_expenses')
          .insert(expense)
          .select('id')
          .single();
        if (error) throw error;
        expenseId = data.id;
      }
    }
    const payload = {
      trial_id: trialId,
      currency,
      currency_overridden: currency !== automaticCurrency,
      expected_pass_rate: Math.min(100, Math.max(0, Number(body.expectedPassRate || 0))),
      questionnaire: body.questionnaire || {},
      confirmed_awards: body.confirmedAwards || [],
      dismissed_awards: body.dismissedAwards || [],
      shipping_estimate: Math.max(0, Number(body.shippingEstimate || 0)),
      tax_estimate: Math.max(0, Number(body.taxEstimate || 0)),
      expense_id: expenseId,
      price_source: 'Centaur 2026 Price List',
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await db
      .from('trial_ribbon_estimates')
      .upsert(payload, { onConflict: 'trial_id' })
      .select('*')
      .single();
    if (error) throw error;
    if (body.saveClubProfile === true && key) {
      const clubQuestionnaire = Object.fromEntries(
        Object.entries(body.questionnaire || {}).map(([award, value]) => {
          const selection = (value || {}) as { enabled?: boolean; productCode?: string };
          return [
            award,
            {
              enabled: selection.enabled !== false,
              productCode: String(selection.productCode || ''),
              quantity: 0,
            },
          ];
        })
      );
      const { error: clubError } = await db.from('club_ribbon_profiles').upsert(
        {
          club_key: key,
          club_name: live.trial.club_name,
          questionnaire: clubQuestionnaire,
          updated_by: auth.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'club_key' }
      );
      if (clubError) throw clubError;
    }
    await db.from('trial_activity_log').insert({
      trial_id: trialId,
      activity_type: 'ribbon_estimate_updated',
      user_id: auth.userId,
      user_name: 'Trial secretary',
      snapshot_data: {
        currency,
        automatic_currency: automaticCurrency,
        estimated_total: amount,
        saved_as_expense: body.saveExpense === true,
        saved_as_club_default: body.saveClubProfile === true,
      },
    });
    return NextResponse.json({ success: true, config: data });
  } catch (error) {
    console.error('Ribbon estimate save failed', { trialId, error });
    return NextResponse.json({ error: 'Failed to save ribbon estimate' }, { status: 500 });
  }
}
