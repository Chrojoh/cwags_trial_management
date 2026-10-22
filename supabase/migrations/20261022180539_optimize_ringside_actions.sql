-- Atomic, idempotent RowCall/Ringside secretary mutations.
-- The API continues to validate the signed, revocable secretary session before
-- calling this function.  This function is SECURITY INVOKER and executable only
-- by service_role so it does not create a browser-callable RLS bypass.

alter table public.ringside_actions
  add column if not exists request_key uuid,
  add column if not exists result jsonb not null default '{}'::jsonb;

create unique index if not exists ringside_actions_ring_request_key_idx
  on public.ringside_actions (ring_id, request_key)
  where request_key is not null;

-- DELETE events need their former relationship keys so filtered subscriptions
-- can identify the owning show/ring/block without an unscoped global listener.
alter table public.ringside_rings replica identity full;
alter table public.ringside_blocks replica identity full;
alter table public.ringside_entries replica identity full;

create or replace function public.apply_ringside_secretary_action(
  p_show_id uuid,
  p_ring_id uuid,
  p_action text,
  p_request_key uuid,
  p_entry_id uuid default null,
  p_block_id uuid default null,
  p_paused boolean default null,
  p_message text default null,
  p_strategy text default null
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_ring public.ringside_rings%rowtype;
  v_entry public.ringside_entries%rowtype;
  v_block public.ringside_blocks%rowtype;
  v_other public.ringside_entries%rowtype;
  v_action_id bigint;
  v_result jsonb;
  v_status text;
  v_order numeric(12,4);
  v_changed_entry_ids uuid[] := '{}'::uuid[];
begin
  if p_request_key is null then
    raise exception using errcode = '22023', message = 'REQUEST_KEY_REQUIRED';
  end if;

  select * into v_ring
  from public.ringside_rings
  where id = p_ring_id and show_id = p_show_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'RING_NOT_FOUND';
  end if;

  insert into public.ringside_actions
    (show_id, ring_id, actor_type, action, request_key, snapshot)
  values
    (p_show_id, p_ring_id, 'secretary', p_action, p_request_key, '{}'::jsonb)
  on conflict (ring_id, request_key) where request_key is not null do nothing
  returning id into v_action_id;

  if v_action_id is null then
    select result into v_result
    from public.ringside_actions
    where ring_id = p_ring_id and request_key = p_request_key;
    return coalesce(v_result, '{}'::jsonb) || jsonb_build_object('duplicate', true);
  end if;

  if p_action = 'ring_state' then
    update public.ringside_rings
    set paused = coalesce(p_paused, false),
        status_message = left(coalesce(p_message, ''), 240),
        updated_at = now()
    where id = p_ring_id
    returning * into v_ring;
    v_result := jsonb_build_object('ring', to_jsonb(v_ring), 'blocks', '[]'::jsonb, 'entries', '[]'::jsonb);

  elsif p_action = 'activate_block' then
    select * into v_block
    from public.ringside_blocks
    where id = p_block_id and ring_id = p_ring_id
    for update;
    if not found then
      raise exception using errcode = 'P0001', message = 'BLOCK_NOT_FOUND';
    end if;

    update public.ringside_blocks
    set status = case when id = p_block_id then 'active' else 'scheduled' end,
        updated_at = now()
    where ring_id = p_ring_id and (status = 'active' or id = p_block_id);
    update public.ringside_rings
    set active_block_id = p_block_id, updated_at = now()
    where id = p_ring_id
    returning * into v_ring;
    v_result := jsonb_build_object(
      'ring', to_jsonb(v_ring),
      'blocks', coalesce((select jsonb_agg(to_jsonb(b) order by b.sequence) from public.ringside_blocks b where b.ring_id = p_ring_id), '[]'::jsonb),
      'entries', '[]'::jsonb
    );

  else
    select e.* into v_entry
    from public.ringside_entries e
    join public.ringside_blocks b on b.id = e.block_id
    where e.id = p_entry_id and b.ring_id = p_ring_id
    for update of e;
    if not found then
      raise exception using errcode = 'P0001', message = 'ENTRY_NOT_FOUND';
    end if;

    update public.ringside_actions set snapshot = to_jsonb(v_entry) where id = v_action_id;

    v_status := case p_action
      when 'check_in' then 'checked_in'
      when 'in_ring' then 'in_ring'
      when 'completed' then 'completed'
      when 'absent' then 'absent'
      when 'scratch' then 'scratched'
      when 'conflict_hold' then 'conflict_hold'
      when 'available' then 'available_waiting_for_secretary'
      else null
    end;

    if v_status is not null then
      v_changed_entry_ids := array[p_entry_id];
      if p_action = 'in_ring' then
        -- Serialize the queue transition and clear any previous in-ring dog in
        -- this ring in the same transaction as the new assignment and audit.
        perform e.id
        from public.ringside_entries e
        join public.ringside_blocks b on b.id = e.block_id
        where b.ring_id = p_ring_id and e.status = 'in_ring'
        order by e.id
        for update of e;

        select coalesce(array_agg(e.id order by e.id), '{}'::uuid[]) || array[p_entry_id]
        into v_changed_entry_ids
        from public.ringside_entries e
        join public.ringside_blocks b on b.id = e.block_id
        where b.ring_id = p_ring_id and e.status = 'in_ring';

        update public.ringside_entries e
        set status = 'checked_in', completed_at = null, updated_at = now()
        from public.ringside_blocks b
        where b.id = e.block_id
          and b.ring_id = p_ring_id
          and e.id <> p_entry_id
          and e.status = 'in_ring';

        update public.ringside_rings
        set active_block_id = v_entry.block_id, updated_at = now()
        where id = p_ring_id
        returning * into v_ring;
      end if;

      update public.ringside_entries
      set status = v_status,
          entered_ring_at = case when p_action = 'in_ring' then now() else entered_ring_at end,
          completed_at = case when p_action = 'completed' then now() when p_action = 'in_ring' then null else completed_at end,
          conflict_declared_at = case when p_action = 'conflict_hold' then now() else conflict_declared_at end,
          updated_at = now()
      where id = p_entry_id;

    elsif p_action in ('move_up', 'move_down', 'move_end') then
      v_changed_entry_ids := array[p_entry_id];
      perform id from public.ringside_entries where block_id = v_entry.block_id order by id for update;
      if p_action = 'move_end' then
        select coalesce(max(running_order), 0) + 1 into v_order
        from public.ringside_entries where block_id = v_entry.block_id;
        update public.ringside_entries set running_order = v_order, updated_at = now() where id = p_entry_id;
      else
        select * into v_other
        from public.ringside_entries
        where block_id = v_entry.block_id
          and id <> p_entry_id
          and (case when p_action = 'move_up' then running_order < v_entry.running_order else running_order > v_entry.running_order end)
        order by case when p_action = 'move_up' then running_order end desc,
                 case when p_action = 'move_down' then running_order end asc
        limit 1;
        if found then
          v_changed_entry_ids := v_changed_entry_ids || v_other.id;
          update public.ringside_entries set running_order = v_other.running_order, updated_at = now() where id = v_entry.id;
          update public.ringside_entries set running_order = v_entry.running_order, updated_at = now() where id = v_other.id;
        end if;
      end if;

    elsif p_action = 'restore' then
      v_changed_entry_ids := array[p_entry_id];
      if p_strategy not in ('next', 'after_current', 'end') then
        raise exception using errcode = '22023', message = 'INVALID_RESTORE_STRATEGY';
      end if;
      perform id from public.ringside_entries where block_id = v_entry.block_id order by id for update;
      if p_strategy = 'end' then
        select coalesce(max(running_order), 0) + 1 into v_order
        from public.ringside_entries
        where block_id = v_entry.block_id
          and status not in ('completed','scratched','absent','conflict_hold','available_waiting_for_secretary');
      elsif p_strategy = 'after_current' then
        select running_order + 0.5 into v_order
        from public.ringside_entries
        where block_id = v_entry.block_id and status = 'in_ring'
        order by running_order limit 1;
      end if;
      if v_order is null then
        select coalesce(min(running_order) - 0.5, 1) into v_order
        from public.ringside_entries
        where block_id = v_entry.block_id
          and status not in ('completed','scratched','absent','conflict_hold','available_waiting_for_secretary')
          and status <> 'in_ring';
      end if;
      update public.ringside_entries
      set status = 'waiting', running_order = v_order,
          conflict_reason = '', conflict_other_ring = '', conflict_return_note = '',
          updated_at = now()
      where id = p_entry_id;
    else
      raise exception using errcode = '22023', message = 'UNKNOWN_ACTION';
    end if;

    select * into v_ring from public.ringside_rings where id = p_ring_id;
    v_result := jsonb_build_object(
      'ring', to_jsonb(v_ring),
      'blocks', '[]'::jsonb,
      'entries', coalesce((
        select jsonb_agg(to_jsonb(e) order by e.running_order, e.original_running_order)
        from public.ringside_entries e
        where e.id = any(v_changed_entry_ids)
      ), '[]'::jsonb)
    );
  end if;

  update public.ringside_actions set result = v_result where id = v_action_id;
  return v_result || jsonb_build_object('duplicate', false);
end;
$$;

revoke all on function public.apply_ringside_secretary_action(uuid, uuid, text, uuid, uuid, uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function public.apply_ringside_secretary_action(uuid, uuid, text, uuid, uuid, uuid, boolean, text, text) to service_role;
