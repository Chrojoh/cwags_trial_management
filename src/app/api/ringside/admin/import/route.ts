import { NextRequest, NextResponse } from 'next/server';
import { requireAdministrator, getServiceRoleClient } from '@/lib/apiAuth';
import { parseRingsideWorkbook } from '@/lib/ringside/workbook';
export const runtime = 'nodejs';

const groupBy = <T, K>(items: T[], keyFor: (item: T) => K): Map<K, T[]> => {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFor(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
};

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const trialId = String(form.get('trialId') || '');
  const mode = String(form.get('mode') || 'preview');
  const file = form.get('file');
  const auth = await requireAdministrator(req);
  if (!auth.authorized) return auth.response;
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.xlsx'))
    return NextResponse.json({ error: 'Choose an .xlsx workbook.' }, { status: 400 });
  let parsed;
  try {
    parsed = parseRingsideWorkbook(await file.arrayBuffer());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Workbook could not be read.' },
      { status: 400 }
    );
  }
  if (mode === 'preview') return NextResponse.json(parsed);
  const showId = String(form.get('showId') || '');
  const confirm = String(form.get('confirm') || '');
  if (confirm !== 'REPLACE')
    return NextResponse.json({ error: 'Replacement confirmation is required.' }, { status: 400 });
  const db = getServiceRoleClient();
  const { data: show } = await db
    .from('ringside_shows')
    .select('id,trial_id')
    .eq('id', showId)
    .eq('trial_id', trialId)
    .maybeSingle();
  if (!show) return NextResponse.json({ error: 'Ringside show not found.' }, { status: 404 });
  const { data: existing } = await db
    .from('ringside_rings')
    .select('*,ringside_blocks!ringside_blocks_ring_id_fkey(*,ringside_entries(*))')
    .eq('show_id', showId);
  await db
    .from('ringside_import_backups')
    .insert({ show_id: showId, created_by: auth.userId, snapshot: { rings: existing || [] } });
  await db.from('ringside_rings').delete().eq('show_id', showId);
  const ringGroups = groupBy(parsed.runs, (r) => r.ringNumber);
  for (const [ringNumber, runs] of ringGroups) {
    const { data: ring, error } = await db
      .from('ringside_rings')
      .insert({
        show_id: showId,
        ring_number: ringNumber,
        slug: `ring-${ringNumber}`,
        display_name: runs[0].ringName,
        display_order: ringNumber,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const bcrypt = await import('bcryptjs');
    await db
      .from('ringside_ring_secrets')
      .insert({ ring_id: ring.id, pin_hash: await bcrypt.hash(pin, 12) });
    const blockGroups = groupBy(runs, (r) => `${r.blockTitle}|${r.judgeName}`);
    let sequence = 1;
    for (const [, blockRuns] of blockGroups) {
      const { data: block, error: blockError } = await db
        .from('ringside_blocks')
        .insert({
          ring_id: ring.id,
          title: blockRuns[0].blockTitle,
          judge_name: blockRuns[0].judgeName,
          sequence: sequence++,
        })
        .select()
        .single();
      if (blockError) return NextResponse.json({ error: blockError.message }, { status: 400 });
      const rows = blockRuns.map((run) => ({
        block_id: block.id,
        registration_number: run.registrationNumber,
        handler_name: run.handlerName,
        dog_name: run.dogName,
        running_order: run.runningOrder,
        original_running_order: run.runningOrder,
        notes: run.notes,
      }));
      const { error: entryError } = await db.from('ringside_entries').insert(rows);
      if (entryError) return NextResponse.json({ error: entryError.message }, { status: 400 });
    }
  }
  return NextResponse.json({
    ok: true,
    summary: parsed.summary,
    message: 'Workbook imported. New ring PINs were generated; set them from Ringside Setup.',
  });
}
