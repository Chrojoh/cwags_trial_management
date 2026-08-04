import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculatePassRate,
  hasRecordedResult,
  isAbsentResult,
  isCompletedRegularResult,
  isFailingResult,
  isPassingResult,
} from './resultMetrics';

describe('resultMetrics', () => {
  it('does not count an empty score row as a completed run', () => {
    assert.equal(hasRecordedResult({ pass_fail: null, numerical_score: null }), false);
  });

  it('recognizes numeric and named results', () => {
    assert.equal(hasRecordedResult({ numerical_score: 92 }), true);
    assert.equal(isPassingResult({ pass_fail: 'Pass' }), true);
    assert.equal(isFailingResult({ pass_fail: 'NQ' }), true);
  });

  it('excludes FEO, withdrawn, waitlisted, and absent runs', () => {
    assert.equal(isCompletedRegularResult('entered', 'feo', { pass_fail: 'Pass' }), false);
    assert.equal(isCompletedRegularResult('withdrawn', 'regular', { pass_fail: 'Pass' }), false);
    assert.equal(isCompletedRegularResult('waitlisted', 'regular', { pass_fail: 'Pass' }), false);
    assert.equal(isCompletedRegularResult('entered', 'regular', { pass_fail: 'ABS' }), false);
    assert.equal(isAbsentResult({ entry_status: 'ABS' }), true);
  });

  it('uses passes plus fails as the pass-rate denominator', () => {
    assert.equal(calculatePassRate(8, 2), 80);
    assert.equal(calculatePassRate(0, 0), 0);
  });
});
