-- Emergency rollback for 20260810_scores_journal_rls.sql.
begin;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('scores', 'trial_activity_log')
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

alter table public.scores disable row level security;
alter table public.trial_activity_log disable row level security;

grant all privileges on table public.scores to anon, authenticated;
grant all privileges on table public.trial_activity_log to anon, authenticated;

create policy "Allow all access to scores"
on public.scores
for all
to public
using (true)
with check (true);

commit;
