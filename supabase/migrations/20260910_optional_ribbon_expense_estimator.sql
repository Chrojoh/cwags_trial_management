create table if not exists public.trial_ribbon_estimates (
  trial_id uuid primary key references public.trials(id) on delete cascade,
  currency text not null check (currency in ('CAD','USD')),
  currency_overridden boolean not null default false,
  expected_pass_rate numeric not null default 50 check (expected_pass_rate between 0 and 100),
  questionnaire jsonb not null default '{}'::jsonb,
  confirmed_awards jsonb not null default '[]'::jsonb,
  dismissed_awards jsonb not null default '[]'::jsonb,
  shipping_estimate numeric not null default 0,
  tax_estimate numeric not null default 0,
  expense_id uuid references public.trial_expenses(id) on delete set null,
  price_source text not null default 'Centaur 2026 Price List',
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.trial_ribbon_estimates
  add column if not exists dismissed_awards jsonb not null default '[]'::jsonb;

alter table public.trial_ribbon_estimates enable row level security;
revoke all on table public.trial_ribbon_estimates from anon, authenticated;
grant select, insert, update, delete on table public.trial_ribbon_estimates to authenticated;

drop policy if exists ribbon_estimate_trial_team_select on public.trial_ribbon_estimates;
create policy ribbon_estimate_trial_team_select on public.trial_ribbon_estimates for select to authenticated
using (public.has_trial_role(trial_id, null));

drop policy if exists ribbon_estimate_trial_team_write on public.trial_ribbon_estimates;
create policy ribbon_estimate_trial_team_write on public.trial_ribbon_estimates for all to authenticated
using (public.has_trial_role(trial_id, array['secretary', 'assistant']))
with check (public.has_trial_role(trial_id, array['secretary', 'assistant']));

comment on table public.trial_ribbon_estimates is
  'Optional Centaur price-list ribbon estimates. Exact receipts replace the linked estimate expense.';

create table if not exists public.club_ribbon_profiles (
  club_key text primary key,
  club_name text not null,
  questionnaire jsonb not null default '{}'::jsonb,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.club_ribbon_profiles enable row level security;
revoke all on table public.club_ribbon_profiles from anon, authenticated;

comment on table public.club_ribbon_profiles is
  'Reusable ribbon and rosette choices copied into new estimates for trials hosted by the same normalized club name.';
