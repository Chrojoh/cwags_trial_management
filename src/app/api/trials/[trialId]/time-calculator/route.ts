import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth';
import { fetchAllPages, fetchInBatches } from '@/lib/supabasePagination';
import { getDefaultTimeConfigurations, DEFAULT_DAILY_ALLOTMENT } from '@/lib/trialTimeDefaults';
import { getClassOrder } from '@/lib/cwagsClassNames';
import { isRunningOrderSelection } from '@/lib/selectionStatus';

export const dynamic = 'force-dynamic';

interface DayRow { id: string; day_number: number; trial_date: string }
interface ClassRow { id: string; trial_day_id: string; class_name: string }
interface RoundRow { id: string; trial_class_id: string }
interface SelectionRow { id: string; trial_round_id: string; entry_status: string | null; entry_type: string | null }
interface TimeConfigRow { id: string; class_name: string; discipline: string; minutes_per_run: number }
interface AllotmentRow { trial_day_id: string; allotted_minutes: number }

async function authorize(request: NextRequest, trialId: string) {
  return requireTrialPermission(request, trialId, 'manage_financials');
}

export async function GET(request: NextRequest, context: { params: Promise<{ trialId: string }> }) {
  const { trialId } = await context.params;
  const auth = await authorize(request, trialId);
  if (!auth.authorized) return auth.response;
  try {
    const db = getServiceRoleClient();
    const [trial, days] = await Promise.all([
      db.from('trials').select('*').eq('id', trialId).single(),
      fetchAllPages<DayRow>((from, to) => db.from('trial_days').select('id,day_number,trial_date').eq('trial_id', trialId).order('day_number').range(from, to)),
    ]);
    if (trial.error) throw trial.error;
    let configs = await fetchAllPages<TimeConfigRow>((from, to) =>
      db.from('trial_time_configurations').select('id,class_name,discipline,minutes_per_run').eq('trial_id', trialId).order('class_name').range(from, to)
    );
    if (configs.length === 0) {
      const { error } = await db.from('trial_time_configurations').insert(getDefaultTimeConfigurations(trialId));
      if (error) throw error;
      configs = await fetchAllPages<TimeConfigRow>((from, to) =>
        db.from('trial_time_configurations').select('id,class_name,discipline,minutes_per_run').eq('trial_id', trialId).order('class_name').range(from, to)
      );
    }
    const classes = await fetchInBatches<ClassRow>(days.map((day) => day.id), (ids, from, to) =>
      db.from('trial_classes').select('id,trial_day_id,class_name').in('trial_day_id', ids).order('id').range(from, to)
    );
    const rounds = await fetchInBatches<RoundRow>(classes.map((trialClass) => trialClass.id), (ids, from, to) =>
      db.from('trial_rounds').select('id,trial_class_id').in('trial_class_id', ids).order('id').range(from, to)
    );
    const selections = await fetchInBatches<SelectionRow>(rounds.map((round) => round.id), (ids, from, to) =>
      db.from('entry_selections').select('id,trial_round_id,entry_status,entry_type').in('trial_round_id', ids).order('id').range(from, to)
    );
    const allotments = await fetchInBatches<AllotmentRow>(days.map((day) => day.id), (ids, from, to) =>
      db.from('trial_daily_allotments').select('trial_day_id,allotted_minutes').in('trial_day_id', ids).order('trial_day_id').range(from, to)
    );
    const classById = new Map(classes.map((trialClass) => [trialClass.id, trialClass]));
    const roundById = new Map(rounds.map((round) => [round.id, round]));
    const counts = new Map<string, number>();
    selections.forEach((selection) => {
      if (!isRunningOrderSelection(selection.entry_status) || selection.entry_type?.toLowerCase() === 'feo') return;
      const round = roundById.get(selection.trial_round_id);
      const trialClass = round ? classById.get(round.trial_class_id) : null;
      if (!trialClass) return;
      const key = `${trialClass.trial_day_id}|${trialClass.class_name}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const allotmentByDay = new Map(allotments.map((row) => [row.trial_day_id, row.allotted_minutes]));
    const mapConfig = (config: TimeConfigRow, dayId: string) => {
      const entryCount = counts.get(`${dayId}|${config.class_name}`) || 0;
      return { ...config, entry_count: entryCount, total_minutes: Number(config.minutes_per_run) * entryCount };
    };
    const processedDays = days.map((day) => ({
      day_id: day.id,
      day_number: day.day_number,
      trial_date: day.trial_date,
      allotted_minutes: Number(allotmentByDay.get(day.id) || DEFAULT_DAILY_ALLOTMENT),
      scent_configs: configs.filter((config) => config.discipline === 'scent').map((config) => mapConfig(config, day.id)).sort((a, b) => getClassOrder(a.class_name) - getClassOrder(b.class_name)),
      rally_configs: configs.filter((config) => config.discipline === 'rally_obedience_games').map((config) => mapConfig(config, day.id)).sort((a, b) => getClassOrder(a.class_name) - getClassOrder(b.class_name)),
    }));
    return NextResponse.json({ trial: trial.data, days: processedDays });
  } catch (error) {
    console.error('Time calculator read failed', { trialId, error });
    return NextResponse.json({ error: 'Failed to load time calculator' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ trialId: string }> }) {
  const { trialId } = await context.params;
  const auth = await authorize(request, trialId);
  if (!auth.authorized) return auth.response;
  try {
    const body = await request.json();
    const db = getServiceRoleClient();
    if (body.type === 'config' && typeof body.configId === 'string') {
      const { error } = await db.from('trial_time_configurations').update({ minutes_per_run: Number(body.minutes), updated_at: new Date().toISOString() }).eq('id', body.configId).eq('trial_id', trialId);
      if (error) throw error;
    } else if (body.type === 'allotment' && typeof body.dayId === 'string') {
      const { data: day } = await db.from('trial_days').select('id').eq('id', body.dayId).eq('trial_id', trialId).maybeSingle();
      if (!day) return NextResponse.json({ error: 'Trial day not found' }, { status: 404 });
      const { error } = await db.from('trial_daily_allotments').upsert({ trial_day_id: body.dayId, allotted_minutes: Number(body.minutes), updated_at: new Date().toISOString() }, { onConflict: 'trial_day_id' });
      if (error) throw error;
    } else return NextResponse.json({ error: 'Invalid update' }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Time calculator update failed', { trialId, error });
    return NextResponse.json({ error: 'Failed to update time calculator' }, { status: 500 });
  }
}
