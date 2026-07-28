import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string; paymentId: string }> }
) {
  try {
    const { trialId, paymentId } = await params;
    const auth = await requireTrialPermission(request, trialId, 'manage_financials');
    if (!auth.authorized) return auth.response;
    const body = await request.json();
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ error: 'A non-zero payment amount is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.rpc('update_entry_payment_atomic', {
      p_trial_id: trialId,
      p_transaction_id: paymentId,
      p_amount: amount,
      p_payment_method: body.paymentMethod || null,
      p_payment_received_by: body.paymentReceivedBy || null,
      p_payment_date: body.paymentDate || null,
      p_notes: body.notes || null,
      p_changed_by: auth.userId,
    });

    if (error?.message.includes('PAYMENT_NOT_FOUND')) {
      return NextResponse.json({ error: 'Payment transaction not found' }, { status: 404 });
    }
    if (error?.message.includes('REFUND_EXCEEDS_NET_PAYMENTS')) {
      return NextResponse.json(
        { error: 'Refund cannot exceed the remaining net payments for this entry' },
        { status: 409 }
      );
    }
    if (error) throw error;
    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error('Atomic payment update failed:', error);
    return NextResponse.json({ error: 'Failed to update payment transaction' }, { status: 500 });
  }
}
