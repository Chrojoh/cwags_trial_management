-- Journal selection deletions at the database boundary.
--
-- The existing row trigger intentionally covers INSERT and UPDATE only. This
-- statement-level DELETE trigger records one consolidated entry_modified event
-- per affected entry, even when several selections are removed in one request.
-- No existing trial data is changed by this migration.

begin;

create or replace function public.journal_selection_deletions()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entry_id uuid;
  v_entry public.entries%rowtype;
  v_user_id uuid := auth.uid();
  v_user_name text;
  v_before_classes jsonb;
  v_after_classes jsonb;
  v_removed_classes jsonb;
  v_before_count integer;
  v_after_count integer;
  v_before_fee numeric;
  v_after_fee numeric;
begin
  for v_entry_id in
    select distinct deleted.entry_id
    from deleted_entry_selections deleted
  loop
    select *
      into v_entry
    from public.entries
    where id = v_entry_id;

    -- If the parent entry is being deleted in the same transaction, the atomic
    -- entry-deletion routine owns that audit record and this trigger stays quiet.
    if not found then
      continue;
    end if;

    v_user_name := public.journal_actor_name(null);

    select
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'selection_id', source.id,
            'name', source.class_name,
            'round', source.round_number,
            'fee', source.fee,
            'entry_status', source.entry_status,
            'entry_type', source.entry_type,
            'day_number', source.day_number,
            'trial_date', source.trial_date,
            'created_at', source.created_at
          )
          order by source.day_number, source.class_name, source.round_number, source.id
        ),
        '[]'::jsonb
      ),
      count(*)::integer,
      coalesce(sum(
        case
          when lower(coalesce(source.entry_status, '')) not in ('waitlisted', 'withdrawn')
            then coalesce(source.fee, 0)
          else 0
        end
      ), 0)
      into v_before_classes, v_before_count, v_before_fee
    from (
      select
        es.id,
        tc.class_name,
        tr.round_number,
        es.fee,
        es.entry_status,
        es.entry_type,
        td.day_number,
        td.trial_date,
        es.created_at
      from public.entry_selections es
      join public.trial_rounds tr on tr.id = es.trial_round_id
      join public.trial_classes tc on tc.id = tr.trial_class_id
      join public.trial_days td on td.id = tc.trial_day_id
      where es.entry_id = v_entry_id

      union all

      select
        deleted.id,
        tc.class_name,
        tr.round_number,
        deleted.fee,
        deleted.entry_status,
        deleted.entry_type,
        td.day_number,
        td.trial_date,
        deleted.created_at
      from deleted_entry_selections deleted
      join public.trial_rounds tr on tr.id = deleted.trial_round_id
      join public.trial_classes tc on tc.id = tr.trial_class_id
      join public.trial_days td on td.id = tc.trial_day_id
      where deleted.entry_id = v_entry_id
    ) source;

    select
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'selection_id', es.id,
            'name', tc.class_name,
            'round', tr.round_number,
            'fee', es.fee,
            'entry_status', es.entry_status,
            'entry_type', es.entry_type,
            'day_number', td.day_number,
            'trial_date', td.trial_date,
            'created_at', es.created_at
          )
          order by td.day_number, tc.class_name, tr.round_number, es.id
        ),
        '[]'::jsonb
      ),
      count(es.id)::integer,
      coalesce(sum(
        case
          when lower(coalesce(es.entry_status, '')) not in ('waitlisted', 'withdrawn')
            then coalesce(es.fee, 0)
          else 0
        end
      ), 0)
      into v_after_classes, v_after_count, v_after_fee
    from public.entry_selections es
    join public.trial_rounds tr on tr.id = es.trial_round_id
    join public.trial_classes tc on tc.id = tr.trial_class_id
    join public.trial_days td on td.id = tc.trial_day_id
    where es.entry_id = v_entry_id;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'selection_id', deleted.id,
          'name', tc.class_name,
          'round', tr.round_number,
          'fee', deleted.fee,
          'entry_status', deleted.entry_status,
          'entry_type', deleted.entry_type,
          'day_number', td.day_number,
          'trial_date', td.trial_date,
          'created_at', deleted.created_at
        )
        order by td.day_number, tc.class_name, tr.round_number, deleted.id
      ),
      '[]'::jsonb
    )
      into v_removed_classes
    from deleted_entry_selections deleted
    join public.trial_rounds tr on tr.id = deleted.trial_round_id
    join public.trial_classes tc on tc.id = tr.trial_class_id
    join public.trial_days td on td.id = tc.trial_day_id
    where deleted.entry_id = v_entry_id;

    insert into public.trial_activity_log (
      trial_id,
      activity_type,
      entry_id,
      snapshot_data,
      user_id,
      user_name
    ) values (
      v_entry.trial_id,
      'entry_modified',
      v_entry.id,
      jsonb_build_object(
        'handler_name', v_entry.handler_name,
        'dog_call_name', v_entry.dog_call_name,
        'cwags_number', v_entry.cwags_number,
        'operation', 'selection_delete',
        'transaction_id', txid_current(),
        'before', jsonb_build_object(
          'class_count', v_before_count,
          'total_fee', v_before_fee,
          'classes', v_before_classes
        ),
        'after', jsonb_build_object(
          'class_count', v_after_count,
          'total_fee', v_after_fee,
          'classes', v_after_classes
        ),
        'change', jsonb_build_object(
          'class_count_delta', v_after_count - v_before_count,
          'fee_delta', v_after_fee - v_before_fee,
          'removed_classes', v_removed_classes
        )
      ),
      v_user_id,
      v_user_name
    );
  end loop;

  return null;
end;
$$;

revoke all on function public.journal_selection_deletions()
  from public, anon, authenticated;
grant execute on function public.journal_selection_deletions()
  to service_role;

drop trigger if exists journal_selection_deletions_trigger
  on public.entry_selections;
create trigger journal_selection_deletions_trigger
after delete on public.entry_selections
referencing old table as deleted_entry_selections
for each statement
execute function public.journal_selection_deletions();

commit;

select
  trigger_name,
  event_manipulation,
  action_timing,
  action_orientation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'entry_selections'
  and trigger_name in (
    'journal_selection_changes_trigger',
    'journal_selection_deletions_trigger'
  )
order by trigger_name, event_manipulation;
