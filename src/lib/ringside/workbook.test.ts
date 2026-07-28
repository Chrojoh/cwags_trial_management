import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { parseRingsideWorkbook } from './workbook';
test('imports multiple ring sheets and class blocks', () => {
  const wb = XLSX.utils.book_new();
  for (const ring of [1, 2]) {
    const data: unknown[][] = [
      [ring === 1 ? 'Gravel Lot' : 'Inside'],
      ['Patrol 1 - Round 1'],
      ['Judge: Jane'],
      ['Running Order', 'Registration Number', 'Handler Name', 'Dog Name'],
      [1, `R${ring}`, 'Alex', 'Dog A'],
      [],
      ['Patrol 1 - Round 2'],
      ['Judge: Sam'],
      ['Running Order', 'Registration Number', 'Handler Name', 'Dog Name'],
      [1, `X${ring}`, 'Alex', 'Dog B'],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), `Ring ${ring}`);
  }
  const parsed = parseRingsideWorkbook(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
  assert.equal(parsed.summary.rings, 2);
  assert.equal(parsed.summary.classes, 4);
  assert.equal(parsed.summary.runs, 4);
  assert.equal(parsed.runs[0].ringName, 'Gravel Lot');
});
