// src/lib/judgeConstants.ts
export const OBEDIENCE_LEVELS = [
  'Obedience 1',
  'Obedience 2',
  'Obedience 3',
  'Obedience 4',
  'Obedience 5'
];

export const RALLY_LEVELS = [
  'Starter',
  'Advanced',
  'Pro',
  'ARF',
  'Zoom 1',
  'Zoom 1.5',
  'Zoom 2'
];

export const SCENT_LEVELS = [
  'Patrol 1',              // ✅ Fixed
  'Detective 2',           // ✅ Fixed
  'Investigator 3',        // ✅ Fixed
  'Super Sleuth 4',        // ✅ Fixed
  'Private Investigator',  // ✅ Fixed
  'Detective Diversions',
  'Ranger 1',
  'Ranger 2',
  'Ranger 3',
  'Ranger 4',
  'Ranger 5',
  'Dasher 3',
  'Dasher 4',
  'Dasher 5',
  'Dasher 6'
];

export const GAMES_LEVELS = [
  'Games 1',
  'Games 2',
  'Games 3',
  'Games 4'
];

export function sortCertificationLevels(levels: string[], allLevels: string[]): string[] {
  return levels.sort((a, b) => {
    const indexA = allLevels.indexOf(a);
    const indexB = allLevels.indexOf(b);
    return indexA - indexB;
  });
}