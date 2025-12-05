// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  BUSINESS_RULES, 
  SCENT_CLASSES, 
  NUMERICAL_CLASSES,
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
export const searchDogs = (
  dogs: Array<{ cwags_number: string; dog_call_name: string; handler_name: string }>,
  query: string
): typeof dogs => {
  if (!query.trim()) return dogs;
  
  const searchTerm = query.toLowerCase();
  
  return dogs.filter(dog => 
    dog.cwags_number.toLowerCase().includes(searchTerm) ||
    dog.dog_call_name.toLowerCase().includes(searchTerm) ||
    dog.handler_name.toLowerCase().includes(searchTerm)
  );
};

export const searchJudges = (
  judges: Array<{ name: string; email: string; level?: string }>,
  query: string
): typeof judges => {
  if (!query.trim()) return judges;
  
  const searchTerm = query.toLowerCase();
  
  return judges.filter(judge => 
    judge.name.toLowerCase().includes(searchTerm) ||
    judge.email.toLowerCase().includes(searchTerm) ||
    (judge.level && judge.level.toLowerCase().includes(searchTerm))
  );
};

// Performance Functions
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const retry = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

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
export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str;
  return str.slice(0, length).trim() + '...';
};

export const titleCase = (str: string): string => {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

export const initials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// File Utilities
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

export const isValidFileType = (filename: string, allowedTypes: string[]): boolean => {
  const extension = getFileExtension(filename).toLowerCase();
  return allowedTypes.includes(extension);
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

export const sortTrialsByDate = <T extends { trial_date: string }>(
  trials: T[]
): T[] => {
  return [...trials].sort((a, b) => 
    new Date(a.trial_date).getTime() - new Date(b.trial_date).getTime()
  );
};

export const createTrialScheduleText = (
  trialDateUtc: string,
  trialTimezone: string,
  userTimezone?: string
): string => {
  const trialDate = formatTrialDate(trialDateUtc, trialTimezone);
  const trialTime = formatTrialTime(trialDateUtc, trialTimezone);
  
  let scheduleText = `${trialDate} at ${trialTime}`;
  
  if (userTimezone && userTimezone !== trialTimezone) {
    const userTime = formatDateForDisplay(
      trialDateUtc, 
      userTimezone, 
      'h:mm a zzz'
    );
    scheduleText += ` (${userTime} your time)`;
  }
  
  return scheduleText;
};

export const getTrialStatusText = (
  trialDateUtc: string,
  trialTimezone: string
): string => {
  const now = getCurrentLocalDateTime();
  const status = getEntryWindowStatus(trialDateUtc, trialTimezone, now);
  
  if (status === 'open') {
    const deadline = calculateEntryDeadline(trialDateUtc, trialTimezone);
    const deadlineText = formatDateForDisplay(
      deadline.toISOString(), 
      trialTimezone, 
      'MMM dd h:mm a'
    );
    return `Entries open until ${deadlineText}`;
  }
  
  if (status === 'late') {
    return `Late entries only (+$${DEFAULT_FEES.LATE_FEE} fee)`;
  }
  
  return 'Entries closed';
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