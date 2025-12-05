// src/types/judge.ts
// Updated Judge interface matching the new database structure

export interface Judge {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  province_state?: string;
  country?: string;
  obedience_levels: string[];
  rally_levels: string[];
  games_levels: string[];
  scent_levels: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Available certification levels for each discipline
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
  'Patrol',
  'Detective',
  'Investigator',
  'Super Sleuth',
  'Private Inv',
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

// Helper function to sort badges in proper order
export function sortCertificationLevels(levels: string[], allLevels: string[]): string[] {
  return levels.sort((a, b) => {
    const indexA = allLevels.indexOf(a);
    const indexB = allLevels.indexOf(b);
    return indexA - indexB;
  });
}

// Form data for creating/editing judges
export interface JudgeFormData {
  name: string;
  email: string;
  phone: string;
  city: string;
  province_state: string;
  country: string;
  obedience_levels: string[];
  rally_levels: string[];
  games_levels: string[];
  scent_levels: string[];
  is_active: boolean;
}

export const emptyJudgeForm: JudgeFormData = {
  name: '',
  email: '',
  phone: '',
  city: '',
  province_state: '',
  country: '',
  obedience_levels: [],
  rally_levels: [],
  games_levels: [],
  scent_levels: [],
  is_active: true
};