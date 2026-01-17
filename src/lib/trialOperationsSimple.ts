// src/lib/trial-operations-simple.ts
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
const supabase = getSupabaseBrowser();
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
  default_entry_fee?: number;       
  default_feo_price?: number; 
  waiver_text: string;
  fee_configuration: any | null;
  notes: string | null;
  entry_status?: 'draft' | 'open' | 'closed';
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
  is_accepting_entries?: boolean;
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

  // ✅ Add this
  trial_rounds?: TrialRound[]
  trial_days?: {
    trial_id: string;
    day_number: number;
    trial_date: string;
};
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
  dog_breed: string | null;    // ✅ Change from: string
  dog_sex: string | null; 
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
  division: string | null;
  games_subclass: string | null;
  jump_height: string | null;
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
  warning?: string | null;
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
    .eq('first_name', 'role')
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
        default_entry_fee: dataToInsert.default_entry_fee,     // ✅ ADD THIS
        default_feo_price: dataToInsert.default_feo_price,     // ✅ ADD THIS
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
      .select(`
  *,
  default_entry_fee,
  default_feo_price
`)
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


//  SAFE UPDATED getAllTrials
async getAllTrials(): Promise<OperationResult> {
  try {
    const supabase = getSupabaseBrowser();

    // Get the logged-in user
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      console.log("No logged-in user found when loading trials.");
      return { success: false, error: "Not authenticated" };
    }

    // Get user role
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userError || !userRecord) {
      console.error("Failed to load user role:", userError);
      return { success: false, error: "Failed to load user role" };
    }

    const isAdmin = userRecord.role === "administrator";

    if (isAdmin) {
      // Admins see all trials
      const { data, error } = await supabase
        .from("trials")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) {
        console.error("Error fetching trials:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } else {
      // Non-admins: Get trials they created
      const { data: createdTrials, error: createdError } = await supabase
        .from("trials")
        .select("*")
        .eq("created_by", user.id);

      if (createdError) {
        console.error("Error fetching created trials:", createdError);
        return { success: false, error: createdError.message };
      }

      // Get trials they're assigned to
      const { data: assignments, error: assignmentError } = await supabase
        .from("trial_assignments")
        .select(`
          trial_id,
          trials (*)
        `)
        .eq("user_id", user.id);

      if (assignmentError) {
        console.error("Error fetching assigned trials:", assignmentError);
        return { success: false, error: assignmentError.message };
      }

      // Combine and deduplicate trials
      const assignedTrials = (assignments || [])
        .map((a: any) => a.trials)
        .filter((t: any) => t !== null);

      const allTrials = [...(createdTrials || []), ...assignedTrials];
      
      // Remove duplicates by ID
      const uniqueTrials = allTrials.filter((trial, index, self) =>
        index === self.findIndex((t) => t.id === trial.id)
      );

      // Sort by start date
      uniqueTrials.sort((a, b) => 
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      );

      return { success: true, data: uniqueTrials };
    }
  } catch (err: any) {
    console.error("Unexpected getAllTrials error:", err);
    return { success: false, error: "Unexpected error fetching trials" };
  }
},

// Update trial status (FIXED - handles data correctly)
async updateTrialStatus(trialId: string, status: 'draft' | 'published' | 'active' | 'closed' | 'completed'): Promise<OperationResult> {
  try {
    console.log('=== UPDATE TRIAL STATUS DEBUG ===');
    console.log('Trial ID:', trialId);
    console.log('New Status:', status);

    const updateData = {
      trial_status: status,
      updated_at: new Date().toISOString()
    };

    // First, check if the trial exists
    const { data: existingTrial, error: checkError } = await supabase
      .from('trials')
      .select('id')
      .eq('id', trialId)
      .single();

    if (checkError || !existingTrial) {
      console.error('Trial not found:', trialId);
      return { success: false, error: 'Trial not found' };
    }

    // Now update it
    const { error: updateError } = await supabase
      .from('trials')
      .update(updateData)
      .eq('id', trialId);

    if (updateError) {
      console.error('Update error:', updateError);
      return { success: false, error: updateError.message || 'Failed to update trial' };
    }

    console.log('Trial status updated successfully to:', status);
    return { success: true, data: { ...existingTrial, trial_status: status } };
  } catch (error) {
    console.error('Caught Exception:', error);
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
// Add trial assignment
async assignUserToTrial(trialId: string, userId: string, notes?: string): Promise<OperationResult> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user;

    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from('trial_assignments')
      .insert({
        trial_id: trialId,
        user_id: userId,
        assigned_by: currentUser.id,
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error assigning user to trial:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error assigning user:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
},

// Remove trial assignment
async removeUserFromTrial(trialId: string, userId: string): Promise<OperationResult> {
  try {
    const { error } = await supabase
      .from('trial_assignments')
      .delete()
      .eq('trial_id', trialId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing assignment:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('Error removing assignment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
},

// Get all users assigned to a trial
async getTrialAssignments(trialId: string): Promise<OperationResult> {
  try {
    const { data, error } = await supabase
      .from('trial_assignments')
      .select(`
        *,
        users!trial_assignments_user_id_fkey(
          id,
          email,
          first_name,
          last_name,
          role
        ),
        assigned_by_user:users!trial_assignments_assigned_by_fkey(
          first_name,
          last_name
        )
      `)
      .eq('trial_id', trialId);

    if (error) {
      console.error('Error loading assignments:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error loading assignments:', error);
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
            day_number,
            is_accepting_entries
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

    // ✅ DUPLICATE CHECK: Check if entry already exists for this trial + C-WAGS number
    const { data: existingEntry, error: checkError } = await supabase
      .from('entries')
      .select('id, submitted_at')
      .eq('trial_id', entryData.trial_id)
      .eq('cwags_number', entryData.cwags_number)
      .maybeSingle();

    if (existingEntry) {
      const timeSince = Date.now() - new Date(existingEntry.submitted_at).getTime();
      const minutesAgo = Math.floor(timeSince / 60000);
      
      console.warn(`⚠️ Entry already exists (submitted ${minutesAgo} minutes ago)`);
      console.warn(`⚠️ Existing entry ID: ${existingEntry.id}`);
      
      return {
        success: false,
        error: `This dog is already entered in this trial (Entry ID: ${existingEntry.id}). Cannot create duplicate entry.`
      };
    }

    // No duplicate found - proceed with insert
    const insertData = {
      trial_id: entryData.trial_id,
      handler_name: entryData.handler_name,
      dog_call_name: entryData.dog_call_name,
      cwags_number: entryData.cwags_number,
      dog_breed: entryData.dog_breed || null,
      dog_sex: entryData.dog_sex || null,
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

    console.log('✅ Entry created successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error creating entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
},

async getTrialEntries(trialId: string): Promise<OperationResult> {
  try {
    // Ensure trialId is a clean string
    const cleanTrialId = String(trialId).trim();
    console.log('Fetching entries for trial ID:', `'${cleanTrialId}'`);

    // Fetch entries
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('trial_id', cleanTrialId)
      .order('submitted_at', { ascending: false });

    // Log raw Supabase response
    console.log('Supabase returned data:', data);
    console.log('Supabase returned error:', error);

    // Handle Supabase error
    if (error) {
      console.error('Error fetching trial entries:', error);
      return { success: false, error: error.message || JSON.stringify(error) };
    }

    // Check if data exists
    if (!data || data.length === 0) {
      console.warn('No entries found for trial ID:', cleanTrialId);
      return { success: true, data: [] };
    }

    console.log(`Found ${data.length} entries for trial ${cleanTrialId}`);
    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error fetching trial entries:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
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

    // ✅ Only add audit trail for meaningful updates (not automatic fee changes)
    const meaningfulFields = Object.keys(updates).filter(key => 
      key !== 'total_fee' && key !== 'amount_owed' && key !== 'audit_trail'
    );
    
    let auditEntry = updates.audit_trail || null;
    
    // Only create audit entry if there are meaningful field changes
    if (meaningfulFields.length > 0 && !updates.audit_trail) {
      auditEntry = `Updated ${meaningfulFields.join(', ')} at ${new Date().toISOString()}`;
    }
    
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

// FIXED: Score-aware createEntrySelections function
async createEntrySelections(entryId: string, selections: Omit<EntrySelection, 'id' | 'entry_id'>[]): Promise<OperationResult> {
  try {
    console.log('=== SCORE-AWARE CREATEENTRYSELECTIONS FUNCTION CALLED ===');
    console.log('Managing entry selections for entry:', entryId);
    console.log('Raw selections received:', selections);
    
    // STEP 1: Get the C-WAGS number and trial for this entry
    const { data: entryInfo, error: entryError } = await supabase
      .from('entries')
      .select('cwags_number, trial_id')
      .eq('id', entryId)
      .single();

    if (entryError) {
      console.error('❌ Failed to get entry info:', entryError);
      return { success: false, error: `Failed to get entry info: ${entryError.message}` };
    }

    console.log('Entry info:', entryInfo);

    // STEP 2: Get all entries for this C-WAGS number in this trial
    const { data: allEntries, error: entriesError } = await supabase
      .from('entries')
      .select('id')
      .eq('trial_id', entryInfo.trial_id)
      .eq('cwags_number', entryInfo.cwags_number);

    if (entriesError) {
      console.error('❌ Failed to get related entries:', entriesError);
      return { success: false, error: `Failed to get related entries: ${entriesError.message}` };
    }

    const allEntryIds = allEntries?.map(e => e.id) || [entryId];
    console.log('All entry IDs for this C-WAGS number:', allEntryIds);

   // STEP 3: Check which entry selections have scores - QUERY SCORES TABLE DIRECTLY
console.log('🔍 Checking for scores using DIRECT query to scores table...');

const { data: existingSelections, error: selectionsError } = await supabase
  .from('entry_selections')
  .select('id, trial_round_id, entry_type')
  .in('entry_id', allEntryIds);

if (selectionsError) {
  console.error('❌ Failed to get existing selections:', selectionsError);
  return { success: false, error: `Failed to get selections: ${selectionsError.message}` };
}

let selectionsWithScoreIds = new Set<string>();

if (existingSelections && existingSelections.length > 0) {
  const selectionIds = existingSelections.map(s => s.id);
  console.log(`Checking ${selectionIds.length} selections for scores...`);
  
  const { data: scoresData, error: scoresError } = await supabase
    .from('scores')
    .select('entry_selection_id')
    .in('entry_selection_id', selectionIds);

  if (scoresError) {
    console.error('❌ Failed to check for scores:', scoresError);
    return { success: false, error: `Failed to check for scores: ${scoresError.message}` };
  }

  selectionsWithScoreIds = new Set(
    (scoresData || []).map(score => score.entry_selection_id)
  );

  console.log(`Found ${selectionsWithScoreIds.size} entry selections with scores that will be preserved`);

  if (selectionsWithScoreIds.size > 0) {
    console.log(`⚠️ Found ${selectionsWithScoreIds.size} entry selections with scores`);
    
    existingSelections.forEach(sel => {
      if (selectionsWithScoreIds.has(sel.id)) {
        console.log(`   - Selection ID ${sel.id} (Round: ${sel.trial_round_id}, Type: ${sel.entry_type}) has scores`);
      }
    });
  }

  // STEP 4: Delete only entry selections WITHOUT scores
  const selectionsToDelete = existingSelections
    .filter(sel => !selectionsWithScoreIds.has(sel.id))
    .map(sel => sel.id);

  if (selectionsToDelete.length > 0) {
    console.log(`🗑️ Deleting ${selectionsToDelete.length} entry selections without scores`);
    
    const { error: deleteError } = await supabase
      .from('entry_selections')
      .delete()
      .in('id', selectionsToDelete);

    if (deleteError) {
      console.error('❌ Failed to delete selections:', deleteError);
      return { success: false, error: `Failed to delete existing selections: ${deleteError.message}` };
    }

    console.log(`✅ Deleted ${selectionsToDelete.length} entry selections (preserved ${selectionsWithScoreIds.size} with scores)`);
  } else {
    console.log('ℹ️ No entry selections to delete (all have scores or none exist)');
  }
} else {
  console.log('ℹ️ No existing selections found');
}

// STEP 5: If no new selections, we're done
if (!selections || selections.length === 0) {
  console.log('ℹ️ No new selections to add');
  
  // Check if we preserved any scored selections
  const preservedCount = selectionsWithScoreIds.size;
  
  return { 
    success: true, 
    data: [], 
    warning: preservedCount > 0 
      ? `${preservedCount} existing entries with scores were preserved and cannot be modified` 
      : null
  };
}

    // STEP 5: If no new selections, we're done
    if (!selections || selections.length === 0) {
      console.log('ℹ️ No new selections to add');
      
      // Return info about preserved selections
      return { 
        success: true, 
        data: [], 
        warning: selectionsWithScoreIds.size > 0 ? 
          `${selectionsWithScoreIds.size} existing entries with scores were preserved and cannot be modified` : null
      };
    }

   // STEP 6: Add new selections
    const selectionsWithEntryId = selections.map((selection, index) => ({
      entry_id: entryId,
      trial_round_id: selection.trial_round_id,
      entry_type: selection.entry_type || 'regular',
      fee: selection.fee || 0,
      running_position: selection.running_position || index + 1,
      entry_status: selection.entry_status || 'entered',
      division: selection.division || null,
      games_subclass: selection.games_subclass || null,
      jump_height: selection.jump_height || null,
      created_at: new Date().toISOString()
    }));

    console.log(`➕ Adding ${selectionsWithEntryId.length} new selections`);
    console.log('New selections data:', selectionsWithEntryId);

    const { data: insertedSelections, error: insertError } = await supabase
      .from('entry_selections')
      .insert(selectionsWithEntryId)
      .select();

    if (insertError) {
      console.error('❌ Failed to insert new selections:', insertError);
      return { success: false, error: `Failed to insert new selections: ${insertError.message}` };
    }

    console.log(`✅ Successfully created ${insertedSelections?.length || 0} new entry selections`);
    
    // Prepare warning message if scores were preserved
    let warningMessage = null;
    if (selectionsWithScoreIds.size > 0) {
      warningMessage = `${selectionsWithScoreIds.size} existing entries with scores were preserved and cannot be modified. Only entries without scores were updated.`;
    }
    
    return { 
      success: true, 
      data: insertedSelections,
      warning: warningMessage
    };

  } catch (error) {
    console.error('❌ Unexpected error in score-aware createEntrySelections:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unexpected error occurred'
    };
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

// Get all entries with their selections for a trial (for running order management)
// OPTIMIZED VERSION - Replace getTrialEntriesWithSelections in src/lib/trialOperationsSimple.ts
// This uses a single query with joins instead of 300+ nested queries

async getTrialEntriesWithSelections(trialId: string): Promise<OperationResult> {
  try {
    console.log('Getting trial entries with selections for trial ID (OPTIMIZED):', trialId);

    // ✅ SINGLE QUERY with all joins - no nested loops!
 const { data: entries, error: entriesError } = await supabase
  .from('entries')
  .select(`
    *,
    entry_selections (
      *,
      scores (*),
      trial_rounds (
        id,
        trial_class_id,
        judge_name,
        round_number,
        trial_classes (
          id,
          class_name,
          class_level,
          class_type,
          games_subclass,
          trial_days (
            trial_id,
            day_number,
            trial_date
          )
        )
      )
    )
  `)
  .eq('trial_id', trialId)
  .order('created_at', { ascending: true });

    if (entriesError) {
      console.error('Error getting entries:', entriesError);
      return { success: false, error: entriesError.message };
    }

    if (!entries || entries.length === 0) {
      console.log('No entries found for trial');
      return { success: true, data: [] };
    }

    console.log(`Found ${entries.length} entries with selections (single query)`);
    if (entries.length > 0 && entries[0].entry_selections) {
      console.log(`Sample entry has ${entries[0].entry_selections.length} selections`);
    }

    return { success: true, data: entries };
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
  fee?: number;
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
    console.log('🔵 Starting upsertScore with data:', scoreData);

    // ✅ Extract base round ID if it's a compound ID (for Games classes)
    let baseRoundId = scoreData.trial_round_id;
    
    if (scoreData.trial_round_id && scoreData.trial_round_id.includes('-')) {
      const parts = scoreData.trial_round_id.split('-');
      const lastPart = parts[parts.length - 1];
      
      // If the last part is a Games subclass, strip it to get the base UUID
      if (['GB', 'BJ', 'T', 'P', 'C'].includes(lastPart)) {
        baseRoundId = parts.slice(0, -1).join('-');
        console.log('🟢 Extracted base round ID:', baseRoundId, 'from compound ID:', scoreData.trial_round_id);
      }
    }

    const scoreRecord = {
      entry_selection_id: scoreData.entry_selection_id,
      trial_round_id: baseRoundId,
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

    console.log('🔵 Attempting upsert with record:', scoreRecord);

    // ✅ Use upsert with onConflict instead of checking first
    const { data, error } = await supabase
      .from('scores')
      .upsert(scoreRecord, {
        onConflict: 'entry_selection_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('🔴 Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return { 
        success: false, 
        error: error.message || error.details || JSON.stringify(error) 
      };
    }

    console.log('🟢 Score upserted successfully:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('🔴 Exception in upsertScore:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
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
        .or(`cwags_number.ilike.%${searchTerm}%,dog_call_name.ilike.%${searchTerm}%,handler_name.ilike.%${searchTerm}%,handler_email.ilike.%${searchTerm}%`)

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

async createRegistryEntry(registryData: {
  cwags_number: string;
  dog_call_name: string;
  handler_name: string;
  handler_email: string | null;
  handler_phone?: string | null;
  emergency_contact?: string | null;
  breed?: string | null;
  dog_sex?: string | null;
  is_junior_handler?: boolean;
  is_active: boolean;
}): Promise<OperationResult> {
  try {
    console.log('Creating / updating C-WAGS registry entry:', registryData);

    const insertData = {
      cwags_number: registryData.cwags_number,
      dog_call_name: registryData.dog_call_name,
      handler_name: registryData.handler_name,
      handler_email: registryData.handler_email ?? null,
      handler_phone: registryData.handler_phone ?? null,
      emergency_contact: registryData.emergency_contact ?? null,
      breed: registryData.breed ?? null,
      dog_sex: registryData.dog_sex ?? null,
      is_junior_handler: registryData.is_junior_handler ?? false,
      is_active: registryData.is_active,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('cwags_registry')
      .upsert(insertData, {
        onConflict: 'cwags_number'
      })
      .select()
      .single();

    if (error) {
      console.error('Registry upsert failed:', error);
      return { success: false, error: error.message || error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error upserting registry entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
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
  },

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
    // ✅ First, expand Games classes with multiple subclasses
// DON'T expand Games classes - keep them consolidated
// Consolidate Games classes with same name but different subclasses
const classMap = new Map<string, any>();

(classesResult.data || []).forEach((cls: any) => {
  const key = `${cls.class_name}-${cls.trial_day_id}`;
  
  if (classMap.has(key)) {
    // Class already exists - merge subclasses
    const existing = classMap.get(key);
    if (cls.class_type === 'games' && cls.games_subclass) {
      // Combine subclasses
      const subclasses = [
        ...(existing.games_subclass || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        ...(cls.games_subclass || '').split(',').map((s: string) => s.trim()).filter(Boolean)
      ];
      existing.games_subclass = [...new Set(subclasses)].join(', ');
      
      // Track all class IDs for fetching rounds/entries later
      existing.allClassIds = existing.allClassIds || [existing.id];
      existing.allClassIds.push(cls.id);
    }
  } else {
    // New class
    classMap.set(key, {
      ...cls,
      allClassIds: [cls.id]
    });
  }
});

const expandedClasses = Array.from(classMap.values());

const classesWithStatsRaw = await Promise.all(
  expandedClasses.map(async (cls: any) => {
    // ✅ Add null check
    if (!cls) return null;
    
    try {
 // For consolidated Games classes, get rounds from ALL class IDs
const classIdsToCheck = cls.allClassIds || [cls.id];

// Get all rounds for all class IDs
const allRoundsResults = await Promise.all(
  classIdsToCheck.map((classId: string) => this.getTrialRounds(classId))
);

// Collect all round IDs
const allRoundIds = allRoundsResults
  .filter(result => result.success)
  .flatMap(result => result.data.map((round: any) => round.id));

// Get all judges
const allJudges = allRoundsResults
  .filter(result => result.success)
  .flatMap(result => result.data.map((round: any) => round.judge_name))
  .filter((name, index, self) => name && self.indexOf(name) === index); // unique

const judge = cls.class_type === 'games' 
  ? '' // Leave blank for Games
  : (allJudges[0] || 'Not Assigned');

     // Calculate statistics - scores are directly on entry objects
// Filter entries - check if selection matches ANY of the round IDs
const classEntries: any[] = [];
(entriesResult.data || []).forEach((entry: any) => {
  const selections = entry.entry_selections || [];
  
  const classSelections = selections.filter((selection: any) => {
    return allRoundIds.includes(selection.trial_round_id);
  });
  
  classSelections.forEach((selection: any) => {
    const isFeo = selection.entry_type?.toLowerCase() === 'feo';
    const isWithdrawn = selection.entry_status?.toLowerCase() === 'withdrawn';
    
    if (!isFeo && !isWithdrawn) {
      classEntries.push({
        ...selection,
        entry_id: entry.id,
        entries: {
          handler_name: entry.handler_name,
          dog_call_name: entry.dog_call_name,
          cwags_number: entry.cwags_number
        }
      });
    }
  });
});

// ✅ ADD HELPER FUNCTION HERE (right after classEntries is built)
// Helper to normalize scores to always be an array
const getScoresArray = (entry: any) => {
  if (Array.isArray(entry.scores)) return entry.scores;
  if (entry.scores) return [entry.scores];
  return [];
};

// ✅ REPLACE THE THREE FILTER OPERATIONS WITH THIS:
const passCount = classEntries.filter((entry: any) => 
  getScoresArray(entry).some((s: any) => 
    s.pass_fail === 'Pass' || ['GB', 'BJ', 'T', 'P', 'C'].includes(s.pass_fail)
  )
).length;

const failCount = classEntries.filter((entry: any) => 
  getScoresArray(entry).some((s: any) => s.pass_fail === 'Fail')
).length;

const completedRuns = classEntries.filter((entry: any) => 
  getScoresArray(entry).some((s: any) => s.pass_fail !== null)
).length;

// ✅ KEEP EVERYTHING BELOW THIS THE SAME (the return statement, etc.)
return {
  id: cls.id,
  class_name: cls.class_name,
  class_type: cls.class_type || 'scent',
  games_subclass: cls.games_subclass || null,
  judge_name: judge,
  trial_date: cls.trial_days?.trial_date || '',
  trial_day_id: cls.trial_day_id,
  participant_count: classEntries.length,
  pass_count: passCount,
  fail_count: failCount,
  completed_runs: completedRuns,
  entries: classEntries,
  total_rounds: allRoundsResults.filter(r => r.success).reduce((sum, r) => sum + r.data.length, 0) || 1
};
    } catch (error) {
      console.error('Error processing class:', error);
      return null;
    }
  })
);

// ✅ Filter out nulls with proper TypeScript type guard
const classesWithStats = classesWithStatsRaw.filter((cls): cls is NonNullable<typeof cls> => cls !== null);

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
    'Super Sleuth': 'Super Sleuth 4',  // ✅ ADD THIS LINE
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

};

