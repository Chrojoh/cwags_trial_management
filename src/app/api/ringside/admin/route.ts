import { NextRequest, NextResponse } from 'next/server';
import { requireAdministrator, getServiceRoleClient } from '@/lib/apiAuth';
import { hashPin } from '@/lib/ringside/server';
const slug = (n: number) => `ring-${n}`;
export async function GET(req: NextRequest) {
  const trialId = req.nextUrl.searchParams.get('trialId') || '';
  const auth = await requireAdministrator(req);
  if (!auth.authorized) return auth.response;
  const db = getServiceRoleClient();
  const { data: show, error } = await db
    .from('ringside_shows')
    .select('*')
    .eq('trial_id', trialId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!show) return NextResponse.json({ show: null });

  const { data: rings, error: ringsError } = await db
    .from('ringside_rings')
    .select('*')
    .eq('show_id', show.id)
    .order('display_order');
  if (ringsError) return NextResponse.json({ error: ringsError.message }, { status: 500 });

  const ringIds = (rings || []).map((ring) => ring.id);
  const { data: blocks, error: blocksError } = ringIds.length
    ? await db.from('ringside_blocks').select('*').in('ring_id', ringIds).order('sequence')
    : { data: [], error: null };
  if (blocksError) return NextResponse.json({ error: blocksError.message }, { status: 500 });

  const blockIds = (blocks || []).map((block) => block.id);
  const { data: entries, error: entriesError } = blockIds.length
    ? await db.from('ringside_entries').select('*').in('block_id', blockIds).order('running_order')
    : { data: [], error: null };
  if (entriesError) return NextResponse.json({ error: entriesError.message }, { status: 500 });

  const hydratedRings = (rings || []).map((ring) => ({
    ...ring,
    ringside_blocks: (blocks || [])
      .filter((block) => block.ring_id === ring.id)
      .map((block) => ({
        ...block,
        ringside_entries: (entries || []).filter((entry) => entry.block_id === block.id),
      })),
  }));
  return NextResponse.json({ show: { ...show, ringside_rings: hydratedRings } });
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const auth = await requireAdministrator(req);
  if (!auth.authorized) return auth.response;
  const db = getServiceRoleClient();
  const number = String(body.publicShowNumber || '').trim();
  if (!number)
    return NextResponse.json({ error: 'Public Show Number is required.' }, { status: 400 });
  const { data: duplicate } = await db
    .from('ringside_shows')
    .select('id')
    .eq('public_show_number', number)
    .neq('trial_id', body.trialId)
    .maybeSingle();
  if (duplicate)
    return NextResponse.json(
      { error: 'That Public Show Number is already in use.' },
      { status: 409 }
    );
  const { data: show, error } = await db
    .from('ringside_shows')
    .upsert(
      {
        trial_id: body.trialId,
        public_show_number: number,
        title: body.title,
        show_date: body.showDate || null,
        venue: body.venue || '',
        status: body.status || 'draft',
        created_by: auth.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'trial_id' }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ show });
}
export async function PATCH(req: NextRequest) {
  const auth = await requireAdministrator(req);
  if (!auth.authorized) return auth.response;
  const body = await req.json();
  const db = getServiceRoleClient();
  const { data: show } = await db
    .from('ringside_shows')
    .select('trial_id')
    .eq('id', body.showId)
    .single();
  if (!show) return NextResponse.json({ error: 'Show not found' }, { status: 404 });
  if (body.action === 'add_ring') {
    const n = Number(body.ringNumber);
    const pin = String(body.pin || Math.floor(100000 + Math.random() * 900000));
    const { data: ring, error } = await db
      .from('ringside_rings')
      .insert({
        show_id: body.showId,
        ring_number: n,
        slug: slug(n),
        display_name: body.displayName || '',
        display_order: Number(body.displayOrder || n),
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await db
      .from('ringside_ring_secrets')
      .insert({ ring_id: ring.id, pin_hash: await hashPin(pin) });
    return NextResponse.json({ ring, pin });
  }
  if (body.action === 'set_pin') {
    const pin = String(body.pin || '');
    if (!/^\d{4,12}$/.test(pin))
      return NextResponse.json({ error: 'PIN must contain 4–12 digits.' }, { status: 400 });
    await db.from('ringside_ring_secrets').upsert({
      ring_id: body.ringId,
      pin_hash: await hashPin(pin),
      failed_attempts: 0,
      locked_until: null,
    });
    await db
      .from('ringside_rings')
      .update({ session_version: Number(body.sessionVersion || 1) + 1 })
      .eq('id', body.ringId);
    return NextResponse.json({ ok: true, pin });
  }
  if (body.action === 'update_show') {
    const { error } = await db
      .from('ringside_shows')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', body.showId);
    return error
      ? NextResponse.json({ error: error.message }, { status: 400 })
      : NextResponse.json({ ok: true });
  }
  if (body.action === 'update_ring') {
    const { error } = await db
      .from('ringside_rings')
      .update({
        display_name: body.displayName,
        display_order: body.displayOrder,
        ring_number: body.ringNumber,
        slug: slug(body.ringNumber),
      })
      .eq('id', body.ringId);
    return error
      ? NextResponse.json({ error: error.message }, { status: 400 })
      : NextResponse.json({ ok: true });
  }
  if (body.action === 'delete_ring') {
    await db.from('ringside_rings').delete().eq('id', body.ringId);
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'save_entry') {
    const { error } = await db
      .from('ringside_entries')
      .update({
        running_order: body.runningOrder,
        registration_number: body.registrationNumber,
        handler_name: body.handlerName,
        dog_name: body.dogName,
        notes: body.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.entryId);
    return error
      ? NextResponse.json({ error: error.message }, { status: 400 })
      : NextResponse.json({ ok: true });
  }
  if (body.action === 'move_block') {
    const { data: block } = await db
      .from('ringside_blocks')
      .select('id,ring_id,sequence')
      .eq('id', body.blockId)
      .maybeSingle();
    if (!block) return NextResponse.json({ error: 'Class/round not found.' }, { status: 404 });
    const { data: ring } = await db
      .from('ringside_rings')
      .select('show_id')
      .eq('id', block.ring_id)
      .maybeSingle();
    if (!ring || ring.show_id !== body.showId)
      return NextResponse.json({ error: 'Class/round is outside this show.' }, { status: 403 });
    const { data: blocks } = await db
      .from('ringside_blocks')
      .select('id,sequence')
      .eq('ring_id', block.ring_id)
      .order('sequence');
    const currentIndex = blocks?.findIndex((item) => item.id === block.id) ?? -1;
    const targetIndex = currentIndex + (body.direction === 'up' ? -1 : 1);
    const target = blocks?.[targetIndex];
    if (currentIndex < 0 || !target) return NextResponse.json({ ok: true });
    const temporarySequence = -Math.abs(block.sequence) - 1000000;
    const first = await db
      .from('ringside_blocks')
      .update({ sequence: temporarySequence })
      .eq('id', block.id);
    if (first.error) return NextResponse.json({ error: first.error.message }, { status: 400 });
    const second = await db
      .from('ringside_blocks')
      .update({ sequence: block.sequence })
      .eq('id', target.id);
    if (second.error) return NextResponse.json({ error: second.error.message }, { status: 400 });
    const third = await db
      .from('ringside_blocks')
      .update({ sequence: target.sequence })
      .eq('id', block.id);
    return third.error
      ? NextResponse.json({ error: third.error.message }, { status: 400 })
      : NextResponse.json({ ok: true });
  }
  if (body.action === 'reorder_blocks') {
    const orderedIds = Array.isArray(body.blockIds) ? body.blockIds.map(String) : [];
    if (!orderedIds.length)
      return NextResponse.json({ error: 'No class/round sequence was supplied.' }, { status: 400 });
    const { data: ring } = await db
      .from('ringside_rings')
      .select('id,show_id')
      .eq('id', body.ringId)
      .maybeSingle();
    if (!ring || ring.show_id !== body.showId)
      return NextResponse.json({ error: 'Ring is outside this show.' }, { status: 403 });
    const { data: blocks } = await db.from('ringside_blocks').select('id').eq('ring_id', ring.id);
    const existingIds = new Set((blocks || []).map((block) => block.id));
    if (
      orderedIds.length !== existingIds.size ||
      orderedIds.some((blockId: string) => !existingIds.has(blockId))
    )
      return NextResponse.json(
        { error: 'The supplied sequence does not match this ring.' },
        { status: 400 }
      );
    for (let index = 0; index < orderedIds.length; index++) {
      const temporary = await db
        .from('ringside_blocks')
        .update({ sequence: -1000000 - index })
        .eq('id', orderedIds[index]);
      if (temporary.error)
        return NextResponse.json({ error: temporary.error.message }, { status: 400 });
    }
    for (let index = 0; index < orderedIds.length; index++) {
      const saved = await db
        .from('ringside_blocks')
        .update({ sequence: index + 1 })
        .eq('id', orderedIds[index]);
      if (saved.error) return NextResponse.json({ error: saved.error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
