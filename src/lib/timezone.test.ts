import assert from 'node:assert/strict';
import test from 'node:test';
import { formatTrialDateTime, getTrialTimezoneLabel } from './timezone';

test('formats UTC entry opening in the selected Pacific trial timezone', () => {
  assert.equal(
    formatTrialDateTime('2026-10-17T02:00:00+00:00', 'America/Vancouver'),
    '2026-10-16 7:00 PM Pacific'
  );
});

test('uses friendly trial timezone labels', () => {
  assert.equal(getTrialTimezoneLabel('America/Edmonton'), 'Mountain');
  assert.equal(getTrialTimezoneLabel('America/Toronto'), 'Eastern');
});
