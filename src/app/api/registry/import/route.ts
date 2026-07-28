import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { AuthorizationError, getSupabaseAdmin, requireAdministrator } from "@/lib/server/authorization";

const supabase = getSupabaseAdmin();

export async function POST(req: Request) {
  try {
    await requireAdministrator();

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded", error: "No file uploaded" },
        { status: 400 }
      );
    }

    // -----------------------------
    // 📥 Read Excel file
    // -----------------------------
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    // Convert to array of arrays
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
    });

    // Remove header row
    const rows = data.slice(1);

    // -----------------------------
    // 🧹 Parse & clean rows
    // -----------------------------
    const parsedEntries = rows
      .map((row) => {
        const cwags_number = row[0]?.toString().trim().toUpperCase();
        if (!cwags_number) return null;

        return {
          cwags_number,
          dog_call_name: row[1]?.toString().trim() || "",
          handler_name: row[3]?.toString().trim() || "",
          is_active: true, // default
        };
      })
      .filter(Boolean) as {
      cwags_number: string;
      dog_call_name: string;
      handler_name: string;
      is_active: boolean;
    }[];

    if (parsedEntries.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid rows found", error: "No valid rows found" },
        { status: 400 }
      );
    }

    // -----------------------------
    // 🚀 Bulk UPSERT (fast)
    // -----------------------------
    const chunkSize = 1000;
    let processed = 0;
    let added = 0;
    let skipped = 0;

    for (let i = 0; i < parsedEntries.length; i += chunkSize) {
      const chunk = parsedEntries.slice(i, i + chunkSize);

      const { data: insertedRows, error } = await supabase
        .from("cwags_registry") // ✅ correct table
        .upsert(chunk, {
          onConflict: "cwags_number",
          ignoreDuplicates: true, // ✅ don't overwrite existing data
        })
        .select("cwags_number");

      if (error) {
        throw error;
      }

      processed += chunk.length;
      added += insertedRows?.length ?? 0;
      skipped += chunk.length - (insertedRows?.length ?? 0);
      console.log(`Processed ${processed} / ${parsedEntries.length}`);
    }

    // -----------------------------
    // ✅ Done
    // -----------------------------
    return NextResponse.json({
      success: true,
      message: `Import complete: ${added} added, ${skipped} already existed and were skipped.`,
      totalRows: parsedEntries.length,
      processed,
      added,
      skipped,
    });

  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, message: error.message, error: error.message },
        { status: error.status }
      );
    }

    console.error("Import error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Import failed",
        error: error.message || "Import failed",
      },
      { status: 500 }
    );
  }
}
