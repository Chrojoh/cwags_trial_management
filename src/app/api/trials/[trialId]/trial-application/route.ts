import { NextRequest, NextResponse } from 'next/server';
import { requireTrialPermission } from '@/lib/apiAuth';
import { getTrialApplicationData } from '@/lib/trialApplication/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ trialId: string }> }) {
  try {
    const { trialId } = await params;
    const auth = await requireTrialPermission(request, trialId, 'generate_trial_application');
    if (!auth.authorized) return auth.response;
    return NextResponse.json(await getTrialApplicationData(trialId));
  } catch (error) {
    console.error('Trial application review failed:', error);
    return NextResponse.json({ error: 'Failed to load trial application data' }, { status: 500 });
  }
}
