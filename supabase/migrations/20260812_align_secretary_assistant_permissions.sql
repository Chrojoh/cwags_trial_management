-- Align database mutation rights with src/lib/trialPermissions.ts.
-- Assistants retain entry, waitlist, running-order, score, and journal access.
-- Only secretaries (plus trial owners and administrators through has_trial_role)
-- may change trial setup or financial records.
begin;

drop policy if exists trials_trial_team_update on public.trials;
create policy trials_trial_team_update on public.trials
for update to authenticated
using (public.has_trial_role(id, array['secretary']))
with check (public.has_trial_role(id, array['secretary']));

drop policy if exists trial_days_trial_team_insert on public.trial_days;
drop policy if exists trial_days_trial_team_update on public.trial_days;
drop policy if exists trial_days_trial_team_delete on public.trial_days;
create policy trial_days_trial_team_insert on public.trial_days
for insert to authenticated with check (public.has_trial_role(trial_id, array['secretary']));
create policy trial_days_trial_team_update on public.trial_days
for update to authenticated
using (public.has_trial_role(trial_id, array['secretary']))
with check (public.has_trial_role(trial_id, array['secretary']));
create policy trial_days_trial_team_delete on public.trial_days
for delete to authenticated using (public.has_trial_role(trial_id, array['secretary']));

drop policy if exists trial_classes_trial_team_insert on public.trial_classes;
drop policy if exists trial_classes_trial_team_update on public.trial_classes;
drop policy if exists trial_classes_trial_team_delete on public.trial_classes;
create policy trial_classes_trial_team_insert on public.trial_classes
for insert to authenticated with check (
  exists (select 1 from public.trial_days td where td.id = trial_classes.trial_day_id
    and public.has_trial_role(td.trial_id, array['secretary']))
);
create policy trial_classes_trial_team_update on public.trial_classes
for update to authenticated
using (exists (select 1 from public.trial_days td where td.id = trial_classes.trial_day_id
  and public.has_trial_role(td.trial_id, array['secretary'])))
with check (exists (select 1 from public.trial_days td where td.id = trial_classes.trial_day_id
  and public.has_trial_role(td.trial_id, array['secretary'])));
create policy trial_classes_trial_team_delete on public.trial_classes
for delete to authenticated using (
  exists (select 1 from public.trial_days td where td.id = trial_classes.trial_day_id
    and public.has_trial_role(td.trial_id, array['secretary']))
);

drop policy if exists trial_rounds_trial_team_insert on public.trial_rounds;
drop policy if exists trial_rounds_trial_team_update on public.trial_rounds;
drop policy if exists trial_rounds_trial_team_delete on public.trial_rounds;
create policy trial_rounds_trial_team_insert on public.trial_rounds
for insert to authenticated with check (
  exists (select 1 from public.trial_classes tc join public.trial_days td on td.id = tc.trial_day_id
    where tc.id = trial_rounds.trial_class_id and public.has_trial_role(td.trial_id, array['secretary']))
);
create policy trial_rounds_trial_team_update on public.trial_rounds
for update to authenticated
using (exists (select 1 from public.trial_classes tc join public.trial_days td on td.id = tc.trial_day_id
  where tc.id = trial_rounds.trial_class_id and public.has_trial_role(td.trial_id, array['secretary'])))
with check (exists (select 1 from public.trial_classes tc join public.trial_days td on td.id = tc.trial_day_id
  where tc.id = trial_rounds.trial_class_id and public.has_trial_role(td.trial_id, array['secretary'])));
create policy trial_rounds_trial_team_delete on public.trial_rounds
for delete to authenticated using (
  exists (select 1 from public.trial_classes tc join public.trial_days td on td.id = tc.trial_day_id
    where tc.id = trial_rounds.trial_class_id and public.has_trial_role(td.trial_id, array['secretary']))
);

drop policy if exists payment_trial_team_insert on public.entry_payment_transactions;
drop policy if exists payment_trial_team_update on public.entry_payment_transactions;
drop policy if exists payment_trial_team_delete on public.entry_payment_transactions;
create policy payment_trial_team_insert on public.entry_payment_transactions
for insert to authenticated with check (
  exists (select 1 from public.entries e where e.id = entry_payment_transactions.entry_id
    and public.has_trial_role(e.trial_id, array['secretary']))
);
create policy payment_trial_team_update on public.entry_payment_transactions
for update to authenticated
using (exists (select 1 from public.entries e where e.id = entry_payment_transactions.entry_id
  and public.has_trial_role(e.trial_id, array['secretary'])))
with check (exists (select 1 from public.entries e where e.id = entry_payment_transactions.entry_id
  and public.has_trial_role(e.trial_id, array['secretary'])));
create policy payment_trial_team_delete on public.entry_payment_transactions
for delete to authenticated using (
  exists (select 1 from public.entries e where e.id = entry_payment_transactions.entry_id
    and public.has_trial_role(e.trial_id, array['secretary']))
);

drop policy if exists break_even_trial_team_insert on public.trial_break_even_config;
drop policy if exists break_even_trial_team_update on public.trial_break_even_config;
drop policy if exists break_even_trial_team_delete on public.trial_break_even_config;
create policy break_even_trial_team_insert on public.trial_break_even_config
for insert to authenticated with check (public.has_trial_role(trial_id, array['secretary']));
create policy break_even_trial_team_update on public.trial_break_even_config
for update to authenticated
using (public.has_trial_role(trial_id, array['secretary']))
with check (public.has_trial_role(trial_id, array['secretary']));
create policy break_even_trial_team_delete on public.trial_break_even_config
for delete to authenticated using (public.has_trial_role(trial_id, array['secretary']));

drop policy if exists expense_trial_team_insert on public.trial_expenses;
drop policy if exists expense_trial_team_update on public.trial_expenses;
drop policy if exists expense_trial_team_delete on public.trial_expenses;
create policy expense_trial_team_insert on public.trial_expenses
for insert to authenticated with check (public.has_trial_role(trial_id, array['secretary']));
create policy expense_trial_team_update on public.trial_expenses
for update to authenticated
using (public.has_trial_role(trial_id, array['secretary']))
with check (public.has_trial_role(trial_id, array['secretary']));
create policy expense_trial_team_delete on public.trial_expenses
for delete to authenticated using (public.has_trial_role(trial_id, array['secretary']));

drop policy if exists time_config_trial_team_insert on public.trial_time_configurations;
drop policy if exists time_config_trial_team_update on public.trial_time_configurations;
drop policy if exists time_config_trial_team_delete on public.trial_time_configurations;
create policy time_config_trial_team_insert on public.trial_time_configurations
for insert to authenticated with check (public.has_trial_role(trial_id, array['secretary']));
create policy time_config_trial_team_update on public.trial_time_configurations
for update to authenticated
using (public.has_trial_role(trial_id, array['secretary']))
with check (public.has_trial_role(trial_id, array['secretary']));
create policy time_config_trial_team_delete on public.trial_time_configurations
for delete to authenticated using (public.has_trial_role(trial_id, array['secretary']));

drop policy if exists daily_allotment_trial_team_insert on public.trial_daily_allotments;
drop policy if exists daily_allotment_trial_team_update on public.trial_daily_allotments;
drop policy if exists daily_allotment_trial_team_delete on public.trial_daily_allotments;
create policy daily_allotment_trial_team_insert on public.trial_daily_allotments
for insert to authenticated with check (
  exists (select 1 from public.trial_days td where td.id = trial_daily_allotments.trial_day_id
    and public.has_trial_role(td.trial_id, array['secretary']))
);
create policy daily_allotment_trial_team_update on public.trial_daily_allotments
for update to authenticated
using (exists (select 1 from public.trial_days td where td.id = trial_daily_allotments.trial_day_id
  and public.has_trial_role(td.trial_id, array['secretary'])))
with check (exists (select 1 from public.trial_days td where td.id = trial_daily_allotments.trial_day_id
  and public.has_trial_role(td.trial_id, array['secretary'])));
create policy daily_allotment_trial_team_delete on public.trial_daily_allotments
for delete to authenticated using (
  exists (select 1 from public.trial_days td where td.id = trial_daily_allotments.trial_day_id
    and public.has_trial_role(td.trial_id, array['secretary']))
);

-- Entries intentionally remain editable by assistants because contact details,
-- status, and event-day operations live on the parent row. Prevent an
-- assistant-only collaborator from using that broad row access to alter the
-- financial ledger fields directly. Secretaries, owners, administrators, and
-- server-side service-role operations are unaffected.
create or replace function public.prevent_assistant_financial_entry_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if pg_trigger_depth() = 1
     and auth.uid() is not null
     and public.has_trial_role(old.trial_id, array['assistant'])
     and not public.has_trial_role(old.trial_id, array['secretary'])
     and (
       new.total_fee is distinct from old.total_fee
       or new.payment_status is distinct from old.payment_status
       or new.amount_paid is distinct from old.amount_paid
       or new.amount_owed is distinct from old.amount_owed
       or new.fees_waived is distinct from old.fees_waived
       or new.waiver_reason is distinct from old.waiver_reason
       or new.is_judge_volunteer is distinct from old.is_judge_volunteer
     ) then
    raise exception using
      errcode = '42501',
      message = 'ASSISTANT_FINANCIAL_CHANGE_NOT_ALLOWED';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_assistant_financial_entry_changes() from public;

drop trigger if exists prevent_assistant_financial_entry_changes_trigger on public.entries;
create trigger prevent_assistant_financial_entry_changes_trigger
before update on public.entries
for each row execute function public.prevent_assistant_financial_entry_changes();

commit;

select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and policyname in (
    'trials_trial_team_update',
    'trial_days_trial_team_insert', 'trial_days_trial_team_update', 'trial_days_trial_team_delete',
    'trial_classes_trial_team_insert', 'trial_classes_trial_team_update', 'trial_classes_trial_team_delete',
    'trial_rounds_trial_team_insert', 'trial_rounds_trial_team_update', 'trial_rounds_trial_team_delete',
    'payment_trial_team_insert', 'payment_trial_team_update', 'payment_trial_team_delete',
    'break_even_trial_team_insert', 'break_even_trial_team_update', 'break_even_trial_team_delete',
    'expense_trial_team_insert', 'expense_trial_team_update', 'expense_trial_team_delete',
    'time_config_trial_team_insert', 'time_config_trial_team_update', 'time_config_trial_team_delete',
    'daily_allotment_trial_team_insert', 'daily_allotment_trial_team_update', 'daily_allotment_trial_team_delete'
  )
order by tablename, policyname;
