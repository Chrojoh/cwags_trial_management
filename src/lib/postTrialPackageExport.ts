import { zipSync, strToU8 } from 'fflate';
import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import type { PostTrialPackageModel } from './postTrialPackage';
import {
  buildLeagueResultsWorkbook,
  type LeagueWorkbookClass,
} from './leagueResultsWorkbook';

const safeFilename = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'trial';

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

export async function createJudgeSignaturePagesPdf(model: PostTrialPackageModel): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const assignmentsPerColumn = 18;
  const assignmentsPerPage = assignmentsPerColumn * 2;
  model.judges.forEach((judge) => {
    const pageCount = Math.max(1, Math.ceil(judge.assignments.length / assignmentsPerPage));
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const page = pdf.addPage([612, 792]);
      const assignments = judge.assignments.slice(
        pageIndex * assignmentsPerPage,
        (pageIndex + 1) * assignmentsPerPage
      );
      addTitle(page, bold, 'Class Results - Judge Signature Page', model.trial.trial_name);
      page.drawText(
        'Certifying that the judge listed below judged the assigned classes and verifies the results in the Class Results Report.',
        { x: 36, y: 692, size: 9, font, maxWidth: 540 }
      );
      page.drawText(`Judge: ${judge.name}`, { x: 36, y: 660, size: 11, font: bold });
      if (pageCount > 1) {
        page.drawText(`Page ${pageIndex + 1} of ${pageCount}`, {
          x: 500,
          y: 660,
          size: 8,
          font,
        });
      }

      assignments.forEach((assignment, assignmentIndex) => {
        const column = Math.floor(assignmentIndex / assignmentsPerColumn);
        const row = assignmentIndex % assignmentsPerColumn;
        const x = column === 0 ? 42 : 312;
        const y = 625 - row * 24;
        page.drawText(
          `${assignment.trialDate}  ${assignment.className} - Round ${assignment.roundNumber}`,
          { x, y, size: 9, font, maxWidth: 252 }
        );
      });

      page.drawLine({ start: { x: 36, y: 125 }, end: { x: 380, y: 125 }, thickness: 0.7 });
      page.drawText('Judge signature', { x: 36, y: 109, size: 8, font });
      page.drawLine({ start: { x: 420, y: 125 }, end: { x: 576, y: 125 }, thickness: 0.7 });
      page.drawText('Date', { x: 420, y: 109, size: 8, font });
    }
  });
  if (pdf.getPageCount() === 0) {
    const page = pdf.addPage([612, 792]);
    addTitle(page, bold, 'Class Results — Judge Signature Page', model.trial.trial_name);
    page.drawText('No assigned judges were found.', { x: 36, y: 690, size: 10, font });
  }
  return pdf.save();
}

export async function createReadinessReportPdf(model: PostTrialPackageModel): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([612, 792]);
  addTitle(page, bold, 'Secretary Closing Readiness Report', model.trial.trial_name);
  page.drawText(`Status: ${model.ready ? 'READY FOR SECRETARY REVIEW' : 'REVIEW REQUIRED'}`, { x: 36, y: 690, size: 12, font: bold, color: model.ready ? rgb(0.05, 0.45, 0.18) : rgb(0.75, 0.35, 0.05) });
  const rows: Array<[string, number]> = [
    ['Entries awaiting acceptance', model.issues.awaitingAcceptance],
    ['Pending registration numbers', model.issues.pendingRegistration],
    ['TBA or unassigned judges', model.issues.placeholderJudges],
    ['Missing scores', model.issues.missingScores],
    ['Outstanding balances', model.issues.outstandingBalances],
  ];
  let y = 640;
  rows.forEach(([label, count]) => {
    page.drawText(label, { x: 52, y, size: 10, font });
    page.drawText(String(count), { x: 520, y, size: 10, font: bold });
    page.drawLine({ start: { x: 52, y: y - 8 }, end: { x: 550, y: y - 8 }, thickness: 0.35, color: rgb(0.75, 0.75, 0.75) });
    y -= 42;
  });
  page.drawText('This is an internal secretary checklist, not a C-WAGS submission form.', { x: 36, y: 380, size: 10, font: bold });
  page.drawText('Resolve the items above, export the official Excel summary, collect judge signature pages, and review all documents before submission.', { x: 36, y: 355, size: 9, font, maxWidth: 540, lineHeight: 13 });
  return pdf.save();
}

export function postTrialModelToLeagueWorkbookClasses(
  model: PostTrialPackageModel
): LeagueWorkbookClass[] {
  const classes = new Map<string, LeagueWorkbookClass>();

  model.classResults.forEach((report) => {
    let classData = classes.get(report.className);
    if (!classData) {
      classData = { className: report.className, participants: [], rounds: [] };
      classes.set(report.className, classData);
    }

    const participantNumbers = new Set(
      classData.participants.map((participant) => participant.cwagsNumber)
    );
    const results = new Map<string, string | number>();
    report.rows
      .filter((row) => row.entryType === 'REGULAR')
      .forEach((row) => {
        if (!participantNumbers.has(row.cwagsNumber)) {
          classData!.participants.push({
            cwagsNumber: row.cwagsNumber,
            dogName: row.dogName,
            handlerName: row.handlerName,
          });
          participantNumbers.add(row.cwagsNumber);
        }

        let result: string | number = row.result || '-';
        if (result === 'P') result = 'Pass';
        else if (result === 'ABS') result = 'Abs';
        else if (/^-?\d+(\.\d+)?$/.test(String(result))) result = Number(result);
        results.set(row.cwagsNumber, result);
      });

    classData.rounds.push({
      judgeInfo: report.judgeName || 'TBD',
      trialDate: report.trialDate,
      roundNumber: report.roundNumber,
      results,
    });
  });

  return [...classes.values()];
}

export function createOfficialResultsWorkbook(
  templateBytes: Uint8Array,
  model: PostTrialPackageModel
): Uint8Array {
  return buildLeagueResultsWorkbook(
    templateBytes,
    {
      trialName: model.trial.trial_name,
      clubName: model.trial.club_name,
      location: model.trial.location || '',
      startDate: model.trial.start_date,
      endDate: model.trial.end_date,
    },
    postTrialModelToLeagueWorkbookClasses(model)
  );
}

export async function createPostTrialPackageZip(
  model: PostTrialPackageModel,
  officialResultsWorkbook: Uint8Array
): Promise<Uint8Array> {
  const base = safeFilename(model.trial.trial_name);
  const [judgeSignatures, readiness] = await Promise.all([
    createJudgeSignaturePagesPdf(model),
    createReadinessReportPdf(model),
  ]);
  const readme = [
    'C-WAGS Post-Trial Package - Secretary Review',
    '',
    `Trial: ${model.trial.trial_name}`,
    `Status: ${model.ready ? 'READY' : 'REVIEW REQUIRED'}`,
    '',
    '1. Open the trial Summary page and use Export Summary Excel. That export populates the official C-WAGS results workbook.',
    '2. Review the workbook and obtain each judge signature on the included Class Results Judge Signature pages.',
    '3. The readiness PDF is an internal secretary checklist and is not submitted to C-WAGS.',
    '4. Review all records before sending the official workbook and required signatures to C-WAGS.',
  ].join('\r\n');
  return zipSync({
    [`${base}-Official-Results.xlsx`]: officialResultsWorkbook,
    [`${base}-Judge-Signature-Pages.pdf`]: judgeSignatures,
    [`${base}-Secretary-Readiness.pdf`]: readiness,
    'README.txt': strToU8(readme),
  });
}

export function postTrialPackageFilename(model: PostTrialPackageModel): string {
  return `${safeFilename(model.trial.trial_name)}-post-trial-package.zip`;
}
