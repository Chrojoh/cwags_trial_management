import assert from 'node:assert/strict';
import test from 'node:test';
import { PDFDocument } from 'pdf-lib';
import { createTrialPremiumPdf } from './trialPremiumPdf';
import { EMPTY_PREMIUM_CONTENT, type TrialPremiumModel } from '@/types/trialPremium';

test('premium PDF paginates a complete trial without overflowing a single page', async () => {
  const content = Object.fromEntries(
    Object.keys(EMPTY_PREMIUM_CONTENT).map((key) => [key, `${key} details `.repeat(30)])
  ) as unknown as TrialPremiumModel['content'];
  content.additionalInformation = [
    'Please remember:',
    '• Bring a crate and water for your dog.',
    '- Keep dogs on leash outside the ring.',
    '* Contact casey@example.com with questions.',
    '1. Check in with the trial secretary.',
    '2) Confirm your running order.',
  ].join('\n');
  const model: TrialPremiumModel = {
    trial: {
      id: 'trial-1', trialName: 'Example Trial', clubName: 'Example Club', location: 'Example Hall',
      startDate: '2026-10-01', endDate: '2026-10-02', entryOpenAt: '2026-09-01T18:00:00Z',
      entryTimezone: 'America/Edmonton', entriesCloseDate: '2026-09-25', secretaryName: 'Casey Example',
      secretaryEmail: 'casey@example.com', secretaryPhone: '(999) 123-4567', waiverText: 'Example waiver text.',
    },
    schedule: Array.from({ length: 36 }, (_, index) => ({
      date: index < 18 ? '2026-10-01' : '2026-10-02', dayNumber: index < 18 ? 1 : 2,
      className: `Class ${index + 1}`, classOrder: index, roundNumber: 1, judgeName: 'Judge Example',
      entryFee: 25, feoPrice: 15, feoAvailable: true,
    })),
    status: 'ready', content, updatedAt: null, updatedBy: null, mapImagePath: null, missingRequired: [],
  };
  const mapImageBytes = new Uint8Array(Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  ));
  const bytes = await createTrialPremiumPdf(model, {
    mapImageBytes,
    mapMimeType: 'image/png',
    publicEntryUrl: 'https://example.com/entries/trial-1',
  });
  const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() >= 3);
  assert.ok(bytes.length > 5000);
  assert.ok((pdf.getPage(0).node.Annots()?.size() || 0) >= 2);
  const schedulePageSize = pdf.getPage(1).getSize();
  assert.equal(schedulePageSize.width, 612);
  assert.equal(schedulePageSize.height, 792);
});
