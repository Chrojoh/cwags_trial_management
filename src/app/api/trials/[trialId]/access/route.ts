import { NextRequest, NextResponse } from 'next/server';
import { requireTrialPermission } from '@/lib/apiAuth';
import { hasTrialPermission, TRIAL_PERMISSIONS } from '@/lib/trialPermissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string }> }
) {
  const { trialId } = await params;
  const auth = await requireTrialPermission(request, trialId, 'view_trial');
  if (!auth.authorized) return auth.response;

  return NextResponse.json({
    role: auth.role,
    permissions: TRIAL_PERMISSIONS.filter((permission) =>
      hasTrialPermission(auth.role, permission)
    ),
  });
}
