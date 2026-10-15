import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PDFDocument } from 'pdf-lib';
import { createDisciplineScoreSheetPdf } from './disciplineScoreSheetPdf';

test('uses one official Obedience page per participant and ignores extra template pages', async () => {
  const levelTwo = new Uint8Array(readFileSync('public/templates/obedience-pdf/level-2.pdf'));
  const bytes = await createDisciplineScoreSheetPdf(
    [{ id: 'o2', class_name: 'Obedience 2', class_type: 'obedience', judge_name: 'Judge', round_number: 1 }],
    [
      { selectionId: '1', roundId: 'o2', handler: 'A', dog: 'One', registration: '26-1000-01', runningPosition: 1 },
      { selectionId: '2', roundId: 'o2', handler: 'B', dog: 'Two', registration: '26-1000-02', runningPosition: 2 },
    ],
    'Test Trial',
    '10/14/2026',
    { 2: levelTwo },
  );
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 2);
});

test('creates one host Games page per participant', async () => {
  const bytes = await createDisciplineScoreSheetPdf(
    [{ id: 'g', class_name: 'Games 1', class_type: 'games', games_subclass: 'BJ', judge_name: 'Judge', round_number: 1 }],
    [{ selectionId: '1', roundId: 'g', handler: 'A', dog: 'One', registration: '26-1000-01', runningPosition: 1 }],
    'Test Trial',
    '10/14/2026',
    {},
  );
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
});

test('keeps the complete taller Level 5 form on one participant page', async () => {
  const levelFive = new Uint8Array(readFileSync('public/templates/obedience-pdf/level-5.pdf'));
  const bytes = await createDisciplineScoreSheetPdf(
    [{ id: 'o5', class_name: 'Obedience 5', class_type: 'obedience', judge_name: 'Judge', round_number: 1 }],
    [{ selectionId: '1', roundId: 'o5', handler: 'Handler', dog: 'Dog', registration: '26-1000-01', runningPosition: 1 }],
    'Test Trial',
    '10/14/2026',
    { 5: levelFive },
  );
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
});
