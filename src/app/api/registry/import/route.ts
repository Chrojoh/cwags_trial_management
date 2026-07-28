import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import {
  AuthorizationError,
  getSupabaseAdmin,
  requireAdministrator,
} from '@/lib/server/authorization';
import { formatCwagsNumber } from '@/lib/utils';

type RegistryImportRow = {
  cwags_number: string;
  dog_call_name: string;
  handler_name: string;
};

type ExistingRegistryRow = RegistryImportRow & {
  id: string;
  is_active: boolean | null;
};

const readCell = (value: unknown): string => String(value ?? '').trim();
const normalizeText = (value: string): string =>
  value.toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
const nameKey = (dogName: string, handlerName: string): string =>
  `${normalizeText(dogName)}|${normalizeText(handlerName)}`;

const headerAliases = {
  number: new Set(['cwagsnumber', 'cwagsregistrationnumber', 'registrationnumber', 'regnumber']),
  dog: new Set(['dogcallname', 'callname', 'dogname']),
  handler: new Set(['handlername', 'ownername', 'handler', 'owner']),
};

function findColumn(row: unknown[], aliases: Set<string>): number {
  return row.findIndex((cell) => aliases.has(normalizeText(readCell(cell))));
}

export async function POST(req: Request) {
  try {
    await requireAdministrator();

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'No file uploaded', error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet) {
      return NextResponse.json(
        { success: false, message: 'The workbook does not contain a worksheet.' },
        { status: 400 }
      );
    }

    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      raw: false,
      defval: '',
    });
    const firstRow = rows[0] ?? [];
    const detectedColumns = {
      number: findColumn(firstRow, headerAliases.number),
      dog: findColumn(firstRow, headerAliases.dog),
      handler: findColumn(firstRow, headerAliases.handler),
    };
    const hasHeader = Object.values(detectedColumns).every((column) => column >= 0);
    const columns = hasHeader ? detectedColumns : { number: 0, dog: 1, handler: 3 };
    const dataRows = hasHeader ? rows.slice(1) : rows;
    const firstExcelRow = hasHeader ? 2 : 1;

    const errors: string[] = [];
    const entriesByNumber = new Map<string, RegistryImportRow>();
    let skipped = 0;

    dataRows.forEach((row, index) => {
      const excelRow = index + firstExcelRow;
      const rawNumber = readCell(row[columns.number]);
      const dogName = readCell(row[columns.dog]);
      const handlerName = readCell(row[columns.handler]);

      if (!rawNumber && !dogName && !handlerName) return;
      if (!rawNumber || !dogName || !handlerName) {
        skipped += 1;
        errors.push(
          `Row ${excelRow}: CWAGS number, dog call name, and handler name are all required.`
        );
        return;
      }

      const cwagsNumber = formatCwagsNumber(rawNumber);
      if (entriesByNumber.has(cwagsNumber)) {
        skipped += 1;
        errors.push(`Row ${excelRow}: duplicate ${cwagsNumber}; the last row was used.`);
      }
      entriesByNumber.set(cwagsNumber, {
        cwags_number: cwagsNumber,
        dog_call_name: dogName,
        handler_name: handlerName,
      });
    });

    const parsedEntries = Array.from(entriesByNumber.values());
    if (parsedEntries.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No valid rows found.',
          error: 'No valid rows found',
          errors: errors.slice(0, 100),
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const chunkSize = 500;
    let processed = 0;
    let added = 0;
    let updated = 0;

    const existingRows: ExistingRegistryRow[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error: lookupError } = await supabase
        .from('cwags_registry')
        .select('id,cwags_number,dog_call_name,handler_name,is_active')
        .order('id')
        .range(from, from + 999);
      if (lookupError) throw lookupError;
      existingRows.push(...((data ?? []) as ExistingRegistryRow[]));
      if (!data || data.length < 1000) break;
    }

    const existingByNumber = new Map(
      existingRows.map((row) => [formatCwagsNumber(row.cwags_number), row] as const)
    );
    const rowsByName = new Map<string, ExistingRegistryRow[]>();
    existingRows.forEach((row) => {
      const key = nameKey(row.dog_call_name, row.handler_name);
      rowsByName.set(key, [...(rowsByName.get(key) ?? []), row]);
    });

    const updates: Array<ExistingRegistryRow> = [];
    const inserts: Array<RegistryImportRow & { is_active: boolean }> = [];

    parsedEntries.forEach((entry) => {
      const numberMatch = existingByNumber.get(entry.cwags_number);
      const nameMatches = rowsByName.get(nameKey(entry.dog_call_name, entry.handler_name)) ?? [];
      const existing = numberMatch ?? (nameMatches.length === 1 ? nameMatches[0] : undefined);

      if (!existing) {
        inserts.push({ ...entry, is_active: true });
        return;
      }

      const changed =
        formatCwagsNumber(existing.cwags_number) !== entry.cwags_number ||
        existing.dog_call_name.trim() !== entry.dog_call_name ||
        existing.handler_name.trim() !== entry.handler_name;
      if (!changed) {
        skipped += 1;
        return;
      }

      updates.push({ ...existing, ...entry, is_active: existing.is_active ?? true });
    });

    for (let index = 0; index < updates.length; index += chunkSize) {
      const records = updates.slice(index, index + chunkSize);
      const { error: upsertError } = await supabase.from('cwags_registry').upsert(records, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });
      if (upsertError) throw upsertError;
      updated += records.length;
    }

    for (let index = 0; index < inserts.length; index += chunkSize) {
      const records = inserts.slice(index, index + chunkSize);
      const { error: upsertError } = await supabase.from('cwags_registry').upsert(records, {
        onConflict: 'cwags_number',
        ignoreDuplicates: false,
      });
      if (upsertError) throw upsertError;
      added += records.length;
    }

    processed = parsedEntries.length;

    return NextResponse.json({
      success: true,
      message: `Import complete: ${updated} updated, ${added} added, ${skipped} skipped.`,
      totalRows: parsedEntries.length,
      processed,
      added,
      updated,
      skipped,
      errors: errors.slice(0, 100),
    });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, message: error.message, error: error.message },
        { status: error.status }
      );
    }

    const message = error instanceof Error ? error.message : 'Import failed';
    console.error('Registry import error:', error);
    return NextResponse.json(
      { success: false, message, error: message },
      { status: 500 }
    );
  }
}
