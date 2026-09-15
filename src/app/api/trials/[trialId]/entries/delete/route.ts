import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string }> },
) {
  try {
    const { trialId } = await params;
    // Entry deletion also deletes payment records, so assistants may not perform it.
    const auth = await requireTrialPermission(request, trialId, 'manage_financials');
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const entryIds = Array.isArray(body.entryIds)
      ? [...new Set(body.entryIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0))]
      : [];
    if (body.confirmation !== 'DELETE' || entryIds.length === 0) {
      return NextResponse.json({ error: 'Deletion confirmation and at least one entry are required.' }, { status: 400 });
    }

    const { data, error } = await getServiceRoleClient().rpc('delete_trial_entries_atomic', {
      p_trial_id: trialId,
      p_entry_ids: entryIds,
      p_changed_by: auth.userId,
    });
    if (error?.message.includes('ENTRY_NOT_FOUND')) {
      return NextResponse.json({ error: 'One or more entries were not found in this trial.' }, { status: 404 });
    }
    if (error) throw error;

    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error('Atomic entry deletion failed:', error);
    return NextResponse.json({ error: 'Failed to delete entry.' }, { status: 500 });
  }
}
