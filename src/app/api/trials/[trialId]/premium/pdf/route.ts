import { NextRequest, NextResponse } from 'next/server';
import { requireTrialPermission } from '@/lib/apiAuth';
import { loadTrialPremium } from '@/lib/server/trialPremium';
import { createTrialPremiumPdf, premiumFilename } from '@/lib/trialPremiumPdf';
import { EMPTY_PREMIUM_CONTENT, type TrialPremiumContent } from '@/types/trialPremium';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ trialId: string }> }) {
  const { trialId } = await params;
  const auth = await requireTrialPermission(request, trialId, 'generate_trial_application');
  if (!auth.authorized) return auth.response;
  try {
    const model = await loadTrialPremium(trialId);
    const body = await request.json().catch(() => ({})) as { content?: Partial<TrialPremiumContent> };
    const pdf = await createTrialPremiumPdf({
      ...model,
      content: { ...EMPTY_PREMIUM_CONTENT, ...model.content, ...(body.content || {}) },
    });
    return new NextResponse(Buffer.from(pdf), { headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${premiumFilename(model.trial.trialName)}"`,
      'Cache-Control': 'no-store',
    } });
  } catch (error) {
    console.error('Premium PDF failed', { trialId, error });
    return NextResponse.json({ error: 'Failed to generate premium PDF' }, { status: 500 });
  }
}
