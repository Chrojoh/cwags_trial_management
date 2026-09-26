import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getCwagsOwnerKey,
  shouldIncludeEntryInFinancialSummary,
} from './financialRules';

test('groups dogs by registration year and owner digits', () => {
  assert.equal(getCwagsOwnerKey('26-5828-01', 'Michelle Wieser'), 'cwags:26-5828');
  assert.equal(getCwagsOwnerKey('26-5828-02', 'Michelle Wieser'), 'cwags:26-5828');
  assert.notEqual(
    getCwagsOwnerKey('25-5828-01', 'Another Handler'),
    getCwagsOwnerKey('26-5828-01', 'Michelle Wieser')
  );
});

test('retains a confirmed dog with no selections on the financial handler card', () => {
  assert.equal(shouldIncludeEntryInFinancialSummary('confirmed', 0, false), true);
});

test('retains entries with billable selections or payment history', () => {
  assert.equal(shouldIncludeEntryInFinancialSummary('withdrawn', 1, false), true);
  assert.equal(shouldIncludeEntryInFinancialSummary('withdrawn', 0, true), true);
});

test('does not show an inactive empty entry', () => {
  assert.equal(shouldIncludeEntryInFinancialSummary('withdrawn', 0, false), false);
  assert.equal(shouldIncludeEntryInFinancialSummary('no_show', 0, false), false);
});
