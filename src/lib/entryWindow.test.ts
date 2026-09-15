import assert from 'node:assert/strict';
import test from 'node:test';
import { formatEntryCountdown, getEffectiveEntryStatus } from './entryWindow';

const now = new Date('2026-09-14T18:00:00.000Z');

test('existing unscheduled trials retain their manual status', () => {
  assert.equal(getEffectiveEntryStatus({ entry_status: 'draft' }, now), 'draft');
  assert.equal(getEffectiveEntryStatus({ entry_status: 'open' }, now), 'open');
});

test('a scheduled draft opens automatically at its opening instant', () => {
  assert.equal(getEffectiveEntryStatus({ entry_status: 'draft', entry_open_at: '2026-09-14T18:00:01.000Z' }, now), 'draft');
  assert.equal(getEffectiveEntryStatus({ entry_status: 'draft', entry_open_at: now.toISOString() }, now), 'open');
});

test('manual closure overrides a scheduled opening', () => {
  assert.equal(getEffectiveEntryStatus({ entry_status: 'closed', entry_open_at: '2026-09-01T00:00:00.000Z' }, now), 'closed');
});

test('countdown uses days, hours, minutes, and seconds', () => {
  assert.equal(formatEntryCountdown(90_061_000), '1d 01h 01m 01s');
});
