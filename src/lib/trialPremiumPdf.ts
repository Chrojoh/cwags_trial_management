import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import type { TrialPremiumModel } from '@/types/trialPremium';

const margin = 42;
const pageWidth = 612;
const pageHeight = 792;

const clean = (value: string) => value.replace(/[\u2010-\u2015]/g, '-').trim();
const formatDate = (value: string) => {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
};

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = clean(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
    else { if (line) lines.push(line); line = word; }
  });
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

export async function createTrialPremiumPdf(model: TrialPremiumModel): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page!: PDFPage;
  let y = 0;

  const addPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    y = pageHeight - 42;
    page.drawText('Independent C-WAGS Trial Premium', { x: margin, y, size: 9, font: bold, color: rgb(0.82, 0.27, 0.03) });
    page.drawText(model.trial.trialName, { x: margin, y: y - 22, size: 17, font: bold, maxWidth: pageWidth - margin * 2 });
    y -= 48;
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.8, color: rgb(0.82, 0.27, 0.03) });
    y -= 20;
  };
  const need = (height: number) => { if (y - height < 48) addPage(); };
  const paragraph = (text: string, size = 9, inset = 0) => {
    const lines = wrap(text || 'Not provided.', font, size, pageWidth - margin * 2 - inset);
    lines.forEach((line) => {
      need(size + 8);
      page.drawText(line, { x: margin + inset, y, size, font });
      y -= size + 4;
    });
    y -= 5;
  };
  const section = (title: string, text: string) => {
    need(54);
    page.drawText(title, { x: margin, y, size: 11, font: bold, color: rgb(0.25, 0.16, 0.12) });
    y -= 17;
    paragraph(text);
  };

  addPage();
  paragraph(`${model.trial.clubName} | ${model.trial.location}`, 10);
  paragraph(`${formatDate(model.trial.startDate)}${model.trial.endDate !== model.trial.startDate ? ` to ${formatDate(model.trial.endDate)}` : ''}`, 10);
  section('Trial Secretary', [model.trial.secretaryName, model.trial.secretaryEmail, model.trial.secretaryPhone].filter(Boolean).join(' | '));
  section('Entry Period', `Opens: ${model.trial.entryOpenAt || 'See entry announcement'}${model.trial.entryTimezone ? ` (${model.trial.entryTimezone})` : ''}\nCloses: ${model.trial.entriesCloseDate || 'At the secretary\'s discretion when full'}`);

  need(44);
  page.drawText('Classes, Rounds, Judges and Fees', { x: margin, y, size: 12, font: bold });
  y -= 20;
  model.schedule.forEach((row) => {
    need(22);
    const line = `${formatDate(row.date)} | ${row.className}, Round ${row.roundNumber} | Judge: ${row.judgeName || 'TBA'} | $${row.entryFee.toFixed(2)}${row.feoAvailable ? ' | FEO available' : ''}`;
    paragraph(line, 8, 8);
  });

  const sections: Array<[string, string]> = [
    ['Payment Instructions', model.content.paymentInstructions],
    ['Refund and Cancellation Policy', model.content.refundPolicy],
    ['Move-Up Policy', model.content.moveUpPolicy],
    ['Volunteer Information', model.content.volunteerInformation],
    ['Awards', model.content.awardsInformation],
    ['Facility', model.content.facilityInformation],
    ['Parking', model.content.parkingInformation],
    ['Crating', model.content.cratingInformation],
    ['Accessibility', model.content.accessibilityInformation],
    ['Veterinarian', model.content.veterinarianInformation],
    ['Emergency Information', model.content.emergencyInformation],
    ['Additional Information', model.content.additionalInformation],
    ['Waiver', model.trial.waiverText],
  ];
  sections.forEach(([title, text]) => section(title, text));

  const pages = pdf.getPages();
  pages.forEach((pdfPage, index) => {
    pdfPage.drawText(`Page ${index + 1} of ${pages.length}`, { x: 510, y: 24, size: 8, font, color: rgb(0.35, 0.35, 0.35) });
  });
  return pdf.save();
}

export function premiumFilename(name: string) {
  const safe = name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'Trial';
  return `${safe}-Premium.pdf`;
}
