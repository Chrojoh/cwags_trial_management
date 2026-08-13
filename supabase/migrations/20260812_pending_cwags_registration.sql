alter table public.entries
  add column if not exists registration_pending boolean not null default false;

create index if not exists entries_pending_registration_lookup_idx
  on public.entries (trial_id, lower(handler_email))
  where registration_pending = true;

comment on column public.entries.registration_pending is
  'True while an entrant is waiting for an official C-WAGS registration number.';
