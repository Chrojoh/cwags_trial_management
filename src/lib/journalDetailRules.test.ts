import assert from 'node:assert/strict';
import test from 'node:test';
import { hasCompleteEntrySnapshot, journalPaymentDate } from './journalDetailRules';

test('only full entry records qualify as historical snapshots', () => {
  assert.equal(hasCompleteEntrySnapshot('entry_created', { classes: [] }), true);
  assert.equal(hasCompleteEntrySnapshot('entry_modified', { after: { classes: [] } }), true);
  assert.equal(hasCompleteEntrySnapshot('payment_received', { amount: 120, classes: [] }), false);
  assert.equal(hasCompleteEntrySnapshot('waitlist_promoted', { fee_added: 20 }), false);
  assert.equal(hasCompleteEntrySnapshot('entry_status_changed', { total_fee: 120 }), false);
});

test('payment date displays as calendar date without timezone-derived hour', () => {
  assert.equal(journalPaymentDate('2026-09-08T12:00:00+00:00'), 'Sep 8, 2026');
  assert.equal(journalPaymentDate('2026-09-08'), 'Sep 8, 2026');
});
