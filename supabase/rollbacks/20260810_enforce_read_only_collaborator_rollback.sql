-- Roll back only the role restriction introduced by
-- 20260810_enforce_read_only_collaborator.sql.
-- This intentionally restores the previous broader write authorization.
begin;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and policyname in (
        'entries_trial_team_insert',
        'entries_trial_team_update',
        'entries_trial_team_delete',
        'entry_selections_trial_team_insert',
        'entry_selections_trial_team_update',
        'entry_selections_trial_team_delete',
        'scores_trial_team_insert',
        'scores_trial_team_update',
        'scores_trial_team_delete',
        'trial_activity_log_trial_team_insert'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end;
$$;

create policy entries_trial_team_insert on public.entries for insert to authenticated
with check (public.has_trial_role(trial_id, null));
create policy entries_trial_team_update on public.entries for update to authenticated
using (public.has_trial_role(trial_id, null)) with check (public.has_trial_role(trial_id, null));
create policy entries_trial_team_delete on public.entries for delete to authenticated
using (public.has_trial_role(trial_id, null));

create policy entry_selections_trial_team_insert on public.entry_selections for insert to authenticated
with check (exists (select 1 from public.entries e join public.trial_rounds tr on tr.id = entry_selections.trial_round_id join public.trial_classes tc on tc.id = tr.trial_class_id join public.trial_days td on td.id = tc.trial_day_id where e.id = entry_selections.entry_id and e.trial_id = td.trial_id and public.has_trial_role(e.trial_id, null)));
create policy entry_selections_trial_team_update on public.entry_selections for update to authenticated
using (exists (select 1 from public.entries e join public.trial_rounds tr on tr.id = entry_selections.trial_round_id join public.trial_classes tc on tc.id = tr.trial_class_id join public.trial_days td on td.id = tc.trial_day_id where e.id = entry_selections.entry_id and e.trial_id = td.trial_id and public.has_trial_role(e.trial_id, null)))
with check (exists (select 1 from public.entries e join public.trial_rounds tr on tr.id = entry_selections.trial_round_id join public.trial_classes tc on tc.id = tr.trial_class_id join public.trial_days td on td.id = tc.trial_day_id where e.id = entry_selections.entry_id and e.trial_id = td.trial_id and public.has_trial_role(e.trial_id, null)));
create policy entry_selections_trial_team_delete on public.entry_selections for delete to authenticated
using (exists (select 1 from public.entries e join public.trial_rounds tr on tr.id = entry_selections.trial_round_id join public.trial_classes tc on tc.id = tr.trial_class_id join public.trial_days td on td.id = tc.trial_day_id where e.id = entry_selections.entry_id and e.trial_id = td.trial_id and public.has_trial_role(e.trial_id, null)));

create policy scores_trial_team_insert on public.scores for insert to authenticated
with check (exists (select 1 from public.entry_selections es join public.entries e on e.id = es.entry_id join public.trial_rounds tr on tr.id = scores.trial_round_id join public.trial_classes tc on tc.id = tr.trial_class_id join public.trial_days td on td.id = tc.trial_day_id where es.id = scores.entry_selection_id and e.trial_id = td.trial_id and public.has_trial_role(e.trial_id, null)));
create policy scores_trial_team_update on public.scores for update to authenticated
using (exists (select 1 from public.entry_selections es join public.entries e on e.id = es.entry_id join public.trial_rounds tr on tr.id = scores.trial_round_id join public.trial_classes tc on tc.id = tr.trial_class_id join public.trial_days td on td.id = tc.trial_day_id where es.id = scores.entry_selection_id and e.trial_id = td.trial_id and public.has_trial_role(e.trial_id, null)))
with check (exists (select 1 from public.entry_selections es join public.entries e on e.id = es.entry_id join public.trial_rounds tr on tr.id = scores.trial_round_id join public.trial_classes tc on tc.id = tr.trial_class_id join public.trial_days td on td.id = tc.trial_day_id where es.id = scores.entry_selection_id and e.trial_id = td.trial_id and public.has_trial_role(e.trial_id, null)));
create policy scores_trial_team_delete on public.scores for delete to authenticated
using (exists (select 1 from public.entry_selections es join public.entries e on e.id = es.entry_id join public.trial_rounds tr on tr.id = scores.trial_round_id join public.trial_classes tc on tc.id = tr.trial_class_id join public.trial_days td on td.id = tc.trial_day_id where es.id = scores.entry_selection_id and e.trial_id = td.trial_id and public.has_trial_role(e.trial_id, null)));

create policy trial_activity_log_trial_team_insert on public.trial_activity_log for insert to authenticated
with check (public.has_trial_role(trial_id, null) and (user_id is null or user_id = auth.uid() or public.is_app_administrator()));

commit;
