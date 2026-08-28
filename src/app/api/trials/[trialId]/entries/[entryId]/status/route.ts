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
    if (error?.message.includes('TRIAL_USES_LEGACY_ENTRY_SUMMARY_MODEL')) {
      const { data: entry, error: entryError } = await supabase
        .from('entries')
        .select(
          'id,entry_status,handler_name,dog_call_name,cwags_number,total_fee,amount_owed'
        )
        .eq('id', entryId)
        .eq('trial_id', trialId)
        .maybeSingle();
      if (entryError) throw entryError;
      if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

      const { error: updateError } = await supabase
        .from('entries')
        .update({ entry_status: status })
        .eq('id', entryId)
        .eq('trial_id', trialId);
      if (updateError) throw updateError;

      const { data: actor } = await supabase
        .from('users')
        .select('first_name,last_name')
        .eq('id', auth.userId)
        .maybeSingle();
      const actorName = [actor?.first_name, actor?.last_name].filter(Boolean).join(' ').trim();
      const { error: journalError } = await supabase.from('trial_activity_log').insert({
        trial_id: trialId,
        activity_type: 'entry_status_changed',
        entry_id: entryId,
        snapshot_data: {
          handler_name: entry.handler_name,
          dog_call_name: entry.dog_call_name,
          cwags_number: entry.cwags_number,
          previous_status: entry.entry_status,
          requested_status: status,
          resulting_status: status,
          total_fee: entry.total_fee,
          amount_owed: entry.amount_owed,
          legacy_summary_model: true,
        },
        user_id: auth.userId,
        user_name: actorName || 'Administrator',
      });
      if (journalError) {
        console.error('Legacy entry status journal insert failed:', journalError);
      }

      return NextResponse.json({
        success: true,
        summary: {
          entryId,
          entryStatus: status,
          totalFee: entry.total_fee,
          amountOwed: entry.amount_owed,
          legacySummaryModel: true,
        },
      });
    }
    if (error) throw error;

    return NextResponse.json({ success: true, summary: data });
  } catch (error) {
    console.error('Entry status update failed:', error);
    return NextResponse.json({ error: 'Failed to update entry status' }, { status: 500 });
  }
}
