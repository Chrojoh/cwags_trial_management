-- Correct mutation policies so a collaborator with role read_only cannot write.
-- Administrators, trial creators, assigned secretaries, secretary collaborators,
-- and assistant collaborators retain their existing access.
begin;

drop policy if exists entries_trial_team_insert on public.entries;
drop policy if exists entries_trial_team_update on public.entries;
drop policy if exists entries_trial_team_delete on public.entries;

create policy entries_trial_team_insert
on public.entries for insert to authenticated
with check (public.has_trial_role(trial_id, array['secretary', 'assistant']));

create policy entries_trial_team_update
on public.entries for update to authenticated
using (public.has_trial_role(trial_id, array['secretary', 'assistant']))
with check (public.has_trial_role(trial_id, array['secretary', 'assistant']));

create policy entries_trial_team_delete
on public.entries for delete to authenticated
using (public.has_trial_role(trial_id, array['secretary', 'assistant']));

drop policy if exists entry_selections_trial_team_insert on public.entry_selections;
drop policy if exists entry_selections_trial_team_update on public.entry_selections;
drop policy if exists entry_selections_trial_team_delete on public.entry_selections;

create policy entry_selections_trial_team_insert
on public.entry_selections for insert to authenticated
with check (
  exists (
    select 1
    from public.entries e
    join public.trial_rounds tr on tr.id = entry_selections.trial_round_id
    join public.trial_classes tc on tc.id = tr.trial_class_id
    join public.trial_days td on td.id = tc.trial_day_id
    where e.id = entry_selections.entry_id
      and e.trial_id = td.trial_id
      and public.has_trial_role(e.trial_id, array['secretary', 'assistant'])
  )
);

create policy entry_selections_trial_team_update
on public.entry_selections for update to authenticated
using (
  exists (
    select 1
    from public.entries e
    join public.trial_rounds tr on tr.id = entry_selections.trial_round_id
    join public.trial_classes tc on tc.id = tr.trial_class_id
    join public.trial_days td on td.id = tc.trial_day_id
    where e.id = entry_selections.entry_id
      and e.trial_id = td.trial_id
      and public.has_trial_role(e.trial_id, array['secretary', 'assistant'])
  )
)
with check (
  exists (
    select 1
    from public.entries e
    join public.trial_rounds tr on tr.id = entry_selections.trial_round_id
    join public.trial_classes tc on tc.id = tr.trial_class_id
    join public.trial_days td on td.id = tc.trial_day_id
    where e.id = entry_selections.entry_id
      and e.trial_id = td.trial_id
      and public.has_trial_role(e.trial_id, array['secretary', 'assistant'])
  )
);

create policy entry_selections_trial_team_delete
on public.entry_selections for delete to authenticated
using (
  exists (
    select 1
    from public.entries e
    join public.trial_rounds tr on tr.id = entry_selections.trial_round_id
    join public.trial_classes tc on tc.id = tr.trial_class_id
    join public.trial_days td on td.id = tc.trial_day_id
    where e.id = entry_selections.entry_id
      and e.trial_id = td.trial_id
      and public.has_trial_role(e.trial_id, array['secretary', 'assistant'])
  )
);

drop policy if exists scores_trial_team_insert on public.scores;
drop policy if exists scores_trial_team_update on public.scores;
drop policy if exists scores_trial_team_delete on public.scores;

create policy scores_trial_team_insert
on public.scores for insert to authenticated
with check (
  exists (
    select 1
    from public.entry_selections es
    join public.entries e on e.id = es.entry_id
    join public.trial_rounds tr on tr.id = scores.trial_round_id
    join public.trial_classes tc on tc.id = tr.trial_class_id
    join public.trial_days td on td.id = tc.trial_day_id
    where es.id = scores.entry_selection_id
      and e.trial_id = td.trial_id
      and public.has_trial_role(e.trial_id, array['secretary', 'assistant'])
  )
);

create policy scores_trial_team_update
on public.scores for update to authenticated
using (
  exists (
    select 1
    from public.entry_selections es
    join public.entries e on e.id = es.entry_id
    join public.trial_rounds tr on tr.id = scores.trial_round_id
    join public.trial_classes tc on tc.id = tr.trial_class_id
    join public.trial_days td on td.id = tc.trial_day_id
    where es.id = scores.entry_selection_id
      and e.trial_id = td.trial_id
      and public.has_trial_role(e.trial_id, array['secretary', 'assistant'])
  )
)
with check (
  exists (
    select 1
    from public.entry_selections es
    join public.entries e on e.id = es.entry_id
    join public.trial_rounds tr on tr.id = scores.trial_round_id
    join public.trial_classes tc on tc.id = tr.trial_class_id
    join public.trial_days td on td.id = tc.trial_day_id
    where es.id = scores.entry_selection_id
      and e.trial_id = td.trial_id
      and public.has_trial_role(e.trial_id, array['secretary', 'assistant'])
  )
);

create policy scores_trial_team_delete
on public.scores for delete to authenticated
using (
  exists (
    select 1
    from public.entry_selections es
    join public.entries e on e.id = es.entry_id
    join public.trial_rounds tr on tr.id = scores.trial_round_id
    join public.trial_classes tc on tc.id = tr.trial_class_id
    join public.trial_days td on td.id = tc.trial_day_id
    where es.id = scores.entry_selection_id
      and e.trial_id = td.trial_id
      and public.has_trial_role(e.trial_id, array['secretary', 'assistant'])
  )
);

drop policy if exists trial_activity_log_trial_team_insert on public.trial_activity_log;
create policy trial_activity_log_trial_team_insert
on public.trial_activity_log for insert to authenticated
with check (
  public.has_trial_role(trial_id, array['secretary', 'assistant'])
  and (user_id is null or user_id = auth.uid() or public.is_app_administrator())
);

commit;

select tablename, policyname, roles, cmd, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('entries', 'entry_selections', 'scores', 'trial_activity_log')
order by tablename, policyname;
