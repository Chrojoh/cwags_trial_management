-- Emergency rollback for 20260810_finalize_public_read_grants.sql.
-- Restores the previous grants and anonymous registry read policy.

begin;

grant all privileges on table public.ringside_shows to anon, authenticated;
grant all privileges on table public.ringside_rings to anon, authenticated;
grant all privileges on table public.ringside_blocks to anon, authenticated;
grant all privileges on table public.ringside_entries to anon, authenticated;

drop policy if exists cwags_registry_authenticated_read on public.cwags_registry;
create policy cwags_registry_public_read
on public.cwags_registry
for select
to anon, authenticated
using (true);

grant all privileges on table public.cwags_registry to anon, authenticated;

commit;
