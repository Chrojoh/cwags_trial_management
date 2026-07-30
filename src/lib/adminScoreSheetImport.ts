import * as XLSX from 'xlsx';

export type ScoreSheetType = 'league' | 'two-column' | 'one-column' | 'unknown';
export type ImportedResult = 'Pass' | 'Fail' | 'NQ' | 'ABS';

export interface ParsedScoreRecord {
  registrationNumber: string;
  dogName: string;
  trialDate: string;
  className: string;
  roundNumber: number;
  judgeName: string;
  result: ImportedResult;
  sourceSheet: string;
  sourceRow: number;
}

export interface ScoreSheetDetection {
  sheetName: string;
  type: ScoreSheetType;
  resultCount: number;
}

export interface ParsedScoreWorkbook {
  trialName: string;
  clubName: string;
  records: ParsedScoreRecord[];
  detections: ScoreSheetDetection[];
  warnings: string[];
  errors: string[];
}

const SKIP_SHEETS = new Set([
  'example. directions_sheet',
  'example_sheet',
  'example directions_sheet',
  'trial_recap',
  'trial recap',
  'master',
  'total entries',
  'consolidatedresults',
  'summary',
]);

const normalizedSheetKey = (sheetName: string) =>
  sheetName.trim().toLowerCase().replace(/\s+/g, ' ');

const cellValue = (sheet: XLSX.WorkSheet, row: number, column: number) =>
  sheet[XLSX.utils.encode_cell({ r: row - 1, c: column - 1 })]?.v;

const isBlank = (value: unknown) =>
  value === undefined || value === null || String(value).trim() === '';

const lastDataRow = (sheet: XLSX.WorkSheet, column: number) => {
  if (!sheet['!ref']) return 0;
  const range = XLSX.utils.decode_range(sheet['!ref']);
  for (let row = range.e.r + 1; row >= range.s.r + 1; row--) {
    if (!isBlank(cellValue(sheet, row, column))) return row;
  }
  return 0;
};

const parseDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    return parsed ? new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)) : null;
  }
  const text = String(value ?? '').trim();
  if (!text) return null;
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (match) {
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    const date = new Date(Date.UTC(year, Number(match[1]) - 1, Number(match[2])));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const databaseDate = (date: Date) => date.toISOString().slice(0, 10);

export const normalizeRegistrationNumber = (input: unknown) => {
  const original = String(input ?? '').trim();
  if (!original) return '';
  const digits = original.replace(/[^0-9]/g, '');
  if (digits.length === 8) return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 8)}`;
  if (digits.length === 7) {
    const padded = ['7', '8', '9'].includes(digits[0]) ? `0${digits}` : `${digits.slice(0, 6)}0${digits.slice(6)}`;
    return `${padded.slice(0, 2)}-${padded.slice(2, 6)}-${padded.slice(6, 8)}`;
  }
  return original;
};

export const normalizeImportedClassName = (input: unknown) => {
  let name = String(input ?? '').trim().replace(/^League\s+/i, '').replace(/^CWAGS\s+/i, '');
  const key = name.toUpperCase().replace(/\s+/g, ' ');
  const aliases: Record<string, string> = {
    PATROL: 'Patrol 1',
    DETECTIVE: 'Detective 2',
    INVESTIGATOR: 'Investigator 3',
    'SUPER SLEUTH': 'Super Sleuth 4',
    'PRIVATE INV': 'Private Investigator',
    'PRIVATE INVESTIGATOR': 'Private Investigator',
    'DET DIVERSIONS': 'Detective Diversions',
    'DETECTIVE DIVERSIONS': 'Detective Diversions',
  };
  if (aliases[key]) return aliases[key];
  if (/OVERSEERS/i.test(name)) return 'Detective Diversions';
  return name;
};

export const normalizeImportedResult = (input: unknown): ImportedResult | null => {
  const result = String(input ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
  if (!result || ['-', 'NA', 'N/A'].includes(result)) return null;
  if (['F', 'FAIL', 'FAILED'].includes(result)) return 'Fail';
  if (['NQ', 'NON-QUALIFYING', 'NON QUALIFYING', 'X'].includes(result)) return 'NQ';
  if (['ABS', 'ABSENT'].includes(result)) return 'ABS';
  if (['P', 'PASS', 'Q', 'QUALIFYING', 'QUALIFIED', 'GB', 'BJ', 'T', 'C'].includes(result)) return 'Pass';
  return null;
};

export const detectScoreSheetType = (sheet: XLSX.WorkSheet): ScoreSheetType => {
  const d6 = String(cellValue(sheet, 6, 4) ?? '').trim().toLowerCase();
  if (d6 !== 'date') return 'league';
  let judgeHeaders = 0;
  for (let column = 6; column <= 11; column++) {
    if (String(cellValue(sheet, 6, column) ?? '').toLowerCase().includes('judge')) judgeHeaders++;
  }
  if (judgeHeaders >= 2) return 'two-column';
  if (judgeHeaders === 1) return 'one-column';
  return 'unknown';
};

const makeRecord = (
  sheetName: string,
  row: number,
  registration: unknown,
  dogName: unknown,
  date: Date,
  className: unknown,
  roundNumber: number,
  judgeName: unknown,
  resultValue: unknown,
  warnings: string[]
): ParsedScoreRecord | null => {
  const result = normalizeImportedResult(resultValue);
  if (!result) {
    if (!isBlank(resultValue)) warnings.push(`${sheetName}, row ${row}: unrecognized result "${String(resultValue)}" was skipped.`);
    return null;
  }
  const normalizedClass = normalizeImportedClassName(className);
  if (!normalizedClass) {
    warnings.push(`${sheetName}, row ${row}: class name is blank; result was skipped.`);
    return null;
  }
  return {
    registrationNumber: normalizeRegistrationNumber(registration),
    dogName: String(dogName ?? '').trim(),
    trialDate: databaseDate(date),
    className: normalizedClass,
    roundNumber: Math.max(1, Number(roundNumber) || 1),
    judgeName: String(judgeName ?? '').trim() || 'Unknown Judge',
    result,
    sourceSheet: sheetName,
    sourceRow: row,
  };
};

const parseOneColumn = (sheet: XLSX.WorkSheet, sheetName: string, warnings: string[]) => {
  const records: ParsedScoreRecord[] = [];
  for (let row = 7; row <= lastDataRow(sheet, 1); row++) {
    const registration = cellValue(sheet, row, 1);
    const result = cellValue(sheet, row, 7);
    if (isBlank(registration) || isBlank(result)) continue;
    const date = parseDate(cellValue(sheet, row, 4));
    if (!date) {
      warnings.push(`${sheetName}, row ${row}: the date could not be read; result was skipped.`);
      continue;
    }
    const record = makeRecord(sheetName, row, registration, cellValue(sheet, row, 2), date, cellValue(sheet, row, 5), Number(cellValue(sheet, row, 6)) || 1, cellValue(sheet, row, 8), result, warnings);
    if (record) records.push(record);
  }
  return records;
};

const parseTwoColumn = (sheet: XLSX.WorkSheet, sheetName: string, warnings: string[]) => {
  const records: ParsedScoreRecord[] = [];
  for (let row = 7; row <= lastDataRow(sheet, 1); row++) {
    const registration = cellValue(sheet, row, 1);
    if (isBlank(registration)) continue;
    const first = cellValue(sheet, row, 6);
    const second = cellValue(sheet, row, 8);
    if (isBlank(first) && isBlank(second)) continue;
    const date = parseDate(cellValue(sheet, row, 4));
    if (!date) {
      warnings.push(`${sheetName}, row ${row}: the date could not be read; results were skipped.`);
      continue;
    }
    if (!isBlank(first)) {
      const record = makeRecord(sheetName, row, registration, cellValue(sheet, row, 2), date, cellValue(sheet, row, 5), 1, cellValue(sheet, row, 7), first, warnings);
      if (record) records.push(record);
    }
    if (!isBlank(second)) {
      const record = makeRecord(sheetName, row, registration, cellValue(sheet, row, 2), date, cellValue(sheet, row, 5), 2, cellValue(sheet, row, 9), second, warnings);
      if (record) records.push(record);
    }
  }
  return records;
};

const parseLeague = (sheet: XLSX.WorkSheet, sheetName: string, warnings: string[]) => {
  const records: ParsedScoreRecord[] = [];
  const className = cellValue(sheet, 3, 6);
  const columns: Array<{ column: number; date: Date; judge: unknown; round: number }> = [];
  for (let column = 4; column <= 60; column++) {
    const row5 = cellValue(sheet, 5, column);
    const row6 = cellValue(sheet, 6, column);
    if (isBlank(row5) && isBlank(row6)) continue;
    const date5 = parseDate(row5);
    const date6 = parseDate(row6);
    if (date6 && !date5) columns.push({ column, date: date6, judge: row5, round: column - 3 });
    else if (date5 && !date6) {
      columns.push({ column, date: date5, judge: row6, round: column - 3 });
      warnings.push(`${sheetName}, column ${XLSX.utils.encode_col(column - 1)}: date and judge rows were swapped and were corrected.`);
    } else if (date5 && date6) {
      columns.push({ column, date: date6, judge: row5, round: column - 3 });
      warnings.push(`${sheetName}, column ${XLSX.utils.encode_col(column - 1)}: both header cells looked like dates; row 6 was used.`);
    }
  }
  if (columns.length === 0) warnings.push(`${sheetName}: no usable league date columns were found.`);
  for (let row = 7; row <= lastDataRow(sheet, 1); row++) {
    const registration = cellValue(sheet, row, 1);
    if (isBlank(registration)) continue;
    for (const column of columns) {
      const result = cellValue(sheet, row, column.column);
      if (isBlank(result)) continue;
      const record = makeRecord(sheetName, row, registration, cellValue(sheet, row, 2), column.date, className, column.round, column.judge, result, warnings);
      if (record) records.push(record);
    }
  }
  return records;
};

const cleanFileName = (fileName: string) => fileName.replace(/\.(xlsx|xlsm|xls)$/i, '').replace(/[_-]+/g, ' ').trim();

export const parseScoreSheetWorkbook = (buffer: ArrayBuffer | Uint8Array, fileName: string): ParsedScoreWorkbook => {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const warnings: string[] = [];
  const errors: string[] = [];
  const detections: ScoreSheetDetection[] = [];
  const records: ParsedScoreRecord[] = [];
  let metadataTitle = '';
  let metadataClub = '';

  // The current organization template stores the host on the recap sheet.
  // Recap is metadata-only and must never be interpreted as a score sheet.
  const recapName = workbook.SheetNames.find((sheetName) => {
    const key = normalizedSheetKey(sheetName).replace(/_/g, ' ');
    return key === 'trial recap';
  });
  if (recapName) {
    metadataClub = String(cellValue(workbook.Sheets[recapName], 4, 2) ?? '').trim();
  }

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const key = normalizedSheetKey(sheetName);
    if (SKIP_SHEETS.has(key) || lastDataRow(sheet, 1) < 7) continue;
    if (!metadataTitle) metadataTitle = String(cellValue(sheet, 1, 1) ?? '').trim();
    const type = detectScoreSheetType(sheet);
    let sheetRecords: ParsedScoreRecord[] = [];
    if (type === 'one-column') sheetRecords = parseOneColumn(sheet, sheetName, warnings);
    else if (type === 'two-column') sheetRecords = parseTwoColumn(sheet, sheetName, warnings);
    else if (type === 'league') sheetRecords = parseLeague(sheet, sheetName, warnings);
    else errors.push(`${sheetName}: unable to detect one-column, two-column, or league format.`);
    detections.push({ sheetName, type, resultCount: sheetRecords.length });
    records.push(...sheetRecords);
  }

  const unique = new Map<string, ParsedScoreRecord>();
  for (const record of records) {
    const key = [record.registrationNumber, record.trialDate, record.className.toLowerCase(), record.roundNumber].join('|');
    if (unique.has(key)) warnings.push(`${record.sourceSheet}, row ${record.sourceRow}: duplicate dog/class/round result was ignored.`);
    else unique.set(key, record);
  }
  if (unique.size === 0) errors.push('No recognized score results were found in the workbook.');

  const genericTitle = /^(cwags|registration|reg(istration)?\s*(number|#)?)$/i.test(metadataTitle);
  return {
    trialName: !metadataTitle || genericTitle ? cleanFileName(fileName) : metadataTitle,
    clubName: metadataClub,
    records: Array.from(unique.values()).sort((a, b) => a.trialDate.localeCompare(b.trialDate) || a.className.localeCompare(b.className) || a.roundNumber - b.roundNumber),
    detections,
    warnings,
    errors,
  };
};
