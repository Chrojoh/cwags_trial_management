create extension if not exists pgcrypto;

create table if not exists public.ringside_shows (
  id uuid primary key default gen_random_uuid(),
  trial_id uuid not null references public.trials(id) on delete cascade,
  public_show_number text not null unique check (public_show_number ~ '^[A-Za-z0-9-]+$'),
  title text not null,
  show_date date,
  venue text,
  status text not null default 'draft' check (status in ('draft','published','paused','closed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trial_id)
);

create table if not exists public.ringside_rings (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.ringside_shows(id) on delete cascade,
  ring_number integer not null check (ring_number > 0),
  slug text not null,
  display_name text not null default '',
  display_order integer not null,
  active_block_id uuid,
  paused boolean not null default false,
  status_message text not null default '',
  session_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (show_id, ring_number), unique (show_id, slug), unique (show_id, display_order)
);

create table if not exists public.ringside_ring_secrets (
  ring_id uuid primary key references public.ringside_rings(id) on delete cascade,
  pin_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.ringside_blocks (
  id uuid primary key default gen_random_uuid(),
  ring_id uuid not null references public.ringside_rings(id) on delete cascade,
  title text not null,
  judge_name text not null default '',
  sequence integer not null,
  notes text not null default '',
  status text not null default 'scheduled' check (status in ('scheduled','active','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ring_id, sequence)
);

alter table public.ringside_rings drop constraint if exists ringside_rings_active_block_id_fkey;
alter table public.ringside_rings add constraint ringside_rings_active_block_id_fkey
  foreign key (active_block_id) references public.ringside_blocks(id) on delete set null;

create table if not exists public.ringside_entries (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.ringside_blocks(id) on delete cascade,
  registration_number text not null default '',
  handler_name text not null,
  dog_name text not null,
  running_order numeric(12,4) not null,
  original_running_order numeric(12,4) not null,
  notes text not null default '',
  status text not null default 'waiting' check (status in ('waiting','checked_in','in_ring','completed','conflict_hold','available_waiting_for_secretary','absent','scratched')),
  conflict_reason text not null default '',
  conflict_other_ring text not null default '',
  conflict_return_note text not null default '',
  conflict_declared_at timestamptz,
  entered_ring_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.ringside_actions (
  id bigint generated always as identity primary key,
  show_id uuid not null references public.ringside_shows(id) on delete cascade,
  ring_id uuid references public.ringside_rings(id) on delete cascade,
  actor_type text not null check (actor_type in ('administrator','secretary','competitor')),
  action text not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ringside_import_backups (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.ringside_shows(id) on delete cascade,
  created_by uuid references auth.users(id),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists ringside_blocks_ring_sequence_idx on public.ringside_blocks(ring_id, sequence);
create index if not exists ringside_entries_block_order_idx on public.ringside_entries(block_id, running_order);
create index if not exists ringside_entries_registration_idx on public.ringside_entries(lower(registration_number));
create index if not exists ringside_actions_show_created_idx on public.ringside_actions(show_id, created_at desc);

alter table public.ringside_shows enable row level security;
alter table public.ringside_rings enable row level security;
alter table public.ringside_ring_secrets enable row level security;
alter table public.ringside_blocks enable row level security;
alter table public.ringside_entries enable row level security;
alter table public.ringside_actions enable row level security;
alter table public.ringside_import_backups enable row level security;

drop policy if exists ringside_public_shows on public.ringside_shows;
create policy ringside_public_shows on public.ringside_shows for select using (status in ('published','paused','closed'));
drop policy if exists ringside_public_rings on public.ringside_rings;
create policy ringside_public_rings on public.ringside_rings for select using (exists (select 1 from public.ringside_shows s where s.id=show_id and s.status in ('published','paused','closed')));
drop policy if exists ringside_public_blocks on public.ringside_blocks;
create policy ringside_public_blocks on public.ringside_blocks for select using (exists (select 1 from public.ringside_rings r join public.ringside_shows s on s.id=r.show_id where r.id=ring_id and s.status in ('published','paused','closed')));
drop policy if exists ringside_public_entries on public.ringside_entries;
create policy ringside_public_entries on public.ringside_entries for select using (exists (select 1 from public.ringside_blocks b join public.ringside_rings r on r.id=b.ring_id join public.ringside_shows s on s.id=r.show_id where b.id=block_id and s.status in ('published','paused','closed')));

alter publication supabase_realtime add table public.ringside_shows;
alter publication supabase_realtime add table public.ringside_rings;
alter publication supabase_realtime add table public.ringside_blocks;
alter publication supabase_realtime add table public.ringside_entries;
