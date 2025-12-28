import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
  console.log('🎯 API route called');
  
  try {
    console.log('🔑 Creating Supabase client');
    
    // Check if env vars exist
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('📋 Getting form data');
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('❌ No file provided');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('📄 File received:', file.name, 'Size:', file.size);

    // Read the file buffer
    console.log('📖 Reading file buffer');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('📊 Parsing Excel file');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    console.log('📑 Sheet name:', sheetName);
    
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log('📏 Total rows (including header):', data.length);

    // Skip header row and process data
    const rows = data.slice(1) as any[][];
    console.log('📏 Data rows to process:', rows.length);

    let added = 0;
    let skipped = 0;
    let errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      if (i % 100 === 0) {
        console.log(`Processing row ${i + 1} of ${rows.length}`);
      }
      
      // Col A = index 0, Col B = index 1, Col D = index 3
      const cwags_number = row[0]?.toString().trim();
      const dog_call_name = row[1]?.toString().trim();
      const handler_name = row[3]?.toString().trim();

      // Skip empty rows
      if (!cwags_number) {
        continue;
      }

      try {
        // Check if cwags_number already exists
        const { data: existing, error: checkError } = await supabase
          .from('cwags_registry')
          .select('id')
          .eq('cwags_number', cwags_number)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existing) {
          skipped++;
          continue;
        }

        // Insert new record
        const { error: insertError } = await supabase
          .from('cwags_registry')
          .insert({
            cwags_number,
            dog_call_name,
            handler_name,
            is_active: true,
          });

        if (insertError) {
          throw insertError;
        }

        added++;
      } catch (error: any) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    console.log('✅ Processing complete');
    console.log('   Added:', added);
    console.log('   Skipped:', skipped);
    console.log('   Errors:', errors.length);

    return NextResponse.json({
      success: true,
      added,
      skipped,
      errors,
      message: `Import complete. Added: ${added}, Skipped: ${skipped}${
        errors.length > 0 ? `, Errors: ${errors.length}` : ''
      }`,
    });
  } catch (error: any) {
    console.error('💥 Import error:', error);
    return NextResponse.json(
      { error: error.message || 'Import failed' },
      { status: 500 }
    );
  }
}