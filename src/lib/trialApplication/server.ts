import { getServiceRoleClient } from '@/lib/apiAuth';
import { mapTrialApplicationData } from './mapper';
import type { TrialApplicationOverrides } from '@/types/trialApplication';
import { getQualifiedJudges } from '@/lib/judgeSelector';
import type { Judge } from '@/types/judge';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function getTrialApplicationData(
  trialId: string,
  overrides: TrialApplicationOverrides = {},
  databaseClient?: SupabaseClient
) {
  const supabase = databaseClient || getServiceRoleClient();
  const [{ data: trial, error: trialError }, { data: days, error: daysError }, { data: judges, error: judgesError }] = await Promise.all([
    supabase.from('trials').select('*').eq('id', trialId).single(),
    supabase
      .from('trial_days')
      .select('day_number,trial_date,trial_classes(id,class_name,class_type,class_order,trial_rounds(id,round_number,judge_name,judge_email,has_reset,reset_judge_name,reset_judge_email,is_reset))')
      .eq('trial_id', trialId)
      .order('trial_date'),
    supabase.from('judges').select('*').eq('is_active', true),
  ]);
  if (trialError) throw trialError;
  if (daysError) throw daysError;
  if (judgesError) throw judgesError;
  const data = mapTrialApplicationData(trial, days || [], overrides);
  data.resetJudgeOptions = Object.fromEntries(
    data.resetIssues.map((issue) => [
      issue.parentRoundId,
      getQualifiedJudges((judges || []) as Judge[], issue.classNameForCertification),
    ])
  );
  return data;
}
