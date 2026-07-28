import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/apiAuth';

const migrationMissing = (error: { code?: string; message?: string } | null) =>
  Boolean(error && (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('trial_collaborators')));

async function authenticatedClient(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authorization } } });
  const { data: { user } } = await client.auth.getUser();
  return user ? { client, user } : null;
}

export async function GET(request: NextRequest) {
  const auth = await authenticatedClient(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const email = auth.user.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ invitations: [] });
  const service = getServiceRoleClient();
  const { data, error } = await service.from('trial_collaborators')
    .select('id,trial_id,invited_email,role,invited_at,expires_at,trials(trial_name,start_date,end_date)')
    .eq('normalized_email', email).eq('invitation_status', 'pending').is('revoked_at', null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('invited_at', { ascending: false });
  if (migrationMissing(error)) return NextResponse.json({ invitations: [], featureInstalled: false });
  if (error) return NextResponse.json({ error: 'Unable to load invitations' }, { status: 500 });
  return NextResponse.json({ invitations: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedClient(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (typeof body.id !== 'string') return NextResponse.json({ error: 'Invitation is required' }, { status: 400 });
  if (body.action === 'accept') {
    const { data, error } = await auth.client.rpc('accept_trial_invitation', {
      p_invitation_id: body.id, p_token: typeof body.token === 'string' ? body.token : null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ membership: data });
  }
  if (body.action !== 'decline') return NextResponse.json({ error: 'Invalid invitation action' }, { status: 400 });

  const email = auth.user.email?.trim().toLowerCase();
  const service = getServiceRoleClient();
  const { data: invitation } = await service.from('trial_collaborators').select('*')
    .eq('id', body.id).eq('normalized_email', email || '').eq('invitation_status', 'pending').single();
  if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  const now = new Date().toISOString();
  const { error } = await service.from('trial_collaborators').update({ invitation_status: 'declined', declined_at: now, token_hash: null })
    .eq('id', invitation.id).eq('invitation_status', 'pending');
  if (error) return NextResponse.json({ error: 'Unable to decline invitation' }, { status: 500 });
  await service.from('trial_activity_log').insert({ trial_id: invitation.trial_id,
    activity_type: 'collaborator_invitation_declined', user_id: auth.user.id,
    snapshot_data: { collaborator_id: invitation.id, role: invitation.role, invited_email: invitation.normalized_email } });
  return NextResponse.json({ declined: true });
}
