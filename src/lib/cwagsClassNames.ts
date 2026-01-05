// src/lib/cwagsClassNames.ts
// SINGLE SOURCE OF TRUTH for all C-WAGS class names and ordering
// DO NOT duplicate this list elsewhere - import from here instead

export const CWAGS_CLASS_ORDER = [
  // Scent Work Classes (normalized display names)
  'Patrol 1',              // ✅ Database has "Patrol", display shows "Patrol 1"
  'Detective 2',           // ✅ Database has "Detective", display shows "Detective 2"
  'Investigator 3',        // ✅ Database has "Investigator", display shows "Investigator 3"
  'Super Sleuth 4',          // ✅ Database has "Super Sleuth", no normalization
  'Private Investigator',  // ✅ Database has this exactly
  'Detective Diversions',  // ✅ Database has this exactly
  
  // Ranger Classes
  'Ranger 1',
  'Ranger 2',
  'Ranger 3',
  'Ranger 4',
  'Ranger 5',
  
  // Dasher Classes
  'Dasher 3',
  'Dasher 4',
  'Dasher 5',
  'Dasher 6',
  
  // Obedience Classes
  'Obedience 1',
  'Obedience 2',
  'Obedience 3',
  'Obedience 4',
  'Obedience 5',
  
  // Rally Classes
  'Starter',
  'Advanced',
  'Pro',
  'ARF',
  
  // Zoom Classes
  'Zoom 1',
  'Zoom 1.5',
  'Zoom 2',
  
  // Games Classes
  'Games 1',
  'Games 2',
  'Games 3',
  'Games 4'
] as const;

export const CWAGS_LEVELS = {
  'Scent Work': [
    'Patrol 1', 'Detective 2', 'Investigator 3', 'Super Sleuth 4', 
    'Private Investigator', 'Detective Diversions',
    'Ranger 1', 'Ranger 2', 'Ranger 3', 'Ranger 4', 'Ranger 5',
    'Dasher 3', 'Dasher 4', 'Dasher 5', 'Dasher 6'
  ],
  'Rally': [
    'Starter', 'Advanced', 'Pro', 'ARF', 
    'Zoom 1', 'Zoom 1.5', 'Zoom 2'
  ],
  'Obedience': [
    'Obedience 1', 'Obedience 2', 'Obedience 3', 
    'Obedience 4', 'Obedience 5'
  ],
  'Games': [
    'Games 1', 'Games 2', 'Games 3', 'Games 4'
  ]
} as const;

// Helper function to get class display order
// Helper function to get class display order
export function getClassOrder(className: string): number {
  const index = CWAGS_CLASS_ORDER.findIndex(order => order === className);
  return index === -1 ? 999 : index;
}

// Helper to sort classes
export function sortClasses(classes: { class_name: string }[]) {
  return classes.sort((a, b) => 
    getClassOrder(a.class_name) - getClassOrder(b.class_name)
  );
}