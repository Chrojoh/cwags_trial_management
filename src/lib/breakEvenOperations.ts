// src/lib/breakEvenOperations.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

export interface BreakEvenConfig {
  id?: string;
  trial_id: string;
  hall_rental: number;
  ribbons: number;
  insurance: number;
  other_fixed_costs: number;
  regular_entry_fee: number;
  regular_cwags_fee: number;
  regular_judge_fee: number;
  feo_entry_fee: number;
  feo_judge_fee: number;
  waived_entry_fee: number;
  waived_cwags_fee: number;
  waived_judge_fee: number;
  waived_feo_entry_fee: number;
  waived_feo_judge_fee: number;
  judge_volunteer_rate: number;
  feo_volunteer_rate: number;
  created_at?: string;
  updated_at?: string;
}

interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export const breakEvenOperations = {
  // Get break-even config for a trial
  async getConfig(trialId: string): Promise<OperationResult<BreakEvenConfig | null>> {
    try {
      const { data, error } = await supabase
        .from('trial_break_even_config')
        .select('*')
        .eq('trial_id', trialId)
        .maybeSingle();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error loading break-even config:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  // Save or update break-even config
  async saveConfig(config: BreakEvenConfig): Promise<OperationResult<BreakEvenConfig>> {
    try {
      // First check if config exists
      const { data: existing } = await supabase
        .from('trial_break_even_config')
        .select('id')
        .eq('trial_id', config.trial_id)
        .maybeSingle();

      if (existing) {
        // Update existing
       const { data, error } = await supabase
          .from('trial_break_even_config')
          .update({
            hall_rental: config.hall_rental,
            ribbons: config.ribbons,
            insurance: config.insurance,
            other_fixed_costs: config.other_fixed_costs,
            regular_entry_fee: config.regular_entry_fee,
            regular_cwags_fee: config.regular_cwags_fee,
            regular_judge_fee: config.regular_judge_fee,
            feo_entry_fee: config.feo_entry_fee,
            feo_judge_fee: config.feo_judge_fee,
            waived_entry_fee: config.waived_entry_fee,
            waived_cwags_fee: config.waived_cwags_fee,
            waived_judge_fee: config.waived_judge_fee,
            waived_feo_entry_fee: config.waived_feo_entry_fee,
            waived_feo_judge_fee: config.waived_feo_judge_fee,
            judge_volunteer_rate: config.judge_volunteer_rate,
            feo_volunteer_rate: config.feo_volunteer_rate,
            updated_at: new Date().toISOString()
          })
          .eq('trial_id', config.trial_id)
          .select()
          .single();

        if (error) throw error;
        return { success: true, data };
      } else {
        // Insert new
       const { data, error } = await supabase
          .from('trial_break_even_config')
          .insert([{
            trial_id: config.trial_id,
            hall_rental: config.hall_rental,
            ribbons: config.ribbons,
            insurance: config.insurance,
            other_fixed_costs: config.other_fixed_costs,
            regular_entry_fee: config.regular_entry_fee,
            regular_cwags_fee: config.regular_cwags_fee,
            regular_judge_fee: config.regular_judge_fee,
            feo_entry_fee: config.feo_entry_fee,
            feo_judge_fee: config.feo_judge_fee,
            waived_entry_fee: config.waived_entry_fee,
            waived_cwags_fee: config.waived_cwags_fee,
            waived_judge_fee: config.waived_judge_fee,
            waived_feo_entry_fee: config.waived_feo_entry_fee,
            waived_feo_judge_fee: config.waived_feo_judge_fee,
            judge_volunteer_rate: config.judge_volunteer_rate,
            feo_volunteer_rate: config.feo_volunteer_rate
          }])
          .select()
          .single();

        if (error) throw error;
        return { success: true, data };
      }
    } catch (error) {
      console.error('Error saving break-even config:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  // Delete break-even config
  async deleteConfig(trialId: string): Promise<OperationResult> {
    try {
      const { error } = await supabase
        .from('trial_break_even_config')
        .delete()
        .eq('trial_id', trialId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting break-even config:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
};