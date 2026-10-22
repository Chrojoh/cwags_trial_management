-- Roll back the atomic RowCall/Ringside mutation migration.
-- Apply only after deploying the previous API implementation; otherwise live
-- secretary actions will fail because the route calls this function.

revoke all on function public.apply_ringside_secretary_action(uuid, uuid, text, uuid, uuid, uuid, boolean, text, text) from public, anon, authenticated, service_role;
drop function if exists public.apply_ringside_secretary_action(uuid, uuid, text, uuid, uuid, uuid, boolean, text, text);

alter table public.ringside_rings replica identity default;
alter table public.ringside_blocks replica identity default;
alter table public.ringside_entries replica identity default;

drop index if exists public.ringside_actions_ring_request_key_idx;
alter table public.ringside_actions
  drop column if exists result,
  drop column if exists request_key;
