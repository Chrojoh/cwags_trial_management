import { performance } from 'node:perf_hooks';
import { mergeRingsideMutation } from '../lib/ringside/stateSync';
import type { RingsideState } from '../lib/ringside/types';

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const fixture = (): RingsideState => {
  const rings = Array.from({ length: 2 }, (_, ring) => ({
    id: `ring-${ring}`,
    show_id: 'fictional-show',
    ring_number: ring + 1,
    slug: `ring-${ring + 1}`,
    display_name: `Fictional Ring ${ring + 1}`,
    display_order: ring + 1,
    active_block_id: `block-${ring}-0`,
    paused: false,
    status_message: '',
    session_version: 1,
  }));
  const blocks = rings.flatMap((ring, ringIndex) =>
    Array.from({ length: 12 }, (_, block) => ({
      id: `block-${ringIndex}-${block}`,
      ring_id: ring.id,
      title: `Class ${block + 1} Round 1`,
      judge_name: 'Fictional Judge',
      sequence: block + 1,
      notes: '',
      status: block === 0 ? 'active' : 'scheduled',
    }))
  );
  const entries = blocks.flatMap((block) =>
    Array.from({ length: 30 }, (_, order) => ({
      id: `${block.id}-entry-${order}`,
      block_id: block.id,
      registration_number: `00-0000-${String(order).padStart(2, '0')}`,
      handler_name: `Fictional Handler ${order + 1}`,
      dog_name: `Test Dog ${order + 1}`,
      running_order: order + 1,
      original_running_order: order + 1,
      notes: '',
      status: order === 0 && block.id === 'block-0-0' ? ('in_ring' as const) : ('waiting' as const),
      conflict_reason: '',
      conflict_other_ring: '',
      conflict_return_note: '',
    }))
  );
  return {
    show: {
      id: 'fictional-show',
      trial_id: 'fictional-trial',
      public_show_number: 'FICTION-1',
      title: 'Fictional Performance Trial',
      show_date: '2026-10-22',
      venue: 'Fictional Training Hall',
      status: 'published',
    },
    rings,
    blocks,
    entries,
  };
};

async function measured(label: string, operation: () => Promise<void>) {
  const samples: number[] = [];
  for (let run = 0; run < 5; run += 1) {
    const started = performance.now();
    await operation();
    samples.push(performance.now() - started);
  }
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  console.log(
    `${label}: ${mean.toFixed(1)} ms mean (${samples.map((v) => v.toFixed(1)).join(', ')})`
  );
}

const state = fixture();
const changedEntries = [
  { ...state.entries[0], status: 'checked_in' as const },
  { ...state.entries[1], status: 'in_ring' as const },
];
const mutation = { ring: state.rings[0], blocks: [], entries: changedEntries };
const fullBytes = Buffer.byteLength(JSON.stringify(state));
const mutationBytes = Buffer.byteLength(JSON.stringify(mutation));

console.log(
  `Fixture: ${state.rings.length} rings, ${state.blocks.length} blocks, ${state.entries.length} entries`
);
console.log(`Full-state payload: ${fullBytes} bytes`);
console.log(`Confirmed mutation payload: ${mutationBytes} bytes`);
console.log(`Payload reduction: ${((1 - mutationBytes / fullBytes) * 100).toFixed(2)}%`);

// This is an isolated latency model, not a production measurement. Both paths
// use the same fictional fixture and 20 ms per remote database request.
await measured('Before: 9 sequential mutation calls + awaited full reload', async () => {
  for (let request = 0; request < 10; request += 1) await wait(20);
  JSON.parse(JSON.stringify(state));
});
await measured('After: session validation + transactional RPC + confirmed patch', async () => {
  for (let request = 0; request < 2; request += 1) await wait(20);
  mergeRingsideMutation(state, mutation);
});

console.log(
  'Before request counts: 1 POST + 1 awaited GET; up to 3 additional realtime GETs for in_ring.'
);
console.log('After request counts: 1 POST; realtime records patch state without a GET.');
