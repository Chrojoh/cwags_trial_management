-- Emergency functional rollback for 20260810_trial_setup_rls.sql.
begin;

drop trigger if exists protect_trial_created_by_trigger on public.trials;
drop function if exists public.protect_trial_created_by();

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('trials', 'trial_days', 'trial_classes', 'trial_rounds')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end;
$$;

-- Restore the three child tables to their audited pre-migration behavior.
alter table public.trial_days disable row level security;
alter table public.trial_classes disable row level security;
alter table public.trial_rounds disable row level security;
grant all privileges on table public.trial_days to anon, authenticated;
grant all privileges on table public.trial_classes to anon, authenticated;
grant all privileges on table public.trial_rounds to anon, authenticated;

create policy "Public read trial days" on public.trial_days for select to public using (true);
create policy "Public read trial classes" on public.trial_classes for select to public using (true);
create policy "Public read trial rounds" on public.trial_rounds for select to public using (true);

-- Keep trials protected by RLS while restoring broad authenticated operation
-- and public reads comparable to the prior application behavior.
alter table public.trials enable row level security;
grant all privileges on table public.trials to anon, authenticated;
create policy "Public read trials" on public.trials for select to public using (true);
create policy "Authenticated insert trials" on public.trials for insert to authenticated
with check (auth.uid() is not null);
create policy "Authenticated update trials" on public.trials for update to authenticated
using (true) with check (true);
create policy "Owners and admins delete trials" on public.trials for delete to authenticated
using (created_by = auth.uid() or public.is_app_administrator());

commit;
