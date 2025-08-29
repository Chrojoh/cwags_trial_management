// C-WAGS Registry Data Migration Script
// Step 6: Populate cwags_registry table from Excel data

import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

config({ path: join(projectRoot, '.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Environment check:');
console.log(`   Supabase URL: ${supabaseUrl ? '✅ Found' : '❌ Missing'}`);
console.log(`   Service Key: ${supabaseServiceKey ? '✅ Found' : '❌ Missing'}`);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   Make sure .env.local contains:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=your_url');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_key');
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Parse Excel file and extract registry data
 */
async function parseExcelData(filePath) {
  try {
    console.log('📖 Reading Excel file...');
    
    // Read the Excel file (Node.js version)
    const fs = await import('fs');
    const fileBuffer = fs.readFileSync(filePath);
    
    const workbook = XLSX.read(fileBuffer, {
      cellStyles: true,
      cellFormulas: true,
      cellDates: true,
      cellNF: true,
      sheetStubs: true
    });

    // Get the first sheet (Sheet1)
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`📊 Found ${rawData.length} total rows in Excel`);

    // Process the data (skip header row if it exists)
    const registryData = [];
    let skippedRows = 0;

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      
      // Skip empty rows or rows with insufficient data
      if (!row || row.length < 4 || !row[0] || !row[1] || !row[3]) {
        skippedRows++;
        continue;
      }

      // Extract and clean the data
      const cwagsNumber = String(row[0]).trim();
      const dogCallName = String(row[1]).trim();
      const handlerName = String(row[3]).trim();

      // Validate required fields
      if (!cwagsNumber || !dogCallName || !handlerName) {
        console.warn(`⚠️  Skipping row ${i + 1}: Missing required data`);
        skippedRows++;
        continue;
      }

      registryData.push({
        cwags_number: cwagsNumber,
        dog_call_name: dogCallName,
        handler_name: handlerName,
        is_active: true
      });
    }

    console.log(`✅ Processed ${registryData.length} valid records`);
    console.log(`⚠️  Skipped ${skippedRows} invalid/empty rows`);

    return registryData;

  } catch (error) {
    console.error('❌ Error parsing Excel file:', error);
    throw error;
  }
}

/**
 * Insert data into Supabase in batches
 */
async function insertRegistryData(data, batchSize = 1000) {
  try {
    console.log(`🚀 Starting database insertion with batch size ${batchSize}`);
    
    // Clear existing data (optional - comment out if you want to keep existing records)
    console.log('🗑️  Clearing existing registry data...');
    const { error: deleteError } = await supabase
      .from('cwags_registry')
      .delete()
      .neq('id', 0); // Delete all records

    if (deleteError) {
      console.warn('⚠️  Warning during delete:', deleteError.message);
    }

    let totalInserted = 0;
    const totalBatches = Math.ceil(data.length / batchSize);

    // Insert data in batches
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`📦 Inserting batch ${batchNumber}/${totalBatches} (${batch.length} records)...`);

      const { data: insertedData, error } = await supabase
        .from('cwags_registry')
        .insert(batch)
        .select('id');

      if (error) {
        console.error(`❌ Error in batch ${batchNumber}:`, error);
        
        // Try to identify problematic records
        console.log('🔍 Problematic batch sample:', batch.slice(0, 3));
        throw error;
      }

      totalInserted += insertedData?.length || batch.length;
      
      // Progress indicator
      const progress = ((i + batch.length) / data.length * 100).toFixed(1);
      console.log(`✅ Batch ${batchNumber} completed. Progress: ${progress}% (${totalInserted}/${data.length})`);

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`🎉 Successfully inserted ${totalInserted} registry records!`);
    return totalInserted;

  } catch (error) {
    console.error('❌ Error inserting data:', error);
    throw error;
  }
}

/**
 * Verify the inserted data
 */
async function verifyInsertion() {
  try {
    console.log('🔍 Verifying inserted data...');
    
    const { data, error, count } = await supabase
      .from('cwags_registry')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Error verifying data:', error);
      return false;
    }

    console.log(`✅ Verification complete: ${count} total records in database`);

    // Get a few sample records to verify structure
    const { data: samples } = await supabase
      .from('cwags_registry')
      .select('*')
      .limit(3);

    console.log('📋 Sample records:');
    samples?.forEach((record, index) => {
      console.log(`  ${index + 1}. ${record.cwags_number} - ${record.dog_call_name} (${record.handler_name})`);
    });

    return true;

  } catch (error) {
    console.error('❌ Error during verification:', error);
    return false;
  }
}

/**
 * Main migration function
 */
async function migrateRegistryData(excelFilePath) {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting C-WAGS Registry Data Migration');
    console.log('=' .repeat(50));

    // Step 1: Parse Excel data
    const registryData = await parseExcelData(excelFilePath);

    if (registryData.length === 0) {
      throw new Error('No valid data found in Excel file');
    }

    // Step 2: Insert into database
    const insertedCount = await insertRegistryData(registryData);

    // Step 3: Verify insertion
    const verified = await verifyInsertion();

    if (verified) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log('=' .repeat(50));
      console.log(`🎉 Migration completed successfully in ${duration}s`);
      console.log(`📊 Final count: ${insertedCount} records`);
      console.log('=' .repeat(50));
    } else {
      throw new Error('Data verification failed');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Usage example and instructions
export { migrateRegistryData, parseExcelData, insertRegistryData, verifyInsertion };

// If running directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  const excelFilePath = process.argv[2];
  
  if (!excelFilePath) {
    console.error('❌ Please provide the path to the Excel file');
    console.log('Usage: node scripts/migrate-registry.js <path-to-excel-file>');
    process.exit(1);
  }

  migrateRegistryData(excelFilePath);
}

/*
USAGE INSTRUCTIONS:

1. Make sure you have "type": "module" in your package.json
2. Install required dependencies:
   npm install xlsx @supabase/supabase-js dotenv

3. Ensure your .env.local file has the required Supabase credentials:
   - NEXT_PUBLIC_SUPABASE_URL=your_url_here
   - SUPABASE_SERVICE_ROLE_KEY=your_service_key_here

4. Run the migration:
   node scripts/migrate-registry.js ./DogInfo.xlsx

4. Run the migration:
   node scripts/migrate-registry.js path/to/DogInfo.xlsx

5. The script will:
   - Parse the Excel file
   - Clear existing registry data (optional)
   - Insert all records in batches
   - Verify the insertion
   - Provide progress feedback

FEATURES:
- ✅ Batch processing for large datasets
- ✅ Progress tracking and logging
- ✅ Data validation and cleanup
- ✅ Error handling and recovery
- ✅ Verification step
- ✅ Performance optimized
- ✅ Detailed console output

SCHEMA MAPPING:
Excel Column 0 → cwags_number
Excel Column 1 → dog_call_name  
Excel Column 3 → handler_name
Set is_active = true for all records
*/