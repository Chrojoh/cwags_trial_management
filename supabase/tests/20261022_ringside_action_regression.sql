-- Run only in a disposable/local Supabase database after applying migrations.
-- Every fictional row is enclosed in this transaction and rolled back.

begin;

do $$
declare
  v_user uuid;
begin
  select id into v_user from auth.users order by created_at limit 1;
  if v_user is null then
    raise exception 'This isolated test requires one fixture auth user';
  end if;

  insert into public.trials (
    id, trial_name, club_name, location, start_date, end_date, created_by,
    trial_status, premium_published, entries_open, entry_timezone,
    max_entries_per_day, trial_secretary, secretary_email, fee_configuration
  ) values (
    '10000000-0000-4000-8000-000000000001', 'Fictional RowCall Test',
    'Fictional Club', 'Test Hall', current_date, current_date, v_user,
    'draft', false, false, 'America/Edmonton', 0, 'Test Secretary',
    'nobody@example.invalid', '{}'::jsonb
  );
end $$;

insert into public.ringside_shows
  (id, trial_id, public_show_number, title, status)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'FICTION-ROWCALL', 'Fictional RowCall Test', 'published');

insert into public.ringside_rings
  (id, show_id, ring_number, slug, display_name, display_order)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 1, 'ring-1', 'Ring 1', 1),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 2, 'ring-2', 'Ring 2', 2);

insert into public.ringside_blocks
  (id, ring_id, title, sequence, status)
values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Test Round', 1, 'active'),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Other Ring', 1, 'active');

insert into public.ringside_entries
  (id, block_id, handler_name, dog_name, running_order, original_running_order, status)
values
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Test Handler', 'Current Dog', 1, 1, 'in_ring'),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'Test Handler', 'Next Dog', 2, 2, 'waiting');

-- Successful atomic transition: prior dog, next dog, ring and audit commit together.
select public.apply_ringside_secretary_action(
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'in_ring',
  '60000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000002'
);

do $$
begin
  if (select status from public.ringside_entries where id = '50000000-0000-4000-8000-000000000001') <> 'checked_in'
     or (select status from public.ringside_entries where id = '50000000-0000-4000-8000-000000000002') <> 'in_ring'
     or (select count(*) from public.ringside_actions where request_key = '60000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'Atomic in-ring transition or audit failed';
  end if;
end $$;

-- Repeating the same browser request is idempotent and creates no second audit.
select public.apply_ringside_secretary_action(
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'in_ring',
  '60000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000002'
);

do $$
begin
  if (select count(*) from public.ringside_actions where request_key = '60000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'Repeated request created duplicate audit';
  end if;
end $$;

-- Wrong-ring access fails; the failed transaction leaves no audit reservation.
do $$
begin
  begin
    perform public.apply_ringside_secretary_action(
      '20000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000002',
      'scratch',
      '60000000-0000-4000-8000-000000000002',
      '50000000-0000-4000-8000-000000000002'
    );
    raise exception 'Wrong-ring action unexpectedly succeeded';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'ENTRY_NOT_FOUND' then raise; end if;
  end;
  if exists(select 1 from public.ringside_actions where request_key = '60000000-0000-4000-8000-000000000002') then
    raise exception 'Failed mutation retained an audit row';
  end if;
end $$;

-- Function must remain invoker-security and browser roles must not execute it.
do $$
declare
  v_oid oid := 'public.apply_ringside_secretary_action(uuid,uuid,text,uuid,uuid,uuid,boolean,text,text)'::regprocedure;
begin
  if (select prosecdef from pg_proc where oid = v_oid)
     or has_function_privilege('anon', v_oid, 'execute')
     or has_function_privilege('authenticated', v_oid, 'execute')
     or not has_function_privilege('service_role', v_oid, 'execute') then
    raise exception 'Unexpected RowCall function security grants';
  end if;
end $$;

rollback;
