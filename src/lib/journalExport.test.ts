import assert from 'node:assert/strict';
import test from 'node:test';
import { exportJournalExcel, exportJournalPdf, journalExportFilename, journalExportRows } from './journalExport';

test('export contains action event in trial time zone', () => {
  const rows = journalExportRows([{
    id: 'change', timestamp: '2026-09-15T15:32:31Z', type: 'entry_modified',
    handler_name: 'Handler', dog_call_name: 'Dog', cwags_number: 'PENDING-123',
    description: 'Removed Patrol 1 Round 2; new total $20', amount: 20,
  }], 'America/Edmonton');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].amount, 20);
  assert.match(rows[0].time, /2026-09-15/);
});

test('filename strips unsafe characters', () => {
  assert.match(journalExportFilename("Jazz's Friday Night Party", 'pdf'),
    /^Jazz-s-Friday-Night-Party-activity-journal-\d{4}-\d{2}-\d{2}\.pdf$/);
});

test('PDF and Excel export functions produce valid downloads', async () => {
  const previousDocument = globalThis.document;
  const previousCreate = URL.createObjectURL;
  const previousRevoke = URL.revokeObjectURL;
  const captures: Blob[] = [];
  URL.createObjectURL = (blob: Blob | MediaSource) => {
    captures.push(blob as Blob);
    return 'blob:journal-test';
  };
  URL.revokeObjectURL = () => {};
  globalThis.document = {
    body: { appendChild() {} },
    createElement() { return { href: '', download: '', click() {}, remove() {} }; },
  } as unknown as Document;
  const items = [{
    id: 'change', timestamp: '2026-09-15T15:32:31Z', type: 'entry_modified',
    handler_name: 'Daniel', dog_call_name: 'Finn', cwags_number: 'PENDING-123',
    description: 'Removed Patrol 1 Round 1; new total $0.00', amount: 0,
  }];
  try {
    await exportJournalPdf(items, 'First CWAGS Scent Trial', 'America/Edmonton');
    await exportJournalExcel(items, 'First CWAGS Scent Trial', 'America/Edmonton');
    assert.equal(captures.length, 2);
    assert.equal(new Uint8Array(await captures[0].arrayBuffer()).slice(0, 4).toString(), '37,80,68,70');
    assert.equal(new Uint8Array(await captures[1].arrayBuffer()).slice(0, 2).toString(), '80,75');
  } finally {
    globalThis.document = previousDocument;
    URL.createObjectURL = previousCreate;
    URL.revokeObjectURL = previousRevoke;
  }
});
