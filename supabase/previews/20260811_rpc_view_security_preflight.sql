-- RPC AND VIEW SECURITY PREFLIGHT - READ ONLY
-- Safe while trials are active. This script changes no data, privileges,
-- policies, routines, views, or schema objects.

with routine_inventory as (
  select
    p.oid,
    p.proname as routine_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.prosecdef as security_definer,
    p.proconfig as settings,
    has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
    has_function_privilege('service_role', p.oid, 'EXECUTE') as service_execute
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
), expected_browser_rpc as (
  select * from (values
    ('get_public_trial_entry_form', true, true),
    ('accept_trial_invitation', false, true),
    ('has_trial_role', false, true),
    ('is_app_administrator', false, true)
  ) as allowed(routine_name, allow_anon, allow_authenticated)
), unexpected_browser_execute as (
  select
    r.routine_name,
    r.arguments,
    r.security_definer,
    r.settings,
    r.anon_execute,
    r.authenticated_execute,
    case
      when r.anon_execute and not coalesce(e.allow_anon, false)
        then 'anonymous EXECUTE is not required by the application'
      when r.authenticated_execute and not coalesce(e.allow_authenticated, false)
        then 'authenticated EXECUTE is not required by the application'
      else 'review'
    end as finding
  from routine_inventory r
  left join expected_browser_rpc e on e.routine_name = r.routine_name
  where
    (r.anon_execute and not coalesce(e.allow_anon, false))
    or (r.authenticated_execute and not coalesce(e.allow_authenticated, false))
), expected_access_mismatch as (
  select
    r.routine_name,
    r.arguments,
    r.anon_execute,
    r.authenticated_execute,
    e.allow_anon,
    e.allow_authenticated
  from expected_browser_rpc e
  left join routine_inventory r on r.routine_name = e.routine_name
  where r.oid is null
     or r.anon_execute is distinct from e.allow_anon
     or r.authenticated_execute is distinct from e.allow_authenticated
), definer_without_search_path as (
  select
    routine_name,
    arguments,
    settings
  from routine_inventory
  where security_definer
    and not exists (
      select 1
      from unnest(coalesce(settings, '{}'::text[])) setting
      where setting like 'search_path=%'
    )
), view_inventory as (
  select
    c.relname as view_name,
    case
      when c.relkind = 'm' then 'materialized view'
      else 'view'
    end as view_type,
    c.reloptions as security_options,
    has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
    has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('v', 'm')
), realtime_inventory as (
  select pubname, schemaname, tablename
  from pg_publication_tables
  where schemaname = 'public'
)
select jsonb_build_object(
  'unexpected_browser_execute', coalesce(
    (select jsonb_agg(to_jsonb(x) order by x.routine_name, x.arguments)
     from unexpected_browser_execute x),
    '[]'::jsonb
  ),
  'expected_access_mismatch', coalesce(
    (select jsonb_agg(to_jsonb(x) order by x.routine_name, x.arguments)
     from expected_access_mismatch x),
    '[]'::jsonb
  ),
  'security_definer_without_safe_search_path', coalesce(
    (select jsonb_agg(to_jsonb(x) order by x.routine_name, x.arguments)
     from definer_without_search_path x),
    '[]'::jsonb
  ),
  'public_views', coalesce(
    (select jsonb_agg(to_jsonb(x) order by x.view_name)
     from view_inventory x),
    '[]'::jsonb
  ),
  'realtime_tables', coalesce(
    (select jsonb_agg(to_jsonb(x) order by x.tablename)
     from realtime_inventory x),
    '[]'::jsonb
  )
) as audit;
