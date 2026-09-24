import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import type { TrialPremiumModel } from '@/types/trialPremium';

const pageWidth = 612;
const pageHeight = 792;
const margin = 42;
const bottom = 48;

const clean = (value: string) => value.replace(/[\u2010-\u2015]/g, '-').trim();
const formatDate = (value: string) => {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
};

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = clean(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function wrapPreservingBreaks(text: string, font: PDFFont, size: number, width: number): string[] {
  return text.split(/\r?\n/).flatMap((line) => line.trim() ? wrap(line, font, size, width) : ['']);
}

export async function createTrialPaperEntryPdf(model: TrialPremiumModel): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const dark = rgb(0.13, 0.13, 0.13);
  const accent = rgb(0.08, 0.32, 0.58);
  const pale = rgb(0.94, 0.97, 1);
  const lineColor = rgb(0.35, 0.35, 0.35);
  let page!: PDFPage;
  let y = 0;

  const addPage = (subtitle = 'Printable Paper Entry Form') => {
    page = pdf.addPage([pageWidth, pageHeight]);
    page.drawText(model.trial.trialName, { x: margin, y: 746, size: 20, font: bold, color: dark, maxWidth: pageWidth - margin * 2 });
    page.drawText(subtitle, { x: margin, y: 724, size: 11, font: bold, color: accent });
    page.drawLine({ start: { x: margin, y: 714 }, end: { x: pageWidth - margin, y: 714 }, thickness: 1, color: accent });
    y = 692;
  };
  const drawSectionTitle = (title: string) => {
    page.drawText(title, { x: margin, y, size: 13, font: bold, color: dark });
    y -= 20;
  };
  const drawParagraph = (text: string, size = 8.5) => {
    for (const line of wrap(text, font, size, pageWidth - margin * 2)) {
      page.drawText(line, { x: margin, y, size, font, color: dark });
      y -= size + 3;
    }
    y -= 5;
  };
  const drawField = (label: string, x: number, width: number, labelWidth: number) => {
    page.drawText(label, { x, y, size: 8.5, font: bold, color: dark });
    page.drawLine({ start: { x: x + labelWidth, y: y - 1 }, end: { x: x + width, y: y - 1 }, thickness: 0.7, color: lineColor });
  };

  addPage();
  const dates = `${formatDate(model.trial.startDate)}${model.trial.endDate !== model.trial.startDate ? ` to ${formatDate(model.trial.endDate)}` : ''}`;
  const venue = [model.trial.clubName, model.trial.location, model.content.mapAddress].filter(Boolean).join(' | ');
  page.drawRectangle({ x: margin, y: y - 58, width: pageWidth - margin * 2, height: 64, color: pale, borderColor: accent, borderWidth: 0.7 });
  page.drawText(dates, { x: margin + 12, y: y - 16, size: 11, font: bold, color: accent });
  wrap(venue, font, 9, pageWidth - margin * 2 - 24).slice(0, 2).forEach((line, index) => {
    page.drawText(line, { x: margin + 12, y: y - 34 - index * 12, size: 9, font, color: dark });
  });
  y -= 78;
  drawParagraph(`Return this completed form to ${[model.trial.secretaryName, model.trial.secretaryEmail, model.trial.secretaryPhone].filter(Boolean).join(' | ')}. The secretary will enter the selections into the trial system.`);

  drawSectionTitle('Handler and Dog Information');
  drawField('Handler name', margin, 330, 72);
  drawField('Email', 382, 188, 34);
  y -= 27;
  drawField('Phone', margin, 245, 36);
  drawField('Emergency contact', 304, 266, 94);
  y -= 27;
  drawField('Emergency phone', margin, 245, 90);
  drawField('Address', 304, 266, 45);
  y -= 27;
  drawField('Registered dog name', margin, 330, 110);
  drawField('Call name', 382, 188, 52);
  y -= 27;
  drawField('C-WAGS number', margin, 245, 86);
  page.drawRectangle({ x: 304, y: y - 3, width: 10, height: 10, borderWidth: 0.8, borderColor: dark });
  page.drawText('Waiting for registration number', { x: 320, y, size: 8.5, font, color: dark });
  y -= 27;
  drawField('Breed', margin, 245, 35);
  drawField('Close to titles', 304, 266, 72);
  y -= 36;

  const dateWidth = 72;
  const classWidth = 210;
  const judgeWidth = 110;
  const regularWidth = 68;
  const feoWidth = 68;
  const rowHeight = 34;
  const tableWidth = dateWidth + classWidth + judgeWidth + regularWidth + feoWidth;
  const drawTableHeader = () => {
    page.drawRectangle({ x: margin, y: y - 24, width: tableWidth, height: 24, color: pale, borderColor: lineColor, borderWidth: 0.7 });
    const labels: Array<[string, number, number]> = [
      ['Date', margin, dateWidth], ['Class / Round', margin + dateWidth, classWidth],
      ['Judge', margin + dateWidth + classWidth, judgeWidth],
      ['Regular', margin + dateWidth + classWidth + judgeWidth, regularWidth],
      ['FEO', margin + dateWidth + classWidth + judgeWidth + regularWidth, feoWidth],
    ];
    labels.forEach(([label, x, width]) => {
      const labelWidth = bold.widthOfTextAtSize(label, 8);
      page.drawText(label, { x: x + (width - labelWidth) / 2, y: y - 16, size: 8, font: bold, color: dark });
      page.drawLine({ start: { x, y }, end: { x, y: y - 24 }, thickness: 0.6, color: lineColor });
    });
    page.drawLine({ start: { x: margin + tableWidth, y }, end: { x: margin + tableWidth, y: y - 24 }, thickness: 0.6, color: lineColor });
    y -= 24;
  };
  const drawSelectionRow = (selection: TrialPremiumModel['schedule'][number]) => {
    const rowTop = y;
    page.drawRectangle({ x: margin, y: rowTop - rowHeight, width: tableWidth, height: rowHeight, borderColor: lineColor, borderWidth: 0.6 });
    const boundaries = [dateWidth, dateWidth + classWidth, dateWidth + classWidth + judgeWidth, dateWidth + classWidth + judgeWidth + regularWidth];
    boundaries.forEach((offset) => page.drawLine({ start: { x: margin + offset, y: rowTop }, end: { x: margin + offset, y: rowTop - rowHeight }, thickness: 0.5, color: lineColor }));
    page.drawText(formatDate(selection.date), { x: margin + 4, y: rowTop - 20, size: 7.5, font, color: dark });
    const classLabel = `${selection.className} - Round ${selection.roundNumber}`;
    wrap(classLabel, bold, 8, classWidth - 8).slice(0, 2).forEach((line, index) => page.drawText(line, { x: margin + dateWidth + 4, y: rowTop - 14 - index * 10, size: 8, font: bold, color: dark }));
    wrap(selection.judgeName || 'TBA', font, 7.5, judgeWidth - 8).slice(0, 2).forEach((line, index) => page.drawText(line, { x: margin + dateWidth + classWidth + 4, y: rowTop - 14 - index * 10, size: 7.5, font, color: dark }));
    const regularX = margin + dateWidth + classWidth + judgeWidth;
    page.drawRectangle({ x: regularX + 6, y: rowTop - 23, width: 10, height: 10, borderColor: dark, borderWidth: 0.8 });
    page.drawText(`$${selection.entryFee.toFixed(2)}`, { x: regularX + 20, y: rowTop - 21, size: 7.5, font, color: dark });
    const feoX = regularX + regularWidth;
    if (selection.feoAvailable) {
      page.drawRectangle({ x: feoX + 6, y: rowTop - 23, width: 10, height: 10, borderColor: dark, borderWidth: 0.8 });
      page.drawText(`$${selection.feoPrice.toFixed(2)}`, { x: feoX + 20, y: rowTop - 21, size: 7.5, font, color: dark });
    } else page.drawText('N/A', { x: feoX + 25, y: rowTop - 21, size: 7.5, font, color: lineColor });
    y -= rowHeight;
  };

  drawSectionTitle('Class Selections');
  page.drawText('Check either Regular or FEO for every round entered.', { x: margin, y, size: 8.5, font, color: dark });
  y -= 15;
  drawTableHeader();
  for (const selection of model.schedule) {
    if (y - rowHeight < 120) {
      addPage('Printable Paper Entry Form - Class Selections');
      drawTableHeader();
    }
    drawSelectionRow(selection);
  }
  if (y < 150) addPage('Printable Paper Entry Form - Fee Summary');
  y -= 18;
  drawField('Regular selections total $', margin, 190, 126);
  drawField('FEO selections total $', 246, 155, 112);
  drawField('Total enclosed $', 425, 145, 82);
  y -= 30;
  if (model.content.paymentInstructions.trim()) {
    page.drawText('Payment instructions', { x: margin, y, size: 9, font: bold, color: dark });
    y -= 14;
    drawParagraph(model.content.paymentInstructions, 8);
  }
  page.drawText('Secretary use', { x: margin, y, size: 9, font: bold, color: dark });
  y -= 22;
  drawField('Date received', margin, 230, 72);
  drawField('Entered by', 304, 266, 58);

  addPage('Waiver and Signature');
  let waiverSize = 12;
  let waiverLineHeight = waiverSize + 4;
  let waiverLines = wrapPreservingBreaks(model.trial.waiverText.trim(), font, waiverSize, pageWidth - margin * 2);
  while (waiverSize > 7 && waiverLines.length * waiverLineHeight > y - bottom) {
    waiverSize -= 1;
    waiverLineHeight = waiverSize + 4;
    waiverLines = wrapPreservingBreaks(model.trial.waiverText.trim(), font, waiverSize, pageWidth - margin * 2);
  }
  for (const line of waiverLines) {
    page.drawText(line, { x: margin, y, size: waiverSize, font, color: dark });
    y -= waiverLineHeight;
  }

  pdf.getPages().forEach((pdfPage, index, pages) => {
    const label = `Page ${index + 1} of ${pages.length}`;
    pdfPage.drawLine({ start: { x: margin, y: 32 }, end: { x: pageWidth - margin, y: 32 }, thickness: 0.5, color: rgb(0.72, 0.72, 0.72) });
    pdfPage.drawText(label, { x: pageWidth - margin - font.widthOfTextAtSize(label, 7.5), y: 18, size: 7.5, font, color: lineColor });
  });

  return pdf.save();
}

export const paperEntryFilename = (trialName: string) =>
  `${trialName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'Trial'}-Paper-Entry-Form.pdf`;
