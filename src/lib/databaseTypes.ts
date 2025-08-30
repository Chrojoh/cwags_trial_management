// Database TypeScript Types
// Step 7: Exact types matching your Supabase database schema

// =============================================================================
// DATABASE RECORD TYPES
// =============================================================================

export interface CwagsRegistryRecord {
  id: string; // UUID
  cwags_number: string; // varchar
  dog_call_name: string; // varchar
  handler_name: string; // varchar
  created_at: string; // timestamptz
  is_active: boolean; // bool
}

export interface JudgeRecord {
  id: string; // UUID
  name: string; // varchar
  email: string; // varchar
  phone: string; // text (changed from varchar due to long phone numbers)
  is_active: boolean; // bool
  created_at: string; // timestamptz
  city: string; // varchar
  province_state: string; // varchar
  country: string; // varchar
  level: string; // text
}

export interface UserRecord {
  id: string; // UUID
  email: string; // character varying
  username: string; // character varying
  first_name: string; // character varying
  last_name: string; // character varying
  role: string; // character varying
  club_name: string; // character varying
  phone: string; // character varying
  is_active: boolean; // boolean
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
  password_hash: string; // character varying
}

// =============================================================================
// INSERT/UPDATE TYPES (without auto-generated fields)
// =============================================================================

export interface CwagsRegistryInsert {
  cwags_number: string;
  dog_call_name: string;
  handler_name: string;
  is_active?: boolean;
}

export interface CwagsRegistryUpdate {
  cwags_number?: string;
  dog_call_name?: string;
  handler_name?: string;
  is_active?: boolean;
}

export interface JudgeInsert {
  name: string;
  email: string;
  phone?: string;
  is_active?: boolean;
  city?: string;
  province_state?: string;
  country?: string;
  level?: string;
}

export interface JudgeUpdate {
  name?: string;
  email?: string;
  phone?: string;
  is_active?: boolean;
  city?: string;
  province_state?: string;
  country?: string;
  level?: string;
}

export interface UserInsert {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  club_name?: string;
  phone?: string;
  is_active?: boolean;
  password_hash: string;
}

export interface UserUpdate {
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  club_name?: string;
  phone?: string;
  is_active?: boolean;
  password_hash?: string;
}

// =============================================================================
// SEARCH/FILTER TYPES
// =============================================================================

export interface CwagsRegistryFilters {
  query?: string; // Search across cwags_number, dog_call_name, handler_name
  is_active?: boolean;
  handler_name?: string;
  cwags_number?: string;
}

export interface JudgeFilters {
  query?: string; // Search across name, email, city, level
  is_active?: boolean;
  city?: string;
  province_state?: string;
  country?: string;
  level?: string;
}

export interface UserFilters {
  query?: string; // Search across username, first_name, last_name, email
  role?: string;
  is_active?: boolean;
  club_name?: string;
}

// =============================================================================
// PAGINATION & SORTING TYPES
// =============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface SortParams {
  column: string;
  direction: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// =============================================================================
// SPECIALIZED QUERY TYPES
// =============================================================================

export interface DogLookupResult {
  id: string;
  cwags_number: string;
  dog_call_name: string;
  handler_name: string;
  display_text: string; // For autocomplete: "BJ (07-0001-01) - Shirley Ottmer"
}

export interface JudgeLookupResult {
  id: string;
  name: string;
  email: string;
  city: string;
  province_state: string;
  country: string;
  level: string;
  display_text: string; // For autocomplete: "Aaryn Secker - Penticton, BC"
}

// =============================================================================
// DATABASE OPERATION RESULTS
// =============================================================================

export interface DatabaseResult<T> {
  data: T | null;
  error: DatabaseError | null;
  count?: number;
}

export interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

// =============================================================================
// BULK OPERATION TYPES
// =============================================================================

export interface BulkInsertResult {
  inserted: number;
  errors: Array<{
    row: number;
    error: string;
    data?: any;
  }>;
  total: number;
}

export interface BulkUpdateResult {
  updated: number;
  errors: Array<{
    id: string;
    error: string;
    data?: any;
  }>;
  total: number;
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// =============================================================================
// CONSTANTS FOR DATABASE OPERATIONS
// =============================================================================

export const DB_TABLES = {
  CWAGS_REGISTRY: 'cwags_registry',
  JUDGES: 'judges', 
  USERS: 'users'
} as const;

export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 25,
  MAX_LIMIT: 100
} as const;

export const SORT_DIRECTIONS = {
  ASC: 'asc',
  DESC: 'desc'
} as const;

// =============================================================================
// QUERY BUILDERS (Type-safe helpers)
// =============================================================================

export interface QueryBuilder<T> {
  select: (columns?: string[]) => QueryBuilder<T>;
  where: (condition: Partial<T>) => QueryBuilder<T>;
  orderBy: (column: keyof T, direction?: 'asc' | 'desc') => QueryBuilder<T>;
  limit: (count: number) => QueryBuilder<T>;
  offset: (count: number) => QueryBuilder<T>;
}

// =============================================================================
// SUPABASE-SPECIFIC TYPES
// =============================================================================

export interface SupabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    details: string;
    hint: string;
    code: string;
  } | null;
  count?: number | null;
  status: number;
  statusText: string;
}

// =============================================================================
// EXPORT ALL TYPES
// =============================================================================

export type DatabaseRecord = CwagsRegistryRecord | JudgeRecord | UserRecord;
export type DatabaseInsert = CwagsRegistryInsert | JudgeInsert | UserInsert;
export type DatabaseUpdate = CwagsRegistryUpdate | JudgeUpdate | UserUpdate;