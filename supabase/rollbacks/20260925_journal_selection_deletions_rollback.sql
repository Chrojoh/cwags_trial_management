-- Emergency rollback for 20260925_journal_selection_deletions.sql.
-- This stops future deletion audit cards. Existing journal history is retained.

begin;

drop trigger if exists journal_selection_deletions_trigger
  on public.entry_selections;
drop function if exists public.journal_selection_deletions();

commit;

select trigger_name, event_manipulation, action_timing
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'entry_selections'
order by trigger_name;
