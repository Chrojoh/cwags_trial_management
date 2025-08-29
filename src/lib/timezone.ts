// src/lib/timezone.ts - SIMPLE VERSION WITHOUT date-fns-tz
import { 
  format, 
  parseISO, 
  differenceInHours,
  differenceInMinutes,
  addDays,
  isAfter,
  isBefore
} from 'date-fns';

export const TIMEZONE_CONFIG = {
  storage: 'UTC' as const,
  display: typeof window !== 'undefined' 
    ? Intl.DateTimeFormat().resolvedOptions().timeZone 
    : 'America/Toronto',
  
  commonTimezones: [
    'America/Toronto',
    'America/Winnipeg',
    'America/Edmonton',
    'America/Vancouver',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
  ] as const
};

export const TRIAL_TIME_CONFIG = {
  earlyStart: '07:00',
  normalStart: '08:00',
  lateStart: '09:00',
} as const;

// Simple timezone conversion using native Date and Intl
export const formatDateForStorage = (date: Date, sourceTimezone?: string): string => {
  return date.toISOString();
};

export const formatDateForDisplay = (
  utcDateString: string, 
  targetTimezone?: string,
  formatString: string = 'MMM dd, yyyy h:mm a zzz'
): string => {
  const timezone = targetTimezone || TIMEZONE_CONFIG.display;
  const date = parseISO(utcDateString);
  
  // Use Intl.DateTimeFormat for timezone conversion
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  });
  
  return formatter.format(date);
};

export const getCurrentLocalDateTime = (): Date => {
  return new Date();
};

export const createTrialDateTime = (
  dateString: string,
  timeString: string,
  timezone: string
): Date => {
  const dateTimeString = `${dateString}T${timeString}:00`;
  return new Date(dateTimeString);
};

export const getTrialLocalTime = (
  utcDateString: string,
  timezone: string
): string => {
  const date = parseISO(utcDateString);
  return date.toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export const getTrialLocalDate = (
  utcDateString: string,
  timezone: string
): string => {
  const date = parseISO(utcDateString);
  return date.toLocaleDateString('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const getTimeUntilTrial = (
  trialDateUtc: string,
  currentDate: Date = new Date()
): { days: number; hours: number; isPast: boolean } => {
  const trialDate = parseISO(trialDateUtc);
  const now = currentDate;
  
  if (now > trialDate) {
    return { days: 0, hours: 0, isPast: true };
  }
  
  const totalHours = differenceInHours(trialDate, now);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  
  return { days, hours, isPast: false };
};

export const formatTimeRemaining = (
  trialDateUtc: string,
  currentDate: Date = new Date()
): string => {
  const { days, hours, isPast } = getTimeUntilTrial(trialDateUtc, currentDate);
  
  if (isPast) return 'Trial has passed';
  
  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  if (hours > 0) {
    const minutes = differenceInMinutes(parseISO(trialDateUtc), currentDate) % 60;
    return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const minutes = differenceInMinutes(parseISO(trialDateUtc), currentDate);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
};

export const isValidTimezone = (timezone: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

export const getTimezoneOffset = (timezone: string, date: Date = new Date()): string => {
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    timeZoneName: 'longOffset'
  });
  return formatter.formatToParts(date).find(part => part.type === 'timeZoneName')?.value || '';
};

export const getTimezoneAbbreviation = (timezone: string, date: Date = new Date()): string => {
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    timeZoneName: 'short'
  });
  return formatter.formatToParts(date).find(part => part.type === 'timeZoneName')?.value || '';
};

export const formatters = {
  trialDate: (utcDate: string, timezone: string) => 
    formatDateForDisplay(utcDate, timezone),
  
  trialDateTime: (utcDate: string, timezone: string) => 
    formatDateForDisplay(utcDate, timezone),
  
  shortDate: (utcDate: string, timezone: string) => 
    getTrialLocalDate(utcDate, timezone),
  
  timeOnly: (utcDate: string, timezone: string) => 
    getTrialLocalTime(utcDate, timezone),
  
  deadlineReminder: (utcDate: string, timezone: string) => 
    formatDateForDisplay(utcDate, timezone),
    
  dateInput: (utcDate: string, timezone: string) => 
    parseISO(utcDate).toISOString().split('T')[0],
    
  timeInput: (utcDate: string, timezone: string) => 
    parseISO(utcDate).toTimeString().slice(0, 5),
};

export const useTimezone = () => {
  const getCurrentTimezone = () => TIMEZONE_CONFIG.display;
  
  const formatForUser = (utcDate: string, formatString?: string) => 
    formatDateForDisplay(utcDate, getCurrentTimezone(), formatString);
  
  const formatTrialTime = (utcDate: string, timezone: string) => ({
    date: getTrialLocalDate(utcDate, timezone),
    time: getTrialLocalTime(utcDate, timezone),
    timezone: getTimezoneAbbreviation(timezone, parseISO(utcDate)),
    full: formatDateForDisplay(utcDate, timezone)
  });
  
  return {
    getCurrentTimezone,
    formatForUser,
    formatTrialTime,
    getTimeRemaining: (trialDate: string) => 
      formatTimeRemaining(trialDate),
  };
};

export type TimezoneConfig = typeof TIMEZONE_CONFIG;
export type CommonTimezone = typeof TIMEZONE_CONFIG.commonTimezones[number];
export type TrialTimeConfig = typeof TRIAL_TIME_CONFIG;