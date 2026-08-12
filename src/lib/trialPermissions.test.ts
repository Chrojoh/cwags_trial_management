import assert from 'node:assert/strict';
import test from 'node:test';
import { hasTrialPermission } from './trialPermissions';

test('owner and administrator have full trial permissions', () => {
  assert.equal(hasTrialPermission('owner', 'delete_trial'), true);
  assert.equal(hasTrialPermission('administrator', 'manage_collaborators'), true);
});

test('secretary has operational and financial access but cannot manage collaborators or delete', () => {
  assert.equal(hasTrialPermission('secretary', 'manage_waitlist'), true);
  assert.equal(hasTrialPermission('secretary', 'manage_financials'), true);
  assert.equal(hasTrialPermission('secretary', 'manage_collaborators'), false);
  assert.equal(hasTrialPermission('secretary', 'delete_trial'), false);
});

test('assistant and read-only roles remain constrained', () => {
  assert.equal(hasTrialPermission('assistant', 'view_trial'), true);
  assert.equal(hasTrialPermission('assistant', 'manage_entries'), true);
  assert.equal(hasTrialPermission('assistant', 'manage_waitlist'), true);
  assert.equal(hasTrialPermission('assistant', 'manage_running_order'), true);
  assert.equal(hasTrialPermission('assistant', 'score_entries'), true);
  assert.equal(hasTrialPermission('assistant', 'edit_trial'), false);
  assert.equal(hasTrialPermission('assistant', 'manage_financials'), false);
  assert.equal(hasTrialPermission('assistant', 'generate_reports'), false);
  assert.equal(hasTrialPermission('assistant', 'generate_trial_application'), false);
  assert.equal(hasTrialPermission('assistant', 'manage_collaborators'), false);
  assert.equal(hasTrialPermission('assistant', 'delete_trial'), false);
  assert.equal(hasTrialPermission('read_only', 'view_trial'), true);
  assert.equal(hasTrialPermission('read_only', 'edit_trial'), false);
});

test('pending or missing membership cannot be represented as an effective role', () => {
  assert.equal(hasTrialPermission(null, 'view_trial'), false);
});
