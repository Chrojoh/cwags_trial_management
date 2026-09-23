import { zipSync, strToU8 } from 'fflate';
import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import XLSX from 'xlsx-js-style';
import type { ClassResultsReport, PostTrialPackageModel } from './postTrialPackage';

const safeFilename = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'trial';

const money = (value: number) => Number(value.toFixed(2));

const addTitle = (
  page: PDFPage,
  bold: PDFFont,
  title: string,
  subtitle: string
) => {
  page.drawText(title, { x: 36, y: 754, size: 16, font: bold, color: rgb(0.11, 0.15, 0.22) });
  page.drawText(subtitle, { x: 36, y: 734, size: 9, font: bold, color: rgb(0.35, 0.38, 0.44) });
  page.drawLine({ start: { x: 36, y: 722 }, end: { x: 576, y: 722 }, thickness: 1 });
};

const fitText = (font: PDFFont, text: string, maxWidth: number, preferred = 8) => {
  let size = preferred;
  while (size > 5.5 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
  return size;
};

const resultTablePage = (
  pdf: PDFDocument,
  report: ClassResultsReport,
  model: PostTrialPackageModel,
  rows: ClassResultsReport['rows'],
  pageNumber: number,
  pageCount: number,
  font: PDFFont,
  bold: PDFFont
) => {
  const page = pdf.addPage([612, 792]);
  addTitle(
    page,
    bold,
    'Class Results Report',
    `${model.trial.trial_name} • ${model.trial.club_name}`
  );
  page.drawText(`Date: ${report.trialDate}`, { x: 36, y: 700, size: 9, font });
  page.drawText(`Class: ${report.className}`, { x: 160, y: 700, size: 9, font: bold });
  page.drawText(`Round: ${report.roundNumber}`, { x: 355, y: 700, size: 9, font });
  page.drawText(`Judge: ${report.judgeName || 'UNASSIGNED'}`, { x: 435, y: 700, size: 9, font });
  page.drawText(`Page ${pageNumber} of ${pageCount}`, { x: 500, y: 682, size: 7, font });

  const columns = [
    { label: '#', x: 36, width: 24 },
    { label: 'C-WAGS #', x: 60, width: 72 },
    { label: 'Dog', x: 132, width: 85 },
    { label: 'Handler', x: 217, width: 125 },
    { label: 'Type', x: 342, width: 48 },
    { label: 'Division', x: 390, width: 65 },
    { label: 'Result', x: 455, width: 55 },
    { label: 'Time', x: 510, width: 66 },
  ];
  let y = 660;
  columns.forEach((column) => {
    page.drawRectangle({
      x: column.x,
      y,
      width: column.width,
      height: 20,
      color: rgb(0.94, 0.87, 0.78),
      borderColor: rgb(0.2, 0.2, 0.2),
      borderWidth: 0.6,
    });
    page.drawText(column.label, { x: column.x + 3, y: y + 6, size: 7, font: bold });
  });
  y -= 20;
  rows.forEach((row) => {
    const values = [
      String(row.runningNumber),
      row.cwagsNumber,
      row.dogName,
      row.handlerName,
      row.entryType,
      row.division || '',
      row.result || 'MISSING',
      row.timeSeconds == null ? '' : `${row.timeSeconds.toFixed(2)} s`,
    ];
    columns.forEach((column, index) => {
      page.drawRectangle({
        x: column.x,
        y,
        width: column.width,
        height: 20,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.35, 0.35, 0.35),
        borderWidth: 0.4,
      });
      const value = values[index];
      page.drawText(value, {
        x: column.x + 3,
        y: y + 6,
        size: fitText(font, value, column.width - 6, 7),
        font,
      });
    });
    y -= 20;
  });

  if (pageNumber === pageCount) {
    const summary = report.totals;
    page.drawText(
      `Regular runs: ${summary.regularRuns}   FEO: ${summary.feoRuns}   Passes: ${summary.passes}   Fails/NQ: ${summary.fails}   ABS: ${summary.absences}   Missing: ${summary.missingResults}`,
      { x: 36, y: 92, size: 8, font: bold }
    );
    page.drawLine({ start: { x: 36, y: 52 }, end: { x: 270, y: 52 }, thickness: 0.7 });
    page.drawLine({ start: { x: 330, y: 52 }, end: { x: 576, y: 52 }, thickness: 0.7 });
    page.drawText('Judge signature', { x: 36, y: 38, size: 8, font });
    page.drawText('Trial Secretary signature', { x: 330, y: 38, size: 8, font });
  }
};

export async function createClassResultsPdf(model: PostTrialPackageModel): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const rowsPerPage = 25;
  model.classResults.forEach((report) => {
    const pageCount = Math.max(1, Math.ceil(report.rows.length / rowsPerPage));
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      resultTablePage(
        pdf,
        report,
        model,
        report.rows.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage),
        pageIndex + 1,
        pageCount,
        font,
        bold
      );
    }
  });
  if (pdf.getPageCount() === 0) {
    const page = pdf.addPage([612, 792]);
    addTitle(page, bold, 'Class Results Report', model.trial.trial_name);
    page.drawText('No reportable class results were found.', { x: 36, y: 690, size: 11, font });
  }
  return pdf.save();
}

export async function createJudgeFormsPdf(model: PostTrialPackageModel): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const signaturePage = pdf.addPage([612, 792]);
  addTitle(signaturePage, bold, 'Judge Signature Summary', model.trial.trial_name);
  let y = 690;
  model.judges.forEach((judge) => {
    signaturePage.drawText(`${judge.name} (${judge.assignedRounds} assigned round${judge.assignedRounds === 1 ? '' : 's'})`, {
      x: 36,
      y,
      size: 10,
      font: bold,
    });
    signaturePage.drawLine({ start: { x: 300, y: y - 2 }, end: { x: 520, y: y - 2 }, thickness: 0.7 });
    signaturePage.drawText('Signature', { x: 525, y: y - 5, size: 7, font });
    y -= 36;
  });
  if (model.judges.length === 0) {
    signaturePage.drawText('No assigned judges were found.', { x: 36, y, size: 10, font });
  }

  model.judges.forEach((judge) => {
    const page = pdf.addPage([612, 792]);
    addTitle(page, bold, 'Judge Evaluation', `${model.trial.trial_name} • ${judge.name}`);
    page.drawText(`Trial date(s): ${model.trial.start_date} to ${model.trial.end_date}`, {
      x: 36,
      y: 692,
      size: 10,
      font,
    });
    page.drawText(`Assigned rounds: ${judge.assignedRounds}`, { x: 36, y: 670, size: 10, font });
    const prompts = [
      'Prepared and organized',
      'Clear competitor instructions',
      'Consistent rule application',
      'Professional conduct',
      'Overall evaluation',
    ];
    let promptY = 625;
    prompts.forEach((prompt) => {
      page.drawText(prompt, { x: 36, y: promptY, size: 10, font: bold });
      page.drawText('Excellent     Good     Satisfactory     Needs follow-up', {
        x: 250,
        y: promptY,
        size: 9,
        font,
      });
      promptY -= 36;
    });
    page.drawText('Comments:', { x: 36, y: 415, size: 10, font: bold });
    for (let line = 0; line < 8; line += 1) {
      const lineY = 390 - line * 28;
      page.drawLine({ start: { x: 36, y: lineY }, end: { x: 576, y: lineY }, thickness: 0.4 });
    }
    page.drawLine({ start: { x: 36, y: 105 }, end: { x: 280, y: 105 }, thickness: 0.7 });
    page.drawText('Trial Secretary signature', { x: 36, y: 91, size: 8, font });
    page.drawLine({ start: { x: 340, y: 105 }, end: { x: 576, y: 105 }, thickness: 0.7 });
    page.drawText('Date', { x: 340, y: 91, size: 8, font });
  });
  return pdf.save();
}

const styleHeader = (sheet: XLSX.WorkSheet, range: string) => {
  const decoded = XLSX.utils.decode_range(range);
  for (let column = decoded.s.c; column <= decoded.e.c; column += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: decoded.s.r, c: column })];
    if (!cell) continue;
    cell.s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: 'A94716' } },
      alignment: { horizontal: 'center' },
    };
  }
};

export function createTrialRecapWorkbook(model: PostTrialPackageModel): Uint8Array {
  const workbook = XLSX.utils.book_new();
  const recapRows: Array<Array<string | number>> = [
    ['C-WAGS Trial Submission Package — Secretary Review'],
    ['Trial', model.trial.trial_name],
    ['Club', model.trial.club_name],
    ['Location', model.trial.location || ''],
    ['Dates', `${model.trial.start_date} to ${model.trial.end_date}`],
    [],
    ['Metric', 'Value'],
    ['Accepted entries', model.recap.acceptedEntries],
    ['Regular selections entered', model.recap.regularSelections],
    ['FEO selections entered', model.recap.feoSelections],
    ['Completed regular runs', model.recap.scoredRegularRuns],
    ['Passes', model.recap.passes],
    ['Fails / NQ', model.recap.fails],
    ['ABS', model.recap.absences],
    ['C-WAGS fee per entered regular run', money(model.recap.cwagsFeePerRun)],
    ['Estimated C-WAGS amount due', money(model.recap.cwagsAmountDue)],
  ];
  const recap = XLSX.utils.aoa_to_sheet(recapRows);
  recap['!cols'] = [{ wch: 42 }, { wch: 30 }];
  recap['!merges'] = [XLSX.utils.decode_range('A1:B1')];
  styleHeader(recap, 'A7:B7');
  ['B15', 'B16'].forEach((address) => {
    if (recap[address]) recap[address].z = '$0.00';
  });
  XLSX.utils.book_append_sheet(workbook, recap, 'Trial Recap');

  const readiness = XLSX.utils.aoa_to_sheet([
    ['Closing Readiness', 'Count'],
    ['Entries awaiting acceptance', model.issues.awaitingAcceptance],
    ['Pending registration numbers', model.issues.pendingRegistration],
    ['TBA or unassigned judges', model.issues.placeholderJudges],
    ['Missing scores', model.issues.missingScores],
    ['Outstanding balances', model.issues.outstandingBalances],
    ['Overall status', model.ready ? 'READY' : 'REVIEW REQUIRED'],
  ]);
  readiness['!cols'] = [{ wch: 34 }, { wch: 20 }];
  styleHeader(readiness, 'A1:B1');
  XLSX.utils.book_append_sheet(workbook, readiness, 'Readiness');

  const classRows: Array<Array<string | number>> = [
    ['Date', 'Class', 'Round', 'Judge', 'Selections', 'Regular Runs', 'FEO', 'Passes', 'Fails/NQ', 'ABS', 'Missing'],
    ...model.classResults.map((report) => [
      report.trialDate,
      report.className,
      report.roundNumber,
      report.judgeName,
      report.totals.selections,
      report.totals.regularRuns,
      report.totals.feoRuns,
      report.totals.passes,
      report.totals.fails,
      report.totals.absences,
      report.totals.missingResults,
    ]),
  ];
  const classes = XLSX.utils.aoa_to_sheet(classRows);
  classes['!cols'] = [
    { wch: 12 }, { wch: 22 }, { wch: 8 }, { wch: 24 },
    { wch: 12 }, { wch: 13 }, { wch: 8 }, { wch: 9 },
    { wch: 10 }, { wch: 8 }, { wch: 10 },
  ];
  classes['!autofilter'] = { ref: `A1:K${Math.max(1, classRows.length)}` };
  styleHeader(classes, 'A1:K1');
  XLSX.utils.book_append_sheet(workbook, classes, 'Class Summary');

  const judges = XLSX.utils.aoa_to_sheet([
    ['Judge', 'Assigned Rounds', 'Signature Received', 'Evaluation Included'],
    ...model.judges.map((judge) => [judge.name, judge.assignedRounds, '', '']),
  ]);
  judges['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 22 }, { wch: 22 }];
  styleHeader(judges, 'A1:D1');
  XLSX.utils.book_append_sheet(workbook, judges, 'Judges');

  return new Uint8Array(
    XLSX.write(workbook, { type: 'array', bookType: 'xlsx', compression: true })
  );
}

export async function createPostTrialPackageZip(model: PostTrialPackageModel): Promise<Uint8Array> {
  const base = safeFilename(model.trial.trial_name);
  const [classResults, judgeForms] = await Promise.all([
    createClassResultsPdf(model),
    createJudgeFormsPdf(model),
  ]);
  const recap = createTrialRecapWorkbook(model);
  const readme = [
    'C-WAGS Trial Submission Package — Secretary Review',
    '',
    `Trial: ${model.trial.trial_name}`,
    `Status: ${model.ready ? 'READY' : 'REVIEW REQUIRED'}`,
    '',
    'Review every document before submitting it to C-WAGS.',
    'The estimated C-WAGS amount uses the saved per-run value and can be replaced by the final payment amount.',
    'Class Results pages require the Trial Secretary and Judge signatures.',
  ].join('\r\n');
  return zipSync({
    [`${base}-Trial-Recap.xlsx`]: recap,
    [`${base}-Class-Results.pdf`]: classResults,
    [`${base}-Judge-Forms.pdf`]: judgeForms,
    [`${base}-Readiness.json`]: strToU8(JSON.stringify({ ready: model.ready, issues: model.issues }, null, 2)),
    'README.txt': strToU8(readme),
  });
}

export function postTrialPackageFilename(model: PostTrialPackageModel): string {
  return `${safeFilename(model.trial.trial_name)}-post-trial-package.zip`;
}
