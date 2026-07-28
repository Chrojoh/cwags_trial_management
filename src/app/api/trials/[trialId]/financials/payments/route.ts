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
    const amount = Number(body.amount);
    if (!body.entryId || !Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ error: 'A non-zero payment amount is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.rpc('record_entry_payment_atomic', {
      p_trial_id: trialId,
      p_entry_id: body.entryId,
      p_amount: amount,
      p_payment_method: body.paymentMethod || null,
      p_payment_received_by: body.paymentReceivedBy || null,
      p_payment_date: body.paymentDate || null,
      p_notes: body.notes || null,
      p_recorded_by: auth.userId,
    });

    if (error?.message.includes('ENTRY_NOT_FOUND')) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
    if (error?.message.includes('REFUND_EXCEEDS_NET_PAYMENTS')) {
      return NextResponse.json(
        { error: 'Refund cannot exceed the net payments recorded for this entry' },
        { status: 409 }
      );
    }
    if (error) throw error;
    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error('Atomic payment operation failed:', error);
    return NextResponse.json({ error: 'Failed to save payment transaction' }, { status: 500 });
  }
}
