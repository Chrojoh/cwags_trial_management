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
    if (entryIds.length === 0 || typeof body.waived !== 'boolean') {
      return NextResponse.json({ error: 'Entries and waiver state are required' }, { status: 400 });
    }
    if (body.waived && !String(body.reason || '').trim()) {
      return NextResponse.json({ error: 'A waiver reason is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.rpc('set_entry_fee_waiver_atomic', {
      p_trial_id: trialId,
      p_entry_ids: entryIds,
      p_waived: body.waived,
      p_reason: body.reason || null,
      p_changed_by: auth.userId,
    });

    if (error?.message.includes('ENTRY_NOT_FOUND')) {
      return NextResponse.json({ error: 'One or more entries were not found' }, { status: 404 });
    }
    if (error) throw error;
    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error('Atomic fee waiver failed:', error);
    return NextResponse.json({ error: 'Failed to update fee waiver' }, { status: 500 });
  }
}
