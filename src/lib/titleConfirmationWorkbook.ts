import XLSX from 'xlsx-js-style';

export interface TitleConfirmationExportRow {
  award: string;
  confirmed: boolean;
  cwagsNumber: string;
  dogName: string;
  handlerName: string;
  className: string;
  priorQs: number;
  trialQs: number;
  qsRequired: number;
  priorJudges: number;
  trialJudges: number;
  judgesRequired: number;
  priorJudgeNames: string;
  trialJudgeNames: string;
  judgeRequirementMet: string;
  priorGameTypes: number;
  trialGameTypes: number;
  gameTypesRequired: number;
}

const headers = [
  'Award',
  'Secretary Status',
  'C-WAGS #',
  'Dog',
  'Handler',
  'Class',
  'Prior Qs',
  'Q’s This Trial',
  'Q’s Required',
  'Prior Judge Count',
  'Trial Judge Count',
  'Judges Required',
  'Prior Judge Names',
  'Judges This Trial',
  'Judge Requirement',
  'Prior Game Types',
  'Game Types This Trial',
  'Game Types Required',
  'Independent Review',
  'Reviewer Notes',
];

export function buildTitleConfirmationWorkbook(
  trialName: string,
  rows: TitleConfirmationExportRow[]
): Uint8Array {
  const data = [
    [`${trialName} - Title and Ace Confirmation`],
    ['Review the evidence below and complete the final two columns before awards are issued.'],
    [],
    headers,
    ...rows.map((row) => [
      row.award,
      row.confirmed ? 'Confirmed' : 'Review',
      row.cwagsNumber,
      row.dogName,
      row.handlerName,
      row.className,
      row.priorQs,
      row.trialQs,
      row.qsRequired,
      row.priorJudges,
      row.trialJudges,
      row.judgesRequired,
      row.priorJudgeNames,
      row.trialJudgeNames,
      row.judgeRequirementMet,
      row.priorGameTypes,
      row.trialGameTypes,
      row.gameTypesRequired,
      '',
      '',
    ]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet['!merges'] = [XLSX.utils.decode_range('A1:T1'), XLSX.utils.decode_range('A2:T2')];
  sheet['!freeze'] = { xSplit: 0, ySplit: 4 } as any;
  sheet['!autofilter'] = { ref: `A4:T${Math.max(4, rows.length + 4)}` };
  sheet['!cols'] = [
    { wch: 12 },
    { wch: 16 },
    { wch: 15 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 10 },
    { wch: 13 },
    { wch: 12 },
    { wch: 13 },
    { wch: 16 },
    { wch: 16 },
    { wch: 28 },
    { wch: 28 },
    { wch: 20 },
    { wch: 17 },
    { wch: 21 },
    { wch: 20 },
    { wch: 20 },
    { wch: 32 },
  ];
  const title = sheet.A1;
  title.s = {
    font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: 'C65911' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  sheet.A2.s = {
    font: { italic: true, color: { rgb: '7F6000' } },
    fill: { fgColor: { rgb: 'FFF2CC' } },
    alignment: { horizontal: 'left' },
  };
  for (let column = 0; column < headers.length; column++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 3, c: column })];
    cell.s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: 'ED7D31' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: 'FFFFFF' } },
        bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
        left: { style: 'thin', color: { rgb: 'FFFFFF' } },
        right: { style: 'thin', color: { rgb: 'FFFFFF' } },
      },
    };
  }
  for (let row = 4; row < rows.length + 4; row++) {
    for (let column = 0; column < headers.length; column++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
      if (!cell) continue;
      cell.s = {
        fill: { fgColor: { rgb: row % 2 === 0 ? 'FFF2E5' : 'FFFFFF' } },
        alignment: { vertical: 'top', wrapText: column >= 15 },
        border: { bottom: { style: 'thin', color: { rgb: 'D9D9D9' } } },
      };
    }
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Award confirmation');
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}
