---
name: entry_selections redundant substitute columns
description: substitute_dog_name and substitute_handler_name are now redundant after original_entry_id migration
type: project
---

`entry_selections` still has `substitute_dog_name` and `substitute_handler_name` columns that are now redundant.

**Why:** After migrating from `substitute_cwags_number` to `original_entry_id`, any dog/handler info for the original entry can be retrieved by JOINing `entries` on `original_entry_id`. These two columns were a denormalized cache that's no longer needed.

**How to apply:** When there's a cleanup sprint, drop both columns from `entry_selections` in Supabase and remove them from the `database.ts` Row/Insert/Update types. Check `DigitalScoreEntry.tsx` and `live-event/page.tsx` for any remaining references to `substitute_dog_name` / `substitute_handler_name` and replace with a JOIN-sourced value.
