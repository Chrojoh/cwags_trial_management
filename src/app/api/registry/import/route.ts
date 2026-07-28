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

const readCell = (value: unknown): string => String(value ?? '').trim();

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
    const errors: string[] = [];
    const entriesByNumber = new Map<string, RegistryImportRow>();
    let skipped = 0;

    rows.slice(1).forEach((row, index) => {
      const excelRow = index + 2;
      const rawNumber = readCell(row[0]);
      const dogName = readCell(row[1]);
      const handlerName = readCell(row[3]);

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
    const chunkSize = 1000;
    let processed = 0;
    let added = 0;
    let updated = 0;

    for (let index = 0; index < parsedEntries.length; index += chunkSize) {
      const chunk = parsedEntries.slice(index, index + chunkSize);
      const numbers = chunk.map((entry) => entry.cwags_number);
      const { data: existingRows, error: lookupError } = await supabase
        .from('cwags_registry')
        .select('cwags_number,is_active')
        .in('cwags_number', numbers);
      if (lookupError) throw lookupError;

      const existingByNumber = new Map(
        (existingRows ?? []).map((row) => [row.cwags_number, row.is_active] as const)
      );
      const records = chunk.map((entry) => ({
        ...entry,
        is_active: existingByNumber.get(entry.cwags_number) ?? true,
      }));

      const { error: upsertError } = await supabase.from('cwags_registry').upsert(records, {
        onConflict: 'cwags_number',
        ignoreDuplicates: false,
      });
      if (upsertError) throw upsertError;

      processed += chunk.length;
      updated += chunk.filter((entry) => existingByNumber.has(entry.cwags_number)).length;
      added += chunk.length - chunk.filter((entry) => existingByNumber.has(entry.cwags_number)).length;
    }

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
