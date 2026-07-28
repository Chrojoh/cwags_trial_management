import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string }> }
) {
  try {
    const { trialId } = await params;
    const auth = await requireTrialPermission(request, trialId, 'manage_financials');
    if (!auth.authorized) return auth.response;
    const body = await request.json();
    const entryIds = Array.isArray(body.entryIds)
      ? [...new Set(body.entryIds.filter((id: unknown) => typeof id === 'string'))]
      : [];
    const regularRate = Number(body.regularRate);
    const feoRate = Number(body.feoRate);
    if (
      entryIds.length === 0 ||
      typeof body.isJudgeVolunteer !== 'boolean' ||
      !Number.isFinite(regularRate) || regularRate < 0 ||
      !Number.isFinite(feoRate) || feoRate < 0
    ) {
      return NextResponse.json({ error: 'Valid entries and pricing are required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.rpc('set_judge_volunteer_pricing_atomic', {
      p_trial_id: trialId,
      p_entry_ids: entryIds,
      p_is_judge_volunteer: body.isJudgeVolunteer,
      p_regular_rate: regularRate,
      p_feo_rate: feoRate,
      p_changed_by: auth.userId,
    });
    if (error?.message.includes('ENTRY_NOT_FOUND')) {
      return NextResponse.json({ error: 'One or more entries were not found' }, { status: 404 });
    }
    if (error) throw error;
    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error('Atomic judge/volunteer pricing failed:', error);
    return NextResponse.json({ error: 'Failed to update judge/volunteer pricing' }, { status: 500 });
  }
}
