// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  SCENT_CLASSES, 
  VALIDATION_PATTERNS,
  DEFAULT_FEES
} from './constants';
import { 
  formatDateForStorage, 
  formatDateForDisplay, 
  getCurrentLocalDateTime,
  TIMEZONE_CONFIG
} from './timezone';
import { 
  areEntriesOpen, 
  areLateEntriesOpen,
  calculateEntryDeadline,
  calculateLateFee,
  getEntryWindowStatus
} from './cwagsBusiness';

// Utility function for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Validation Functions
export const isValidCwagsNumber = (number: string): boolean => {
  return VALIDATION_PATTERNS.CWAGS_NUMBER.test(number);
};

export const isValidEmail = (email: string): boolean => {
  return VALIDATION_PATTERNS.EMAIL.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  return VALIDATION_PATTERNS.PHONE.test(phone);
};

// Formatting Functions
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatPhoneNumber = (phone: string): string => {
  if (phone.startsWith('+') || phone.length > 10) {
    return phone;
  }
  
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

// Business Logic Functions
export const calculateTimeLimit = (className: string): number => {
  return 180; // 3 minutes default for most classes
};

export const isPassingScore = (
  className: string,
  score: number,
  hideCount?: number
): boolean => {
  // Check if it's a scent class
  const isScentClass = Object.values(SCENT_CLASSES).includes(className as any);
  
  if (isScentClass) {
    return (hideCount || 0) > 0;
  }
  
  // Numerical classes: pass if score meets minimum
  const minScore = 170;
  return score >= minScore;
};

// Search and Filter Functions
// Array Operations
export const groupBy = <T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

export const unique = <T>(array: T[]): T[] => {
  return Array.from(new Set(array));
};

export const uniqueBy = <T, K extends keyof T>(array: T[], key: K): T[] => {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

// String Utilities
export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str;
  return str.slice(0, length).trim() + '...';
};

// File Utilities
export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

// NEW TIMEZONE-AWARE FUNCTIONS
export const formatDate = (
  date: Date | string, 
  timezone?: string,
  format: string = 'MMM dd, yyyy'
): string => {
  if (typeof date === 'string') {
    return formatDateForDisplay(date, timezone, format);
  }
  return formatDateForDisplay(date.toISOString(), timezone, format);
};

export const formatTrialDate = (
  utcDateString: string, 
  trialTimezone: string
): string => {
  return formatDateForDisplay(utcDateString, trialTimezone, 'EEEE, MMMM do, yyyy');
};

export const formatTrialTime = (
  utcDateString: string, 
  trialTimezone: string
): string => {
  return formatDateForDisplay(utcDateString, trialTimezone, 'h:mm a zzz');
};

export const areEntriesOpenForTrial = (
  trialDateUtc: string,
  trialTimezone: string,
  currentDate?: Date
): boolean => {
  return areEntriesOpen(trialDateUtc, trialTimezone, currentDate);
};

export const areLateEntriesOpenForTrial = (
  trialDateUtc: string,
  trialTimezone: string,
  currentDate?: Date
): boolean => {
  return areLateEntriesOpen(trialDateUtc, trialTimezone, currentDate);
};

export const calculateEntryFee = (
  baseClassFee: number,
  trialDateUtc: string,
  trialTimezone: string,
  entryDate?: Date
): number => {
  const currentDate = entryDate || getCurrentLocalDateTime();
  
  if (areEntriesOpen(trialDateUtc, trialTimezone, currentDate)) {
    return baseClassFee;
  }
  
  if (areLateEntriesOpen(trialDateUtc, trialTimezone, currentDate)) {
    return baseClassFee + DEFAULT_FEES.LATE_FEE;
  }
  
  return -1;
};

export const getEntryDeadlineForTrial = (
  trialDateUtc: string,
  trialTimezone: string
): Date => {
  return calculateEntryDeadline(trialDateUtc, trialTimezone);
};


// Re-exports
export {
  formatDateForStorage,
  formatDateForDisplay,
  getCurrentLocalDateTime,
  TIMEZONE_CONFIG,
} from './timezone';

export {
  areEntriesOpen,
  areLateEntriesOpen,
  calculateEntryDeadline,
  calculateLateFee,
  getEntryWindowStatus,
} from './cwagsBusiness';