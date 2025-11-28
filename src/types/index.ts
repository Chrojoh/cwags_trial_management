// src/types/index.ts - CLEAN VERSION
// Main type exports without conflicts

// =============================================================================
// RE-EXPORT EXISTING WORKING TYPES
// =============================================================================

// From constants.ts (your existing working constants)
export type {
  TrialStatus,
  TrialType,
  ScentClass,
  NumericalClass,
  CwagsClass,
  ScoringType,
  ScentResult,
  EntryStatus,
  FeeType,
  UserRole,
  Permission,
  ErrorCode,
  NotificationType
} from '@/lib/constants';

// From timezone.ts (your existing working timezone system)
export type {
  TimezoneConfig,
  CommonTimezone,
  TrialTimeConfig
} from '@/lib/timezone';

// From auth.ts (your existing working auth system)
export type {
  User,
  UserSession, // Commented out - causing error
  AuthState
} from './auth';

// From forms.ts (clean form types)
export type {
  FormState,
  FormField,
  TrialCreateForm,
  TrialClassForm,
  PublicEntryForm,
  ScentScoreForm,
  NumericalScoreForm,
  FieldValidationResult,
  FormValidationResult
} from './forms';

// From api.ts (clean API types)
export type {
  ApiResponse,
  PaginatedResponse,
  LoginApiRequest,
  LoginApiResponse,
  CreateTrialApiRequest,
  CreateEntryApiRequest,
  BaseApiService,
  ApiError,
  ValidationError
} from './api';

// =============================================================================
// BASIC UI TYPES (minimal set)
// =============================================================================

export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

// =============================================================================
// BASIC DATABASE RECORD TYPES
// =============================================================================

export interface TrialData {
  id: string;
  trial_name: string;
  trial_date: string;
  trial_timezone: string;
  trial_type: string;
  status: string;
  venue_name: string;
  venue_address: string;
  city: string;
  province_state: string;
  postal_code: string;
  country: string;
  max_entries: number;
  entry_fee: number;
  late_fee: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EntryData {
  id: string;
  trial_id: string;
  trial_class_id: string;
  cwags_number: string;
  dog_call_name: string;
  handler_name: string;
  entry_number: number;
  running_order: number;
  entry_status: string;
  contact_email: string;
  entry_date: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const defaultPaginationConfig: PaginationConfig = {
  page: 1,
  pageSize: 25,
  total: 0
};

export const defaultSortConfig: SortConfig = {
  field: 'created_at',
  direction: 'desc'
};
// Add these exports
export type { User as UserType } from './auth';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}