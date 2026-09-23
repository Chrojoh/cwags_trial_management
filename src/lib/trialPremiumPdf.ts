import { PDFDocument, PDFPage, PDFFont, PDFString, StandardFonts, rgb } from 'pdf-lib';
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

export async function createTrialPremiumPdf(
  model: TrialPremiumModel,
  options: { mapImageBytes?: Uint8Array; mapMimeType?: string; publicEntryUrl?: string } = {}
): Promise<Uint8Array> {
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
  const link = (label: string, url: string) => {
    need(26);
    const size = 9;
    page.drawText(label, { x: margin, y, size, font: bold, color: rgb(0.05, 0.32, 0.72) });
    const width = bold.widthOfTextAtSize(label, size);
    const annotation = page.doc.context.register(page.doc.context.obj({
      Type: 'Annot', Subtype: 'Link', Rect: [margin, y - 2, margin + width, y + size + 2], Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
    }));
    page.node.addAnnot(annotation);
    y -= 22;
  };

  const drawCenteredLines = (
    target: PDFPage,
    text: string,
    x: number,
    top: number,
    width: number,
    size: number,
    targetFont: PDFFont
  ) => {
    wrap(text, targetFont, size, width - 8).slice(0, 3).forEach((line, index) => {
      const lineWidth = targetFont.widthOfTextAtSize(line, size);
      target.drawText(line, { x: x + Math.max(4, (width - lineWidth) / 2), y: top - 12 - index * (size + 2), size, font: targetFont });
    });
  };

  const drawDailyScheduleGrids = () => {
    const byDate = new Map<string, typeof model.schedule>();
    model.schedule.forEach((row) => byDate.set(row.date, [...(byDate.get(row.date) || []), row]));
    for (const [date, rows] of byDate) {
      const judges = [...new Set(rows.map((row) => row.judgeName || 'TBA'))];
      const classes = [...new Map(rows.map((row) => [row.className, row])).values()]
        .sort((a, b) => a.classOrder - b.classOrder);
      const judgeChunks = Array.from({ length: Math.ceil(judges.length / 5) }, (_, index) => judges.slice(index * 5, index * 5 + 5));
      const classChunks = Array.from({ length: Math.ceil(classes.length / 12) }, (_, index) => classes.slice(index * 12, index * 12 + 12));

      for (const judgeChunk of judgeChunks) for (const classChunk of classChunks) {
        const gridPage = pdf.addPage([792, 612]);
        const left = 36;
        const top = 548;
        const classWidth = 158;
        const judgeWidth = (720 - classWidth) / Math.max(1, judgeChunk.length);
        const headerHeight = 46;
        const rowHeight = 35;
        gridPage.drawText(`${formatDate(date)} - Classes, Judges and Fees`, { x: left, y: 578, size: 15, font: bold, color: rgb(0.2, 0.15, 0.12) });
        gridPage.drawText('Each filled cell shows the assigned round(s), regular fee and whether FEO is offered.', { x: left, y: 560, size: 8, font });
        gridPage.drawRectangle({ x: left, y: top - headerHeight, width: classWidth, height: headerHeight, borderWidth: 0.7, color: rgb(0.96, 0.78, 0.56), borderColor: rgb(0.35, 0.25, 0.18) });
        drawCenteredLines(gridPage, 'Class', left, top, classWidth, 9, bold);
        judgeChunk.forEach((judge, judgeIndex) => {
          const x = left + classWidth + judgeIndex * judgeWidth;
          gridPage.drawRectangle({ x, y: top - headerHeight, width: judgeWidth, height: headerHeight, borderWidth: 0.7, color: rgb(0.96, 0.78, 0.56), borderColor: rgb(0.35, 0.25, 0.18) });
          drawCenteredLines(gridPage, judge, x, top, judgeWidth, 8, bold);
        });

        classChunk.forEach((classRow, rowIndex) => {
          const rowTop = top - headerHeight - rowIndex * rowHeight;
          gridPage.drawRectangle({ x: left, y: rowTop - rowHeight, width: classWidth, height: rowHeight, borderWidth: 0.6, color: rowIndex % 2 ? rgb(0.98, 0.98, 0.98) : rgb(1, 1, 1), borderColor: rgb(0.55, 0.55, 0.55) });
          drawCenteredLines(gridPage, classRow.className, left, rowTop, classWidth, 8, bold);
          judgeChunk.forEach((judge, judgeIndex) => {
            const x = left + classWidth + judgeIndex * judgeWidth;
            const assignments = rows.filter((row) => row.className === classRow.className && (row.judgeName || 'TBA') === judge);
            const rounds = assignments.map((row) => `R${row.roundNumber}`).join(', ');
            const cell = assignments.length ? `${rounds} | $${classRow.entryFee.toFixed(2)}${assignments.some((row) => row.feoAvailable) ? ' | FEO' : ''}` : '';
            gridPage.drawRectangle({ x, y: rowTop - rowHeight, width: judgeWidth, height: rowHeight, borderWidth: 0.6, color: rowIndex % 2 ? rgb(0.98, 0.98, 0.98) : rgb(1, 1, 1), borderColor: rgb(0.55, 0.55, 0.55) });
            if (cell) drawCenteredLines(gridPage, cell, x, rowTop, judgeWidth, 7.5, font);
          });
        });
      }
    }
  };

  addPage();
  paragraph(`${model.trial.clubName} | ${model.trial.location}`, 10);
  paragraph(`${formatDate(model.trial.startDate)}${model.trial.endDate !== model.trial.startDate ? ` to ${formatDate(model.trial.endDate)}` : ''}`, 10);
  section('Trial Secretary', [model.trial.secretaryName, model.trial.secretaryEmail, model.trial.secretaryPhone].filter(Boolean).join(' | '));
  section('Entry Period', `Opens: ${model.trial.entryOpenAt || 'See entry announcement'}${model.trial.entryTimezone ? ` (${model.trial.entryTimezone})` : ''}\nCloses: ${model.trial.entriesCloseDate || 'At the secretary\'s discretion when full'}`);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(model.trial.location)}`;
  link('Open venue map and directions', mapUrl);
  if (options.publicEntryUrl) link('Open the online entry form', options.publicEntryUrl);

  section('Classes, Rounds, Judges and Fees', `${model.schedule.length} scheduled rounds are shown in the daily grids that follow. Each grid is generated directly from the saved trial setup.`);
  drawDailyScheduleGrids();
  addPage();

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
    ['Directions and Arrival', model.content.directionsInformation],
    ['Nearby Services', model.content.nearbyServices],
    ['Safety and Comfort Rules', model.content.safetyRules],
    ['Waitlist', model.content.waitlistInformation],
    ['Rules Acknowledgement', model.content.rulesAcknowledgement],
    ['Ring Setup', model.content.ringSetupTime || 'See secretary instructions.'],
    ["Judges' Briefing", model.content.judgesBriefingTime || 'See secretary instructions.'],
    ['Additional Information', model.content.additionalInformation],
    ['Waiver', model.trial.waiverText],
  ];
  for (const [title, text] of sections) {
    section(title, text);
    if (title === 'Directions and Arrival' && options.mapImageBytes?.length) {
      try {
        const image = options.mapMimeType === 'image/png'
          ? await pdf.embedPng(options.mapImageBytes)
          : await pdf.embedJpg(options.mapImageBytes);
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = 330;
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
        const width = image.width * scale;
        const height = image.height * scale;
        need(height + 18);
        page.drawImage(image, { x: margin + (maxWidth - width) / 2, y: y - height, width, height });
        y -= height + 18;
      } catch {
        section('Map image', 'The uploaded map image could not be rendered. Use the map link above.');
      }
    }
  }

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
