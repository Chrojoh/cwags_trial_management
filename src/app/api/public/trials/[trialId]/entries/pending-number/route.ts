import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/apiAuth';

const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const phoneKey = (value: string) => value.replace(/\D/g, '');
const nameKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

export async function POST(request: NextRequest, { params }: { params: Promise<{ trialId: string }> }) {
  try {
    const { trialId } = await params;
    const body = await request.json();
    const pendingNumber = clean(body.pending_cwags_number, 64);
    const officialNumber = clean(body.official_cwags_number, 32);
    const email = clean(body.email, 254).toLowerCase();
    const phone = phoneKey(clean(body.phone, 64));
    const dog = nameKey(clean(body.dog_name, 120));
    if (!/^PENDING-[0-9a-f-]{36}$/i.test(pendingNumber) || !/^\d{2}-\d{4}-\d{2}$/.test(officialNumber) || !email || phone.length < 7 || !dog) {
      return NextResponse.json({ error: 'Enter the official number, email, phone number, and dog name.' }, { status: 400 });
    }

    const db = getServiceRoleClient();
    const { data: entry, error: entryError } = await db.from('entries')
      .select('id,handler_name,dog_call_name,handler_email,handler_phone')
      .eq('trial_id', trialId).eq('cwags_number', pendingNumber).eq('registration_pending', true).maybeSingle();
    if (entryError) throw entryError;
    const verified = entry && String(entry.handler_email || '').trim().toLowerCase() === email &&
      phoneKey(String(entry.handler_phone || '')) === phone && nameKey(String(entry.dog_call_name || '')) === dog;
    if (!verified) return NextResponse.json({ error: 'The pending entry could not be verified.' }, { status: 403 });

    const { data: registry, error: registryError } = await db.from('cwags_registry')
      .select('handler_name,dog_call_name').eq('cwags_number', officialNumber).maybeSingle();
    if (registryError) throw registryError;
    if (registry && (nameKey(registry.handler_name || '') !== nameKey(entry.handler_name || '') || nameKey(registry.dog_call_name || '') !== dog)) {
      return NextResponse.json({ error: 'That C-WAGS number belongs to a different handler or dog.' }, { status: 409 });
    }
    const { count, error: duplicateError } = await db.from('entries').select('id', { count: 'exact', head: true })
      .eq('trial_id', trialId).eq('cwags_number', officialNumber).neq('id', entry.id);
    if (duplicateError) throw duplicateError;
    if ((count || 0) > 0) return NextResponse.json({ error: 'An entry already uses that number. Please contact the trial secretary.' }, { status: 409 });

    const { error: updateError } = await db.from('entries').update({ cwags_number: officialNumber, registration_pending: false }).eq('id', entry.id);
    if (updateError) throw updateError;
    await db.from('trial_activity_log').insert({
      trial_id: trialId, entry_id: entry.id, activity_type: 'entry_edited', user_name: entry.handler_name,
      snapshot_data: { handler_name: entry.handler_name, dog_call_name: entry.dog_call_name, registration_number_assigned: officialNumber },
    });
    return NextResponse.json({ success: true, cwagsNumber: officialNumber });
  } catch (error) {
    console.error('Pending registration number update failed:', error);
    return NextResponse.json({ error: 'Unable to save the C-WAGS number.' }, { status: 500 });
  }
}
