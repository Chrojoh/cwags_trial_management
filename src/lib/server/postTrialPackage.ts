import 'server-only';

import { getServiceRoleClient } from '@/lib/apiAuth';
import {
  buildPostTrialPackageModel,
  type PostTrialClass,
  type PostTrialDay,
  type PostTrialEntry,
  type PostTrialPackageModel,
  type PostTrialRound,
  type PostTrialScore,
  type PostTrialSelection,
  type PostTrialTrial,
} from '@/lib/postTrialPackage';
import { fetchAllPages, fetchInBatches } from '@/lib/supabasePagination';

const uniqueIds = (values: string[]) => [...new Set(values.filter(Boolean))];

export async function loadPostTrialPackageModel(
  trialId: string
): Promise<PostTrialPackageModel> {
  const db = getServiceRoleClient();
  const [trialResult, days, entries, configResult] = await Promise.all([
    db
      .from('trials')
      .select('id,trial_name,club_name,location,start_date,end_date')
      .eq('id', trialId)
      .single(),
    fetchAllPages<PostTrialDay>((from, to) =>
      db
        .from('trial_days')
        .select('id,trial_date,day_number')
        .eq('trial_id', trialId)
        .order('day_number')
        .range(from, to)
    ),
    fetchAllPages<PostTrialEntry>((from, to) =>
      db
        .from('entries')
        .select(
          'id,handler_name,handler_email,handler_phone,dog_call_name,cwags_number,registration_pending,entry_status,amount_owed,amount_paid,fees_waived'
        )
        .eq('trial_id', trialId)
        .order('id')
        .range(from, to)
    ),
    db
      .from('trial_break_even_config')
      .select('regular_cwags_fee')
      .eq('trial_id', trialId)
      .maybeSingle(),
  ]);
  if (trialResult.error) throw trialResult.error;
  if (configResult.error) throw configResult.error;

  const classes = await fetchInBatches<PostTrialClass>(
    uniqueIds(days.map((day) => day.id)),
    (ids, from, to) =>
      db
        .from('trial_classes')
        .select('id,trial_day_id,class_name,class_type,class_order,games_subclass')
        .in('trial_day_id', ids)
        .order('id')
        .range(from, to)
  );
  const [rounds, selections] = await Promise.all([
    fetchInBatches<PostTrialRound>(uniqueIds(classes.map((item) => item.id)), (ids, from, to) =>
      db
        .from('trial_rounds')
        .select('id,trial_class_id,round_number,judge_name,is_reset')
        .in('trial_class_id', ids)
        .order('id')
        .range(from, to)
    ),
    fetchInBatches<PostTrialSelection>(uniqueIds(entries.map((entry) => entry.id)), (ids, from, to) =>
      db
        .from('entry_selections')
        .select(
          'id,entry_id,trial_round_id,entry_type,entry_status,division,games_subclass'
        )
        .in('entry_id', ids)
        .order('id')
        .range(from, to)
    ),
  ]);
  const scores = await fetchInBatches<PostTrialScore>(
    uniqueIds(selections.map((selection) => selection.id)),
    (ids, from, to) =>
      db
        .from('scores')
        .select(
          'id,entry_selection_id,trial_round_id,pass_fail,entry_status,numerical_score,time_seconds,scent1,scent2,scent3,scent4,fault1,fault2'
        )
        .in('entry_selection_id', ids)
        .order('id')
        .range(from, to)
  );

  return buildPostTrialPackageModel({
    trial: trialResult.data as PostTrialTrial,
    days,
    classes,
    rounds,
    entries,
    selections,
    scores,
    cwagsFeePerRun: Number(configResult.data?.regular_cwags_fee || 0),
  });
}
