export type ApplicationValueSource = 'entered' | 'stored' | 'derived' | 'missing';
export type VenueSetting = 'inside' | 'outside' | 'both';

export interface TrialApplicationOverrides {
  contactPhone?: string;
  insuranceExpirationDate?: string;
  advocateNames?: string[];
  premiumWebsite?: string;
  submittedDate?: string;
  venueSetting?: VenueSetting;
  isLeague?: boolean;
  surface?: string;
  ringSizeExceptionRequest?: string;
  numberOfRings?: number;
  numberOfSearchAreas?: number;
  resetJudgeOverrides?: Record<string, { judgeId?: string; judgeName: string }>;
}

export interface TrialApplicationScheduleRow {
  roundId: string;
  program: 'obedience' | 'rally' | 'games' | 'scent';
  className: string;
  classOrder: number;
  dayNumber: number;
  date: string;
  judgeName: string;
  roundNumber: number;
  isReset: boolean;
  parentRoundNumber?: number;
}

export interface ResetSetupIssue {
  parentRoundId: string;
  className: string;
  classNameForCertification: string;
  dayNumber: number;
  parentRoundNumber: number;
  primaryJudgeName: string;
  expectedResetRoundNumber: number;
  reason: 'missing_reset_round' | 'missing_reset_judge' | 'judge_mismatch';
}

export interface TrialApplicationData {
  trialId: string;
  template: 'scent' | 'general';
  trialDates: string[];
  city: string;
  region: string;
  hostName: string;
  locationName: string;
  premiumWebsite: string;
  contact: { name: string; email: string; phone: string };
  submittedDate: string;
  programs: { obedience: boolean; rally: boolean; games: boolean; scent: boolean };
  judges: string[];
  advocates: string[];
  schedule: TrialApplicationScheduleRow[];
  venue: {
    setting?: VenueSetting;
    surface: string;
    isLeague?: boolean;
    insuranceExpirationDate: string;
    ringSizeExceptionRequest: string;
    numberOfRings?: number;
  };
  scent?: { resetsOffered: boolean; numberOfSearchAreas?: number };
  sources: Record<string, ApplicationValueSource>;
  missingRequired: string[];
  missingOptional: string[];
  derived: string[];
  unmappedScheduleRows: string[];
  resetIssues: ResetSetupIssue[];
  resetJudgeOptions?: Record<string, Array<{
    id: string; name: string; email: string; city?: string; province_state?: string;
    obedience_levels: string[]; rally_levels: string[]; games_levels: string[]; scent_levels: string[]; is_active: boolean;
  }>>;
}
