import test from 'node:test';
import assert from 'node:assert/strict';
import { entryRingProgress, entriesForHandler, nextEligibleOrder } from './progress';
import type { RingsideState, RingsideEntry, RingsideEntryStatus } from './types';
const entry = (
  id: string,
  block_id: string,
  running_order: number,
  status: RingsideEntryStatus = 'waiting',
  reg = 'R1'
): RingsideEntry => ({
  id,
  block_id,
  running_order,
  original_running_order: running_order,
  status,
  registration_number: reg,
  handler_name: 'Handler',
  dog_name: id,
  notes: '',
  conflict_reason: '',
  conflict_other_ring: '',
  conflict_return_note: '',
});
function state(): RingsideState {
  return {
    show: {
      id: 's',
      trial_id: 't',
      public_show_number: '123',
      title: 'Show',
      show_date: null,
      venue: null,
      status: 'published',
    },
    rings: [
      {
        id: 'r1',
        show_id: 's',
        ring_number: 1,
        slug: 'ring-1',
        display_name: 'Inside',
        display_order: 1,
        active_block_id: 'b1',
        paused: false,
        status_message: '',
        session_version: 1,
      },
      {
        id: 'r3',
        show_id: 's',
        ring_number: 3,
        slug: 'ring-3',
        display_name: 'Lot',
        display_order: 3,
        active_block_id: 'b3',
        paused: false,
        status_message: '',
        session_version: 1,
      },
    ],
    blocks: [
      {
        id: 'b1',
        ring_id: 'r1',
        title: 'Round 1',
        judge_name: 'J',
        sequence: 1,
        notes: '',
        status: 'active',
      },
      {
        id: 'b2',
        ring_id: 'r1',
        title: 'Round 2',
        judge_name: 'J',
        sequence: 2,
        notes: '',
        status: 'scheduled',
      },
      {
        id: 'b3',
        ring_id: 'r3',
        title: 'Round 1',
        judge_name: 'J',
        sequence: 1,
        notes: '',
        status: 'active',
      },
    ],
    entries: [],
  };
}
test('continuous queue calculations and exclusions', () => {
  const s = state();
  s.entries = [
    ...Array.from({ length: 11 }, (_, i) => entry(`a${i + 1}`, 'b1', i + 1)),
    ...Array.from({ length: 4 }, (_, i) => entry(`b${i + 1}`, 'b2', i + 1)),
  ];
  assert.equal(entryRingProgress(s, s.entries[2]).dogsAway, 3);
  s.entries[0].status = 'in_ring';
  assert.equal(entryRingProgress(s, s.entries[1]).dogsAway, 1);
  assert.equal(entryRingProgress(s, s.entries[2]).dogsAway, 2);
  assert.equal(entryRingProgress(s, s.entries[14]).dogsAway, 14);
  s.entries[1].status = 'scratched';
  s.entries[2].status = 'absent';
  s.entries[3].status = 'conflict_hold';
  assert.equal(entryRingProgress(s, s.entries[4]).dogsAway, 1);
  s.entries[3].status = 'waiting';
  s.entries[3].running_order = 1.5;
  assert.equal(entryRingProgress(s, s.entries[3]).dogsAway, 1);
});
test('sorts across rings and returns every handler run', () => {
  const s = state();
  s.entries = [
    ...Array.from({ length: 10 }, (_, i) =>
      entry(i === 9 ? 'far' : `r1-${i + 1}`, 'b1', i + 1, 'waiting', i === 9 ? 'A' : 'X')
    ),
    ...Array.from({ length: 4 }, (_, i) =>
      entry(i === 3 ? 'near' : `r3-${i + 1}`, 'b3', i + 1, 'waiting', i === 3 ? 'B' : 'X')
    ),
    entry('again', 'b2', 1, 'waiting', 'A'),
  ];
  assert.deepEqual(
    entriesForHandler(s, ['A']).map((e) => e.id),
    ['far', 'again']
  );
  assert.equal(entriesForHandler(s, ['A', 'B'])[0].id, 'near');
});
test('restore placement strategies', () => {
  const es = [entry('current', 'b1', 1, 'in_ring'), entry('next', 'b1', 2), entry('last', 'b1', 3)];
  assert.equal(nextEligibleOrder(es, 'after_current'), 1.5);
  assert.equal(nextEligibleOrder(es, 'end'), 4);
  assert.equal(nextEligibleOrder(es, 'next'), 1.5);
});
