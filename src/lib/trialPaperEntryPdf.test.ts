import assert from 'node:assert/strict';
import test from 'node:test';
import { PDFDocument } from 'pdf-lib';
import { createTrialPaperEntryPdf } from './trialPaperEntryPdf';
import { EMPTY_PREMIUM_CONTENT, type TrialPremiumModel } from '@/types/trialPremium';

test('creates a printable entry form with selections and a dedicated waiver page', async () => {
  const model: TrialPremiumModel = {
    trial: {
      id: 'paper-test', trialName: 'Paper Form Test', clubName: 'Example Club', location: 'Example Hall',
      startDate: '2026-10-01', endDate: '2026-10-02', entryOpenAt: null, entryTimezone: 'America/Edmonton',
      entriesCloseDate: '2026-09-25', secretaryName: 'Casey Example', secretaryEmail: 'casey@example.com',
      secretaryPhone: '(999) 123-4567', waiverText: 'Example waiver text.\n\nSignature __________________ Date __________',
    },
    schedule: Array.from({ length: 22 }, (_, index) => ({
      date: index < 11 ? '2026-10-01' : '2026-10-02', dayNumber: index < 11 ? 1 : 2,
      className: `Class ${index + 1}`, classOrder: index, roundNumber: 1, judgeName: 'Judge Example',
      entryFee: 25, feoPrice: 15, feoAvailable: index % 2 === 0,
    })),
    status: 'ready', content: { ...EMPTY_PREMIUM_CONTENT, mapAddress: '123 Main Street', paymentInstructions: 'Pay the host club.' },
    updatedAt: null, updatedBy: null, mapImagePath: null, missingRequired: [],
  };

  const bytes = await createTrialPaperEntryPdf(model);
  const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() >= 3, 'class selections should paginate cleanly before the dedicated waiver');
  assert.ok(bytes.length > 5000);
  assert.equal(pdf.getPage(0).getSize().width, 612);
  assert.equal(pdf.getPage(0).getSize().height, 792);
});
