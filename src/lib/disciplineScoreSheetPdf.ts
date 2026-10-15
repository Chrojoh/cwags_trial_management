import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type {
  DisciplineScoreSheetLine,
  DisciplineScoreSheetRound,
} from './disciplineScoreSheetWorkbook';

export type OfficialObediencePdfTemplates = Partial<Record<1 | 2 | 3 | 4 | 5, Uint8Array>>;

const obedienceLevel = (name: string) => {
  const match = name.match(/(?:obedience\s*)?(?:level\s*)?([1-5])\b/i);
  return (match ? Number(match[1]) : 1) as 1 | 2 | 3 | 4 | 5;
};

const sortedLines = (roundId: string, lines: DisciplineScoreSheetLine[]) =>
  lines
    .filter((line) => line.roundId === roundId)
    .sort((left, right) =>
      (left.runningPosition ?? Number.MAX_SAFE_INTEGER) -
        (right.runningPosition ?? Number.MAX_SAFE_INTEGER) ||
      left.handler.localeCompare(right.handler) || left.dog.localeCompare(right.dog));

const printableLines = (roundId: string, lines: DisciplineScoreSheetLine[]) => {
  const found = sortedLines(roundId, lines);
  return found.length > 0 ? found : [{
    selectionId: `blank-${roundId}`,
    roundId,
    handler: '',
    dog: '',
    registration: '',
    runningPosition: null,
  } satisfies DisciplineScoreSheetLine];
};

const fitText = (font: PDFFont, value: string, width: number, preferred = 8.5) => {
  let size = preferred;
  while (size > 5.5 && font.widthOfTextAtSize(value, size) > width) size -= 0.5;
  return size;
};

const drawText = (
  page: PDFPage,
  font: PDFFont,
  value: string,
  x: number,
  y: number,
  width: number,
  preferred = 8.5,
) => {
  const text = value.trim() || '—';
  page.drawText(text, {
    x,
    y,
    maxWidth: width,
    size: fitText(font, text, width, preferred),
    font,
    color: rgb(0.04, 0.08, 0.12),
  });
};

function addObedienceParticipant(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  round: DisciplineScoreSheetRound,
  line: DisciplineScoreSheetLine,
  trialName: string,
  date: string,
) {
  const { width, height } = page.getSize();
  const sx = width / 612;
  const sy = height / 792;
  const x = (value: number) => value * sx;
  const y = (value: number) => value * sy;
  const navy = rgb(0.07, 0.18, 0.25);
  const rule = rgb(0.62, 0.7, 0.74);
  const division = line.division?.trim() || '—';
  const type = (line.entryType || 'regular').toUpperCase();
  const level = obedienceLevel(round.class_name);

  // Replace only the original identification header. Every official form is
  // scaled below this point so its complete column headings remain visible.
  const originalHeaderBottom = 590;
  page.drawRectangle({
    x: 0,
    y: y(originalHeaderBottom),
    width,
    height: height - y(originalHeaderBottom),
    color: rgb(1, 1, 1),
  });
  page.drawText('C-WAGS OBEDIENCE', {
    x: x(27), y: y(757), size: 23 * Math.min(sx, sy), font: bold, color: navy,
  });
  page.drawText(`OBEDIENCE ${level} JUDGE'S SCORE SHEET`, {
    x: x(27), y: y(734), size: 10.5 * Math.min(sx, sy), font: bold, color: navy,
  });
  page.drawText('C-WAGS', {
    x: x(514), y: y(755), size: 12 * Math.min(sx, sy), font: bold, color: navy,
  });
  page.drawLine({ start: { x: x(27), y: y(722) }, end: { x: x(585), y: y(722) }, thickness: 0.6, color: rule });

  const field = (label: string, value: string, fieldX: number, fieldY: number, fieldWidth: number) => {
    page.drawRectangle({
      x: x(fieldX - 4),
      y: y(fieldY - 7),
      width: x(fieldWidth + 8),
      height: y(31),
      color: rgb(0.965, 0.98, 0.985),
      borderColor: rule,
      borderWidth: 0.45,
    });
    page.drawText(label, {
      x: x(fieldX), y: y(fieldY + 12), size: 6.8 * Math.min(sx, sy), font: bold, color: navy,
    });
    drawText(page, font, value, x(fieldX), y(fieldY), x(fieldWidth), 8.5 * Math.min(sx, sy));
  };

  field('HOST / EVENT', trialName, 27, 694, 375);
  field('DATE', date, 416, 694, 169);
  field('JUDGE', round.judge_name || 'TBA', 27, 660, 270);
  field('OBEDIENCE / ROUND', `Obedience ${level} / Round ${round.round_number || 1}`, 311, 660, 140);
  field('DIVISION', division, 465, 660, 54);
  field('ENTRY TYPE', type, 531, 660, 54);
  field('C-WAGS REGISTRATION', line.registration || 'Pending', 27, 626, 135);
  field('JUMP HEIGHT', level === 1 ? 'N/A' : line.jumpHeight ? `${line.jumpHeight}\"` : 'Not set', 174, 626, 64);
  field('HANDLER', line.handler || '—', 250, 626, 146);
  field('DOG / BREED', `${line.dog || '—'} / ${line.breed || '—'}`, 410, 626, 175);

  const qualifyingScore = level === 5 ? '120 / 150' : '70 / 100';
  page.drawRectangle({
    x: x(27),
    y: y(594),
    width: x(558),
    height: y(20),
    color: rgb(0.93, 0.96, 0.97),
    borderColor: rule,
    borderWidth: 0.45,
  });
  page.drawText(`QUALIFYING SCORE: ${qualifyingScore} | MINIMUM 50% OF EACH EXERCISE`, {
    x: x(35),
    y: y(601),
    size: 7.4 * Math.min(sx, sy),
    font: bold,
    color: navy,
  });

  if (type === 'FEO') {
    page.drawText('FEO - SCORE IS NOT RECORDED OR PLACED', {
      x: x(402), y: y(601), size: 5.8 * Math.min(sx, sy), font: bold, color: rgb(0.72, 0.15, 0.05),
    });
  }
}

export async function createDisciplineScoreSheetPdf(
  rounds: DisciplineScoreSheetRound[],
  lines: DisciplineScoreSheetLine[],
  trialName: string,
  date: string,
  obedienceTemplates: OfficialObediencePdfTemplates,
) {
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.Helvetica);
  const bold = await output.embedFont(StandardFonts.HelveticaBold);

  for (const round of rounds) {
    const type = round.class_type.toLowerCase();
    if (type !== 'obedience') continue;
    for (const line of printableLines(round.id, lines)) {
      const level = obedienceLevel(round.class_name);
      const templateBytes = obedienceTemplates[level];
      if (!templateBytes) throw new Error(`Official Obedience Level ${level} PDF is unavailable.`);
      const source = await PDFDocument.load(templateBytes);
      let page: PDFPage;
      // Embed only the official scoring/deduction section. This preserves
      // every exercise and point rule without carrying the legacy header
      // into the redesigned participant sheet.
      const officialTableTop: Record<1 | 2 | 3 | 4 | 5, number> = {
        1: 608,
        2: 638,
        3: 638,
        4: 638,
        5: 690,
      };
      const embedded = await output.embedPage(source.getPage(0), {
        left: 0,
        bottom: 0,
        right: 612,
        top: officialTableTop[level],
      });
      page = output.addPage([612, 792]);
      const scaleX = level === 5 ? 0.94 : 0.95;
      const scaleY = level === 5 ? 0.78 : 0.86;
      page.drawPage(embedded, {
        x: (612 - 612 * scaleX) / 2,
        y: level === 5 ? 24 : 35,
        width: 612 * scaleX,
        height: officialTableTop[level] * scaleY,
      });
      addObedienceParticipant(page, font, bold, round, line, trialName, date);
    }
  }

  return new Uint8Array(await output.save());
}
