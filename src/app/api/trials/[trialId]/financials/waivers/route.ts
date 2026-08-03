import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth';
import { calculateSelectionFees } from '@/lib/financialRules';

const isMissingAtomicWaiverFunction = (error: { code?: string; message?: string } | null) =>
  error?.code === 'PGRST202' ||
  Boolean(error?.message?.includes('set_entry_fee_waiver_atomic'));

async function setEntryFeeWaiverFallback(
  supabase: ReturnType<typeof getServiceRoleClient>,
  trialId: string,
  entryIds: string[],
  waived: boolean,
  reason: string | null,
  changedBy: string
) {
  const { data: entries, error: entriesError } = await supabase
    .from('entries')
    .select('id, handler_name, dog_call_name, amount_owed')
    .eq('trial_id', trialId)
    .in('id', entryIds);
  if (entriesError) throw entriesError;
  if ((entries || []).length !== entryIds.length) {
    throw new Error('ENTRY_NOT_FOUND');
  }

  const [{ data: selections, error: selectionsError }, { data: payments, error: paymentsError }] =
    await Promise.all([
      supabase
        .from('entry_selections')
        .select('entry_id, fee, entry_status')
        .in('entry_id', entryIds),
      supabase
        .from('entry_payment_transactions')
        .select('entry_id, amount')
        .in('entry_id', entryIds),
    ]);
  if (selectionsError) throw selectionsError;
  if (paymentsError) throw paymentsError;

  const { data: user } = await supabase
    .from('users')
    .select('first_name, last_name')
    .eq('id', changedBy)
    .maybeSingle();
  const userName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Administrator';
  const results = [];

  for (const entry of entries || []) {
    const entrySelections = (selections || []).filter((selection) => selection.entry_id === entry.id);
    const grossFee = calculateSelectionFees(entrySelections);
    const amountPaid = (payments || [])
      .filter((payment) => payment.entry_id === entry.id)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const amountOwed = waived ? amountPaid : grossFee;
    const paymentStatus = waived
      ? 'waived'
      : amountOwed - amountPaid < -0.005
        ? 'overpaid'
        : amountOwed - amountPaid <= 0.005
          ? 'paid'
          : 'pending';

    const { error: updateError } = await supabase
      .from('entries')
      .update({
        fees_waived: waived,
        waiver_reason: waived ? reason : null,
        total_fee: grossFee,
        amount_owed: amountOwed,
        amount_paid: amountPaid,
        payment_status: paymentStatus,
      })
      .eq('trial_id', trialId)
      .eq('id', entry.id);
    if (updateError) throw updateError;

    const financialStatus = {
      entryId: entry.id,
      amountOwed,
      amountPaid,
      balance: waived ? 0 : amountOwed - amountPaid,
      paymentStatus,
    };
    const { error: logError } = await supabase.from('trial_activity_log').insert({
      trial_id: trialId,
      activity_type: waived ? 'fees_waived' : 'fees_unwaived',
      entry_id: entry.id,
      snapshot_data: {
        handler_name: entry.handler_name,
        dog_call_name: entry.dog_call_name,
        reason,
        previous_amount_owed: entry.amount_owed,
        gross_billable_fee: grossFee,
        financial_status: financialStatus,
        compatibility_fallback: true,
      },
      user_id: changedBy,
      user_name: userName,
    });
    if (logError) throw logError;
    results.push(financialStatus);
  }

  return { entries: results, waived, compatibilityFallback: true };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string }> }
) {
  try {
    const { trialId } = await params;
    const auth = await requireTrialPermission(request, trialId, 'manage_financials');
    if (!auth.authorized) return auth.response;
    const body = await request.json();
    const entryIds: string[] = Array.isArray(body.entryIds)
      ? [
          ...new Set<string>(
            (body.entryIds as unknown[]).filter(
              (id: unknown): id is string => typeof id === 'string'
            )
          ),
        ]
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
    if (isMissingAtomicWaiverFunction(error)) {
      const fallbackResult = await setEntryFeeWaiverFallback(
        supabase,
        trialId,
        entryIds,
        body.waived,
        body.reason || null,
        auth.userId
      );
      return NextResponse.json({ success: true, result: fallbackResult });
    }
    if (error) throw error;
    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error('Atomic fee waiver failed:', error);
    return NextResponse.json({ error: 'Failed to update fee waiver' }, { status: 500 });
  }
}
