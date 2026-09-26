import assert from 'node:assert/strict';
import test from 'node:test';

import { dedupeSelectionDeletionAudits } from './journalActivityDedup';

const classes = [{ name: 'Patrol 1', round: 1, day_number: 1, fee: 20 }];

test('keeps the database deletion audit when application logging is absent', () => {
  const audit = {
    id: 'trigger',
    entry_id: 'entry',
    activity_type: 'entry_modified',
    created_at: '2026-09-25T18:00:00Z',
    snapshot_data: { operation: 'selection_delete', after: { classes } },
  };
  assert.deepEqual(dedupeSelectionDeletionAudits([audit]), [audit]);
});

test('hides only an equivalent trigger audit followed by an application audit', () => {
  const triggerAudit = {
    id: 'trigger',
    entry_id: 'entry',
    activity_type: 'entry_modified',
    created_at: '2026-09-25T18:00:00Z',
    snapshot_data: { operation: 'selection_delete', after: { classes } },
  };
  const applicationAudit = {
    id: 'application',
    entry_id: 'entry',
    activity_type: 'entry_modified',
    created_at: '2026-09-25T18:00:02Z',
    snapshot_data: { before: { classes: [...classes, { name: 'Ranger 1', round: 1 }] }, after: { classes } },
  };
  assert.deepEqual(dedupeSelectionDeletionAudits([triggerAudit, applicationAudit]), [applicationAudit]);
});

test('does not hide audits for different resulting selections', () => {
  const triggerAudit = {
    id: 'trigger',
    entry_id: 'entry',
    activity_type: 'entry_modified',
    created_at: '2026-09-25T18:00:00Z',
    snapshot_data: { operation: 'selection_delete', after: { classes } },
  };
  const unrelatedAudit = {
    id: 'application',
    entry_id: 'entry',
    activity_type: 'entry_modified',
    created_at: '2026-09-25T18:00:02Z',
    snapshot_data: { after: { classes: [] } },
  };
  assert.equal(dedupeSelectionDeletionAudits([triggerAudit, unrelatedAudit]).length, 2);
});
