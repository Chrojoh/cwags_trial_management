-- Emergency rollback for 20260925_handler_financial_accounts.sql.
-- Deploy the pre-handler-account application code at the same time.
-- Existing payment transactions and journal records are not deleted.

begin;

drop function if exists public.record_handler_payment_atomic(
  uuid, uuid[], numeric, text, text, timestamptz, text, uuid
);
drop function if exists public.update_handler_payment_atomic(
  uuid, uuid[], uuid, numeric, text, text, timestamptz, text, uuid
);
drop function if exists public.rehome_deleted_entry_payments(uuid, uuid[]);

-- Restore the pre-handler-account deletion routine. This version deletes
-- payments anchored to a deleted entry, matching the previous release.
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
    p_trial_id, 'entry_deleted', null, v_snapshot, p_changed_by, v_user_name
  );

  return jsonb_build_object(
    'deleted_entries', v_found,
    'affected_rounds', coalesce(array_length(v_round_ids, 1), 0)
  );
end;
$$;

revoke all on function public.delete_trial_entries_atomic(uuid,uuid[],uuid)
  from public, anon, authenticated;
grant execute on function public.delete_trial_entries_atomic(uuid,uuid[],uuid)
  to service_role;

commit;
