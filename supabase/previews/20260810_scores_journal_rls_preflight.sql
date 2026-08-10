-- Read-only preflight for the second coordinated RLS stage.
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
    and c.relname in ('scores', 'trial_activity_log')
), policy_state as (
  select tablename, policyname, roles, cmd, qual, with_check
  from pg_policies
  where schemaname = 'public'
    and tablename in ('scores', 'trial_activity_log')
), grant_state as (
  select table_name, grantee, privilege_type
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('scores', 'trial_activity_log')
    and grantee in ('anon', 'authenticated', 'service_role')
), trigger_state as (
  select
    t.tgname as trigger_name,
    c.relname as attached_table,
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
    and c.relname in ('scores', 'trial_activity_log')
)
select jsonb_build_object(
  'tables', (select coalesce(jsonb_agg(to_jsonb(ts) order by ts.table_name), '[]'::jsonb) from table_state ts),
  'policies', (select coalesce(jsonb_agg(to_jsonb(ps) order by ps.tablename, ps.policyname), '[]'::jsonb) from policy_state ps),
  'grants', (select coalesce(jsonb_agg(to_jsonb(gs) order by gs.table_name, gs.grantee, gs.privilege_type), '[]'::jsonb) from grant_state gs),
  'triggers', (select coalesce(jsonb_agg(to_jsonb(ts) order by ts.attached_table, ts.trigger_name), '[]'::jsonb) from trigger_state ts)
) as audit;
