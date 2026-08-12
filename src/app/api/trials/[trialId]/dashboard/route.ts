import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth';
import { fetchAllPages, fetchInBatches } from '@/lib/supabasePagination';
import { loadTrialFinancialReadModel } from '@/lib/server/trialFinancialSummary';
import { derivePaymentStatus } from '@/lib/financialRules';
import { isActiveSelection } from '@/lib/selectionStatus';

export const dynamic = 'force-dynamic';

interface DayRow { id: string; day_number: number; trial_date: string }
interface ClassRow {
  id: string;
  trial_day_id: string;
  class_name: string;
  class_type: string | null;
  max_entries: number | null;
}
interface RoundRow {
  id: string;
  trial_class_id: string;
  judge_name: string | null;
  round_status: string | null;
}
interface ActivityRow {
  id: string;
  activity_type: string;
  snapshot_data: Record<string, unknown> | null;
  created_at: string;
}
interface ActivitySnapshot {
  dog_call_name?: string;
  handler_name?: string;
  class_count?: number;
  amount_waived?: number;
  before?: { class_count?: number };
  after?: { class_count?: number };
  substitute?: { dog_call_name?: string };
  original?: { dog_call_name?: string };
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
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const [trial, financials, days, breakEvenConfig, timeConfigs, activity, allotments] =
      await Promise.all([
        db.from('trials').select('id,start_date').eq('id', trialId).single(),
        loadTrialFinancialReadModel(trialId),
        fetchAllPages<DayRow>((from, to) =>
          db
            .from('trial_days')
            .select('id,day_number,trial_date')
            .eq('trial_id', trialId)
            .order('day_number')
            .range(from, to)
        ),
        db.from('trial_break_even_config').select('*').eq('trial_id', trialId).maybeSingle(),
        fetchAllPages((from, to) =>
          db
            .from('trial_time_configurations')
            .select('class_name,discipline,minutes_per_run,is_active')
            .eq('trial_id', trialId)
            .eq('is_active', true)
            .order('class_name')
            .range(from, to)
        ),
        fetchAllPages((from, to) =>
          db
            .from('trial_activity_log')
            .select('id,activity_type,snapshot_data,created_at')
            .eq('trial_id', trialId)
            .in('activity_type', ['entry_submitted', 'entry_modified', 'dog_substituted', 'fees_waived'])
            .gte('created_at', twoDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .range(from, to)
        ),
        fetchAllPages((from, to) =>
          db
            .from('trial_daily_allotments')
            .select('trial_day_id,allotted_minutes')
            .order('trial_day_id')
            .range(from, to)
        ),
      ]);
    if (trial.error) throw trial.error;
    if (breakEvenConfig.error) throw breakEvenConfig.error;

    const classes = await fetchInBatches<ClassRow>(days.map((day) => day.id), (ids, from, to) =>
      db
        .from('trial_classes')
        .select('id,trial_day_id,class_name,class_type,max_entries')
        .in('trial_day_id', ids)
        .order('id')
        .range(from, to)
    );
    const rounds = await fetchInBatches<RoundRow>(classes.map((trialClass) => trialClass.id), (ids, from, to) =>
      db
        .from('trial_rounds')
        .select('id,trial_class_id,judge_name,round_status')
        .in('trial_class_id', ids)
        .order('id')
        .range(from, to)
    );

    const entryById = new Map(financials.entries.map((entry) => [entry.id, entry]));
    const payments = financials.competitors.flatMap((competitor) =>
      (competitor.payment_history || []).map((payment) => ({
        ...payment,
        handler_name: entryById.get(payment.entry_id)?.handler_name || '',
        dog_call_name: entryById.get(payment.entry_id)?.dog_call_name || '',
      }))
    );
    const selectionsByEntry = new Map<string, typeof financials.selections>();
    const selectionsByRound = new Map<string, typeof financials.selections>();
    financials.selections.forEach((selection) => {
      const entryList = selectionsByEntry.get(selection.entry_id) || [];
      entryList.push(selection);
      selectionsByEntry.set(selection.entry_id, entryList);
      const roundList = selectionsByRound.get(selection.trial_round_id) || [];
      roundList.push(selection);
      selectionsByRound.set(selection.trial_round_id, roundList);
    });
    const nonFeoEntries = financials.entries.filter((entry) =>
      (selectionsByEntry.get(entry.id) || []).some(
        (selection) => selection.entry_type?.toLowerCase() !== 'feo'
      )
    );
    const competitors = financials.competitors;
    const expectedRevenue = competitors.reduce(
      (sum, competitor) => sum + (competitor.fees_waived ? 0 : competitor.amount_owed),
      0
    );
    const collected = competitors.reduce((sum, competitor) => sum + competitor.amount_paid, 0);
    const outstanding = competitors.reduce(
      (sum, competitor) =>
        sum + Math.max(0, competitor.fees_waived ? 0 : competitor.amount_owed - competitor.amount_paid),
      0
    );
    const configuredRounds = rounds.filter((round) => round.judge_name?.trim());
    const startDate = new Date(`${trial.data.start_date}T12:00:00`);
    const daysUntilStart = Math.ceil((startDate.getTime() - Date.now()) / 86_400_000);

    let breakEvenAnalysis = null;
    const config = breakEvenConfig.data;
    if (config) {
      const totalPaidRuns = competitors.reduce((sum, competitor) => sum + competitor.regular_runs, 0);
      const totalFeoRuns = competitors.reduce((sum, competitor) => sum + competitor.feo_runs, 0);
      const totalWaivedRegular = competitors.reduce((sum, competitor) => sum + competitor.waived_regular_runs, 0);
      const totalWaivedFeo = competitors.reduce((sum, competitor) => sum + competitor.waived_feo_runs, 0);
      const totalRegularRuns = totalPaidRuns + totalWaivedRegular;
      const cwagsExpense = totalRegularRuns * Number(config.regular_cwags_fee || 0);
      const totalFixedCosts =
        Number(config.hall_rental || 0) + Number(config.ribbons || 0) +
        Number(config.insurance || 0) + Number(config.other_fixed_costs || 0) + cwagsExpense;
      const regularNetPerRun =
        Number(config.regular_entry_fee || 0) - Number(config.regular_cwags_fee || 0) - Number(config.regular_judge_fee || 0);
      const feoNetPerRun = Number(config.feo_entry_fee || 0) - Number(config.feo_judge_fee || 0);
      const waivedJudgeCosts =
        totalWaivedRegular * Number(config.regular_judge_fee || 0) +
        totalWaivedFeo * Number(config.feo_judge_fee || 0);
      const currentRevenue = totalPaidRuns * regularNetPerRun + totalFeoRuns * feoNetPerRun;
      const totalAllCosts = totalFixedCosts + waivedJudgeCosts;
      const currentNetIncome = currentRevenue - totalAllCosts;
      const breakEvenRuns = regularNetPerRun > 0 ? Math.ceil(totalFixedCosts / regularNetPerRun) : 0;
      breakEvenAnalysis = {
        totalFixedCosts, cwagsExpense, regularNetPerRun, feoNetPerRun, totalPaidRuns,
        totalFeoRuns, totalWaivedRegular, totalWaivedFeo, totalWaivedCosts: waivedJudgeCosts,
        currentRevenue, totalAllCosts, currentNetIncome, breakEvenRuns,
        paidRunsNeeded: Math.max(0, breakEvenRuns - totalPaidRuns),
        isProfitable: currentNetIncome >= 0,
        progressPercent: breakEvenRuns > 0 ? Math.min(100, Math.round((totalPaidRuns / breakEvenRuns) * 100)) : 100,
      };
    }

    const classById = new Map(classes.map((trialClass) => [trialClass.id, trialClass]));
    const allotmentByDay = new Map(
      allotments.map((allotment: { trial_day_id: string; allotted_minutes: number }) => [allotment.trial_day_id, allotment.allotted_minutes])
    );
    const timeByClass = new Map(
      timeConfigs.map((time: { class_name: string; minutes_per_run: number }) => [time.class_name, Number(time.minutes_per_run)])
    );
    const actionItems: Array<{ type: 'warning' | 'info'; message: string; count?: number }> = [];
    days.forEach((day) => {
      let scheduledMinutes = 0;
      rounds.forEach((round) => {
        const trialClass = classById.get(round.trial_class_id);
        if (!trialClass || trialClass.trial_day_id !== day.id) return;
        const activeCount = (selectionsByRound.get(round.id) || []).filter((selection) => isActiveSelection(selection.entry_status)).length;
        scheduledMinutes += activeCount * (timeByClass.get(trialClass.class_name) || 2.5);
      });
      const allottedMinutes = Number(allotmentByDay.get(day.id) || 250);
      const percentUsed = (scheduledMinutes / allottedMinutes) * 100;
      if (percentUsed >= 80) {
        const minutesOver = scheduledMinutes - allottedMinutes;
        actionItems.push({
          type: 'warning',
          message: minutesOver > 0
            ? `Day ${day.day_number} is ${minutesOver.toFixed(0)} minutes over time limit (${scheduledMinutes.toFixed(0)}/${allottedMinutes} min)`
            : `Day ${day.day_number} is at ${percentUsed.toFixed(0)}% capacity (${scheduledMinutes.toFixed(0)}/${allottedMinutes} min)`,
        });
      }
    });
    const waitlisted = nonFeoEntries.filter((entry) => entry.entry_status === 'waitlisted').length;
    if (waitlisted > 0) actionItems.push({ type: 'info', message: `${waitlisted} waitlisted ${waitlisted === 1 ? 'entry' : 'entries'}`, count: waitlisted });
    const nearCapacity: string[] = [];
    classes.forEach((trialClass) => {
      const classRounds = rounds.filter((round) => round.trial_class_id === trialClass.id);
      const activeCount = classRounds.reduce(
        (sum, round) => sum + (selectionsByRound.get(round.id) || []).filter((selection) => isActiveSelection(selection.entry_status)).length,
        0
      );
      const maxEntries = Number(trialClass.max_entries || 0);
      if (maxEntries > 0 && (activeCount / maxEntries) * 100 >= 90) {
        const spots = maxEntries - activeCount;
        nearCapacity.push(`${trialClass.class_name} (${spots} ${spots === 1 ? 'spot' : 'spots'} left)`);
      }
    });
    if (nearCapacity.length) actionItems.push({ type: 'warning', message: `Classes near capacity: ${nearCapacity.join(', ')}` });

    const recentActivity: Array<{ id: string; type: string; message: string; timestamp: string }> = [];
    activity.forEach((item: ActivityRow) => {
      const snapshot = (item.snapshot_data || {}) as ActivitySnapshot;
      if (item.activity_type === 'entry_submitted') recentActivity.push({ id: item.id, type: 'entry_created', message: `New entry: ${snapshot.dog_call_name} (${snapshot.handler_name}) - ${snapshot.class_count} ${snapshot.class_count === 1 ? 'class' : 'classes'}`, timestamp: item.created_at });
      else if (item.activity_type === 'entry_modified') {
        const added = Number(snapshot.after?.class_count || 0) - Number(snapshot.before?.class_count || 0);
        recentActivity.push({ id: item.id, type: 'entry_modified', message: `Modified: ${snapshot.dog_call_name} - ${added > 0 ? `Added ${added} class${Math.abs(added) !== 1 ? 'es' : ''}` : `Removed ${Math.abs(added)} class${Math.abs(added) !== 1 ? 'es' : ''}`}`, timestamp: item.created_at });
      } else if (item.activity_type === 'dog_substituted') recentActivity.push({ id: item.id, type: 'dog_substituted', message: `Dog substitution: ${snapshot.substitute?.dog_call_name} replaced ${snapshot.original?.dog_call_name}`, timestamp: item.created_at });
      else if (item.activity_type === 'fees_waived') recentActivity.push({ id: item.id, type: 'fees_waived', message: `Fees waived: ${snapshot.dog_call_name} ($${snapshot.amount_waived || 0})`, timestamp: item.created_at });
    });
    payments.filter((payment) => new Date(payment.created_at || 0) >= twoDaysAgo).forEach((payment) => recentActivity.push({
      id: `payment-${payment.id}`, type: 'payment_received',
      message: `Payment: ${payment.handler_name} - $${payment.amount}`,
      timestamp: payment.created_at || '',
    }));
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      trial: trial.data,
      entries: financials.entries,
      selections: financials.selections,
      competitors: financials.competitors,
      days,
      classes,
      rounds,
      breakEvenConfig: breakEvenConfig.data,
      timeConfigs,
      allotments,
      activity,
      payments,
      metrics: {
        totalEntries: nonFeoEntries.length,
        pendingPayment: competitors.filter((competitor) => derivePaymentStatus(competitor.amount_owed, competitor.amount_paid, competitor.fees_waived) === 'pending').length,
        waitlisted,
        confirmed: nonFeoEntries.filter((entry) => entry.entry_status === 'confirmed').length,
        expectedRevenue, collected, outstanding, daysUntilStart,
        runningOrderPublished: rounds.some((round) => round.round_status === 'published'),
        classesSetUp: { total: rounds.length, configured: configuredRounds.length },
        judgesAssigned: { total: rounds.length, assigned: new Set(configuredRounds.map((round) => round.judge_name)).size },
        breakEvenAnalysis,
      },
      outstandingEntries: competitors
        .map((competitor) => ({
          handler_name: competitor.handler_name,
          handler_email: financials.entries.find((entry) => competitor.entry_ids?.includes(entry.id))?.handler_email || '',
          balance: competitor.fees_waived ? 0 : competitor.amount_owed - competitor.amount_paid,
        }))
        .filter((entry) => entry.balance > 0)
        .sort((a, b) => b.balance - a.balance),
      actionItems,
      recentActivity,
    });
  } catch (error) {
    console.error('Secretary dashboard read failed', { trialId, error });
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}
