import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase (server-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
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
      return NextResponse.json({
        message: "No valid rows found",
      });
    }

    // -----------------------------
    // 🚀 Bulk UPSERT (fast)
    // -----------------------------
    const chunkSize = 1000;
    let processed = 0;

    for (let i = 0; i < parsedEntries.length; i += chunkSize) {
      const chunk = parsedEntries.slice(i, i + chunkSize);

      const { error } = await supabase
        .from("cwags_registry") // ✅ correct table
        .upsert(chunk, {
          onConflict: "cwags_number",
          ignoreDuplicates: true, // ✅ don't overwrite existing data
        });

      if (error) {
        throw error;
      }

      processed += chunk.length;
      console.log(`Processed ${processed} / ${parsedEntries.length}`);
    }

    // -----------------------------
    // ✅ Done
    // -----------------------------
    return NextResponse.json({
      message: "Import complete",
      totalRows: parsedEntries.length,
      processed,
    });

  } catch (error: any) {
    console.error("Import error:", error);

    return NextResponse.json(
      { error: error.message || "Import failed" },
      { status: 500 }
    );
  }
}