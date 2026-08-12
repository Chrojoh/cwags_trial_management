-- Automatic server-side position compaction keeps running orders contiguous.
-- Suppress only the mechanical running-order audit cards produced by those
-- service-role updates. Authenticated manual reordering remains audited.
begin;

create or replace function public.journal_selection_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.entries%rowtype;
  v_class_name text;
  v_round_number integer;
  v_user_id uuid := auth.uid();
  v_user_name text;
begin
  select * into v_entry from public.entries where id = new.entry_id;
  select tc.class_name, tr.round_number
    into v_class_name, v_round_number
  from public.trial_rounds tr
  join public.trial_classes tc on tc.id = tr.trial_class_id
  where tr.id = new.trial_round_id;
  v_user_name := public.journal_actor_name(v_entry.handler_name);

  if new.entry_status = 'waitlisted'
     and (tg_op = 'INSERT' or old.entry_status is distinct from new.entry_status) then
    insert into public.trial_activity_log (
      trial_id, activity_type, entry_id, snapshot_data, user_id, user_name
    ) values (
      v_entry.trial_id,
      'selection_waitlisted',
      new.entry_id,
      jsonb_build_object(
        'selection_id', new.id,
        'handler_name', v_entry.handler_name,
        'dog_call_name', v_entry.dog_call_name,
        'cwags_number', v_entry.cwags_number,
        'class_name', v_class_name,
        'round_number', v_round_number,
        'before', case when tg_op = 'UPDATE' then jsonb_build_object('entry_status', old.entry_status) else null end,
        'after', jsonb_build_object('entry_status', new.entry_status, 'running_position', new.running_position),
        'reason', null
      ),
      v_user_id,
      v_user_name
    );
  end if;

  -- A null auth.uid() identifies internal/service-role maintenance. Those
  -- position shifts are mechanical compaction, not a user's manual reorder.
  if tg_op = 'UPDATE'
     and v_user_id is not null
     and old.running_position is distinct from new.running_position then
    insert into public.trial_activity_log (
      trial_id, activity_type, entry_id, snapshot_data, user_id, user_name
    ) values (
      v_entry.trial_id,
      'running_order_changed',
      new.entry_id,
      jsonb_build_object(
        'selection_id', new.id,
        'handler_name', v_entry.handler_name,
        'dog_call_name', v_entry.dog_call_name,
        'cwags_number', v_entry.cwags_number,
        'class_name', v_class_name,
        'round_number', v_round_number,
        'before', jsonb_build_object('running_position', old.running_position),
        'after', jsonb_build_object('running_position', new.running_position),
        'reason', null
      ),
      v_user_id,
      v_user_name
    );
  end if;

  return new;
end;
$$;

revoke all on function public.journal_selection_changes() from public, anon, authenticated;

commit;

select
  t.tgname as trigger_name,
  case t.tgenabled when 'O' then 'enabled' else t.tgenabled::text end as status,
  p.proname as function_name,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'public.entry_selections'::regclass
  and t.tgname = 'journal_selection_changes_trigger';
