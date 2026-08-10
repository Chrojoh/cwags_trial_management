-- Remove unnecessary browser-role privileges from Ringside server-only tables.
-- All application access to these tables uses the service-role client in API routes.
begin;

revoke all privileges on table public.ringside_ring_secrets from anon, authenticated;
revoke all privileges on table public.ringside_actions from anon, authenticated;
revoke all privileges on table public.ringside_import_backups from anon, authenticated;

commit;

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  coalesce(p.policy_count, 0) as policy_count,
  coalesce(g.grants, 'none') as client_grants
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join (
  select tablename, count(*) as policy_count
  from pg_policies
  where schemaname = 'public'
  group by tablename
) p on p.tablename = c.relname
left join (
  select
    table_name,
    string_agg(distinct grantee || ':' || privilege_type, ', ') as grants
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated')
  group by table_name
) g on g.table_name = c.relname
where n.nspname = 'public'
  and c.relname in (
    'ringside_ring_secrets',
    'ringside_actions',
    'ringside_import_backups'
  )
order by c.relname;
