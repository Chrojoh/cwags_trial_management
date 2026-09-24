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
  const palettes = {
    warm: { accent: rgb(0.82, 0.27, 0.03), dark: rgb(0.22, 0.14, 0.1), band: rgb(1, 0.94, 0.82), pale: rgb(1, 0.98, 0.93), border: rgb(0.88, 0.65, 0.42) },
    forest: { accent: rgb(0.12, 0.42, 0.25), dark: rgb(0.09, 0.23, 0.15), band: rgb(0.86, 0.94, 0.87), pale: rgb(0.95, 0.98, 0.95), border: rgb(0.48, 0.67, 0.52) },
    blue: { accent: rgb(0.08, 0.35, 0.62), dark: rgb(0.08, 0.18, 0.3), band: rgb(0.86, 0.93, 0.98), pale: rgb(0.95, 0.98, 1), border: rgb(0.48, 0.67, 0.82) },
    plum: { accent: rgb(0.46, 0.18, 0.48), dark: rgb(0.24, 0.12, 0.25), band: rgb(0.94, 0.87, 0.94), pale: rgb(0.99, 0.96, 0.99), border: rgb(0.68, 0.5, 0.69) },
  };
  const palette = palettes[model.content.colorScheme] || palettes.warm;
  const { accent, dark, band, pale, border } = palette;
  let page!: PDFPage;
  let y = 0;

  const addPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    page.drawRectangle({ x: 0, y: pageHeight - 72, width: pageWidth, height: 72, color: band });
    page.drawRectangle({ x: 0, y: pageHeight - 72, width: 8, height: 72, color: accent });
    page.drawText(model.trial.trialName, { x: margin, y: pageHeight - 46, size: 24, font: bold, color: dark, maxWidth: pageWidth - margin * 2 });
    page.drawLine({ start: { x: margin, y: pageHeight - 72 }, end: { x: pageWidth - margin, y: pageHeight - 72 }, thickness: 1.1, color: accent });
    y = pageHeight - 100;
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
    need(62);
    page.drawRectangle({ x: margin, y: y - 20, width: pageWidth - margin * 2, height: 26, color: band });
    page.drawRectangle({ x: margin, y: y - 20, width: 5, height: 26, color: accent });
    page.drawText(title, { x: margin + 14, y: y - 12, size: 12, font: bold, color: dark });
    y -= 34;
    paragraph(text);
  };
  const link = (label: string, url: string) => {
    need(34);
    const size = 9;
    page.drawRectangle({ x: margin, y: y - 8, width: pageWidth - margin * 2, height: 25, color: pale, borderWidth: 0.6, borderColor: border });
    page.drawText(label, { x: margin + 10, y, size, font: bold, color: rgb(0.05, 0.32, 0.72) });
    const width = bold.widthOfTextAtSize(label, size);
    const annotation = page.doc.context.register(page.doc.context.obj({
      Type: 'Annot', Subtype: 'Link', Rect: [margin + 10, y - 2, margin + 10 + width, y + size + 2], Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
    }));
    page.node.addAnnot(annotation);
    y -= 34;
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

    type ScheduleBlock = {
      date: string;
      rows: typeof model.schedule;
      judges: string[];
      classes: typeof model.schedule;
      continued: boolean;
    };
    const blocks: ScheduleBlock[] = [];

    for (const [date, rows] of byDate) {
      const judges = [...new Set(rows.map((row) => row.judgeName || 'TBA'))];
      const classes = [...new Map(rows.map((row) => [row.className, row])).values()]
        .sort((a, b) => a.classOrder - b.classOrder);
      const judgeChunks = Array.from({ length: Math.ceil(judges.length / 4) }, (_, index) => judges.slice(index * 4, index * 4 + 4));
      const classChunks = Array.from({ length: Math.ceil(classes.length / 8) }, (_, index) => classes.slice(index * 8, index * 8 + 8));
      let blockIndex = 0;
      for (const judgeChunk of judgeChunks) for (const classChunk of classChunks) {
        blocks.push({ date, rows, judges: judgeChunk, classes: classChunk, continued: blockIndex > 0 });
        blockIndex += 1;
      }
    }

    for (let pageIndex = 0; pageIndex < blocks.length; pageIndex += 2) {
      const gridPage = pdf.addPage([pageWidth, pageHeight]);
      blocks.slice(pageIndex, pageIndex + 2).forEach((block, slotIndex) => {
        const left = 36;
        const totalWidth = 540;
        const titleY = slotIndex === 0 ? 752 : 397;
        const tableTop = titleY - 42;
        const classWidth = 140;
        const judgeWidth = (totalWidth - classWidth) / Math.max(1, block.judges.length);
        const headerHeight = 42;
        const rowHeight = 32;
        const judgeFontSize = block.judges.length >= 4 ? 8 : 9;
        const cellFontSize = block.judges.length >= 4 ? 8 : 8.5;
        const continuation = block.continued ? ' (continued)' : '';

        gridPage.drawRectangle({ x: left, y: titleY - 4, width: 5, height: 18, color: accent });
        gridPage.drawText(`${formatDate(block.date)} - Classes, Judges and Fees${continuation}`, {
          x: left + 11, y: titleY, size: 13, font: bold, color: dark,
        });
        gridPage.drawText('Cells show round(s), regular fee and FEO availability.', { x: left, y: titleY - 16, size: 7.5, font });
        gridPage.drawRectangle({
          x: left, y: tableTop - headerHeight, width: classWidth, height: headerHeight,
          borderWidth: 0.7, color: band, borderColor: border,
        });
        drawCenteredLines(gridPage, 'Class', left, tableTop, classWidth, 8, bold);
        block.judges.forEach((judge, judgeIndex) => {
          const x = left + classWidth + judgeIndex * judgeWidth;
          gridPage.drawRectangle({
            x, y: tableTop - headerHeight, width: judgeWidth, height: headerHeight,
            borderWidth: 0.7, color: band, borderColor: border,
          });
          drawCenteredLines(gridPage, judge, x, tableTop, judgeWidth, judgeFontSize, bold);
        });

        block.classes.forEach((classRow, rowIndex) => {
          const rowTop = tableTop - headerHeight - rowIndex * rowHeight;
          const fill = rowIndex % 2 ? rgb(0.98, 0.98, 0.98) : rgb(1, 1, 1);
          gridPage.drawRectangle({
            x: left, y: rowTop - rowHeight, width: classWidth, height: rowHeight,
            borderWidth: 0.6, color: fill, borderColor: rgb(0.55, 0.55, 0.55),
          });
          drawCenteredLines(gridPage, classRow.className, left, rowTop, classWidth, 8.5, bold);
          block.judges.forEach((judge, judgeIndex) => {
            const x = left + classWidth + judgeIndex * judgeWidth;
            const assignments = block.rows.filter((row) => row.className === classRow.className && (row.judgeName || 'TBA') === judge);
            const rounds = assignments.map((row) => `R${row.roundNumber}`).join(', ');
            const feeLine = assignments.length
              ? `$${classRow.entryFee.toFixed(2)}${assignments.some((row) => row.feoAvailable) ? ' | FEO' : ''}`
              : '';
            gridPage.drawRectangle({
              x, y: rowTop - rowHeight, width: judgeWidth, height: rowHeight,
              borderWidth: 0.6, color: fill, borderColor: rgb(0.55, 0.55, 0.55),
            });
            if (assignments.length) {
              drawCenteredLines(gridPage, rounds, x, rowTop + 1, judgeWidth, cellFontSize, bold);
              drawCenteredLines(gridPage, feeLine, x, rowTop - 13, judgeWidth, cellFontSize, font);
            }
          });
        });
      });
    }
  };

  addPage();
  const dateLine = `${formatDate(model.trial.startDate)}${model.trial.endDate !== model.trial.startDate ? ` to ${formatDate(model.trial.endDate)}` : ''}`;
  const locationLines = wrap(model.trial.location, font, 9, pageWidth - margin * 2 - 28).slice(0, 2);
  const hasMapAddress = Boolean(model.content.mapAddress.trim());
  const summaryHeight = hasMapAddress ? 94 : 82;
  page.drawRectangle({ x: margin, y: y - summaryHeight, width: pageWidth - margin * 2, height: summaryHeight, color: pale, borderWidth: 0.8, borderColor: border });
  page.drawText(model.trial.clubName, { x: margin + 14, y: y - 22, size: 13, font: bold, color: dark, maxWidth: pageWidth - margin * 2 - 28 });
  locationLines.forEach((line, index) => page.drawText(line, { x: margin + 14, y: y - 41 - index * 11, size: 9, font }));
  if (hasMapAddress) page.drawText(model.content.mapAddress.trim(), { x: margin + 14, y: y - 66, size: 8.5, font: bold, color: rgb(0.3, 0.3, 0.3), maxWidth: pageWidth - margin * 2 - 28 });
  page.drawText(dateLine, { x: margin + 14, y: y - (hasMapAddress ? 82 : 70), size: 10, font: bold, color: accent });
  y -= summaryHeight + 19;
  section('Trial Secretary', [model.trial.secretaryName, model.trial.secretaryEmail, model.trial.secretaryPhone].filter(Boolean).join(' | '));
  section('Entry Period', `Opens: ${model.trial.entryOpenAt || 'See entry announcement'}${model.trial.entryTimezone ? ` (${model.trial.entryTimezone})` : ''}\nCloses: ${model.trial.entriesCloseDate || 'At the secretary\'s discretion when full'}`);
  const mapDestination = model.content.mapAddress.trim() || model.trial.location;
  const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapDestination)}`;
  link('Open GPS directions to the venue', mapUrl);
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
    ['Ring Setup', model.content.ringSetupTime],
    ["Judges' Briefing", model.content.judgesBriefingTime],
    ['Additional Information', model.content.additionalInformation],
  ];
  for (const [title, text] of sections) {
    if (!text.trim()) continue;
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

  addPage();
  section('Waiver', model.trial.waiverText);

  const pages = pdf.getPages();
  pages.forEach((pdfPage, index) => {
    const pageLabel = `Page ${index + 1} of ${pages.length}`;
    const labelWidth = font.widthOfTextAtSize(pageLabel, 8);
    pdfPage.drawLine({ start: { x: margin, y: 36 }, end: { x: pageWidth - margin, y: 36 }, thickness: 0.5, color: rgb(0.82, 0.72, 0.63) });
    pdfPage.drawText(pageLabel, { x: pageWidth - margin - labelWidth, y: 20, size: 8, font, color: rgb(0.35, 0.35, 0.35) });
  });
  return pdf.save();
}

export function premiumFilename(name: string) {
  const safe = name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'Trial';
  return `${safe}-Premium.pdf`;
}
