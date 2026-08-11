import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth';
import { fetchAllPages, fetchInBatches } from '@/lib/supabasePagination';
import { isBillableSelection } from '@/lib/selectionStatus';
import { loadTrialFinancialReadModel } from '@/lib/server/trialFinancialSummary';

export const dynamic = 'force-dynamic';

interface RoundRow { id: string; judge_name: string | null; trial_class_id: string }
interface ClassRow { id: string; trial_day_id: string }
interface DayRow { id: string; trial_id: string }
interface RoundSelectionRow {
  id: string;
  trial_round_id: string;
  entry_type: string | null;
  entry_status: string | null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ trialId: string }> }
) {
  const { trialId } = await context.params;
  const auth = await requireTrialPermission(request, trialId, 'manage_financials');
  if (!auth.authorized) return auth.response;

  try {
    const db = getServiceRoleClient();
    const [readModel, trial, expenses, breakEvenConfig, days] = await Promise.all([
      loadTrialFinancialReadModel(trialId),
      db.from('trials').select('*').eq('id', trialId).single(),
      fetchAllPages((from, to) =>
        db.from('trial_expenses').select('*').eq('trial_id', trialId).order('expense_category').range(from, to)
      ),
      db.from('trial_break_even_config').select('*').eq('trial_id', trialId).maybeSingle(),
      fetchAllPages<DayRow>((from, to) =>
        db.from('trial_days').select('id,trial_id').eq('trial_id', trialId).order('id').range(from, to)
      ),
    ]);
    if (trial.error) throw trial.error;
    if (breakEvenConfig.error) throw breakEvenConfig.error;

    const dayIds = days.map((day) => day.id);
    const classes = await fetchInBatches<ClassRow>(dayIds, (ids, from, to) =>
      db.from('trial_classes').select('id,trial_day_id').in('trial_day_id', ids).order('id').range(from, to)
    );
    const classIds = classes.map((trialClass) => trialClass.id);
    const rounds = await fetchInBatches<RoundRow>(classIds, (ids, from, to) =>
      db.from('trial_rounds').select('id,judge_name,trial_class_id').in('trial_class_id', ids).order('id').range(from, to)
    );
    const selectionsByRound = new Map<string, RoundSelectionRow[]>();
    // Load only the round key needed for judge run totals, without an embedded relationship.
    const selectionRows = await fetchInBatches<RoundSelectionRow>(
      rounds.map((round) => round.id),
      (ids, from, to) =>
        db
          .from('entry_selections')
          .select('id,trial_round_id,entry_type,entry_status')
          .in('trial_round_id', ids)
          .order('id')
          .range(from, to)
    );
    selectionRows.forEach((selection) => {
      const list = selectionsByRound.get(selection.trial_round_id) || [];
      list.push(selection);
      selectionsByRound.set(selection.trial_round_id, list);
    });

    const judgeRuns = new Map<string, number>();
    rounds.forEach((round) => {
      const name = round.judge_name?.trim();
      if (!name) return;
      const count = (selectionsByRound.get(round.id) || []).filter(
        (selection) => selection.entry_type?.toLowerCase() !== 'feo' && isBillableSelection(selection.entry_status)
      ).length;
      judgeRuns.set(name, (judgeRuns.get(name) || 0) + count);
    });

    const judgeVolunteerStatus = Object.fromEntries(
      readModel.entries.map((entry) => [entry.id, Boolean(entry.is_judge_volunteer)])
    );
    return NextResponse.json({
      trial: trial.data,
      expenses,
      competitors: readModel.competitors,
      breakEvenConfig: breakEvenConfig.data,
      trialJudges: [...judgeRuns.entries()]
        .map(([name, runsJudged]) => ({ name, runsJudged }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      judgeVolunteerStatus,
    });
  } catch (error) {
    console.error('Financial summary read failed', { trialId, error });
    return NextResponse.json({ error: 'Failed to load financial summary' }, { status: 500 });
  }
}
