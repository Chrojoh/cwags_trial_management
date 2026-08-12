-- Keep a new entry submission as one complete journal event. Selection rows are
-- inserted one at a time, so their intermediate parent-fee recalculations must
-- not appear as separate events before the entry_submitted baseline exists.
-- Later fee changes remain audited normally.

create or replace function public.journal_entry_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_name text := public.journal_actor_name(new.handler_name);
  v_before jsonb;
  v_after jsonb;
  v_has_submission_baseline boolean;
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
    select exists (
      select 1
      from public.trial_activity_log log
      where log.entry_id = new.id
        and log.activity_type in ('entry_submitted', 'live_event_entry_added')
    ) into v_has_submission_baseline;

    if v_has_submission_baseline then
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
  end if;

  return new;
end;
$$;

revoke all on function public.journal_entry_changes() from public;

