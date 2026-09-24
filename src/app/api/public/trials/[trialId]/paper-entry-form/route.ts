import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/apiAuth';
import { loadTrialPremium } from '@/lib/server/trialPremium';
import { createTrialPaperEntryPdf, paperEntryFilename } from '@/lib/trialPaperEntryPdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ trialId: string }> }
) {
  const { trialId } = await params;
  try {
    const { data: publicTrial, error } = await getServiceRoleClient()
      .from('trials')
      .select('id')
      .eq('id', trialId)
      .in('trial_status', ['published', 'active'])
      .maybeSingle();
    if (error) throw error;
    if (!publicTrial) return NextResponse.json({ error: 'Trial not found' }, { status: 404 });

    const model = await loadTrialPremium(trialId);
    if (model.status !== 'ready') {
      return NextResponse.json({ error: 'The paper entry form is not available yet' }, { status: 404 });
    }

    const pdf = await createTrialPaperEntryPdf(model);
    return new NextResponse(Buffer.from(pdf), { headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${paperEntryFilename(model.trial.trialName)}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    console.error('Public paper entry form failed', { trialId, error });
    return NextResponse.json({ error: 'Failed to generate paper entry form' }, { status: 500 });
  }
}
