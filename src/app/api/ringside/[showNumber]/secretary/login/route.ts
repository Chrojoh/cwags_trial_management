import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireAdministrator } from '@/lib/apiAuth';
import { createSecretarySession, verifyPin } from '@/lib/ringside/server';
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ showNumber: string }> }
) {
  const { showNumber } = await params;
  const { ringSlug, pin } = await req.json();
  const db = getServiceRoleClient();
  const { data: ring } = await db
    .from('ringside_rings')
    .select(
      'id,show_id,session_version,ring_number,display_name,ringside_shows!inner(public_show_number,title,trial_id)'
    )
    .eq('slug', ringSlug)
    .eq('ringside_shows.public_show_number', showNumber)
    .maybeSingle();
  if (!ring) return NextResponse.json({ error: 'Ring not found.' }, { status: 404 });
  if (req.headers.get('authorization')) {
    const admin = await requireAdministrator(req);
    if (admin.authorized) {
      await createSecretarySession(ring.show_id, ring.id, ring.session_version);
      return NextResponse.json({ ok: true });
    }
  }
  const { data: secret } = await db
    .from('ringside_ring_secrets')
    .select('*')
    .eq('ring_id', ring.id)
    .single();
  if (secret.locked_until && new Date(secret.locked_until) > new Date())
    return NextResponse.json(
      { error: 'Too many incorrect attempts. Wait before trying again.' },
      { status: 429 }
    );
  if (!(await verifyPin(String(pin || ''), secret.pin_hash))) {
    const attempts = secret.failed_attempts + 1;
    await db
      .from('ringside_ring_secrets')
      .update({
        failed_attempts: attempts,
        locked_until: attempts >= 5 ? new Date(Date.now() + 5 * 60_000).toISOString() : null,
      })
      .eq('ring_id', ring.id);
    return NextResponse.json({ error: 'Incorrect PIN.' }, { status: 401 });
  }
  await db
    .from('ringside_ring_secrets')
    .update({ failed_attempts: 0, locked_until: null })
    .eq('ring_id', ring.id);
  await createSecretarySession(ring.show_id, ring.id, ring.session_version);
  return NextResponse.json({ ok: true });
}
