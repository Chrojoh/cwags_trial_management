-- Read-only post-install verification for 20261022180539_optimize_ringside_actions.sql.
-- Expected: one row; security_definer=false; public/anon/authenticated=false;
-- service_role=true; request/result columns=true; replica_identity=f for all three tables.

with routine as (
  select
    p.oid,
    p.prosecdef as security_definer,
    has_function_privilege('anon', p.oid, 'execute') as anon_execute,
    has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
    has_function_privilege('service_role', p.oid, 'execute') as service_execute
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'apply_ringside_secretary_action'
), columns_ready as (
  select count(*) = 2 as ready
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'ringside_actions'
    and column_name in ('request_key', 'result')
), identities as (
  select jsonb_object_agg(c.relname, c.relreplident) as values
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('ringside_rings', 'ringside_blocks', 'ringside_entries')
)
select jsonb_build_object(
  'installed', exists(select 1 from routine),
  'security_definer', (select security_definer from routine),
  'anon_execute', (select anon_execute from routine),
  'authenticated_execute', (select authenticated_execute from routine),
  'service_execute', (select service_execute from routine),
  'idempotency_columns', (select ready from columns_ready),
  'replica_identity', (select values from identities)
) as ringside_latency_audit;
