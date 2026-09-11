import test from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import { buildTitleConfirmationWorkbook } from './titleConfirmationWorkbook';

test('exports title evidence and independent review columns', () => {
  const bytes = buildTitleConfirmationWorkbook('Warm Summer Nights', [
    {
      award: 'Ace 2',
      confirmed: true,
      cwagsNumber: '12-3456-01',
      dogName: 'Jazz',
      handlerName: 'Handler',
      className: 'Ranger 2',
      priorQs: 3,
      trialQs: 2,
      qsRequired: 2,
      priorJudges: 2,
      trialJudges: 1,
      judgesRequired: 0,
      priorGameTypes: 0,
      trialGameTypes: 0,
      gameTypesRequired: 0,
    },
  ]);
  const workbook = XLSX.read(bytes, { type: 'array' });
  const rows = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets['Award confirmation'], {
    header: 1,
  });
  assert.equal(rows[0][0], 'Warm Summer Nights - Title and Ace Confirmation');
  assert.equal(rows[3][15], 'Independent Review');
  assert.equal(rows[4][0], 'Ace 2');
  assert.equal(rows[4][1], 'Confirmed');
});
