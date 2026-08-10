-- Second coordinated RLS stage: scores and the immutable activity journal.
-- Apply manually only after the first-stage regression tests have passed.
begin;

-- Remove accumulated policies so each table has one explicit authorization set.
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

alter table public.scores enable row level security;
alter table public.trial_activity_log enable row level security;

revoke all on table public.scores from anon, authenticated;
revoke all on table public.trial_activity_log from anon, authenticated;

grant select, insert, update, delete on table public.scores to authenticated;
grant select, insert on table public.trial_activity_log to authenticated;

-- Scores must point to a selection and round belonging to the same trial, and
-- the signed-in user must be a member of that trial team (or an app admin).
create policy scores_trial_team_select
on public.scores
for select
to authenticated
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
      and public.has_trial_role(e.trial_id, null)
  )
);

create policy scores_trial_team_insert
on public.scores
for insert
to authenticated
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
      and public.has_trial_role(e.trial_id, null)
  )
);

create policy scores_trial_team_update
on public.scores
for update
to authenticated
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
      and public.has_trial_role(e.trial_id, null)
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
      and public.has_trial_role(e.trial_id, null)
  )
);

create policy scores_trial_team_delete
on public.scores
for delete
to authenticated
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
      and public.has_trial_role(e.trial_id, null)
  )
);

-- Journal records can be read and appended by the trial team. They cannot be
-- updated or deleted through the application. SECURITY DEFINER audit triggers
-- continue to append records as the database owner.
create policy trial_activity_log_trial_team_select
on public.trial_activity_log
for select
to authenticated
using (public.has_trial_role(trial_id, null));

create policy trial_activity_log_trial_team_insert
on public.trial_activity_log
for insert
to authenticated
with check (
  public.has_trial_role(trial_id, null)
  and (user_id is null or user_id = auth.uid() or public.is_app_administrator())
);

commit;

select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('scores', 'trial_activity_log')
order by tablename, policyname;
