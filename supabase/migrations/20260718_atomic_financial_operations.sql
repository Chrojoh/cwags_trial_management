-- PREPARED ONLY: do not apply until the active trial is complete and this
-- migration has been validated in a separate Supabase test environment.

create or replace function public.refresh_entry_payment_summary(p_entry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount_paid numeric;
  v_amount_owed numeric;
  v_fees_waived boolean;
  v_payment_status text;
begin
  select coalesce(amount_owed, 0), coalesce(fees_waived, false)
    into v_amount_owed, v_fees_waived
  from public.entries
  where id = p_entry_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ENTRY_NOT_FOUND';
  end if;

  select coalesce(sum(amount), 0)
    into v_amount_paid
  from public.entry_payment_transactions
  where entry_id = p_entry_id;

  v_payment_status := case
    when v_fees_waived then 'waived'
    when v_amount_owed - v_amount_paid < -0.005 then 'overpaid'
    when v_amount_owed - v_amount_paid <= 0.005 then 'paid'
    else 'pending'
  end;

  update public.entries
     set amount_paid = v_amount_paid,
         payment_status = v_payment_status
   where id = p_entry_id;

  return jsonb_build_object(
    'entryId', p_entry_id,
    'amountOwed', v_amount_owed,
    'amountPaid', v_amount_paid,
    'balance', case when v_fees_waived then 0 else v_amount_owed - v_amount_paid end,
    'paymentStatus', v_payment_status
  );
end;
$$;

create or replace function public.record_entry_payment_atomic(
  p_trial_id uuid,
  p_entry_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_payment_received_by text,
  p_payment_date timestamptz,
  p_notes text default null,
  p_recorded_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction public.entry_payment_transactions%rowtype;
  v_summary jsonb;
  v_current_paid numeric;
  v_handler_name text;
  v_dog_call_name text;
  v_user_name text := 'Administrator';
begin
  if p_amount = 0 then
    raise exception using errcode = 'P0001', message = 'PAYMENT_AMOUNT_CANNOT_BE_ZERO';
  end if;

  select e.handler_name, e.dog_call_name
    into v_handler_name, v_dog_call_name
  from public.entries e
  where e.id = p_entry_id and e.trial_id = p_trial_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ENTRY_NOT_FOUND';
  end if;

  select coalesce(sum(amount), 0)
    into v_current_paid
  from public.entry_payment_transactions
  where entry_id = p_entry_id;

  if p_amount < 0 and v_current_paid + p_amount < -0.005 then
    raise exception using errcode = 'P0001', message = 'REFUND_EXCEEDS_NET_PAYMENTS';
  end if;

  insert into public.entry_payment_transactions (
    entry_id, amount, payment_method, payment_received_by, payment_date, notes
  ) values (
    p_entry_id, p_amount, p_payment_method, p_payment_received_by,
    coalesce(p_payment_date, now()), p_notes
  ) returning * into v_transaction;

  v_summary := public.refresh_entry_payment_summary(p_entry_id);

  if p_recorded_by is not null then
    select nullif(trim(concat_ws(' ', first_name, last_name)), '')
      into v_user_name
    from public.users where id = p_recorded_by;
    v_user_name := coalesce(v_user_name, 'Administrator');
  end if;

  insert into public.trial_activity_log (
    trial_id, activity_type, entry_id, snapshot_data, user_id, user_name
  ) values (
    p_trial_id,
    case when p_amount < 0 then 'refund_processed' else 'payment_received' end,
    p_entry_id,
    jsonb_build_object(
      'handler_name', v_handler_name,
      'dog_call_name', v_dog_call_name,
      'transaction_id', v_transaction.id,
      'amount', p_amount,
      'payment_method', p_payment_method,
      'payment_received_by', p_payment_received_by,
      'payment_date', p_payment_date,
      'notes', p_notes,
      'financial_status', v_summary
    ),
    p_recorded_by,
    v_user_name
  );

  return jsonb_build_object('transaction', to_jsonb(v_transaction), 'summary', v_summary);
end;
$$;

create or replace function public.update_entry_payment_atomic(
  p_trial_id uuid,
  p_transaction_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_payment_received_by text,
  p_payment_date timestamptz,
  p_notes text default null,
  p_changed_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.entry_payment_transactions%rowtype;
  v_after public.entry_payment_transactions%rowtype;
  v_summary jsonb;
  v_other_payments numeric;
  v_user_name text := 'Administrator';
begin
  if p_amount = 0 then
    raise exception using errcode = 'P0001', message = 'PAYMENT_AMOUNT_CANNOT_BE_ZERO';
  end if;

  select pt.* into v_before
  from public.entry_payment_transactions pt
  join public.entries e on e.id = pt.entry_id
  where pt.id = p_transaction_id and e.trial_id = p_trial_id
  for update of pt, e;

  if not found then
    raise exception using errcode = 'P0001', message = 'PAYMENT_NOT_FOUND';
  end if;

  select coalesce(sum(amount), 0)
    into v_other_payments
  from public.entry_payment_transactions
  where entry_id = v_before.entry_id and id <> p_transaction_id;

  if v_other_payments + p_amount < -0.005 then
    raise exception using errcode = 'P0001', message = 'REFUND_EXCEEDS_NET_PAYMENTS';
  end if;

  update public.entry_payment_transactions
     set amount = p_amount,
         payment_method = p_payment_method,
         payment_received_by = p_payment_received_by,
         payment_date = coalesce(p_payment_date, payment_date),
         notes = p_notes
   where id = p_transaction_id
   returning * into v_after;

  v_summary := public.refresh_entry_payment_summary(v_before.entry_id);

  if p_changed_by is not null then
    select nullif(trim(concat_ws(' ', first_name, last_name)), '')
      into v_user_name
    from public.users where id = p_changed_by;
    v_user_name := coalesce(v_user_name, 'Administrator');
  end if;

  insert into public.trial_activity_log (
    trial_id, activity_type, entry_id, snapshot_data, user_id, user_name
  ) values (
    p_trial_id,
    'payment_edited',
    v_before.entry_id,
    jsonb_build_object(
      'before', to_jsonb(v_before),
      'after', to_jsonb(v_after),
      'financial_status', v_summary
    ),
    p_changed_by,
    v_user_name
  );

  return jsonb_build_object('transaction', to_jsonb(v_after), 'summary', v_summary);
end;
$$;

revoke all on function public.refresh_entry_payment_summary(uuid) from public;
revoke all on function public.record_entry_payment_atomic(uuid, uuid, numeric, text, text, timestamptz, text, uuid) from public;
revoke all on function public.update_entry_payment_atomic(uuid, uuid, numeric, text, text, timestamptz, text, uuid) from public;
grant execute on function public.refresh_entry_payment_summary(uuid) to service_role;
grant execute on function public.record_entry_payment_atomic(uuid, uuid, numeric, text, text, timestamptz, text, uuid) to service_role;
grant execute on function public.update_entry_payment_atomic(uuid, uuid, numeric, text, text, timestamptz, text, uuid) to service_role;

create or replace function public.set_entry_fee_waiver_atomic(
  p_trial_id uuid,
  p_entry_ids uuid[],
  p_waived boolean,
  p_reason text default null,
  p_changed_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry record;
  v_gross_fee numeric;
  v_summary jsonb;
  v_results jsonb := '[]'::jsonb;
  v_user_name text := 'Administrator';
begin
  if coalesce(array_length(p_entry_ids, 1), 0) = 0 then
    raise exception using errcode = 'P0001', message = 'NO_ENTRIES_SELECTED';
  end if;
  if p_waived and nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception using errcode = 'P0001', message = 'WAIVER_REASON_REQUIRED';
  end if;

  if (
    select count(*) from public.entries
    where trial_id = p_trial_id and id = any(p_entry_ids)
  ) <> (select count(distinct id) from unnest(p_entry_ids) as ids(id)) then
    raise exception using errcode = 'P0001', message = 'ENTRY_NOT_FOUND';
  end if;

  if p_changed_by is not null then
    select nullif(trim(concat_ws(' ', first_name, last_name)), '')
      into v_user_name
    from public.users where id = p_changed_by;
    v_user_name := coalesce(v_user_name, 'Administrator');
  end if;

  for v_entry in
    select id, handler_name, dog_call_name, amount_paid, amount_owed
    from public.entries
    where trial_id = p_trial_id and id = any(p_entry_ids)
    order by id
    for update
  loop
    select coalesce(sum(fee), 0)
      into v_gross_fee
    from public.entry_selections
    where entry_id = v_entry.id
      and lower(coalesce(entry_status, '')) not in ('waitlisted', 'withdrawn');

    update public.entries
       set fees_waived = p_waived,
           waiver_reason = case when p_waived then trim(p_reason) else null end,
           total_fee = v_gross_fee,
           amount_owed = case when p_waived then coalesce(amount_paid, 0) else v_gross_fee end
     where id = v_entry.id;

    v_summary := public.refresh_entry_payment_summary(v_entry.id);
    v_results := v_results || jsonb_build_array(v_summary);

    insert into public.trial_activity_log (
      trial_id, activity_type, entry_id, snapshot_data, user_id, user_name
    ) values (
      p_trial_id,
      case when p_waived then 'fees_waived' else 'fees_unwaived' end,
      v_entry.id,
      jsonb_build_object(
        'handler_name', v_entry.handler_name,
        'dog_call_name', v_entry.dog_call_name,
        'reason', p_reason,
        'previous_amount_owed', v_entry.amount_owed,
        'gross_billable_fee', v_gross_fee,
        'financial_status', v_summary
      ),
      p_changed_by,
      v_user_name
    );
  end loop;

  return jsonb_build_object('entries', v_results, 'waived', p_waived);
end;
$$;

revoke all on function public.set_entry_fee_waiver_atomic(uuid, uuid[], boolean, text, uuid) from public;
grant execute on function public.set_entry_fee_waiver_atomic(uuid, uuid[], boolean, text, uuid) to service_role;

create or replace function public.set_judge_volunteer_pricing_atomic(
  p_trial_id uuid,
  p_entry_ids uuid[],
  p_is_judge_volunteer boolean,
  p_regular_rate numeric,
  p_feo_rate numeric,
  p_changed_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry record;
  v_total_fee numeric;
  v_results jsonb := '[]'::jsonb;
begin
  if coalesce(array_length(p_entry_ids, 1), 0) = 0 or p_regular_rate < 0 or p_feo_rate < 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_PRICING_REQUEST';
  end if;
  if (
    select count(*) from public.entries
    where trial_id = p_trial_id and id = any(p_entry_ids)
  ) <> (select count(distinct id) from unnest(p_entry_ids) as ids(id)) then
    raise exception using errcode = 'P0001', message = 'ENTRY_NOT_FOUND';
  end if;

  for v_entry in
    select id, fees_waived, amount_paid
    from public.entries
    where trial_id = p_trial_id and id = any(p_entry_ids)
    order by id
    for update
  loop
    update public.entry_selections
       set fee = case when lower(coalesce(entry_type, 'regular')) = 'feo'
                      then p_feo_rate else p_regular_rate end
     where entry_id = v_entry.id;

    select coalesce(sum(fee), 0)
      into v_total_fee
    from public.entry_selections
    where entry_id = v_entry.id
      and lower(coalesce(entry_status, '')) not in ('waitlisted', 'withdrawn');

    update public.entries
       set is_judge_volunteer = p_is_judge_volunteer,
           total_fee = v_total_fee,
           amount_owed = case when coalesce(fees_waived, false)
                              then coalesce(amount_paid, 0) else v_total_fee end
     where id = v_entry.id;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object('entryId', v_entry.id, 'totalFee', v_total_fee)
    );
  end loop;

  return jsonb_build_object('entries', v_results, 'isJudgeVolunteer', p_is_judge_volunteer);
end;
$$;

revoke all on function public.set_judge_volunteer_pricing_atomic(uuid, uuid[], boolean, numeric, numeric, uuid) from public;
grant execute on function public.set_judge_volunteer_pricing_atomic(uuid, uuid[], boolean, numeric, numeric, uuid) to service_role;
