// src/lib/registryOperations.ts
// Helper functions for registry management with title tracking

import { getSupabaseBrowser } from './supabaseBrowser';
import * as XLSX from 'xlsx';

const supabase = getSupabaseBrowser();

export interface RegistryDog {
  id: string;
  cwags_number: string;
  dog_call_name: string;
  handler_name: string;
  handler_email?: string;
  handler_phone?: string;
  emergency_contact?: string;
  breed?: string;
  dog_sex?: string;
  is_junior_handler: boolean;
  is_active: boolean;
  created_at: string;
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
  gamesNeeded?: number; // ✅ ADD THIS LINE for Games levels
  records: TrialRecord[];
}

export interface TrialRecord {
  date: string;
  trial: string;
  judge: string;
  qs: number;
  class: string;
  game?: string; // ✅ ADD THIS LINE - stores game type (BJ, C, P, T, GB)
}

// Cache for trialing data
let trialingDataCache: any[] | null = null;

/**
 * Parse registration number to extract components
 * Format: YY-OOOO-DD
 * YY = Year registered (e.g., 17 = 2017)
 * OOOO = Owner ID (unique identifier for handler)
 * DD = Dog number for that owner (01, 02, 03, etc.)
 */
export function parseRegistrationNumber(regNumber: string) {
  const match = regNumber.match(/(\d{2})-(\d{4})-(\d{2})/);
  if (!match) return null;
  
  return {
    year: match[1],
    ownerId: match[2],
    dogNumber: match[3],
    full: regNumber
  };
}

/**
 * Get owner ID from registration number
 */
export function getOwnerId(regNumber: string): string | null {
  const parsed = parseRegistrationNumber(regNumber);
  return parsed ? parsed.ownerId : null;
}

/**
 * Load Data for Tracker web.xlsx (trialing data)
 */
async function loadTrialingData(): Promise<any[]> {
  if (trialingDataCache) return trialingDataCache;

  try {
    console.log('Loading Data for Tracker web.xlsx...');
   const response = await fetch('/Data-for-Tracker-web.xlsx');
    if (!response.ok) throw new Error('Failed to fetch data-for-tracker-web.xlsx');
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      raw: false
    });

    if (data.length === 0) {
      throw new Error('Data for Tracker web.xlsx is empty');
    }

    console.log('📊 Excel loaded:', data.length, 'rows');

    const records: any[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[0]) continue;
      
      const regNumber = String(row[0] || '').trim();
      
      // Skip header row
      if (regNumber.toLowerCase().includes('reg') || regNumber.toLowerCase().includes('number')) {
        console.log('Skipping header row:', i);
        continue;
      }

      const points = parseInt(row[6]) || 0; // Column 6 = Points (Q count)
      
      // Only include records with points > 0
      if (points > 0) {
        records.push({
          regNumber: regNumber,
          callName: String(row[1] || '').trim(),
          trialDate: row[2],
          level: String(row[3] || '').trim(),
          results: String(row[4] || '').trim(), // Game type or P/score
          judge: String(row[5] || '').trim(),
          Qs: points, // Use Points column for Q count
          trialName: String(row[7] || '').trim(), // Column 7 if it exists
          game: String(row[4] || '').trim() // Store game type from Results
        });
      }
    }

    console.log('✅ Processed records:', records.length);
    console.log('📝 Sample records:', records.slice(0, 3));

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
    const { data, error } = await supabase
      .from('cwags_registry')
      .select('*')
      .eq('cwags_number', regNumber.trim())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw error;
    }
    return data;
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
    const { data, error } = await supabase
      .from('cwags_registry')
      .select('*')
      .ilike('handler_name', `%${handlerName.trim()}%`)
      .order('handler_name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching by handler name:', error);
    return [];
  }
}

/**
 * Get owner's other dogs (same owner ID = middle 4 digits)
 * Format: YY-OOOO-DD where OOOO is the owner's unique ID
 */
export async function getOwnersDogs(regNumber: string): Promise<RegistryDog[]> {
  try {
    const ownerId = getOwnerId(regNumber);
    if (!ownerId) return [];

    // Find all dogs with same owner ID (middle 4 digits)
    const { data, error } = await supabase
      .from('cwags_registry')
      .select('*')
      .ilike('cwags_number', `%-${ownerId}-%`)
      .neq('cwags_number', regNumber)
      .order('cwags_number');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting owner\'s dogs:', error);
    return [];
  }
}

/**
 * @deprecated Use getOwnersDogs instead
 * Kept for backward compatibility
 */
export async function getLitterMates(regNumber: string): Promise<RegistryDog[]> {
  return getOwnersDogs(regNumber);
}

/**
 * Update registry information
 */
export async function updateRegistry(id: string, updates: Partial<RegistryDog>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cwags_registry')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    console.log('✅ Updated dog information in database');
    return true;
  } catch (error) {
    console.error('Error updating registry:', error);
    return false;
  }
}

/**
 * Get all trial entries and scores for a dog from Excel file
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
        class: record.level || 'Unknown',
        game: record.game || record.results || '' // ✅ ADD THIS LINE
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
 * Get unique games from trial records (for Games levels)
 */
function getUniqueGames(records: TrialRecord[]): Set<string> {
  const games = new Set<string>();
  const gamesList = ['BJ', 'C', 'P', 'T', 'GB'];
  
  records.forEach(record => {
    if (record.game) {
      const gameStr = record.game.toString().toUpperCase();
      gamesList.forEach(game => {
        if (gameStr.includes(game)) {
          games.add(game);
        }
      });
    }
  });
  
  return games;
}

/**
 * Calculate title progress from trial records
 */
export function calculateTitleProgress(records: TrialRecord[]): TitleProgress[] {
  const levelGroups = new Map<string, TrialRecord[]>();
  
  records.forEach(record => {
    const level = record.class;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(record);
  });

  const progress: TitleProgress[] = [];

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
    
    // Check if this is a Games level
    const isGamesLevel = level.startsWith('Games ');
    const uniqueGames = isGamesLevel ? getUniqueGames(sortedRecords) : new Set();

    // Calculate when title was earned
    // For Games: Need 4 Q's AND 2 judges AND 2 unique games
    // For others: Need 4 Q's AND 2 judges
    let titleQs = 0;
    let titleDate: string | undefined;
    let cumulativeQs = 0;
    let judges = new Set<string>();
    let gamesAtPoint = new Set<string>();
    
    for (const record of sortedRecords) {
      const prevQs = cumulativeQs;
      const prevJudgeCount = judges.size;
      const prevGameCount = gamesAtPoint.size;
      
      cumulativeQs += record.qs;
      if (record.judge) judges.add(record.judge);
      
      // Track games for Games levels
      if (isGamesLevel && record.game) {
        const gameStr = record.game.toString().toUpperCase();
        ['BJ', 'C', 'P', 'T', 'GB'].forEach(game => {
          if (gameStr.includes(game)) {
            gamesAtPoint.add(game);
          }
        });
      }
      
      // Check if title requirements are NOW met (but weren't before)
      let nowHasTitle: boolean;
      let previouslyHadTitle: boolean;
      
      if (isGamesLevel) {
        // Games: needs 4 Q's AND 2 judges AND 2 different games
        nowHasTitle = cumulativeQs >= 4 && judges.size >= 2 && gamesAtPoint.size >= 2;
        previouslyHadTitle = prevQs >= 4 && prevJudgeCount >= 2 && prevGameCount >= 2;
      } else {
        // Non-Games: needs 4 Q's AND 2 judges
        nowHasTitle = cumulativeQs >= 4 && judges.size >= 2;
        previouslyHadTitle = prevQs >= 4 && prevJudgeCount >= 2;
      }
      
      if (nowHasTitle && !previouslyHadTitle) {
        // Title was just earned with this record
        titleDate = record.date;
        
        // Calculate how many Q's from THIS record went to earning the title
        let qsTowardTitle = record.qs;
        
        // Case 1: Already had Q's & judges but needed games (Games only)
        if (isGamesLevel && prevQs >= 4 && prevJudgeCount >= 2 && prevGameCount < 2) {
          qsTowardTitle = 1; // Only 1 Q needed to satisfy game requirement
        }
        // Case 2: Already had 4+ Q's but needed 2nd judge
        else if (prevQs >= 4 && prevJudgeCount < 2) {
          qsTowardTitle = 1; // Only 1 Q from this record completes title
        }
        // Case 3: Already had 2 judges but needed to reach 4 Q's
        else if (prevJudgeCount >= 2 && prevQs < 4) {
          qsTowardTitle = 4 - prevQs; // Only enough Q's to reach 4
        }
        // Case 4: Needed both conditions (< 4 Q's AND < 2 judges)
        else if (prevQs < 4 && prevJudgeCount < 2) {
          qsTowardTitle = Math.min(record.qs, 4 - prevQs);
        }
        
        titleQs = prevQs + qsTowardTitle;
        break;
      }
    }

    // Determine if title is earned
    let hasTitle: boolean;
    if (isGamesLevel) {
      hasTitle = totalQs >= 4 && uniqueJudges >= 2 && uniqueGames.size >= 2;
    } else {
      hasTitle = totalQs >= 4 && uniqueJudges >= 2;
    }

    // If title requirements not met, all Q's go toward title
    if (titleQs === 0 && !hasTitle) {
      titleQs = cumulativeQs;
    }

    const aceQs = hasTitle ? Math.max(0, totalQs - titleQs) : 0;

    let titleInfo: Partial<TitleProgress> = {
      level,
      totalQs,
      uniqueJudges,
      hasTitle,
      records: sortedRecords.reverse() // ✅ Show ALL records, newest first
    };

    if (hasTitle) {
      titleInfo.titleDate = titleDate;
      titleInfo.aceQs = aceQs;
      
      if (aceQs >= 10) {
        titleInfo.qsToNextMilestone = 10 - (aceQs % 10);
      } else {
        titleInfo.qsToNextMilestone = 10 - aceQs;
      }
    } else {
      titleInfo.qsToTitle = Math.max(0, 4 - totalQs);
      titleInfo.judgesNeeded = Math.max(0, 2 - uniqueJudges);
      
      // Add games requirement for Games levels
      if (isGamesLevel) {
        titleInfo.gamesNeeded = Math.max(0, 2 - uniqueGames.size);
      }
    }

    progress.push(titleInfo as TitleProgress);
  });

  // Define the proper C-WAGS level order
const levelOrder = [
  // Scent levels
  'Patrol 1', 'Detective 2', 'Investigator 3', 'Super Sleuth 4', 'Private Inv', 'Det Diversions',
  // Ranger levels
  'Ranger 1', 'Ranger 2', 'Ranger 3', 'Ranger 4', 'Ranger 5',
  // Dasher levels
  'Dasher 3', 'Dasher 4', 'Dasher 5', 'Dasher 6',
  // Obedience levels
  'Obedience 1', 'Obedience 2', 'Obedience 3', 'Obedience 4', 'Obedience 5',
  // Rally levels
  'Starter', 'Advanced', 'Pro', 'ARF', 'Zoom 1', 'Zoom 1.5', 'Zoom 2',
  // Games levels
  'Games 1', 'Games 2', 'Games 3', 'Games 4'
];

// Sort by predefined level order
return progress.sort((a, b) => {
  const indexA = levelOrder.indexOf(a.level);
  const indexB = levelOrder.indexOf(b.level);
  
  // If both levels are in the order list, sort by their position
  if (indexA !== -1 && indexB !== -1) {
    return indexA - indexB;
  }
  
  // If only one is in the list, prioritize it
  if (indexA !== -1) return -1;
  if (indexB !== -1) return 1;
  
  // If neither is in the list, sort alphabetically
  return a.level.localeCompare(b.level);
});
}

/**
 * Get complete dog profile with title progress
 */
export async function getDogProfile(regNumber: string) {
  const dog = await searchByRegistryNumber(regNumber);
  if (!dog) return null;

  const [ownersDogs, trialHistory] = await Promise.all([
    getOwnersDogs(regNumber),
    getDogTrialHistory(regNumber)
  ]);

  const titleProgress = calculateTitleProgress(trialHistory);

  return {
    dog,
    ownersDogs,
    titleProgress,
    allTrialRecords: trialHistory,
    // Keep litterMates for backward compatibility
    litterMates: ownersDogs
  };
}

/**
 * Clear cache (useful for refreshing trial data)
 */
export function clearCache() {
  trialingDataCache = null;
  console.log('Trial data cache cleared');
}

/**
 * Preload trial data for faster searches
 */
export async function preloadTrialData() {
  console.log('Preloading trial data...');
  await loadTrialingData();
  console.log('✅ Trial data preloaded successfully');
}