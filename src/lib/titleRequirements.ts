// src/lib/titleRequirements.ts
// ============================================================
// C-WAGS Title Requirements Configuration
// 
// This file defines all title requirements for the organization.
// Easy to extend when new classes or title types are introduced.
// ============================================================

// ============================================================
// Standard Title Requirements (Most Classes)
// ============================================================
export interface StandardTitleRequirements {
  minQs: number;           // Minimum qualifying scores needed
  minJudges: number;       // Minimum different judges needed
  minGames?: number;       // For Games classes only: minimum game types
}

export const STANDARD_TITLE: StandardTitleRequirements = {
  minQs: 4,
  minJudges: 2
};

export const GAMES_TITLE: StandardTitleRequirements = {
  minQs: 4,
  minJudges: 2,
  minGames: 2  // Must qualify in 2 different game types
};

// ============================================================
// Ace Requirements (All Classes)
// ============================================================
export const ACE_REQUIREMENT = {
  qsAfterTitle: 10  // 10 Q's after earning title = 1 Ace
};

// ============================================================
// Master Title Requirements (Multi-Class Achievements)
// ============================================================
export interface MasterTitleRequirement {
  id: string;
  displayName: string;
  abbreviation: string;
  description: string;
  requiredAces: Array<{
    classes: string[];      // List of class names
    operator: 'AND' | 'OR'; // How to combine them
    description: string;
  }>;
}

export const MASTER_TITLES: MasterTitleRequirement[] = [
  {
    id: 'master_scent_level_4',
    displayName: 'Master Scent Level 4',
    abbreviation: 'MS4',
    description: 'Ace in three Level 4 scent classes',
    requiredAces: [
      {
        classes: ['Super Sleuth 4'],
        operator: 'AND',
        description: 'Ace in Super Sleuth 4'
      },
      {
        classes: ['Ranger 4'],
        operator: 'AND',
        description: 'Ace in Ranger 4'
      },
      {
        classes: ['Dasher 4'],
        operator: 'AND',
        description: 'Ace in Dasher 4'
      }
    ]
  },
  {
    id: 'master_scent_level_5',
    displayName: 'Master Scent Level 5',
    abbreviation: 'MS5',
    description: 'Ace in three Level 5 scent classes',
    requiredAces: [
      {
        classes: ['Private Inv', 'Det Diversions'],
        operator: 'OR',
        description: 'Ace in Private Inv OR Det Diversions'
      },
      {
        classes: ['Ranger 5'],
        operator: 'AND',
        description: 'Ace in Ranger 5'
      },
      {
        classes: ['Dasher 5'],
        operator: 'AND',
        description: 'Ace in Dasher 5'
      }
    ]
  },
  {
    id: 'grand_master_scent',
    displayName: 'Grand Master Scent',
    abbreviation: 'GMS',
    description: 'Ace in all 14 scent classes',
    requiredAces: [
      {
        classes: [
          'Patrol 1',
          'Detective 2',
          'Investigator 3',
          'Super Sleuth 4',
          'Private Inv',
          'Det Diversions',
          'Ranger 1',
          'Ranger 2',
          'Ranger 3',
          'Ranger 4',
          'Ranger 5',
          'Dasher 3',
          'Dasher 4',
          'Dasher 5',
          'Dasher 6'
        ],
        operator: 'AND',
        description: 'Ace in ALL scent classes'
      }
    ]
  }
];

// ============================================================
// Class Name to Title Name Mapping
// ============================================================
export const CLASS_TITLE_MAP: Record<string, string> = {
  // Scent titles
  'Patrol 1': 'CW-SP',
  'Detective 2': 'CW-SD',
  'Investigator 3': 'CW-SI',
  'Super Sleuth 4': 'CW-SS',
  'Private Inv': 'CW-SPI',
  'Det Diversions': 'CW-SDD',
  
  // Ranger titles
  'Ranger 1': 'CW-ScR1',
  'Ranger 2': 'CW-ScR2',
  'Ranger 3': 'CW-ScR3',
  'Ranger 4': 'CW-ScR4',
  'Ranger 5': 'CW-ScR5',
  
  // Dasher titles
  'Dasher 3': 'CW-SD3',
  'Dasher 4': 'CW-SD4',
  'Dasher 5': 'CW-SD5',
  'Dasher 6': 'CW-SD6',
  
  // Obedience titles
  'Obedience 1': 'CW-Ob1',
  'Obedience 2': 'CW-Ob2',
  'Obedience 3': 'CW-Ob3',
  'Obedience 4': 'CW-Ob4',
  'Obedience 5': 'CW-Ob5',
  
  // Rally titles
  'Starter': 'CW-SR',
  'Advanced': 'CW-AR',
  'Pro': 'CW-PR',
  'ARF': 'CW-ARF',
  'Zoom 1': 'CW-ZR1',
  'Zoom 1.5': 'CW-ZR1.5',
  'Zoom 2': 'CW-ZR2',
  
  // Games titles
  'Games 1': 'CW-G1',
  'Games 2': 'CW-G2',
  'Games 3': 'CW-G3',
  'Games 4': 'CW-G4'
};

// ============================================================
// Helper: Check if a class is a Games level
// ============================================================
export function isGamesClass(className: string): boolean {
  return className.toLowerCase().includes('games');
}

// ============================================================
// Helper: Get title requirements for a specific class
// ============================================================
export function getTitleRequirements(className: string): StandardTitleRequirements {
  return isGamesClass(className) ? GAMES_TITLE : STANDARD_TITLE;
}

// ============================================================
// Helper: Get formatted title abbreviation
// ============================================================
export function getTitleAbbreviation(className: string): string {
  return CLASS_TITLE_MAP[className] || className;
}

// ============================================================
// EXTENSION GUIDE FOR FUTURE CLASSES
// ============================================================
// 
// To add a new class/title type:
// 
// 1. Add to CLASS_TITLE_MAP:
//    'New Class Name': 'CW-ABC'
//
// 2. If it has special requirements (like Games needing 2 game types):
//    - Create a new constant like GAMES_TITLE above
//    - Update getTitleRequirements() to return it
//
// 3. For Master-level titles requiring multiple aces:
//    - Add a new entry to MASTER_TITLES array
//    - Follow the existing format
//
// Example: Adding "Detective Elite" requiring Ace in all 6 detective classes:
/*
{
  id: 'detective_elite',
  displayName: 'Detective Elite',
  abbreviation: 'DE',
  description: 'Ace in all detective-related classes',
  requiredAces: [
    {
      classes: ['Patrol 1', 'Detective 2', 'Investigator 3', 
                'Super Sleuth 4', 'Private Inv', 'Det Diversions'],
      operator: 'AND',
      description: 'Ace in all 6 detective classes'
    }
  ]
}
*/