-- Access rollback for 20260810_repoint_scores_and_quarantine_user_backup.sql.
-- The corrected scores -> users foreign key is intentionally retained because
-- restoring the obsolete target could reject scores created after the repair.
begin;

alter table public.users_backup_broken enable row level security;
alter table public.users_backup_broken force row level security;
grant all privileges on table public.users_backup_broken to anon, authenticated;

drop policy if exists "Allow authenticated read own user record"
on public.users_backup_broken;
create policy "Allow authenticated read own user record"
on public.users_backup_broken for select to public
using (auth.uid() = id);

drop policy if exists "Allow trigger insert"
on public.users_backup_broken;
create policy "Allow trigger insert"
on public.users_backup_broken for insert to anon, authenticated, service_role
with check (true);

commit;
