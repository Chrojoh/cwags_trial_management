export const ringsideSecretaryActions = new Set([
  'ring_state',
  'activate_block',
  'check_in',
  'in_ring',
  'completed',
  'absent',
  'scratch',
  'conflict_hold',
  'available',
  'move_up',
  'move_down',
  'move_end',
  'restore',
]);

export interface SecretaryActionSession {
  showId: string;
  ringId: string;
  showNumber: string;
}

export interface SecretaryActionBody {
  action?: unknown;
  ringId?: unknown;
  requestKey?: unknown;
  entryId?: unknown;
  blockId?: unknown;
  paused?: unknown;
  message?: unknown;
  strategy?: unknown;
}

export interface SecretaryActionResult {
  status: number;
  body: Record<string, unknown>;
  authMs: number;
  dbMs: number;
}

interface Dependencies {
  readSession: (ringId: string) => Promise<SecretaryActionSession | null>;
  invoke: (args: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { code?: string; message?: string } | null;
  }>;
  createRequestKey: () => string;
  now?: () => number;
}

const errorStatus = (message: string) => {
  if (message.includes('NOT_FOUND')) return 404;
  if (message.includes('INVALID') || message.includes('UNKNOWN') || message.includes('REQUIRED'))
    return 400;
  return 500;
};

const validUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function executeSecretaryAction(
  showNumber: string,
  body: SecretaryActionBody | null,
  dependencies: Dependencies
): Promise<SecretaryActionResult> {
  const now = dependencies.now || performance.now.bind(performance);
  if (!body || !ringsideSecretaryActions.has(String(body.action || '')))
    return { status: 400, body: { error: 'Unknown action.' }, authMs: 0, dbMs: 0 };
  const ringId = String(body.ringId || '');
  if (!ringId) return { status: 400, body: { error: 'Ring is required.' }, authMs: 0, dbMs: 0 };

  const authStarted = now();
  const session = await dependencies.readSession(ringId);
  const authMs = now() - authStarted;
  if (!session)
    return {
      status: 401,
      body: { error: 'Secretary session required.' },
      authMs,
      dbMs: 0,
    };
  if (session.showNumber !== showNumber || session.ringId !== ringId)
    return {
      status: 403,
      body: { error: 'This session cannot operate that ring.' },
      authMs,
      dbMs: 0,
    };

  const suppliedKey = String(body.requestKey || '');
  const requestKey = validUuid(suppliedKey) ? suppliedKey : dependencies.createRequestKey();
  const dbStarted = now();
  const { data, error } = await dependencies.invoke({
    p_show_id: session.showId,
    p_ring_id: ringId,
    p_action: body.action,
    p_request_key: requestKey,
    p_entry_id: body.entryId || null,
    p_block_id: body.blockId || null,
    p_paused: typeof body.paused === 'boolean' ? body.paused : null,
    p_message: typeof body.message === 'string' ? body.message : null,
    p_strategy: typeof body.strategy === 'string' ? body.strategy : null,
  });
  const dbMs = now() - dbStarted;
  if (error) {
    const message = error.message || 'Unable to update the ring.';
    return {
      status: errorStatus(message),
      body: { error: message, code: error.code },
      authMs,
      dbMs,
    };
  }
  return { status: 200, body: { ok: true, mutation: data, requestKey }, authMs, dbMs };
}
