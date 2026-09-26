import assert from 'node:assert/strict';
import test from 'node:test';

import {
  financialOwnerLabel,
  resolveFinancialOwnerKeys,
} from './financialOwnerIdentity';

test('groups registered dogs by YY-OOOO', () => {
  const keys = resolveFinancialOwnerKeys([
    { id: 'flash', cwags_number: '26-5828-01', handler_name: 'Michelle Wieser' },
    { id: 'lumi', cwags_number: '26-5828-02', handler_name: 'Michelle Wieser' },
  ]);
  assert.equal(keys.get('flash'), 'cwags:26-5828');
  assert.equal(keys.get('lumi'), 'cwags:26-5828');
});

test('uses registration year as a collision failsafe', () => {
  const keys = resolveFinancialOwnerKeys([
    { id: 'older', cwags_number: '25-5828-01', handler_name: 'Older Handler' },
    { id: 'newer', cwags_number: '26-5828-01', handler_name: 'Newer Handler' },
  ]);
  assert.notEqual(keys.get('older'), keys.get('newer'));
});

test('joins a pending dog to a registered dog with the same verified identity', () => {
  const shared = {
    handler_name: 'Handler Example',
    handler_email: 'handler@example.com',
    handler_phone: '(999) 123-4567',
  };
  const keys = resolveFinancialOwnerKeys([
    { id: 'registered', cwags_number: '26-1234-01', ...shared },
    { id: 'pending', cwags_number: 'PENDING-abc', ...shared },
  ]);
  assert.equal(keys.get('registered'), 'cwags:26-1234');
  assert.equal(keys.get('pending'), 'cwags:26-1234');
});

test('does not expose pending contact information in the owner label', () => {
  assert.equal(financialOwnerLabel('identity:private@example.com|9991234567|name'), 'Pending registration');
});
