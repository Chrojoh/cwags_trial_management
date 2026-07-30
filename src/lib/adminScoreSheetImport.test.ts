import assert from 'node:assert/strict';
import test from 'node:test';
import * as XLSX from 'xlsx';
import { parseScoreSheetWorkbook } from './adminScoreSheetImport';

const workbookBuffer = (sheets: Array<{ name: string; rows: unknown[][] }>) => {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name);
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
};

test('parses one-column sheets and retains non-qualifying outcomes', () => {
  const rows: unknown[][] = [
    ['Summer Trial'],
    ['C-WAGS Club'],
    [], [], [],
    ['Registration', 'Dog', '', 'Date', 'Class', 'Round', 'Result', 'Judge'],
    ['12-3456-78', 'Scout', '', '07/04/2026', 'Patrol 1', 1, 'Pass', 'Jane Judge'],
    ['12-3456-79', 'Finn', '', '07/04/2026', 'Patrol 1', 1, 'NQ', 'Jane Judge'],
    ['12-3456-80', 'Pip', '', '07/04/2026', 'Patrol 1', 1, 'ABS', 'Jane Judge'],
  ];
  const parsed = parseScoreSheetWorkbook(workbookBuffer([{ name: 'Scores', rows }]), 'scores.xlsx');
  assert.equal(parsed.detections[0].type, 'one-column');
  assert.deepEqual(parsed.records.map((record) => record.result), ['Pass', 'NQ', 'ABS']);
});

test('parses two-column sheets as separate rounds', () => {
  const rows: unknown[][] = [[], [], [], [], [],
    ['Registration', 'Dog', '', 'Date', 'Class', 'Result', 'Judge', 'Result', 'Judge'],
    ['12-3456-78', 'Scout', '', '2026-07-04', 'Ranger 1', 'P', 'Judge One', 'F', 'Judge Two'],
  ];
  const parsed = parseScoreSheetWorkbook(workbookBuffer([{ name: 'Scores', rows }]), 'scores.xlsx');
  assert.equal(parsed.detections[0].type, 'two-column');
  assert.deepEqual(parsed.records.map((record) => [record.roundNumber, record.result]), [[1, 'Pass'], [2, 'Fail']]);
});

test('parses league sheets with dates and judges across columns', () => {
  const rows: unknown[][] = [
    ['League Trial'], ['League Club'], ['', '', '', '', '', 'Patrol 1'], [],
    ['', '', '', 'Judge One', 'Judge Two'],
    ['', '', '', '2026-07-04', '2026-07-11'],
    ['12-3456-78', 'Scout', '', 'Pass', 'NQ'],
  ];
  const parsed = parseScoreSheetWorkbook(workbookBuffer([{ name: 'Patrol', rows }]), 'league.xlsx');
  assert.equal(parsed.detections[0].type, 'league');
  assert.deepEqual(parsed.records.map((record) => [record.trialDate, record.roundNumber, record.result]), [
    ['2026-07-04', 1, 'Pass'],
    ['2026-07-11', 2, 'NQ'],
  ]);
});

test('uses Trial Recap B4 as host and excludes recap and directions from scores', () => {
  const directions = Array.from({ length: 8 }, (_, index) =>
    index === 7 ? ['12-0000-01', 'Not a score'] : [`Direction ${index + 1}`]
  );
  const recap = [
    ['Old value that is not the club name'],
    [],
    [],
    ['', 'Current Host Club'],
    [],
    [],
    ['12-0000-02', 'Also not a score'],
  ];
  const scores: unknown[][] = [
    ['Registration'], [], [], [], [],
    ['Registration', 'Dog', '', 'Date', 'Class', 'Round', 'Result', 'Judge'],
    ['12-3456-78', 'Scout', '', '07/04/2026', 'Patrol 1', 1, 'Pass', 'Jane Judge'],
  ];
  const parsed = parseScoreSheetWorkbook(
    workbookBuffer([
      { name: 'Example. Directions_Sheet', rows: directions },
      { name: 'Trial Recap', rows: recap },
      { name: 'Scores', rows: scores },
    ]),
    'Summer Scores.xlsx'
  );
  assert.equal(parsed.clubName, 'Current Host Club');
  assert.equal(parsed.records.length, 1);
  assert.deepEqual(parsed.detections.map((detection) => detection.sheetName), ['Scores']);
});
