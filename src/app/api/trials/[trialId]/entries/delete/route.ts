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

    const service = getServiceRoleClient();
    const { data: existingEntries, error: lookupError } = await service
      .from('entries')
      .select('id')
      .eq('trial_id', trialId)
      .in('id', entryIds);
    if (lookupError) throw lookupError;

    const existingEntryIds = (existingEntries || []).map((entry) => entry.id);
    // Treat a repeated request as success. This can happen if a user double-clicks
    // while the first request is completing, and deletion is already complete.
    if (existingEntryIds.length === 0) {
      return NextResponse.json({
        success: true,
        result: { deleted_entries: 0, already_deleted: true },
      });
    }

    const { data, error } = await service.rpc('delete_trial_entries_atomic', {
      p_trial_id: trialId,
      p_entry_ids: existingEntryIds,
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
