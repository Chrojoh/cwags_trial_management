import { NextRequest, NextResponse } from 'next/server';
import {
  AuthorizationError,
  getSupabaseAdmin,
  requireAdministrator,
} from '@/lib/server/authorization';
import { fetchAllPages, fetchInBatches } from '@/lib/supabasePagination';
import {
  calculatePassRate,
  hasRecordedResult,
  isAbsentResult,
  isPassingResult,
  type ResultLike,
} from '@/lib/resultMetrics';
import { isActiveSelection } from '@/lib/selectionStatus';
import { getClassOrder } from '@/lib/cwagsClassNames';

export const dynamic = 'force-dynamic';

interface ScoreRow extends ResultLike {
  trial_round_id: string | null;
  entry_selection_id: string | null;
}
interface RoundRow { id: string; judge_name: string | null; trial_class_id: string }
interface SelectionRow { id: string; entry_type: string | null; entry_status: string | null }
interface ClassRow { id: string; class_name: string; trial_day_id: string }
interface DayRow { id: string; trial_id: string }
interface TrialRow { id: string; club_name: string | null }

const uniqueIds = (values: unknown[]): string[] => [
  ...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0)),
];

export async function GET(request: NextRequest) {
  try {
    await requireAdministrator();
    const clubName = request.nextUrl.searchParams.get('clubName')?.trim() || '';
    const db = getSupabaseAdmin();

    const scores = await fetchAllPages<ScoreRow>((from, to) =>
      db
        .from('scores')
        .select('trial_round_id, entry_selection_id, pass_fail, entry_status, numerical_score')
        .order('id')
        .range(from, to)
    );
    const roundIds = uniqueIds(scores.map((score) => score.trial_round_id));
    const selectionIds = uniqueIds(scores.map((score) => score.entry_selection_id));

    const [rounds, selections] = await Promise.all([
      fetchInBatches<RoundRow>(roundIds, (ids, from, to) =>
        db
          .from('trial_rounds')
          .select('id, judge_name, trial_class_id')
          .in('id', ids)
          .order('id')
          .range(from, to)
      ),
      fetchInBatches<SelectionRow>(selectionIds, (ids, from, to) =>
        db
          .from('entry_selections')
          .select('id, entry_type, entry_status')
          .in('id', ids)
          .order('id')
          .range(from, to)
      ),
    ]);

    const classIds = uniqueIds(rounds.map((round) => round.trial_class_id));
    const classes = await fetchInBatches<ClassRow>(classIds, (ids, from, to) =>
      db
        .from('trial_classes')
        .select('id, class_name, trial_day_id')
        .in('id', ids)
        .order('id')
        .range(from, to)
    );
    const dayIds = uniqueIds(classes.map((trialClass) => trialClass.trial_day_id));
    const days = await fetchInBatches<DayRow>(dayIds, (ids, from, to) =>
      db.from('trial_days').select('id, trial_id').in('id', ids).order('id').range(from, to)
    );
    const trialIds = uniqueIds(days.map((day) => day.trial_id));
    const trials = await fetchInBatches<TrialRow>(trialIds, (ids, from, to) =>
      db.from('trials').select('id, club_name').in('id', ids).order('id').range(from, to)
    );

    const selectionsById = new Map(selections.map((selection) => [selection.id, selection]));
    const roundsById = new Map(rounds.map((round) => [round.id, round]));
    const classesById = new Map(classes.map((trialClass) => [trialClass.id, trialClass]));
    const daysById = new Map(days.map((day) => [day.id, day]));
    const trialsById = new Map(trials.map((trial) => [trial.id, trial]));
    const totals = new Map<string, Map<string, { runs: number; passes: number; rounds: Set<string> }>>();

    for (const score of scores) {
      if (!score.entry_selection_id || !score.trial_round_id) continue;
      const selection = selectionsById.get(score.entry_selection_id);
      const round = roundsById.get(score.trial_round_id);
      const trialClass = round ? classesById.get(round.trial_class_id) : null;
      const day = trialClass ? daysById.get(trialClass.trial_day_id) : null;
      const trial = day ? trialsById.get(day.trial_id) : null;
      if (!selection || !round || !trialClass || !trial) continue;
      if (clubName && trial.club_name !== clubName) continue;
      if (selection.entry_type !== 'regular' || !isActiveSelection(selection.entry_status)) continue;
      if (isAbsentResult(score) || !hasRecordedResult(score) || !round.judge_name) continue;

      if (!totals.has(trialClass.class_name)) totals.set(trialClass.class_name, new Map());
      const judges = totals.get(trialClass.class_name)!;
      if (!judges.has(round.judge_name)) {
        judges.set(round.judge_name, { runs: 0, passes: 0, rounds: new Set() });
      }
      const judge = judges.get(round.judge_name)!;
      judge.runs += 1;
      if (isPassingResult(score)) judge.passes += 1;
      judge.rounds.add(round.id);
    }

    const statistics: Record<string, Array<Record<string, number | string>>> = {};
    for (const [className, judges] of totals) {
      statistics[className] = [...judges.entries()]
        .map(([judgeName, value]) => ({
          judge_name: judgeName,
          runs: value.runs,
          passes: value.passes,
          pass_rate: calculatePassRate(value.passes, value.runs - value.passes),
          rounds_judged: value.rounds.size,
        }))
        .sort((a, b) => String(a.judge_name).localeCompare(String(b.judge_name)));
    }

    const availableClasses = Object.keys(statistics).sort(
      (a, b) => getClassOrder(a) - getClassOrder(b)
    );
    return NextResponse.json({ classes: availableClasses, statistics });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Class statistics report failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load class statistics.' },
      { status: 500 }
    );
  }
}
