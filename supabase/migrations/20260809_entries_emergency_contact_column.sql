-- Add the trial-entry emergency contact expected by the entry form and
-- Journal 2 entry-edit trigger. Additive only: no existing rows are updated.

alter table public.entries
  add column if not exists emergency_contact text;

comment on column public.entries.emergency_contact is
  'Emergency contact captured for this specific trial entry.';
