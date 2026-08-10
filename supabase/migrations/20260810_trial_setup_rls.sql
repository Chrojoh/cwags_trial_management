-- Coordinated RLS for trials and their day/class/round setup hierarchy.
begin;

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
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end;
$$;

alter table public.trials enable row level security;
alter table public.trial_days enable row level security;
alter table public.trial_classes enable row level security;
alter table public.trial_rounds enable row level security;

create or replace function public.protect_trial_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.created_by is distinct from new.created_by
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_app_administrator() then
    raise exception 'TRIAL_OWNER_CHANGE_NOT_AUTHORIZED';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_trial_created_by_trigger on public.trials;
create trigger protect_trial_created_by_trigger
before update of created_by on public.trials
for each row execute function public.protect_trial_created_by();

revoke all on table public.trials from anon, authenticated;
revoke all on table public.trial_days from anon, authenticated;
revoke all on table public.trial_classes from anon, authenticated;
revoke all on table public.trial_rounds from anon, authenticated;

grant select, insert, update, delete on table public.trials to authenticated;
grant select, insert, update, delete on table public.trial_days to authenticated;
grant select, insert, update, delete on table public.trial_classes to authenticated;
grant select, insert, update, delete on table public.trial_rounds to authenticated;

-- A newly created trial must be owned by its creator. Administrators may also
-- create records for controlled administrative workflows.
create policy trials_trial_team_select
on public.trials for select to authenticated
using (public.has_trial_role(id, null));

create policy trials_owner_insert
on public.trials for insert to authenticated
with check (created_by = auth.uid() or public.is_app_administrator());

create policy trials_trial_team_update
on public.trials for update to authenticated
using (public.has_trial_role(id, array['secretary', 'assistant']))
with check (public.has_trial_role(id, array['secretary', 'assistant']));

-- Deleting a complete trial is intentionally narrower than ordinary edits.
create policy trials_owner_admin_delete
on public.trials for delete to authenticated
using (created_by = auth.uid() or public.is_app_administrator());

create policy trial_days_trial_team_select
on public.trial_days for select to authenticated
using (public.has_trial_role(trial_id, null));

create policy trial_days_trial_team_insert
on public.trial_days for insert to authenticated
with check (public.has_trial_role(trial_id, array['secretary', 'assistant']));

create policy trial_days_trial_team_update
on public.trial_days for update to authenticated
using (public.has_trial_role(trial_id, array['secretary', 'assistant']))
with check (public.has_trial_role(trial_id, array['secretary', 'assistant']));

create policy trial_days_trial_team_delete
on public.trial_days for delete to authenticated
using (public.has_trial_role(trial_id, array['secretary', 'assistant']));

create policy trial_classes_trial_team_select
on public.trial_classes for select to authenticated
using (
  exists (
    select 1 from public.trial_days td
    where td.id = trial_classes.trial_day_id
      and public.has_trial_role(td.trial_id, null)
  )
);

create policy trial_classes_trial_team_insert
on public.trial_classes for insert to authenticated
with check (
  exists (
    select 1 from public.trial_days td
    where td.id = trial_classes.trial_day_id
      and public.has_trial_role(td.trial_id, array['secretary', 'assistant'])
  )
);

create policy trial_classes_trial_team_update
on public.trial_classes for update to authenticated
using (
  exists (
    select 1 from public.trial_days td
    where td.id = trial_classes.trial_day_id
      and public.has_trial_role(td.trial_id, array['secretary', 'assistant'])
  )
)
with check (
  exists (
    select 1 from public.trial_days td
    where td.id = trial_classes.trial_day_id
      and public.has_trial_role(td.trial_id, array['secretary', 'assistant'])
  )
);

create policy trial_classes_trial_team_delete
on public.trial_classes for delete to authenticated
using (
  exists (
    select 1 from public.trial_days td
    where td.id = trial_classes.trial_day_id
      and public.has_trial_role(td.trial_id, array['secretary', 'assistant'])
  )
);

create policy trial_rounds_trial_team_select
on public.trial_rounds for select to authenticated
using (
  exists (
    select 1
    from public.trial_classes tc
    join public.trial_days td on td.id = tc.trial_day_id
    where tc.id = trial_rounds.trial_class_id
      and public.has_trial_role(td.trial_id, null)
  )
);

create policy trial_rounds_trial_team_insert
on public.trial_rounds for insert to authenticated
with check (
  exists (
    select 1
    from public.trial_classes tc
    join public.trial_days td on td.id = tc.trial_day_id
    where tc.id = trial_rounds.trial_class_id
      and public.has_trial_role(td.trial_id, array['secretary', 'assistant'])
  )
);

create policy trial_rounds_trial_team_update
on public.trial_rounds for update to authenticated
using (
  exists (
    select 1
    from public.trial_classes tc
    join public.trial_days td on td.id = tc.trial_day_id
    where tc.id = trial_rounds.trial_class_id
      and public.has_trial_role(td.trial_id, array['secretary', 'assistant'])
  )
)
with check (
  exists (
    select 1
    from public.trial_classes tc
    join public.trial_days td on td.id = tc.trial_day_id
    where tc.id = trial_rounds.trial_class_id
      and public.has_trial_role(td.trial_id, array['secretary', 'assistant'])
  )
);

create policy trial_rounds_trial_team_delete
on public.trial_rounds for delete to authenticated
using (
  exists (
    select 1
    from public.trial_classes tc
    join public.trial_days td on td.id = tc.trial_day_id
    where tc.id = trial_rounds.trial_class_id
      and public.has_trial_role(td.trial_id, array['secretary', 'assistant'])
  )
);

commit;

select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('trials', 'trial_days', 'trial_classes', 'trial_rounds')
order by tablename, policyname;
