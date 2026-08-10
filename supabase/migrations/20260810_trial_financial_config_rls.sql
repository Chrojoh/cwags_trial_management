-- Trial-scoped RLS for financial, timing, allotment, and assignment records.
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
        'entry_payment_transactions',
        'trial_break_even_config',
        'trial_daily_allotments',
        'trial_expenses',
        'trial_time_configurations',
        'trial_assignments',
        'trial_secretaries'
      )
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

revoke all on table public.entry_payment_transactions from anon, authenticated;
revoke all on table public.trial_break_even_config from anon, authenticated;
revoke all on table public.trial_daily_allotments from anon, authenticated;
revoke all on table public.trial_expenses from anon, authenticated;
revoke all on table public.trial_time_configurations from anon, authenticated;
revoke all on table public.trial_assignments from anon, authenticated;
revoke all on table public.trial_secretaries from anon, authenticated;

grant select, insert, update, delete on table public.entry_payment_transactions to authenticated;
grant select, insert, update, delete on table public.trial_break_even_config to authenticated;
grant select, insert, update, delete on table public.trial_daily_allotments to authenticated;
grant select, insert, update, delete on table public.trial_expenses to authenticated;
grant select, insert, update, delete on table public.trial_time_configurations to authenticated;
grant select, insert, update, delete on table public.trial_assignments to authenticated;
grant select, insert, update, delete on table public.trial_secretaries to authenticated;

-- Payments inherit their trial through entries.
create policy payment_trial_team_select on public.entry_payment_transactions
for select to authenticated using (
  exists (
    select 1 from public.entries e
    where e.id = entry_payment_transactions.entry_id
      and public.has_trial_role(e.trial_id, null)
  )
);
create policy payment_trial_team_insert on public.entry_payment_transactions
for insert to authenticated with check (
  exists (
    select 1 from public.entries e
    where e.id = entry_payment_transactions.entry_id
      and public.has_trial_role(e.trial_id, array['secretary', 'assistant'])
  )
);
create policy payment_trial_team_update on public.entry_payment_transactions
for update to authenticated using (
  exists (
    select 1 from public.entries e
    where e.id = entry_payment_transactions.entry_id
      and public.has_trial_role(e.trial_id, array['secretary', 'assistant'])
  )
) with check (
  exists (
    select 1 from public.entries e
    where e.id = entry_payment_transactions.entry_id
      and public.has_trial_role(e.trial_id, array['secretary', 'assistant'])
  )
);
create policy payment_trial_team_delete on public.entry_payment_transactions
for delete to authenticated using (
  exists (
    select 1 from public.entries e
    where e.id = entry_payment_transactions.entry_id
      and public.has_trial_role(e.trial_id, array['secretary', 'assistant'])
  )
);

create policy break_even_trial_team_select on public.trial_break_even_config
for select to authenticated using (public.has_trial_role(trial_id, null));
create policy break_even_trial_team_insert on public.trial_break_even_config
for insert to authenticated with check (
  public.has_trial_role(trial_id, array['secretary', 'assistant'])
);
create policy break_even_trial_team_update on public.trial_break_even_config
for update to authenticated
using (public.has_trial_role(trial_id, array['secretary', 'assistant']))
with check (public.has_trial_role(trial_id, array['secretary', 'assistant']));
create policy break_even_trial_team_delete on public.trial_break_even_config
for delete to authenticated
using (public.has_trial_role(trial_id, array['secretary', 'assistant']));

-- Daily allotments inherit their trial through trial_days.
create policy daily_allotment_trial_team_select on public.trial_daily_allotments
for select to authenticated using (
  exists (
    select 1 from public.trial_days td
    where td.id = trial_daily_allotments.trial_day_id
      and public.has_trial_role(td.trial_id, null)
  )
);
create policy daily_allotment_trial_team_insert on public.trial_daily_allotments
for insert to authenticated with check (
  exists (
    select 1 from public.trial_days td
    where td.id = trial_daily_allotments.trial_day_id
      and public.has_trial_role(td.trial_id, array['secretary', 'assistant'])
  )
);
create policy daily_allotment_trial_team_update on public.trial_daily_allotments
for update to authenticated using (
  exists (
    select 1 from public.trial_days td
    where td.id = trial_daily_allotments.trial_day_id
      and public.has_trial_role(td.trial_id, array['secretary', 'assistant'])
  )
) with check (
  exists (
    select 1 from public.trial_days td
    where td.id = trial_daily_allotments.trial_day_id
      and public.has_trial_role(td.trial_id, array['secretary', 'assistant'])
  )
);
create policy daily_allotment_trial_team_delete on public.trial_daily_allotments
for delete to authenticated using (
  exists (
    select 1 from public.trial_days td
    where td.id = trial_daily_allotments.trial_day_id
      and public.has_trial_role(td.trial_id, array['secretary', 'assistant'])
  )
);

create policy expense_trial_team_select on public.trial_expenses
for select to authenticated using (public.has_trial_role(trial_id, null));
create policy expense_trial_team_insert on public.trial_expenses
for insert to authenticated with check (
  public.has_trial_role(trial_id, array['secretary', 'assistant'])
);
create policy expense_trial_team_update on public.trial_expenses
for update to authenticated
using (public.has_trial_role(trial_id, array['secretary', 'assistant']))
with check (public.has_trial_role(trial_id, array['secretary', 'assistant']));
create policy expense_trial_team_delete on public.trial_expenses
for delete to authenticated
using (public.has_trial_role(trial_id, array['secretary', 'assistant']));

create policy time_config_trial_team_select on public.trial_time_configurations
for select to authenticated using (public.has_trial_role(trial_id, null));
create policy time_config_trial_team_insert on public.trial_time_configurations
for insert to authenticated with check (
  public.has_trial_role(trial_id, array['secretary', 'assistant'])
);
create policy time_config_trial_team_update on public.trial_time_configurations
for update to authenticated
using (public.has_trial_role(trial_id, array['secretary', 'assistant']))
with check (public.has_trial_role(trial_id, array['secretary', 'assistant']));
create policy time_config_trial_team_delete on public.trial_time_configurations
for delete to authenticated
using (public.has_trial_role(trial_id, array['secretary', 'assistant']));

-- Assignment administration remains limited to the trial creator or an app administrator.
create policy trial_assignment_team_select on public.trial_assignments
for select to authenticated using (
  user_id = auth.uid() or public.has_trial_role(trial_id, null)
);
create policy trial_assignment_owner_admin_insert on public.trial_assignments
for insert to authenticated with check (
  public.is_app_administrator()
  or exists (
    select 1 from public.trials t
    where t.id = trial_assignments.trial_id and t.created_by = auth.uid()
  )
);
create policy trial_assignment_owner_admin_update on public.trial_assignments
for update to authenticated using (
  public.is_app_administrator()
  or exists (
    select 1 from public.trials t
    where t.id = trial_assignments.trial_id and t.created_by = auth.uid()
  )
) with check (
  public.is_app_administrator()
  or exists (
    select 1 from public.trials t
    where t.id = trial_assignments.trial_id and t.created_by = auth.uid()
  )
);
create policy trial_assignment_owner_admin_delete on public.trial_assignments
for delete to authenticated using (
  public.is_app_administrator()
  or exists (
    select 1 from public.trials t
    where t.id = trial_assignments.trial_id and t.created_by = auth.uid()
  )
);

create policy trial_secretary_team_select on public.trial_secretaries
for select to authenticated using (
  user_id = auth.uid() or public.has_trial_role(trial_id, null)
);
create policy trial_secretary_owner_admin_insert on public.trial_secretaries
for insert to authenticated with check (
  public.is_app_administrator()
  or exists (
    select 1 from public.trials t
    where t.id = trial_secretaries.trial_id and t.created_by = auth.uid()
  )
);
create policy trial_secretary_owner_admin_update on public.trial_secretaries
for update to authenticated using (
  public.is_app_administrator()
  or exists (
    select 1 from public.trials t
    where t.id = trial_secretaries.trial_id and t.created_by = auth.uid()
  )
) with check (
  public.is_app_administrator()
  or exists (
    select 1 from public.trials t
    where t.id = trial_secretaries.trial_id and t.created_by = auth.uid()
  )
);
create policy trial_secretary_owner_admin_delete on public.trial_secretaries
for delete to authenticated using (
  public.is_app_administrator()
  or exists (
    select 1 from public.trials t
    where t.id = trial_secretaries.trial_id and t.created_by = auth.uid()
  )
);

commit;

select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'entry_payment_transactions',
    'trial_break_even_config',
    'trial_daily_allotments',
    'trial_expenses',
    'trial_time_configurations',
    'trial_assignments',
    'trial_secretaries'
  )
order by tablename, policyname;
