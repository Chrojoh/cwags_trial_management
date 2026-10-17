begin;

create table if not exists public.obedience_class_plan_revisions (
  id uuid primary key default gen_random_uuid(),
  trial_id uuid not null references public.trials(id) on delete cascade,
  trial_round_id uuid not null references public.trial_rounds(id) on delete cascade,
  ruleset_id text not null,
  level integer not null check (level between 1 and 5),
  judge_name text not null,
  status text not null check (status in ('draft', 'submitted', 'finalized')),
  revision integer not null check (revision > 0),
  plan jsonb not null,
  ruleset_snapshot jsonb not null,
  validation_issues jsonb not null default '[]'::jsonb,
  supersedes_id uuid references public.obedience_class_plan_revisions(id),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (trial_round_id, revision)
);

create index if not exists obedience_class_plan_trial_idx
  on public.obedience_class_plan_revisions(trial_id, trial_round_id, revision desc);

alter table public.obedience_class_plan_revisions enable row level security;
revoke all on table public.obedience_class_plan_revisions from anon, authenticated;
grant select on table public.obedience_class_plan_revisions to authenticated;

drop policy if exists obedience_plan_team_select on public.obedience_class_plan_revisions;
create policy obedience_plan_team_select
on public.obedience_class_plan_revisions for select to authenticated
using (public.has_trial_role(trial_id, array['secretary', 'assistant', 'read_only']));

comment on table public.obedience_class_plan_revisions is
  'Append-only snapshots of C-Wags Obedience judge class plans. Writes occur through authorized server routes.';

commit;
