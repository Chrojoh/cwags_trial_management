import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { degrees, PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import type { TrialApplicationData } from '@/types/trialApplication';

type Box = { x: number; y: number; width: number; height: number; size?: number; minSize?: number };
type PixelBox = { x: number; top: number; width: number; height: number; size?: number; minSize?: number };
const SCALE = 1.6666667;
const px = (box: PixelBox): Box => ({
  x: box.x / SCALE,
  y: 792 - (box.top + box.height) / SCALE,
  width: box.width / SCALE,
  height: box.height / SCALE,
  size: box.size,
  minSize: box.minSize,
});

export function fittedFontSize(
  text: string,
  font: Pick<PDFFont, 'widthOfTextAtSize'>,
  width: number,
  preferred = 9,
  minimum = 5
): number {
  let size = preferred;
  while (size > minimum && font.widthOfTextAtSize(text, size) > width) size -= 0.25;
  return size;
}

export function fitTextLines(
  text: string,
  font: Pick<PDFFont, 'widthOfTextAtSize'>,
  width: number,
  maxLines: number,
  preferred = 9,
  minimum = 5
): { lines: string[]; size: number; truncated: boolean } {
  const items = text.split(',').map((item) => item.trim()).filter(Boolean);
  const pack = (size: number) => {
    const lines: string[] = [];
    for (const item of items) {
      const candidate = lines.length ? `${lines[lines.length - 1]}, ${item}` : item;
      if (lines.length && font.widthOfTextAtSize(candidate, size) > width) lines.push(item);
      else if (lines.length) lines[lines.length - 1] = candidate;
      else lines.push(item);
    }
    return lines;
  };

  let size = preferred;
  let lines = pack(size);
  while (size > minimum && lines.length > maxLines) {
    size -= 0.25;
    lines = pack(size);
  }
  if (lines.length <= maxLines) return { lines, size, truncated: false };

  const visible = lines.slice(0, maxLines);
  let last = `${visible[maxLines - 1]}...`;
  while (last.length > 3 && font.widthOfTextAtSize(last, size) > width) {
    last = `${last.slice(0, -4)}...`;
  }
  visible[maxLines - 1] = last;
  return { lines: visible, size, truncated: true };
}

function drawFit(page: PDFPage, font: PDFFont, text: string, box: Box) {
  if (!text) return;
  const size = fittedFontSize(text, font, box.width - 2, box.size || 9, box.minSize || 5);
  const clipped = font.widthOfTextAtSize(text, size) > box.width - 2;
  let value = text;
  if (clipped) {
    while (value.length > 1 && font.widthOfTextAtSize(`${value}...`, size) > box.width - 2) {
      value = value.slice(0, -1);
    }
    value += '...';
  }
  page.drawText(value, {
    x: box.x + 1,
    y: box.y + Math.max(1, (box.height - size) / 2),
    size,
    font,
    color: rgb(0, 0, 0),
  });
}

function drawFitLines(page: PDFPage, font: PDFFont, text: string, box: Box, maxLines: number) {
  if (!text) return;
  const result = fitTextLines(
    text,
    font,
    box.width - 2,
    maxLines,
    box.size || 9,
    box.minSize || 5
  );
  const lineHeight = result.size + 1.5;
  const totalHeight = result.lines.length * lineHeight - 1.5;
  const firstBaseline = box.y + (box.height + totalHeight) / 2 - result.size;
  result.lines.forEach((line, index) => {
    page.drawText(line, {
      x: box.x + 1,
      y: firstBaseline - index * lineHeight,
      size: result.size,
      font,
      color: rgb(0, 0, 0),
    });
  });
}

function drawX(page: PDFPage, box: Box) {
  const inset = 2;
  page.drawLine({ start: { x: box.x + inset, y: box.y + inset }, end: { x: box.x + box.width - inset, y: box.y + box.height - inset }, thickness: 1.2 });
  page.drawLine({ start: { x: box.x + inset, y: box.y + box.height - inset }, end: { x: box.x + box.width - inset, y: box.y + inset }, thickness: 1.2 });
}

const general = {
  dates: px({ x: 160, top: 108, width: 330, height: 30, size: 10 }),
  city: px({ x: 646, top: 108, width: 300, height: 65, size: 10 }),
  host: px({ x: 159, top: 145, width: 330, height: 28, size: 10 }),
  location: px({ x: 190, top: 183, width: 305, height: 42, size: 9.5 }),
  website: px({ x: 635, top: 183, width: 310, height: 42, size: 9.5 }),
  contact: px({ x: 250, top: 229, width: 245, height: 32, size: 9.5 }),
  email: px({ x: 570, top: 229, width: 375, height: 32, size: 9.5 }),
  phone: px({ x: 245, top: 266, width: 250, height: 32, size: 9.5 }),
  submitted: px({ x: 760, top: 266, width: 185, height: 32, size: 9.5 }),
  judges: px({ x: 390, top: 304, width: 550, height: 52, size: 9.5, minSize: 5 }),
  advocates: px({ x: 430, top: 363, width: 510, height: 50, size: 9.5 }),
  programBoxes: { obedience: px({ x: 60, top: 305, width: 46, height: 27 }), rally: px({ x: 60, top: 334, width: 46, height: 26 }), scent: px({ x: 60, top: 363, width: 46, height: 26 }), games: px({ x: 60, top: 392, width: 46, height: 25 }) },
  dayTop: 443, headerTop: 471, firstRowTop: 496, rowHeight: 36.8, pageOneRows: 10,
  dayStarts: [159, 292, 424, 556, 688, 820], dayDateStarts: [225, 357, 489, 621, 753, 885],
  continuationDayTop: 72, continuationHeaderTop: 100, continuationFirstRowTop: 124, continuationRowHeight: 36.8, continuationRows: 29,
  setting: px({ x: 350, top: 890, width: 150, height: 28, size: 9 }), surface: px({ x: 635, top: 890, width: 125, height: 28, size: 9 }),
  leagueYes: px({ x: 835, top: 897, width: 13, height: 13 }), leagueNo: px({ x: 908, top: 897, width: 13, height: 13 }),
  exception: px({ x: 330, top: 920, width: 170, height: 36, size: 8.5 }), count: px({ x: 760, top: 920, width: 185, height: 36, size: 9 }),
  insurance: px({ x: 380, top: 960, width: 120, height: 35, size: 9 }), resetYes: px({ x: 729, top: 966, width: 13, height: 13 }), resetNo: px({ x: 790, top: 966, width: 13, height: 13 }),
};

const scent = {
  ...general,
  dates: px({ x: 168, top: 122, width: 325, height: 28, size: 10 }), city: px({ x: 617, top: 122, width: 340, height: 64, size: 10 }),
  host: px({ x: 168, top: 156, width: 325, height: 28, size: 10 }), location: px({ x: 195, top: 191, width: 310, height: 44, size: 9.5 }),
  website: px({ x: 630, top: 191, width: 325, height: 44, size: 9.5 }), contact: px({ x: 250, top: 238, width: 255, height: 34, size: 9.5 }),
  email: px({ x: 590, top: 238, width: 365, height: 34, size: 9.5 }), phone: px({ x: 245, top: 276, width: 260, height: 34, size: 9.5 }),
  submitted: px({ x: 760, top: 276, width: 195, height: 34, size: 9.5 }), judges: px({ x: 330, top: 313, width: 625, height: 43, size: 9.5 }),
  advocates: px({ x: 390, top: 360, width: 565, height: 43, size: 9.5 }),
  dayTop: 475, headerTop: 503, firstRowTop: 527, rowHeight: 36.7, pageOneRows: 10,
  dayStarts: [180, 300, 424, 556, 688, 820], dayDateStarts: [225, 345, 469, 601, 733, 865],
  continuationDayTop: 100, continuationHeaderTop: 129, continuationFirstRowTop: 153, continuationRowHeight: 36.8, continuationRows: 29,
  setting: px({ x: 350, top: 918, width: 155, height: 28, size: 9 }), surface: px({ x: 635, top: 918, width: 85, height: 28, size: 9 }),
  leagueYes: px({ x: 797, top: 915, width: 25, height: 26 }), leagueNo: px({ x: 872, top: 915, width: 25, height: 26 }),
  exception: px({ x: 340, top: 946, width: 165, height: 36, size: 8.5 }), count: px({ x: 790, top: 946, width: 165, height: 36, size: 9 }),
  insurance: px({ x: 390, top: 984, width: 115, height: 35, size: 9 }), resetYes: px({ x: 772, top: 983, width: 27, height: 27 }), resetNo: px({ x: 882, top: 983, width: 27, height: 27 }),
};

function formatDate(value: string) {
  const [year, month, day] = value.split('-');
  return month && day ? `${month}/${day}/${year}` : value;
}

export function safeApplicationFilename(host: string, firstDate: string) {
  const clean = host.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Host';
  return `CWAGS_Trial_Application_${clean}_${firstDate || 'Undated'}.pdf`;
}

export async function renderTrialApplicationPdf(data: TrialApplicationData, draft: boolean) {
  const templateName = data.template === 'scent'
    ? 'cwags-scent-trial-application-2026.pdf'
    : 'cwags-trial-application-2026.pdf';
  const bytes = await readFile(path.join(process.cwd(), 'public', 'templates', templateName));
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const cfg = data.template === 'scent' ? scent : general;
  const page = pdf.getPage(0);

  drawFit(page, font, data.trialDates.map(formatDate).join(' - '), cfg.dates);
  drawFit(page, font, [data.city, data.region].filter(Boolean).join(', '), cfg.city);
  drawFit(page, font, data.hostName, cfg.host);
  drawFit(page, font, data.locationName, cfg.location);
  drawFit(page, font, data.premiumWebsite, cfg.website);
  drawFit(page, font, data.contact.name, cfg.contact);
  drawFit(page, font, data.contact.email, cfg.email);
  drawFit(page, font, data.contact.phone, cfg.phone);
  drawFit(page, font, formatDate(data.submittedDate), cfg.submitted);
  drawFitLines(page, font, data.judges.join(', '), cfg.judges, 2);
  drawFit(page, font, data.advocates.join(', '), cfg.advocates);
  if (data.template === 'general') {
    for (const [program, enabled] of Object.entries(data.programs)) {
      if (enabled) drawX(page, general.programBoxes[program as keyof typeof general.programBoxes]);
    }
  }
  drawFit(page, font, data.venue.setting || '', cfg.setting);
  drawFit(page, font, data.venue.surface, cfg.surface);
  drawFit(page, font, data.venue.ringSizeExceptionRequest, cfg.exception);
  drawFit(page, font, String(data.scent?.numberOfSearchAreas ?? data.venue.numberOfRings ?? ''), cfg.count);
  drawFit(page, font, formatDate(data.venue.insuranceExpirationDate), cfg.insurance);
  if (data.venue.isLeague !== undefined) drawX(page, data.venue.isLeague ? cfg.leagueYes : cfg.leagueNo);
  if (data.programs.scent) drawX(page, data.scent?.resetsOffered ? cfg.resetYes : cfg.resetNo);

  const dates = data.trialDates.slice(0, 6);
  const labels = new Map<string, { label: string; judges: Map<string, string> }>();
  for (const row of data.schedule) {
    const label = row.isReset
      ? `${row.className} - Reset ${row.roundNumber}`
      : `${row.className} - R${row.roundNumber}`;
    const key = `${row.program}|${label}`;
    if (!labels.has(key)) labels.set(key, { label, judges: new Map() });
    labels.get(key)!.judges.set(row.date, row.judgeName);
  }
  const rows = [...labels.values()];
  const drawSchedulePage = (target: PDFPage, startIndex: number, capacity: number, continuation: boolean) => {
    const dayTop = continuation ? cfg.continuationDayTop : cfg.dayTop;
    const firstTop = continuation ? cfg.continuationFirstRowTop : cfg.firstRowTop;
    const rowHeight = continuation ? cfg.continuationRowHeight : cfg.rowHeight;
    dates.forEach((date, index) => drawFit(target, font, formatDate(date), px({ x: cfg.dayDateStarts[index], top: dayTop, width: 60, height: 25, size: 7.5, minSize: 4.5 })));
    rows.slice(startIndex, startIndex + capacity).forEach((row, rowIndex) => {
      const top = firstTop + rowIndex * rowHeight;
      drawFit(target, font, row.label, px({ x: 52, top, width: cfg.dayStarts[0] - 54, height: rowHeight, size: 8.5, minSize: 4.5 }));
      dates.forEach((date, dayIndex) => {
        const start = cfg.dayStarts[dayIndex];
        const end = cfg.dayStarts[dayIndex + 1] || 952;
        drawFit(target, font, row.judges.get(date) || '', px({ x: start + 2, top, width: end - start - 4, height: rowHeight, size: 8.5, minSize: 4.5 }));
      });
    });
  };
  drawSchedulePage(page, 0, cfg.pageOneRows, false);
  if (rows.length > cfg.pageOneRows) drawSchedulePage(pdf.getPage(1), cfg.pageOneRows, cfg.continuationRows, true);
  else pdf.removePage(1);

  if (draft) {
    for (const target of pdf.getPages()) {
      target.drawText('DRAFT - INCOMPLETE INFORMATION', { x: 85, y: 390, size: 28, font: bold, color: rgb(0.75, 0, 0), opacity: 0.22, rotate: degrees(35) });
    }
  }
  return pdf.save();
}
