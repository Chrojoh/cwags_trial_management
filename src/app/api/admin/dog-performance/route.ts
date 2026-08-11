import { NextRequest, NextResponse } from 'next/server';
import {
  AuthorizationError,
  getSupabaseAdmin,
  requireAdministrator,
} from '@/lib/server/authorization';
import { fetchAllPages, fetchInBatches } from '@/lib/supabasePagination';
import { getClassOrder } from '@/lib/cwagsClassNames';
import { formatCwagsNumber } from '@/lib/utils';
import { hasRecordedResult, isAbsentResult, isPassingResult, type ResultLike } from '@/lib/resultMetrics';
import { isScorableSelection } from '@/lib/selectionStatus';

export const dynamic = 'force-dynamic';

interface EntryRow { id: string; cwags_number: string; dog_call_name: string; handler_name: string; trial_id: string }
interface SelectionRow { id: string; entry_id: string; entry_type: string | null; entry_status: string | null; trial_round_id: string }
interface ScoreRow extends ResultLike { entry_selection_id: string }
interface RoundRow { id: string; judge_name: string | null; trial_class_id: string }
interface ClassRow { id: string; class_name: string; trial_day_id: string }
interface DayRow { id: string; trial_id: string; trial_date: string }
interface TrialRow { id: string; trial_name: string; club_name: string | null }

const uniqueIds = (values: unknown[]): string[] => [
  ...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0)),
];

export async function GET(request: NextRequest) {
  try {
    await requireAdministrator();
    const rawNumber = request.nextUrl.searchParams.get('cwags')?.trim() || '';
    if (!rawNumber) return NextResponse.json({ error: 'C-WAGS number is required.' }, { status: 400 });
    const cwagsNumber = formatCwagsNumber(rawNumber);
    const db = getSupabaseAdmin();

    const entries = await fetchAllPages<EntryRow>((from, to) =>
      db
        .from('entries')
        .select('id, cwags_number, dog_call_name, handler_name, trial_id')
        .eq('cwags_number', cwagsNumber)
        .order('id')
        .range(from, to)
    );
    if (!entries.length) {
      return NextResponse.json({ error: `No trial history found for C-WAGS number: ${cwagsNumber}` }, { status: 404 });
    }

    const entryIds = uniqueIds(entries.map((entry) => entry.id));
    const selections = await fetchInBatches<SelectionRow>(entryIds, (ids, from, to) =>
      db
        .from('entry_selections')
        .select('id, entry_id, entry_type, entry_status, trial_round_id')
        .in('entry_id', ids)
        .order('id')
        .range(from, to)
    );
    const selectionIds = uniqueIds(selections.map((selection) => selection.id));
    const roundIds = uniqueIds(selections.map((selection) => selection.trial_round_id));
    const [scores, rounds] = await Promise.all([
      fetchInBatches<ScoreRow>(selectionIds, (ids, from, to) =>
        db
          .from('scores')
          .select('entry_selection_id, pass_fail, entry_status, numerical_score')
          .in('entry_selection_id', ids)
          .order('id')
          .range(from, to)
      ),
      fetchInBatches<RoundRow>(roundIds, (ids, from, to) =>
        db
          .from('trial_rounds')
          .select('id, judge_name, trial_class_id')
          .in('id', ids)
          .order('id')
          .range(from, to)
      ),
    ]);
    const classIds = uniqueIds(rounds.map((round) => round.trial_class_id));
    const classes = await fetchInBatches<ClassRow>(classIds, (ids, from, to) =>
      db.from('trial_classes').select('id, class_name, trial_day_id').in('id', ids).order('id').range(from, to)
    );
    const dayIds = uniqueIds(classes.map((trialClass) => trialClass.trial_day_id));
    const trialIds = uniqueIds(entries.map((entry) => entry.trial_id));
    const [days, trials] = await Promise.all([
      fetchInBatches<DayRow>(dayIds, (ids, from, to) =>
        db.from('trial_days').select('id, trial_id, trial_date').in('id', ids).order('id').range(from, to)
      ),
      fetchInBatches<TrialRow>(trialIds, (ids, from, to) =>
        db.from('trials').select('id, trial_name, club_name').in('id', ids).order('id').range(from, to)
      ),
    ]);

    const scoresBySelection = new Map(scores.map((score) => [score.entry_selection_id, score]));
    const roundsById = new Map(rounds.map((round) => [round.id, round]));
    const classesById = new Map(classes.map((trialClass) => [trialClass.id, trialClass]));
    const daysById = new Map(days.map((day) => [day.id, day]));
    const trialsById = new Map(trials.map((trial) => [trial.id, trial]));
    const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
    const classStats = new Map<string, { passes: number; details: Array<Record<string, string>> }>();
    const dates: string[] = [];

    for (const selection of selections) {
      if (selection.entry_type?.toLowerCase() !== 'regular' || !isScorableSelection(selection.entry_status)) continue;
      const score = scoresBySelection.get(selection.id);
      const round = roundsById.get(selection.trial_round_id);
      const trialClass = round ? classesById.get(round.trial_class_id) : null;
      const day = trialClass ? daysById.get(trialClass.trial_day_id) : null;
      const entry = entriesById.get(selection.entry_id);
      const trial = entry ? trialsById.get(entry.trial_id) : null;
      if (!score || !round || !trialClass || !day || !trial) continue;
      if (!hasRecordedResult(score) || isAbsentResult(score)) continue;
      if (!classStats.has(trialClass.class_name)) classStats.set(trialClass.class_name, { passes: 0, details: [] });
      const stats = classStats.get(trialClass.class_name)!;
      if (isPassingResult(score)) stats.passes += 1;
      stats.details.push({
        trial_date: day.trial_date,
        trial_name: trial.trial_name || 'Unknown Trial',
        judge_name: round.judge_name || 'Unknown Judge',
        result: score.pass_fail || String(score.numerical_score ?? 'Unknown'),
      });
      dates.push(day.trial_date);
    }

    const outputClasses = [...classStats.entries()]
      .map(([className, stats]) => ({
        class_name: className,
        total_runs: stats.details.length,
        passes: stats.passes,
        pass_rate: stats.details.length ? (stats.passes / stats.details.length) * 100 : 0,
        class_order: getClassOrder(className),
        run_details: stats.details.sort((a, b) => b.trial_date.localeCompare(a.trial_date)),
      }))
      .sort((a, b) => a.class_order - b.class_order);
    dates.sort();
    const first = entries[0];
    return NextResponse.json({
      dog_info: {
        cwags_number: first.cwags_number,
        dog_call_name: first.dog_call_name,
        handler_name: first.handler_name,
      },
      date_range: { earliest: dates[0] || 'Unknown', latest: dates[dates.length - 1] || 'Unknown' },
      trial_count: new Set(entries.map((entry) => entry.trial_id)).size,
      club_count: new Set(trials.map((trial) => trial.club_name).filter(Boolean)).size,
      class_stats: outputClasses,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Dog performance report failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load dog performance data.' },
      { status: 500 }
    );
  }
}
