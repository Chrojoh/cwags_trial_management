-- Read-only preflight for remaining identity, judge, configuration, and legacy
-- user tables. This script does not change database objects or data.

with target_tables(table_name) as (
  values
    ('users'::text),
    ('judges'::text),
    ('judging_history'::text),
    ('system_config'::text),
    ('users_backup_broken'::text)
), table_state as (
  select
    target.table_name,
    c.oid is not null as table_exists,
    coalesce(c.relrowsecurity, false) as rls_enabled,
    coalesce(c.relforcerowsecurity, false) as force_rls_enabled,
    case when c.oid is null then null else pg_get_userbyid(c.relowner) end as table_owner,
    case when c.oid is null then null else c.reltuples::bigint end as estimated_rows
  from target_tables target
  left join pg_namespace n on n.nspname = 'public'
  left join pg_class c on c.relnamespace = n.oid
    and c.relname = target.table_name
    and c.relkind in ('r', 'p')
), policy_state as (
  select tablename, policyname, roles, cmd, qual, with_check
  from pg_policies
  where schemaname = 'public'
    and tablename in (select table_name from target_tables)
), grant_state as (
  select table_name, grantee, privilege_type
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (select table_name from target_tables)
    and grantee in ('anon', 'authenticated', 'service_role')
), foreign_keys as (
  select
    tc.table_name,
    kcu.column_name,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column,
    rc.delete_rule,
    rc.update_rule
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on kcu.constraint_name = tc.constraint_name
   and kcu.constraint_schema = tc.constraint_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
   and ccu.constraint_schema = tc.constraint_schema
  join information_schema.referential_constraints rc
    on rc.constraint_name = tc.constraint_name
   and rc.constraint_schema = tc.constraint_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
    and tc.table_name in (select table_name from target_tables)
), triggers as (
  select
    c.relname as table_name,
    t.tgname as trigger_name,
    p.proname as function_name,
    p.prosecdef as security_definer,
    pg_get_userbyid(p.proowner) as function_owner,
    t.tgenabled as trigger_enabled
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  where not t.tgisinternal
    and n.nspname = 'public'
    and c.relname in (select table_name from target_tables)
)
select jsonb_build_object(
  'tables', (select coalesce(jsonb_agg(to_jsonb(ts) order by ts.table_name), '[]'::jsonb) from table_state ts),
  'policies', (select coalesce(jsonb_agg(to_jsonb(ps) order by ps.tablename, ps.policyname), '[]'::jsonb) from policy_state ps),
  'grants', (select coalesce(jsonb_agg(to_jsonb(gs) order by gs.table_name, gs.grantee, gs.privilege_type), '[]'::jsonb) from grant_state gs),
  'foreign_keys', (select coalesce(jsonb_agg(to_jsonb(fk) order by fk.table_name, fk.column_name), '[]'::jsonb) from foreign_keys fk),
  'triggers', (select coalesce(jsonb_agg(to_jsonb(t) order by t.table_name, t.trigger_name), '[]'::jsonb) from triggers t)
) as audit;
