-- Allow a signed-in recipient to accept a dashboard invitation using their
-- verified account email. A token remains validated when one is supplied by a
-- future email/deep-link flow, but the dashboard button does not require it.
begin;

create or replace function public.accept_trial_invitation(
  p_invitation_id uuid,
  p_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite public.trial_collaborators%rowtype;
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_name text;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;

  select * into v_invite
  from public.trial_collaborators
  where id = p_invitation_id
  for update;

  if not found then raise exception 'INVITATION_NOT_FOUND'; end if;
  if v_invite.invitation_status <> 'pending' or v_invite.revoked_at is not null then
    raise exception 'INVITATION_NOT_PENDING';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at <= now() then
    update public.trial_collaborators
       set invitation_status = 'expired', token_hash = null
     where id = v_invite.id;
    raise exception 'INVITATION_EXPIRED';
  end if;
  if v_email = '' or v_email <> v_invite.normalized_email then
    raise exception 'INVITATION_EMAIL_MISMATCH';
  end if;
  if v_invite.user_id is not null and v_invite.user_id <> auth.uid() then
    raise exception 'INVITATION_USER_MISMATCH';
  end if;

  -- The authenticated, matching email is sufficient for dashboard acceptance.
  -- When a token is explicitly supplied, it must still match the stored hash.
  if p_token is not null
     and v_invite.token_hash is not null
     and encode(digest(p_token, 'sha256'), 'hex') <> v_invite.token_hash then
    raise exception 'INVALID_INVITATION_TOKEN';
  end if;

  update public.trial_collaborators
     set user_id = auth.uid(),
         invitation_status = 'accepted',
         accepted_at = now(),
         token_hash = null
   where id = v_invite.id;

  select nullif(trim(concat_ws(' ', first_name, last_name)), '')
    into v_name
    from public.users
   where id = auth.uid();

  insert into public.trial_activity_log(
    trial_id, activity_type, snapshot_data, user_id, user_name
  ) values (
    v_invite.trial_id,
    'collaborator_invitation_accepted',
    jsonb_build_object(
      'collaborator_id', v_invite.id,
      'role', v_invite.role,
      'invited_email', v_invite.normalized_email
    ),
    auth.uid(),
    coalesce(v_name, v_email)
  );

  return jsonb_build_object('trial_id', v_invite.trial_id, 'role', v_invite.role);
exception
  when unique_violation then raise exception 'MEMBERSHIP_ALREADY_EXISTS';
end;
$$;

revoke all on function public.accept_trial_invitation(uuid, text) from public;
grant execute on function public.accept_trial_invitation(uuid, text)
to authenticated, service_role;

commit;

select
  p.proname as routine_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.proconfig as settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'accept_trial_invitation';
