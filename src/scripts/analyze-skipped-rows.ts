// Analyze Skipped Registry Rows Script
// Diagnostic tool to understand which rows were skipped during migration

import * as XLSX from 'xlsx';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(dirname(__dirname));
config({ path: join(projectRoot, '.env.local') });

interface RowAnalysis {
  rowNumber: number;
  rowData: any[];
  reason: string;
  details: string;
}

/**
 * Analyze Excel file and categorize skipped rows
 */
async function analyzeSkippedRows(filePath: string): Promise<void> {
  try {
    console.log('🔍 Analyzing Excel file for skipped rows...');
    console.log('='.repeat(60));
    
    // Read the Excel file
    const fileBuffer = readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, {
      cellStyles: true,
      cellDates: true,
      cellNF: true,
      sheetStubs: true
    });

    // Get the first sheet
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`📊 Total rows in Excel: ${rawData.length}`);
    
    // Analyze each row
    const skippedRows: RowAnalysis[] = [];
    const validRows: RowAnalysis[] = [];
    
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNumber = i + 1;
      
      // Check various skip conditions
      if (!row || row.length === 0) {
        skippedRows.push({
          rowNumber,
          rowData: row || [],
          reason: 'Empty Row',
          details: 'Row is completely empty or undefined'
        });
        continue;
      }
      
      if (row.length < 4) {
        skippedRows.push({
          rowNumber,
          rowData: row,
          reason: 'Insufficient Columns',
          details: `Only ${row.length} columns, need at least 4`
        });
        continue;
      }
      
      if (!row[0]) {
        skippedRows.push({
          rowNumber,
          rowData: row,
          reason: 'Missing Registry Number',
          details: 'Column 0 (registry number) is empty'
        });
        continue;
      }
      
      if (!row[1]) {
        skippedRows.push({
          rowNumber,
          rowData: row,
          reason: 'Missing Call Name',
          details: 'Column 1 (call name) is empty'
        });
        continue;
      }
      
      if (!row[3]) {
        skippedRows.push({
          rowNumber,
          rowData: row,
          reason: 'Missing Handler Name',
          details: 'Column 3 (handler name) is empty'
        });
        continue;
      }
      
      // Check for empty strings after trimming
      const cwagsNumber = String(row[0]).trim();
      const dogCallName = String(row[1]).trim();
      const handlerName = String(row[3]).trim();
      
      if (!cwagsNumber || !dogCallName || !handlerName) {
        skippedRows.push({
          rowNumber,
          rowData: row,
          reason: 'Empty After Trimming',
          details: `Empty values: ${!cwagsNumber ? 'registry' : ''} ${!dogCallName ? 'call-name' : ''} ${!handlerName ? 'handler' : ''}`.trim()
        });
        continue;
      }
      
      // If we get here, it's a valid row
      validRows.push({
        rowNumber,
        rowData: row,
        reason: 'Valid',
        details: `${cwagsNumber} - ${dogCallName} (${handlerName})`
      });
    }
    
    // Summary
    console.log('\n📊 ANALYSIS SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Valid rows: ${validRows.length}`);
    console.log(`❌ Skipped rows: ${skippedRows.length}`);
    console.log(`📋 Total rows: ${rawData.length}`);
    
    // Categorize skip reasons
    const skipReasons = new Map<string, RowAnalysis[]>();
    skippedRows.forEach(row => {
      if (!skipReasons.has(row.reason)) {
        skipReasons.set(row.reason, []);
      }
      skipReasons.get(row.reason)!.push(row);
    });
    
    console.log('\n🔍 SKIP REASONS BREAKDOWN');
    console.log('='.repeat(60));
    
    for (const [reason, rows] of skipReasons.entries()) {
      console.log(`\n${reason}: ${rows.length} rows`);
      
      // Show first 5 examples of each type
      const examples = rows.slice(0, 5);
      examples.forEach(example => {
        console.log(`  Row ${example.rowNumber}: [${example.rowData.slice(0, 6).map(cell => 
          cell === null || cell === undefined ? 'NULL' : 
          String(cell).length > 15 ? String(cell).substring(0, 15) + '...' : 
          String(cell)
        ).join(', ')}]`);
      });
      
      if (rows.length > 5) {
        console.log(`  ... and ${rows.length - 5} more similar rows`);
      }
    }
    
    // Show some valid examples
    console.log('\n✅ VALID ROW EXAMPLES (First 5)');
    console.log('='.repeat(60));
    validRows.slice(0, 5).forEach(example => {
      console.log(`  Row ${example.rowNumber}: ${example.details}`);
    });
    
    // Check for potential data patterns
    console.log('\n🔍 DATA PATTERN ANALYSIS');
    console.log('='.repeat(60));
    
    // Check row ranges
    const firstValidRow = validRows.length > 0 ? validRows[0].rowNumber : 'None';
    const lastValidRow = validRows.length > 0 ? validRows[validRows.length - 1].rowNumber : 'None';
    
    console.log(`First valid row: ${firstValidRow}`);
    console.log(`Last valid row: ${lastValidRow}`);
    
    // Check if there are clusters of skipped rows
    const skippedRowNumbers = skippedRows.map(r => r.rowNumber).sort((a, b) => a - b);
    if (skippedRowNumbers.length > 0) {
      const firstSkipped = skippedRowNumbers[0];
      const lastSkipped = skippedRowNumbers[skippedRowNumbers.length - 1];
      console.log(`First skipped row: ${firstSkipped}`);
      console.log(`Last skipped row: ${lastSkipped}`);
      
      // Check for large blocks of consecutive skipped rows
      let consecutiveBlocks = [];
      let currentBlock = [skippedRowNumbers[0]];
      
      for (let i = 1; i < skippedRowNumbers.length; i++) {
        if (skippedRowNumbers[i] === skippedRowNumbers[i-1] + 1) {
          currentBlock.push(skippedRowNumbers[i]);
        } else {
          if (currentBlock.length > 10) {
            consecutiveBlocks.push(currentBlock);
          }
          currentBlock = [skippedRowNumbers[i]];
        }
      }
      if (currentBlock.length > 10) {
        consecutiveBlocks.push(currentBlock);
      }
      
      if (consecutiveBlocks.length > 0) {
        console.log('\n⚠️  Large blocks of consecutive skipped rows found:');
        consecutiveBlocks.forEach((block, index) => {
          console.log(`  Block ${index + 1}: Rows ${block[0]}-${block[block.length-1]} (${block.length} rows)`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error analyzing file:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const excelFilePath = process.argv[2] || './DogInfo.xlsx';
  
  console.log(`🔍 Analyzing skipped rows in: ${excelFilePath}`);
  await analyzeSkippedRows(excelFilePath);
}

// Run the analysis
main().catch((error) => {
  console.error('💥 Analysis failed:', error);
  process.exit(1);
});