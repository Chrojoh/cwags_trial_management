import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string; entryId: string; selectionId: string }> }
) {
  try {
    const { trialId, entryId, selectionId } = await params;
    const auth = await requireTrialPermission(request, trialId, 'manage_waitlist');
    if (!auth.authorized) return auth.response;
    const body = await request.json().catch(() => ({}));
    const increaseCapacity = body.increaseCapacity === true;
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.rpc('promote_waitlisted_selection', {
      p_trial_id: trialId,
      p_entry_id: entryId,
      p_selection_id: selectionId,
      p_increase_capacity: increaseCapacity,
      p_promoted_by: auth.userId,
    });

    if (error) {
      const code = ['ROUND_FULL', 'SELECTION_ALREADY_PROMOTED', 'WAITLIST_SELECTION_NOT_FOUND'].find(
        (candidate) => error.message.includes(candidate)
      );
      if (code === 'ROUND_FULL') {
        return NextResponse.json(
          { error: 'This round is full.', code, canIncreaseCapacity: true },
          { status: 409 }
        );
      }
      if (code === 'WAITLIST_SELECTION_NOT_FOUND') {
        return NextResponse.json({ error: 'Waitlisted selection not found', code }, { status: 404 });
      }
      if (code === 'SELECTION_ALREADY_PROMOTED') {
        return NextResponse.json(
          { error: 'This selection has already been promoted.', code },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true, promotion: data });
  } catch (error) {
    console.error('Waitlist promotion failed:', error);
    return NextResponse.json({ error: 'Failed to promote waitlisted round' }, { status: 500 });
  }
}
