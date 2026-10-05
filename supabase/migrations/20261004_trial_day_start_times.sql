-- Optional venue-local start time for each trial day.
-- Existing trial days remain unchanged because the column is nullable.
alter table public.trial_days
  add column if not exists start_time time without time zone;

comment on column public.trial_days.start_time is
  'Optional start time for this trial day in the trial venue local time zone.';
