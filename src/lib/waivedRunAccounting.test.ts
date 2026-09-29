import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateNetWaivedAmount,
  calculateWaivedRegularCwagsCost,
  summarizeRunAccounting,
} from './waivedRunAccounting';

test('separates paid, waived, regular, and FEO run buckets', () => {
  const summary = summarizeRunAccounting([
    { regular_runs: 3, feo_runs: 1, waived_regular_runs: 0, waived_feo_runs: 0 },
    { regular_runs: 0, feo_runs: 0, waived_regular_runs: 2, waived_feo_runs: 4 },
  ]);

  assert.deepEqual(summary, {
    paidRegularRuns: 3,
    paidFeoRuns: 1,
    waivedRegularRuns: 2,
    waivedFeoRuns: 4,
    allRegularRuns: 5,
  });
});

test('calculates fully and partially waived values without losing mixed handlers', () => {
  assert.equal(
    calculateNetWaivedAmount({ waived_amount: 100, amount_owed: 0, amount_paid: 0 }),
    100
  );
  assert.equal(
    calculateNetWaivedAmount({ waived_amount: 40, amount_owed: 60, amount_paid: 60 }),
    40
  );
  assert.equal(
    calculateNetWaivedAmount({ waived_amount: 40, amount_owed: 60, amount_paid: 75 }),
    25
  );
});

test('charges C-WAGS only for waived regular runs', () => {
  const summary = summarizeRunAccounting([
    { waived_regular_runs: 2, waived_feo_runs: 7 },
  ]);

  assert.equal(calculateWaivedRegularCwagsCost(summary, 1.75), 3.5);
});

test('treats missing, negative, and invalid run values as zero', () => {
  const summary = summarizeRunAccounting([
    { regular_runs: undefined, waived_regular_runs: -2 },
    { feo_runs: Number.NaN, waived_feo_runs: null },
  ]);

  assert.deepEqual(summary, {
    paidRegularRuns: 0,
    paidFeoRuns: 0,
    waivedRegularRuns: 0,
    waivedFeoRuns: 0,
    allRegularRuns: 0,
  });
  assert.equal(calculateWaivedRegularCwagsCost(summary, -1), 0);
});
