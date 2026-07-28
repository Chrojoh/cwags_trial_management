-- Prepared migration: install before enabling the Live Event capacity editor.
-- Updates and journalling occur atomically; no historical rows are backfilled.

create or replace function public.set_round_capacity_atomic(
  p_trial_id uuid,
  p_round_id uuid,
  p_max_entries integer,
  p_changed_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity_before integer;
  v_active_count integer;
  v_waitlisted_count integer;
  v_class_name text;
  v_round_number integer;
  v_user_name text := 'Administrator';
begin
  if p_max_entries < 1 then
    raise exception using errcode = 'P0001', message = 'INVALID_CAPACITY';
  end if;

  select coalesce(tr.max_entries, tc.max_entries, 0), tc.class_name, tr.round_number
    into v_capacity_before, v_class_name, v_round_number
  from public.trial_rounds tr
  join public.trial_classes tc on tc.id = tr.trial_class_id
  join public.trial_days td on td.id = tc.trial_day_id
  where tr.id = p_round_id and td.trial_id = p_trial_id
  for update of tr;

  if not found then
    raise exception using errcode = 'P0001', message = 'ROUND_NOT_FOUND';
  end if;

  select
    count(*) filter (
      where lower(coalesce(entry_status, '')) not in ('waitlisted', 'withdrawn')
    ),
    count(*) filter (
      where lower(coalesce(entry_status, '')) = 'waitlisted'
    )
    into v_active_count, v_waitlisted_count
  from public.entry_selections
  where trial_round_id = p_round_id;

  if p_max_entries < v_active_count then
    raise exception using
      errcode = 'P0001',
      message = 'CAPACITY_BELOW_ACTIVE_COUNT',
      detail = format('Requested %s; active selections %s', p_max_entries, v_active_count);
  end if;

  update public.trial_rounds
     set max_entries = p_max_entries
   where id = p_round_id;

  if p_changed_by is not null then
    select nullif(trim(concat_ws(' ', first_name, last_name)), '')
      into v_user_name
    from public.users
    where id = p_changed_by;
    v_user_name := coalesce(v_user_name, 'Administrator');
  end if;

  insert into public.trial_activity_log (
    trial_id, activity_type, snapshot_data, user_id, user_name
  ) values (
    p_trial_id,
    'capacity_changed',
    jsonb_build_object(
      'trial_round_id', p_round_id,
      'class_name', v_class_name,
      'round_number', v_round_number,
      'capacity_before', v_capacity_before,
      'capacity_after', p_max_entries,
      'active_entries', v_active_count,
      'waitlisted_entries', v_waitlisted_count
    ),
    p_changed_by,
    v_user_name
  );

  return jsonb_build_object(
    'trialRoundId', p_round_id,
    'className', v_class_name,
    'roundNumber', v_round_number,
    'capacityBefore', v_capacity_before,
    'capacityAfter', p_max_entries,
    'activeEntries', v_active_count,
    'waitlistedEntries', v_waitlisted_count
  );
end;
$$;

revoke all on function public.set_round_capacity_atomic(uuid, uuid, integer, uuid) from public;
grant execute on function public.set_round_capacity_atomic(uuid, uuid, integer, uuid) to service_role;

