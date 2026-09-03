import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScentPages, SCENT_ROW_HEIGHT, type ScentRound, type ScentLine } from './scentScoreSheetLayout';

const rounds: ScentRound[] = [1,2,3].map((n) => ({ id: `r${n}`, round_number: n, class_id: 'c', class_name: 'Patrol 1', class_type: 'scent', judge_name: 'Judge A', trial_day_id: 'day' }));
const line = (round: number, dog = 'dog'): ScentLine => ({ roundId: `r${round}`, selectionId: `${dog}-r${round}`, entryId: dog, registration: dog, handler: 'Handler', dog });

test('round-2-only dog retains a blank white first row', () => {
  const page = buildScentPages(rounds.slice(0,2), [line(2)])[0];
  assert.equal(page.dogs[0].lines.length, 2);
  assert.equal(page.dogs[0].lines[0], undefined);
  assert.equal(page.dogs[0].lines[1]?.roundId, 'r2');
});
test('third round gets its own page and no fabricated entry', () => {
  const pages = buildScentPages(rounds, [line(1),line(2),line(3)]);
  assert.deepEqual(pages.map((p) => p.rounds.map((r) => r.round_number)), [[1,2],[3]]);
});
test('page breaks never split dog blocks, all selections preserved', () => {
  const lines = Array.from({length: 17}, (_, i) => [line(1,`dog${i}`), line(2,`dog${i}`)]).flat();
  const pages = buildScentPages(rounds.slice(0,2), lines);
  assert.deepEqual(pages.map((p) => p.dogs.length), [8,8,1]);
  assert.equal(pages.flatMap((p) => p.dogs.flatMap((d) => d.lines.filter(Boolean))).length, 34);
  assert.equal(SCENT_ROW_HEIGHT, 40 * 1.25);
});
test('different judges, classes, and days do not combine', () => {
  for (const field of ['judge_name','class_id','trial_day_id'] as const) {
    const changed = [{...rounds[0]}, {...rounds[1], [field]: 'different'}];
    assert.equal(buildScentPages(changed, [line(1),line(2)]).length, 2);
  }
});
