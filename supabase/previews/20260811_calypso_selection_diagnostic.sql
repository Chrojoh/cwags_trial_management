-- READ ONLY: explain why Calypso's Patrol 1 Rounds 2 and 3 remained after
-- the public entry form reported that they were removed.
select
  e.id as entry_id,
  e.submitted_at,
  e.entry_status as parent_entry_status,
  es.id as selection_id,
  tc.class_name,
  tr.round_number,
  es.entry_status as selection_status,
  es.running_position,
  es.fee,
  es.created_at as selection_created_at,
  count(s.id) as score_count,
  jsonb_agg(
    jsonb_build_object(
      'score_id', s.id,
      'result', s.pass_fail,
      'entry_status', s.entry_status,
      'scored_at', s.scored_at
    ) order by s.scored_at
  ) filter (where s.id is not null) as scores
from public.entries e
join public.entry_selections es on es.entry_id = e.id
join public.trial_rounds tr on tr.id = es.trial_round_id
join public.trial_classes tc on tc.id = tr.trial_class_id
left join public.scores s on s.entry_selection_id = es.id
where e.trial_id = '302649db-5c0c-48a9-bde1-2a70789ab089'::uuid
  and e.cwags_number = '25-5428-01'
group by
  e.id,
  e.submitted_at,
  e.entry_status,
  es.id,
  tc.class_name,
  tr.round_number,
  es.entry_status,
  es.running_position,
  es.fee,
  es.created_at
order by e.submitted_at, tc.class_name, tr.round_number, es.created_at;
