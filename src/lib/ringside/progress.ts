import type { RingsideEntry, RingsideState } from './types';

const excluded = new Set([
  'completed',
  'scratched',
  'absent',
  'conflict_hold',
  'available_waiting_for_secretary',
]);
export const isQueueEligible = (entry: RingsideEntry) => !excluded.has(entry.status);
const orderedBlocks = (state: RingsideState, ringId: string) =>
  state.blocks
    .filter((b) => b.ring_id === ringId)
    .sort((a, b) => a.sequence - b.sequence || a.title.localeCompare(b.title));
const orderedEntries = (state: RingsideState, blockId: string) =>
  state.entries
    .filter((e) => e.block_id === blockId)
    .sort(
      (a, b) =>
        a.running_order - b.running_order || a.original_running_order - b.original_running_order
    );

export function entryRingProgress(state: RingsideState, entry: RingsideEntry) {
  const block = state.blocks.find((b) => b.id === entry.block_id) || null;
  const ring = state.rings.find((r) => r.id === block?.ring_id) || null;
  if (!block || !ring)
    return {
      block,
      ring,
      current: null,
      currentBlock: null,
      activeBlock: null,
      classRoundsBefore: null,
      dogsAway: null,
      queuePosition: null,
      queueLength: 0,
    };
  const blocks = orderedBlocks(state, ring.id);
  let activeIndex = blocks.findIndex((b) => b.id === ring.active_block_id);
  if (activeIndex < 0)
    activeIndex = blocks.findIndex((b) =>
      orderedEntries(state, b.id).some((e) => e.status === 'in_ring')
    );
  if (activeIndex < 0)
    activeIndex = blocks.findIndex((b) => orderedEntries(state, b.id).some(isQueueEligible));
  if (activeIndex < 0) activeIndex = 0;
  const queue = blocks
    .slice(activeIndex)
    .flatMap((b) => orderedEntries(state, b.id).filter(isQueueEligible));
  const current = queue.find((e) => e.status === 'in_ring') || null;
  const activeBlock = blocks[activeIndex] || null;
  const currentBlock = current
    ? state.blocks.find((b) => b.id === current.block_id) || activeBlock
    : activeBlock;
  const currentIndex = currentBlock
    ? blocks.findIndex((b) => b.id === currentBlock.id)
    : activeIndex;
  const targetIndex = blocks.findIndex((b) => b.id === block.id);
  const queueIndex = queue.findIndex((e) => e.id === entry.id);
  let dogsAway: number | null = null;
  if (entry.status === 'in_ring') dogsAway = 0;
  else if (isQueueEligible(entry) && queueIndex >= 0)
    dogsAway = current ? queueIndex : queueIndex + 1;
  return {
    block,
    ring,
    current,
    currentBlock,
    activeBlock,
    classRoundsBefore:
      targetIndex >= currentIndex && currentIndex >= 0 ? targetIndex - currentIndex : null,
    dogsAway,
    queuePosition: queueIndex >= 0 ? queueIndex + 1 : null,
    queueLength: queue.length,
  };
}

function category(state: RingsideState, e: RingsideEntry) {
  const p = entryRingProgress(state, e);
  if (e.status === 'in_ring') return 0;
  if (p.dogsAway === 1) return 1;
  if (isQueueEligible(e) && p.dogsAway !== null) return 2;
  if (e.status === 'conflict_hold') return 3;
  if (e.status === 'available_waiting_for_secretary' || p.dogsAway === null) return 4;
  if (e.status === 'absent' || e.status === 'scratched' || e.status === 'completed') return 5;
  return 6;
}
export function compareCompetitorEntries(state: RingsideState, a: RingsideEntry, b: RingsideEntry) {
  const pa = entryRingProgress(state, a),
    pb = entryRingProgress(state, b);
  return (
    category(state, a) - category(state, b) ||
    (pa.dogsAway ?? Number.MAX_SAFE_INTEGER) - (pb.dogsAway ?? Number.MAX_SAFE_INTEGER) ||
    (pa.ring?.display_order ?? 999) - (pb.ring?.display_order ?? 999) ||
    (pa.block?.sequence ?? 999) - (pb.block?.sequence ?? 999) ||
    a.running_order - b.running_order ||
    a.dog_name.localeCompare(b.dog_name)
  );
}
export function statusDistanceLabel(state: RingsideState, e: RingsideEntry) {
  const p = entryRingProgress(state, e);
  if (e.status === 'in_ring') return 'IN THE RING';
  if (e.status === 'conflict_hold') return 'CONFLICT HOLD';
  if (e.status === 'available_waiting_for_secretary') return 'WAITING FOR SECRETARY';
  if (p.dogsAway === 1) return 'ON DECK';
  if (p.dogsAway !== null) return `${p.dogsAway} dogs away`;
  return e.status.replaceAll('_', ' ').toUpperCase();
}
export function entriesForHandler(state: RingsideState, registrationNumbers: string[]) {
  const wanted = new Set(registrationNumbers.map((v) => v.trim().toLowerCase()));
  return state.entries
    .filter((e) => wanted.has(e.registration_number.trim().toLowerCase()))
    .sort((a, b) => compareCompetitorEntries(state, a, b));
}
export function nextEligibleOrder(
  entries: RingsideEntry[],
  strategy: 'next' | 'after_current' | 'end'
) {
  const active = entries.filter(isQueueEligible).sort((a, b) => a.running_order - b.running_order);
  if (strategy === 'end') return (active.at(-1)?.running_order ?? 0) + 1;
  const current = active.find((e) => e.status === 'in_ring');
  if (strategy === 'after_current' && current) return current.running_order + 0.5;
  const next = active.find((e) => e.status !== 'in_ring');
  return next ? next.running_order - 0.5 : 1;
}
