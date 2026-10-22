import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyRingsideRealtimeRecord,
  createReloadCoordinator,
  mergeRingsideMutation,
} from './stateSync';
import type { RingsideState } from './types';

const fixture = (): RingsideState => ({
  show: {
    id: 'show-a',
    trial_id: 'trial-a',
    public_show_number: 'FICTION-1',
    title: 'Fictional Test Show',
    show_date: null,
    venue: null,
    status: 'published',
  },
  rings: [
    {
      id: 'ring-a',
      show_id: 'show-a',
      ring_number: 1,
      slug: 'one',
      display_name: 'Test Ring',
      display_order: 1,
      active_block_id: 'block-a',
      paused: false,
      status_message: '',
      session_version: 1,
    },
  ],
  blocks: [
    {
      id: 'block-a',
      ring_id: 'ring-a',
      title: 'Test Round',
      judge_name: 'Test Judge',
      sequence: 1,
      notes: '',
      status: 'active',
    },
  ],
  entries: [
    {
      id: 'entry-a',
      block_id: 'block-a',
      registration_number: '00-0000-00',
      handler_name: 'Test Handler',
      dog_name: 'Example',
      running_order: 1,
      original_running_order: 1,
      notes: '',
      status: 'waiting',
      conflict_reason: '',
      conflict_other_ring: '',
      conflict_return_note: '',
    },
  ],
});

test('confirmed mutation merges only returned ring records', () => {
  const state = fixture();
  const next = mergeRingsideMutation(state, {
    ring: { ...state.rings[0], active_block_id: 'block-a' },
    entries: [{ ...state.entries[0], status: 'in_ring' }],
  });
  assert.equal(next.entries[0].status, 'in_ring');
  assert.equal(next.blocks, state.blocks);
});

test('realtime records are show-scoped and deletes remove dependent records', () => {
  const state = fixture();
  const foreign = applyRingsideRealtimeRecord(state, 'ringside_rings', 'INSERT', {
    ...state.rings[0],
    id: 'foreign-ring',
    show_id: 'show-b',
  });
  assert.equal(foreign, state);
  const deleted = applyRingsideRealtimeRecord(state, 'ringside_blocks', 'DELETE', {
    id: 'block-a',
    ring_id: 'ring-a',
  });
  assert.equal(deleted.blocks.length, 0);
  assert.equal(deleted.entries.length, 0);
});

test('realtime status changes preserve unrelated show state', () => {
  const state = fixture();
  const next = applyRingsideRealtimeRecord(state, 'ringside_entries', 'UPDATE', {
    ...state.entries[0],
    status: 'checked_in',
  });
  assert.equal(next.entries[0].status, 'checked_in');
  assert.equal(next.show, state.show);
  assert.equal(next.rings, state.rings);
});

test('event bursts coalesce while a load is in flight and newer recovery wins', async () => {
  let calls = 0;
  let concurrent = 0;
  let maximumConcurrent = 0;
  const applied: number[] = [];
  const releases: Array<() => void> = [];
  const coordinator = createReloadCoordinator(
    async () => {
      calls += 1;
      const value = calls;
      concurrent += 1;
      maximumConcurrent = Math.max(maximumConcurrent, concurrent);
      await new Promise<void>((resolve) => releases.push(resolve));
      concurrent -= 1;
      return value;
    },
    (value) => applied.push(value),
    (error) => assert.fail(String(error)),
    1
  );
  const first = coordinator.run();
  coordinator.schedule();
  coordinator.schedule();
  coordinator.schedule();
  await new Promise((resolve) => setTimeout(resolve, 5));
  releases.shift()?.();
  await new Promise((resolve) => setTimeout(resolve, 5));
  releases.shift()?.();
  await first;
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(calls, 2);
  assert.equal(maximumConcurrent, 1);
  assert.deepEqual(applied, [1, 2]);
  coordinator.dispose();
});

test('failed reload reports error and reconnect recovery can succeed', async () => {
  let calls = 0;
  const applied: number[] = [];
  const errors: unknown[] = [];
  const coordinator = createReloadCoordinator(
    async () => {
      calls += 1;
      if (calls === 1) throw new Error('network unavailable');
      return 2;
    },
    (value) => applied.push(value),
    (error) => errors.push(error),
    1
  );
  await coordinator.run();
  await coordinator.run();
  assert.equal(errors.length, 1);
  assert.deepEqual(applied, [2]);
  coordinator.dispose();
});
