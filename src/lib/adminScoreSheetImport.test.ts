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
    ['12-3456-81', 'Dash', '', '07/04/2026', 'Patrol 1', 1, '-', 'Jane Judge'],
  ];
  const parsed = parseScoreSheetWorkbook(workbookBuffer([{ name: 'Scores', rows }]), 'scores.xlsx');
  assert.equal(parsed.detections[0].type, 'one-column');
  assert.deepEqual(parsed.records.map((record) => record.result), ['Pass', 'NQ', 'ABS']);
  assert.equal(parsed.warnings.some((warning) => warning.includes('12-3456-81')), false);
  assert.equal(parsed.warnings.some((warning) => warning.includes('unrecognized result "-"')), false);
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

test('imports qualifying Rally, Obedience, and Obedience 5 numerical scores', () => {
  const rows: unknown[][] = [[], [], [], [], [],
    ['Registration', 'Dog', '', 'Date', 'Class', 'Result', 'Judge', 'Result', 'Judge'],
    ['12-3456-78', 'Scout', '', '2026-07-04', 'Starter', 71, 'Judge One', 97, 'Judge Two'],
    ['12-3456-79', 'Finn', '', '2026-07-04', 'Obedience 5', 120, 'Judge One', 150, 'Judge Two'],
    ['12-3456-80', 'Pip', '', '2026-07-04', 'Advanced', '-', 'Judge One', 100, 'Judge Two'],
  ];
  const parsed = parseScoreSheetWorkbook(workbookBuffer([{ name: 'Obed_Rally', rows }]), 'scores.xlsx');
  assert.equal(parsed.warnings.length, 0);
  assert.deepEqual(parsed.records.map((record) => [record.className, record.numericalScore, record.result]), [
    ['Advanced', 100, 'Pass'],
    ['Obedience 5', 120, 'Pass'],
    ['Obedience 5', 150, 'Pass'],
    ['Starter', 71, 'Pass'],
    ['Starter', 97, 'Pass'],
  ]);
});

test('optionally treats repeated two-column rows as additional round pairs', () => {
  const rows: unknown[][] = [[], [], [], [], [],
    ['Registration', 'Dog', '', 'Date', 'Class', 'Result', 'Judge', 'Result', 'Judge'],
    ['12-3456-78', 'Scout', '', '2026-07-04', 'Zoom 1', 94, 'Judge One', '-', ''],
    ['12-3456-78', 'Scout', '', '2026-07-04', 'Zoom 1', 92, 'Judge Two', 99, 'Judge Two'],
    ['12-3456-78', 'Scout', '', '2026-07-04', 'Zoom 1', 82, 'Judge Two', '-', ''],
  ];
  const buffer = workbookBuffer([{ name: 'Obed_Rally', rows }]);
  const omitted = parseScoreSheetWorkbook(buffer, 'scores.xlsx');
  assert.deepEqual(omitted.records.map((record) => record.roundNumber), [1]);
  assert.equal(omitted.warnings.some((warning) => warning.includes('repeated dog/date/class row')), true);

  const included = parseScoreSheetWorkbook(buffer, 'scores.xlsx', { includeRepeatedRows: true });
  assert.deepEqual(included.records.map((record) => record.roundNumber), [1, 3, 4, 5]);
  assert.equal(included.warnings.some((warning) => warning.includes('duplicate dog/class/round')), false);
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
