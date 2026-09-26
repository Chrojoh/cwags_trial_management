-- PERMANENTLY DELETE the Proposed test trial and all of its associated data.
-- Run this entire script in the Supabase SQL Editor as postgres.
-- This operation is intentionally destructive and cannot be undone.

begin;

-- Hard safety gate: both the immutable UUID and expected name must match.
do $$
declare
  v_name text;
  v_entries integer;
  v_selections integer;
  v_scores integer;
  v_payments integer;
  v_journal integer;
begin
  select trial_name
    into v_name
  from public.trials
  where id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid
  for update;

  if not found then
    raise exception 'SAFETY STOP: trial 302649db-5c0c-48a9-bde1-2a70789ab089 was not found.';
  end if;

  if lower(trim(v_name)) <> 'proposed' then
    raise exception 'SAFETY STOP: expected trial name Proposed, but found %.', v_name;
  end if;

  select count(*) into v_entries
  from public.entries
  where trial_id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid;

  select count(*) into v_selections
  from public.entry_selections es
  join public.entries e on e.id = es.entry_id
  where e.trial_id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid;

  select count(*) into v_scores
  from public.scores s
  join public.entry_selections es on es.id = s.entry_selection_id
  join public.entries e on e.id = es.entry_id
  where e.trial_id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid;

  select count(*) into v_payments
  from public.entry_payment_transactions payment
  join public.entries e on e.id = payment.entry_id
  where e.trial_id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid;

  select count(*) into v_journal
  from public.trial_activity_log
  where trial_id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid;

  raise notice
    'Deleting trial "%": % entries, % selections, % scores, % payments, % journal records.',
    v_name, v_entries, v_selections, v_scores, v_payments, v_journal;
end
$$;

-- Journal rows may retain entry references, so remove the complete trial
-- journal before deleting competitor records.
delete from public.trial_activity_log
where trial_id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid;

delete from public.entry_payment_transactions payment
using public.entries entry
where payment.entry_id = entry.id
  and entry.trial_id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid;

delete from public.scores score
using public.entry_selections selection, public.entries entry
where score.entry_selection_id = selection.id
  and selection.entry_id = entry.id
  and entry.trial_id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid;

-- Parent-summary and journal triggers are inappropriate during complete trial
-- destruction and can raise ENTRY_NOT_FOUND after their parent is removed.
-- Trigger state is restored before the transaction continues. Any error rolls
-- back both the data changes and trigger state automatically.
alter table public.entry_selections disable trigger user;

delete from public.entry_selections selection
using public.entries entry
where selection.entry_id = entry.id
  and entry.trial_id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid;

alter table public.entry_selections enable trigger user;

delete from public.entries
where trial_id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid;

-- Remaining trial-owned setup records are defined with cascading foreign keys.
delete from public.trials
where id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid
  and lower(trim(trial_name)) = 'proposed';

do $$
begin
  if exists (
    select 1
    from public.trials
    where id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid
  ) then
    raise exception 'DELETE FAILED: the trial still exists; the entire transaction will be rolled back.';
  end if;

  if exists (
    select 1
    from public.entries
    where trial_id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid
  ) then
    raise exception 'DELETE FAILED: one or more trial entries remain; the entire transaction will be rolled back.';
  end if;
end
$$;

commit;

select jsonb_build_object(
  'status', 'TRIAL PERMANENTLY DELETED',
  'trial_id', '302649db-5c0c-48a9-bde1-2a70789ab089',
  'trial_exists', exists (
    select 1
    from public.trials
    where id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid
  ),
  'remaining_entries', (
    select count(*)
    from public.entries
    where trial_id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid
  )
) as result;
