// src/lib/cwags-business.ts - SIMPLE VERSION WITHOUT date-fns-tz
import { 
  addDays,
  isAfter,
  isBefore,
  endOfDay,
  parseISO
} from 'date-fns';

import { 
  BUSINESS_RULES, 
  TRIAL_STATUS 
} from './constants';
import { 
  formatDateForDisplay, 
  createTrialDateTime 
} from './timezone';

export const calculateEntryDeadline = (
  trialDateUtc: string,
  trialTimezone: string
): Date => {
  const trialDate = parseISO(trialDateUtc);
  
  // Simple calculation: 7 days before trial date
  const deadlineDate = addDays(trialDate, -BUSINESS_RULES.ENTRY_DEADLINE_DAYS);
  return endOfDay(deadlineDate);
};

export const calculateLateEntryDeadline = (
  entryDeadlineUtc: Date,
  trialTimezone: string
): Date => {
  // 24 hours after regular deadline
  return addDays(entryDeadlineUtc, 1);
};

export const areEntriesOpen = (
  trialDateUtc: string,
  trialTimezone: string,
  currentDate: Date = new Date()
): boolean => {
  const entryDeadline = calculateEntryDeadline(trialDateUtc, trialTimezone);
  return isBefore(currentDate, entryDeadline);
};

export const areLateEntriesOpen = (
  trialDateUtc: string,
  trialTimezone: string,
  currentDate: Date = new Date()
): boolean => {
  const entryDeadline = calculateEntryDeadline(trialDateUtc, trialTimezone);
  const lateDeadline = calculateLateEntryDeadline(entryDeadline, trialTimezone);
  
  return isAfter(currentDate, entryDeadline) && isBefore(currentDate, lateDeadline);
};

export const calculateLateFee = (
  trialDate: string,
  trialTimezone: string,
  entryDate: Date = new Date()
): number => {
  const entriesStillOpen = areEntriesOpen(trialDate, trialTimezone, entryDate);
  
  if (entriesStillOpen) {
    return 0;
  }
  
  const lateEntriesOpen = areLateEntriesOpen(trialDate, trialTimezone, entryDate);
  
  if (lateEntriesOpen) {
    return 10.00; // Late fee
  }
  
  return -1;
};

export const getEntryWindowStatus = (
  trialDate: string,
  trialTimezone: string,
  currentDate: Date = new Date()
): 'open' | 'late' | 'closed' => {
  if (areEntriesOpen(trialDate, trialTimezone, currentDate)) {
    return 'open';
  }
  
  if (areLateEntriesOpen(trialDate, trialTimezone, currentDate)) {
    return 'late';
  }
  
  return 'closed';
};

export const validateTrialDateTime = (
  dateString: string,
  timeString: string,
  timezone: string
): { isValid: boolean; error?: string; minAdvanceNotice?: boolean } => {
  try {
    const trialDateTime = new Date(`${dateString}T${timeString}:00`);
    const now = new Date();
    
    if (trialDateTime <= now) {
      return {
        isValid: false,
        error: 'Trial date must be in the future'
      };
    }
    
    const minAdvanceMs = BUSINESS_RULES.ENTRY_DEADLINE_DAYS * 24 * 60 * 60 * 1000;
    const timeDiff = trialDateTime.getTime() - now.getTime();
    
    if (timeDiff < minAdvanceMs) {
      return {
        isValid: true,
        error: `Less than ${BUSINESS_RULES.ENTRY_DEADLINE_DAYS} days advance notice`,
        minAdvanceNotice: false
      };
    }
    
    return { isValid: true, minAdvanceNotice: true };
    
  } catch {
    return {
      isValid: false,
      error: 'Invalid date or time format'
    };
  }
};

export const formatTrialSchedule = (
  trialDate: string,
  trialTimezone: string,
  userTimezone?: string
): {
  localDate: string;
  localTime: string;
  userDate?: string;
  userTime?: string;
  entryDeadline: string;
  lateEntryDeadline: string;
} => {
  const deadline = calculateEntryDeadline(trialDate, trialTimezone);
  const lateDeadline = calculateLateEntryDeadline(deadline, trialTimezone);
  
  const result = {
    localDate: formatDateForDisplay(trialDate, trialTimezone),
    localTime: formatDateForDisplay(trialDate, trialTimezone),
    entryDeadline: formatDateForDisplay(deadline.toISOString(), trialTimezone),
    lateEntryDeadline: formatDateForDisplay(lateDeadline.toISOString(), trialTimezone),
  };
  
  if (userTimezone && userTimezone !== trialTimezone) {
    return {
      ...result,
      userDate: formatDateForDisplay(trialDate, userTimezone),
      userTime: formatDateForDisplay(trialDate, userTimezone),
    };
  }
  
  return result;
};

export const prepareTrialForDatabase = (
  date: string,
  time: string,
  timezone: string
): {
  trial_date: string;
  trial_timezone: string;
  entry_deadline: string;
  late_entry_deadline: string;
} => {
  const trialDateTime = createTrialDateTime(date, time, timezone);
  const utcTrialDate = trialDateTime.toISOString();
  
  const entryDeadline = calculateEntryDeadline(utcTrialDate, timezone);
  const lateEntryDeadline = calculateLateEntryDeadline(entryDeadline, timezone);
  
  return {
    trial_date: utcTrialDate,
    trial_timezone: timezone,
    entry_deadline: entryDeadline.toISOString(),
    late_entry_deadline: lateEntryDeadline.toISOString(),
  };
};

export const getCompetitionTimeSlots = (
  trialDate: string,
  trialTimezone: string,
  classCount: number
): Array<{
  classNumber: number;
  estimatedStartTime: string;
  estimatedEndTime: string;
}> => {
  const MINUTES_PER_CLASS = 90;
  const trialStart = new Date(trialDate);
  
  return Array.from({ length: classCount }, (_, index) => {
    const startMinutes = index * MINUTES_PER_CLASS;
    const endMinutes = (index + 1) * MINUTES_PER_CLASS;
    
    const startTime = new Date(trialStart.getTime() + (startMinutes * 60 * 1000));
    const endTime = new Date(trialStart.getTime() + (endMinutes * 60 * 1000));
    
    return {
      classNumber: index + 1,
      estimatedStartTime: startTime.toLocaleTimeString('en-US', { 
        timeZone: trialTimezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
      }),
      estimatedEndTime: endTime.toLocaleTimeString('en-US', { 
        timeZone: trialTimezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
      }),
    };
  });
};