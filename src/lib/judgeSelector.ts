// src/lib/judgeSelector.ts
// Utility functions for filtering and selecting qualified judges

import type { Judge } from '../types/judge'; // Changed from '@/types/judge'

/**
 * Get the discipline and level from a class name
 */
export function parseClassName(className: string): { discipline: string; level: string } {
  const lower = className.toLowerCase();
  
  // Scent classes
  if (lower.includes('patrol') || lower.includes('detective') || lower.includes('investigator') || 
      lower.includes('sleuth') || lower.includes('ranger') || lower.includes('dasher') || 
      lower.includes('private inv')) {
    return { discipline: 'scent', level: className };
  }
  
  // Obedience classes
  if (lower.includes('obedience')) {
    return { discipline: 'obedience', level: className };
  }
  
  // Rally classes
  if (lower.includes('starter') || lower.includes('advanced') || lower.includes('pro') || 
      lower.includes('arf') || lower.includes('zoom')) {
    return { discipline: 'rally', level: className };
  }
  
  // Games classes
  if (lower.includes('games')) {
    return { discipline: 'games', level: className };
  }
  
  return { discipline: 'unknown', level: className };
}

/**
 * Filter judges who are qualified for a specific class
 */
export function getQualifiedJudges(judges: Judge[], className: string): Judge[] {
  const { discipline, level } = parseClassName(className);
  
  return judges.filter(judge => {
    if (!judge.is_active) return false;
    
    switch (discipline) {
      case 'scent':
        return judge.scent_levels?.includes(level);
      case 'obedience':
        return judge.obedience_levels?.includes(level);
      case 'rally':
        return judge.rally_levels?.includes(level);
      case 'games':
        return judge.games_levels?.includes(level);
      default:
        return false;
    }
  });
}

/**
 * Sort judges by location proximity (same state/province first)
 */
export function sortJudgesByLocation(judges: Judge[], userState?: string): Judge[] {
  if (!userState) return judges;
  
  return [...judges].sort((a, b) => {
    const aIsLocal = a.province_state?.toLowerCase() === userState.toLowerCase();
    const bIsLocal = b.province_state?.toLowerCase() === userState.toLowerCase();
    
    if (aIsLocal && !bIsLocal) return -1;
    if (!aIsLocal && bIsLocal) return 1;
    
    // If both same locality, sort by name
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get certification summary for a judge in a specific discipline
 */
export function getCertificationSummary(judge: Judge, className: string): string {
  const { discipline } = parseClassName(className);
  
  switch (discipline) {
    case 'scent':
      return judge.scent_levels?.join(', ') || '';
    case 'obedience':
      return judge.obedience_levels?.map(l => l.replace('Obedience ', '')).join(', ') || '';
    case 'rally':
      return judge.rally_levels?.join(', ') || '';
    case 'games':
      return judge.games_levels?.join(', ') || '';
    default:
      return '';
  }
}

/**
 * Search judges by name with fuzzy matching
 */
export function searchJudgesByName(judges: Judge[], searchTerm: string): Judge[] {
  if (!searchTerm.trim()) return judges;
  
  const term = searchTerm.toLowerCase();
  return judges.filter(judge => 
    judge.name.toLowerCase().includes(term) ||
    judge.city?.toLowerCase().includes(term) ||
    judge.province_state?.toLowerCase().includes(term)
  );
}