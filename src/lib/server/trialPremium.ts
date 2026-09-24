import { getServiceRoleClient } from '@/lib/apiAuth';
import { getClassOrder } from '@/lib/cwagsClassNames';
import {
  EMPTY_PREMIUM_CONTENT,
  type PremiumStatus,
  type TrialPremiumContent,
  type TrialPremiumModel,
} from '@/types/trialPremium';

const premiumSelect = 'status,content,map_image_path,updated_at,updated_by';

export async function loadTrialPremium(trialId: string): Promise<TrialPremiumModel> {
  const db = getServiceRoleClient();
  const [trialResult, daysResult, premiumResult] = await Promise.all([
    db.from('trials').select('id,trial_name,club_name,location,start_date,end_date,entry_open_at,entry_timezone,entries_close_date,trial_secretary,secretary_email,secretary_phone,waiver_text').eq('id', trialId).single(),
    db.from('trial_days').select('id,day_number,trial_date,trial_classes(id,class_name,class_order,entry_fee,feo_price,trial_rounds(round_number,judge_name,feo_available))').eq('trial_id', trialId).order('day_number'),
    db.from('trial_premiums').select(premiumSelect).eq('trial_id', trialId).maybeSingle(),
  ]);

  if (trialResult.error || !trialResult.data) throw new Error('Trial not found');
  if (daysResult.error) throw new Error(daysResult.error.message);

  const tableMissing = premiumResult.error?.code === '42P01' || premiumResult.error?.code === 'PGRST205';
  if (premiumResult.error && !tableMissing) throw new Error(premiumResult.error.message);

  const trial = trialResult.data;
  const saved = premiumResult.data as {
    status?: PremiumStatus;
    content?: Partial<TrialPremiumContent>;
    updated_at?: string | null;
    updated_by?: string | null;
    map_image_path?: string | null;
  } | null;
  const content = { ...EMPTY_PREMIUM_CONTENT, ...(saved?.content || {}) };
  const schedule = (daysResult.data || []).flatMap((day: any) =>
    (day.trial_classes || []).flatMap((trialClass: any) =>
      (trialClass.trial_rounds || []).map((round: any) => ({
        date: String(day.trial_date || ''),
        dayNumber: Number(day.day_number || 0),
        className: String(trialClass.class_name || ''),
        classOrder: Number(trialClass.class_order ?? getClassOrder(trialClass.class_name)),
        roundNumber: Number(round.round_number || 0),
        judgeName: String(round.judge_name || ''),
        entryFee: Number(trialClass.entry_fee || 0),
        feoPrice: Number(trialClass.feo_price || 0),
        feoAvailable: Boolean(round.feo_available),
      }))
    )
  ).sort((a: any, b: any) =>
    a.date.localeCompare(b.date) || a.classOrder - b.classOrder || a.roundNumber - b.roundNumber
  );

  const missingRequired = [
    !content.paymentInstructions && 'Payment instructions',
    !content.refundPolicy && 'Refund/cancellation policy',
    !content.facilityInformation && 'Facility information',
    !content.veterinarianInformation && 'Veterinarian information',
    !content.emergencyInformation && 'Emergency information',
    !content.directionsInformation && 'Directions and arrival information',
    !content.safetyRules && 'Safety and comfort rules',
    !trial.waiver_text && 'Waiver text',
    schedule.length === 0 && 'Class and round schedule',
  ].filter(Boolean) as string[];

  return {
    trial: {
      id: trial.id,
      trialName: trial.trial_name || '',
      clubName: trial.club_name || '',
      location: trial.location || '',
      startDate: trial.start_date || '',
      endDate: trial.end_date || '',
      entryOpenAt: trial.entry_open_at || null,
      entryTimezone: trial.entry_timezone || null,
      entriesCloseDate: trial.entries_close_date || null,
      secretaryName: trial.trial_secretary || '',
      secretaryEmail: trial.secretary_email || '',
      secretaryPhone: trial.secretary_phone || '',
      waiverText: trial.waiver_text || '',
    },
    schedule,
    status: saved?.status || 'draft',
    content,
    updatedAt: saved?.updated_at || null,
    updatedBy: saved?.updated_by || null,
    mapImagePath: saved?.map_image_path || null,
    missingRequired,
    setupRequired: tableMissing,
  };
}

export async function saveTrialPremium(
  trialId: string,
  content: TrialPremiumContent,
  status: PremiumStatus,
  userId: string
) {
  const db = getServiceRoleClient();
  const { error } = await db.from('trial_premiums').upsert({
    trial_id: trialId,
    content,
    status,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'trial_id' });
  if (error) throw new Error(error.message);
}

export async function saveTrialPremiumMap(trialId: string, path: string, userId: string) {
  const db = getServiceRoleClient();
  const { data: existing, error: readError } = await db
    .from('trial_premiums').select('content,status').eq('trial_id', trialId).maybeSingle();
  if (readError) throw new Error(readError.message);
  const { error } = await db.from('trial_premiums').upsert({
    trial_id: trialId,
    content: existing?.content || EMPTY_PREMIUM_CONTENT,
    status: existing?.status || 'draft',
    map_image_path: path,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'trial_id' });
  if (error) throw new Error(error.message);
}
