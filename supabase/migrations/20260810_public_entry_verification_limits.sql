-- Server-only rate-limit state for anonymous existing-entry verification.
-- Stores only a one-way request key hash and timing/count metadata.

begin;

create table if not exists public.public_entry_verification_limits (
  key_hash text primary key,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.public_entry_verification_limits enable row level security;
revoke all privileges on table public.public_entry_verification_limits from anon, authenticated;

commit;

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  count(p.policyname) as policy_count,
  coalesce(string_agg(g.grantee || ':' || g.privilege_type, ', '), 'none') as client_grants
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
left join information_schema.role_table_grants g
  on g.table_schema = n.nspname
 and g.table_name = c.relname
 and g.grantee in ('anon', 'authenticated')
where n.nspname = 'public'
  and c.relname = 'public_entry_verification_limits'
group by c.relname, c.relrowsecurity;
