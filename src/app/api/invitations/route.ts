import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/apiAuth';

const migrationMissing = (error: { code?: string; message?: string } | null) =>
  Boolean(
    error &&
    (error.code === '42P01' ||
      error.code === 'PGRST205' ||
      error.message?.includes('trial_collaborators'))
  );

async function authenticatedClient(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authorization } } }
  );
  const {
    data: { user },
  } = await client.auth.getUser();
  return user ? { client, user } : null;
}

export async function GET(request: NextRequest) {
  const auth = await authenticatedClient(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const email = auth.user.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ invitations: [] });
  const service = getServiceRoleClient();
  const { data, error } = await service
    .from('trial_collaborators')
    .select(
      'id,trial_id,invited_email,role,invited_at,expires_at,trials(trial_name,start_date,end_date)'
    )
    .eq('normalized_email', email)
    .eq('invitation_status', 'pending')
    .is('revoked_at', null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('invited_at', { ascending: false });
  if (migrationMissing(error))
    return NextResponse.json({ invitations: [], featureInstalled: false });
  if (error) return NextResponse.json({ error: 'Unable to load invitations' }, { status: 500 });
  return NextResponse.json({ invitations: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedClient(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (typeof body.id !== 'string')
    return NextResponse.json({ error: 'Invitation is required' }, { status: 400 });
  if (body.action === 'accept') {
    const email = auth.user.email?.trim().toLowerCase();
    if (!email)
      return NextResponse.json(
        { error: 'Your account has no verified email address' },
        { status: 409 }
      );

    const service = getServiceRoleClient();
    const { data: invitation, error: invitationError } = await service
      .from('trial_collaborators')
      .select('id,trial_id,user_id,normalized_email,role,invitation_status,revoked_at,expires_at')
      .eq('id', body.id)
      .maybeSingle();

    if (invitationError) {
      console.error('Invitation acceptance lookup failed:', invitationError);
      return NextResponse.json({ error: 'Unable to verify invitation' }, { status: 500 });
    }
    if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    if (invitation.invitation_status !== 'pending' || invitation.revoked_at) {
      return NextResponse.json({ error: 'Invitation is no longer pending' }, { status: 409 });
    }
    if (invitation.expires_at && new Date(invitation.expires_at).getTime() <= Date.now()) {
      await service
        .from('trial_collaborators')
        .update({ invitation_status: 'expired', token_hash: null })
        .eq('id', invitation.id)
        .eq('invitation_status', 'pending');
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 409 });
    }
    if (invitation.normalized_email !== email) {
      return NextResponse.json(
        { error: 'Invitation belongs to a different email address' },
        { status: 403 }
      );
    }
    if (invitation.user_id && invitation.user_id !== auth.user.id) {
      return NextResponse.json(
        { error: 'Invitation belongs to a different user account' },
        { status: 403 }
      );
    }

    const acceptedAt = new Date().toISOString();
    const { data: membership, error: updateError } = await service
      .from('trial_collaborators')
      .update({
        user_id: auth.user.id,
        invitation_status: 'accepted',
        accepted_at: acceptedAt,
        token_hash: null,
      })
      .eq('id', invitation.id)
      .eq('invitation_status', 'pending')
      .is('revoked_at', null)
      .select('trial_id,role')
      .maybeSingle();

    if (updateError) {
      console.error('Invitation acceptance update failed:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Unable to accept invitation' },
        { status: 409 }
      );
    }
    if (!membership) {
      return NextResponse.json(
        { error: 'Invitation changed before it could be accepted. Refresh and try again.' },
        { status: 409 }
      );
    }

    const { data: profile } = await service
      .from('users')
      .select('first_name,last_name')
      .eq('id', auth.user.id)
      .maybeSingle();
    const userName =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || email;
    const { error: journalError } = await service.from('trial_activity_log').insert({
      trial_id: invitation.trial_id,
      activity_type: 'collaborator_invitation_accepted',
      user_id: auth.user.id,
      user_name: userName,
      snapshot_data: {
        collaborator_id: invitation.id,
        role: invitation.role,
        invited_email: invitation.normalized_email,
      },
    });
    if (journalError) console.error('Accepted invitation journal write failed:', journalError);

    return NextResponse.json({ membership });
  }
  if (body.action !== 'decline')
    return NextResponse.json({ error: 'Invalid invitation action' }, { status: 400 });

  const email = auth.user.email?.trim().toLowerCase();
  const service = getServiceRoleClient();
  const { data: invitation } = await service
    .from('trial_collaborators')
    .select('*')
    .eq('id', body.id)
    .eq('normalized_email', email || '')
    .eq('invitation_status', 'pending')
    .single();
  if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  const now = new Date().toISOString();
  const { error } = await service
    .from('trial_collaborators')
    .update({ invitation_status: 'declined', declined_at: now, token_hash: null })
    .eq('id', invitation.id)
    .eq('invitation_status', 'pending');
  if (error) return NextResponse.json({ error: 'Unable to decline invitation' }, { status: 500 });
  await service
    .from('trial_activity_log')
    .insert({
      trial_id: invitation.trial_id,
      activity_type: 'collaborator_invitation_declined',
      user_id: auth.user.id,
      snapshot_data: {
        collaborator_id: invitation.id,
        role: invitation.role,
        invited_email: invitation.normalized_email,
      },
    });
  return NextResponse.json({ declined: true });
}
