begin;

-- INSERT ... RETURNING evaluates the SELECT policy against the new row.  The
-- role helper cannot discover that row through a second table lookup until the
-- insert is visible, so recognize the row owner directly as well.
drop policy if exists trials_trial_team_select on public.trials;

create policy trials_trial_team_select
on public.trials for select to authenticated
using (
  created_by = auth.uid()
  or public.has_trial_role(id, null)
);

commit;

