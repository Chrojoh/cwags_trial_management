import { NextRequest, NextResponse } from 'next/server';
import { requireTrialPermission } from '@/lib/apiAuth';
import { getMissingRequiredPremiumInformation, loadTrialPremium, saveTrialPremium } from '@/lib/server/trialPremium';
import { EMPTY_PREMIUM_CONTENT, type PremiumStatus, type TrialPremiumContent } from '@/types/trialPremium';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ trialId: string }> }) {
  const { trialId } = await params;
  const auth = await requireTrialPermission(request, trialId, 'generate_trial_application');
  if (!auth.authorized) return auth.response;
  try {
    return NextResponse.json(await loadTrialPremium(trialId));
  } catch (error) {
    console.error('Premium load failed', { trialId, error });
    return NextResponse.json({ error: 'Failed to load premium' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ trialId: string }> }) {
  const { trialId } = await params;
  const auth = await requireTrialPermission(request, trialId, 'edit_trial');
  if (!auth.authorized) return auth.response;
  try {
    const body = await request.json() as { content?: Partial<TrialPremiumContent>; status?: PremiumStatus };
    const content = { ...EMPTY_PREMIUM_CONTENT, ...(body.content || {}) };
    const status: PremiumStatus = body.status === 'ready' ? 'ready' : 'draft';
    const model = await loadTrialPremium(trialId);
    if (status === 'ready') {
      const missing = getMissingRequiredPremiumInformation(
        model.trial.waiverText,
        model.schedule.length
      );
      if (missing.length) return NextResponse.json({ error: 'Required premium information is missing', missing }, { status: 409 });
    }
    await saveTrialPremium(trialId, content, status, auth.userId);
    return NextResponse.json(await loadTrialPremium(trialId));
  } catch (error) {
    console.error('Premium save failed', { trialId, error });
    return NextResponse.json({ error: 'Failed to save premium. The premium database migration may still be required.' }, { status: 500 });
  }
}
