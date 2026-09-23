import assert from 'node:assert/strict';
import test from 'node:test';
import { unzipSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';
import XLSX from 'xlsx';
import { buildPostTrialPackageModel, type PostTrialSource } from './postTrialPackage';
import {
  createClassResultsPdf,
  createJudgeFormsPdf,
  createPostTrialPackageZip,
  createTrialRecapWorkbook,
} from './postTrialPackageExport';

const model = buildPostTrialPackageModel({
  trial: { id: 't', trial_name: 'Export Test', club_name: 'Test Club', location: 'Calgary, AB', start_date: '2026-09-20', end_date: '2026-09-20' },
  days: [{ id: 'd', trial_date: '2026-09-20', day_number: 1 }],
  classes: [{ id: 'c', trial_day_id: 'd', class_name: 'Patrol 1', class_type: 'scent', class_order: 1 }],
  rounds: [{ id: 'r', trial_class_id: 'c', round_number: 1, judge_name: 'Judge Example' }],
  entries: [{ id: 'e', handler_name: 'Handler Example', dog_call_name: 'Comet', cwags_number: '12-3456-78', entry_status: 'confirmed', amount_owed: 23, amount_paid: 23 }],
  selections: [{ id: 's', entry_id: 'e', trial_round_id: 'r', entry_type: 'regular', entry_status: 'entered' }],
  scores: [{ id: 'score', entry_selection_id: 's', trial_round_id: 'r', pass_fail: 'Pass', entry_status: 'present', time_seconds: 42.25 }],
  cwagsFeePerRun: 1.75,
} satisfies PostTrialSource);

test('creates readable recap workbook with numeric money cells', () => {
  const bytes = createTrialRecapWorkbook(model);
  const workbook = XLSX.read(bytes, { type: 'array' });
  assert.deepEqual(workbook.SheetNames, ['Trial Recap', 'Readiness', 'Class Summary', 'Judges']);
  assert.equal(workbook.Sheets['Trial Recap'].B16.v, 1.75);
  assert.equal(workbook.Sheets.Readiness.B7.v, 'READY');
});

test('creates class results and judge PDF documents', async () => {
  const classPdf = await PDFDocument.load(await createClassResultsPdf(model));
  const judgePdf = await PDFDocument.load(await createJudgeFormsPdf(model));
  assert.equal(classPdf.getPageCount(), 1);
  assert.equal(judgePdf.getPageCount(), 2);
});

test('packages every required review document in one ZIP', async () => {
  const files = unzipSync(await createPostTrialPackageZip(model));
  const names = Object.keys(files).sort();
  assert.deepEqual(names, [
    'Export-Test-Class-Results.pdf',
    'Export-Test-Judge-Forms.pdf',
    'Export-Test-Readiness.json',
    'Export-Test-Trial-Recap.xlsx',
    'README.txt',
  ]);
});
