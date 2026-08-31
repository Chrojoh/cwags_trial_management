import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePlacements, validateManualPlacements } from './placementUtils';

const candidate = (overrides: Record<string, unknown> = {}) => ({
  id: 'one',
  division: 'A',
  entryType: 'regular',
  entryStatus: 'entered',
  passFail: 'Pass',
  numericalScore: 95,
  tieBreakValue: 40,
  ...overrides,
});

test('rally placements sort by score and then fastest time', () => {
  const placements = calculatePlacements(
    [
      candidate({ id: 'slow', tieBreakValue: 45 }),
      candidate({ id: 'fast', tieBreakValue: 42 }),
      candidate({ id: 'lower', numericalScore: 90, tieBreakValue: 30 }),
    ],
  );
  assert.equal(placements.get('fast')?.placement, 1);
  assert.equal(placements.get('slow')?.placement, 2);
  assert.equal(placements.get('lower')?.placement, 3);
});

test('unresolved score ties do not invent a placement', () => {
  const placements = calculatePlacements(
    [candidate({ id: 'one', tieBreakValue: null }), candidate({ id: 'two', tieBreakValue: null })],
  );
  assert.equal(placements.get('one')?.placement, null);
  assert.equal(placements.get('one')?.tieUnresolved, true);
  assert.equal(placements.get('two')?.tieUnresolved, true);
});

test('TO and FEO entries are excluded and junior non-qualifiers may place', () => {
  const placements = calculatePlacements(
    [
      candidate({ id: 'to', division: 'TO', numericalScore: 100 }),
      candidate({ id: 'feo', entryType: 'feo', numericalScore: 100 }),
      candidate({ id: 'jr', division: 'JR', passFail: 'Fail', numericalScore: 65 }),
    ],
  );
  assert.equal(placements.get('to')?.placement, null);
  assert.equal(placements.get('feo')?.placement, null);
  assert.equal(placements.get('jr')?.placement, 1);
});

test('manual Games placements must be unique', () => {
  assert.match(
    validateManualPlacements([
      { id: 'one', placement: '1', entryType: 'regular' },
      { id: 'two', placement: '1', entryType: 'regular' },
    ]) || '',
    /more than once/,
  );
});
