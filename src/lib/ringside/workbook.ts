import * as XLSX from 'xlsx';
export interface ParsedRun {
  ringNumber: number;
  ringName: string;
  blockTitle: string;
  judgeName: string;
  runningOrder: number;
  registrationNumber: string;
  handlerName: string;
  dogName: string;
  notes: string;
}
export interface WorkbookPreview {
  runs: ParsedRun[];
  summary: {
    rings: number;
    ringNames: string[];
    classes: number;
    runs: number;
    missingRegistrationNumbers: number;
    unrecognizedBlocks: number;
    ignoredWorksheets: string[];
    warnings: string[];
  };
}
const clean = (v: unknown, max = 240) =>
  String(v ?? '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .slice(0, max);
const norm = (v: unknown) =>
  clean(v)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const aliases = {
  order: ['running order', 'run order', 'position', 'order'],
  registration: [
    'registration number',
    'registration',
    'reg number',
    'reg no',
    'c wags number',
    'cwags number',
  ],
  handler: ['handler name', 'handler', 'competitor', 'exhibitor'],
  dog: ['dog name', 'dog', 'call name'],
  notes: ['entry notes', 'entry note', 'notes', 'note'],
};
const headerKey = (v: unknown) =>
  Object.entries(aliases).find(([, a]) => a.includes(norm(v)))?.[0] || '';
const classLike = (v: string) =>
  /\b(round|reset|patrol|detective|investigator|sleuth|diversion|ranger|dasher|obedience|starter|advanced|pro|arf|zoom|games?)\b/i.test(
    v
  );
export function parseRingsideWorkbook(buffer: ArrayBuffer | Uint8Array): WorkbookPreview {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const runs: ParsedRun[] = [];
  const ignored: string[] = [];
  const warnings: string[] = [];
  let unrecognized = 0;
  workbook.SheetNames.forEach((sheetName, sheetIndex) => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      raw: true,
      defval: '',
    });
    const ringNumber = Number(sheetName.match(/ring\s*(\d+)/i)?.[1] || sheetIndex + 1);
    const blocks: { row: number; map: Record<string, number> }[] = [];
    rows.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (headerKey(cell) !== 'order') return;
        const map: Record<string, number> = { order: c };
        for (let x = c + 1; x < Math.min(row.length, c + 10); x++) {
          const k = headerKey(row[x]);
          if (k && map[k] === undefined) map[k] = x;
        }
        if (map.registration !== undefined && map.handler !== undefined && map.dog !== undefined)
          blocks.push({ row: r, map });
      });
    });
    if (!blocks.length) {
      ignored.push(sheetName);
      return;
    }
    let ringName = '';
    for (let r = 0; r < Math.min(blocks[0].row, 15); r++) {
      const cells = rows[r].map((v) => clean(v)).filter(Boolean);
      if (
        cells.length === 1 &&
        !classLike(cells[0]) &&
        !/^judge/i.test(cells[0]) &&
        !/^ring\s*\d+$/i.test(cells[0])
      ) {
        ringName = cells[0];
        break;
      }
    }
    ringName = ringName || `Ring ${ringNumber}`;
    blocks.forEach((block) => {
      let title = '',
        judge = '';
      for (let r = block.row - 1; r >= Math.max(0, block.row - 10); r--) {
        const text = rows[r]
          .slice(block.map.order, block.map.order + 8)
          .map((v) => clean(v))
          .filter(Boolean)
          .join(' ');
        const jm = text.match(/^judge\s*:\s*(.+)/i);
        if (jm && !judge) judge = clean(jm[1], 120);
        else if (!title && classLike(text)) title = clean(text, 140);
      }
      if (!title) {
        unrecognized++;
        warnings.push(
          `${sheetName}: table near row ${block.row + 1} has no recognized class/round title.`
        );
        return;
      }
      const end =
        blocks.filter((b) => b.row > block.row).sort((a, b) => a.row - b.row)[0]?.row ??
        rows.length;
      let fallback = 1;
      for (let r = block.row + 1; r < end; r++) {
        const row = rows[r];
        const registration = clean(row[block.map.registration], 60),
          handler = clean(row[block.map.handler], 120),
          dog = clean(row[block.map.dog], 120);
        if (!clean(row[block.map.order]) && !registration && !handler && !dog) break;
        if (!handler && !dog && !registration) break;
        if (!handler || !dog) {
          warnings.push(`${sheetName}: ignored malformed row ${r + 1}.`);
          continue;
        }
        runs.push({
          ringNumber,
          ringName,
          blockTitle: title,
          judgeName: judge,
          runningOrder: Number(row[block.map.order]) || fallback,
          registrationNumber: registration,
          handlerName: handler,
          dogName: dog,
          notes: block.map.notes === undefined ? '' : clean(row[block.map.notes], 300),
        });
        fallback++;
      }
    });
  });
  if (!runs.length) throw new Error('No running-order blocks were found in this workbook.');
  const ringNames = [...new Set(runs.map((r) => `Ring ${r.ringNumber} — ${r.ringName}`))];
  return {
    runs,
    summary: {
      rings: new Set(runs.map((r) => r.ringNumber)).size,
      ringNames,
      classes: new Set(runs.map((r) => `${r.ringNumber}|${r.blockTitle}`)).size,
      runs: runs.length,
      missingRegistrationNumbers: runs.filter((r) => !r.registrationNumber).length,
      unrecognizedBlocks: unrecognized,
      ignoredWorksheets: ignored,
      warnings,
    },
  };
}
