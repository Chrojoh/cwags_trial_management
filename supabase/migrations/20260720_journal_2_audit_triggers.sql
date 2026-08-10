-- Patch 08 - Journal 2.0
-- Forward-only audit coverage for mutations that are not already journalled by
-- the atomic payment, waiver, capacity, status, and promotion RPCs.
-- No backfill and no changes to existing business data.

create or replace function public.journal_actor_name(p_fallback text default null)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select nullif(trim(concat_ws(' ', first_name, last_name)), '')
      from public.users
      where id = auth.uid()
    ),
    nullif(trim(p_fallback), ''),
    'System'
  );
$$;

create or replace function public.journal_entry_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_name text := public.journal_actor_name(new.handler_name);
  v_before jsonb;
  v_after jsonb;
begin
  v_before := jsonb_build_object(
    'handler_name', old.handler_name,
    'handler_email', old.handler_email,
    'handler_phone', old.handler_phone,
    'emergency_contact', old.emergency_contact,
    'dog_call_name', old.dog_call_name,
    'cwags_number', old.cwags_number,
    'dog_breed', old.dog_breed,
    'dog_sex', old.dog_sex,
    'is_junior_handler', old.is_junior_handler,
    'close_to_titles', old.close_to_titles,
    'volunteer_preferences', old.volunteer_preferences
  );
  v_after := jsonb_build_object(
    'handler_name', new.handler_name,
    'handler_email', new.handler_email,
    'handler_phone', new.handler_phone,
    'emergency_contact', new.emergency_contact,
    'dog_call_name', new.dog_call_name,
    'cwags_number', new.cwags_number,
    'dog_breed', new.dog_breed,
    'dog_sex', new.dog_sex,
    'is_junior_handler', new.is_junior_handler,
    'close_to_titles', new.close_to_titles,
    'volunteer_preferences', new.volunteer_preferences
  );

  if v_before is distinct from v_after then
    insert into public.trial_activity_log (
      trial_id, activity_type, entry_id, snapshot_data, user_id, user_name
    ) values (
      new.trial_id,
      'entry_edited',
      new.id,
      jsonb_build_object(
        'handler_name', new.handler_name,
        'dog_call_name', new.dog_call_name,
        'cwags_number', new.cwags_number,
        'before', v_before,
        'after', v_after,
        'reason', null
      ),
      v_user_id,
      v_user_name
    );
  end if;

  if old.total_fee is distinct from new.total_fee then
    insert into public.trial_activity_log (
      trial_id, activity_type, entry_id, snapshot_data, user_id, user_name
    ) values (
      new.trial_id,
      'fees_recalculated',
      new.id,
      jsonb_build_object(
        'handler_name', new.handler_name,
        'dog_call_name', new.dog_call_name,
        'cwags_number', new.cwags_number,
        'before', jsonb_build_object('total_fee', old.total_fee),
        'after', jsonb_build_object('total_fee', new.total_fee),
        'reason', null
      ),
      v_user_id,
      v_user_name
    );
  end if;

  return new;
end;
$$;

drop trigger if exists journal_entry_changes_trigger on public.entries;
create trigger journal_entry_changes_trigger
after update on public.entries
for each row execute function public.journal_entry_changes();

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

  if tg_op = 'UPDATE' and old.running_position is distinct from new.running_position then
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

drop trigger if exists journal_selection_changes_trigger on public.entry_selections;
create trigger journal_selection_changes_trigger
after insert or update on public.entry_selections
for each row execute function public.journal_selection_changes();

create or replace function public.journal_score_corrections()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_trial_id uuid;
  v_handler_name text;
  v_dog_call_name text;
  v_cwags_number text;
  v_user_id uuid := auth.uid();
  v_user_name text;
begin
  if (to_jsonb(old) - array['scored_at']) is not distinct from
     (to_jsonb(new) - array['scored_at']) then
    return new;
  end if;

  select e.id, e.trial_id, e.handler_name, e.dog_call_name, e.cwags_number
    into v_entry_id, v_trial_id, v_handler_name, v_dog_call_name, v_cwags_number
  from public.entry_selections es
  join public.entries e on e.id = es.entry_id
  where es.id = new.entry_selection_id;
  v_user_name := public.journal_actor_name(v_handler_name);

  insert into public.trial_activity_log (
    trial_id, activity_type, entry_id, snapshot_data, user_id, user_name
  ) values (
    v_trial_id,
    'score_corrected',
    v_entry_id,
    jsonb_build_object(
      'score_id', new.id,
      'selection_id', new.entry_selection_id,
      'handler_name', v_handler_name,
      'dog_call_name', v_dog_call_name,
      'cwags_number', v_cwags_number,
      'before', to_jsonb(old),
      'after', to_jsonb(new),
      'reason', nullif(trim(new.judge_notes), '')
    ),
    v_user_id,
    v_user_name
  );

  return new;
end;
$$;

drop trigger if exists journal_score_corrections_trigger on public.scores;
create trigger journal_score_corrections_trigger
after update on public.scores
for each row execute function public.journal_score_corrections();

revoke all on function public.journal_actor_name(text) from public;
grant execute on function public.journal_actor_name(text) to authenticated, service_role;
