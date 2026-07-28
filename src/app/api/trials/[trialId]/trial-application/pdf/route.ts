import { NextRequest, NextResponse } from 'next/server';
import { requireTrialPermission } from '@/lib/apiAuth';
import { getTrialApplicationData } from '@/lib/trialApplication/server';
import { renderTrialApplicationPdf, safeApplicationFilename } from '@/lib/trialApplication/renderer';
import type { TrialApplicationOverrides } from '@/types/trialApplication';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ trialId: string }> }) {
  try {
    const { trialId } = await params;
    const auth = await requireTrialPermission(request, trialId, 'generate_trial_application');
    if (!auth.authorized) return auth.response;
    const body = await request.json() as { overrides?: TrialApplicationOverrides; draft?: boolean };
    const data = await getTrialApplicationData(trialId, body.overrides || {});
    const draft = Boolean(body.draft);
    if (data.missingRequired.length && !draft) {
      return NextResponse.json({ error: 'Required information is missing', missing: data.missingRequired }, { status: 409 });
    }
    const pdf = await renderTrialApplicationPdf(data, draft);
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeApplicationFilename(data.hostName, data.trialDates[0] || '')}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Trial application PDF failed:', error);
    return NextResponse.json({ error: 'Failed to generate trial application PDF' }, { status: 500 });
  }
}
