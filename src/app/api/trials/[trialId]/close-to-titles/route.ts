import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth';
import { fetchAllPages, fetchInBatches } from '@/lib/supabasePagination';

export const dynamic = 'force-dynamic';

interface EntryRow { id: string; cwags_number: string; dog_call_name: string; handler_name: string }
interface SelectionRow { entry_id: string; trial_round_id: string; entry_type: string | null; entry_status: string | null }
interface RoundRow { id: string; trial_class_id: string; round_number: number }
interface ClassRow { id: string; class_name: string }

export async function GET(request: NextRequest, context: { params: Promise<{ trialId: string }> }) {
  const { trialId } = await context.params;
  const auth = await requireTrialPermission(request, trialId, 'generate_reports');
  if (!auth.authorized) return auth.response;
  try {
    const db = getServiceRoleClient();
    const [trial, entries] = await Promise.all([
      db.from('trials').select('trial_name').eq('id', trialId).single(),
      fetchAllPages<EntryRow>((from, to) => db.from('entries').select('id,cwags_number,dog_call_name,handler_name').eq('trial_id', trialId).order('id').range(from, to)),
    ]);
    if (trial.error) throw trial.error;
    const selections = await fetchInBatches<SelectionRow>(entries.map((entry) => entry.id), (ids, from, to) =>
      db.from('entry_selections').select('entry_id,trial_round_id,entry_type,entry_status').in('entry_id', ids).order('id').range(from, to)
    );
    const rounds = await fetchInBatches<RoundRow>(selections.map((selection) => selection.trial_round_id), (ids, from, to) =>
      db.from('trial_rounds').select('id,trial_class_id,round_number').in('id', ids).order('id').range(from, to)
    );
    const classes = await fetchInBatches<ClassRow>(rounds.map((round) => round.trial_class_id), (ids, from, to) =>
      db.from('trial_classes').select('id,class_name').in('id', ids).order('id').range(from, to)
    );
    const roundById = new Map(rounds.map((round) => [round.id, round]));
    const classById = new Map(classes.map((trialClass) => [trialClass.id, trialClass]));
    const selectionsByEntry = new Map<string, Array<Record<string, unknown>>>();
    selections.forEach((selection) => {
      const round = roundById.get(selection.trial_round_id);
      const trialClass = round ? classById.get(round.trial_class_id) : null;
      if (!round || !trialClass) return;
      const list = selectionsByEntry.get(selection.entry_id) || [];
      list.push({
        entry_type: selection.entry_type,
        entry_status: selection.entry_status,
        trial_rounds: { round_number: round.round_number, trial_classes: { class_name: trialClass.class_name } },
      });
      selectionsByEntry.set(selection.entry_id, list);
    });
    return NextResponse.json({
      trialName: trial.data.trial_name,
      entries: entries.map((entry) => ({ ...entry, entry_selections: selectionsByEntry.get(entry.id) || [] })),
    });
  } catch (error) {
    console.error('Close to titles read failed', { trialId, error });
    return NextResponse.json({ error: 'Failed to load Close to Titles data' }, { status: 500 });
  }
}
