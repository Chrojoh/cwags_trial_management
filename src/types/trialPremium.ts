export type PremiumStatus = 'draft' | 'ready';
export type PremiumColorScheme = 'warm' | 'forest' | 'blue' | 'plum';

export interface TrialPremiumContent {
  colorScheme: PremiumColorScheme;
  mapAddress: string;
  checkInTime: string;
  trialStartTime: string;
  trialChairContact: string;
  pricingDeadlineNotes: string;
  paperEntryInstructions: string;
  paymentInstructions: string;
  refundPolicy: string;
  moveUpPolicy: string;
  volunteerInformation: string;
  awardsInformation: string;
  facilityInformation: string;
  parkingInformation: string;
  cratingInformation: string;
  accessibilityInformation: string;
  veterinarianInformation: string;
  emergencyInformation: string;
  directionsInformation: string;
  nearbyServices: string;
  safetyRules: string;
  waitlistInformation: string;
  rulesAcknowledgement: string;
  ringSetupTime: string;
  judgesBriefingTime: string;
  additionalInformation: string;
}

export interface TrialPremiumRecord {
  status: PremiumStatus;
  content: TrialPremiumContent;
  updatedAt: string | null;
  updatedBy: string | null;
  mapImagePath: string | null;
}

export interface TrialPremiumModel extends TrialPremiumRecord {
  trial: {
    id: string;
    trialName: string;
    clubName: string;
    location: string;
    startDate: string;
    endDate: string;
    entryOpenAt: string | null;
    entryTimezone: string | null;
    entriesCloseDate: string | null;
    secretaryName: string;
    secretaryEmail: string;
    secretaryPhone: string;
    waiverText: string;
  };
  schedule: Array<{
    date: string;
    dayNumber: number;
    className: string;
    classOrder: number;
    roundNumber: number;
    judgeName: string;
    entryFee: number;
    feoAvailable: boolean;
  }>;
  missingRequired: string[];
  setupRequired?: boolean;
}

export const EMPTY_PREMIUM_CONTENT: TrialPremiumContent = {
  colorScheme: 'warm',
  mapAddress: '',
  checkInTime: '',
  trialStartTime: '',
  trialChairContact: '',
  pricingDeadlineNotes: '',
  paperEntryInstructions: '',
  paymentInstructions: '',
  refundPolicy: '',
  moveUpPolicy: '',
  volunteerInformation: '',
  awardsInformation: '',
  facilityInformation: '',
  parkingInformation: '',
  cratingInformation: '',
  accessibilityInformation: '',
  veterinarianInformation: '',
  emergencyInformation: '',
  directionsInformation: '',
  nearbyServices: '',
  safetyRules: '',
  waitlistInformation: '',
  rulesAcknowledgement: '',
  ringSetupTime: '',
  judgesBriefingTime: '',
  additionalInformation: '',
};
