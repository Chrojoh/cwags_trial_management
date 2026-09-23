import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      error:
        'This legacy download endpoint has been retired. Open the Post-Trial Submission page to generate the package with the official C-WAGS Excel workbook.',
    },
    { status: 410 }
  );
}
