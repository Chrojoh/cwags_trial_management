-- Protect shared judge/reference data without changing authenticated reads.
-- User profiles are intentionally excluded; registration still writes users directly.
begin;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('judges', 'judging_history', 'system_config')
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

alter table public.judges enable row level security;
alter table public.judging_history enable row level security;
alter table public.system_config enable row level security;

revoke all on table public.judges from anon, authenticated;
revoke all on table public.judging_history from anon, authenticated;
revoke all on table public.system_config from anon, authenticated;

grant select, insert, update, delete on table public.judges to authenticated;
grant select, insert, update, delete on table public.judging_history to authenticated;
grant select, insert, update, delete on table public.system_config to authenticated;

-- Trial staff need the shared judge directory while assigning rounds and
-- generating event documents. Directory maintenance remains administrator-only.
create policy judges_authenticated_select
on public.judges for select to authenticated
using (auth.uid() is not null);

create policy judges_admin_insert
on public.judges for insert to authenticated
with check (public.is_app_administrator());

create policy judges_admin_update
on public.judges for update to authenticated
using (public.is_app_administrator())
with check (public.is_app_administrator());

create policy judges_admin_delete
on public.judges for delete to authenticated
using (public.is_app_administrator());

-- Judging history is shared reference information but may only be maintained
-- by an application administrator.
create policy judging_history_authenticated_select
on public.judging_history for select to authenticated
using (auth.uid() is not null);

create policy judging_history_admin_insert
on public.judging_history for insert to authenticated
with check (public.is_app_administrator());

create policy judging_history_admin_update
on public.judging_history for update to authenticated
using (public.is_app_administrator())
with check (public.is_app_administrator());

create policy judging_history_admin_delete
on public.judging_history for delete to authenticated
using (public.is_app_administrator());

-- Configuration values may be consumed by any signed-in application page,
-- while changes remain administrator-only.
create policy system_config_authenticated_select
on public.system_config for select to authenticated
using (auth.uid() is not null);

create policy system_config_admin_insert
on public.system_config for insert to authenticated
with check (public.is_app_administrator());

create policy system_config_admin_update
on public.system_config for update to authenticated
using (public.is_app_administrator())
with check (public.is_app_administrator());

create policy system_config_admin_delete
on public.system_config for delete to authenticated
using (public.is_app_administrator());

commit;

select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('judges', 'judging_history', 'system_config')
order by tablename, policyname;
