import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth';
import { isTrialCollaboratorRole } from '@/lib/trialPermissions';

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const migrationMissing = (error: { code?: string; message?: string } | null) =>
  Boolean(error && (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('trial_collaborators')));
const notInstalled = () => NextResponse.json(
  { error: 'Trial Collaborators is prepared but not installed in Supabase yet. Run the approved collaborator migration after the active trial finishes.' },
  { status: 503 }
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ trialId: string }> }) {
  const { trialId } = await params;
  const auth = await requireTrialPermission(request, trialId, 'manage_collaborators');
  if (!auth.authorized) return auth.response;
  const service = getServiceRoleClient();
  const { data, error } = await service.from('trial_collaborators')
    .select('id,trial_id,user_id,invited_email,role,invitation_status,invited_at,last_sent_at,accepted_at,declined_at,revoked_at,expires_at,users:user_id(first_name,last_name,email)')
    .eq('trial_id', trialId).order('invited_at');
  if (migrationMissing(error)) return notInstalled();
  if (error) return NextResponse.json({ error: 'Unable to load collaborators' }, { status: 500 });
  return NextResponse.json({ collaborators: data || [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ trialId: string }> }) {
  const { trialId } = await params;
  const auth = await requireTrialPermission(request, trialId, 'manage_collaborators');
  if (!auth.authorized) return auth.response;
  const body = await request.json();
  const email = normalizeEmail(typeof body.email === 'string' ? body.email : '');
  if (!/^\S+@\S+\.\S+$/.test(email) || !isTrialCollaboratorRole(body.role)) {
    return NextResponse.json({ error: 'A valid email and collaborator role are required' }, { status: 400 });
  }

  const service = getServiceRoleClient();
  const [{ data: existingUser }, { data: trial }] = await Promise.all([
    service.from('users').select('id').ilike('email', email).maybeSingle(),
    service.from('trials').select('created_by').eq('id', trialId).single(),
  ]);
  if (existingUser?.id === trial?.created_by) {
    return NextResponse.json({ error: 'The trial owner already has full access' }, { status: 409 });
  }

  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await service.from('trial_collaborators').insert({
    trial_id: trialId, user_id: existingUser?.id || null, invited_email: email,
    role: body.role, invitation_status: 'pending', token_hash: tokenHash,
    invited_by: auth.userId, expires_at: expiresAt,
  }).select('id,invited_email,role,invitation_status,expires_at').single();
  if (migrationMissing(error)) return notInstalled();
  if (error?.code === '23505') return NextResponse.json({ error: 'An active invitation or membership already exists' }, { status: 409 });
  if (error) return NextResponse.json({ error: 'Unable to create invitation' }, { status: 500 });

  await service.from('trial_activity_log').insert({
    trial_id: trialId, activity_type: 'collaborator_invitation_sent', user_id: auth.userId,
    snapshot_data: { collaborator_id: data.id, invited_email: email, role: body.role, expires_at: expiresAt },
  });
  // No mail transport is configured. The token is returned once for a future approved email/link integration.
  return NextResponse.json({ invitation: data, invitationToken: token }, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ trialId: string }> }) {
  const { trialId } = await params;
  const auth = await requireTrialPermission(request, trialId, 'manage_collaborators');
  if (!auth.authorized) return auth.response;
  const body = await request.json();
  if (typeof body.id !== 'string') return NextResponse.json({ error: 'Invitation is required' }, { status: 400 });

  const service = getServiceRoleClient();
  const { data: before } = await service.from('trial_collaborators').select('*')
    .eq('id', body.id).eq('trial_id', trialId).single();
  if (!before) return NextResponse.json({ error: 'Invitation not found or Trial Collaborators is not installed yet' }, { status: 404 });

  let updates: Record<string, unknown>;
  let activityType: string;
  let invitationToken: string | undefined;
  if (body.action === 'revoke') {
    updates = { invitation_status: 'revoked', revoked_at: new Date().toISOString(), token_hash: null };
    activityType = 'collaborator_invitation_revoked';
  } else if (body.action === 'role' && isTrialCollaboratorRole(body.role)) {
    updates = { role: body.role };
    activityType = 'collaborator_role_changed';
  } else if (body.action === 'resend' && before.invitation_status === 'pending') {
    invitationToken = randomBytes(32).toString('base64url');
    updates = { token_hash: createHash('sha256').update(invitationToken).digest('hex'), last_sent_at: new Date().toISOString(), expires_at: new Date(Date.now() + 7 * 86400000).toISOString() };
    activityType = 'collaborator_invitation_resent';
  } else return NextResponse.json({ error: 'Invalid collaborator action' }, { status: 400 });

  const { data: after, error } = await service.from('trial_collaborators').update(updates)
    .eq('id', before.id).eq('trial_id', trialId).select('id,invited_email,role,invitation_status,expires_at').single();
  if (error) return NextResponse.json({ error: 'Unable to update collaborator' }, { status: 500 });
  await service.from('trial_activity_log').insert({ trial_id: trialId, activity_type: activityType,
    user_id: auth.userId, snapshot_data: { collaborator_id: before.id, before, after } });
  return NextResponse.json({ collaborator: after, invitationToken });
}
