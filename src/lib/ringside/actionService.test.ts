import test from 'node:test';
import assert from 'node:assert/strict';
import { executeSecretaryAction } from './actionService';

const requestKey = '11111111-1111-4111-8111-111111111111';
const session = { showId: 'show-a', ringId: 'ring-a', showNumber: 'FICTION-1' };

test('successful action preserves verified identifiers and confirmed mutation', async () => {
  let args: Record<string, unknown> = {};
  const result = await executeSecretaryAction(
    'FICTION-1',
    { action: 'in_ring', ringId: 'ring-a', entryId: 'entry-a', requestKey },
    {
      readSession: async () => session,
      invoke: async (next) => {
        args = next;
        return { data: { entries: [{ id: 'entry-a', status: 'in_ring' }] }, error: null };
      },
      createRequestKey: () => assert.fail('valid request key should be retained'),
    }
  );
  assert.equal(result.status, 200);
  assert.equal(args.p_show_id, 'show-a');
  assert.equal(args.p_ring_id, 'ring-a');
  assert.equal(args.p_request_key, requestKey);
  assert.deepEqual(result.body.mutation, { entries: [{ id: 'entry-a', status: 'in_ring' }] });
});

test('revoked or invalid session is rejected before database mutation', async () => {
  let invoked = false;
  const result = await executeSecretaryAction(
    'FICTION-1',
    { action: 'in_ring', ringId: 'ring-a', entryId: 'entry-a' },
    {
      readSession: async () => null,
      invoke: async () => {
        invoked = true;
        return { data: null, error: null };
      },
      createRequestKey: () => requestKey,
    }
  );
  assert.equal(result.status, 401);
  assert.equal(invoked, false);
});

test('wrong-ring and cross-show sessions are rejected', async () => {
  for (const invalid of [
    { ...session, ringId: 'ring-b' },
    { ...session, showNumber: 'FICTION-2' },
  ]) {
    const result = await executeSecretaryAction(
      'FICTION-1',
      { action: 'in_ring', ringId: 'ring-a', entryId: 'entry-a' },
      {
        readSession: async () => invalid,
        invoke: async () => assert.fail('wrong-ring request reached mutation'),
        createRequestKey: () => requestKey,
      }
    );
    assert.equal(result.status, 403);
  }
});

test('database failure is returned instead of false success', async () => {
  const result = await executeSecretaryAction(
    'FICTION-1',
    { action: 'in_ring', ringId: 'ring-a', entryId: 'missing' },
    {
      readSession: async () => session,
      invoke: async () => ({ data: null, error: { code: 'P0001', message: 'ENTRY_NOT_FOUND' } }),
      createRequestKey: () => requestKey,
    }
  );
  assert.equal(result.status, 404);
  assert.equal(result.body.error, 'ENTRY_NOT_FOUND');
});

test('repeated request key is passed through for transactional idempotency', async () => {
  const seen = new Set<string>();
  const invoke = async (args: Record<string, unknown>) => {
    const key = String(args.p_request_key);
    const duplicate = seen.has(key);
    seen.add(key);
    return { data: { duplicate }, error: null };
  };
  const dependencies = {
    readSession: async () => session,
    invoke,
    createRequestKey: () => requestKey,
  };
  const body = { action: 'move_down', ringId: 'ring-a', entryId: 'entry-a', requestKey };
  const [first, second] = await Promise.all([
    executeSecretaryAction('FICTION-1', body, dependencies),
    executeSecretaryAction('FICTION-1', body, dependencies),
  ]);
  assert.equal((first.body.mutation as { duplicate: boolean }).duplicate, false);
  assert.equal((second.body.mutation as { duplicate: boolean }).duplicate, true);
});
