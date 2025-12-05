// src/types/api.ts - CLEAN VERSION
// Basic API types without conflicts

// =============================================================================
// BASIC API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =============================================================================
// REQUEST/RESPONSE TYPES FOR BASIC OPERATIONS
// =============================================================================

export interface LoginApiRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginApiResponse {
  user: {
    id: string;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    club_name?: string;
  };
  token?: string;
  expiresAt?: string;
}

export interface CreateTrialApiRequest {
  trial_name: string;
  trial_date: string;
  trial_time: string;
  trial_timezone: string;
  trial_type: string;
  venue_name: string;
  venue_address: string;
  city: string;
  province_state: string;
  postal_code: string;
  country: string;
  max_entries: number;
  entry_fee: number;
  late_fee: number;
  waiver_text?: string;
  special_instructions?: string;
}

export interface CreateEntryApiRequest {
  trial_id: string;
  trial_class_id: string;
  cwags_number: string;
  dog_call_name: string;
  handler_name: string;
  contact_email: string;
  contact_phone?: string;
  special_requests?: string;
}

// =============================================================================
// BASIC SERVICE INTERFACES
// =============================================================================

export interface BaseApiService {
  get<T>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>>;
  post<T>(url: string, data?: any): Promise<ApiResponse<T>>;
  put<T>(url: string, data?: any): Promise<ApiResponse<T>>;
  delete<T>(url: string): Promise<ApiResponse<T>>;
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: string;
  field?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}