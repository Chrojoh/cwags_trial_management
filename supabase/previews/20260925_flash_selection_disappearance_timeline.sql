-- Read-only timeline for Flash in First CWAGS Scent Trial.
-- Safe to run during an active trial. This does not change any data.

with flash as (
  select
    e.id as entry_id,
    e.trial_id,
    e.handler_name,
    e.dog_call_name,
    e.cwags_number,
    e.created_at as entry_created_at,
    e.entry_status,
    e.total_fee,
    e.amount_owed,
    e.fees_waived
  from public.entries e
  join public.trials t on t.id = e.trial_id
  where t.id = '727c4cf7-7b35-4900-8246-f18d0f2de8d0'::uuid
    and e.id = '7d020b9e-48c9-4948-b345-a34ae943d417'::uuid
),
timeline as (
  select
    log.id,
    log.created_at,
    log.activity_type,
    log.user_id,
    log.user_name,
    log.snapshot_data,
    coalesce(
      (log.snapshot_data #>> '{after,class_count}')::integer,
      (log.snapshot_data ->> 'class_count')::integer
    ) as resulting_class_count,
    coalesce(
      log.snapshot_data #> '{after,classes}',
      log.snapshot_data -> 'classes'
    ) as resulting_classes,
    log.snapshot_data #> '{before,classes}' as previous_classes
  from public.trial_activity_log log
  join flash f on f.trial_id = log.trial_id
  where log.entry_id = f.entry_id
     or log.snapshot_data ->> 'cwags_number' = f.cwags_number
     or log.snapshot_data #>> '{after,cwags_number}' = f.cwags_number
     or log.snapshot_data #>> '{before,cwags_number}' = f.cwags_number
)
select jsonb_build_object(
  'current_entry', (
    select to_jsonb(f) from flash f
  ),
  'current_selections', (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'selection_id', es.id,
        'selection_created_at', es.created_at,
        'selection_status', es.entry_status,
        'running_position', es.running_position,
        'fee', es.fee,
        'class_name', tc.class_name,
        'round_number', tr.round_number,
        'day_number', td.day_number,
        'trial_date', td.trial_date
      ) order by td.day_number, tc.class_name, tr.round_number
    ), '[]'::jsonb)
    from flash f
    left join public.entry_selections es on es.entry_id = f.entry_id
    left join public.trial_rounds tr on tr.id = es.trial_round_id
    left join public.trial_classes tc on tc.id = tr.trial_class_id
    left join public.trial_days td on td.id = tc.trial_day_id
    where es.id is not null
  ),
  'journal_timeline', (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'created_at_utc', tl.created_at,
        'created_at_trial_time', to_char(
          tl.created_at at time zone 'America/Edmonton',
          'YYYY-MM-DD HH12:MI:SS AM'
        ),
        'activity_type', tl.activity_type,
        'performed_by', tl.user_name,
        'user_id', tl.user_id,
        'resulting_class_count', tl.resulting_class_count,
        'previous_classes', tl.previous_classes,
        'resulting_classes', tl.resulting_classes,
        'snapshot', tl.snapshot_data
      ) order by tl.created_at
    ), '[]'::jsonb)
    from timeline tl
  ),
  'audit_warning',
    'entry_selections DELETE operations are not covered by journal_selection_changes_trigger; an exact deletion time exists only if the application wrote an entry_modified snapshot'
) as flash_selection_audit;
