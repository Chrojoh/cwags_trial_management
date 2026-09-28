# Handler Financial and Journal Audit Release Checklist

Use this checklist only after the active trial has finished entering scores and its forms have been submitted.

## Before installation

1. Confirm the production trial has finished data entry.
2. Export the trial summary and financial report.
3. Create a Supabase database backup.
4. Confirm the application release contains commit `43c8810` or its reviewed successor.
5. Confirm no unrelated deployment is in progress.

## Install together

1. Run `20260925_journal_selection_deletions.sql`.
2. Run `20260925_handler_financial_accounts.sql`.
3. Deploy the matching application code immediately after both migrations succeed.
4. Do not deploy the handler-payment API before installing the handler financial migration.

## Read-only verification

Run `20260925_post_install_financial_journal_audit.sql`. Verify:

- all four functions are installed as security-definer routines;
- `anon` and `authenticated` cannot execute them;
- `service_role` can execute them;
- the journal DELETE trigger is installed;
- payment reconciliation reports zero mismatches and zero orphan groups;
- running-order duplicate count is zero.

## Application acceptance tests

1. Open a handler with two dogs and confirm one handler row contains both dogs.
2. Expand the dog list and confirm runs, waitlists, quoted fees, accepted fees, waivers and reduced rates.
3. Record a partial handler payment and refresh.
4. Edit that payment, including a zero-dollar correction.
5. Record and edit a refund without exceeding handler net payments.
6. Waive and unwaive all dogs for one handler.
7. Apply and remove the judge or volunteer rate.
8. Delete one dog from a handler with two dogs and verify the handler payment history remains.
9. Remove a class selection and verify one clear journal change appears.
10. Export the financial workbook and confirm handler contact information and balances.
11. Generate the post-trial readiness report and confirm outstanding balances are counted per handler.

## Rollback

Rollback requires both the database rollback and the previous application release.

1. Deploy the previous application release.
2. Run `20260925_handler_financial_accounts_rollback.sql`.
3. If deletion journal logging must also be disabled, run `20260925_journal_selection_deletions_rollback.sql`.
4. Run the previous release smoke tests.

Do not run a rollback merely because an audit reports old inconsistent data. Investigate and reconcile the affected records first.
