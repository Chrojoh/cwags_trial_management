-- Keep exactly one auth.users insert trigger responsible for creating public.users.
-- Existing auth accounts and application profiles are not modified.
begin;

do $cleanup$
declare
  trigger_row record;
begin
  for trigger_row in
    select t.tgname
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    where t.tgrelid = 'auth.users'::regclass
      and not t.tgisinternal
      and p.proname in (
        'create_application_user_profile',
        'handle_new_auth_user',
        'sync_auth_user'
      )
  loop
    execute format('drop trigger if exists %I on auth.users', trigger_row.tgname);
  end loop;
end;
$cleanup$;

create or replace function public.create_application_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.users (
    id,
    email,
    first_name,
    last_name,
    role,
    is_active
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'first_name', ''), ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'last_name', ''), ''),
    'trial_secretary',
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger create_application_user_profile_trigger
after insert on auth.users
for each row execute function public.create_application_user_profile();

revoke all on function public.create_application_user_profile() from public;

commit;

select
  t.tgname as trigger_name,
  p.proname as function_name,
  pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'auth.users'::regclass
  and not t.tgisinternal
order by t.tgname;
