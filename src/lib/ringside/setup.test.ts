import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rowCallNumberForTrial, rowCallShowValues } from './setup';

const trial = {
  id: 'bdc6b3c0-a667-4e6c-8777-b7cd5bf156ab',
  trial_name: 'Fall League',
  location: "Jazz's Training Center",
  start_date: '2026-10-23',
};

describe('RowCall setup values', () => {
  it('derives stable values from the selected trial', () => {
    assert.deepEqual(rowCallShowValues(trial), {
      public_show_number: 'CW-20261023-BDC6B3C0',
      title: 'Fall League',
      show_date: '2026-10-23',
      venue: "Jazz's Training Center",
    });
  });

  it('uses a stable fallback when the trial has no date', () => {
    assert.equal(rowCallNumberForTrial({ ...trial, start_date: null }), 'CW-TRIAL-BDC6B3C0');
  });
});
