-- Read-only verification after installing both 20260925 migrations.
-- Safe to run after the active trial is complete. This script changes no data.

with expected_functions(name, identity_arguments) as (
  values
    ('record_handler_payment_atomic', 'p_trial_id uuid, p_entry_ids uuid[], p_amount numeric, p_payment_method text, p_payment_received_by text, p_payment_date timestamp with time zone, p_notes text, p_recorded_by uuid'),
    ('update_handler_payment_atomic', 'p_trial_id uuid, p_entry_ids uuid[], p_transaction_id uuid, p_amount numeric, p_payment_method text, p_payment_received_by text, p_payment_date timestamp with time zone, p_notes text, p_changed_by uuid'),
    ('rehome_deleted_entry_payments', 'p_trial_id uuid, p_entry_ids uuid[]'),
    ('journal_selection_deletions', '')
), function_audit as (
  select
    expected.name,
    p.oid is not null as installed,
    coalesce(p.prosecdef, false) as security_definer,
    coalesce(has_function_privilege('anon', p.oid, 'execute'), false) as anon_execute,
    coalesce(has_function_privilege('authenticated', p.oid, 'execute'), false) as authenticated_execute,
    coalesce(has_function_privilege('service_role', p.oid, 'execute'), false) as service_execute
  from expected_functions expected
  left join pg_proc p
    on p.proname = expected.name
   and p.pronamespace = 'public'::regnamespace
   and pg_get_function_identity_arguments(p.oid) = expected.identity_arguments
), trigger_audit as (
  select exists (
    select 1
    from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table = 'entry_selections'
      and trigger_name = 'journal_selection_deletions_trigger'
      and event_manipulation = 'DELETE'
      and action_timing = 'AFTER'
  ) as installed
), payment_reconciliation as (
  select
    count(*) filter (
      where abs(coalesce(e.amount_paid, 0) - coalesce(p.net_paid, 0)) > 0.005
    ) as mismatched_entry_summaries,
    count(*) filter (where e.id is null) as orphaned_payment_entry_groups
  from (
    select entry_id, sum(amount) as net_paid
    from public.entry_payment_transactions
    group by entry_id
  ) p
  full join public.entries e on e.id = p.entry_id
  where p.entry_id is not null or coalesce(e.amount_paid, 0) <> 0
), duplicate_positions as (
  select count(*) as duplicate_running_positions
  from (
    select trial_round_id, running_position
    from public.entry_selections
    where running_position is not null
      and lower(coalesce(entry_status, '')) not in ('waitlisted', 'withdrawn')
    group by trial_round_id, running_position
    having count(*) > 1
  ) duplicates
)
select jsonb_pretty(jsonb_build_object(
  'functions', (select jsonb_agg(to_jsonb(function_audit) order by name) from function_audit),
  'journal_delete_trigger', (select installed from trigger_audit),
  'payment_reconciliation', (select to_jsonb(payment_reconciliation) from payment_reconciliation),
  'running_order', (select to_jsonb(duplicate_positions) from duplicate_positions),
  'expected_result', 'All functions and trigger installed; anon/authenticated execute false; service execute true; mismatch/orphan/duplicate counts zero.'
)) as audit;
