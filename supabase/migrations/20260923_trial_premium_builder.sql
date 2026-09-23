create table if not exists public.trial_premiums (
  trial_id uuid primary key references public.trials(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'ready')),
  content jsonb not null default '{}'::jsonb,
  map_image_path text,
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trial_premiums enable row level security;
revoke all on table public.trial_premiums from anon, authenticated;
grant select, insert, update, delete on table public.trial_premiums to authenticated;

drop policy if exists trial_premiums_team_select on public.trial_premiums;
create policy trial_premiums_team_select on public.trial_premiums
for select to authenticated
using (public.has_trial_role(trial_id, array['secretary', 'assistant', 'read_only']));

drop policy if exists trial_premiums_secretary_write on public.trial_premiums;
create policy trial_premiums_secretary_write on public.trial_premiums
for all to authenticated
using (public.has_trial_role(trial_id, array['secretary']))
with check (public.has_trial_role(trial_id, array['secretary']));

comment on table public.trial_premiums is
  'Saved premium-list content and readiness state. Trial setup remains the source of schedule and fee data.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('premium-maps', 'premium-maps', false, 3145728, array['image/png', 'image/jpeg'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No client storage policy is created. Map files are accessed only through
-- permission-checked server routes using the service role.
