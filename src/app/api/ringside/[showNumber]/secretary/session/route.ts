import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/apiAuth';
import { readSecretarySession } from '@/lib/ringside/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ showNumber: string }> }
) {
  const { showNumber } = await params;
  const ringSlug = req.nextUrl.searchParams.get('ringSlug') || '';
  const { data: ring } = await getServiceRoleClient()
    .from('ringside_rings')
    .select('id,slug,ringside_shows!inner(public_show_number)')
    .eq('slug', ringSlug)
    .eq('ringside_shows.public_show_number', showNumber)
    .maybeSingle();
  if (!ring) return NextResponse.json({ authenticated: false });
  const session = await readSecretarySession(ring.id);
  return NextResponse.json({
    authenticated: Boolean(session),
    ringSlug: ring.slug,
  });
}
