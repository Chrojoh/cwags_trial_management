-- Treat payments as belonging to a handler account even though the legacy
-- transaction table retains an entry_id anchor for backwards compatibility.
-- Install together with the application code that calls the two handler RPCs.

create or replace function public.record_handler_payment_atomic(
  p_trial_id uuid,
  p_entry_ids uuid[],
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
set row_security = off
as $$
declare
  v_expected integer := coalesce(array_length(p_entry_ids, 1), 0);
  v_found integer;
  v_owner_keys integer;
  v_identity_keys integer;
  v_pending_count integer;
  v_anchor uuid;
  v_transaction public.entry_payment_transactions%rowtype;
  v_current_paid numeric;
  v_handler_name text;
  v_dog_names text;
  v_user_name text := 'Administrator';
  v_summaries jsonb := '[]'::jsonb;
  v_entry_id uuid;
begin
  if v_expected = 0 or p_amount = 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_PAYMENT_REQUEST';
  end if;

  perform 1 from public.entries
  where trial_id = p_trial_id and id = any(p_entry_ids)
  for update;

  select count(*),
         count(distinct case
           when cwags_number ~ '^[0-9]{2}-[0-9]{4}-[0-9]{2}$'
             then left(cwags_number, 7)
           else null
         end),
         count(distinct concat_ws('|',
           lower(trim(coalesce(handler_email, ''))),
           regexp_replace(coalesce(handler_phone, ''), '\D', '', 'g'),
           lower(regexp_replace(trim(coalesce(handler_name, '')), '\s+', ' ', 'g'))
         )),
         count(*) filter (where coalesce(cwags_number, '') !~ '^[0-9]{2}-[0-9]{4}-[0-9]{2}$')
    into v_found, v_owner_keys, v_identity_keys, v_pending_count
  from public.entries
  where trial_id = p_trial_id and id = any(p_entry_ids);

  if v_found <> v_expected then
    raise exception using errcode = 'P0001', message = 'ENTRY_NOT_FOUND';
  end if;
  if v_owner_keys > 1
     or (v_owner_keys = 0 and v_identity_keys > 1)
     or (v_owner_keys = 1 and v_pending_count > 0 and v_identity_keys > 1) then
    raise exception using errcode = 'P0001', message = 'MIXED_HANDLER_ENTRIES';
  end if;

  select e.id, e.handler_name
    into v_anchor, v_handler_name
  from public.entries e
  where e.trial_id = p_trial_id and e.id = any(p_entry_ids)
  order by exists(
    select 1 from public.entry_payment_transactions pt where pt.entry_id = e.id
  ) desc, e.submitted_at, e.id
  limit 1;

  select string_agg(distinct dog_call_name, ', ' order by dog_call_name)
    into v_dog_names
  from public.entries
  where trial_id = p_trial_id and id = any(p_entry_ids);

  select coalesce(sum(amount), 0) into v_current_paid
  from public.entry_payment_transactions
  where entry_id = any(p_entry_ids);

  if p_amount < 0 and v_current_paid + p_amount < -0.005 then
    raise exception using errcode = 'P0001', message = 'REFUND_EXCEEDS_NET_PAYMENTS';
  end if;

  insert into public.entry_payment_transactions(
    entry_id, amount, payment_method, payment_received_by, payment_date, notes
  ) values (
    v_anchor, p_amount, p_payment_method, p_payment_received_by,
    coalesce(p_payment_date, now()), p_notes
  ) returning * into v_transaction;

  foreach v_entry_id in array p_entry_ids loop
    v_summaries := v_summaries || jsonb_build_array(public.refresh_entry_payment_summary(v_entry_id));
  end loop;

  if p_recorded_by is not null then
    select nullif(trim(concat_ws(' ', first_name, last_name)), '') into v_user_name
    from public.users where id = p_recorded_by;
    v_user_name := coalesce(v_user_name, 'Administrator');
  end if;

  insert into public.trial_activity_log(
    trial_id, activity_type, entry_id, snapshot_data, user_id, user_name
  ) values (
    p_trial_id,
    case when p_amount < 0 then 'refund_processed' else 'payment_received' end,
    v_anchor,
    jsonb_build_object(
      'handler_name', v_handler_name,
      'dog_call_name', v_dog_names,
      'entry_ids', to_jsonb(p_entry_ids),
      'transaction_id', v_transaction.id,
      'amount', p_amount,
      'payment_method', p_payment_method,
      'payment_received_by', p_payment_received_by,
      'payment_date', coalesce(p_payment_date, v_transaction.payment_date),
      'notes', p_notes,
      'financial_summaries', v_summaries
    ),
    p_recorded_by,
    v_user_name
  );

  return jsonb_build_object('transaction', to_jsonb(v_transaction), 'summaries', v_summaries);
end;
$$;

create or replace function public.update_handler_payment_atomic(
  p_trial_id uuid,
  p_entry_ids uuid[],
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
set row_security = off
as $$
declare
  v_expected integer := coalesce(array_length(p_entry_ids, 1), 0);
  v_found integer;
  v_owner_keys integer;
  v_identity_keys integer;
  v_pending_count integer;
  v_before public.entry_payment_transactions%rowtype;
  v_after public.entry_payment_transactions%rowtype;
  v_other_payments numeric;
  v_user_name text := 'Administrator';
  v_entry_id uuid;
begin
  if v_expected = 0 then
    raise exception using errcode = 'P0001', message = 'ENTRY_NOT_FOUND';
  end if;

  select count(*),
         count(distinct case
           when cwags_number ~ '^[0-9]{2}-[0-9]{4}-[0-9]{2}$'
             then left(cwags_number, 7)
           else null
         end),
         count(distinct concat_ws('|',
           lower(trim(coalesce(handler_email, ''))),
           regexp_replace(coalesce(handler_phone, ''), '\D', '', 'g'),
           lower(regexp_replace(trim(coalesce(handler_name, '')), '\s+', ' ', 'g'))
         )),
         count(*) filter (where coalesce(cwags_number, '') !~ '^[0-9]{2}-[0-9]{4}-[0-9]{2}$')
    into v_found, v_owner_keys, v_identity_keys, v_pending_count
  from public.entries
  where trial_id = p_trial_id and id = any(p_entry_ids);

  if v_found <> v_expected then
    raise exception using errcode = 'P0001', message = 'ENTRY_NOT_FOUND';
  end if;
  if v_owner_keys > 1
     or (v_owner_keys = 0 and v_identity_keys > 1)
     or (v_owner_keys = 1 and v_pending_count > 0 and v_identity_keys > 1) then
    raise exception using errcode = 'P0001', message = 'MIXED_HANDLER_ENTRIES';
  end if;

  select pt.* into v_before
  from public.entry_payment_transactions pt
  where pt.id = p_transaction_id and pt.entry_id = any(p_entry_ids)
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'PAYMENT_NOT_FOUND';
  end if;

  select coalesce(sum(amount), 0) into v_other_payments
  from public.entry_payment_transactions
  where entry_id = any(p_entry_ids) and id <> p_transaction_id;

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

  foreach v_entry_id in array p_entry_ids loop
    perform public.refresh_entry_payment_summary(v_entry_id);
  end loop;

  if p_changed_by is not null then
    select nullif(trim(concat_ws(' ', first_name, last_name)), '') into v_user_name
    from public.users where id = p_changed_by;
    v_user_name := coalesce(v_user_name, 'Administrator');
  end if;

  insert into public.trial_activity_log(
    trial_id, activity_type, entry_id, snapshot_data, user_id, user_name
  ) values (
    p_trial_id, 'payment_edited', v_before.entry_id,
    jsonb_build_object(
      'before', to_jsonb(v_before),
      'after', to_jsonb(v_after),
      'entry_ids', to_jsonb(p_entry_ids)
    ),
    p_changed_by, v_user_name
  );

  return jsonb_build_object('transaction', to_jsonb(v_after));
end;
$$;

revoke all on function public.record_handler_payment_atomic(uuid,uuid[],numeric,text,text,timestamptz,text,uuid)
  from public, anon, authenticated;
grant execute on function public.record_handler_payment_atomic(uuid,uuid[],numeric,text,text,timestamptz,text,uuid)
  to service_role;

revoke all on function public.update_handler_payment_atomic(uuid,uuid[],uuid,numeric,text,text,timestamptz,text,uuid)
  from public, anon, authenticated;
grant execute on function public.update_handler_payment_atomic(uuid,uuid[],uuid,numeric,text,text,timestamptz,text,uuid)
  to service_role;

-- Keep a handler's transaction history when one dog is removed. The existing
-- delete RPC can call this immediately before it deletes payment rows.
create or replace function public.rehome_deleted_entry_payments(
  p_trial_id uuid,
  p_entry_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_moved integer := 0;
  v_count integer;
  v_deleted record;
  v_survivor uuid;
begin
  for v_deleted in
    select * from public.entries
    where trial_id = p_trial_id and id = any(p_entry_ids)
  loop
    select candidate.id into v_survivor
    from public.entries candidate
    where candidate.trial_id = p_trial_id
      and candidate.id <> all(p_entry_ids)
      and (
        (
          v_deleted.cwags_number ~ '^[0-9]{2}-[0-9]{4}-[0-9]{2}$'
          and candidate.cwags_number ~ '^[0-9]{2}-[0-9]{4}-[0-9]{2}$'
          and left(candidate.cwags_number, 7) = left(v_deleted.cwags_number, 7)
        )
        or (
          lower(trim(coalesce(candidate.handler_email, ''))) = lower(trim(coalesce(v_deleted.handler_email, '')))
          and regexp_replace(coalesce(candidate.handler_phone, ''), '\D', '', 'g') =
              regexp_replace(coalesce(v_deleted.handler_phone, ''), '\D', '', 'g')
          and lower(regexp_replace(trim(coalesce(candidate.handler_name, '')), '\s+', ' ', 'g')) =
              lower(regexp_replace(trim(coalesce(v_deleted.handler_name, '')), '\s+', ' ', 'g'))
        )
      )
    order by candidate.submitted_at, candidate.id
    limit 1;

    if v_survivor is not null then
      update public.entry_payment_transactions
      set entry_id = v_survivor
      where entry_id = v_deleted.id;
      get diagnostics v_count = row_count;
      v_moved := v_moved + v_count;
      perform public.refresh_entry_payment_summary(v_survivor);
    end if;
  end loop;
  return v_moved;
end;
$$;

revoke all on function public.rehome_deleted_entry_payments(uuid,uuid[])
  from public, anon, authenticated;
grant execute on function public.rehome_deleted_entry_payments(uuid,uuid[]) to service_role;

create or replace function public.delete_trial_entries_atomic(
  p_trial_id uuid,
  p_entry_ids uuid[],
  p_changed_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_expected integer := coalesce(array_length(p_entry_ids, 1), 0);
  v_found integer;
  v_snapshot jsonb;
  v_round_ids uuid[];
  v_rehomed_payments integer := 0;
  v_user_name text := 'Administrator';
begin
  if v_expected = 0 then
    raise exception using errcode = 'P0001', message = 'ENTRY_NOT_FOUND';
  end if;

  perform 1 from public.entries
  where trial_id = p_trial_id and id = any(p_entry_ids)
  for update;

  select count(*) into v_found from public.entries
  where trial_id = p_trial_id and id = any(p_entry_ids);
  if v_found <> v_expected then
    raise exception using errcode = 'P0001', message = 'ENTRY_NOT_FOUND';
  end if;

  select jsonb_build_object(
    'entries', coalesce(jsonb_agg(to_jsonb(e) order by e.submitted_at, e.id), '[]'::jsonb),
    'entry_count', count(*)
  ) into v_snapshot
  from public.entries e
  where e.trial_id = p_trial_id and e.id = any(p_entry_ids);

  select coalesce(array_agg(distinct trial_round_id), array[]::uuid[])
    into v_round_ids
  from public.entry_selections
  where entry_id = any(p_entry_ids);

  -- Move a handler's payments to a surviving dog before deleting the selected
  -- dog. Payments are deleted only when the handler has no entry left.
  v_rehomed_payments := public.rehome_deleted_entry_payments(p_trial_id, p_entry_ids);

  delete from public.scores
  where entry_selection_id in (
    select id from public.entry_selections where entry_id = any(p_entry_ids)
  );
  delete from public.entry_payment_transactions where entry_id = any(p_entry_ids);
  delete from public.entry_selections where entry_id = any(p_entry_ids);

  update public.trial_activity_log
  set entry_id = null
  where trial_id = p_trial_id and entry_id = any(p_entry_ids);

  delete from public.entries where trial_id = p_trial_id and id = any(p_entry_ids);

  with ranked as (
    select id,
           row_number() over (
             partition by trial_round_id
             order by running_position nulls last, created_at, id
           ) as new_position
    from public.entry_selections
    where trial_round_id = any(v_round_ids)
      and lower(coalesce(entry_status, '')) not in ('waitlisted', 'withdrawn')
  )
  update public.entry_selections es
  set running_position = ranked.new_position
  from ranked
  where es.id = ranked.id
    and es.running_position is distinct from ranked.new_position;

  if p_changed_by is not null then
    select nullif(trim(concat_ws(' ', first_name, last_name)), '') into v_user_name
    from public.users where id = p_changed_by;
    v_user_name := coalesce(v_user_name, 'Administrator');
  end if;

  insert into public.trial_activity_log(
    trial_id, activity_type, entry_id, snapshot_data, user_id, user_name
  ) values (
    p_trial_id,
    'entry_deleted',
    null,
    v_snapshot || jsonb_build_object('payments_rehomed', v_rehomed_payments),
    p_changed_by,
    v_user_name
  );

  return jsonb_build_object(
    'deleted_entries', v_found,
    'affected_rounds', coalesce(array_length(v_round_ids, 1), 0),
    'payments_rehomed', v_rehomed_payments
  );
end;
$$;

revoke all on function public.delete_trial_entries_atomic(uuid,uuid[],uuid)
  from public, anon, authenticated;
grant execute on function public.delete_trial_entries_atomic(uuid,uuid[],uuid) to service_role;
