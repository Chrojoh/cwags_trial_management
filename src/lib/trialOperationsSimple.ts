// src/lib/trial-operations-simple.ts
import { supabase } from './supabase';

// Proper TypeScript interfaces from original
export interface TrialData {
  id?: string;
  trial_name: string;
  club_name: string;
  location: string;
  start_date: string;
  end_date: string;
  created_by: string;
  trial_status: string;
  premium_published: boolean;
  entries_open: boolean;
  entries_close_date: string | null;
  max_entries_per_day: number;
  trial_secretary: string;
  secretary_email: string;
  secretary_phone: string | null;
  waiver_text: string;
  fee_configuration: any | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TrialDay {
  id?: string;
  trial_id: string;
  day_number: number;
  trial_date: string;
  day_status: string;
  notes: string | null;
  created_at?: string;
}

export interface TrialClass {
  id?: string;
  trial_day_id: string;
  class_name: string;
  class_type: string;
  subclass?: string;
  class_level: string;
  entry_fee: number;
  max_entries: number;
  games_subclass?: string | null;
  class_order: number;
  class_status: string;
  notes?: string;
}

export interface TrialRound {
  id?: string;
  trial_class_id: string;
  round_number: number;
  judge_name: string;
  judge_email: string;
  feo_available: boolean;
  round_status: string;
  start_time?: string;
  estimated_duration?: string;
  max_entries: number;
  has_reset: boolean;
  reset_judge_name?: string;
  reset_judge_email?: string;
  notes?: string;
}

// New Entry Interfaces
export interface EntryData {
  id?: string;
  trial_id: string;
  handler_name: string;
  dog_call_name: string;
  cwags_number: string;
  dog_breed: string;
  dog_sex: string;
  handler_email: string;
  handler_phone: string;
  is_junior_handler: boolean;
  waiver_accepted: boolean;
  total_fee: number;
  payment_status: string;
  submitted_at?: string;
  entry_status: string;
  audit_trail?: string;
  created_at?: string;
}

export interface EntrySelection {
  id?: string;
  entry_id: string;
  trial_round_id: string;
  entry_type: string;
  fee: number;
  running_position: number;
  entry_status: string;
  created_at?: string;
}

// C-WAGS Level Organization
export const CWAGS_LEVELS = {
  'Scent Work': [
    'Patrol', 'Detective', 'Investigator', 'Super Sleuth', 
    'Detective Diversions', 'Private Investigator',
    'Ranger 1', 'Ranger 2', 'Ranger 3', 'Ranger 4', 'Ranger 5',
    'Dasher 3', 'Dasher 4', 'Dasher 5', 'Dasher 6'
  ],
  'Rally': [
    'Starter', 'Advanced', 'Pro', 'ARF', 
    'Zoom 1', 'Zoom 1.5', 'Zoom 2'
  ],
  'Obedience': [
    'Obedience 1', 'Obedience 2', 'Obedience 3', 
    'Obedience 4', 'Obedience 5'
  ],
  'Games': [
    'Games 1', 'Games 2', 'Games 3', 'Games 4'
  ]
};

// Type definitions
interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
}

interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: DatabaseError | string;
}

export const simpleTrialOperations = {
  // Enhanced Trial Operations (merged from original)
  async createTrial(trialData: Omit<TrialData, 'id'>): Promise<OperationResult> {
    try {
      console.log('Creating trial with data:', trialData);
      
     // Handle the hardcoded user ID issue
let dataToInsert = { ...trialData };

// If we get the hardcoded ID '2', convert it to a real user
const createdById = String(dataToInsert.created_by);
if (createdById === '2') {
  console.log('Converting hardcoded user ID to database user...');
  
  
  // Get the secretary1 user from database
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('username', 'secretary1')
    .single();
  
  if (userError || !user) {
    console.error('Could not find secretary1 user:', userError);
    return { success: false, error: 'User not found in database' };
  }
  
  dataToInsert.created_by = user.id;
  console.log('Converted user ID from "2" to:', user.id);
}

      // Enhanced data preparation from original
      const insertData = {
        trial_name: dataToInsert.trial_name,
        club_name: dataToInsert.club_name,
        location: dataToInsert.location,
        start_date: dataToInsert.start_date,
        end_date: dataToInsert.end_date,
        created_by: dataToInsert.created_by,
        trial_status: dataToInsert.trial_status,
        premium_published: dataToInsert.premium_published || false,
        entries_open: dataToInsert.entries_open || false,
        entries_close_date: dataToInsert.entries_close_date,
        max_entries_per_day: dataToInsert.max_entries_per_day,
        trial_secretary: dataToInsert.trial_secretary,
        secretary_email: dataToInsert.secretary_email,
        secretary_phone: dataToInsert.secretary_phone,
        waiver_text: dataToInsert.waiver_text,
        fee_configuration: dataToInsert.fee_configuration,
        notes: dataToInsert.notes
      };

      console.log('Insert data:', insertData);

      const { data, error } = await supabase
        .from('trials')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return { success: false, error: error.message || error };
      }

      console.log('Trial created successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error creating trial:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async updateTrial(trialId: string, updates: Partial<TrialData>): Promise<OperationResult> {
    try {
      console.log('Updating trial:', trialId, updates);

      const { data, error } = await supabase
        .from('trials')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', trialId)
        .select()
        .single();

      if (error) {
        console.error('Error updating trial:', error);
        return { success: false, error: error.message || error };
      }

      console.log('Trial updated successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error updating trial:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

async getTrial(trialId: string): Promise<OperationResult> {
  try {
    console.log('Getting trial data for ID:', trialId);

    const { data, error } = await supabase
      .from('trials')
      .select('*')
      .eq('id', trialId)
      .single();

    if (error) {
      console.error('Error getting trial:', error);
      return { success: false, error: error.message || 'Database error occurred' };
    }

    if (!data) {
      console.error('Trial not found for ID:', trialId);
      return { success: false, error: 'Trial not found' };
    }

    console.log('Trial data retrieved:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Exception in getTrial:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
},

  // Added from original - needed for dashboard
  async getAllTrials(): Promise<OperationResult> {
    try {
      console.log('Getting all trials');

      const { data, error } = await supabase
        .from('trials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting trials:', error);
        return { success: false, error: error.message || error };
      }

      console.log(`Found ${data?.length || 0} trials`);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting trials:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Enhanced Trial Days Operations
  async saveTrialDays(trialId: string, days: Omit<TrialDay, 'id' | 'trial_id'>[]): Promise<OperationResult> {
    try {
      console.log('Saving trial days:', { trialId, days });

      // First delete existing days for this trial
      await supabase
        .from('trial_days')
        .delete()
        .eq('trial_id', trialId);

      // Enhanced mapping from original
      const trialDays = days.map((day, index) => ({
        trial_id: trialId,
        day_number: index + 1,
        trial_date: day.trial_date,
        day_status: day.day_status,
        notes: day.notes,
        created_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('trial_days')
        .insert(trialDays)
        .select();

      if (error) {
        console.error('Database error saving days:', error);
        return { success: false, error: error.message || error };
      }

      console.log('Trial days saved successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error saving trial days:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async getTrialDays(trialId: string): Promise<OperationResult> {
    try {
      console.log('Getting trial days for trial ID:', trialId);

      const { data, error } = await supabase
        .from('trial_days')
        .select('*')
        .eq('trial_id', trialId)
        .order('day_number');

      if (error) {
        console.error('Error getting trial days:', error);
        return { success: false, error: error.message || error };
      }

      console.log(`Found ${data?.length || 0} trial days`);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting trial days:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Enhanced Trial Classes Operations with Games subclass support
  async saveTrialClasses(trialDayId: string, classes: any[]): Promise<OperationResult> {
    try {
      console.log('Saving trial classes with Games subclass support:', { trialDayId, classes });

      // First delete existing classes for this trial day
      await supabase
        .from('trial_classes')
        .delete()
        .eq('trial_day_id', trialDayId);

      const classesToInsert = classes.map(cls => ({
        trial_day_id: trialDayId,
        class_name: cls.class_name,
        class_type: cls.class_type,
        subclass: cls.subclass,
        class_level: cls.class_level,
        entry_fee: cls.entry_fee || 0,
        max_entries: cls.max_entries || 50,
        feo_available: cls.feo_available || false,
        feo_price: cls.feo_price || 0,
        games_subclass: cls.games_subclass || null,
        class_order: cls.class_order,
        class_status: cls.class_status || 'draft'
      }));

      console.log('Classes to insert with Games subclass:', classesToInsert);

      const { data, error } = await supabase
        .from('trial_classes')
        .insert(classesToInsert)
        .select();

      if (error) {
        console.error('Database error saving classes:', error);
        return { success: false, error: error.message || error };
      }

      console.log('Trial classes saved successfully with Games subclass:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error saving trial classes:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async getTrialClasses(trialDayId: string): Promise<OperationResult> {
    try {
      console.log('Getting trial classes with Games subclass for day ID:', trialDayId);

      const { data, error } = await supabase
        .from('trial_classes')
        .select('*')
        .eq('trial_day_id', trialDayId)
        .order('class_order');

      if (error) {
        console.error('Error getting trial classes:', error);
        return { success: false, error: error.message || error };
      }

      console.log(`Found ${data?.length || 0} trial classes with Games subclass data`);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting trial classes:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Enhanced method from original
  async getAllTrialClasses(trialId: string): Promise<OperationResult> {
    try {
      console.log('Getting all trial classes with Games subclass for trial ID:', trialId);

      const { data, error } = await supabase
        .from('trial_classes')
        .select(`
          *,
          trial_days!inner (
            trial_id,
            trial_date,
            day_number
          )
        `)
        .eq('trial_days.trial_id', trialId);

      if (error) {
        console.error('Error getting trial classes:', error);
        return { success: false, error: error.message || error };
      }

      // Sort in JavaScript (from simple version fix)
      if (data) {
        data.sort((a: any, b: any) => {
          const dayA = a.trial_days?.day_number || 0;
          const dayB = b.trial_days?.day_number || 0;
          if (dayA !== dayB) return dayA - dayB;
          return (a.class_order || 0) - (b.class_order || 0);
        });
      }

      console.log(`Found ${data?.length || 0} total trial classes with Games subclass`);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting trial classes:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Enhanced Trial Rounds Operations with FK constraint handling
  async saveTrialRounds(trialClassId: string, rounds: any[]): Promise<OperationResult> {
    try {
      console.log('Saving trial rounds with FK constraint handling:', { trialClassId, rounds });

      // Get existing rounds and their entry references
      const { data: existingRounds, error: fetchError } = await supabase
        .from('trial_rounds')
        .select(`
          *,
          entry_selections(id)
        `)
        .eq('trial_class_id', trialClassId);

      if (fetchError) {
        console.error('Error fetching existing rounds:', fetchError);
        return { success: false, error: fetchError.message };
      }

      console.log(`Found ${existingRounds?.length || 0} existing rounds for class ${trialClassId}`);

      // If no rounds to save, handle cleanup
      if (!rounds || rounds.length === 0) {
        // Check if any existing rounds have entries
        const roundsWithEntries = existingRounds?.filter(r => r.entry_selections && r.entry_selections.length > 0);
        
        if (roundsWithEntries && roundsWithEntries.length > 0) {
          console.error('Cannot delete rounds with existing entries');
          return { 
            success: false, 
            error: `Cannot delete rounds that have entries. Found ${roundsWithEntries.length} rounds with entries.` 
          };
        }

        // Safe to delete all rounds
        const { error: deleteError } = await supabase
          .from('trial_rounds')
          .delete()
          .eq('trial_class_id', trialClassId);

        if (deleteError) {
          console.error('Error deleting rounds:', deleteError);
          return { success: false, error: deleteError.message };
        }

        console.log('All rounds deleted successfully');
        return { success: true, data: [] };
      }

      // Prepare new rounds data with validation
      const newRounds = rounds.map((round, index) => {
        if (!round.judge_name?.trim()) {
          throw new Error(`Round ${index + 1}: Judge name is required`);
        }

        return {
          round_number: round.round_number || (index + 1),
          judge_name: round.judge_name.trim(),
          judge_email: round.judge_email?.trim() || '',
          feo_available: round.feo_available || false,
          round_status: round.round_status || 'draft',
          start_time: round.start_time || null,
          estimated_duration: round.estimated_duration || null,
          max_entries: round.max_entries || 50,
          has_reset: round.has_reset || false,
          reset_judge_name: round.has_reset ? (round.reset_judge_name?.trim() || null) : null,
          reset_judge_email: round.has_reset ? (round.reset_judge_email?.trim() || null) : null,
          notes: round.notes?.trim() || null
        };
      });

      const results = [];

      // Process each new round
      for (const newRound of newRounds) {
        // Find existing round with same round number
        const existingRound = existingRounds?.find(r => r.round_number === newRound.round_number);
        
        if (existingRound) {
          // UPDATE existing round (preserves entries)
          console.log(`Updating existing round ${newRound.round_number} for class ${trialClassId}`);
          
          const { data: updatedRound, error: updateError } = await supabase
            .from('trial_rounds')
            .update({
              judge_name: newRound.judge_name,
              judge_email: newRound.judge_email,
              feo_available: newRound.feo_available,
              round_status: newRound.round_status,
              start_time: newRound.start_time,
              estimated_duration: newRound.estimated_duration,
              max_entries: newRound.max_entries,
              has_reset: newRound.has_reset,
              reset_judge_name: newRound.reset_judge_name,
              reset_judge_email: newRound.reset_judge_email,
              notes: newRound.notes
            })
            .eq('id', existingRound.id)
            .select()
            .single();

          if (updateError) {
            console.error(`Error updating round ${newRound.round_number}:`, updateError);
            return { success: false, error: updateError.message };
          }

          results.push(updatedRound);
          console.log(`Successfully updated round ${newRound.round_number} with judge ${newRound.judge_name}`);

        } else {
          // INSERT new round
          console.log(`Creating new round ${newRound.round_number} for class ${trialClassId}`);
          
          const { data: insertedRound, error: insertError } = await supabase
            .from('trial_rounds')
            .insert({
              trial_class_id: trialClassId,
              ...newRound,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (insertError) {
            console.error(`Error inserting round ${newRound.round_number}:`, insertError);
            return { success: false, error: insertError.message };
          }

          results.push(insertedRound);
          console.log(`Successfully created round ${newRound.round_number} with judge ${newRound.judge_name}`);
        }
      }

      // Handle extra existing rounds (if fewer rounds provided than existed)
      const newRoundNumbers = newRounds.map(r => r.round_number);
      const roundsToDelete = existingRounds?.filter(r => !newRoundNumbers.includes(r.round_number));

      if (roundsToDelete && roundsToDelete.length > 0) {
        // Check if any rounds to delete have entries
        const roundsWithEntries = roundsToDelete.filter(r => r.entry_selections && r.entry_selections.length > 0);
        
        if (roundsWithEntries.length > 0) {
          console.error('Cannot delete rounds with existing entries');
          const roundNumbers = roundsWithEntries.map(r => r.round_number).join(', ');
          return { 
            success: false, 
            error: `Cannot delete rounds ${roundNumbers} because they have entries. Please move or delete the entries first.` 
          };
        }

        // Safe to delete rounds without entries
        const idsToDelete = roundsToDelete.map(r => r.id);
        const { error: deleteError } = await supabase
          .from('trial_rounds')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) {
          console.error('Error deleting extra rounds:', deleteError);
          return { success: false, error: deleteError.message };
        }

        console.log(`Successfully deleted ${roundsToDelete.length} unused rounds`);
      }

      console.log(`Successfully processed ${results.length} rounds for class ${trialClassId}`);
      return { success: true, data: results };

    } catch (error) {
      console.error('Error in saveTrialRounds:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

 // FIXED getTrialRounds function - matches getAllTrialRounds structure
async getTrialRounds(trialClassId: string): Promise<OperationResult> {
  try {
    console.log('Getting trial rounds for class ID:', trialClassId);

    const { data, error } = await supabase
      .from('trial_rounds')
      .select(`
        *,
        trial_classes!inner(
          class_name,
          games_subclass,
          trial_day_id,
          class_level,
          class_type,
          entry_fee,
          feo_available,
          feo_price,
          trial_days!inner(
            trial_id,
            trial_date,
            day_number
          )
        )
      `)
      .eq('trial_class_id', trialClassId)
      .order('round_number');

    if (error) {
      console.error('Error getting trial rounds:', error);
      return { success: false, error: error.message || error };
    }

    console.log(`Found ${data?.length || 0} trial rounds with pricing data`);
    
    // Debug: Log the pricing data for each round
    data?.forEach(round => {
      console.log(`Round ${round.round_number} pricing:`, {
        entry_fee: round.trial_classes?.entry_fee,
        feo_price: round.trial_classes?.feo_price,
        feo_available: round.trial_classes?.feo_available,
        round_feo_available: round.feo_available
      });
    });
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting trial rounds:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
},

  // Enhanced method from original
  async getAllTrialRounds(trialId: string): Promise<OperationResult> {
    try {
      console.log('Getting all trial rounds for trial ID:', trialId);

      const { data, error } = await supabase
        .from('trial_rounds')
        .select(`
  *,
  trial_classes!inner(
    class_name,
    games_subclass,
    trial_day_id,
    class_level,
    class_type,
    entry_fee,
    feo_available,
    feo_price,
    trial_days!inner(
      trial_id,
      trial_date,
      day_number
    )
  )
`)
        .eq('trial_classes.trial_days.trial_id', trialId);

      if (error) {
        console.error('Error getting trial rounds:', error);
        return { success: false, error: error.message || error };
      }

      // Sort in JavaScript (from simple version fix)
      if (data) {
        data.sort((a: any, b: any) => {
          const dayA = a.trial_classes?.trial_days?.day_number || 0;
          const dayB = b.trial_classes?.trial_days?.day_number || 0;
          if (dayA !== dayB) return dayA - dayB;
          return (a.round_number || 0) - (b.round_number || 0);
        });
      }

      console.log(`Found ${data?.length || 0} total trial rounds`);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting trial rounds:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // NEW ENTRY OPERATIONS
  
  // Create new entry
  async createEntry(entryData: Omit<EntryData, 'id'>): Promise<OperationResult> {
    try {
      console.log('Creating entry with data:', entryData);

      const insertData = {
        trial_id: entryData.trial_id,
        handler_name: entryData.handler_name,
        dog_call_name: entryData.dog_call_name,
        cwags_number: entryData.cwags_number,
        dog_breed: entryData.dog_breed,
        dog_sex: entryData.dog_sex,
        handler_email: entryData.handler_email,
        handler_phone: entryData.handler_phone,
        is_junior_handler: entryData.is_junior_handler,
        waiver_accepted: entryData.waiver_accepted,
        total_fee: entryData.total_fee,
        payment_status: entryData.payment_status || 'pending',
        entry_status: entryData.entry_status || 'submitted',
        submitted_at: new Date().toISOString(),
        audit_trail: entryData.audit_trail || 'Entry created',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('entries')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Database error creating entry:', error);
        return { success: false, error: error.message || error };
      }

      console.log('Entry created successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error creating entry:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Get all entries for a trial
  async getTrialEntries(trialId: string): Promise<OperationResult> {
    try {
      console.log('Getting entries for trial ID:', trialId);

      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('trial_id', trialId)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error getting trial entries:', error);
        return { success: false, error: error.message || error };
      }

      console.log(`Found ${data?.length || 0} entries for trial`);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting trial entries:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Get single entry
  async getEntry(entryId: string): Promise<OperationResult> {
    try {
      console.log('Getting entry for ID:', entryId);

      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('id', entryId)
        .single();

      if (error) {
        console.error('Error getting entry:', error);
        return { success: false, error: error.message || error };
      }

      if (!data) {
        return { success: false, error: 'Entry not found' };
      }

      console.log('Entry retrieved:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error getting entry:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Update entry
  async updateEntry(entryId: string, updates: Partial<EntryData>): Promise<OperationResult> {
    try {
      console.log('Updating entry:', entryId, updates);

      // Add audit trail entry
      const auditEntry = `Updated ${Object.keys(updates).join(', ')} at ${new Date().toISOString()}`;
      
      const { data, error } = await supabase
        .from('entries')
        .update({
          ...updates,
          audit_trail: auditEntry
        })
        .eq('id', entryId)
        .select()
        .single();

      if (error) {
        console.error('Error updating entry:', error);
        return { success: false, error: error.message || error };
      }

      console.log('Entry updated successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error updating entry:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Delete entry
  async deleteEntry(entryId: string): Promise<OperationResult> {
    try {
      console.log('Deleting entry:', entryId);

      // First delete related entry selections
      await supabase
        .from('entry_selections')
        .delete()
        .eq('entry_id', entryId);

      // Then delete the entry
      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', entryId);

      if (error) {
        console.error('Error deleting entry:', error);
        return { success: false, error: error.message || error };
      }

      console.log('Entry deleted successfully');
      return { success: true, data: null };
    } catch (error) {
      console.error('Error deleting entry:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Get entry by C-WAGS number and trial (for edit mode detection)
  async getEntryByCwagsNumber(trialId: string, cwagsNumber: string): Promise<OperationResult> {
    try {
      console.log('Getting entry by C-WAGS number:', { trialId, cwagsNumber });

      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('trial_id', trialId)
        .eq('cwags_number', cwagsNumber)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error getting entry by C-WAGS number:', error);
        return { success: false, error: error.message || error };
      }

      console.log('Entry lookup result:', data);
      return { success: true, data: data || null };
    } catch (error) {
      console.error('Error getting entry by C-WAGS number:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // ENTRY SELECTIONS OPERATIONS

  // Create entry selections (class/round registrations)
  async createEntrySelections(entryId: string, selections: Omit<EntrySelection, 'id' | 'entry_id'>[]): Promise<OperationResult> {
  try {
    console.log('=== CREATEENTRYSELECTIONS FUNCTION CALLED ===');
    console.log('Creating entry selections for entry:', entryId);
    console.log('Raw selections received:', selections);
    if (selections[0]) {
      console.log('First selection structure:', JSON.stringify(selections[0], null, 2));
    }

    // First delete existing selections for this entry
    await supabase
      .from('entry_selections')
      .delete()
      .eq('entry_id', entryId);

    const selectionsToInsert = selections.map((selection, index) => ({
      entry_id: entryId,
      trial_round_id: selection.trial_round_id,
      entry_type: selection.entry_type,
      fee: selection.fee,
      running_position: selection.running_position || index + 1,
      entry_status: selection.entry_status || 'entered',
      created_at: new Date().toISOString()
    }));

    console.log('Data being inserted to entry_selections:', selectionsToInsert);

    const { data, error } = await supabase
      .from('entry_selections')
      .insert(selectionsToInsert)
      .select();

    console.log('Supabase response - data:', data);
    console.log('Supabase response - error:', error);

    if (error) {
      console.error('Database error creating entry selections:', error);
      return { success: false, error: error.message || error };
    }

    console.log('Entry selections created successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error creating entry selections:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
},

  // Get entry selections for an entry
async getEntrySelections(entryId: string): Promise<OperationResult> {
  try {
    console.log('Getting entry selections for entry ID:', entryId);

    // Simplified query first to test
    const { data, error } = await supabase
      .from('entry_selections')
      .select('*, trial_round_id')
      .eq('entry_id', entryId);

    if (error) {
      console.error('Error getting entry selections:', error);
      return { success: false, error: error.message || error };
    }

    console.log(`Found ${data?.length || 0} entry selections`);
    console.log('Raw entry selections data:', data);
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting entry selections:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
},

  // Get all entries with their selections for a trial (for running order management)
// Replace this function in your trial-operations-simple.ts file

async getTrialEntriesWithSelections(trialId: string): Promise<OperationResult> {
  try {
    console.log('Getting trial entries with selections for trial ID:', trialId);

    // First, let's get all entries for the trial
    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select('*')
      .eq('trial_id', trialId)
      .order('submitted_at', { ascending: false });

    if (entriesError) {
      console.error('Error getting entries:', entriesError);
      return { success: false, error: entriesError.message };
    }

    if (!entries || entries.length === 0) {
      console.log('No entries found for trial');
      return { success: true, data: [] };
    }

    // Then get entry selections with related data for each entry
    const entriesWithSelections = await Promise.all(
      entries.map(async (entry) => {
        const { data: selections, error: selectionsError } = await supabase
          .from('entry_selections')
          .select(`
            *,
            trial_rounds!inner(
              id,
              trial_class_id,
              judge_name,
              round_number
            )
          `)
          .eq('entry_id', entry.id);

        if (selectionsError) {
          console.error('Error getting selections for entry:', entry.id, selectionsError);
          return { ...entry, entry_selections: [] };
        }

        // Get class information for each selection including Games subclass
        const selectionsWithClasses = await Promise.all(
          (selections || []).map(async (selection) => {
            const { data: classData, error: classError } = await supabase
              .from('trial_classes')
              .select(`
                id,
                class_name,
                class_level,
                class_type,
                games_subclass,
                trial_days!inner(
                  trial_id,
                  day_number,
                  trial_date
                )
              `)
              .eq('id', selection.trial_rounds.trial_class_id)
              .single();

            if (classError) {
              console.error('Error getting class data:', classError);
              return selection;
            }

            return {
              ...selection,
              trial_rounds: {
                ...selection.trial_rounds,
                trial_classes: classData
              }
            };
          })
        );

        return {
          ...entry,
          entry_selections: selectionsWithClasses
        };
      })
    );

    console.log(`Found ${entries.length} entries with selections`);
    console.log('Sample entry with selections:', entriesWithSelections[0]);
    
    return { success: true, data: entriesWithSelections };
  } catch (error) {
    console.error('Error getting trial entries with selections:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
},

  // Update running positions for entry selections
  async updateRunningPositions(updates: { id: string; running_position: number }[]): Promise<OperationResult> {
    try {
      console.log('Updating running positions:', updates);

      const updatePromises = updates.map((update: { id: string; running_position: number }) => 
        supabase
          .from('entry_selections')
          .update({ running_position: update.running_position })
          .eq('id', update.id)
      );

      const results = await Promise.all(updatePromises);
      
      const errors = results.filter((result: any) => result.error);
      if (errors.length > 0) {
        console.error('Error updating running positions:', errors);
        return { success: false, error: 'Failed to update some running positions' };
      }

      console.log('Running positions updated successfully');
      return { success: true, data: null };
    } catch (error) {
      console.error('Error updating running positions:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // NEW SCORE MANAGEMENT OPERATIONS FOR LIVE EVENT MANAGEMENT

  // Get class entries with scores for Live Event Management
  async getClassEntriesWithScores(classId: string): Promise<OperationResult> {
    try {
      console.log('Getting class entries with scores for class ID:', classId);

      const { data, error } = await supabase
        .from('entry_selections')
        .select(`
          *,
          entries!inner(
            handler_name,
            dog_call_name,
            cwags_number
          ),
          trial_rounds!inner(
            judge_name,
            trial_class_id,
            trial_classes!inner(
              class_name,
              class_type,
              games_subclass
            )
          ),
          scores(*)
        `)
        .eq('trial_rounds.trial_class_id', classId)
        .order('running_position');

      if (error) {
        console.error('Error getting class entries with scores:', error);
        return { success: false, error: error.message || error };
      }

      console.log(`Found ${data?.length || 0} entries for class`);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting class entries with scores:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Update entry selection (entry type, status, etc.)
  async updateEntrySelection(entrySelectionId: string, updates: {
  entry_type?: string;
  entry_status?: string;
  running_position?: number;
}): Promise<OperationResult> {
  try {
    console.log('Updating entry selection:', entrySelectionId, updates);

    const { data, error } = await supabase
      .from('entry_selections')
      .update(updates)
      .eq('id', entrySelectionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating entry selection:', error);
      return { success: false, error: error.message || error };
    }

    console.log('Entry selection updated successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error updating entry selection:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
},

  // Create or update score
  async upsertScore(scoreData: {
    entry_selection_id: string;
    trial_round_id: string;
    is_reset_round?: boolean;
    scent1?: string | null;
    scent2?: string | null;
    scent3?: string | null;
    scent4?: string | null;
    fault1?: string | null;
    fault2?: string | null;
    time_seconds?: number | null;
    numerical_score?: number | null;
    pass_fail?: string | null;
    entry_status?: string | null;
    judge_notes?: string | null;
    scored_by?: string | null;
  }): Promise<OperationResult> {
    try {
      console.log('Upserting score:', scoreData);

      // Check if score already exists
      const { data: existingScore, error: checkError } = await supabase
        .from('scores')
        .select('id')
        .eq('entry_selection_id', scoreData.entry_selection_id)
        .eq('trial_round_id', scoreData.trial_round_id)
        .eq('is_reset_round', scoreData.is_reset_round || false)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing score:', checkError);
        return { success: false, error: checkError.message };
      }

      const scoreRecord = {
        entry_selection_id: scoreData.entry_selection_id,
        trial_round_id: scoreData.trial_round_id,
        is_reset_round: scoreData.is_reset_round || false,
        scent1: scoreData.scent1 || null,
        scent2: scoreData.scent2 || null,
        scent3: scoreData.scent3 || null,
        scent4: scoreData.scent4 || null,
        fault1: scoreData.fault1 || null,
        fault2: scoreData.fault2 || null,
        time_seconds: scoreData.time_seconds || null,
        numerical_score: scoreData.numerical_score || null,
        pass_fail: scoreData.pass_fail || null,
        entry_status: scoreData.entry_status || 'present',
        judge_notes: scoreData.judge_notes || null,
        scored_by: scoreData.scored_by || null,
        scored_at: new Date().toISOString()
      };

      let result;
      if (existingScore) {
        // Update existing score
        result = await supabase
          .from('scores')
          .update(scoreRecord)
          .eq('id', existingScore.id)
          .select()
          .single();
      } else {
        // Create new score
        result = await supabase
          .from('scores')
          .insert({
            ...scoreRecord,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error upserting score:', result.error);
        return { success: false, error: result.error.message || result.error };
      }

      console.log('Score upserted successfully:', result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error upserting score:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Bulk update scores for a class
  async bulkUpdateScores(scores: Array<{
    entry_selection_id: string;
    trial_round_id: string;
    scoreData: any;
  }>): Promise<OperationResult> {
    try {
      console.log('Bulk updating scores:', scores.length, 'scores');

      const results = [];
      for (const scoreUpdate of scores) {
        const result = await this.upsertScore({
          entry_selection_id: scoreUpdate.entry_selection_id,
          trial_round_id: scoreUpdate.trial_round_id,
          ...scoreUpdate.scoreData
        });
        
        if (!result.success) {
          console.error('Failed to update score:', scoreUpdate.entry_selection_id, result.error);
          return { success: false, error: `Failed to update score: ${result.error}` };
        }
        
        results.push(result.data);
      }

      console.log('All scores updated successfully');
      return { success: true, data: results };
    } catch (error) {
      console.error('Error in bulk score update:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Get class summary with statistics including Games subclass
  async getClassSummary(classId: string): Promise<OperationResult> {
    try {
      console.log('Getting class summary for class ID:', classId);

      const entriesResult = await this.getClassEntriesWithScores(classId);
      if (!entriesResult.success) {
        return entriesResult;
      }

      const entries = entriesResult.data || [];
      
      // Get Games subclass info for this class
      let gamesSubclass = null;
      if (entries.length > 0) {
        gamesSubclass = entries[0].trial_rounds?.trial_classes?.games_subclass;
      }
      
      // Calculate statistics
      const stats = {
        totalEntries: entries.length,
        presentEntries: entries.filter((e: any) => e.entry_status === 'entered' || e.entry_status === 'present').length,
        scratchedEntries: entries.filter((e: any) => e.entry_status === 'scratched').length,
        absentEntries: entries.filter((e: any) => e.entry_status === 'absent').length,
        scoredEntries: entries.filter((e: any) => e.scores && e.scores.length > 0).length,
        feoEntries: entries.filter((e: any) => e.entry_type === 'FEO').length,
        regularEntries: entries.filter((e: any) => e.entry_type === 'Regular').length,
        passedEntries: entries.filter((e: any) => e.scores && e.scores.some((s: any) => s.pass_fail === 'Pass')).length,
        failedEntries: entries.filter((e: any) => e.scores && e.scores.some((s: any) => s.pass_fail === 'Fail')).length,
        gamesSubclass: gamesSubclass
      };

      console.log('Class summary calculated:', stats);
      return { 
        success: true, 
        data: {
          entries,
          stats,
          classInfo: entries[0]?.trial_rounds || null
        }
      };
    } catch (error) {
      console.error('Error getting class summary:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Enhanced export scores with Games subclass support
  async exportClassScores(classId: string): Promise<OperationResult> {
    try {
      console.log('Exporting class scores with Games subclass for class ID:', classId);

      const summaryResult = await this.getClassSummary(classId);
      if (!summaryResult.success) {
        return summaryResult;
      }

      const { entries, stats } = summaryResult.data;
      const gamesSubclass = stats.gamesSubclass;
      const isGamesClass = entries[0]?.trial_rounds?.trial_classes?.class_type === 'games';
      
      // Convert to CSV format with Games subclass handling
      const csvHeaders = [
        'Running Position',
        'Handler Name', 
        'Dog Name',
        'C-WAGS Number',
        'Entry Type',
        'Status',
        'Result', // This will show Games subclass for Games classes
        'Pass/Fail',
        'Score',
        'Judge Notes'
      ];

      const csvRows = entries.map((entry: any) => {
        const score = entry.scores && entry.scores.length > 0 ? entry.scores[0] : null;
        
        // Handle Games subclass results
        let result = '';
        if (isGamesClass && score?.pass_fail === 'Pass' && gamesSubclass) {
          result = gamesSubclass; // Show GB, BJ, C, T, or P for Games passes
        } else {
          result = score?.pass_fail || '';
        }

        return [
          entry.entry_status === 'scratched' ? 'X' : entry.running_position,
          entry.entries.handler_name,
          entry.entries.dog_call_name,
          entry.entries.cwags_number,
          entry.entry_type,
          entry.entry_status,
          result,
          score?.pass_fail || '',
          score?.numerical_score || '',
          score?.judge_notes || ''
        ];
      });

      const csvContent = [csvHeaders, ...csvRows]
        .map((row: any[]) => row.map((field: any) => `"${field}"`).join(','))
        .join('\n');

      console.log('CSV export with Games subclass generated successfully');
      return { success: true, data: csvContent };
    } catch (error) {
      console.error('Error exporting class scores:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // New function: Get Games subclass for a specific class
  async getGamesSubclassForClass(classId: string): Promise<OperationResult> {
    try {
      console.log('Getting Games subclass for class ID:', classId);

      const { data, error } = await supabase
        .from('trial_classes')
        .select('games_subclass, class_type, class_name')
        .eq('id', classId)
        .single();

      if (error) {
        console.error('Error getting Games subclass:', error);
        return { success: false, error: error.message || error };
      }

      console.log('Games subclass data:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error getting Games subclass:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Enhanced Judge Operations (from original)
  async getQualifiedJudges(level: string): Promise<OperationResult> {
    try {
      console.log('Getting qualified judges for level:', level);

      let query = supabase
        .from('judges')
        .select('*')
        .eq('is_active', true);

      // Enhanced qualification logic from original
      if (level.includes('Ranger') || (level.includes('Dasher') && !level.includes('6'))) {
        query = query.in('level', ['Detective Diversions', 'Private Investigator']);
      } else if (level.includes('Dasher 6')) {
        query = query.eq('level', 'Private Investigator');
      } else {
        query = query.eq('level', level);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting qualified judges:', error);
        return { success: false, error: error.message || error };
      }

      console.log(`Found ${data?.length || 0} qualified judges for ${level}`);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting qualified judges:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async getAllJudges(): Promise<OperationResult> {
    try {
      console.log('Getting all active judges');

      const { data, error } = await supabase
        .from('judges')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error getting judges:', error);
        return { success: false, error: error.message || error };
      }

      console.log(`Found ${data?.length || 0} active judges`);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting judges:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async getJudgesByLevel(level: string): Promise<OperationResult> {
    try {
      console.log('Getting judges for specific level:', level);

      const { data, error } = await supabase
        .from('judges')
        .select('*')
        .eq('level', level)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error getting judges by level:', error);
        return { success: false, error: error.message || error };
      }

      console.log(`Found ${data?.length || 0} judges for level ${level}`);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting judges by level:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // C-WAGS Registry Operations (for entry form auto-complete)
  async searchCwagsRegistry(searchTerm: string): Promise<OperationResult> {
    try {
      console.log('Searching C-WAGS registry for:', searchTerm);

      const { data, error } = await supabase
        .from('cwags_registry')
        .select('*')
        .or(`cwags_number.ilike.%${searchTerm}%,dog_call_name.ilike.%${searchTerm}%,handler_name.ilike.%${searchTerm}%`)
        .eq('is_active', true)
        .limit(10);

      if (error) {
        console.error('Error searching C-WAGS registry:', error);
        return { success: false, error: error.message || error };
      }

      console.log(`Found ${data?.length || 0} registry matches`);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error searching C-WAGS registry:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async getCwagsRegistryByNumber(cwagsNumber: string): Promise<OperationResult> {
    try {
      console.log('Getting C-WAGS registry entry for number:', cwagsNumber);

      const { data, error } = await supabase
        .from('cwags_registry')
        .select('*')
        .eq('cwags_number', cwagsNumber)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error getting C-WAGS registry entry:', error);
        return { success: false, error: error.message || error };
      }

      console.log('Registry entry result:', data);
      return { success: true, data: data || null };
    } catch (error) {
      console.error('Error getting C-WAGS registry entry:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

// Add this single function after getCwagsRegistryByNumber
async createRegistryEntry(registryData: {
  cwags_number: string;
  dog_call_name: string;
  handler_name: string;
  is_active: boolean;
}): Promise<OperationResult> {
  try {
    console.log('Creating C-WAGS registry entry:', registryData);

    const insertData = {
      cwags_number: registryData.cwags_number,
      dog_call_name: registryData.dog_call_name,
      handler_name: registryData.handler_name,
      is_active: registryData.is_active,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('cwags_registry')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Database error creating registry entry:', error);
      return { success: false, error: error.message || error };
    }

    console.log('Registry entry created successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error creating registry entry:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
},

  // Entry Statistics Operations
async getTrialEntryStats(trialId: string): Promise<OperationResult> {
  try {
    console.log('Getting entry statistics for trial ID (excluding FEO):', trialId);

    // Get all entries with their selections
    const entriesResult = await this.getTrialEntriesWithSelections(trialId);
    if (!entriesResult.success) {
      return { success: false, error: entriesResult.error };
    }

    // Filter out FEO entries from statistics
    const nonFeoEntries: any[] = [];
    (entriesResult.data || []).forEach((entry: any) => {
      const hasNonFeoSelections = entry.entry_selections?.some((selection: any) => 
        selection.entry_type?.toLowerCase() !== 'feo'
      );
      
      if (hasNonFeoSelections) {
        nonFeoEntries.push(entry);
      }
    });

    const stats = {
      total: nonFeoEntries.length,
      byStatus: nonFeoEntries.reduce((acc: any, entry: any) => {
        acc[entry.entry_status] = (acc[entry.entry_status] || 0) + 1;
        return acc;
      }, {}),
      byPayment: nonFeoEntries.reduce((acc: any, entry: any) => {
        acc[entry.payment_status] = (acc[entry.payment_status] || 0) + 1;
        return acc;
      }, {})
    };

    console.log('Entry statistics (excluding FEO):', stats);
    return { success: true, data: stats };
  } catch (error) {
    console.error('Error getting entry stats:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
},

  // Utility Functions
  getLevelsForCategory(category: string): string[] {
    return CWAGS_LEVELS[category as keyof typeof CWAGS_LEVELS] || [];
  },

  getAllCategories(): string[] {
    return Object.keys(CWAGS_LEVELS);
  },

  getCategoryForLevel(levelName: string): string {
    for (const [category, levels] of Object.entries(CWAGS_LEVELS)) {
      if (levels.includes(levelName)) {
        return category;
      }
    }
    return 'Unknown';
  },

  // Trial Summary Operations
  async getTrialSummary(trialId: string): Promise<OperationResult> {
    try {
      console.log('Getting complete trial summary for ID:', trialId);

      // Get trial basic info
      const trialResult = await this.getTrial(trialId);
      if (!trialResult.success) {
        return trialResult;
      }

      // Get trial days
      const daysResult = await this.getTrialDays(trialId);
      if (!daysResult.success) {
        return daysResult;
      }

      // Get all classes
      const classesResult = await this.getAllTrialClasses(trialId);
      if (!classesResult.success) {
        return classesResult;
      }

      // Get all rounds
      const roundsResult = await this.getAllTrialRounds(trialId);
      if (!roundsResult.success) {
        return roundsResult;
      }

      // Get entry statistics
      const entryStatsResult = await this.getTrialEntryStats(trialId);
      const entryStats = entryStatsResult.success ? entryStatsResult.data : { total: 0, byStatus: {}, byPayment: {} };

      const summary = {
        trial: trialResult.data,
        days: daysResult.data,
        classes: classesResult.data,
        rounds: roundsResult.data,
        entryStats,
        stats: {
          totalDays: daysResult.data.length,
          totalClasses: classesResult.data.length,
          totalRounds: roundsResult.data.length,
          totalEntries: entryStats.total,
          uniqueJudges: [...new Set(roundsResult.data.map((r: any) => r.judge_name))].length
        }
      };

      console.log('Trial summary compiled:', summary);
      return { success: true, data: summary };
    } catch (error) {
      console.error('Error getting trial summary:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Enhanced Trial Status Operations (from original)
  async publishTrial(trialId: string): Promise<OperationResult> {
    try {
      console.log('Publishing trial:', trialId);

      const { data, error } = await supabase
        .from('trials')
        .update({
          trial_status: 'published',
          premium_published: true,
          entries_open: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', trialId)
        .select()
        .single();

      if (error) {
        console.error('Error publishing trial:', error);
        return { success: false, error: error.message || error };
      }

      console.log('Trial published successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error publishing trial:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, // <-- ADD THIS COMMA

  // Enhanced function to get trial summary with Games subclass support
  // 1. Update getTrialSummaryWithScores in simpleTrialOperations.ts
async getTrialSummaryWithScores(trialId: string): Promise<OperationResult> {
  try {
    console.log('Getting complete trial summary with scores for ID:', trialId);

    // Get trial basic info
    const trialResult = await this.getTrial(trialId);
    if (!trialResult.success) {
      return trialResult;
    }

    // Get all classes with Games subclass info
    const classesResult = await this.getAllTrialClasses(trialId);
    if (!classesResult.success) {
      return classesResult;
    }
console.log('Raw classes with round data:', classesResult.data);
    // Get all entries with selections and scores
    const entriesResult = await this.getTrialEntriesWithSelections(trialId);
    if (!entriesResult.success) {
      return { success: true, data: { trial: trialResult.data, classes: [], entries: [], summary: [] } };
    }

    // Process each class to calculate statistics (EXCLUDING FEO)
    const classesWithStats = await Promise.all(
      (classesResult.data || []).map(async (cls: any) => {
        try {
          // Get judge info
          const roundsResult = await this.getTrialRounds(cls.id);
          const judge = roundsResult.success && roundsResult.data.length > 0 
            ? roundsResult.data[0].judge_name 
            : 'No Judge Assigned';

          // Filter entries for this class - EXCLUDE FEO AND WITHDRAWN ENTRIES
const classEntries: any[] = [];
(entriesResult.data || []).forEach((entry: any) => {
  const selections = entry.entry_selections || [];
  
  // Get all selections for this specific class
  const classSelections = selections.filter((selection: any) => 
    selection.trial_rounds?.trial_class_id === cls.id
  );
  
  // Check if this entry has any valid (non-FEO, non-withdrawn) selections for this class
  const hasValidSelections = classSelections.some((selection: any) => {
    const isFeo = selection.entry_type?.toLowerCase() === 'feo';
    const isWithdrawn = selection.entry_status?.toLowerCase() === 'withdrawn';
    return !isFeo && !isWithdrawn;
  });
  
  // Only include entries that have at least one valid selection
  if (hasValidSelections) {
    classSelections.forEach((selection: any) => {
      const isFeo = selection.entry_type?.toLowerCase() === 'feo';
      const isWithdrawn = selection.entry_status?.toLowerCase() === 'withdrawn';
      
      // Only add non-FEO, non-withdrawn selections
      if (!isFeo && !isWithdrawn) {
        classEntries.push({
          id: selection.id,
          entry_id: entry.id,
          running_position: selection.running_position || 1,
          entry_type: selection.entry_type || 'regular',
          entry_status: selection.entry_status, // Use actual status, no default
          entries: {
            handler_name: entry.handler_name,
            dog_call_name: entry.dog_call_name,
            cwags_number: entry.cwags_number
          },
          scores: []
        });
      }
    });
  } else {
    console.log(`Excluding entry (all selections FEO/withdrawn): ${entry.handler_name} - ${entry.dog_call_name}`);
  }
});

          // Get actual scores for class entries (non-FEO only)
          const entriesWithScores = await Promise.all(
            classEntries.map(async (entry) => {
              try {
                const { data: scores, error } = await supabase
                  .from('scores')
                  .select('*')
                  .eq('entry_selection_id', entry.id);

                if (!error && scores) {
                  entry.scores = scores;
                }
                return entry;
              } catch (error) {
                console.error('Error loading scores for entry:', entry.id, error);
                return entry;
              }
            })
          );

          // Calculate statistics (ONLY for non-FEO entries)
          const passCount = entriesWithScores.filter(entry => 
            entry.scores?.some((score: any) => score.pass_fail === 'Pass')
          ).length;
          
          const failCount = entriesWithScores.filter(entry => 
            entry.scores?.some((score: any) => score.pass_fail === 'Fail')
          ).length;

          const completedRuns = entriesWithScores.filter(entry => 
            entry.scores?.some((score: any) => score.pass_fail !== null)
          ).length;

          return {
            id: cls.id,
            class_name: cls.class_name,
            class_type: cls.class_type || 'scent',
            games_subclass: cls.games_subclass || null,
            judge_name: judge,
            trial_date: cls.trial_days?.trial_date || '',
            trial_day_id: cls.trial_day_id,
            participant_count: classEntries.length, // Only non-FEO
            pass_count: passCount,
            fail_count: failCount,
            completed_runs: completedRuns,
            entries: entriesWithScores
          };
        } catch (error) {
          console.error(`Error processing class ${cls.id}:`, error);
          return {
            id: cls.id,
            class_name: cls.class_name,
            class_type: cls.class_type || 'scent',
            games_subclass: cls.games_subclass || null,
            judge_name: 'Error Loading',
            trial_date: cls.trial_days?.trial_date || '',
            trial_day_id: cls.trial_day_id,
            participant_count: 0,
            pass_count: 0,
            fail_count: 0,
            completed_runs: 0,
            entries: []
          };
        }
      })
    );

    // Filter classes that have entries OR have configured rounds
    const classesWithEntries = classesWithStats.filter(cls => 
      cls.participant_count > 0 || cls.total_rounds > 0
    );

    // Calculate overall trial statistics (EXCLUDING FEO)
    const totalParticipants = classesWithEntries.reduce((sum, cls) => sum + cls.participant_count, 0);
    const totalPasses = classesWithEntries.reduce((sum, cls) => sum + cls.pass_count, 0);
    const totalFails = classesWithEntries.reduce((sum, cls) => sum + cls.fail_count, 0);
    const totalCompleted = classesWithEntries.reduce((sum, cls) => sum + cls.completed_runs, 0);

    // Consolidate classes by normalized name AND count actual rounds
    const normalizeClassName = (className: string): string => {
      const corrections: Record<string, string> = {
        'Patrol': 'Patrol 1',
        'Detective': 'Detective 2', 
        'Investigator': 'Investigator 3',
        'Private Inv': 'Private Investigator',
        'Det Diversions': 'Detective Diversions'
      };
      return corrections[className] || className;
    };

    const consolidatedClasses = new Map();
    const allRoundsResult = await this.getAllTrialRounds(trialId);
    const allRounds = allRoundsResult.success ? allRoundsResult.data : [];

    classesWithEntries.forEach(cls => {
      const normalizedName = normalizeClassName(cls.class_name);
      
      if (!consolidatedClasses.has(normalizedName)) {
        const roundsForThisClass = allRounds.filter((round: any) => {
          const roundClassName = round.trial_classes?.class_name || '';
          const roundNormalizedName = normalizeClassName(roundClassName);
          return roundNormalizedName === normalizedName;
        });
        
        consolidatedClasses.set(normalizedName, {
          id: cls.id,
          class_name: normalizedName,
          class_type: cls.class_type,
          games_subclass: cls.games_subclass,
          judge_name: cls.judge_name,
          trial_date: cls.trial_date,
          trial_day_id: cls.trial_day_id,
          participant_count: 0,
          pass_count: 0,
          fail_count: 0,
          completed_runs: 0,
          total_rounds: roundsForThisClass.length,
          entries: []
        });
      }
      
      const consolidated = consolidatedClasses.get(normalizedName);
      consolidated.participant_count += cls.participant_count;
      consolidated.pass_count += cls.pass_count;
      consolidated.fail_count += cls.fail_count;
      consolidated.completed_runs += cls.completed_runs;
      consolidated.entries = consolidated.entries.concat(cls.entries);
    });

    const finalClassesWithEntries = Array.from(consolidatedClasses.values());

    const summary = {
      trial: trialResult.data,
      classes: finalClassesWithEntries,
      statistics: {
        total_classes: finalClassesWithEntries.length,
        total_participants: totalParticipants, // Excludes FEO
        total_passes: totalPasses, // Excludes FEO
        total_fails: totalFails, // Excludes FEO
        total_completed: totalCompleted, // Excludes FEO
        overall_pass_rate: totalParticipants > 0 ? (totalPasses / totalParticipants) * 100 : 0,
        completion_rate: totalParticipants > 0 ? (totalCompleted / totalParticipants) * 100 : 0
      }
    };

    console.log('Trial summary with scores compiled successfully (FEO excluded from statistics)');
    return { success: true, data: summary };

  } catch (error) {
    console.error('Error getting trial summary with scores:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
},

  // Generate Excel workbook with proper formatting for Games subclass
 async generateClassSummaryExcel(trialId: string): Promise<OperationResult> {
  try {
    console.log('Generating class summary Excel for trial (excluding FEO):', trialId);

    // Use the existing function that already loads scores
    const summaryResult = await this.getTrialSummaryWithScores(trialId);
    if (!summaryResult.success) {
      return summaryResult;
    }

    const { trial, classes } = summaryResult.data;
    console.log('Classes with scores loaded:', classes);

    // Create Excel workbook
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    // Process each class to create individual sheets
    classes.forEach((cls: any) => {
      const sheetData = [];
      
      // Row 1: Trial name
      sheetData[0] = [trial.trial_name];
      
      // Row 3: Class name  
      sheetData[2] = ['', '', '', '', '', cls.class_name];
      
      // Row 4: Headers
      sheetData[3] = ['', '', '', 'C-WAGS Number', 'Dog Name', 'Handler Name', 'Result'];
      
      // Row 5: Judge name
      sheetData[4] = ['', '', '', '', '', '', cls.judge_name];
      
      // Row 6: Date
      const date = new Date(cls.trial_date).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });
      sheetData[5] = ['', '', '', '', '', '', date];

      // Add participant data with scores
      cls.entries.forEach((entry: any) => {
        const score = entry.scores?.[0]; // Get first score
        let result = '-';
        
        if (score) {
          if (score.pass_fail === 'Pass') {
            result = cls.class_type === 'games' && cls.games_subclass ? cls.games_subclass : 'P';
          } else if (score.pass_fail === 'Fail') {
            result = 'F';
          }
        }
        
        const row = [
          '', '', '', // Empty columns A, B, C
          entry.entries.cwags_number,
          entry.entries.dog_call_name,
          entry.entries.handler_name,
          result
        ];
        
        sheetData.push(row);
        console.log(`Adding entry: ${entry.entries.handler_name} - ${entry.entries.dog_call_name} - Result: ${result}`);
      });

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Create clean sheet name
      let sheetName = cls.class_name.replace(/[:\\/?*[\]]/g, '');
      if (sheetName.length > 31) {
        sheetName = sheetName.substring(0, 31);
      }
      
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // Download the file
    const fileName = `${trial.trial_name.replace(/[^a-zA-Z0-9]/g, '_')}_ClassSummary.xlsx`;
    XLSX.writeFile(workbook, fileName);

    console.log('Excel report generated successfully with scores');
    return { success: true, data: 'Excel export completed' };

  } catch (error) {
    console.error('Error generating Excel report:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
},
async getDayRunningOrderData(dayId: string): Promise<OperationResult> {
    try {
      console.log('Fetching running order data for day:', dayId);
      
      // First get the day info
      const { data: dayData, error: dayError } = await supabase
        .from('trial_days')
        .select('id, day_number, trial_date')
        .eq('id', dayId)
        .single();

      if (dayError) {
        console.error('Error fetching day:', dayError);
        return { success: false, error: dayError.message };
      }

      // Get all classes for this day with their rounds and entries
      const { data: classesData, error: classesError } = await supabase
        .from('trial_classes')
        .select(`
          id,
          class_name,
          class_type,
          class_order,
          subclass,
          trial_rounds (
            id,
            round_number,
            judge_name,
            judge_email,
            entry_selections (
              id,
              running_position,
              entry_type,
              entry_status,
              entries (
                handler_name,
                dog_call_name,
                cwags_number
              )
            )
          )
        `)
        .eq('trial_day_id', dayId)
        .order('class_order');

      if (classesError) {
        console.error('Error fetching classes data:', classesError);
        return { success: false, error: classesError.message };
      }

      // Transform the data structure
      const processedData = {
        day: dayData,
        classes: (classesData || []).map((cls: any) => ({
          id: cls.id,
          class_name: cls.class_name,
          class_type: cls.class_type,
          class_order: cls.class_order,
          subclass: cls.subclass,
          rounds: (cls.trial_rounds || []).map((round: any) => ({
            id: round.id,
            round_number: round.round_number,
            judge_name: round.judge_name,
            judge_email: round.judge_email,
            entries: (round.entry_selections || [])
              .filter((selection: any) => selection.entries) // Only include entries with data
              .map((selection: any) => ({
                id: selection.id,
                running_position: selection.running_position,
                entry_type: selection.entry_type,
                entry_status: selection.entry_status,
                handler_name: selection.entries.handler_name,
                dog_call_name: selection.entries.dog_call_name,
                cwags_number: selection.entries.cwags_number
              }))
          }))
        }))
      };

      console.log('Processed running order data:', processedData);
      return { success: true, data: processedData };
      
    } catch (error) {
      console.error('Exception in getDayRunningOrderData:', error);
      return { success: false, error: 'Failed to fetch day running order data' };
    }
  },
  // Helper function to format results for Excel export with Games subclass handling
  formatResultForExport(entry: any, classInfo: any): string {
    const score = entry.scores?.[0];
    if (!score || !score.pass_fail) {
      return '-';
    }

    // Handle Games subclass results - show subclass letter for passes
    if (classInfo.class_type === 'games' && score.pass_fail === 'Pass' && classInfo.games_subclass) {
      return classInfo.games_subclass; // Return just the subclass (GB, BJ, C, T, P)
    }

    // Handle other class types - show P/F
    if (score.pass_fail === 'Pass') {
      return 'P';
    } else if (score.pass_fail === 'Fail') {
      return 'F';
    }

    return '-';
  }

}; // <-- This is your existing closing brace at line 1717