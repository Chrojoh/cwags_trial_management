-- Emergency functional rollback for 20260810_users_profile_rls.sql.
begin;

drop trigger if exists create_application_user_profile_trigger on auth.users;
drop function if exists public.create_application_user_profile();

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

alter table public.users disable row level security;
grant all privileges on table public.users to anon, authenticated;

commit;
