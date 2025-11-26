// src/lib/judgeLastDate.ts
// Utility to find the last judging date for judges from the Excel file

import * as XLSX from 'xlsx';

interface JudgeLastDate {
  judgeName: string;
  lastDate: Date | null;
  lastDateFormatted: string;
}

let judgeLastDatesCache: Map<string, JudgeLastDate> | null = null;

/**
 * Load the trialing data Excel file and extract judge last dates
 */
async function loadJudgeLastDates(): Promise<Map<string, JudgeLastDate>> {
  if (judgeLastDatesCache) {
    return judgeLastDatesCache;
  }

  try {
    console.log('Loading judge last dates from Excel...');
    const response = await fetch('https://raw.githubusercontent.com/cwagtracker/Tracker/main/Data%20for%20Tracker%20web.xlsx');
    
    if (!response.ok) {
      throw new Error('Failed to fetch Excel file');
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

    if (data.length === 0) {
      throw new Error('Excel file is empty');
    }

    // First row is headers
    const headers = data[0].map((h: any) => String(h || '').toLowerCase().trim());
    console.log('Headers:', headers);

    // Find column indices
    const findColumn = (...names: string[]): number => {
      for (const name of names) {
        const idx = headers.findIndex(h => 
          h.includes(name.toLowerCase()) || name.toLowerCase().includes(h)
        );
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const colJudge = findColumn('judge', 'judge name');
    const colDate = findColumn('date', 'trial date');

    console.log(`Judge column: ${colJudge}, Date column: ${colDate}`);

    if (colJudge === -1 || colDate === -1) {
      throw new Error('Could not find required columns in Excel file');
    }

    // Map to store the latest date for each judge
    const judgeMap = new Map<string, { lastDate: Date | null; lastDateFormatted: string }>();

    // Process data rows (skip header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const judgeName = row[colJudge] ? String(row[colJudge]).trim() : '';
      const dateValue = row[colDate];

      if (!judgeName) continue;

      let trialDate: Date | null = null;

      // Try to parse the date
      if (dateValue) {
        if (dateValue instanceof Date) {
          trialDate = dateValue;
        } else if (typeof dateValue === 'number') {
          // Excel date serial number
          trialDate = XLSX.SSF.parse_date_code(dateValue);
        } else if (typeof dateValue === 'string') {
          const parsed = new Date(dateValue);
          if (!isNaN(parsed.getTime())) {
            trialDate = parsed;
          }
        }
      }

      if (trialDate) {
        // Check if this judge already exists and if this date is more recent
        const existing = judgeMap.get(judgeName);
        if (!existing || !existing.lastDate || trialDate > existing.lastDate) {
          judgeMap.set(judgeName, {
            lastDate: trialDate,
            lastDateFormatted: trialDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          });
        }
      }
    }

    // Convert to the return format
    const resultMap = new Map<string, JudgeLastDate>();
    judgeMap.forEach((value, key) => {
      resultMap.set(key, {
        judgeName: key,
        lastDate: value.lastDate,
        lastDateFormatted: value.lastDateFormatted
      });
    });

    judgeLastDatesCache = resultMap;
    console.log(`Loaded last dates for ${resultMap.size} judges`);
    
    return resultMap;

  } catch (error) {
    console.error('Error loading judge last dates:', error);
    return new Map();
  }
}

/**
 * Get the last judging date for a specific judge
 */
export async function getJudgeLastDate(judgeName: string): Promise<string> {
  try {
    const judgeMap = await loadJudgeLastDates();
    
    // Try exact match first
    let judgeData = judgeMap.get(judgeName);
    
    // If no exact match, try case-insensitive partial match
    if (!judgeData) {
      const normalizedName = judgeName.toLowerCase().trim();
      for (const [key, value] of judgeMap.entries()) {
        if (key.toLowerCase().includes(normalizedName) || normalizedName.includes(key.toLowerCase())) {
          judgeData = value;
          break;
        }
      }
    }
    
    if (judgeData && judgeData.lastDateFormatted) {
      return judgeData.lastDateFormatted;
    }
    
    return 'No record found';
  } catch (error) {
    console.error('Error getting judge last date:', error);
    return 'Error loading';
  }
}

/**
 * Preload all judge last dates (call this once when the page loads)
 */
export async function preloadJudgeLastDates(): Promise<void> {
  await loadJudgeLastDates();
}

/**
 * Clear the cache (useful for testing or manual refresh)
 */
export function clearJudgeLastDatesCache(): void {
  judgeLastDatesCache = null;
}