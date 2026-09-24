export type PremiumStatus = 'draft' | 'ready';

export interface TrialPremiumContent {
  mapAddress: string;
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
  mapAddress: '',
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
