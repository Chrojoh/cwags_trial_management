import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PDFDocument } from 'pdf-lib';
import { createRallyScoreSheetPdf } from './rallyScoreSheetPdf';

test('creates one Rally PDF page per participant in saved running order', async () => {
  const template = new Uint8Array(readFileSync('public/templates/rally/rally-judge-sheet.pdf'));
  const bytes = await createRallyScoreSheetPdf(
    template,
    [{ id: 'round', class_name: 'Starter Rally', class_type: 'rally', judge_name: 'Judge Example', round_number: 2 }],
    [
      {
        selectionId: 'two', roundId: 'round', handler: 'Second Handler', dog: 'Second Dog',
        registration: '26-1000-02', division: 'B', entryType: 'regular', jumpHeight: '12',
        runningPosition: 2,
      },
      {
        selectionId: 'one', roundId: 'round', handler: 'First Handler', dog: 'First Dog',
        registration: '26-1000-01', division: 'A', entryType: 'feo', jumpHeight: '8',
        runningPosition: 1,
      },
    ],
    'Rally Test Trial',
    '10/14/2026',
  );
  const output = await PDFDocument.load(bytes);
  assert.equal(output.getPageCount(), 2);
  assert.ok(bytes.length > template.length);
});

test('accepts a PDF course map without persisting it outside the generated document', async () => {
  const template = new Uint8Array(readFileSync('public/templates/rally/rally-judge-sheet.pdf'));
  const map = await PDFDocument.create();
  const mapPage = map.addPage([500, 350]);
  mapPage.drawText('START   1   2   3   FINISH', { x: 40, y: 175, size: 18 });
  const bytes = await createRallyScoreSheetPdf(
    template,
    [{ id: 'round', class_name: 'Zoom 1', class_type: 'zoom', judge_name: 'Judge', round_number: 1 }],
    [{
      selectionId: 'one', roundId: 'round', handler: 'Handler', dog: 'Dog',
      registration: '26-1000-01', runningPosition: 1,
    }],
    'Rally Test Trial',
    '10/14/2026',
    {
      round: {
        bytes: new Uint8Array(await map.save()),
        mimeType: 'application/pdf',
        fileName: 'course-map.pdf',
      },
    },
  );
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
});
