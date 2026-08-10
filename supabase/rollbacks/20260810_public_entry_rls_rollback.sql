-- Exact rollback to the policy/RLS/grant state captured before
-- 20260810_public_entry_rls.sql. Use only if the new stage must be reverted.
begin;

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

grant all privileges on table public.cwags_registry to anon, authenticated;
grant all privileges on table public.entries to anon, authenticated;
grant all privileges on table public.entry_selections to anon, authenticated;

alter table public.cwags_registry disable row level security;
alter table public.entries enable row level security;
alter table public.entry_selections disable row level security;

create policy "Public read registry" on public.cwags_registry
for select to public using (true);

create policy "Allow all select" on public.entries
for select to public using (true);
create policy "Allow entry updates" on public.entries
for update to anon using (true) with check (true);
create policy "Allow public entry creation" on public.entries
for insert to anon with check (true);
create policy "Allow public entry lookup" on public.entries
for select to anon using (true);
create policy "Allow public insert" on public.entries
for insert to public with check (true);
create policy "Allow public read" on public.entries
for select to public using (true);
create policy "Allow public update" on public.entries
for update to public using (true) with check (true);
create policy "Public Insert" on public.entries
for insert to public with check (true);
create policy "Public Select" on public.entries
for select to public using (true);
create policy "Public Update" on public.entries
for update to public using (true) with check (true);
create policy "Public read entries" on public.entries
for select to public using (true);

create policy "Allow all entry selections operations" on public.entry_selections
for all to anon using (true) with check (true);
create policy "Public insert entry selections" on public.entry_selections
for insert to public with check (true);
create policy "Public read entry selections" on public.entry_selections
for select to public using (true);

commit;
