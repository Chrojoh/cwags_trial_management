-- Trial collaborators and invitations (additive, forward-only).
-- PREPARED FOR LATER MANUAL EXECUTION. Do not run during the active trial.
create extension if not exists pgcrypto;

create table if not exists public.trial_collaborators (
  id uuid primary key default gen_random_uuid(),
  trial_id uuid not null references public.trials(id) on delete cascade,
  user_id uuid null references public.users(id) on delete restrict,
  invited_email text not null,
  normalized_email text generated always as (lower(trim(invited_email))) stored,
  role text not null,
  invitation_status text not null default 'pending',
  token_hash text null,
  invited_by uuid not null references public.users(id) on delete restrict,
  invited_at timestamptz not null default now(),
  last_sent_at timestamptz not null default now(),
  accepted_at timestamptz null,
  declined_at timestamptz null,
  revoked_at timestamptz null,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trial_collaborators_role_check
    check (role in ('secretary', 'assistant', 'read_only')),
  constraint trial_collaborators_status_check
    check (invitation_status in ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  constraint trial_collaborators_accepted_check
    check (invitation_status <> 'accepted' or (user_id is not null and accepted_at is not null and revoked_at is null)),
  constraint trial_collaborators_pending_check
    check (invitation_status <> 'pending' or (accepted_at is null and declined_at is null and revoked_at is null))
);

create unique index if not exists trial_collaborators_accepted_user_unique
  on public.trial_collaborators(trial_id, user_id)
  where invitation_status = 'accepted' and revoked_at is null;

create unique index if not exists trial_collaborators_live_email_unique
  on public.trial_collaborators(trial_id, normalized_email)
  where invitation_status in ('pending', 'accepted') and revoked_at is null;

create index if not exists trial_collaborators_user_access_idx
  on public.trial_collaborators(user_id, trial_id)
  where invitation_status = 'accepted' and revoked_at is null;

create or replace function public.touch_trial_collaborator_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists touch_trial_collaborator_updated_at_trigger on public.trial_collaborators;
create trigger touch_trial_collaborator_updated_at_trigger
before update on public.trial_collaborators
for each row execute function public.touch_trial_collaborator_updated_at();

create or replace function public.is_app_administrator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.users where id = auth.uid() and role = 'administrator' and is_active is not false);
$$;

create or replace function public.has_trial_role(p_trial_id uuid, p_roles text[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_app_administrator()
    or exists(select 1 from public.trials where id = p_trial_id and created_by = auth.uid())
    or exists(
      select 1 from public.trial_collaborators c
      where c.trial_id = p_trial_id and c.user_id = auth.uid()
        and c.invitation_status = 'accepted' and c.revoked_at is null
        and (c.expires_at is null or c.expires_at > now())
        and (p_roles is null or c.role = any(p_roles))
    )
    or exists(select 1 from public.trial_assignments a where a.trial_id = p_trial_id and a.user_id = auth.uid());
$$;

create or replace function public.accept_trial_invitation(p_invitation_id uuid, p_token text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_invite public.trial_collaborators%rowtype;
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_name text;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  select * into v_invite from public.trial_collaborators where id = p_invitation_id for update;
  if not found then raise exception 'INVITATION_NOT_FOUND'; end if;
  if v_invite.invitation_status <> 'pending' or v_invite.revoked_at is not null then raise exception 'INVITATION_NOT_PENDING'; end if;
  if v_invite.expires_at is not null and v_invite.expires_at <= now() then
    update public.trial_collaborators set invitation_status = 'expired', token_hash = null where id = v_invite.id;
    raise exception 'INVITATION_EXPIRED';
  end if;
  if v_email = '' or v_email <> v_invite.normalized_email then raise exception 'INVITATION_EMAIL_MISMATCH'; end if;
  if v_invite.user_id is not null and v_invite.user_id <> auth.uid() then raise exception 'INVITATION_USER_MISMATCH'; end if;
  if v_invite.user_id is null and v_invite.token_hash is not null
     and (p_token is null or encode(digest(p_token, 'sha256'), 'hex') <> v_invite.token_hash) then
    raise exception 'INVALID_INVITATION_TOKEN';
  end if;

  update public.trial_collaborators set
    user_id = auth.uid(), invitation_status = 'accepted', accepted_at = now(), token_hash = null
  where id = v_invite.id;

  select nullif(trim(concat_ws(' ', first_name, last_name)), '') into v_name from public.users where id = auth.uid();
  insert into public.trial_activity_log(trial_id, activity_type, snapshot_data, user_id, user_name)
  values(v_invite.trial_id, 'collaborator_invitation_accepted',
    jsonb_build_object('collaborator_id', v_invite.id, 'role', v_invite.role, 'invited_email', v_invite.normalized_email),
    auth.uid(), coalesce(v_name, v_email));
  return jsonb_build_object('trial_id', v_invite.trial_id, 'role', v_invite.role);
exception when unique_violation then raise exception 'MEMBERSHIP_ALREADY_EXISTS';
end;
$$;

alter table public.trial_collaborators enable row level security;
revoke all on public.trial_collaborators from anon, authenticated;
grant select on public.trial_collaborators to authenticated;

create policy "owners and admins view trial collaborators" on public.trial_collaborators
for select to authenticated using (
  public.is_app_administrator()
  or exists(select 1 from public.trials t where t.id = trial_id and t.created_by = auth.uid())
  or user_id = auth.uid()
  or (invitation_status = 'pending' and normalized_email = lower(trim(coalesce(auth.jwt() ->> 'email', ''))))
);

revoke all on function public.accept_trial_invitation(uuid,text) from public;
grant execute on function public.accept_trial_invitation(uuid,text) to authenticated;
revoke all on function public.has_trial_role(uuid,text[]) from public;
grant execute on function public.has_trial_role(uuid,text[]) to authenticated, service_role;
revoke all on function public.is_app_administrator() from public;
grant execute on function public.is_app_administrator() to authenticated, service_role;
