// src/scripts/compareRegistryCSV.ts
// Simple CSV comparison to find new records

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials in .env.local');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RegistryRecord {
  cwags_number: string;
  dog_call_name: string;
  handler_name: string;
}

/**
 * Parse a simple CSV file (no library needed!)
 * For Excel CSV: Column A=cwags_number, B=dog_call_name, D=handler_name (skip C)
 * For DB CSV (full export): id, cwags_number, dog_call_name, handler_name, is_active, created_at
 */
function parseCSV(filePath: string, isExcelFormat: boolean = false, hasHeader: boolean = false): RegistryRecord[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const records: RegistryRecord[] = [];
  const startIndex = hasHeader ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple CSV parsing (handles basic cases)
    const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
    
    // Excel format: A, B, C, D -> use indices 0, 1, 3 (skip C)
    // DB format (full export): id, cwags_number, dog_call_name, handler_name -> use indices 1, 2, 3
    let cwagsIndex, nameIndex, handlerIndex, minColumns;
    
    if (isExcelFormat) {
      cwagsIndex = 0;
      nameIndex = 1;
      handlerIndex = 3;
      minColumns = 4;
    } else {
      // Database CSV has id in column 0, so shift everything by 1
      cwagsIndex = 1;
      nameIndex = 2;
      handlerIndex = 3;
      minColumns = 4;
    }
    
    if (parts.length >= minColumns && parts[cwagsIndex] && parts[nameIndex] && parts[handlerIndex]) {
      records.push({
        cwags_number: parts[cwagsIndex],
        dog_call_name: parts[nameIndex],
        handler_name: parts[handlerIndex]
      });
    }
  }
  
  return records;
}

/**
 * Export database to CSV
 */
async function exportDatabaseToCSV(outputPath: string): Promise<number> {
  console.log('📥 Exporting database to CSV...');
  
  let allRecords: any[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('cwags_registry')
      .select('cwags_number, dog_call_name, handler_name')
      .order('cwags_number')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allRecords = allRecords.concat(data);
      console.log(`   Fetched ${data.length} records (page ${page + 1})...`);
      page++;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }
  
  // Write to CSV
  let csv = 'cwags_number,dog_call_name,handler_name\n';
  allRecords.forEach(record => {
    csv += `${record.cwags_number},${record.dog_call_name},${record.handler_name}\n`;
  });
  
  fs.writeFileSync(outputPath, csv);
  console.log(`✅ Exported ${allRecords.length} records to ${outputPath}`);
  
  return allRecords.length;
}

/**
 * Compare two CSV files and find new records
 */
async function compareAndInsert(
  excelCSVPath: string,
  databaseCSVPath: string,
  autoInsert: boolean = false
): Promise<void> {
  
  console.log('🚀 Starting CSV Comparison');
  console.log('='.repeat(50));
  
  // Parse both files
  console.log(`📂 Reading Excel CSV: ${excelCSVPath}`);
  const excelRecords = parseCSV(excelCSVPath, true, false); // isExcelFormat=true, no header
  console.log(`   Found ${excelRecords.length} records`);
  
  console.log(`📂 Reading Database CSV: ${databaseCSVPath}`);
  const dbRecords = parseCSV(databaseCSVPath, false, true); // isExcelFormat=false, has header
  console.log(`   Found ${dbRecords.length} records`);
  
  // Debug: Show sample records from each file
  console.log('\n🔍 DEBUG - Sample from Excel CSV:');
  excelRecords.slice(0, 3).forEach((r, i) => {
    console.log(`   ${i + 1}. [${r.cwags_number}] - [${r.dog_call_name}] - [${r.handler_name}]`);
  });
  
  console.log('\n🔍 DEBUG - Sample from Database CSV:');
  dbRecords.slice(0, 3).forEach((r, i) => {
    console.log(`   ${i + 1}. [${r.cwags_number}] - [${r.dog_call_name}] - [${r.handler_name}]`);
  });
  
  // Create a Set of existing C-WAGS numbers for fast lookup
  const existingNumbers = new Set(dbRecords.map(r => r.cwags_number));
  
  console.log('\n🔍 DEBUG - First few existing numbers in Set:');
  Array.from(existingNumbers).slice(0, 5).forEach((num, i) => {
    console.log(`   ${i + 1}. [${num}]`);
  });
  
  console.log(`\n🔍 DEBUG - Checking if first Excel record exists:`);
  const firstExcel = excelRecords[0].cwags_number;
  console.log(`   Excel: [${firstExcel}]`);
  console.log(`   Exists in DB? ${existingNumbers.has(firstExcel)}`);
  
  // Find new records
  const newRecords = excelRecords.filter(r => !existingNumbers.has(r.cwags_number));
  
  console.log('='.repeat(50));
  console.log('📊 COMPARISON RESULTS');
  console.log(`   Records in Excel: ${excelRecords.length}`);
  console.log(`   Records in Database: ${dbRecords.length}`);
  console.log(`   New records to add: ${newRecords.length}`);
  console.log('='.repeat(50));
  
  if (newRecords.length === 0) {
    console.log('✅ No new records to insert!');
    return;
  }
  
  // Show sample of new records
  console.log('\n📋 Sample of new records (first 10):');
  newRecords.slice(0, 10).forEach((record, idx) => {
    console.log(`   ${idx + 1}. ${record.cwags_number} - ${record.dog_call_name} (${record.handler_name})`);
  });
  
  if (newRecords.length > 10) {
    console.log(`   ... and ${newRecords.length - 10} more`);
  }
  
  if (!autoInsert) {
    console.log('\n⚠️  DRY RUN - No records inserted');
    console.log('Run with --insert flag to actually insert these records');
    return;
  }
  
  // Insert new records
  console.log('\n📥 Inserting new records...');
  const batchSize = 1000;
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < newRecords.length; i += batchSize) {
    const batch = newRecords.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(newRecords.length / batchSize);
    
    console.log(`   Batch ${batchNumber}/${totalBatches} (${batch.length} records)...`);
    
    const recordsToInsert = batch.map(r => ({
      cwags_number: r.cwags_number,
      dog_call_name: r.dog_call_name,
      handler_name: r.handler_name,
      is_active: true
    }));
    
    const { data, error } = await supabase
      .from('cwags_registry')
      .insert(recordsToInsert)
      .select('id');

    if (error) {
      console.error(`   ❌ Error in batch ${batchNumber}:`, error.message);
      errors += batch.length;
    } else {
      const count = data?.length || batch.length;
      inserted += count;
      console.log(`   ✅ Inserted ${count} records`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 MERGE COMPLETE');
  console.log(`   Total new records: ${newRecords.length}`);
  console.log(`   Successfully inserted: ${inserted}`);
  console.log(`   Errors: ${errors}`);
  console.log('='.repeat(50));
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  1. Export database: npx tsx src/scripts/compareRegistryCSV.ts --export');
    console.log('  2. Compare only:    npx tsx src/scripts/compareRegistryCSV.ts <excel-csv> <db-csv>');
    console.log('  3. Compare & insert: npx tsx src/scripts/compareRegistryCSV.ts <excel-csv> <db-csv> --insert');
    console.log('');
    console.log('Example:');
    console.log('  npx tsx src/scripts/compareRegistryCSV.ts --export');
    console.log('  npx tsx src/scripts/compareRegistryCSV.ts public/excel_registry.csv public/db_registry.csv');
    console.log('  npx tsx src/scripts/compareRegistryCSV.ts public/excel_registry.csv public/db_registry.csv --insert');
    process.exit(1);
  }
  
  const startTime = Date.now();
  
  try {
    // Export mode
    if (args[0] === '--export') {
      const outputPath = args[1] || 'public/db_registry.csv';
      await exportDatabaseToCSV(outputPath);
      return;
    }
    
    // Compare mode
    const excelCSV = args[0];
    const dbCSV = args[1];
    const autoInsert = args.includes('--insert');
    
    if (!excelCSV || !dbCSV) {
      throw new Error('Please provide both Excel CSV and Database CSV paths');
    }
    
    await compareAndInsert(excelCSV, dbCSV, autoInsert);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n⏱️  Total time: ${duration}s`);
    
  } catch (error) {
    console.error('💥 Failed:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});