import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import type {
  DisciplineScoreSheetLine,
  DisciplineScoreSheetRound,
} from './disciplineScoreSheetWorkbook';
import { OBEDIENCE_GENERAL_NON_QUALIFYING, OBEDIENCE_RULES, validateObediencePlan, type ObedienceClassPlan } from './obedienceRules';

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

const wrapLines = (font: PDFFont, value: string, width: number, size: number, maximumLines = 2) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width || !current) current = candidate;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  if (lines.length > maximumLines) {
    const kept = lines.slice(0, maximumLines);
    let last = kept[maximumLines - 1];
    while (last.length > 1 && font.widthOfTextAtSize(`${last}…`, size) > width) last = last.slice(0, -1);
    kept[maximumLines - 1] = `${last}…`;
    return kept;
  }
  return lines;
};

const compactDeductionText = (definition: (typeof OBEDIENCE_RULES)[1]['exercises'][number]) => {
  const parts: string[] = [];
  const add = (label: string, notes?: string[]) => { if (notes?.length) parts.push(`${label}: ${notes.join('; ')}`); };
  add('NQ', definition.deductions.nonQualifying);
  add('Major', definition.deductions.major);
  add('Minor', definition.deductions.minor);
  add('Slight', definition.deductions.slight);
  return parts.join(' | ') || 'Apply general deductions as applicable.';
};

function addObedienceParticipant(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  round: DisciplineScoreSheetRound,
  line: DisciplineScoreSheetLine,
  trialName: string,
  date: string,
  logo?: PDFImage,
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
  page.drawText('C-Wags OBEDIENCE', {
    x: x(27), y: y(757), size: 23 * Math.min(sx, sy), font: bold, color: navy,
  });
  page.drawText(`OBEDIENCE ${level} JUDGE'S SCORE SHEET`, {
    x: x(27), y: y(734), size: 10.5 * Math.min(sx, sy), font: bold, color: navy,
  });
  page.drawLine({ start: { x: x(27), y: y(722) }, end: { x: x(480), y: y(722) }, thickness: 0.6, color: rule });
  if (logo) {
    const logoScale = Math.min(x(85) / logo.width, y(65) / logo.height);
    const logoWidth = logo.width * logoScale;
    const logoHeight = logo.height * logoScale;
    page.drawImage(logo, {
      x: x(500) + (x(85) - logoWidth) / 2,
      y: y(720) + (y(65) - logoHeight) / 2,
      width: logoWidth,
      height: logoHeight,
    });
  }

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
  field('C-Wags REGISTRATION', line.registration || 'Pending', 27, 626, 135);
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

function addPlannedExerciseTable(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  plan: ObedienceClassPlan,
) {
  const rules = OBEDIENCE_RULES[plan.level];
  const navy = rgb(0.07, 0.18, 0.25);
  const light = rgb(0.93, 0.96, 0.97);
  const columns = [27, 60, 250, 295, 480, 530, 585];
  const headerTop = 575;
  // Use the full scoring area at every level. Lower levels have fewer
  // exercises, so their rows and judge guidance can be substantially larger;
  // Level 5 still fits its ten exercises on one page.
  const rowHeight = 330 / plan.items.length;
  const exerciseNameSize = rowHeight >= 45 ? 8.5 : rowHeight >= 38 ? 8 : 7.4;
  const procedureSize = rowHeight >= 45 ? 6.8 : rowHeight >= 38 ? 6.1 : 5.5;
  const deductionSize = rowHeight >= 45 ? 6.4 : rowHeight >= 38 ? 5.8 : 5.25;
  const procedureLines = rowHeight >= 45 ? 3 : 2;
  const deductionLines = rowHeight >= 45 ? 6 : 4;
  const bottom = headerTop - 28 - rowHeight * plan.items.length;
  page.drawRectangle({ x: 27, y: headerTop - 28, width: 558, height: 28, color: navy });
  const headings = ['Order', 'Exercise / procedure', 'Max', 'Official deduction guide', 'Earned', 'NQ'];
  headings.forEach((heading, index) => page.drawText(heading, {
    x: columns[index] + 5, y: headerTop - 18, size: index === 1 ? 8 : 7, font: bold, color: rgb(1, 1, 1),
  }));
  plan.items.forEach((item, index) => {
    const definition = rules.exercises.find((exercise) => exercise.id === item.exerciseId);
    const segment = item.segment || 1;
    const continuation = Boolean(definition?.allowsPerformanceSegments && segment > 1);
    const top = headerTop - 28 - index * rowHeight;
    page.drawRectangle({ x: 27, y: top - rowHeight, width: 558, height: rowHeight, color: index % 2 ? rgb(1, 1, 1) : light, borderColor: rgb(0.55, 0.62, 0.66), borderWidth: 0.45 });
    if (continuation) {
      page.drawRectangle({ x: 250, y: top - rowHeight, width: 45, height: rowHeight, color: rgb(0.88, 0.9, 0.91) });
      page.drawRectangle({ x: 480, y: top - rowHeight, width: 105, height: rowHeight, color: rgb(0.88, 0.9, 0.91) });
    }
    columns.slice(1, -1).forEach((column) => page.drawLine({ start: { x: column, y: top }, end: { x: column, y: top - rowHeight }, thickness: 0.45, color: rgb(0.55, 0.62, 0.66) }));
    page.drawText(String(index + 1), { x: 43, y: top - rowHeight / 2 - 4, size: 9, font: bold, color: navy });
    const containsFigureEight = plan.level === 5
      && item.exerciseId === 'l5-heeling-figure-8'
      && Number(plan.judgeOptions.level5FigureEightSegment) === segment;
    const exerciseLabel = `${definition?.name || item.exerciseId}${definition?.allowsPerformanceSegments ? ` - Section ${segment}` : ''}${containsFigureEight ? ' [FIGURE 8]' : ''}`;
    drawText(page, bold, continuation ? `${exerciseLabel} (continuation)` : exerciseLabel, 65, top - 12, 180, exerciseNameSize);
    if (definition) wrapLines(font, definition.description, 180, procedureSize, procedureLines).forEach((line, lineIndex) => page.drawText(line, { x: 65, y: top - 22 - lineIndex * (procedureSize + 1), size: procedureSize, font, color: navy }));
    drawText(page, bold, continuation ? 'Shared' : definition?.passFail ? 'P/F' : String(definition?.maximumPoints ?? ''), 256, top - rowHeight / 2 - 4, 34, 7.5);
    if (continuation) drawText(page, font, 'Score once; combine deductions with Section 1.', 300, top - rowHeight / 2 - 4, 174, deductionSize);
    else if (definition) wrapLines(font, compactDeductionText(definition), 174, deductionSize, deductionLines).forEach((line, lineIndex) => page.drawText(line, { x: 300, y: top - 10 - lineIndex * (deductionSize + 1), size: deductionSize, font, color: navy }));
    if (item.exerciseFinished === false) page.drawText('Continues into the next exercise; Exercise Finished follows that exercise.', { x: 65, y: top - rowHeight + 4, size: 5.2, font: bold, color: navy });
  });
  const splitDefinition = rules.exercises.find((exercise) => exercise.allowsPerformanceSegments && plan.items.filter((item) => item.exerciseId === exercise.id).length > 1);
  const setupNotes: string[] = [];
  if (splitDefinition) {
    setupNotes.push(`${splitDefinition.maximumPerformanceSegments === 2 ? 'Heeling is divided between two course locations.' : 'Heeling is divided among multiple course locations.'} Combine deductions from every section into one ${splitDefinition.maximumPoints}-point Heeling score.`);
  }
  if (plan.level === 3) {
    const labels: Record<string, string> = { circle: 'Circle', 'figure-8': 'Figure 8', '270-turn': '270-degree turn' };
    setupNotes.push(`Required Heeling element selected by judge: ${labels[plan.judgeOptions.level3HeelingRequiredElement] || 'Not selected'}`);
  }
  setupNotes.forEach((note, index) => drawText(page, index === setupNotes.length - 1 && plan.level === 3 ? bold : font, note, 27, bottom - 19 - index * 10, 558, index === 0 ? 7.2 : 6.5));
  const generalY = bottom - 19 - setupNotes.length * 11;
  const summaryY = generalY - 33;
  page.drawText('GENERAL NON-QUALIFYING CONDITIONS', { x: 27, y: generalY, size: 6.5, font: bold, color: navy });
  wrapLines(font, OBEDIENCE_GENERAL_NON_QUALIFYING.join(' · '), 390, 5.5, 2).forEach((line, lineIndex) => page.drawText(line, {
    x: 188, y: generalY - lineIndex * 6, size: 5.5, font, color: navy,
  }));
  page.drawRectangle({ x: 27, y: summaryY, width: 558, height: 27, color: light, borderColor: rgb(0.55, 0.62, 0.66), borderWidth: 0.45 });
  page.drawText(`TOTAL: ____ / ${rules.maximumPoints}`, { x: 38, y: summaryY + 9, size: 10, font: bold, color: navy });
  page.drawText(`RESULT: Q / NQ / ABS / WD / EXC / DQ / FEO`, { x: 225, y: summaryY + 9, size: 8, font: bold, color: navy });
  const notesY = summaryY - 78;
  page.drawText('JUDGE NOTES / NQ REASON', { x: 27, y: notesY + 61, size: 8, font: bold, color: navy });
  page.drawRectangle({ x: 27, y: notesY, width: 558, height: 56, borderColor: rgb(0.55, 0.62, 0.66), borderWidth: 0.55 });
  page.drawText(`Ruleset ${plan.rulesetId} | Plan revision ${plan.revision}`, { x: 27, y: 55, size: 6.5, font, color: navy });
  page.drawText('Judge signature:', { x: 330, y: 55, size: 8, font: bold, color: navy });
  page.drawLine({ start: { x: 410, y: 54 }, end: { x: 585, y: 54 }, thickness: 0.55, color: navy });
}

export async function createDisciplineScoreSheetPdf(
  rounds: DisciplineScoreSheetRound[],
  lines: DisciplineScoreSheetLine[],
  trialName: string,
  date: string,
  obedienceTemplates: OfficialObediencePdfTemplates,
  logoBytes?: Uint8Array,
  plansByRound: Record<string, ObedienceClassPlan | undefined> = {},
  options: { draftPreview?: boolean } = {},
) {
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.Helvetica);
  const bold = await output.embedFont(StandardFonts.HelveticaBold);
  const logo = logoBytes ? await output.embedPng(logoBytes) : undefined;

  for (const round of rounds) {
    const type = round.class_type.toLowerCase();
    if (type !== 'obedience') continue;
    for (const line of printableLines(round.id, lines)) {
      const level = obedienceLevel(round.class_name);
      const templateBytes = obedienceTemplates[level];
      if (!templateBytes) throw new Error(`Official Obedience Level ${level} PDF is unavailable.`);
      const plan = plansByRound[round.id];
      const usePlan = Boolean(plan) && (plan?.status === 'finalized' || options.draftPreview) && validateObediencePlan(plan!).length === 0;
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
      if (usePlan) {
        page = output.addPage([612, 792]);
        addObedienceParticipant(page, font, bold, round, line, trialName, date, logo);
        addPlannedExerciseTable(page, font, bold, plan!);
        if (options.draftPreview) {
          page.drawRectangle({ x: 27, y: 752, width: 558, height: 18, color: rgb(1, 0.92, 0.92), borderColor: rgb(0.72, 0.15, 0.05), borderWidth: 0.6 });
          page.drawText('DRAFT PREVIEW - NOT FOR OFFICIAL USE', { x: 194, y: 758, size: 9, font: bold, color: rgb(0.72, 0.15, 0.05) });
        }
        continue;
      }
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
      // Several legacy official PDFs contain small white repair patches over
      // the first exercise-column borders. Redraw those two vertical rules so
      // the printed grid is continuous without changing official score data.
      const officialTableBottom: Record<1 | 2 | 3 | 4 | 5, number> = {
        1: 200,
        2: 125,
        3: 155,
        4: 200,
        5: 154,
      };
      const originX = (612 - 612 * scaleX) / 2;
      const originY = level === 5 ? 24 : 35;
      const tableBottom = originY + officialTableBottom[level] * scaleY;
      const tableTop = originY + officialTableTop[level] * scaleY;
      for (const sourceX of [54, 145]) {
        const lineX = originX + sourceX * scaleX;
        page.drawLine({
          start: { x: lineX, y: tableBottom },
          end: { x: lineX, y: tableTop },
          thickness: 0.8,
          color: rgb(0, 0, 0),
        });
      }
      addObedienceParticipant(page, font, bold, round, line, trialName, date, logo);
    }
  }

  return new Uint8Array(await output.save());
}
