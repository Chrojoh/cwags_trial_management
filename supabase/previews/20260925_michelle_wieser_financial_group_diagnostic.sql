-- Read-only diagnostic for Michelle Wieser's Lumi and Flash entries.
-- Safe to run while the trial is active: this query does not change data.

with matching_entries as (
  select
    t.id as trial_id,
    t.trial_name,
    t.start_date,
    t.end_date,
    e.id as entry_id,
    e.handler_name,
    e.dog_call_name,
    e.cwags_number,
    substring(e.cwags_number from '^([0-9]{2}-[0-9]{4})-[0-9]{2}$') as handler_key_with_year,
    substring(e.cwags_number from '^[0-9]{2}-([0-9]{4})-[0-9]{2}$') as owner_id_middle_four,
    e.entry_status,
    coalesce(e.fees_waived, false) as fees_waived,
    e.waiver_reason,
    coalesce(e.amount_owed, 0) as stored_amount_owed,
    coalesce(e.amount_paid, 0) as stored_amount_paid
  from public.trials t
  join public.entries e on e.trial_id = t.id
  where lower(trim(t.trial_name)) = lower('First CWAGS Scent Trial')
    and lower(trim(e.handler_name)) = lower('Michelle Wieser')
    and lower(trim(e.dog_call_name)) in (lower('Lumi'), lower('Flash'))
),
selection_totals as (
  select
    me.entry_id,
    count(es.id) as total_selections,
    count(es.id) filter (
      where lower(coalesce(es.entry_status, '')) not in ('waitlisted', 'withdrawn')
    ) as billable_selections,
    count(es.id) filter (
      where lower(coalesce(es.entry_status, '')) = 'waitlisted'
    ) as waitlisted_selections,
    count(es.id) filter (
      where lower(coalesce(es.entry_status, '')) = 'withdrawn'
    ) as withdrawn_selections,
    coalesce(sum(coalesce(es.fee, 0)) filter (
      where lower(coalesce(es.entry_status, '')) not in ('waitlisted', 'withdrawn')
    ), 0) as calculated_billable_fee
  from matching_entries me
  left join public.entry_selections es on es.entry_id = me.entry_id
  group by me.entry_id
),
payment_totals as (
  select
    me.entry_id,
    count(pt.id) as payment_count,
    coalesce(sum(pt.amount), 0) as transaction_total
  from matching_entries me
  left join public.entry_payment_transactions pt on pt.entry_id = me.entry_id
  group by me.entry_id
)
select
  me.*,
  st.total_selections,
  st.billable_selections,
  st.waitlisted_selections,
  st.withdrawn_selections,
  st.calculated_billable_fee,
  pt.payment_count,
  pt.transaction_total,
  case
    when st.billable_selections = 0 and pt.payment_count = 0
      then 'CURRENT FINANCIAL LOADER EXCLUDES THIS DOG'
    else 'CURRENT FINANCIAL LOADER INCLUDES THIS DOG'
  end as current_loader_result
from matching_entries me
join selection_totals st on st.entry_id = me.entry_id
join payment_totals pt on pt.entry_id = me.entry_id
order by me.start_date desc, me.dog_call_name;
