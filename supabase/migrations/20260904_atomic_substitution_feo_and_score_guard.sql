-- Atomic live-event corrections: substitutions, FEO switches, and judge-required scoring.

create or replace function public.recalculate_entry_total_for_live_event(p_entry_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_total numeric; v_entry public.entries%rowtype;
begin
  select * into v_entry from public.entries where id = p_entry_id for update;
  if not found then raise exception using message = 'ENTRY_NOT_FOUND'; end if;
  select coalesce(sum(fee), 0) into v_total from public.entry_selections
   where entry_id = p_entry_id and lower(coalesce(entry_status, '')) not in ('waitlisted','withdrawn');
  update public.entries set total_fee = v_total,
    amount_owed = case when coalesce(v_entry.fees_waived,false) then coalesce(v_entry.amount_paid,0) else v_total end
   where id = p_entry_id;
  return jsonb_build_object('entryId',p_entry_id,'totalFee',v_total);
end $$;

create or replace function public.switch_entry_type_atomic(
  p_trial_id uuid, p_selection_id uuid, p_entry_type text, p_changed_by uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_sel record; v_fee numeric; v_before text; v_summary jsonb; v_user text := 'Administrator';
begin
  if p_entry_type not in ('regular','feo') then raise exception using message='INVALID_ENTRY_TYPE'; end if;
  select es.*, tc.entry_fee, tc.feo_price, tc.feo_available, e.dog_call_name, e.handler_name
    into v_sel from public.entry_selections es join public.entries e on e.id=es.entry_id
    join public.trial_rounds tr on tr.id=es.trial_round_id join public.trial_classes tc on tc.id=tr.trial_class_id
   where es.id=p_selection_id and e.trial_id=p_trial_id for update of es,e;
  if not found then raise exception using message='SELECTION_NOT_FOUND'; end if;
  if p_entry_type='feo' and not coalesce(v_sel.feo_available,false) then raise exception using message='FEO_NOT_AVAILABLE'; end if;
  v_before := v_sel.entry_type;
  v_fee := case when p_entry_type='feo' then coalesce(v_sel.feo_price,round(coalesce(v_sel.entry_fee,0)*0.5)) else coalesce(v_sel.entry_fee,0) end;
  update public.entry_selections set entry_type=p_entry_type, fee=v_fee where id=p_selection_id;
  v_summary := public.recalculate_entry_total_for_live_event(v_sel.entry_id);
  if p_changed_by is not null then select coalesce(nullif(trim(concat_ws(' ',first_name,last_name)),''),'Administrator') into v_user from public.users where id=p_changed_by; end if;
  insert into public.trial_activity_log(trial_id,activity_type,entry_id,snapshot_data,user_id,user_name)
  values(p_trial_id,'entry_type_changed',v_sel.entry_id,jsonb_build_object('selection_id',p_selection_id,'dog_call_name',v_sel.dog_call_name,'handler_name',v_sel.handler_name,'before',v_before,'after',p_entry_type,'fee',v_fee,'financial_status',v_summary),p_changed_by,v_user);
  return jsonb_build_object('selectionId',p_selection_id,'entryType',p_entry_type,'fee',v_fee,'financialStatus',v_summary);
end $$;

create or replace function public.substitute_entry_selection_atomic(
  p_trial_id uuid, p_selection_id uuid, p_new_cwags text, p_changed_by uuid default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_sel record; v_registry record; v_target uuid; v_old_cwags text; v_summary_old jsonb; v_summary_new jsonb; v_user text := 'Administrator';
begin
  select es.*,e.cwags_number,e.dog_call_name,e.handler_name into v_sel
    from public.entry_selections es join public.entries e on e.id=es.entry_id
   where es.id=p_selection_id and e.trial_id=p_trial_id for update of es,e;
  if not found then raise exception using message='SELECTION_NOT_FOUND'; end if;
  if exists(select 1 from public.scores where entry_selection_id=p_selection_id) then raise exception using message='SELECTION_ALREADY_SCORED'; end if;
  v_old_cwags := upper(trim(coalesce(v_sel.cwags_number,''))); p_new_cwags := upper(trim(p_new_cwags));
  if split_part(v_old_cwags,'-',2)='' or split_part(p_new_cwags,'-',2)='' or split_part(v_old_cwags,'-',2)<>split_part(p_new_cwags,'-',2) then raise exception using message='HANDLER_NUMBER_MISMATCH'; end if;
  select * into v_registry from public.cwags_registry where cwags_number=p_new_cwags and is_active=true;
  if not found then raise exception using message='REGISTRY_DOG_NOT_FOUND'; end if;
  select id into v_target from public.entries where trial_id=p_trial_id and cwags_number=p_new_cwags order by created_at limit 1 for update;
  if v_target is null then
    insert into public.entries(trial_id,handler_name,dog_call_name,cwags_number,handler_email,waiver_accepted,total_fee,amount_owed,payment_status,entry_status)
    select p_trial_id,v_registry.handler_name,v_registry.dog_call_name,p_new_cwags,coalesce((select handler_email from public.entries where id=v_sel.entry_id),''),true,0,0,'pending','confirmed'
    returning id into v_target;
  end if;
  update public.entry_selections set entry_id=v_target, original_entry_id=v_sel.entry_id where id=p_selection_id;
  v_summary_old:=public.recalculate_entry_total_for_live_event(v_sel.entry_id); v_summary_new:=public.recalculate_entry_total_for_live_event(v_target);
  if p_changed_by is not null then select coalesce(nullif(trim(concat_ws(' ',first_name,last_name)),''),'Administrator') into v_user from public.users where id=p_changed_by; end if;
  insert into public.trial_activity_log(trial_id,activity_type,entry_id,snapshot_data,user_id,user_name)
  values(p_trial_id,'dog_substitution',v_sel.entry_id,jsonb_build_object('selection_id',p_selection_id,'original_entry_id',v_sel.entry_id,'original_dog_name',v_sel.dog_call_name,'original_handler_name',v_sel.handler_name,'original_cwags',v_old_cwags,'substitute_entry_id',v_target,'substitute_dog_name',v_registry.dog_call_name,'substitute_handler_name',v_registry.handler_name,'substitute_cwags',p_new_cwags,'original_financial_status',v_summary_old,'substitute_financial_status',v_summary_new),p_changed_by,v_user);
  return jsonb_build_object('selectionId',p_selection_id,'substituteEntryId',v_target,'dogName',v_registry.dog_call_name,'handlerName',v_registry.handler_name);
end $$;

create or replace function public.require_assigned_judge_for_score() returns trigger language plpgsql set search_path=public as $$
declare v_judge text;
begin
  select judge_name into v_judge from public.trial_rounds where id=new.trial_round_id;
  if nullif(trim(coalesce(v_judge,'')),'') is null or upper(trim(v_judge)) in ('TBA','TBD','NO JUDGE ASSIGNED') then raise exception using message='JUDGE_REQUIRED_BEFORE_SCORING'; end if;
  return new;
end $$;
drop trigger if exists scores_require_assigned_judge on public.scores;
create trigger scores_require_assigned_judge before insert or update on public.scores for each row execute function public.require_assigned_judge_for_score();

revoke all on function public.recalculate_entry_total_for_live_event(uuid) from public;
revoke all on function public.switch_entry_type_atomic(uuid,uuid,text,uuid) from public;
revoke all on function public.substitute_entry_selection_atomic(uuid,uuid,text,uuid) from public;
grant execute on function public.recalculate_entry_total_for_live_event(uuid) to service_role;
grant execute on function public.switch_entry_type_atomic(uuid,uuid,text,uuid) to service_role;
grant execute on function public.substitute_entry_selection_atomic(uuid,uuid,text,uuid) to service_role;
