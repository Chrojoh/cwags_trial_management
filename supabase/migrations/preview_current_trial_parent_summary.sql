-- READ ONLY. This script does not update data or create database objects.
-- It previews exactly what recalculate_parent_entry_summary would calculate for
-- the current trial if that trial were not protected by the exclusion.

with selection_summary as (
  select
    e.id as entry_id,
    e.trial_id,
    e.handler_name,
    e.dog_call_name,
    e.cwags_number,
    e.entry_status as current_status,
    coalesce(e.total_fee, 0) as current_total_fee,
    coalesce(e.amount_owed, 0) as current_amount_owed,
    coalesce(e.amount_paid, 0) as amount_paid,
    coalesce(e.fees_waived, false) as fees_waived,
    count(es.id) as selection_count,
    count(es.id) filter (
      where lower(coalesce(es.entry_status, '')) <> 'withdrawn'
    ) as non_withdrawn_count,
    count(es.id) filter (
      where lower(coalesce(es.entry_status, '')) = 'waitlisted'
    ) as waitlisted_count,
    coalesce(sum(es.fee) filter (
      where lower(coalesce(es.entry_status, '')) not in ('waitlisted', 'withdrawn')
    ), 0) as proposed_total_fee
  from public.entries e
  left join public.entry_selections es on es.entry_id = e.id
  where e.trial_id = 'b1fb0120-da94-43f3-a561-fe12e7d663a4'::uuid
  group by e.id
), proposed as (
  select
    *,
    case
      when selection_count = 0 then current_status
      when non_withdrawn_count = 0 then 'withdrawn'
      when lower(coalesce(current_status, '')) = 'no_show' then current_status
      when non_withdrawn_count = waitlisted_count then 'waitlisted'
      when lower(coalesce(current_status, '')) in ('submitted', 'confirmed') then current_status
      else 'confirmed'
    end as proposed_status,
    case
      when fees_waived then amount_paid
      else proposed_total_fee
    end as proposed_amount_owed
  from selection_summary
)
select
  entry_id,
  handler_name,
  dog_call_name,
  cwags_number,
  current_status,
  proposed_status,
  current_total_fee,
  proposed_total_fee,
  current_amount_owed,
  proposed_amount_owed,
  amount_paid,
  fees_waived,
  selection_count,
  non_withdrawn_count,
  waitlisted_count,
  (current_status is distinct from proposed_status) as status_would_change,
  (current_total_fee is distinct from proposed_total_fee) as fee_would_change,
  (current_amount_owed is distinct from proposed_amount_owed) as amount_owed_would_change,
  count(*) filter (
    where current_status is distinct from proposed_status
       or current_total_fee is distinct from proposed_total_fee
       or current_amount_owed is distinct from proposed_amount_owed
  ) over () as total_entries_that_would_change
from proposed
order by
  (current_status is distinct from proposed_status
    or current_total_fee is distinct from proposed_total_fee
    or current_amount_owed is distinct from proposed_amount_owed) desc,
  handler_name,
  dog_call_name,
  entry_id;

