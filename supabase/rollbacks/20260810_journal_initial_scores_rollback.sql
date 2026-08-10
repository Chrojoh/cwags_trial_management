-- Restore score journaling to updates only.
begin;

drop trigger if exists journal_score_corrections_trigger on public.scores;
create trigger journal_score_corrections_trigger
after update on public.scores
for each row execute function public.journal_score_corrections();

commit;
