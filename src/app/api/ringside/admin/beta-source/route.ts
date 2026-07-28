import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireAdministrator } from '@/lib/apiAuth';
import { hashPin } from '@/lib/ringside/server';

type RoundSource = {
  id: string;
  trial_day_id: string;
  title: string;
  judge_name: string;
  sequence: number;
  games_subclass: string | null;
  entries: Array<{
    registration_number: string;
    handler_name: string;
    dog_name: string;
    running_order: number;
    entry_type: string;
  }>;
};

async function loadSource(trialId: string) {
  const db = getServiceRoleClient();
  const [
    { data: days, error: dayError },
    { data: classes, error: classError },
    { data: entries, error: entryError },
  ] = await Promise.all([
    db
      .from('trial_days')
      .select('id,day_number,trial_date')
      .eq('trial_id', trialId)
      .order('day_number'),
    db
      .from('trial_classes')
      .select(
        'id,trial_day_id,class_name,class_type,games_subclass,class_order,trial_days!inner(trial_id),trial_rounds(id,round_number,judge_name)'
      )
      .eq('trial_days.trial_id', trialId),
    db
      .from('entries')
      .select(
        'handler_name,dog_call_name,cwags_number,entry_selections!entry_selections_entry_id_fkey(trial_round_id,running_position,entry_status,entry_type,games_subclass)'
      )
      .eq('trial_id', trialId),
  ]);
  const error = dayError || classError || entryError;
  if (error) throw new Error(error.message);
  const rounds: RoundSource[] = [];
  for (const trialClass of classes || []) {
    const subclasses =
      trialClass.class_type === 'games' && trialClass.games_subclass
        ? String(trialClass.games_subclass)
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : [null];
    for (const round of trialClass.trial_rounds || []) {
      for (const subclass of subclasses) {
        const roundEntries: RoundSource['entries'] = [];
        for (const entry of entries || []) {
          for (const selection of entry.entry_selections || []) {
            if (selection.trial_round_id !== round.id) continue;
            if (subclass && selection.games_subclass !== subclass) continue;
            if (
              ['withdrawn', 'waitlisted', 'scratched'].includes(
                String(selection.entry_status || '').toLowerCase()
              )
            )
              continue;
            roundEntries.push({
              registration_number: entry.cwags_number || '',
              handler_name: entry.handler_name || '',
              dog_name: entry.dog_call_name || '',
              running_order: Number(selection.running_position || 0),
              entry_type: selection.entry_type || 'regular',
            });
          }
        }
        roundEntries.sort((a, b) => a.running_order - b.running_order);
        rounds.push({
          id: subclass ? `${round.id}-${subclass}` : round.id,
          trial_day_id: trialClass.trial_day_id,
          title: `${trialClass.class_name}${subclass ? ` — ${subclass}` : ''} — Round ${round.round_number || 1}`,
          judge_name: round.judge_name || '',
          sequence: Number(trialClass.class_order || 999) * 100 + Number(round.round_number || 1),
          games_subclass: subclass,
          entries: roundEntries,
        });
      }
    }
  }
  rounds.sort((a, b) => a.sequence - b.sequence || a.title.localeCompare(b.title));
  return { days: days || [], rounds };
}

export async function GET(req: NextRequest) {
  const trialId = req.nextUrl.searchParams.get('trialId') || '';
  const auth = await requireAdministrator(req);
  if (!auth.authorized) return auth.response;
  try {
    return NextResponse.json(await loadSource(trialId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load running order.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const auth = await requireAdministrator(req);
  if (!auth.authorized) return auth.response;
  const db = getServiceRoleClient();
  const { data: show } = await db
    .from('ringside_shows')
    .select('id,trial_id')
    .eq('id', body.showId)
    .eq('trial_id', body.trialId)
    .maybeSingle();
  if (!show) return NextResponse.json({ error: 'Ringside show not found.' }, { status: 404 });
  const source = await loadSource(body.trialId);
  const selected = source.rounds.filter((round) => round.trial_day_id === body.dayId);
  if (!selected.length)
    return NextResponse.json({ error: 'No rounds were found for that day.' }, { status: 400 });
  const ringNames = Array.isArray(body.ringNames) ? body.ringNames.map(String) : [];
  if (!ringNames.length || ringNames.some((name: string) => !name.trim()))
    return NextResponse.json({ error: 'Every ring needs a name.' }, { status: 400 });

  const { data: existing } = await db
    .from('ringside_rings')
    .select('*,ringside_blocks!ringside_blocks_ring_id_fkey(*,ringside_entries(*))')
    .eq('show_id', show.id);
  await db
    .from('ringside_import_backups')
    .insert({ show_id: show.id, created_by: auth.userId, snapshot: { rings: existing || [] } });
  await db.from('ringside_rings').delete().eq('show_id', show.id);
  const generatedPins: Array<{ ring: string; pin: string }> = [];
  for (let ringIndex = 0; ringIndex < ringNames.length; ringIndex++) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const { data: ring, error: ringError } = await db
      .from('ringside_rings')
      .insert({
        show_id: show.id,
        ring_number: ringIndex + 1,
        slug: `ring-${ringIndex + 1}`,
        display_name: ringNames[ringIndex].trim(),
        display_order: ringIndex + 1,
      })
      .select()
      .single();
    if (ringError) return NextResponse.json({ error: ringError.message }, { status: 400 });
    await db
      .from('ringside_ring_secrets')
      .insert({ ring_id: ring.id, pin_hash: await hashPin(pin) });
    generatedPins.push({ ring: `Ring ${ringIndex + 1} — ${ringNames[ringIndex].trim()}`, pin });
    const assigned = selected.filter(
      (round) => Number(body.assignments?.[round.id] ?? 0) === ringIndex
    );
    for (let blockIndex = 0; blockIndex < assigned.length; blockIndex++) {
      const sourceRound = assigned[blockIndex];
      const { data: block, error: blockError } = await db
        .from('ringside_blocks')
        .insert({
          ring_id: ring.id,
          title: sourceRound.title,
          judge_name: sourceRound.judge_name,
          sequence: blockIndex + 1,
        })
        .select()
        .single();
      if (blockError) return NextResponse.json({ error: blockError.message }, { status: 400 });
      if (sourceRound.entries.length) {
        const rows = sourceRound.entries.map((entry, index) => ({
          block_id: block.id,
          registration_number: entry.registration_number,
          handler_name: entry.handler_name,
          dog_name: `${entry.dog_name}${entry.entry_type === 'feo' ? ' (FEO)' : ''}`,
          running_order: index + 1,
          original_running_order: index + 1,
        }));
        const { error: insertError } = await db.from('ringside_entries').insert(rows);
        if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
      }
    }
  }
  return NextResponse.json({ ok: true, generatedPins });
}
