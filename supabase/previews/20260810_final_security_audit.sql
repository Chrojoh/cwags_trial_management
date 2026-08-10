-- FINAL SECURITY AUDIT — READ ONLY
-- Safe to run while trials are active. This script changes no data, grants,
-- policies, functions, or schema objects.

-- 1. Public tables, RLS state, client grants, and policy count.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls,
  count(distinct p.policyname) as policy_count,
  coalesce(
    string_agg(
      distinct g.grantee || ':' || g.privilege_type,
      ', ' order by g.grantee || ':' || g.privilege_type
    ),
    'none'
  ) as client_grants
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p
  on p.schemaname = n.nspname and p.tablename = c.relname
left join information_schema.role_table_grants g
  on g.table_schema = n.nspname
 and g.table_name = c.relname
 and g.grantee in ('anon', 'authenticated')
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
group by c.relname, c.relrowsecurity, c.relforcerowsecurity
order by c.relname;

-- 2. Full policy definitions. Review any policy using `true`, role `public`,
-- or broad ALL access with particular care.
select
  tablename,
  policyname,
  roles,
  cmd,
  permissive,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3. Anonymous/authenticated table privileges. RLS still applies when enabled,
-- but unexpected DELETE/TRUNCATE/TRIGGER/REFERENCES grants should be removed.
select
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
group by table_name, grantee
order by table_name, grantee;

-- 4. Public-schema routines executable by browser roles. SECURITY DEFINER
-- routines require explicit authorization and a safe search_path.
select
  n.nspname as routine_schema,
  p.proname as routine_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.proconfig as function_settings,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    has_function_privilege('anon', p.oid, 'EXECUTE')
    or has_function_privilege('authenticated', p.oid, 'EXECUTE')
  )
order by p.proname, arguments;

-- 5. Public views and their security options.
select
  c.relname as view_name,
  c.reloptions as security_options,
  pg_get_userbyid(c.relowner) as owner
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('v', 'm')
order by c.relname;

-- 6. Tables published through Supabase Realtime.
select
  pubname as publication,
  schemaname,
  tablename
from pg_publication_tables
where schemaname = 'public'
order by pubname, tablename;

-- 7. High-level findings that require attention before declaring the audit done.
with public_tables as (
  select c.relname, c.relrowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
), risky_grants as (
  select distinct table_name, grantee, privilege_type
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')
), broad_policies as (
  select tablename, policyname
  from pg_policies
  where schemaname = 'public'
    and (
      'public' = any(roles)
      or coalesce(qual, '') in ('true', '(true)')
      or coalesce(with_check, '') in ('true', '(true)')
    )
)
select 'RLS_DISABLED' as finding, relname as object_name, null::text as detail
from public_tables
where not relrowsecurity
union all
select
  'RISKY_CLIENT_GRANT',
  table_name,
  grantee || ':' || privilege_type
from risky_grants
union all
select 'BROAD_POLICY', tablename, policyname
from broad_policies
order by finding, object_name, detail;
