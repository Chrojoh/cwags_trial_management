import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth';

const VALID_STATUSES = new Set(['confirmed', 'waitlisted', 'withdrawn']);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string; entryId: string }> }
) {
  try {
    const { trialId, entryId } = await params;
    const auth = await requireTrialPermission(request, trialId, 'manage_entries');
    if (!auth.authorized) return auth.response;
    const { status } = await request.json();
    if (!VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid entry status' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.rpc('set_entry_status_atomic', {
      p_trial_id: trialId,
      p_entry_id: entryId,
      p_status: status,
      p_changed_by: auth.userId,
    });

    if (error?.message.includes('ENTRY_NOT_FOUND')) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
    if (error) throw error;

    return NextResponse.json({ success: true, summary: data });
  } catch (error) {
    console.error('Entry status update failed:', error);
    return NextResponse.json({ error: 'Failed to update entry status' }, { status: 500 });
  }
}
