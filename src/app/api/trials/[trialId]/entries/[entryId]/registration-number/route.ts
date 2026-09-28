import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth';

const numberPattern = /^\d{2}-\d{4}-\d{2}$/;
const pendingPattern = /^PENDING-[0-9a-f-]{36}$/i;
const nameKey = (value: unknown) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string; entryId: string }> },
) {
  try {
    const { trialId, entryId } = await params;
    const auth = await requireTrialPermission(request, trialId, 'manage_entries');
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const officialNumber = String(body.official_cwags_number || '').trim();
    if (!numberPattern.test(officialNumber)) {
      return NextResponse.json({ error: 'Enter a C-WAGS number in YY-0000-00 format.' }, { status: 400 });
    }

    const db = getServiceRoleClient();
    const { data: entry, error: entryError } = await db
      .from('entries')
      .select('id,handler_name,dog_call_name,cwags_number,registration_pending')
      .eq('id', entryId)
      .eq('trial_id', trialId)
      .maybeSingle();
    if (entryError) throw entryError;
    if (!entry) return NextResponse.json({ error: 'Entry not found.' }, { status: 404 });
    if (!entry.registration_pending || !pendingPattern.test(entry.cwags_number || '')) {
      return NextResponse.json({ error: 'This entry is not waiting for a C-WAGS number.' }, { status: 409 });
    }

    const [{ data: registry, error: registryError }, { count, error: duplicateError }] = await Promise.all([
      db.from('cwags_registry')
        .select('handler_name,dog_call_name')
        .eq('cwags_number', officialNumber)
        .maybeSingle(),
      db.from('entries')
        .select('id', { count: 'exact', head: true })
        .eq('trial_id', trialId)
        .eq('cwags_number', officialNumber)
        .neq('id', entryId),
    ]);
    if (registryError) throw registryError;
    if (duplicateError) throw duplicateError;
    if ((count || 0) > 0) {
      return NextResponse.json({ error: 'Another entry in this trial already uses that number.' }, { status: 409 });
    }
    if (registry && (
      nameKey(registry.handler_name) !== nameKey(entry.handler_name) ||
      nameKey(registry.dog_call_name) !== nameKey(entry.dog_call_name)
    )) {
      return NextResponse.json({ error: 'That number belongs to a different handler or dog in the registry.' }, { status: 409 });
    }

    const { error: updateError } = await db
      .from('entries')
      .update({ cwags_number: officialNumber, registration_pending: false })
      .eq('id', entryId)
      .eq('trial_id', trialId);
    if (updateError) throw updateError;

    const { data: actor } = await db
      .from('users')
      .select('first_name,last_name,email')
      .eq('id', auth.userId)
      .maybeSingle();
    const actorName = [actor?.first_name, actor?.last_name].filter(Boolean).join(' ').trim() || actor?.email || 'Trial secretary';
    const { error: journalError } = await db.from('trial_activity_log').insert({
      trial_id: trialId,
      entry_id: entryId,
      activity_type: 'entry_edited',
      user_id: auth.userId,
      user_name: actorName,
      snapshot_data: {
        handler_name: entry.handler_name,
        dog_call_name: entry.dog_call_name,
        previous_cwags_number: entry.cwags_number,
        registration_number_assigned: officialNumber,
      },
    });
    if (journalError) console.error('Registration-number journal insert failed:', journalError);

    return NextResponse.json({ success: true, cwagsNumber: officialNumber });
  } catch (error) {
    console.error('Secretary registration-number update failed:', error);
    return NextResponse.json({ error: 'Unable to update the C-WAGS number.' }, { status: 500 });
  }
}
