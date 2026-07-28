-- Eligibility is explicit and stable:
--   * the designated testing trial opts in regardless of its dates;
--   * the live July/August trial is permanently excluded;
--   * all other trials opt in when their start date is August 8, 2026 or later.
create or replace function public.uses_forward_entry_summary_model(p_trial_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_trial_id = 'b1fb0120-da94-43f3-a561-fe12e7d663a4'::uuid then false
    when p_trial_id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid then true
    else exists (
      select 1
      from public.trials t
      where t.id = p_trial_id
        and t.start_date >= date '2026-08-08'
    )
  end;
$$;

create or replace function public.recalculate_parent_entry_summary(p_entry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trial_id uuid;
  v_current_status text;
  v_parent_status text;
  v_total_count integer;
  v_active_count integer;
  v_waitlisted_count integer;
  v_total_fee numeric;
  v_amount_paid numeric;
  v_amount_owed numeric;
  v_fees_waived boolean;
begin
  select trial_id, entry_status, coalesce(amount_paid, 0), coalesce(fees_waived, false)
    into v_trial_id, v_current_status, v_amount_paid, v_fees_waived
  from public.entries
  where id = p_entry_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ENTRY_NOT_FOUND';
  end if;

  if not public.uses_forward_entry_summary_model(v_trial_id) then
    return jsonb_build_object(
      'entryId', p_entry_id,
      'entryStatus', v_current_status,
      'excluded', true,
      'reason', 'TRIAL_USES_LEGACY_ENTRY_SUMMARY_MODEL'
    );
  end if;

  select count(*),
         count(*) filter (
           where lower(coalesce(entry_status, '')) <> 'withdrawn'
         ),
         count(*) filter (
           where lower(coalesce(entry_status, '')) = 'waitlisted'
         ),
         coalesce(sum(fee) filter (
           where lower(coalesce(entry_status, '')) not in ('waitlisted', 'withdrawn')
         ), 0)
    into v_total_count, v_active_count, v_waitlisted_count, v_total_fee
  from public.entry_selections
  where entry_id = p_entry_id;

  v_parent_status := case
    when v_total_count = 0 then v_current_status
    when v_active_count = 0 then 'withdrawn'
    when lower(coalesce(v_current_status, '')) = 'no_show' then v_current_status
    -- Waitlisted is selection-level state and is not copied to the parent.
    when v_active_count = v_waitlisted_count then
      case
        when lower(coalesce(v_current_status, '')) in ('submitted', 'confirmed')
          then lower(v_current_status)
        else 'submitted'
      end
    when lower(coalesce(v_current_status, '')) in ('submitted', 'confirmed') then v_current_status
    else 'confirmed'
  end;

  v_amount_owed := case when v_fees_waived then v_amount_paid else v_total_fee end;

  update public.entries
     set entry_status = v_parent_status,
         total_fee = v_total_fee,
         amount_owed = v_amount_owed
   where id = p_entry_id;

  return jsonb_build_object(
    'entryId', p_entry_id,
    'entryStatus', v_parent_status,
    'totalFee', v_total_fee,
    'amountOwed', v_amount_owed
  );
end;
$$;

create or replace function public.set_entry_status_atomic(
  p_trial_id uuid,
  p_entry_id uuid,
  p_status text,
  p_changed_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_status text;
  v_result jsonb;
  v_user_name text := 'Administrator';
  v_handler_name text;
  v_dog_call_name text;
  v_cwags_number text;
begin
  if not public.uses_forward_entry_summary_model(p_trial_id) then
    raise exception using
      errcode = 'P0001',
      message = 'TRIAL_USES_LEGACY_ENTRY_SUMMARY_MODEL';
  end if;

  if lower(coalesce(p_status, '')) not in ('confirmed', 'waitlisted', 'withdrawn') then
    raise exception using errcode = 'P0001', message = 'INVALID_ENTRY_STATUS';
  end if;

  select entry_status, handler_name, dog_call_name, cwags_number
    into v_previous_status, v_handler_name, v_dog_call_name, v_cwags_number
  from public.entries
  where id = p_entry_id and trial_id = p_trial_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ENTRY_NOT_FOUND';
  end if;

  if p_status in ('waitlisted', 'withdrawn') then
    update public.entry_selections
       set entry_status = p_status,
           running_position = null
     where entry_id = p_entry_id
       and lower(coalesce(entry_status, '')) <> 'withdrawn';
  else
    update public.entries set entry_status = 'confirmed' where id = p_entry_id;
  end if;

  v_result := public.recalculate_parent_entry_summary(p_entry_id);

  if p_changed_by is not null then
    select nullif(trim(concat_ws(' ', first_name, last_name)), '')
      into v_user_name
    from public.users
    where id = p_changed_by;
    v_user_name := coalesce(v_user_name, 'Administrator');
  end if;

  insert into public.trial_activity_log (
    trial_id, activity_type, entry_id, snapshot_data, user_id, user_name
  ) values (
    p_trial_id,
    'entry_status_changed',
    p_entry_id,
    jsonb_build_object(
      'handler_name', v_handler_name,
      'dog_call_name', v_dog_call_name,
      'cwags_number', v_cwags_number,
      'previous_status', v_previous_status,
      'requested_status', p_status,
      'resulting_status', v_result ->> 'entryStatus',
      'total_fee', v_result -> 'totalFee',
      'amount_owed', v_result -> 'amountOwed'
    ),
    p_changed_by,
    v_user_name
  );

  return v_result;
end;
$$;

revoke all on function public.uses_forward_entry_summary_model(uuid) from public;
revoke all on function public.recalculate_parent_entry_summary(uuid) from public;
revoke all on function public.set_entry_status_atomic(uuid, uuid, text, uuid) from public;
grant execute on function public.uses_forward_entry_summary_model(uuid) to service_role;
grant execute on function public.recalculate_parent_entry_summary(uuid) to service_role;
grant execute on function public.set_entry_status_atomic(uuid, uuid, text, uuid) to service_role;

create or replace function public.sync_parent_entry_summary_from_selection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_parent_entry_summary(old.entry_id);
    return old;
  end if;

  perform public.recalculate_parent_entry_summary(new.entry_id);
  if tg_op = 'UPDATE' and old.entry_id is distinct from new.entry_id then
    perform public.recalculate_parent_entry_summary(old.entry_id);
  end if;
  return new;
end;
$$;

-- Install the trigger without replacing an existing trigger and without
-- recalculating historical entries. Existing data remains unchanged; these
-- rules take effect only for selection writes made after this migration.
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'sync_parent_entry_summary'
      and tgrelid = 'public.entry_selections'::regclass
      and not tgisinternal
  ) then
    execute $trigger$
      create constraint trigger sync_parent_entry_summary
      after insert or delete or update of entry_id, entry_status, fee
      on public.entry_selections
      deferrable initially deferred
      for each row
      execute function public.sync_parent_entry_summary_from_selection()
    $trigger$;
  end if;
end;
$$;
