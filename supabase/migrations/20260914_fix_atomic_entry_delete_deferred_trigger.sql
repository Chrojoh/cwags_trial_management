begin;

-- The parent-summary trigger is deferred until transaction commit. During an
-- intentional atomic parent-entry deletion, the parent no longer exists when
-- the selection DELETE event is processed. That is a valid terminal state and
-- must not abort the completed deletion with ENTRY_NOT_FOUND.
create or replace function public.sync_parent_entry_summary_from_selection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if exists (select 1 from public.entries where id = old.entry_id) then
      perform public.recalculate_parent_entry_summary(old.entry_id);
    end if;
    return old;
  end if;

  perform public.recalculate_parent_entry_summary(new.entry_id);
  if tg_op = 'UPDATE' and old.entry_id is distinct from new.entry_id then
    if exists (select 1 from public.entries where id = old.entry_id) then
      perform public.recalculate_parent_entry_summary(old.entry_id);
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_parent_entry_summary_from_selection() from public, anon, authenticated;
grant execute on function public.sync_parent_entry_summary_from_selection() to service_role;

commit;
