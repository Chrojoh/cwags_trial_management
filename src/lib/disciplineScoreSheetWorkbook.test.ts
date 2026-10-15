import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import XLSX from 'xlsx-js-style';
import { strFromU8, unzipSync } from 'fflate';
import { createDisciplineScoreSheetWorkbook } from './disciplineScoreSheetWorkbook';

test('creates a Rally table worksheet and one full participant sheet per dog in saved running order', () => {
  const bytes = createDisciplineScoreSheetWorkbook(
    [{ id: 'round', class_name: 'Starter', class_type: 'rally', judge_name: 'Judge', round_number: 1 }],
    [
      { selectionId: 'two', roundId: 'round', handler: 'Second Handler', dog: 'Second Dog', registration: '26-1000-02', runningPosition: 2 },
      { selectionId: 'one', roundId: 'round', handler: 'First Handler', dog: 'First Dog', registration: '26-1000-01', runningPosition: 1 },
    ],
    'Beta Trial',
    '10/13/2026',
  );
  const workbook = XLSX.read(bytes, { type: 'array' });
  assert.deepEqual(workbook.SheetNames, [
    'Starter R1 Table', 'Starter R1 P1', 'Starter R1 P2', 'Rally Host Checklist', 'Judge Reference',
  ]);
  const tableRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets['Starter R1 Table'], {
    header: 1,
  });
  assert.equal(tableRows[4][2], 'First Handler');
  assert.equal(tableRows[4][3], 'First Dog');
  assert.equal(tableRows[5][2], 'Second Handler');
  assert.equal(tableRows[5][3], 'Second Dog');
  const firstParticipant = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets['Starter R1 P1'], {
    header: 1,
  });
  assert.equal(firstParticipant[2][0], 'Dog: First Dog');
  assert.equal(firstParticipant[2][4], 'Handler: First Handler');
  assert.equal(firstParticipant[25][0], 20);
  assert.equal(firstParticipant[27][0], 'Successful retries');
  assert.equal(firstParticipant[27][2], '____ × 3');
  assert.equal(firstParticipant[27][4], 'Excess retries');
  assert.equal(firstParticipant[27][6], '____ × 7');
});

test('gives Pro and ARF Rally enough rows for the official 22-exercise maximum', () => {
  const bytes = createDisciplineScoreSheetWorkbook(
    [{ id: 'round', class_name: 'Pro Rally', class_type: 'rally', judge_name: 'Judge', round_number: 1 }],
    [{ selectionId: 'one', roundId: 'round', handler: 'Handler', dog: 'Dog', registration: '26-1000-01', runningPosition: 1 }],
    'Beta Trial',
    '10/14/2026',
  );
  const workbook = XLSX.read(bytes, { type: 'array' });
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets['Pro Rally R1 P1'], { header: 1 });
  assert.equal(rows[27][0], 22);
  assert.equal(rows[28][0], 'Starting score');
});

test('treats Zoom as Rally and prints the Zoom time standard', () => {
  const bytes = createDisciplineScoreSheetWorkbook(
    [{ id: 'round', class_name: 'Zoom 1.5', class_type: 'zoom', judge_name: 'Judge', round_number: 1 }],
    [{ selectionId: 'one', roundId: 'round', handler: 'Handler', dog: 'Dog', registration: '26-1000-01', runningPosition: 1 }],
    'Beta Trial',
    '10/14/2026',
  );
  const workbook = XLSX.read(bytes, { type: 'array' });
  assert.ok(workbook.SheetNames.includes('Zoom 1.5 R1 Table'));
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets['Zoom 1.5 R1 P1'], { header: 1 });
  assert.match(String(rows[33][0]), /standard time 2:00; maximum 3:00/);
});

test('prints Rally table worksheets in landscape without forcing all entries onto one page', () => {
  const bytes = createDisciplineScoreSheetWorkbook(
    [{ id: 'round', class_name: 'Starter', class_type: 'rally', judge_name: 'Judge', round_number: 1 }],
    Array.from({ length: 30 }, (_, index) => ({
      selectionId: String(index), roundId: 'round', handler: `Handler ${index + 1}`,
      dog: `Dog ${index + 1}`, registration: `26-1000-${String(index + 1).padStart(2, '0')}`,
      runningPosition: index + 1,
    })),
    'Beta Trial',
    '10/14/2026',
  );
  const zip = unzipSync(bytes);
  const tableXml = strFromU8(zip['xl/worksheets/sheet1.xml']);
  const participantXml = strFromU8(zip['xl/worksheets/sheet2.xml']);
  assert.match(tableXml, /fitToWidth="1" fitToHeight="0" orientation="landscape"/);
  assert.match(participantXml, /fitToWidth="1" fitToHeight="1" orientation="portrait"/);
});

test('keeps the selected games code visible on the sheet', () => {
  const bytes = createDisciplineScoreSheetWorkbook(
    [{ id: 'game', class_name: 'Games 1', class_type: 'games', games_subclass: 'BJ', judge_name: 'Judge', round_number: 1 }],
    [{ selectionId: 'one', roundId: 'game', handler: 'Handler', dog: 'Dog', registration: '26-1000-01', runningPosition: 1 }],
    'Beta Trial',
    '10/13/2026',
  );
  const workbook = XLSX.read(bytes, { type: 'array' });
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], {
    header: 1,
  });
  assert.equal(rows[5][0], 'Game: Black Jack (BJ)');
  assert.equal(rows[5][4], 'Time limit: 2:00');
  assert.equal(rows[5][7], 'Minimum Q: 45');
});

test('uses one worksheet per participant for level 5 obedience readability', () => {
  const bytes = createDisciplineScoreSheetWorkbook(
    [{ id: 'round', class_name: 'Obedience 5', class_type: 'obedience', judge_name: 'Judge', round_number: 1 }],
    [
      { selectionId: 'one', roundId: 'round', handler: 'One', dog: 'Dog One', registration: '26-1000-01', runningPosition: 1 },
      { selectionId: 'two', roundId: 'round', handler: 'Two', dog: 'Dog Two', registration: '26-1000-02', runningPosition: 2 },
    ],
    'Beta Trial',
    '10/13/2026',
  );
  const workbook = XLSX.read(bytes, { type: 'array' });
  assert.equal(workbook.SheetNames.length, 2);
  const firstRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], {
    header: 1,
  });
  assert.deepEqual(firstRows[5].slice(0, 10), [
    'Exercise', '', 'Non-Qualifying', 'Major\n4+ points', 'Minor\n2–3 points',
    'Slight\n½–1 point', 'Maximum', 'Points Lost', 'Net Score', '',
  ]);
});

test('expands shorter obedience levels to use the printed page', () => {
  const bytes = createDisciplineScoreSheetWorkbook(
    [{ id: 'round', class_name: 'Obedience 1', class_type: 'obedience', judge_name: 'Judge', round_number: 1 }],
    [{ selectionId: 'one', roundId: 'round', handler: 'One', dog: 'Dog One', registration: '26-1000-01', runningPosition: 1 }],
    'Beta Trial',
    '10/13/2026',
  );
  const worksheetXml = strFromU8(unzipSync(bytes)['xl/worksheets/sheet1.xml']);
  assert.match(worksheetXml, /<row r="7"[^>]*ht="33"/);
  assert.match(worksheetXml, /fitToWidth="1" fitToHeight="1"/);
});

test('prefills the official C-WAGS obedience sheet for every entry', () => {
  const template = new Uint8Array(readFileSync('public/templates/obedience/level-1.xlsx'));
  const bytes = createDisciplineScoreSheetWorkbook(
    [{ id: 'round', class_name: 'Obedience 1', class_type: 'obedience', judge_name: 'Judge Example', round_number: 2 }],
    [
      {
        selectionId: 'one', roundId: 'round', handler: 'Handler Example', dog: 'Dog Example',
        registration: '26-1234-01', breed: 'Mixed Breed', division: 'B', entryType: 'feo',
        runningPosition: 7,
      },
    ],
    'Official Form Trial',
    '10/14/2026',
    { 1: template },
  );
  const workbook = XLSX.read(bytes, { type: 'array', cellStyles: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  assert.equal(sheet.A1.v, 'A   B   Jr   Placing     Run: 7');
  assert.equal(sheet.A2.v, 'Date: 10/14/2026');
  assert.equal(sheet.A3.v, 'Judge: Judge Example');
  assert.equal(sheet.D1.v, 'C-WAGS\nOfficial Form Trial');
  assert.equal(sheet.D2.v, 'Level 1 · Round 2');
  assert.match(sheet.D3.v, /Selected: B/);
  assert.equal(sheet.F1.v, 'Number / Name:\n26-1234-01 / Dog Example (FEO)');
  assert.equal(sheet.F2.v, 'Breed: Mixed Breed');
  assert.equal(sheet.F3.v, 'Handler: Handler Example');
  assert.equal(sheet.A8.v, 'Call to Heel');
});

test('loads and prefills every official obedience level template', () => {
  const files = {
    1: 'public/templates/obedience/level-1.xlsx',
    2: 'public/templates/obedience/level-2.xlsx',
    3: 'public/templates/obedience/level-3.xls',
    4: 'public/templates/obedience/level-4.xls',
    5: 'public/templates/obedience/level-5.xls',
  } as const;
  for (const level of [1, 2, 3, 4, 5] as const) {
    const bytes = createDisciplineScoreSheetWorkbook(
      [{ id: `round-${level}`, class_name: `Obedience ${level}`, class_type: 'obedience', judge_name: `Judge ${level}`, round_number: 1 }],
      [{ selectionId: `entry-${level}`, roundId: `round-${level}`, handler: 'Handler', dog: 'Dog', registration: '26-1234-01', runningPosition: 1 }],
      'All Levels Trial',
      '10/14/2026',
      { [level]: new Uint8Array(readFileSync(files[level])) },
    );
    const workbook = XLSX.read(bytes, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    assert.equal(sheet.D2.v, `Level ${level} · Round 1`);
    assert.equal(sheet.A3.v, `Judge: Judge ${level}`);
    assert.match(sheet.F1.v, /Dog/);
  }
});
