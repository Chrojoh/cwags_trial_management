# C-WAGS Supabase SQL package — prepared July 20, 2026

These files are for later manual review and execution. Nothing in this package has been run automatically.

## Important

Do not run every file as one batch. Several older migrations may already be installed. Check the live schema and take a full PostgreSQL backup first; spreadsheet exports are not a complete database backup.

## Read-only previews

1. `previews/20260721_trial_collaborators_preview.sql`
2. `migrations/preview_current_trial_parent_summary.sql`

## Collaborator installation

Run `migrations/20260721_trial_collaborators.sql` after reviewing the preview. It is additive and does not backfill existing trials or replace `trials.created_by`. Test first with trial `302649db-5c0c-48a9-bde1-2a70789ab089`.

## Earlier migrations

Confirm each is not already installed before executing:

1. `20260716_atomic_waitlist_promotion.sql`
2. `20260717_parent_entry_status_consistency.sql`
3. `20260718_atomic_financial_operations.sql`
4. `20260719_round_capacity_management.sql`
5. `20260720_journal_2_audit_triggers.sql`

`20260717b_waitlisted_parent_constraint_hotfix.sql` is a retired, comment-only placeholder and performs no operation.

The forward parent-summary logic excludes active trial `b1fb0120-da94-43f3-a561-fe12e7d663a4`, includes testing trial `302649db-5c0c-48a9-bde1-2a70789ab089`, and otherwise applies from August 8, 2026 according to the SQL.

## Separate optional subsystem

`20260720_ringside_online.sql` is a separate feature. Do not run it unless Ringside Online is intentionally being installed.

## RLS warning

This package does not replace the broad existing RLS policies on operational tables. That must be a coordinated later patch after public entry and browser mutation paths are protected. Piecemeal RLS changes can stop entries, Live Event, scoring, payments, waitlists, or journal writes.
