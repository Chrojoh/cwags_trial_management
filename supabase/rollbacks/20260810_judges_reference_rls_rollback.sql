-- Emergency functional rollback for 20260810_judges_reference_rls.sql.
begin;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('judges', 'judging_history', 'system_config')
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

alter table public.judges disable row level security;
alter table public.judging_history disable row level security;
alter table public.system_config disable row level security;

grant all privileges on table public.judges to anon, authenticated;
grant all privileges on table public.judging_history to anon, authenticated;
grant all privileges on table public.system_config to anon, authenticated;

commit;
