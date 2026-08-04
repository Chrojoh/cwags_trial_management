import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { mapTrialApplicationData } from './mapper';
import { fittedFontSize, fitTextLines, renderTrialApplicationPdf, safeApplicationFilename, surfaceLines } from './renderer';
import { PDFDocument } from 'pdf-lib';

const trial = {
  id: 'trial-1', club_name: 'Example Host', location: 'Arena, Calgary, AB, Canada',
  start_date: '2026-08-02', end_date: '2026-08-03', trial_secretary: 'Casey Secretary',
  secretary_email: 'casey@example.test', secretary_phone: '', created_at: '2026-07-01T12:00:00Z',
};
const days = [{
  day_number: 2, trial_date: '2026-08-03', trial_classes: [{
    id: 'class-1', class_name: 'Investigator 3', class_type: 'scent', class_order: 2,
    trial_rounds: [
      { id: 'parent', round_number: 4, judge_name: 'Primary Judge', has_reset: true, reset_judge_name: 'Reset Judge', is_reset: false },
      { id: 'reset', round_number: 4.5, judge_name: 'Reset Judge', has_reset: false, is_reset: true },
    ],
  }],
}, { day_number: 1, trial_date: '2026-08-02', trial_classes: [] }];

test('maps chronological days and existing reset exactly once', () => {
  const data = mapTrialApplicationData(trial, days);
  assert.deepEqual(data.trialDates, ['2026-08-02', '2026-08-03']);
  assert.equal(data.schedule.filter((row) => row.isReset).length, 1);
  assert.equal(data.schedule.find((row) => row.isReset)?.roundNumber, 4.5);
  assert.equal(data.scent?.resetsOffered, true);
});

test('does not infer resets from multiple ordinary rounds', () => {
  const ordinary = structuredClone(days);
  ordinary[0].trial_classes![0].trial_rounds = [
    { id: 'one', round_number: 1, judge_name: 'A', has_reset: false, is_reset: false },
    { id: 'two', round_number: 2, judge_name: 'B', has_reset: false, is_reset: false },
  ];
  const data = mapTrialApplicationData(trial, ordinary);
  assert.equal(data.schedule.some((row) => row.isReset), false);
  assert.equal(data.scent?.resetsOffered, false);
});

test('application-only reset override completes preview without silently changing stored data', () => {
  const incomplete = structuredClone(days);
  incomplete[0].trial_classes![0].trial_rounds = [
    { id: 'parent', round_number: 4, judge_name: 'Primary Judge', has_reset: true, reset_judge_name: undefined, is_reset: false },
  ];
  const data = mapTrialApplicationData(trial, incomplete, { resetJudgeOverrides: { parent: { judgeName: 'Qualified Judge' } } });
  assert.equal(data.missingRequired.includes('Reset setup'), false);
  assert.equal(data.schedule.find((row) => row.isReset)?.judgeName, 'Qualified Judge');
  assert.equal(incomplete[0].trial_classes![0].trial_rounds.length, 1);
});

test('shrinks long text to the minimum needed for its mapped box', () => {
  const font = { widthOfTextAtSize: (text: string, size: number) => text.length * size };
  assert.equal(fittedFontSize('1234567890', font, 50, 10, 5), 5);
  assert.equal(fittedFontSize('short', font, 100, 10, 5), 10);
});

test('wraps a long judge list into at most two lines before shrinking excessively', () => {
  const font = { widthOfTextAtSize: (text: string, size: number) => text.length * size * 0.45 };
  const names = Array.from({ length: 12 }, (_, index) => `Judge ${index + 1}`).join(', ');
  const fitted = fitTextLines(names, font, 180, 2, 9.5, 5);
  assert.equal(fitted.lines.length, 2);
  assert.equal(fitted.truncated, false);
  assert.ok(fitted.lines.join(', ').includes('Judge 12'));
});

test('stacks up to four ring surfaces in entered order', () => {
  assert.deepEqual(surfaceLines('pavement, gravel; rubber mats\ngrass'), [
    'pavement',
    'gravel',
    'rubber mats',
    'grass',
  ]);
  assert.deepEqual(surfaceLines('one, two, three, four, five'), ['one', 'two', 'three', 'four']);
});

test('sanitizes generated filenames', () => {
  assert.equal(safeApplicationFilename('Club / Host: One', '2026-08-02'), 'CWAGS_Trial_Application_Club_Host_One_2026-08-02.pdf');
});

test('rendering does not mutate the source template', async () => {
  const templatePath = 'public/templates/cwags-scent-trial-application-2026.pdf';
  const before = createHash('sha256').update(await readFile(templatePath)).digest('hex');
  const data = mapTrialApplicationData(trial, days, {
    contactPhone: '555-0100', insuranceExpirationDate: '2027-01-01', venueSetting: 'inside',
    surface: 'Mats', numberOfSearchAreas: 2, advocateNames: ['Advocate One'],
  });
  await renderTrialApplicationPdf(data, false);
  const after = createHash('sha256').update(await readFile(templatePath)).digest('hex');
  assert.equal(after, before);
});

test('uses the supplied continuation page when schedule rows exceed page one', async () => {
  const manyDays = [{
    day_number: 1,
    trial_date: '2026-08-02',
    trial_classes: Array.from({ length: 11 }, (_, index) => ({
      id: `class-${index}`,
      class_name: `Games ${index + 1}`,
      class_type: 'games',
      class_order: index,
      trial_rounds: [{ id: `round-${index}`, round_number: 1, judge_name: 'Judge One', is_reset: false }],
    })),
  }];
  const data = mapTrialApplicationData(trial, manyDays);
  const output = await PDFDocument.load(await renderTrialApplicationPdf(data, true));
  assert.equal(output.getPageCount(), 2);
});
