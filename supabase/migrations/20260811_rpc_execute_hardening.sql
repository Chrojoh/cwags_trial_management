-- Harden browser EXECUTE permissions on public application routines.
-- Safe for active trials: no trial, entry, score, payment, or journal rows change.
begin;

-- Public, read-only payload used by the unauthenticated entry form.
create or replace function public.get_public_trial_entry_form(p_trial_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'trial', jsonb_build_object(
      'id', t.id,
      'trial_name', t.trial_name,
      'club_name', t.club_name,
      'location', t.location,
      'start_date', t.start_date,
      'end_date', t.end_date,
      'entries_open', t.entries_open,
      'entries_close_date', t.entries_close_date,
      'entry_status', t.entry_status,
      'trial_secretary', t.trial_secretary,
      'secretary_email', t.secretary_email,
      'secretary_phone', t.secretary_phone,
      'default_entry_fee', t.default_entry_fee,
      'default_feo_price', t.default_feo_price,
      'waiver_text', t.waiver_text
    ),
    'rounds', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', tr.id,
          'round_number', tr.round_number,
          'judge_name', tr.judge_name,
          'trial_class_id', tr.trial_class_id,
          'feo_available', tr.feo_available,
          'max_entries', tr.max_entries,
          'trial_classes', jsonb_build_object(
            'class_name', tc.class_name,
            'games_subclass', tc.games_subclass,
            'trial_day_id', tc.trial_day_id,
            'class_level', tc.class_level,
            'class_type', tc.class_type,
            'entry_fee', tc.entry_fee,
            'feo_available', tc.feo_available,
            'feo_price', tc.feo_price,
            'trial_days', jsonb_build_object(
              'id', td.id,
              'trial_id', td.trial_id,
              'trial_date', td.trial_date,
              'day_number', td.day_number,
              'is_accepting_entries', td.is_accepting_entries
            )
          )
        )
        order by td.day_number, tr.round_number, tr.id
      )
      from public.trial_rounds tr
      join public.trial_classes tc on tc.id = tr.trial_class_id
      join public.trial_days td on td.id = tc.trial_day_id
      where td.trial_id = t.id
    ), '[]'::jsonb)
  )
  from public.trials t
  where t.id = p_trial_id
    and t.trial_status = 'published';
$$;

-- Older auth trigger functions were SECURITY DEFINER without a pinned path.
alter function public.handle_new_auth_user() set search_path = public, pg_temp;
alter function public.sync_auth_user() set search_path = public, pg_temp;

-- Remove direct browser access to application routines that are invoked only
-- by database triggers or server routes. PUBLIC must also be revoked because
-- anon/authenticated inherit PUBLIC privileges.
do $hardening$
declare
  routine regprocedure;
begin
  for routine in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (array[
        'accept_trial_invitation',
        'create_application_user_profile',
        'delete_trial_by_id',
        'get_next_waitlist_position',
        'get_qualified_judges',
        'handle_new_auth_user',
        'has_trial_role',
        'is_app_administrator',
        'journal_actor_name',
        'journal_entry_changes',
        'journal_score_corrections',
        'journal_selection_changes',
        'promote_waitlisted_selection',
        'protect_trial_created_by',
        'recalculate_parent_entry_summary',
        'record_entry_payment_atomic',
        'refresh_entry_payment_summary',
        'set_class_type',
        'set_entry_fee_waiver_atomic',
        'set_entry_status_atomic',
        'set_judge_volunteer_pricing_atomic',
        'set_round_capacity_atomic',
        'sync_auth_user',
        'sync_parent_entry_summary_from_selection',
        'touch_trial_collaborator_updated_at',
        'update_entry_payment_atomic',
        'update_updated_at_column',
        'uses_forward_entry_summary_model'
      ])
  loop
    execute format('revoke all on function %s from public, anon, authenticated', routine);
  end loop;
end
$hardening$;

-- Exact browser allowlist.
revoke all on function public.get_public_trial_entry_form(uuid) from public, anon, authenticated;
grant execute on function public.get_public_trial_entry_form(uuid) to anon, authenticated, service_role;

grant execute on function public.accept_trial_invitation(uuid, text) to authenticated, service_role;
grant execute on function public.has_trial_role(uuid, text[]) to authenticated, service_role;
grant execute on function public.is_app_administrator() to authenticated, service_role;

-- Server-only allowlist. These routes use the service-role client after their
-- own authentication and trial-role authorization checks.
grant execute on function public.promote_waitlisted_selection(uuid, uuid, uuid, boolean, uuid) to service_role;
grant execute on function public.recalculate_parent_entry_summary(uuid) to service_role;
grant execute on function public.record_entry_payment_atomic(uuid, uuid, numeric, text, text, timestamptz, text, uuid) to service_role;
grant execute on function public.refresh_entry_payment_summary(uuid) to service_role;
grant execute on function public.set_entry_fee_waiver_atomic(uuid, uuid[], boolean, text, uuid) to service_role;
grant execute on function public.set_entry_status_atomic(uuid, uuid, text, uuid) to service_role;
grant execute on function public.set_judge_volunteer_pricing_atomic(uuid, uuid[], boolean, numeric, numeric, uuid) to service_role;
grant execute on function public.set_round_capacity_atomic(uuid, uuid, integer, uuid) to service_role;
grant execute on function public.update_entry_payment_atomic(uuid, uuid, numeric, text, text, timestamptz, text, uuid) to service_role;
grant execute on function public.uses_forward_entry_summary_model(uuid) to service_role;

commit;

-- Verification only.
select
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
  and p.proname = any (array[
    'get_public_trial_entry_form',
    'accept_trial_invitation',
    'has_trial_role',
    'is_app_administrator',
    'promote_waitlisted_selection',
    'record_entry_payment_atomic',
    'set_entry_fee_waiver_atomic',
    'set_entry_status_atomic',
    'set_judge_volunteer_pricing_atomic',
    'set_round_capacity_atomic',
    'update_entry_payment_atomic',
    'handle_new_auth_user',
    'sync_auth_user'
  ])
order by p.proname, arguments;
