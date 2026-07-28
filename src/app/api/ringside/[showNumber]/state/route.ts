import { NextResponse } from 'next/server';
import { flattenState, publicStateQuery } from '@/lib/ringside/server';
export async function GET(_: Request, { params }: { params: Promise<{ showNumber: string }> }) {
  const { showNumber } = await params;
  const { data, error } = await publicStateQuery(showNumber);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Ringside show not found' }, { status: 404 });
  if (data.status === 'draft')
    return NextResponse.json(
      { error: `${data.title} is not published yet. Please check back soon.` },
      { status: 403 }
    );
  return NextResponse.json(flattenState(data), { headers: { 'Cache-Control': 'no-store' } });
}
