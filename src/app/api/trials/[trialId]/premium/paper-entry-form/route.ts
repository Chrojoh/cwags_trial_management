import { NextRequest, NextResponse } from 'next/server';
import { requireTrialPermission } from '@/lib/apiAuth';
import { loadTrialPremium } from '@/lib/server/trialPremium';
import { createTrialPaperEntryPdf, paperEntryFilename } from '@/lib/trialPaperEntryPdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string }> }
) {
  const { trialId } = await params;
  const auth = await requireTrialPermission(request, trialId, 'generate_trial_application');
  if (!auth.authorized) return auth.response;

  try {
    const model = await loadTrialPremium(trialId);
    const pdf = await createTrialPaperEntryPdf(model);
    return new NextResponse(Buffer.from(pdf), { headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${paperEntryFilename(model.trial.trialName)}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    console.error('Paper entry form preview failed', { trialId, error });
    return NextResponse.json({ error: 'Failed to generate paper entry form' }, { status: 500 });
  }
}
