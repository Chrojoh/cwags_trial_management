import { NextRequest, NextResponse } from 'next/server';
import { requireTrialPermission } from '@/lib/apiAuth';
import { loadTrialPremium, saveTrialPremium } from '@/lib/server/trialPremium';
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
      const preview = { ...model, content };
      const missing = [
        !content.paymentInstructions && 'Payment instructions',
        !content.refundPolicy && 'Refund/cancellation policy',
        !content.facilityInformation && 'Facility information',
        !content.veterinarianInformation && 'Veterinarian information',
        !content.emergencyInformation && 'Emergency information',
        !preview.trial.waiverText && 'Waiver text',
        preview.schedule.length === 0 && 'Class and round schedule',
      ].filter(Boolean);
      if (missing.length) return NextResponse.json({ error: 'Required premium information is missing', missing }, { status: 409 });
    }
    await saveTrialPremium(trialId, content, status, auth.userId);
    return NextResponse.json(await loadTrialPremium(trialId));
  } catch (error) {
    console.error('Premium save failed', { trialId, error });
    return NextResponse.json({ error: 'Failed to save premium. The premium database migration may still be required.' }, { status: 500 });
  }
}
