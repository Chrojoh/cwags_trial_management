-- Correct the legacy score foreign key and quarantine the obsolete user backup.
begin;

lock table public.scores in share row exclusive mode;
lock table public.users in share mode;

do $$
begin
  if exists (
    select 1
    from public.scores s
    where s.scored_by is not null
      and not exists (
        select 1 from public.users u where u.id = s.scored_by
      )
  ) then
    raise exception 'SCORED_BY_LIVE_USER_VALIDATION_FAILED';
  end if;
end;
$$;

alter table public.scores
  drop constraint if exists scores_scored_by_fkey;

alter table public.scores
  add constraint scores_scored_by_fkey
  foreign key (scored_by)
  references public.users(id);

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'users_backup_broken'
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

alter table public.users_backup_broken enable row level security;
alter table public.users_backup_broken force row level security;
revoke all on table public.users_backup_broken from anon, authenticated;

commit;

select
  c.conname as constraint_name,
  c.conrelid::regclass::text as referencing_table,
  c.confrelid::regclass::text as referenced_table,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
where c.conname = 'scores_scored_by_fkey'
  and c.conrelid = 'public.scores'::regclass;
