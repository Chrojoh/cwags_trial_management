-- Journal the initial score save as well as later corrections.
begin;

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
  v_before jsonb;
begin
  if tg_op = 'UPDATE'
     and (to_jsonb(old) - array['scored_at']) is not distinct from
         (to_jsonb(new) - array['scored_at']) then
    return new;
  end if;

  v_before := case when tg_op = 'INSERT' then null else to_jsonb(old) end;

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
      'operation', lower(tg_op),
      'score_id', new.id,
      'selection_id', new.entry_selection_id,
      'handler_name', v_handler_name,
      'dog_call_name', v_dog_call_name,
      'cwags_number', v_cwags_number,
      'before', v_before,
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
after insert or update on public.scores
for each row execute function public.journal_score_corrections();

commit;

select
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid) as definition
from pg_trigger t
where t.tgrelid = 'public.scores'::regclass
  and t.tgname = 'journal_score_corrections_trigger'
  and not t.tgisinternal;
