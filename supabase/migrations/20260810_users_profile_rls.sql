-- Secure application user profiles and create new profiles from auth.users.
begin;

create or replace function public.create_application_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    username,
    first_name,
    last_name,
    role,
    is_active
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), new.email, new.id::text),
    coalesce(nullif(new.raw_user_meta_data ->> 'first_name', ''), ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'last_name', ''), ''),
    'trial_secretary',
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_application_user_profile_trigger on auth.users;
create trigger create_application_user_profile_trigger
after insert on auth.users
for each row execute function public.create_application_user_profile();

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'users'
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end;
$$;

alter table public.users enable row level security;

revoke all on table public.users from anon, authenticated;
grant select on table public.users to authenticated;

-- A signed-in user may read their own application profile. Administrators
-- need the directory for trial-secretary assignment and dashboard totals.
create policy users_self_admin_select
on public.users for select to authenticated
using (id = auth.uid() or public.is_app_administrator());

commit;

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'users'
order by policyname;
