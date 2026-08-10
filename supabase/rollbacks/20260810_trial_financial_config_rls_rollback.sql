-- Emergency functional rollback for 20260810_trial_financial_config_rls.sql.
begin;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'entry_payment_transactions', 'trial_break_even_config',
        'trial_daily_allotments', 'trial_expenses',
        'trial_time_configurations', 'trial_assignments', 'trial_secretaries'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end;
$$;

grant all privileges on table public.entry_payment_transactions to anon, authenticated;
grant all privileges on table public.trial_break_even_config to anon, authenticated;
grant all privileges on table public.trial_daily_allotments to anon, authenticated;
grant all privileges on table public.trial_expenses to anon, authenticated;
grant all privileges on table public.trial_time_configurations to anon, authenticated;
grant all privileges on table public.trial_assignments to anon, authenticated;
grant all privileges on table public.trial_secretaries to anon, authenticated;

create policy "Trial secretaries can manage payments"
on public.entry_payment_transactions for all to authenticated
using (exists (select 1 from public.users where id = auth.uid() and role = any(array['administrator', 'trial_secretary'])));

create policy trial_break_even_config_select_policy on public.trial_break_even_config
for select to public using (true);
create policy trial_break_even_config_insert_policy on public.trial_break_even_config
for insert to public with check (true);
create policy trial_break_even_config_update_policy on public.trial_break_even_config
for update to public using (true) with check (true);
create policy trial_break_even_config_delete_policy on public.trial_break_even_config
for delete to public using (true);

create policy "Admins and secretaries can manage daily allotments"
on public.trial_daily_allotments for all to authenticated
using (exists (select 1 from public.users where id = auth.uid() and role = any(array['administrator', 'trial_secretary'])));
create policy "Trial secretaries and admins can manage expenses"
on public.trial_expenses for all to authenticated
using (exists (select 1 from public.users where id = auth.uid() and role = any(array['administrator', 'trial_secretary'])));
create policy "Admins and secretaries can manage time configs"
on public.trial_time_configurations for all to authenticated
using (exists (select 1 from public.users where id = auth.uid() and role = any(array['administrator', 'trial_secretary'])));

create policy "Admins can manage all assignments" on public.trial_assignments
for all to authenticated using (public.is_app_administrator());
create policy "Trial creators can manage assignments" on public.trial_assignments
for all to authenticated using (exists (select 1 from public.trials where id = trial_assignments.trial_id and created_by = auth.uid()));
create policy "Users can view their own assignments" on public.trial_assignments
for select to authenticated using (user_id = auth.uid());

create policy "Admins can manage all assignments" on public.trial_secretaries
for all to authenticated using (public.is_app_administrator());
create policy "Admins can view all assignments" on public.trial_secretaries
for select to authenticated using (public.is_app_administrator());
create policy "Trial creators can manage their trial assignments" on public.trial_secretaries
for all to authenticated using (exists (select 1 from public.trials where id = trial_secretaries.trial_id and created_by = auth.uid()));
create policy "Users can view their own assignments" on public.trial_secretaries
for select to authenticated using (user_id = auth.uid());

commit;
