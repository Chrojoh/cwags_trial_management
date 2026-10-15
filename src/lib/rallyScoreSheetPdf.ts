import { PDFDocument, PDFPage, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

export interface RallyPdfRound {
  id: string;
  class_name: string;
  class_type: string;
  judge_name: string;
  round_number?: number;
}

export interface RallyPdfLine {
  selectionId: string;
  roundId: string;
  handler: string;
  dog: string;
  registration: string;
  division?: string | null;
  entryType?: string | null;
  jumpHeight?: string | null;
  runningPosition: number | null;
}

export interface RallyCourseMapUpload {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
}

const isRallyRound = (round: RallyPdfRound) => {
  const type = round.class_type.toLowerCase();
  const name = round.class_name.toLowerCase();
  return type === 'rally' || type === 'zoom' || name.includes('rally') || name.includes('zoom');
};

const fitText = (font: PDFFont, value: string, maximumWidth: number, preferredSize = 9) => {
  let size = preferredSize;
  while (size > 6 && font.widthOfTextAtSize(value, size) > maximumWidth) size -= 0.5;
  return size;
};

const drawValue = (
  page: PDFPage,
  font: PDFFont,
  value: string,
  x: number,
  y: number,
  maximumWidth: number,
) => {
  const cleaned = value.trim() || '—';
  page.drawText(cleaned, {
    x,
    y,
    size: fitText(font, cleaned, maximumWidth),
    font,
    color: rgb(0.08, 0.18, 0.25),
    maxWidth: maximumWidth,
  });
};

async function drawCourseMap(
  output: PDFDocument,
  page: PDFPage,
  upload: RallyCourseMapUpload,
) {
  const box = { x: 30, y: 214, width: 342, height: 363 };
  page.drawRectangle({ ...box, color: rgb(1, 1, 1) });
  const padding = 5;
  const availableWidth = box.width - padding * 2;
  const availableHeight = box.height - padding * 2;
  const mime = upload.mimeType.toLowerCase();

  if (mime.includes('pdf') || upload.fileName.toLowerCase().endsWith('.pdf')) {
    const source = await PDFDocument.load(upload.bytes);
    const [embedded] = await output.embedPdf(source, [0]);
    const scale = Math.min(availableWidth / embedded.width, availableHeight / embedded.height);
    const width = embedded.width * scale;
    const height = embedded.height * scale;
    page.drawPage(embedded, {
      x: box.x + (box.width - width) / 2,
      y: box.y + (box.height - height) / 2,
      width,
      height,
    });
  } else {
    const image = mime.includes('png') || upload.fileName.toLowerCase().endsWith('.png')
      ? await output.embedPng(upload.bytes)
      : await output.embedJpg(upload.bytes);
    const scale = Math.min(availableWidth / image.width, availableHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawImage(image, {
      x: box.x + (box.width - width) / 2,
      y: box.y + (box.height - height) / 2,
      width,
      height,
    });
  }

  page.drawRectangle({
    ...box,
    borderColor: rgb(0.35, 0.45, 0.52),
    borderWidth: 0.6,
  });
}

export async function createRallyScoreSheetPdf(
  templateBytes: Uint8Array,
  rounds: RallyPdfRound[],
  lines: RallyPdfLine[],
  trialName: string,
  date: string,
  courseMaps: Record<string, RallyCourseMapUpload | undefined> = {},
) {
  const template = await PDFDocument.load(templateBytes);
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.Helvetica);
  const bold = await output.embedFont(StandardFonts.HelveticaBold);
  const rallyRounds = rounds.filter(isRallyRound);
  const fieldLift = 7;

  for (const round of rallyRounds) {
    const roundLines = lines
      .filter((line) => line.roundId === round.id)
      .sort((left, right) =>
        (left.runningPosition ?? Number.MAX_SAFE_INTEGER) -
          (right.runningPosition ?? Number.MAX_SAFE_INTEGER) ||
        left.handler.localeCompare(right.handler) || left.dog.localeCompare(right.dog));
    const printableLines = roundLines.length > 0 ? roundLines : [{
      selectionId: `blank-${round.id}`,
      roundId: round.id,
      handler: '',
      dog: '',
      registration: '',
      runningPosition: null,
    }];

    for (const line of printableLines) {
      const [page] = await output.copyPages(template, [0]);
      output.addPage(page);
      drawValue(page, font, trialName, 27, 684 + fieldLift, 266);
      drawValue(page, font, date, 311, 684 + fieldLift, 105);
      drawValue(
        page,
        font,
        `Round ${round.round_number || 1} / Run ${line.runningPosition ?? '—'}`,
        435,
        684 + fieldLift,
        150,
      );
      drawValue(page, font, round.judge_name || 'TBA', 27, 654 + fieldLift, 266);
      drawValue(page, font, round.class_name, 311, 654 + fieldLift, 142);
      drawValue(page, font, line.division || '—', 475, 654 + fieldLift, 110);
      drawValue(page, font, line.registration || 'Pending', 27, 624 + fieldLift, 350);
      page.drawRectangle({ x: 397, y: 639, width: 188, height: 13, color: rgb(1, 1, 1) });
      page.drawText('JUMP HEIGHT / ENTRY TYPE', {
        x: 401,
        y: 644,
        size: 7,
        font: bold,
        color: rgb(0.08, 0.18, 0.25),
      });
      drawValue(
        page,
        font,
        `${line.jumpHeight ? `${line.jumpHeight}\"` : '—'} / ${(line.entryType || 'regular').toUpperCase()}`,
        401,
        624 + fieldLift,
        184,
      );
      drawValue(page, font, line.handler, 27, 594 + fieldLift, 268);
      drawValue(page, font, line.dog, 313, 594 + fieldLift, 272);

      const map = courseMaps[round.id];
      if (map) await drawCourseMap(output, page, map);

      // The supplied worksheet is intentionally a host-created form rather
      // than an approved C-WAGS form. Keep that distinction explicit while
      // identifying the exact competitor/run on every page.
      page.drawRectangle({ x: 26, y: 0, width: 560, height: 25, color: rgb(1, 1, 1) });
      page.drawText('Host-created Rally judge worksheet - verify scoring against the current C-WAGS Rally Rules.', {
        x: 27,
        y: 8,
        size: 6.5,
        font,
        color: rgb(0.08, 0.18, 0.25),
      });
      if ((line.entryType || '').toLowerCase() === 'feo') {
        page.drawText('FEO - SCORE IS NOT RECORDED OR PLACED', {
          x: 330,
          y: 565,
          size: 8,
          font: bold,
          color: rgb(0.75, 0.2, 0.05),
        });
      }
    }
  }

  return new Uint8Array(await output.save());
}
