// src/types/forms.ts - CLEAN VERSION
// Form types without conflicts

// =============================================================================
// BASIC FORM STATE TYPES
// =============================================================================

export interface FormState<T = Record<string, unknown>> {
  data: T;
  errors: Record<string, string>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'time' | 'select' | 'textarea';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

// =============================================================================
// TRIAL FORM TYPES
// =============================================================================

export interface TrialCreateForm {
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

export interface TrialClassForm {
  class_name: string;
  day_number: number;
  round_number: number;
  judge_id: string;
  max_entries: number;
  entry_fee: number;
  estimated_start_time?: string;
  estimated_duration_minutes: number;
}

// =============================================================================
// ENTRY FORM TYPES
// =============================================================================

export interface PublicEntryForm {
  cwags_number: string;
  dog_call_name: string;
  handler_name: string;
  class_selections: Array<{
    trial_class_id: string;
    class_name: string;
    entry_fee: number;
    day_number: number;
  }>;
  contact_email: string;
  contact_phone?: string;
  special_requests?: string;
  waiver_accepted: boolean;
  rules_accepted: boolean;
}

// =============================================================================
// SCORING FORM TYPES
// =============================================================================

export interface ScentScoreForm {
  entry_id: string;
  hide_count_found: number;
  hide_count_total: number;
  search_time_seconds: number;
  result: string;
  notes?: string;
}

export interface NumericalScoreForm {
  entry_id: string;
  numerical_score: number;
  max_possible_score: number;
  notes?: string;
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export interface FormValidationResult<T = any> {
  isValid: boolean;
  errors: Partial<Record<keyof T, string>>;
  warnings?: Partial<Record<keyof T, string>>;
}