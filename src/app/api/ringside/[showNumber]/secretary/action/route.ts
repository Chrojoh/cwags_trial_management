import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/apiAuth';
import { readSecretarySession } from '@/lib/ringside/server';
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ showNumber: string }> }
) {
  const body = await req.json();
  const session = await readSecretarySession(String(body.ringId || ''));
  if (!session) return NextResponse.json({ error: 'Secretary session required.' }, { status: 401 });
  const db = getServiceRoleClient();
  const { data: ring } = await db
    .from('ringside_rings')
    .select('*,ringside_shows!inner(public_show_number)')
    .eq('id', session.ringId)
    .single();
  if (!ring || ring.ringside_shows.public_show_number !== (await params).showNumber)
    return NextResponse.json({ error: 'This session cannot operate that ring.' }, { status: 403 });
  const now = new Date().toISOString();
  if (body.action === 'ring_state') {
    await db
      .from('ringside_rings')
      .update({ paused: !!body.paused, status_message: String(body.message || '') })
      .eq('id', ring.id);
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'activate_block') {
    const { data: block } = await db
      .from('ringside_blocks')
      .select('id,ring_id')
      .eq('id', body.blockId)
      .single();
    if (!block || block.ring_id !== ring.id)
      return NextResponse.json({ error: 'Block is outside this ring.' }, { status: 403 });
    await db
      .from('ringside_blocks')
      .update({ status: 'scheduled' })
      .eq('ring_id', ring.id)
      .eq('status', 'active');
    await db.from('ringside_blocks').update({ status: 'active' }).eq('id', block.id);
    await db.from('ringside_rings').update({ active_block_id: block.id }).eq('id', ring.id);
    return NextResponse.json({ ok: true });
  }
  const { data: entry } = await db
    .from('ringside_entries')
    .select('*,ringside_blocks!inner(ring_id)')
    .eq('id', body.entryId)
    .single();
  if (!entry || entry.ringside_blocks.ring_id !== ring.id)
    return NextResponse.json({ error: 'Entry is outside this ring.' }, { status: 403 });
  await db.from('ringside_actions').insert({
    show_id: ring.show_id,
    ring_id: ring.id,
    actor_type: 'secretary',
    action: body.action,
    snapshot: { entry },
  });
  const statuses: Record<string, string> = {
    check_in: 'checked_in',
    in_ring: 'in_ring',
    completed: 'completed',
    absent: 'absent',
    scratch: 'scratched',
    conflict_hold: 'conflict_hold',
    available: 'available_waiting_for_secretary',
  };
  if (statuses[body.action]) {
    if (body.action === 'in_ring') {
      const { data: block } = await db
        .from('ringside_blocks')
        .select('id')
        .eq('id', entry.block_id)
        .single();
      await db
        .from('ringside_entries')
        .update({ status: 'checked_in' })
        .neq('id', entry.id)
        .eq('status', 'in_ring')
        .in(
          'block_id',
          (await db.from('ringside_blocks').select('id').eq('ring_id', ring.id)).data?.map(
            (b) => b.id
          ) || []
        );
      await db.from('ringside_rings').update({ active_block_id: block?.id }).eq('id', ring.id);
    }
    await db
      .from('ringside_entries')
      .update({
        status: statuses[body.action],
        entered_ring_at: body.action === 'in_ring' ? now : entry.entered_ring_at,
        completed_at: body.action === 'completed' ? now : null,
        conflict_declared_at: body.action === 'conflict_hold' ? now : entry.conflict_declared_at,
      })
      .eq('id', entry.id);
    return NextResponse.json({ ok: true });
  }
  if (['move_up', 'move_down', 'move_end'].includes(body.action)) {
    const { data: list } = await db
      .from('ringside_entries')
      .select('id,running_order')
      .eq('block_id', entry.block_id)
      .order('running_order');
    const index = list?.findIndex((e) => e.id === entry.id) ?? -1;
    if (body.action === 'move_end')
      await db
        .from('ringside_entries')
        .update({ running_order: (list?.at(-1)?.running_order || 0) + 1 })
        .eq('id', entry.id);
    else {
      const other = list?.[index + (body.action === 'move_up' ? -1 : 1)];
      if (other) {
        await db
          .from('ringside_entries')
          .update({ running_order: other.running_order })
          .eq('id', entry.id);
        await db
          .from('ringside_entries')
          .update({ running_order: entry.running_order })
          .eq('id', other.id);
      }
    }
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'restore') {
    const { data: list } = await db
      .from('ringside_entries')
      .select('*')
      .eq('block_id', entry.block_id)
      .order('running_order');
    const active = (list || []).filter(
      (e) =>
        ![
          'completed',
          'scratched',
          'absent',
          'conflict_hold',
          'available_waiting_for_secretary',
        ].includes(e.status)
    );
    let order;
    if (body.strategy === 'end') order = (active.at(-1)?.running_order || 0) + 1;
    else {
      const current = active.find((e) => e.status === 'in_ring');
      const next = active.find((e) => e.status !== 'in_ring');
      order =
        body.strategy === 'after_current' && current
          ? current.running_order + 0.5
          : next
            ? next.running_order - 0.5
            : 1;
    }
    await db
      .from('ringside_entries')
      .update({
        status: 'waiting',
        running_order: order,
        conflict_reason: '',
        conflict_other_ring: '',
        conflict_return_note: '',
      })
      .eq('id', entry.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
