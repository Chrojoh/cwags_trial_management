// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { VALIDATION_PATTERNS, DEFAULT_FEES } from './constants';
import {
  formatDateForStorage,
  formatDateForDisplay,
  getCurrentLocalDateTime,
  TIMEZONE_CONFIG,
} from './timezone';
import {
  areEntriesOpen,
  areLateEntriesOpen,
  calculateEntryDeadline,
  calculateLateFee,
  getEntryWindowStatus,
} from './cwagsBusiness';

// Utility function for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Validation Functions
export const isValidCwagsNumber = (number: string): boolean => {
  return VALIDATION_PATTERNS.CWAGS_NUMBER.test(number);
};

// Format a C-WAGS number to YY-HHHH-DD with leading zeros preserved
// Handles input with or without dashes. If dashes present, pads each segment correctly.
export const formatCwagsNumber = (input: string): string => {
  const trimmed = input.trim().toUpperCase();
  const parts = trimmed.split('-');

  if (parts.length === 3) {
    // Has dashes — pad each segment with leading zeros
    const year = parts[0].padStart(2, '0').slice(-2);
    const handler = parts[1].padStart(4, '0').slice(-4);
    const dog = parts[2].padStart(2, '0').slice(-2);
    return `${year}-${handler}-${dog}`;
  }

  // No dashes — split positionally from raw digits
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7) return trimmed;
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6).padStart(2, '0')}`;
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

export const formatTrialDate = (utcDateString: string, trialTimezone: string): string => {
  return formatDateForDisplay(utcDateString, trialTimezone, 'EEEE, MMMM do, yyyy');
};

export const formatTrialTime = (utcDateString: string, trialTimezone: string): string => {
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

export const getEntryDeadlineForTrial = (trialDateUtc: string, trialTimezone: string): Date => {
  return calculateEntryDeadline(trialDateUtc, trialTimezone);
};
