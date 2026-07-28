import assert from 'node:assert/strict';
import test from 'node:test';
import type { Judge } from '@/types/judge';
import {
  getJudgeAssignmentStatus,
  getQualifiedJudges,
  nextComboboxIndex,
  searchJudges,
} from './judgeSelector';

const judge = (overrides: Partial<Judge>): Judge => ({
  id: crypto.randomUUID(),
  name: 'Alex Example',
  email: 'alex@example.test',
  city: 'Calgary',
  province_state: 'AB',
  country: 'Canada',
  obedience_levels: [],
  rally_levels: [],
  games_levels: [],
  scent_levels: [],
  is_active: true,
  ...overrides,
});

test('filters by exact class certification, not the broader discipline', () => {
  const patrol = judge({ name: 'Pat Rol', scent_levels: ['Patrol 1'] });
  const detective = judge({ name: 'Dee Tective', scent_levels: ['Detective 2'] });
  assert.deepEqual(getQualifiedJudges([detective, patrol], 'Patrol 1'), [patrol]);
});

test('filters exact rally levels independently', () => {
  const starter = judge({ name: 'Sam Starter', rally_levels: ['Starter', 'Advanced'] });
  const pro = judge({ name: 'Perry Pro', rally_levels: ['Pro'] });
  assert.deepEqual(getQualifiedJudges([starter, pro], 'Pro'), [pro]);
});

test('inactive and no-longer-certified historical assignments retain explicit statuses', () => {
  assert.equal(
    getJudgeAssignmentStatus(judge({ is_active: false, scent_levels: ['Patrol 1'] }), 'Patrol 1'),
    'inactive'
  );
  assert.equal(
    getJudgeAssignmentStatus(judge({ scent_levels: ['Detective 2'] }), 'Patrol 1'),
    'not_certified'
  );
});

test('search matches name, location, and exact certification immediately', () => {
  const result = judge({ name: 'Jordan Smith', city: 'Edmonton', scent_levels: ['Patrol 1'] });
  assert.deepEqual(searchJudges([result], 'edmon', 'Patrol 1'), [result]);
  assert.deepEqual(searchJudges([result], 'patrol', 'Patrol 1'), [result]);
});

test('keyboard navigation wraps in both directions', () => {
  assert.equal(nextComboboxIndex('ArrowDown', -1, 3), 0);
  assert.equal(nextComboboxIndex('ArrowDown', 2, 3), 0);
  assert.equal(nextComboboxIndex('ArrowUp', 0, 3), 2);
  assert.equal(nextComboboxIndex('ArrowUp', -1, 3), 2);
});
