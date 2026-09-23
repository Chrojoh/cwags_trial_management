import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth';
import { saveTrialPremiumMap } from '@/lib/server/trialPremium';

const bucket = 'premium-maps';
const allowed = new Map([['image/png', 'png'], ['image/jpeg', 'jpg']]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ trialId: string }> }) {
  const { trialId } = await params;
  const auth = await requireTrialPermission(request, trialId, 'edit_trial');
  if (!auth.authorized) return auth.response;
  try {
    const form = await request.formData();
    const file = form.get('map');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a map image.' }, { status: 400 });
    const extension = allowed.get(file.type);
    if (!extension) return NextResponse.json({ error: 'Map must be a JPG or PNG image.' }, { status: 415 });
    if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: 'Map image must be 3 MB or smaller.' }, { status: 413 });
    const db = getServiceRoleClient();
    const path = `${trialId}/venue-map.${extension}`;
    const { error: uploadError } = await db.storage.from(bucket).upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type, upsert: true, cacheControl: '3600',
    });
    if (uploadError) throw new Error(uploadError.message);
    await saveTrialPremiumMap(trialId, path, auth.userId);
    return NextResponse.json({ path });
  } catch (error) {
    console.error('Premium map upload failed', { trialId, error });
    return NextResponse.json({ error: 'Unable to save the map. The premium migration may still be required.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ trialId: string }> }) {
  const { trialId } = await params;
  const auth = await requireTrialPermission(request, trialId, 'generate_trial_application');
  if (!auth.authorized) return auth.response;
  const db = getServiceRoleClient();
  const { data: premium } = await db.from('trial_premiums').select('map_image_path').eq('trial_id', trialId).maybeSingle();
  if (!premium?.map_image_path) return NextResponse.json({ error: 'No map uploaded' }, { status: 404 });
  const { data, error } = await db.storage.from(bucket).download(premium.map_image_path);
  if (error || !data) return NextResponse.json({ error: 'Map unavailable' }, { status: 404 });
  return new NextResponse(Buffer.from(await data.arrayBuffer()), { headers: { 'Content-Type': data.type || 'image/png', 'Cache-Control': 'private, max-age=300' } });
}
