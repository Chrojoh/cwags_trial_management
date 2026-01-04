// src/types/database.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          first_name: string
          last_name: string
          role: 'trial_secretary' | 'administrator'
          club_name: string | null
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          username: string
          first_name: string
          last_name: string
          role: 'trial_secretary' | 'administrator'
          club_name?: string | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          first_name?: string
          last_name?: string
          role?: 'trial_secretary' | 'administrator'
          club_name?: string | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      trials: {
        Row: {
          id: string
          trial_name: string
          club_name: string
          location: string
          start_date: string
          end_date: string
          created_by: string
          trial_status: 'draft' | 'published' | 'active' | 'closed' | 'completed'
          premium_published: boolean
          entries_open: boolean
          entries_close_date: string | null
          max_entries_per_day: number
          trial_secretary: string
          secretary_email: string
          secretary_phone: string | null
          waiver_text: string | null
          fee_configuration: Json
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trial_name: string
          club_name: string
          location: string
          start_date: string
          end_date: string
          created_by: string
          trial_status?: 'draft' | 'published' | 'active' | 'closed' | 'completed'
          premium_published?: boolean
          entries_open?: boolean
          entries_close_date?: string | null
          max_entries_per_day?: number
          trial_secretary: string
          secretary_email: string
          secretary_phone?: string | null
          waiver_text?: string | null
          fee_configuration?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trial_name?: string
          club_name?: string
          location?: string
          start_date?: string
          end_date?: string
          created_by?: string
          trial_status?: 'draft' | 'published' | 'active' | 'closed' | 'completed'
          premium_published?: boolean
          entries_open?: boolean
          entries_close_date?: string | null
          max_entries_per_day?: number
          trial_secretary?: string
          secretary_email?: string
          secretary_phone?: string | null
          waiver_text?: string | null
          fee_configuration?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      trial_days: {
        Row: {
          id: string
          trial_id: string
          day_number: number
          trial_date: string
          day_status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          trial_id: string
          day_number: number
          trial_date: string
          day_status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          trial_id?: string
          day_number?: number
          trial_date?: string
          day_status?: string
          notes?: string | null
          created_at?: string
        }
      }
      trial_classes: {
        Row: {
          id: string
          trial_day_id: string
          class_name: string
          class_type: 'scent' | 'rally' | 'games' | 'obedience' | 'zoom'
          subclass: string | null
          class_level: string | null
          entry_fee: number
          max_entries: number
          class_order: number
          class_status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          trial_day_id: string
          class_name: string
          class_type: 'scent' | 'rally' | 'games' | 'obedience' | 'zoom'
          subclass?: string | null
          class_level?: string | null
          entry_fee?: number
          max_entries?: number
          class_order: number
          class_status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          trial_day_id?: string
          class_name?: string
          class_type?: 'scent' | 'rally' | 'games' | 'obedience' | 'zoom'
          subclass?: string | null
          class_level?: string | null
          entry_fee?: number
          max_entries?: number
          class_order?: number
          class_status?: string
          notes?: string | null
          created_at?: string
        }
      }
      trial_rounds: {
        Row: {
          id: string
          trial_class_id: string
          round_number: number
          judge_name: string
          judge_email: string | null
          feo_available: boolean
          round_status: string
          start_time: string | null
          estimated_duration: string | null
          max_entries: number | null
          has_reset: boolean
          reset_judge_name: string | null
          reset_judge_email: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          trial_class_id: string
          round_number: number
          judge_name: string
          judge_email?: string | null
          feo_available?: boolean
          round_status?: string
          start_time?: string | null
          estimated_duration?: string | null
          max_entries?: number | null
          has_reset?: boolean
          reset_judge_name?: string | null
          reset_judge_email?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          trial_class_id?: string
          round_number?: number
          judge_name?: string
          judge_email?: string | null
          feo_available?: boolean
          round_status?: string
          start_time?: string | null
          estimated_duration?: string | null
          max_entries?: number | null
          has_reset?: boolean
          reset_judge_name?: string | null
          reset_judge_email?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      entries: {
        Row: {
          id: string
          trial_id: string
          handler_name: string
          dog_call_name: string
          cwags_number: string | null
          dog_breed: string | null
          dog_sex: string | null
          handler_email: string
          handler_phone: string | null
          is_junior_handler: boolean
          waiver_accepted: boolean
          total_fee: number
          payment_status: string
          submitted_at: string
          entry_status: 'confirmed' | 'withdrawn' | 'no_show'
          audit_trail: string | null
          created_at: string
        }
        Insert: {
          id?: string
          trial_id: string
          handler_name: string
          dog_call_name: string
          cwags_number?: string | null
          dog_breed?: string | null
          dog_sex?: string | null
          handler_email: string
          handler_phone?: string | null
          is_junior_handler?: boolean
          waiver_accepted: boolean
          total_fee: number
          payment_status?: string
          submitted_at?: string
          entry_status?: 'confirmed' | 'withdrawn' | 'no_show'
          audit_trail?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          trial_id?: string
          handler_name?: string
          dog_call_name?: string
          cwags_number?: string | null
          dog_breed?: string | null
          dog_sex?: string | null
          handler_email?: string
          handler_phone?: string | null
          is_junior_handler?: boolean
          waiver_accepted?: boolean
          total_fee?: number
          payment_status?: string
          submitted_at?: string
          entry_status?: 'confirmed' | 'withdrawn' | 'no_show'
          audit_trail?: string | null
          created_at?: string
        }
      }
     entry_selections: {
  Row: {
    id: string
    entry_id: string
    trial_round_id: string
    entry_type: 'regular' | 'feo'
    fee: number
    running_position: number | null
    entry_status: 'confirmed' | 'withdrawn' | 'no_show'
    division: string | null
    games_subclass: string | null
    substitute_dog_name: string | null
    substitute_handler_name: string | null
    substitute_cwags_number: string | null
    jump_height: string | null
    created_at: string
  }
  Insert: {
    id?: string
    entry_id: string
    trial_round_id: string
    entry_type?: 'regular' | 'feo'
    fee: number
    running_position?: number | null
    entry_status?: 'confirmed' | 'withdrawn' | 'no_show'
    division?: string | null
    games_subclass?: string | null
    substitute_dog_name?: string | null
    substitute_handler_name?: string | null
    substitute_cwags_number?: string | null
    jump_height?: string | null
    created_at?: string
  }
  Update: {
    id?: string
    entry_id?: string
    trial_round_id?: string
    entry_type?: 'regular' | 'feo'
    fee?: number
    running_position?: number | null
    entry_status?: 'confirmed' | 'withdrawn' | 'no_show'
    division?: string | null
    games_subclass?: string | null
    substitute_dog_name?: string | null
    substitute_handler_name?: string | null
    substitute_cwags_number?: string | null
    jump_height?: string | null
    created_at?: string
  }
}
      scores: {
        Row: {
          id: string
          entry_selection_id: string
          trial_round_id: string
          is_reset_round: boolean
          scent1: string | null
          scent2: string | null
          scent3: string | null
          scent4: string | null
          fault1: string | null
          fault2: string | null
          time_seconds: number | null
          numerical_score: number | null
          pass_fail: 'Pass' | 'Fail' | 'ABS' | 'WD'
          entry_status: 'present' | 'ABS' | 'WD'
          judge_notes: string | null
          scored_at: string
          scored_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          entry_selection_id: string
          trial_round_id: string
          is_reset_round?: boolean
          scent1?: string | null
          scent2?: string | null
          scent3?: string | null
          scent4?: string | null
          fault1?: string | null
          fault2?: string | null
          time_seconds?: number | null
          numerical_score?: number | null
          pass_fail: 'Pass' | 'Fail' | 'ABS' | 'WD'
          entry_status?: 'present' | 'ABS' | 'WD'
          judge_notes?: string | null
          scored_at?: string
          scored_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          entry_selection_id?: string
          trial_round_id?: string
          is_reset_round?: boolean
          scent1?: string | null
          scent2?: string | null
          scent3?: string | null
          scent4?: string | null
          fault1?: string | null
          fault2?: string | null
          time_seconds?: number | null
          numerical_score?: number | null
          pass_fail?: 'Pass' | 'Fail' | 'ABS' | 'WD'
          entry_status?: 'present' | 'ABS' | 'WD'
          judge_notes?: string | null
          scored_at?: string
          scored_by?: string | null
          created_at?: string
        }
      }
      judges: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          city: string | null
          province_state: string | null
          country: string | null
          level: string | null
          certified_classes: string[] | null
          advanced_classes: string[] | null
          pay_level: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          city?: string | null
          province_state?: string | null
          country?: string | null
          level?: string | null
          certified_classes?: string[] | null
          advanced_classes?: string[] | null
          pay_level?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          city?: string | null
          province_state?: string | null
          country?: string | null
          level?: string | null
          certified_classes?: string[] | null
          advanced_classes?: string[] | null
          pay_level?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      cwags_registry: {
        Row: {
          id: string
          cwags_number: string
          dog_call_name: string
          handler_name: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          cwags_number: string
          dog_call_name: string
          handler_name: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          cwags_number?: string
          dog_call_name?: string
          handler_name?: string
          is_active?: boolean
          created_at?: string
        }
      }
      system_config: {
        Row: {
          id: string
          config_key: string
          config_value: Json
          description: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          config_key: string
          config_value: Json
          description?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          config_key?: string
          config_value?: Json
          description?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}