-- First coordinated RLS stage: registry, entries, and entry selections.
-- Public entry lookup and writes now use service-role server routes.
begin;

-- Remove the accumulated permissive policies before installing one clear set.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('cwags_registry', 'entries', 'entry_selections')
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

alter table public.cwags_registry enable row level security;
alter table public.entries enable row level security;
alter table public.entry_selections enable row level security;

revoke all on table public.cwags_registry from anon, authenticated;
revoke all on table public.entries from anon, authenticated;
revoke all on table public.entry_selections from anon, authenticated;

-- Registry identity remains publicly searchable. Only administrators may
-- mutate it directly; public entry synchronization uses the server route.
grant select on table public.cwags_registry to anon, authenticated;
grant insert, update, delete on table public.cwags_registry to authenticated;

create policy cwags_registry_public_read
on public.cwags_registry
for select
to anon, authenticated
using (true);

create policy cwags_registry_admin_insert
on public.cwags_registry
for insert
to authenticated
with check (public.is_app_administrator());

create policy cwags_registry_admin_update
on public.cwags_registry
for update
to authenticated
using (public.is_app_administrator())
with check (public.is_app_administrator());

create policy cwags_registry_admin_delete
on public.cwags_registry
for delete
to authenticated
using (public.is_app_administrator());

-- Trial data is no longer exposed to anonymous PostgREST clients.
grant select, insert, update, delete on table public.entries to authenticated;

create policy entries_trial_team_select
on public.entries
for select
to authenticated
using (public.has_trial_role(trial_id, null));

create policy entries_trial_team_insert
on public.entries
for insert
to authenticated
with check (public.has_trial_role(trial_id, null));

create policy entries_trial_team_update
on public.entries
for update
to authenticated
using (public.has_trial_role(trial_id, null))
with check (public.has_trial_role(trial_id, null));

create policy entries_trial_team_delete
on public.entries
for delete
to authenticated
using (public.has_trial_role(trial_id, null));

grant select, insert, update, delete on table public.entry_selections to authenticated;

-- A selection must belong to an entry and round from the same authorized trial.
create policy entry_selections_trial_team_select
on public.entry_selections
for select
to authenticated
using (
  exists (
    select 1
    from public.entries e
    join public.trial_rounds tr on tr.id = entry_selections.trial_round_id
    join public.trial_classes tc on tc.id = tr.trial_class_id
    join public.trial_days td on td.id = tc.trial_day_id
    where e.id = entry_selections.entry_id
      and e.trial_id = td.trial_id
      and public.has_trial_role(e.trial_id, null)
  )
);

create policy entry_selections_trial_team_insert
on public.entry_selections
for insert
to authenticated
with check (
  exists (
    select 1
    from public.entries e
    join public.trial_rounds tr on tr.id = entry_selections.trial_round_id
    join public.trial_classes tc on tc.id = tr.trial_class_id
    join public.trial_days td on td.id = tc.trial_day_id
    where e.id = entry_selections.entry_id
      and e.trial_id = td.trial_id
      and public.has_trial_role(e.trial_id, null)
  )
);

create policy entry_selections_trial_team_update
on public.entry_selections
for update
to authenticated
using (
  exists (
    select 1
    from public.entries e
    join public.trial_rounds tr on tr.id = entry_selections.trial_round_id
    join public.trial_classes tc on tc.id = tr.trial_class_id
    join public.trial_days td on td.id = tc.trial_day_id
    where e.id = entry_selections.entry_id
      and e.trial_id = td.trial_id
      and public.has_trial_role(e.trial_id, null)
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
      and public.has_trial_role(e.trial_id, null)
  )
);

create policy entry_selections_trial_team_delete
on public.entry_selections
for delete
to authenticated
using (
  exists (
    select 1
    from public.entries e
    join public.trial_rounds tr on tr.id = entry_selections.trial_round_id
    join public.trial_classes tc on tc.id = tr.trial_class_id
    join public.trial_days td on td.id = tc.trial_day_id
    where e.id = entry_selections.entry_id
      and e.trial_id = td.trial_id
      and public.has_trial_role(e.trial_id, null)
  )
);

commit;

select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('cwags_registry', 'entries', 'entry_selections')
order by tablename, policyname;
