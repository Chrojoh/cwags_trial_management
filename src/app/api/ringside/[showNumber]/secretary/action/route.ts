import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/apiAuth';
import { readSecretarySession } from '@/lib/ringside/server';
import { executeSecretaryAction } from '@/lib/ringside/actionService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ showNumber: string }> }
) {
  const started = performance.now();
  const { showNumber } = await params;
  const body = await req.json().catch(() => null);
  const db = getServiceRoleClient();
  const result = await executeSecretaryAction(showNumber, body, {
    readSession: readSecretarySession,
    invoke: async (args) => await db.rpc('apply_ringside_secretary_action', args),
    createRequestKey: () => crypto.randomUUID(),
  });
  if (result.status >= 500) {
    console.error('Unable to apply ringside secretary action:', {
      action: body?.action,
      code: result.body.code,
      message: result.body.error,
    });
  }
  const totalMs = performance.now() - started;
  return NextResponse.json(result.body, {
    status: result.status,
    headers: {
      'Cache-Control': 'no-store',
      'Server-Timing': `auth;dur=${result.authMs.toFixed(1)}, db;dur=${result.dbMs.toFixed(1)}, total;dur=${totalMs.toFixed(1)}`,
    },
  });
}
