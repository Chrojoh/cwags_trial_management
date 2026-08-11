import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/apiAuth';
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ showNumber: string }> }
) {
  const { showNumber } = await params;
  const body = await req.json();
  const db = getServiceRoleClient();
  const { data: entry, error: entryError } = await db
    .from('ringside_entries')
    .select(
      '*,ringside_blocks!inner(ringside_rings!ringside_blocks_ring_id_fkey!inner(show_id,ringside_shows!inner(public_show_number,status)))'
    )
    .eq('id', body.entryId)
    .maybeSingle();
  if (entryError) {
    console.error('Unable to load ringside competitor entry:', entryError);
    return NextResponse.json({ error: 'Unable to load this run.' }, { status: 500 });
  }
  const show = entry?.ringside_blocks?.ringside_rings?.ringside_shows;
  if (
    !entry ||
    show?.public_show_number !== showNumber ||
    !['published', 'paused'].includes(show.status)
  )
    return NextResponse.json({ error: 'Run not found.' }, { status: 404 });
  if (
    entry.registration_number.trim().toLowerCase() !==
    String(body.registrationNumber || '')
      .trim()
      .toLowerCase()
  )
    return NextResponse.json(
      { error: 'Registration number does not match this run.' },
      { status: 403 }
    );
  if (body.action === 'declare_conflict') {
    const { error } = await db
      .from('ringside_entries')
      .update({
        status: 'conflict_hold',
        conflict_reason: String(body.reason || 'Ring conflict').slice(0, 180),
        conflict_other_ring: String(body.otherRing || '').slice(0, 80),
        conflict_return_note: String(body.returnNote || '').slice(0, 180),
        conflict_declared_at: new Date().toISOString(),
      })
      .eq('id', entry.id);
    if (error) {
      console.error('Unable to declare ringside conflict:', error);
      return NextResponse.json({ error: 'Unable to save the conflict.' }, { status: 500 });
    }
  } else if (body.action === 'available') {
    const { error } = await db
      .from('ringside_entries')
      .update({
        status: 'available_waiting_for_secretary',
        conflict_return_note: 'Handler reports available — secretary must restore queue placement.',
      })
      .eq('id', entry.id);
    if (error) {
      console.error('Unable to mark ringside competitor available:', error);
      return NextResponse.json({ error: 'Unable to update this run.' }, { status: 500 });
    }
  } else return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
