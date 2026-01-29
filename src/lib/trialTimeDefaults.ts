// src/lib/trialTimeDefaults.ts
// Default minutes per run for each class level
// ✅ UPDATED: All class names now match official C-WAGS names with proper numbers

export const DEFAULT_SCENT_TIMES = {
  'Patrol 1': 1.75,              // ✅ Fixed: was 'Patrol'
  'Detective 2': 2.75,           // ✅ Fixed: was 'Detective'
  'Investigator 3': 3.25,        // ✅ Fixed: was 'Investigator'
  'Super Sleuth 4': 5.25,        // ✅ Fixed: was 'Super Sleuth'
  'Private Investigator': 4.25,  // ✅ Correct
  'Detective Diversions': 3.25,  // ✅ Correct
  'Ranger 1': 2.25,
  'Ranger 2': 2.25,
  'Ranger 3': 3.25,
  'Ranger 4': 3.25,
  'Ranger 5': 2.75,
  'Dasher 3': 0.75,
  'Dasher 4': 1.0,
  'Dasher 5': 1.5,
  'Dasher 6': 1.25,
} as const;

export const DEFAULT_RALLY_OBEDIENCE_GAMES_TIMES = {
  // Rally
  'Starter': 3.0,
  'Advanced': 3.0,
  'Pro': 3.0,
  'ARF': 3.0,
  
  // Zoom
  'Zoom 1': 2.0,
  'Zoom 1.5': 2.0,
  'Zoom 2': 2.0,
  
  // Games
  'Games 1': 2.0,
  'Games 2': 2.0,
  'Games 3': 2.0,
  'Games 4': 2.0,
  
  // Obedience
  'Obedience 1': 0.5,
  'Obedience 2': 0.75,
  'Obedience 3': 0.5,
  'Obedience 4': 1.25,
  'Obedience 5': 1.25,
} as const;

export const DEFAULT_DAILY_ALLOTMENT = 250; // minutes

// Helper function to initialize defaults for a trial
export function getDefaultTimeConfigurations(trialId: string) {
  const configs = [];
  
  // Add scent defaults
  for (const [className, minutes] of Object.entries(DEFAULT_SCENT_TIMES)) {
    configs.push({
      trial_id: trialId,
      class_name: className,
      discipline: 'scent',
      minutes_per_run: minutes,
      is_active: true
    });
  }
  
  // Add rally/obedience/games defaults
  for (const [className, minutes] of Object.entries(DEFAULT_RALLY_OBEDIENCE_GAMES_TIMES)) {
    configs.push({
      trial_id: trialId,
      class_name: className,
      discipline: 'rally_obedience_games',
      minutes_per_run: minutes,
      is_active: true
    });
  }
  
  return configs;
}