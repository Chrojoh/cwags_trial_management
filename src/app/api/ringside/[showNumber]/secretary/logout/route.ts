import { NextRequest, NextResponse } from 'next/server';
import { clearSecretarySession } from '@/lib/ringside/server';
export async function POST(req: NextRequest) {
  const { ringId } = await req.json();
  await clearSecretarySession(String(ringId || ''));
  return NextResponse.json({ ok: true });
}
