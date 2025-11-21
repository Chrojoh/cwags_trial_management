// src/lib/excelRegistryOperations.ts
// Excel-based registry operations - reads from DogInfo.xlsx (cwags_registry) and Data for Tracker web.xlsx

import * as XLSX from 'xlsx';

export interface RegistryDog {
  cwags_number: string;
  dog_call_name: string;
  handler_name: string;
  handler_email?: string;
  handler_phone?: string;
  emergency_contact?: string;
  breed?: string;
  dog_sex?: string;
  registered_name?: string;
  is_junior_handler: boolean;
  is_active: boolean;
  created_at: string;
  // Store any additional columns from the registry
  [key: string]: any;
}

export interface TitleProgress {
  level: string;
  totalQs: number;
  uniqueJudges: number;
  hasTitle: boolean;
  titleDate?: string;
  aceQs?: number;
  qsToNextMilestone?: number;
  qsToTitle?: number;
  judgesNeeded?: number;
  records: TrialRecord[];
}

export interface TrialRecord {
  date: string;
  trial: string;
  judge: string;
  qs: number;
  class: string;
}

// Cache for loaded data
let dogInfoCache: Map<string, RegistryDog> | null = null;
let trialingDataCache: any[] | null = null;
let registryHeaders: string[] = [];

/**
 * Load DogInfo.xlsx (cwags_registry) with column headers
 */
async function loadDogInfo(): Promise<Map<string, RegistryDog>> {
  if (dogInfoCache) return dogInfoCache;

  try {
    console.log('Loading DogInfo.xlsx (cwags_registry)...');
    const response = await fetch('https://raw.githubusercontent.com/cwagtracker/Tracker/main/DogInfo.xlsx');
    if (!response.ok) throw new Error('Failed to fetch DogInfo.xlsx');
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length === 0) {
      throw new Error('DogInfo.xlsx is empty');
    }

    // First row is headers
    registryHeaders = data[0].map(h => String(h || '').toLowerCase().trim());
    console.log('Registry column headers:', registryHeaders);

    const dogMap = new Map<string, RegistryDog>();

    // Helper to find column index by header name (case-insensitive, partial match)
    const findColumn = (...names: string[]): number => {
      for (const name of names) {
        const idx = registryHeaders.findIndex(h => 
          h.includes(name.toLowerCase()) || name.toLowerCase().includes(h)
        );
        if (idx !== -1) return idx;
      }
      return -1;
    };

    // Find column indices
    const colRegNum = findColumn('cwags_number', 'registration', 'reg number', 'reg num');
    const colCallName = findColumn('dog_call_name', 'call name', 'callname');
    const colRegName = findColumn('registered_name', 'reg name', 'regname');
    const colHandler = findColumn('handler_name', 'handler', 'owner');
    const colEmail = findColumn('handler_email', 'email');
    const colPhone = findColumn('handler_phone', 'phone');
    const colEmergency = findColumn('emergency_contact', 'emergency');
    const colBreed = findColumn('breed');
    const colSex = findColumn('dog_sex', 'sex', 'gender');

    console.log('Column mapping:', {
      regNum: colRegNum,
      callName: colCallName,
      regName: colRegName,
      handler: colHandler,
      email: colEmail,
      phone: colPhone,
      emergency: colEmergency,
      breed: colBreed,
      sex: colSex
    });

    if (colRegNum === -1) {
      throw new Error('Could not find registration number column in DogInfo.xlsx');
    }

    // Process data rows (skip header row)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[colRegNum]) continue; // Skip empty rows

      const regNumber = String(row[colRegNum] || '').trim();
      if (!regNumber) continue;

      const dog: RegistryDog = {
        cwags_number: regNumber,
        dog_call_name: colCallName !== -1 ? String(row[colCallName] || '').trim() : '',
        handler_name: colHandler !== -1 ? String(row[colHandler] || '').trim() : '',
        is_junior_handler: false,
        is_active: true,
        created_at: new Date().toISOString()
      };

      // Add optional fields if columns exist
      if (colRegName !== -1 && row[colRegName]) {
        dog.registered_name = String(row[colRegName]).trim();
      }
      if (colEmail !== -1 && row[colEmail]) {
        dog.handler_email = String(row[colEmail]).trim();
      }
      if (colPhone !== -1 && row[colPhone]) {
        dog.handler_phone = String(row[colPhone]).trim();
      }
      if (colEmergency !== -1 && row[colEmergency]) {
        dog.emergency_contact = String(row[colEmergency]).trim();
      }
      if (colBreed !== -1 && row[colBreed]) {
        dog.breed = String(row[colBreed]).trim();
      }
      if (colSex !== -1 && row[colSex]) {
        dog.dog_sex = String(row[colSex]).trim();
      }

      // Store all additional columns with their header names
      registryHeaders.forEach((header, idx) => {
        if (idx !== colRegNum && idx !== colCallName && idx !== colRegName && 
            idx !== colHandler && idx !== colEmail && idx !== colPhone && 
            idx !== colEmergency && idx !== colBreed && idx !== colSex && 
            row[idx]) {
          dog[header] = row[idx];
        }
      });

      dogMap.set(regNumber, dog);
    }

    dogInfoCache = dogMap;
    console.log(`✅ Loaded ${dogMap.size} dogs from DogInfo.xlsx`);
    return dogMap;
  } catch (error) {
    console.error('Error loading DogInfo.xlsx:', error);
    throw error;
  }
}

/**
 * Load Data for Tracker web.xlsx (trialing data)
 */
async function loadTrialingData(): Promise<any[]> {
  if (trialingDataCache) return trialingDataCache;

  try {
    console.log('Loading Data for Tracker web.xlsx...');
    const response = await fetch('https://raw.githubusercontent.com/cwagtracker/Tracker/main/Data%20for%20Tracker%20web.xlsx');
    if (!response.ok) throw new Error('Failed to fetch Data for Tracker web.xlsx');
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length === 0) {
      throw new Error('Data for Tracker web.xlsx is empty');
    }

    const records: any[] = [];

    // Process data rows (skip header if exists)
    const startRow = data[0][0] && String(data[0][0]).toLowerCase().includes('reg') ? 1 : 0;
    
    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[0]) continue;

      // Parse date - handle Excel date serial numbers
      let trialDate = row[2];
      if (typeof trialDate === 'number') {
        // Excel date serial number
        const excelEpoch = new Date(1899, 11, 30);
        trialDate = new Date(excelEpoch.getTime() + trialDate * 86400000);
      }

      records.push({
        regNumber: String(row[0] || '').trim(),
        callName: String(row[1] || '').trim(),
        trialDate: trialDate,
        level: String(row[3] || '').trim(),
        judge: String(row[4] || '').trim(),
        Qs: parseInt(row[5]) || 0,
        trialName: String(row[6] || '').trim(),
        game: String(row[7] || '').trim()
      });
    }

    trialingDataCache = records;
    console.log(`✅ Loaded ${records.length} trial records from Data for Tracker web.xlsx`);
    return records;
  } catch (error) {
    console.error('Error loading Data for Tracker web.xlsx:', error);
    throw error;
  }
}

/**
 * Search for dog by registration number
 */
export async function searchByRegistryNumber(regNumber: string): Promise<RegistryDog | null> {
  try {
    const dogMap = await loadDogInfo();
    const dog = dogMap.get(regNumber.trim());
    return dog ? applyOverrides(dog) : null;
  } catch (error) {
    console.error('Error searching by registry number:', error);
    return null;
  }
}

/**
 * Search for dogs by handler name
 */
export async function searchByHandlerName(handlerName: string): Promise<RegistryDog[]> {
  try {
    const dogMap = await loadDogInfo();
    const searchTerm = handlerName.toLowerCase().trim();
    const results: RegistryDog[] = [];

    dogMap.forEach((dog) => {
      if (dog.handler_name.toLowerCase().includes(searchTerm)) {
        results.push(applyOverrides(dog));
      }
    });

    return results.sort((a, b) => a.handler_name.localeCompare(b.handler_name));
  } catch (error) {
    console.error('Error searching by handler name:', error);
    return [];
  }
}

/**
 * Get litter mates (dogs with same middle 4 digits)
 */
export async function getLitterMates(regNumber: string): Promise<RegistryDog[]> {
  try {
    const match = regNumber.match(/\d{2}-(\d{4})-\d{2}/);
    if (!match) return [];
    
    const middleDigits = match[1];
    const dogMap = await loadDogInfo();
    const results: RegistryDog[] = [];

    dogMap.forEach((dog) => {
      if (dog.cwags_number !== regNumber && 
          dog.cwags_number.includes(`-${middleDigits}-`)) {
        results.push(applyOverrides(dog));
      }
    });

    return results.sort((a, b) => a.cwags_number.localeCompare(b.cwags_number));
  } catch (error) {
    console.error('Error getting litter mates:', error);
    return [];
  }
}

/**
 * Update registry information (saves to localStorage)
 */
export async function updateRegistry(regNumber: string, updates: Partial<RegistryDog>): Promise<boolean> {
  try {
    // Get current data
    const dogMap = await loadDogInfo();
    const currentDog = dogMap.get(regNumber);
    if (!currentDog) return false;

    // Merge updates
    const updatedDog = { ...currentDog, ...updates };
    dogMap.set(regNumber, updatedDog);

    // Save to localStorage (since we can't write to GitHub files)
    const overrides = JSON.parse(localStorage.getItem('dogInfoOverrides') || '{}');
    overrides[regNumber] = updates;
    localStorage.setItem('dogInfoOverrides', JSON.stringify(overrides));

    console.log('✅ Updated dog information (saved to localStorage):', regNumber);
    return true;
  } catch (error) {
    console.error('Error updating registry:', error);
    return false;
  }
}

/**
 * Apply localStorage overrides to dog data
 */
function applyOverrides(dog: RegistryDog): RegistryDog {
  try {
    const overrides = JSON.parse(localStorage.getItem('dogInfoOverrides') || '{}');
    const override = overrides[dog.cwags_number];
    if (override) {
      return { ...dog, ...override };
    }
  } catch (error) {
    console.error('Error applying overrides:', error);
  }
  return dog;
}

/**
 * Get all trial entries and scores for a dog
 */
export async function getDogTrialHistory(regNumber: string): Promise<TrialRecord[]> {
  try {
    const trialingData = await loadTrialingData();
    const dogRecords = trialingData.filter(r => r.regNumber === regNumber && r.Qs > 0);

    return dogRecords.map(record => {
      // Parse date
      let dateStr = 'Unknown';
      if (record.trialDate) {
        try {
          const date = record.trialDate instanceof Date ? record.trialDate : new Date(record.trialDate);
          if (!isNaN(date.getTime())) {
            dateStr = date.toLocaleDateString();
          }
        } catch (e) {
          dateStr = String(record.trialDate);
        }
      }

      return {
        date: dateStr,
        trial: record.trialName || 'Unknown Trial',
        judge: record.judge || 'Unknown',
        qs: record.Qs || 1,
        class: record.level || 'Unknown'
      };
    }).sort((a, b) => {
      // Sort by date descending (newest first)
      try {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      } catch {
        return 0;
      }
    });
  } catch (error) {
    console.error('Error getting trial history:', error);
    return [];
  }
}

/**
 * Calculate title progress from trial records
 */
export function calculateTitleProgress(records: TrialRecord[]): TitleProgress[] {
  // Group records by level/class
  const levelGroups = new Map<string, TrialRecord[]>();
  
  records.forEach(record => {
    const level = record.class;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(record);
  });

  const progress: TitleProgress[] = [];

  // Process each level
  levelGroups.forEach((levelRecords, level) => {
    // Sort records by date (oldest first for calculation)
    const sortedRecords = [...levelRecords].sort((a, b) => {
      try {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateA - dateB;
      } catch {
        return 0;
      }
    });

    const uniqueJudges = new Set(sortedRecords.map(r => r.judge)).size;
    const totalQs = sortedRecords.reduce((sum, r) => sum + r.qs, 0);

    // Calculate title status
    const hasTitle = totalQs >= 4 && uniqueJudges >= 2;
    
    let titleInfo: Partial<TitleProgress> = {
      level,
      totalQs,
      uniqueJudges,
      hasTitle,
      records: sortedRecords.slice(-5).reverse() // Show 5 most recent
    };

    if (hasTitle) {
      // Find when title was earned
      let cumulativeQs = 0;
      let judges = new Set<string>();
      let titleDate: string | undefined;
      let titleQs = 0;

      for (const record of sortedRecords) {
        const prevQs = cumulativeQs;
        const prevJudges = judges.size;
        
        cumulativeQs += record.qs;
        judges.add(record.judge);

        // Check if title requirements just became met
        if (cumulativeQs >= 4 && judges.size >= 2) {
          if (prevQs < 4 || prevJudges < 2) {
            // Title just earned with this record
            titleDate = record.date;
            
            // Calculate exactly how many Qs went to title
            let qsForTitle = record.qs;
            if (prevQs >= 4 && prevJudges < 2) {
              // Already had 4+ Qs, just needed another judge
              qsForTitle = 1;
            } else if (prevJudges >= 2 && prevQs < 4) {
              // Already had 2 judges, just needed Qs
              qsForTitle = 4 - prevQs;
            } else if (prevQs < 4 && prevJudges < 2) {
              // Needed both
              qsForTitle = Math.min(record.qs, 4 - prevQs);
            }
            
            titleQs = prevQs + qsForTitle;
            break;
          }
        }
      }

      const aceQs = Math.max(0, totalQs - titleQs);
      titleInfo.titleDate = titleDate;
      titleInfo.aceQs = aceQs;
      
      if (aceQs >= 10) {
        // Already has at least one Ace
        titleInfo.qsToNextMilestone = 10 - (aceQs % 10);
      } else {
        // Working toward first Ace
        titleInfo.qsToNextMilestone = 10 - aceQs;
      }
    } else {
      titleInfo.qsToTitle = Math.max(0, 4 - totalQs);
      titleInfo.judgesNeeded = Math.max(0, 2 - uniqueJudges);
    }

    progress.push(titleInfo as TitleProgress);
  });

  // Sort by total Qs descending
  return progress.sort((a, b) => b.totalQs - a.totalQs);
}

/**
 * Get complete dog profile with title progress
 */
export async function getDogProfile(regNumber: string) {
  let dog = await searchByRegistryNumber(regNumber);
  if (!dog) return null;

  const [litterMates, trialHistory] = await Promise.all([
    getLitterMates(regNumber),
    getDogTrialHistory(regNumber)
  ]);

  const titleProgress = calculateTitleProgress(trialHistory);

  return {
    dog,
    litterMates,
    titleProgress,
    allTrialRecords: trialHistory
  };
}

/**
 * Clear cache (useful for refreshing data)
 */
export function clearCache() {
  dogInfoCache = null;
  trialingDataCache = null;
  registryHeaders = [];
  console.log('Cache cleared');
}

/**
 * Preload data for faster searches
 */
export async function preloadData() {
  console.log('Preloading Excel data...');
  await Promise.all([
    loadDogInfo(),
    loadTrialingData()
  ]);
  console.log('✅ Data preloaded successfully');
}

/**
 * Get registry column headers
 */
export function getRegistryHeaders(): string[] {
  return registryHeaders;
}