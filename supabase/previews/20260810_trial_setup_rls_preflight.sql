-- Read-only preflight for trial setup tables.
-- This script does not change database objects or data.

with table_state as (
  select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as force_rls_enabled,
    pg_get_userbyid(c.relowner) as table_owner
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('trials', 'trial_days', 'trial_classes', 'trial_rounds')
), policy_state as (
  select tablename, policyname, roles, cmd, qual, with_check
  from pg_policies
  where schemaname = 'public'
    and tablename in ('trials', 'trial_days', 'trial_classes', 'trial_rounds')
), grant_state as (
  select table_name, grantee, privilege_type
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('trials', 'trial_days', 'trial_classes', 'trial_rounds')
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
    and tc.table_name in ('trials', 'trial_days', 'trial_classes', 'trial_rounds')
)
select jsonb_build_object(
  'tables', (select coalesce(jsonb_agg(to_jsonb(ts) order by ts.table_name), '[]'::jsonb) from table_state ts),
  'policies', (select coalesce(jsonb_agg(to_jsonb(ps) order by ps.tablename, ps.policyname), '[]'::jsonb) from policy_state ps),
  'grants', (select coalesce(jsonb_agg(to_jsonb(gs) order by gs.table_name, gs.grantee, gs.privilege_type), '[]'::jsonb) from grant_state gs),
  'foreign_keys', (select coalesce(jsonb_agg(to_jsonb(fk) order by fk.table_name, fk.column_name), '[]'::jsonb) from foreign_keys fk)
) as audit;
