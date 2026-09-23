import { NextRequest, NextResponse } from 'next/server';
import { requireTrialPermission } from '@/lib/apiAuth';
import { loadPostTrialPackageModel } from '@/lib/server/postTrialPackage';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string }> }
) {
  const { trialId } = await params;
  const auth = await requireTrialPermission(request, trialId, 'generate_reports');
  if (!auth.authorized) return auth.response;

  try {
    return NextResponse.json(await loadPostTrialPackageModel(trialId));
  } catch (error) {
    console.error('Post-trial package preview failed', { trialId, error });
    return NextResponse.json(
      { error: 'Failed to prepare the post-trial package preview' },
      { status: 500 }
    );
  }
}
