import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth';
import {
  NON_ACTIVE_SELECTION_STATUSES_FILTER,
  WAITLISTED_SELECTION_STATUS,
} from '@/lib/selectionStatus';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string }> }
) {
  try {
    const { trialId } = await params;
    const auth = await requireTrialPermission(request, trialId, 'manage_waitlist');
    if (!auth.authorized) return auth.response;
    const body = await request.json();
    const roundId = typeof body.round_id === 'string' ? body.round_id : '';
    const maxEntries = Number(body.max_entries);
    if (!roundId || !Number.isInteger(maxEntries) || maxEntries < 1) {
      return NextResponse.json({ error: 'A round and positive whole-number capacity are required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.rpc('set_round_capacity_atomic', {
      p_trial_id: trialId,
      p_round_id: roundId,
      p_max_entries: maxEntries,
      p_changed_by: auth.userId,
    });

    if (error?.message.includes('CAPACITY_BELOW_ACTIVE_COUNT')) {
      return NextResponse.json({ error: 'Capacity cannot be lower than the active-entry count' }, { status: 409 });
    }
    if (error?.message.includes('ROUND_NOT_FOUND')) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }
    if (error) throw error;
    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error('Capacity update failed:', error);
    return NextResponse.json({ error: 'Failed to update round capacity' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string }> }
) {
  try {
    const { trialId } = await params;
    const body = await request.json();
    const selectedRoundIds = Array.isArray(body.selected_round_ids)
      ? [
          ...new Set(
            body.selected_round_ids.filter((id: unknown): id is string => typeof id === 'string')
          ),
        ]
      : [];
    const excludeEntryId = typeof body.exclude_entry_id === 'string' ? body.exclude_entry_id : null;

    if (selectedRoundIds.length === 0) return NextResponse.json({ conflicts: [] });

    const supabase = getServiceRoleClient();
    const { data: rounds, error: roundsError } = await supabase
      .from('trial_rounds')
      .select(
        `id, round_number, max_entries,
         trial_classes!inner(class_name, max_entries, trial_days!inner(trial_id))`
      )
      .in('id', selectedRoundIds);

    if (roundsError) throw roundsError;

    const trialRounds = (rounds || []).filter((round) => {
      const trialClass = Array.isArray(round.trial_classes)
        ? round.trial_classes[0]
        : round.trial_classes;
      const trialDay = Array.isArray(trialClass?.trial_days)
        ? trialClass.trial_days[0]
        : trialClass?.trial_days;
      return trialDay?.trial_id === trialId;
    });

    if (trialRounds.length !== selectedRoundIds.length) {
      return NextResponse.json(
        { error: 'One or more rounds do not belong to this trial' },
        { status: 400 }
      );
    }

    const conflicts = [];
    const roundMetrics = [];
    for (const round of trialRounds) {
      const trialClass = Array.isArray(round.trial_classes)
        ? round.trial_classes[0]
        : round.trial_classes;
      const maxEntries = Number(round.max_entries || trialClass?.max_entries || 0);
      if (maxEntries <= 0) continue;

      let countQuery = supabase
        .from('entry_selections')
        .select('id, entries!entry_selections_entry_id_fkey!inner(id, trial_id)', {
          count: 'exact',
          head: true,
        })
        .eq('trial_round_id', round.id)
        .eq('entries.trial_id', trialId)
        .not('entry_status', 'in', NON_ACTIVE_SELECTION_STATUSES_FILTER);

      if (excludeEntryId) countQuery = countQuery.neq('entry_id', excludeEntryId);
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      const { count: waitlistedCount, error: waitlistedError } = await supabase
        .from('entry_selections')
        .select('id, entries!entry_selections_entry_id_fkey!inner(id, trial_id)', {
          count: 'exact',
          head: true,
        })
        .eq('trial_round_id', round.id)
        .eq('entries.trial_id', trialId)
        .eq('entry_status', WAITLISTED_SELECTION_STATUS);
      if (waitlistedError) throw waitlistedError;

      roundMetrics.push({
        trial_round_id: round.id,
        class_name: trialClass?.class_name || 'Unknown class',
        round_number: round.round_number,
        active_entries: count || 0,
        waitlisted_entries: waitlistedCount || 0,
        max_entries: maxEntries,
      });

      if ((count || 0) >= maxEntries) {
        conflicts.push({
          trial_round_id: round.id,
          class_name: trialClass?.class_name || 'Unknown class',
          round_number: round.round_number,
          occupied_places: count || 0,
          max_entries: maxEntries,
        });
      }
    }

    return NextResponse.json({ conflicts, rounds: roundMetrics });
  } catch (error) {
    console.error('Capacity check failed:', error);
    return NextResponse.json({ error: 'Failed to check round capacity' }, { status: 500 });
  }
}
