-- Finalize browser privileges for public-display and registry tables.
-- Ringside display data remains publicly readable for display/Realtime clients.
-- The complete registry is no longer directly readable by anonymous clients;
-- public entry workflows use the validated server API routes instead.

begin;

-- Public Ringside state needs SELECT only. Mutations are performed by API routes
-- using the service role after administrator/secretary/session authorization.
revoke all privileges on table public.ringside_shows from anon, authenticated;
revoke all privileges on table public.ringside_rings from anon, authenticated;
revoke all privileges on table public.ringside_blocks from anon, authenticated;
revoke all privileges on table public.ringside_entries from anon, authenticated;

grant select on table public.ringside_shows to anon, authenticated;
grant select on table public.ringside_rings to anon, authenticated;
grant select on table public.ringside_blocks to anon, authenticated;
grant select on table public.ringside_entries to anon, authenticated;

-- Replace the broad public registry policy with authenticated read access.
drop policy if exists cwags_registry_public_read on public.cwags_registry;
create policy cwags_registry_authenticated_read
on public.cwags_registry
for select
to authenticated
using (true);

revoke all privileges on table public.cwags_registry from anon, authenticated;
grant select on table public.cwags_registry to authenticated;

-- Registry mutation remains administrator-only through existing RLS policies.
grant insert, update, delete on table public.cwags_registry to authenticated;

commit;

-- Verification result.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  coalesce(
    string_agg(
      distinct g.grantee || ':' || g.privilege_type,
      ', ' order by g.grantee || ':' || g.privilege_type
    ),
    'none'
  ) as client_grants,
  array_remove(array_agg(distinct p.policyname order by p.policyname), null) as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join information_schema.role_table_grants g
  on g.table_schema = n.nspname
 and g.table_name = c.relname
 and g.grantee in ('anon', 'authenticated')
left join pg_policies p
  on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relname in (
    'cwags_registry',
    'ringside_shows',
    'ringside_rings',
    'ringside_blocks',
    'ringside_entries'
  )
group by c.relname, c.relrowsecurity
order by c.relname;
