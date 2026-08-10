-- Emergency privilege rollback for 20260810_ringside_server_only_grants.sql.
begin;

grant all privileges on table public.ringside_ring_secrets to anon, authenticated;
grant all privileges on table public.ringside_actions to anon, authenticated;
grant all privileges on table public.ringside_import_backups to anon, authenticated;

commit;
