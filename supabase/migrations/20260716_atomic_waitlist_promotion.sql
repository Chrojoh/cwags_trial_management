create or replace function public.promote_waitlisted_selection(
  p_trial_id uuid,
  p_entry_id uuid,
  p_selection_id uuid,
  p_increase_capacity boolean default false,
  p_promoted_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round_id uuid;
  v_round_number integer;
  v_class_name text;
  v_round_capacity integer;
  v_class_capacity integer;
  v_capacity_before integer;
  v_capacity_after integer;
  v_capacity_increased boolean := false;
  v_active_count integer;
  v_next_position integer;
  v_fee numeric := 0;
  v_entry_status text;
  v_selection_status text;
  v_fees_waived boolean := false;
  v_amount_paid numeric := 0;
  v_total_fee_before numeric := 0;
  v_total_fee_after numeric := 0;
  v_amount_owed numeric := 0;
  v_handler_name text;
  v_dog_call_name text;
  v_cwags_number text;
  v_user_name text := 'Administrator';
begin
  select es.trial_round_id
    into v_round_id
  from public.entry_selections es
  join public.entries e on e.id = es.entry_id
  where es.id = p_selection_id
    and es.entry_id = p_entry_id
    and e.trial_id = p_trial_id;

  if v_round_id is null then
    raise exception using errcode = 'P0001', message = 'WAITLIST_SELECTION_NOT_FOUND';
  end if;

  -- Serialize every promotion for this round. The selection and parent entry are
  -- then row-locked so a second request cannot promote the same record twice.
  perform pg_advisory_xact_lock(hashtextextended(v_round_id::text, 0));

  select es.entry_status,
         es.fee,
         e.entry_status,
         coalesce(e.fees_waived, false),
         coalesce(e.amount_paid, 0),
         coalesce(e.total_fee, 0),
         e.handler_name,
         e.dog_call_name,
         e.cwags_number,
         tr.round_number,
         tr.max_entries,
         tc.max_entries,
         tc.class_name
    into v_selection_status,
         v_fee,
         v_entry_status,
         v_fees_waived,
         v_amount_paid,
         v_total_fee_before,
         v_handler_name,
         v_dog_call_name,
         v_cwags_number,
         v_round_number,
         v_round_capacity,
         v_class_capacity,
         v_class_name
  from public.entry_selections es
  join public.entries e on e.id = es.entry_id
  join public.trial_rounds tr on tr.id = es.trial_round_id
  join public.trial_classes tc on tc.id = tr.trial_class_id
  where es.id = p_selection_id
    and es.entry_id = p_entry_id
    and e.trial_id = p_trial_id
  for update of es, e, tr;

  if not found then
    raise exception using errcode = 'P0001', message = 'WAITLIST_SELECTION_NOT_FOUND';
  end if;

  if lower(coalesce(v_selection_status, '')) <> 'waitlisted' then
    raise exception using errcode = 'P0001', message = 'SELECTION_ALREADY_PROMOTED';
  end if;

  select count(*)
    into v_active_count
  from public.entry_selections
  where trial_round_id = v_round_id
    and lower(coalesce(entry_status, '')) not in ('waitlisted', 'withdrawn');

  v_capacity_before := coalesce(v_round_capacity, v_class_capacity, 0);
  v_capacity_after := v_capacity_before;

  if v_capacity_before > 0 and v_active_count >= v_capacity_before then
    if not p_increase_capacity then
      raise exception using errcode = 'P0001', message = 'ROUND_FULL';
    end if;

    v_capacity_after := greatest(v_capacity_before + 1, v_active_count + 1);
    update public.trial_rounds
       set max_entries = v_capacity_after
     where id = v_round_id;
    v_capacity_increased := true;
  end if;

  select coalesce(max(running_position), 0) + 1
    into v_next_position
  from public.entry_selections
  where trial_round_id = v_round_id
    and running_position is not null
    and lower(coalesce(entry_status, '')) not in ('waitlisted', 'withdrawn');

  update public.entry_selections
     set entry_status = 'entered',
         running_position = v_next_position
   where id = p_selection_id
     and entry_id = p_entry_id
     and lower(coalesce(entry_status, '')) = 'waitlisted';

  if not found then
    raise exception using errcode = 'P0001', message = 'SELECTION_ALREADY_PROMOTED';
  end if;

  select coalesce(sum(fee), 0)
    into v_total_fee_after
  from public.entry_selections
  where entry_id = p_entry_id
    and lower(coalesce(entry_status, '')) not in ('waitlisted', 'withdrawn');

  v_amount_owed := case when v_fees_waived then v_amount_paid else v_total_fee_after end;

  update public.entries
     set total_fee = v_total_fee_after,
         amount_owed = v_amount_owed,
         entry_status = case
           when lower(coalesce(entry_status, '')) = 'waitlisted' then 'confirmed'
           else entry_status
         end
   where id = p_entry_id
     and trial_id = p_trial_id;

  if p_promoted_by is not null then
    select nullif(trim(concat_ws(' ', first_name, last_name)), '')
      into v_user_name
    from public.users
    where id = p_promoted_by;
    v_user_name := coalesce(v_user_name, 'Administrator');
  end if;

  insert into public.trial_activity_log (
    trial_id, activity_type, entry_id, snapshot_data, user_id, user_name
  ) values (
    p_trial_id,
    'waitlist_promoted',
    p_entry_id,
    jsonb_build_object(
      'selection_id', p_selection_id,
      'trial_round_id', v_round_id,
      'handler_name', v_handler_name,
      'dog_call_name', v_dog_call_name,
      'cwags_number', v_cwags_number,
      'class_name', v_class_name,
      'round', v_round_number,
      'running_position', v_next_position,
      'fee_added', v_fee,
      'total_fee_before', v_total_fee_before,
      'total_fee_after', v_total_fee_after,
      'capacity_increased', v_capacity_increased,
      'capacity_before', v_capacity_before,
      'capacity_after', v_capacity_after,
      'promoted_by', p_promoted_by
    ),
    p_promoted_by,
    v_user_name
  );

  return jsonb_build_object(
    'selectionId', p_selection_id,
    'entryId', p_entry_id,
    'runningPosition', v_next_position,
    'totalFee', v_total_fee_after,
    'amountOwed', v_amount_owed,
    'capacityIncreased', v_capacity_increased,
    'capacityBefore', v_capacity_before,
    'capacityAfter', v_capacity_after
  );
end;
$$;

revoke all on function public.promote_waitlisted_selection(uuid, uuid, uuid, boolean, uuid) from public;
grant execute on function public.promote_waitlisted_selection(uuid, uuid, uuid, boolean, uuid) to service_role;

create index if not exists entry_selections_round_status_position_idx
  on public.entry_selections (trial_round_id, entry_status, running_position);

create index if not exists entry_selections_entry_status_idx
  on public.entry_selections (entry_id, entry_status);
