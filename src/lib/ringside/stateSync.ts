import type { RingsideBlock, RingsideEntry, RingsideRing, RingsideState } from './types';

export interface RingsideMutation {
  ring?: RingsideRing | null;
  blocks?: RingsideBlock[];
  entries?: RingsideEntry[];
  duplicate?: boolean;
}

const mergeById = <T extends { id: string }>(current: T[], changes: T[] = []) => {
  if (!changes.length) return current;
  const next = new Map(current.map((item) => [item.id, item]));
  for (const item of changes) next.set(item.id, item);
  return [...next.values()];
};

export function mergeRingsideMutation(
  state: RingsideState,
  mutation: RingsideMutation
): RingsideState {
  return {
    ...state,
    rings: mutation.ring ? mergeById(state.rings, [mutation.ring]) : state.rings,
    blocks: mergeById(state.blocks, mutation.blocks),
    entries: mergeById(state.entries, mutation.entries),
  };
}

export type RingsideRealtimeTable =
  | 'ringside_shows'
  | 'ringside_rings'
  | 'ringside_blocks'
  | 'ringside_entries';

export function applyRingsideRealtimeRecord(
  state: RingsideState,
  table: RingsideRealtimeTable,
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  record: Record<string, unknown>
): RingsideState {
  const id = String(record.id || '');
  if (!id) return state;
  const removing = eventType === 'DELETE';
  if (table === 'ringside_shows') {
    if (id !== state.show.id || removing) return state;
    return { ...state, show: { ...state.show, ...record } as unknown as RingsideState['show'] };
  }
  if (table === 'ringside_rings') {
    if (removing) {
      const removedBlockIds = new Set(
        state.blocks.filter((b) => b.ring_id === id).map((b) => b.id)
      );
      return {
        ...state,
        rings: state.rings.filter((item) => item.id !== id),
        blocks: state.blocks.filter((item) => item.ring_id !== id),
        entries: state.entries.filter((item) => !removedBlockIds.has(item.block_id)),
      };
    }
    if (String(record.show_id || '') !== state.show.id) return state;
    return { ...state, rings: mergeById(state.rings, [record as unknown as RingsideRing]) };
  }
  if (table === 'ringside_blocks') {
    if (removing)
      return {
        ...state,
        blocks: state.blocks.filter((item) => item.id !== id),
        entries: state.entries.filter((item) => item.block_id !== id),
      };
    if (!state.rings.some((ring) => ring.id === String(record.ring_id || ''))) return state;
    return { ...state, blocks: mergeById(state.blocks, [record as unknown as RingsideBlock]) };
  }
  if (!removing && !state.blocks.some((block) => block.id === String(record.block_id || '')))
    return state;
  return {
    ...state,
    entries: removing
      ? state.entries.filter((item) => item.id !== id)
      : mergeById(state.entries, [record as unknown as RingsideEntry]),
  };
}

/**
 * Coalesces event bursts into one load, allows at most one load in flight, and
 * guarantees that an older response cannot replace a newer applied response.
 */
export function createReloadCoordinator<T>(
  fetchState: (signal: AbortSignal) => Promise<T>,
  applyState: (state: T) => void,
  onError: (error: unknown) => void,
  delayMs = 120
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<void> | null = null;
  let rerun = false;
  let requestedVersion = 0;
  let appliedVersion = 0;
  let controller: AbortController | null = null;

  const run = async () => {
    if (inFlight) {
      rerun = true;
      return inFlight;
    }
    const version = ++requestedVersion;
    controller = new AbortController();
    inFlight = fetchState(controller.signal)
      .then((next) => {
        if (version >= appliedVersion) {
          appliedVersion = version;
          applyState(next);
        }
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) onError(error);
      })
      .finally(async () => {
        inFlight = null;
        controller = null;
        if (rerun) {
          rerun = false;
          await run();
        }
      });
    return inFlight;
  };

  return {
    run,
    schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void run();
      }, delayMs);
    },
    dispose() {
      if (timer) clearTimeout(timer);
      timer = null;
      rerun = false;
      controller?.abort();
    },
  };
}
