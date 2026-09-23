import { NextRequest, NextResponse } from 'next/server';
import { requireTrialPermission } from '@/lib/apiAuth';
import { loadPostTrialPackageModel } from '@/lib/server/postTrialPackage';
import {
  createPostTrialPackageZip,
  postTrialPackageFilename,
} from '@/lib/postTrialPackageExport';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string }> }
) {
  const { trialId } = await params;
  const auth = await requireTrialPermission(request, trialId, 'generate_reports');
  if (!auth.authorized) return auth.response;

  try {
    const model = await loadPostTrialPackageModel(trialId);
    const bytes = await createPostTrialPackageZip(model);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${postTrialPackageFilename(model)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Post-trial package download failed', { trialId, error });
    return NextResponse.json({ error: 'Failed to generate the post-trial package' }, { status: 500 });
  }
}
