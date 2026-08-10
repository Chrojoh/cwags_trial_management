import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  hasTrialPermission,
  isTrialCollaboratorRole,
  type EffectiveTrialRole,
  type TrialPermission,
} from '@/lib/trialPermissions';

type AdministratorAuthResult =
  | { authorized: true; userId: string }
  | { authorized: false; response: NextResponse };

export async function requireAdministrator(request: NextRequest): Promise<AdministratorAuthResult> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'administrator') {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 }),
    };
  }

  return { authorized: true, userId: user.id };
}

export function getServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export type TrialAuthorizationResult =
  | { authorized: true; userId: string; role: EffectiveTrialRole }
  | { authorized: false; response: NextResponse };

/** Authoritative API authorization for every trial-specific operation. */
export async function requireTrialPermission(
  request: NextRequest,
  trialId: string,
  permission: TrialPermission
): Promise<TrialAuthorizationResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized [AUTH_HEADER_MISSING]', code: 'AUTH_HEADER_MISSING' },
        { status: 401 }
      ),
    };
  }

  const accessToken = authHeader.slice('Bearer '.length).trim();
  if (!accessToken) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized [AUTH_TOKEN_MISSING]', code: 'AUTH_TOKEN_MISSING' },
        { status: 401 }
      ),
    };
  }

  // Validate the explicit bearer token with the same public project client
  // that issued the browser session. Passing the token as an argument avoids
  // global-header overrides while keeping service credentials out of auth.
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { user }, error } = await authClient.auth.getUser(accessToken);
  if (error || !user) {
    console.warn('Trial API bearer validation failed', {
      trialId,
      errorCode: error?.code || null,
      errorStatus: error?.status || null,
    });
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error: 'Unauthorized [AUTH_TOKEN_INVALID]',
          code: 'AUTH_TOKEN_INVALID',
          authStatus: error?.status || null,
        },
        { status: 401 }
      ),
    };
  }

  const service = getServiceRoleClient();
  const [{ data: profile }, { data: trial }] = await Promise.all([
    service.from('users').select('role,is_active').eq('id', user.id).maybeSingle(),
    service.from('trials').select('created_by').eq('id', trialId).maybeSingle(),
  ]);
  if (!profile || profile.is_active === false) {
    return { authorized: false, response: NextResponse.json({ error: 'Active user profile required' }, { status: 403 }) };
  }
  if (!trial) {
    return { authorized: false, response: NextResponse.json({ error: 'Trial not found' }, { status: 404 }) };
  }

  let role: EffectiveTrialRole | null = null;
  if (profile.role === 'administrator') role = 'administrator';
  else if (trial.created_by === user.id) role = 'owner';
  else {
    const { data: collaborator, error: collaboratorError } = await service
      .from('trial_collaborators')
      .select('role')
      .eq('trial_id', trialId)
      .eq('user_id', user.id)
      .eq('invitation_status', 'accepted')
      .is('revoked_at', null)
      .maybeSingle();

    // Before the additive migration is installed, retain existing assignment access.
    if (!collaboratorError && isTrialCollaboratorRole(collaborator?.role)) {
      role = collaborator.role;
    } else {
      const { data: assignment } = await service
        .from('trial_assignments')
        .select('id')
        .eq('trial_id', trialId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (assignment) role = 'legacy_secretary';
    }
  }

  if (!hasTrialPermission(role, permission)) {
    return { authorized: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { authorized: true, userId: user.id, role: role! };
}

export async function requireTrialAccess(request: NextRequest, trialId: string): Promise<AdministratorAuthResult> {
  return requireTrialPermission(request, trialId, 'view_trial');
}
