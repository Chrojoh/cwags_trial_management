-- One-time repair for the Proposed test trial after installing
-- 20260811_service_position_journal_suppression.sql.
-- Only active running_position values are changed; entries, selections,
-- scores, fees, capacities, and historical journal rows are untouched.
begin;

with trial_round_ids as (
  select tr.id
  from public.trial_rounds tr
  join public.trial_classes tc on tc.id = tr.trial_class_id
  join public.trial_days td on td.id = tc.trial_day_id
  where td.trial_id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid
), ordered as (
  select
    es.id,
    row_number() over (
      partition by es.trial_round_id
      order by es.running_position nulls last, es.created_at, es.id
    )::integer as contiguous_position
  from public.entry_selections es
  where es.trial_round_id in (select id from trial_round_ids)
    and lower(coalesce(es.entry_status, '')) not in ('waitlisted', 'withdrawn')
)
update public.entry_selections es
set running_position = ordered.contiguous_position
from ordered
where es.id = ordered.id
  and es.running_position is distinct from ordered.contiguous_position;

commit;

select
  tc.class_name,
  tr.round_number,
  e.handler_name,
  e.dog_call_name,
  es.entry_status,
  es.running_position
from public.entry_selections es
join public.entries e on e.id = es.entry_id
join public.trial_rounds tr on tr.id = es.trial_round_id
join public.trial_classes tc on tc.id = tr.trial_class_id
join public.trial_days td on td.id = tc.trial_day_id
where td.trial_id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid
order by tc.class_name, tr.round_number,
  es.running_position nulls last, es.created_at, es.id;
