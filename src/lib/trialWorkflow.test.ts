import assert from 'node:assert/strict';
import test from 'node:test';
import { TRIAL_WORKFLOW, trialWorkflowHref } from './trialWorkflow';

test('trial workflow follows the secretary lifecycle from setup through audit', () => {
  assert.deepEqual(
    TRIAL_WORKFLOW.map((item) => item.key),
    [
      'details',
      'collaborators',
      'application',
      'copy-entry-link',
      'entries',
      'time-calculator',
      'financials',
      'close-to-titles',
      'live-event',
      'summary',
      'award-confirmations',
      'post-trial-package',
      'journal',
    ]
  );
});

test('workflow routes resolve consistently for every navigation surface', () => {
  const trialId = 'trial-123';
  const summary = TRIAL_WORKFLOW.find((item) => item.key === 'summary');
  const copyLink = TRIAL_WORKFLOW.find((item) => item.key === 'copy-entry-link');

  assert.ok(summary);
  assert.equal(trialWorkflowHref(trialId, summary), '/dashboard/trials/trial-123/summary');
  assert.ok(copyLink);
  assert.equal(trialWorkflowHref(trialId, copyLink), undefined);
});
