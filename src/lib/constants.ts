// C-WAGS Constants and Configuration
// Step 7: Core system constants for trials, classes, scoring, and business rules

// =============================================================================
// TRIAL CONFIGURATION
// =============================================================================

export const TRIAL_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ENTRIES_OPEN: 'entries_open',
  ENTRIES_CLOSED: 'entries_closed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  // Added from instructions
  ACCEPTING_ENTRIES: 'accepting_entries',
  LATE_ENTRIES_ONLY: 'late_entries_only'
} as const;

export type TrialStatus = typeof TRIAL_STATUS[keyof typeof TRIAL_STATUS];

export const TRIAL_TYPES = {
  REGULAR: 'regular',
  SPECIALTY: 'specialty',
  SANCTIONED_MATCH: 'sanctioned_match',
  FUN_MATCH: 'fun_match'
} as const;

export type TrialType = typeof TRIAL_TYPES[keyof typeof TRIAL_TYPES];

// =============================================================================
// C-WAGS CLASS DEFINITIONS
// =============================================================================

export const SCENT_CLASSES = {
  // Nose Work Classes
  NW1: 'NW1',
  NW2: 'NW2', 
  NW3: 'NW3',
  NWE: 'NWE', // Elite
  
  // Specific Scent Classes
  CONTAINER: 'Container',
  INTERIOR: 'Interior',
  EXTERIOR: 'Exterior',
  VEHICLE: 'Vehicle',
  BURIED: 'Buried',
  
  // Handler Discrimination
  HANDLER_DISCRIMINATION: 'Handler Discrimination',
  
  // Fun Classes
  DETECTIVE: 'Detective',
  SPEED: 'Speed'
} as const;

export type ScentClass = typeof SCENT_CLASSES[keyof typeof SCENT_CLASSES];

export const NUMERICAL_CLASSES = {
  // Agility-style classes with numerical scoring
  RALLY: 'Rally',
  OBEDIENCE: 'Obedience',
  TRICK_DOG: 'Trick Dog'
} as const;

export type NumericalClass = typeof NUMERICAL_CLASSES[keyof typeof NUMERICAL_CLASSES];

// All available classes
export const ALL_CLASSES = {
  ...SCENT_CLASSES,
  ...NUMERICAL_CLASSES
} as const;

export type CwagsClass = typeof ALL_CLASSES[keyof typeof ALL_CLASSES];

// =============================================================================
// SCORING SYSTEMS
// =============================================================================

export const SCORING_TYPES = {
  PASS_FAIL: 'pass_fail',    // Most scent classes
  NUMERICAL: 'numerical',    // Rally, Obedience, etc.
  TIME_BASED: 'time_based'   // Speed classes
} as const;

export type ScoringType = typeof SCORING_TYPES[keyof typeof SCORING_TYPES];

// Scent class scoring results
export const SCENT_RESULTS = {
  PASS: 'pass',
  FAIL: 'fail',
  ABSENT: 'absent',
  WITHDRAWN: 'withdrawn',
  EXCUSED: 'excused'
} as const;

export type ScentResult = typeof SCENT_RESULTS[keyof typeof SCENT_RESULTS];

// Entry status during competition
export const ENTRY_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  WITHDRAWN: 'withdrawn',
  EXCUSED: 'excused',
  MOVED: 'moved'
} as const;

export type EntryStatus = typeof ENTRY_STATUS[keyof typeof ENTRY_STATUS];

// =============================================================================
// C-WAGS BUSINESS RULES
// =============================================================================

export const BUSINESS_RULES = {
  // Time limits (in seconds)
  MAX_SEARCH_TIME: {
    NW1: 180,      // 3 minutes
    NW2: 180,      // 3 minutes  
    NW3: 180,      // 3 minutes
    NWE: 180,      // 3 minutes
    CONTAINER: 120,
    INTERIOR: 180,
    EXTERIOR: 180,
    VEHICLE: 180,
    BURIED: 180,
    HANDLER_DISCRIMINATION: 120,
    DETECTIVE: 300,  // 5 minutes
    SPEED: 60       // 1 minute
  },
  
  // Hide counts
  HIDE_COUNTS: {
    NW1: { min: 1, max: 3 },
    NW2: { min: 1, max: 4 },
    NW3: { min: 0, max: 4 }, // Can have zero hides
    NWE: { min: 0, max: 4 },
    CONTAINER: { min: 1, max: 4 },
    INTERIOR: { min: 1, max: 4 },
    EXTERIOR: { min: 1, max: 4 },
    VEHICLE: { min: 1, max: 4 },
    BURIED: { min: 1, max: 4 },
    HANDLER_DISCRIMINATION: { min: 1, max: 1 }
  },
  
  // Entry limits per trial
  MAX_ENTRIES_PER_TRIAL: 100,
  MAX_ENTRIES_PER_CLASS: 50,
  
  // Timing
  ENTRY_DEADLINE_DAYS: 7, // Days before trial
  CANCELLATION_DEADLINE_HOURS: 48,

  // Added from instructions
  LATE_FEE: 25,
  TIME_LIMIT_SECONDS: 180
} as const;

// =============================================================================
// FEE STRUCTURE
// =============================================================================

export const FEE_TYPES = {
  ENTRY: 'entry',
  LATE: 'late',
  MOVE: 'move',
  REFUND: 'refund',
  PROCESSING: 'processing'
} as const;

export type FeeType = typeof FEE_TYPES[keyof typeof FEE_TYPES];

export const DEFAULT_FEES = {
  ENTRY_FEE: 25.00,        // Standard entry fee
  LATE_FEE: 10.00,         // Late entry surcharge
  MOVE_FEE: 5.00,          // Moving between classes
  PROCESSING_FEE: 2.50,    // Online processing
  REFUND_PROCESSING: 5.00  // Refund processing fee
} as const;

// =============================================================================
// USER ROLES & PERMISSIONS
// =============================================================================

export const USER_ROLES = {
  ADMINISTRATOR: 'administrator',
  TRIAL_SECRETARY: 'trial_secretary',
  JUDGE: 'judge'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const PERMISSIONS = {
  // Trial management
  CREATE_TRIAL: 'create_trial',
  EDIT_TRIAL: 'edit_trial',
  DELETE_TRIAL: 'delete_trial',
  MANAGE_ENTRIES: 'manage_entries',
  
  // Scoring
  ENTER_SCORES: 'enter_scores',
  MODIFY_SCORES: 'modify_scores',
  RESET_ROUND: 'reset_round',
  
  // Administration
  MANAGE_USERS: 'manage_users',
  MANAGE_JUDGES: 'manage_judges',
  MANAGE_REGISTRY: 'manage_registry',
  VIEW_REPORTS: 'view_reports',
  TRIAL_ASSIGNMENTS: 'trial_assignments',
  EXPORT_DATA: 'export_data'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role-based permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [USER_ROLES.ADMINISTRATOR]: [
    PERMISSIONS.CREATE_TRIAL,
    PERMISSIONS.EDIT_TRIAL,
    PERMISSIONS.DELETE_TRIAL,
    PERMISSIONS.MANAGE_ENTRIES,
    PERMISSIONS.ENTER_SCORES,
    PERMISSIONS.TRIAL_ASSIGNMENTS,
    PERMISSIONS.MODIFY_SCORES,
    PERMISSIONS.RESET_ROUND,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_JUDGES,
    PERMISSIONS.MANAGE_REGISTRY,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_DATA
  ],
  [USER_ROLES.TRIAL_SECRETARY]: [
    PERMISSIONS.CREATE_TRIAL,
    PERMISSIONS.EDIT_TRIAL,
    PERMISSIONS.MANAGE_ENTRIES,
    PERMISSIONS.ENTER_SCORES,
    PERMISSIONS.MODIFY_SCORES,
    PERMISSIONS.RESET_ROUND,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_DATA
  ],
  [USER_ROLES.JUDGE]: [
    PERMISSIONS.ENTER_SCORES,
    PERMISSIONS.VIEW_REPORTS
  ]
};

// =============================================================================
// VALIDATION PATTERNS
// =============================================================================

export const VALIDATION_PATTERNS = {
  // C-WAGS specific patterns
  CWAGS_NUMBER: /^[0-9]{2}-[0-9]{4}-[0-9]{2}$/,  // Format: 07-0001-01
  JUDGE_NUMBER: /^[A-Z]{2}[0-9]{3,4}$/,          // Format: AB123 or AB1234
  
  // Contact patterns - Updated for real-world data
  PHONE: /^[\+]?[1-9][\d\s\-\(\)\.]{0,25}$/,     // More flexible, up to 25 chars
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  POSTAL_CODE: /^[A-Z0-9\s\-]{3,10}$/i,
  
  // Trial patterns
  TRIAL_NAME: /^[A-Za-z0-9\s\-_.]{3,100}$/,
  
  // Time format (HH:MM)
  TIME_FORMAT: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
} as const;

// =============================================================================
// DISPLAY FORMATS
// =============================================================================

export const DISPLAY_FORMATS = {
  // Date formats
  DATE_SHORT: 'MMM dd, yyyy',           // Jan 15, 2024
  DATE_LONG: 'EEEE, MMMM dd, yyyy',    // Monday, January 15, 2024
  DATETIME: 'MMM dd, yyyy h:mm a',     // Jan 15, 2024 2:30 PM
  TIME_ONLY: 'h:mm a',                 // 2:30 PM
  
  // Currency
  CURRENCY: 'USD',
  CURRENCY_DECIMAL_PLACES: 2,
  
  // Numbers
  SCORE_DECIMAL_PLACES: 1,
  TIME_DECIMAL_PLACES: 2
} as const;

// =============================================================================
// SYSTEM CONFIGURATION
// =============================================================================

export const SYSTEM_CONFIG = {
  // Application
  APP_NAME: 'C-WAGS Trial Management',
  APP_VERSION: '1.0.0',
  
  // Pagination
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
  
  // File uploads
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  
  // Session
  SESSION_TIMEOUT_MINUTES: 480, // 8 hours
  
  // Auto-save
  AUTO_SAVE_INTERVAL_MS: 30000, // 30 seconds
  
  // Real-time updates
  POLLING_INTERVAL_MS: 5000,     // 5 seconds
  
  // Batch processing
  DEFAULT_BATCH_SIZE: 1000,
  MAX_BATCH_SIZE: 5000
} as const;

// =============================================================================
// ERROR CODES
// =============================================================================

export const ERROR_CODES = {
  // Authentication
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_USER_INACTIVE: 'AUTH_USER_INACTIVE',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  
  // Validation
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_DUPLICATE_ENTRY: 'VALIDATION_DUPLICATE_ENTRY',
  
  // Business Rules
  BUSINESS_ENTRY_DEADLINE_PASSED: 'BUSINESS_ENTRY_DEADLINE_PASSED',
  BUSINESS_MAX_ENTRIES_EXCEEDED: 'BUSINESS_MAX_ENTRIES_EXCEEDED',
  BUSINESS_INVALID_CLASS_COMBINATION: 'BUSINESS_INVALID_CLASS_COMBINATION',
  
  // System
  SYSTEM_DATABASE_ERROR: 'SYSTEM_DATABASE_ERROR',
  SYSTEM_FILE_UPLOAD_ERROR: 'SYSTEM_FILE_UPLOAD_ERROR',
  SYSTEM_PERMISSION_DENIED: 'SYSTEM_PERMISSION_DENIED'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// =============================================================================
// SUCCESS MESSAGES
// =============================================================================

export const SUCCESS_MESSAGES = {
  TRIAL_CREATED: 'Trial created successfully',
  TRIAL_UPDATED: 'Trial updated successfully',
  TRIAL_PUBLISHED: 'Trial published and entries are now open',
  
  ENTRY_SUBMITTED: 'Entry submitted successfully',
  ENTRY_UPDATED: 'Entry updated successfully',
  ENTRY_WITHDRAWN: 'Entry withdrawn successfully',
  
  SCORES_SAVED: 'Scores saved successfully',
  ROUND_RESET: 'Round reset successfully',
  
  DATA_EXPORTED: 'Data exported successfully',
  REPORT_GENERATED: 'Report generated successfully'
} as const;

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
