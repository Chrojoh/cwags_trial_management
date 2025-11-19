// Create new file: src/lib/divisionUtils.ts
// Helper functions for handling Obedience/Rally divisions

/**
 * Check if a class requires division selection
 */
export const requiresDivision = (className: string | undefined): boolean => {
  if (!className) return false;
  const lowerName = className.toLowerCase();
  
  // Check if it's Obedience
  if (lowerName.includes('obedience')) return true;
  
  // Check if it's Rally (including Zoom classes)
  const rallyClasses = ['starter', 'advanced', 'pro', 'arf', 'zoom'];
  return rallyClasses.some(rally => lowerName.includes(rally));
};

/**
 * Get full division name from code
 */
export const getDivisionName = (division: string | null | undefined): string => {
  if (!division) return '';
  
  const divisionNames: Record<string, string> = {
    'A': 'Division A (Beginner)',
    'B': 'Division B (Experienced)',
    'TO': 'Trial Official',
    'JR': 'Junior Handler'
  };
  
  return divisionNames[division] || division;
};

/**
 * Get division badge display for UI
 * Similar to how FEO is displayed
 */
export const getDivisionBadge = (division: string | null | undefined): string => {
  if (!division) return '';
  
  // Return just the code for compact display
  return division;
};

/**
 * Get division color for UI styling
 */
export const getDivisionColor = (division: string | null | undefined): string => {
  if (!division) return 'bg-gray-100 text-gray-700';
  
  const colors: Record<string, string> = {
    'A': 'bg-orange-100 text-orange-700 border-orange-300',
    'B': 'bg-green-100 text-green-700 border-green-300',
    'TO': 'bg-purple-100 text-purple-700 border-purple-300',
    'JR': 'bg-orange-100 text-orange-700 border-orange-300'
  };
  
  return colors[division] || 'bg-gray-100 text-gray-700 border-gray-300';
};

/**
 * Check if division competes for placement
 * TO (Trial Official) does not compete for placement
 */
export const competesForPlacement = (division: string | null | undefined): boolean => {
  return division !== 'TO';
};

/**
 * Sort entries by division for placement calculations
 * Groups: Division A, Division B, Junior Handler
 * Excludes: Trial Official (TO)
 */
export const groupByDivision = (entries: any[]): Record<string, any[]> => {
  const groups: Record<string, any[]> = {
    'A': [],
    'B': [],
    'JR': []
  };
  
  entries.forEach(entry => {
    const division = entry.division;
    if (division && division !== 'TO' && groups[division]) {
      groups[division].push(entry);
    }
  });
  
  return groups;
};