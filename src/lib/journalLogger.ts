// src/lib/journalLogger.ts
// Journal Activity Logger with Snapshot Support
// Captures complete state at time of event for accurate historical tracking

import { getSupabaseBrowser } from './supabaseBrowser';

/**
 * Log entry submission with snapshot of entry data and selected classes
 */
export async function logEntrySubmitted(
  trialId: string,
  entryId: string,
  entryData: {
    handler_name: string;
    dog_call_name: string;
    cwags_number: string;
    total_fee: number;
    handler_email: string;
    handler_phone: string;
  },
  classes: Array<{
    class_name?: string;
    round?: number;
    fee?: number;
    division?: string;
    entry_type?: string;
  }>
) {
  try {
    const supabase = getSupabaseBrowser();
    
    // Create comprehensive snapshot of what was submitted
    const snapshot = {
      handler_name: entryData.handler_name,
      dog_call_name: entryData.dog_call_name,
      cwags_number: entryData.cwags_number,
      handler_email: entryData.handler_email,
      handler_phone: entryData.handler_phone,
      total_fee: entryData.total_fee,
      class_count: classes.length,
      classes: classes.map(c => ({
        name: c.class_name || 'Unknown Class',
        round: c.round || 1,
        fee: c.fee || 0,
        division: c.division || null,
        entry_type: c.entry_type || 'regular'
      }))
    };
    
    const { error } = await supabase.from('trial_activity_log').insert({
      trial_id: trialId,
      activity_type: 'entry_submitted',
      entry_id: entryId,
      snapshot_data: snapshot,
      user_name: entryData.handler_name
    });
    
    if (error) {
      console.error('Failed to log entry submission:', error);
    } else {
      console.log('✅ Logged entry submission to journal with snapshot');
    }
  } catch (error) {
    console.error('Error logging entry submission:', error);
  }
}

/**
 * Log entry modification with before/after snapshot
 */
export async function logEntryModified(
  trialId: string,
  entryId: string,
  beforeSnapshot: {
    handler_name: string;
    dog_call_name: string;
    class_count: number;
    total_fee: number;
    classes: any[];
  },
  afterSnapshot: {
    class_count: number;
    total_fee: number;
    classes: any[];
  }
) {
  try {
    const supabase = getSupabaseBrowser();
    
    // Create comprehensive snapshot showing what changed
    const snapshot = {
      handler_name: beforeSnapshot.handler_name,
      dog_call_name: beforeSnapshot.dog_call_name,
      before: {
        class_count: beforeSnapshot.class_count,
        total_fee: beforeSnapshot.total_fee,
        classes: beforeSnapshot.classes
      },
      after: {
        class_count: afterSnapshot.class_count,
        total_fee: afterSnapshot.total_fee,
        classes: afterSnapshot.classes
      },
      change: {
        class_count_delta: afterSnapshot.class_count - beforeSnapshot.class_count,
        fee_delta: afterSnapshot.total_fee - beforeSnapshot.total_fee
      }
    };
    
    const { error } = await supabase.from('trial_activity_log').insert({
      trial_id: trialId,
      activity_type: 'entry_modified',
      entry_id: entryId,
      snapshot_data: snapshot,
      user_name: beforeSnapshot.handler_name
    });
    
    if (error) {
      console.error('Failed to log entry modification:', error);
    } else {
      console.log('✅ Logged entry modification to journal with snapshot');
    }
  } catch (error) {
    console.error('Error logging entry modification:', error);
  }
}

/**
 * Log payment received with snapshot of payment details
 */
export async function logSubstitution(
  trialId: string,
  substitutionData: {
    original_entry_id: string;
    original_dog_name: string;
    original_handler_name: string;
    original_cwags: string;
    substitute_entry_id: string;
    substitute_dog_name: string;
    substitute_handler_name: string;
    substitute_cwags: string;
    class_name: string;
    round_number: number;
    running_position: number;
    day_number?: number;
    trial_date?: string;
  }
): Promise<void> {
  try {
    const supabase = getSupabaseBrowser();
    
    // Log substitution to trial_activity_log
    const { error } = await supabase
      .from('trial_activity_log')
      .insert({
        trial_id: trialId,
        activity_type: 'dog_substituted',
        entry_id: substitutionData.original_entry_id,
        snapshot_data: {
          original: {
            dog_call_name: substitutionData.original_dog_name,
            handler_name: substitutionData.original_handler_name,
            cwags_number: substitutionData.original_cwags,
            entry_id: substitutionData.original_entry_id
          },
          substitute: {
            dog_call_name: substitutionData.substitute_dog_name,
            handler_name: substitutionData.substitute_handler_name,
            cwags_number: substitutionData.substitute_cwags,
            entry_id: substitutionData.substitute_entry_id
          },
          class_details: {
            class_name: substitutionData.class_name,
            round: substitutionData.round_number,
            running_position: substitutionData.running_position,
            day_number: substitutionData.day_number,
            trial_date: substitutionData.trial_date
          },
          timestamp: new Date().toISOString()
        },
        user_name: substitutionData.original_handler_name
      });

   if (error) {
  console.error('Error logging substitution:', error);
  // Don't throw - allow the substitution to complete even if logging fails
} else {
  console.log('✅ Logged substitution to journal');
}
  } catch (error) {
    console.error('Failed to log substitution:', error);
    // Don't throw - don't fail substitution if logging fails
  }
}

export async function logPaymentReceived(
  trialId: string,
  entryId: string,
  paymentData: {
    amount: number;
    payment_method: string;
    payment_received_by?: string;
    payment_date: string;
    notes?: string;
  },
  entryInfo: {
    handler_name: string;
    dog_call_name: string;
    amount_owed: number;
    amount_paid_before: number;
    amount_paid_after: number;
  }
) {
  try {
    const supabase = getSupabaseBrowser();
    
    // Create comprehensive snapshot of payment transaction
    const snapshot = {
      handler_name: entryInfo.handler_name,
      dog_call_name: entryInfo.dog_call_name,
      payment: {
        amount: paymentData.amount,
        method: paymentData.payment_method,
        received_by: paymentData.payment_received_by || 'Unknown',
        payment_date: paymentData.payment_date,
        notes: paymentData.notes || null
      },
      financial_status: {
        amount_owed: entryInfo.amount_owed,
        amount_paid_before: entryInfo.amount_paid_before,
        amount_paid_after: entryInfo.amount_paid_after,
        remaining_balance: entryInfo.amount_owed - entryInfo.amount_paid_after
      }
    };
    
    const { error } = await supabase.from('trial_activity_log').insert({
      trial_id: trialId,
      activity_type: 'payment_received',
      entry_id: entryId,
      snapshot_data: snapshot,
      user_name: entryInfo.handler_name
    });
    
    if (error) {
      console.error('Failed to log payment:', error);
    } else {
      console.log('✅ Logged payment to journal with snapshot');
    }
  } catch (error) {
    console.error('Error logging payment:', error);
  }
}

/**
 * Log payment edited with before/after snapshot
 */
export async function logPaymentEdited(
  trialId: string,
  entryId: string,
  beforePayment: {
    amount: number;
    payment_method: string;
    payment_date: string;
  },
  afterPayment: {
    amount: number;
    payment_method: string;
    payment_date: string;
  },
  entryInfo: {
    handler_name: string;
    dog_call_name: string;
  }
) {
  try {
    const supabase = getSupabaseBrowser();
    
    const snapshot = {
      handler_name: entryInfo.handler_name,
      dog_call_name: entryInfo.dog_call_name,
      before: beforePayment,
      after: afterPayment,
      changes: {
        amount_changed: beforePayment.amount !== afterPayment.amount,
        method_changed: beforePayment.payment_method !== afterPayment.payment_method,
        date_changed: beforePayment.payment_date !== afterPayment.payment_date
      }
    };
    
    const { error } = await supabase.from('trial_activity_log').insert({
      trial_id: trialId,
      activity_type: 'payment_edited',
      entry_id: entryId,
      snapshot_data: snapshot,
      user_name: entryInfo.handler_name
    });
    
    if (error) {
      console.error('Failed to log payment edit:', error);
    } else {
      console.log('✅ Logged payment edit to journal with snapshot');
    }
  } catch (error) {
    console.error('Error logging payment edit:', error);
  }
}

/**
 * Log refund processed with snapshot
 */
export async function logRefundProcessed(
  trialId: string,
  entryId: string,
  refundData: {
    amount: number;
    refund_method: string;
    refund_issued_by?: string;
    refund_date: string;
    notes?: string;
  },
  entryInfo: {
    handler_name: string;
    dog_call_name: string;
    amount_owed: number;
    amount_paid_before: number;
    amount_paid_after: number;
  }
) {
  try {
    const supabase = getSupabaseBrowser();
    
    const snapshot = {
      handler_name: entryInfo.handler_name,
      dog_call_name: entryInfo.dog_call_name,
      refund: {
        amount: refundData.amount,
        method: refundData.refund_method,
        issued_by: refundData.refund_issued_by || 'Unknown',
        refund_date: refundData.refund_date,
        notes: refundData.notes || null
      },
      financial_status: {
        amount_owed: entryInfo.amount_owed,
        amount_paid_before: entryInfo.amount_paid_before,
        amount_paid_after: entryInfo.amount_paid_after,
        remaining_balance: entryInfo.amount_owed - entryInfo.amount_paid_after
      }
    };
    
    const { error } = await supabase.from('trial_activity_log').insert({
      trial_id: trialId,
      activity_type: 'refund_processed',
      entry_id: entryId,
      snapshot_data: snapshot,
      user_name: entryInfo.handler_name
    });
    
    if (error) {
      console.error('Failed to log refund:', error);
    } else {
      console.log('✅ Logged refund to journal with snapshot');
    }
  } catch (error) {
    console.error('Error logging refund:', error);
  }
}

/**
 * Log entry submission OR modification (automatically detects which)
 * Compares against previous snapshot to determine if this is a modification
 */
export async function logEntrySubmittedOrModified(
  trialId: string,
  entryId: string,
  entryData: {
    handler_name: string;
    dog_call_name: string;
    cwags_number: string;
    total_fee: number;
    handler_email: string;
    handler_phone: string;
  },
  classes: Array<{
    class_name?: string;
    round?: number;
    fee?: number;
    division?: string;
    entry_type?: string;
  }>
) {
  try {
    const supabase = getSupabaseBrowser();
    
    // Create snapshot of CURRENT state
    const currentSnapshot = {
      handler_name: entryData.handler_name,
      dog_call_name: entryData.dog_call_name,
      cwags_number: entryData.cwags_number,
      handler_email: entryData.handler_email,
      handler_phone: entryData.handler_phone,
      total_fee: entryData.total_fee,
      class_count: classes.length,
      classes: classes.map(c => ({
        name: c.class_name || 'Unknown Class',
        round: c.round || 1,
        fee: c.fee || 0,
        division: c.division || undefined,
        entry_type: c.entry_type || 'regular'
      }))
    };
    
    // Check if this entry already has activity logs
    const { data: previousActivity, error: fetchError } = await supabase
      .from('trial_activity_log')
      .select('snapshot_data, activity_type')
      .eq('entry_id', entryId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine for new entries
      console.error('Error checking previous activity:', fetchError);
    }
    
    // If no previous activity, this is a NEW SUBMISSION
    if (!previousActivity) {
      const { error } = await supabase.from('trial_activity_log').insert({
        trial_id: trialId,
        activity_type: 'entry_submitted',
        entry_id: entryId,
        snapshot_data: currentSnapshot,
        user_name: entryData.handler_name
      });
      
      if (error) {
        console.error('Failed to log entry submission:', error);
      } else {
        console.log('✅ Logged NEW entry submission to journal');
      }
      return;
    }
    
  // We have a previous snapshot - compare to see if anything changed
    const previousSnapshot = previousActivity.snapshot_data;
    const previousActivityType = previousActivity.activity_type;
    
    // Extract the "current state" from previous snapshot
    // If previous was a modification, use the "after" state
    // If previous was a submission, use the snapshot directly
    const previousState = previousActivityType === 'entry_modified' 
      ? previousSnapshot.after 
      : previousSnapshot;
    
    // Safety check - if previous state is missing required fields, treat as new
    if (!previousState || previousState.class_count === undefined) {
      console.warn('Previous snapshot missing required fields, treating as new entry');
      const { error } = await supabase.from('trial_activity_log').insert({
        trial_id: trialId,
        activity_type: 'entry_submitted',
        entry_id: entryId,
        snapshot_data: currentSnapshot,
        user_name: entryData.handler_name
      });
      
      if (error) {
        console.error('Failed to log entry submission:', error);
      } else {
        console.log('✅ Logged entry submission to journal (previous snapshot incomplete)');
      }
      return;
    }
    
    // Compare key fields
    const classCountChanged = previousState.class_count !== currentSnapshot.class_count;
    const feeChanged = Number(previousState.total_fee) !== Number(currentSnapshot.total_fee);
    
    // If nothing changed, don't log
    if (!classCountChanged && !feeChanged) {
      console.log('⏭️ No changes detected, skipping journal log');
      return;
    }
    
   // Determine what was added/removed (with safety checks)
    const previousClasses = previousState.classes || [];
    const currentClasses = currentSnapshot.classes || [];
    
    const previousClassNames = new Set(previousClasses.map((c: any) => c.name));
    const currentClassNames = new Set(currentClasses.map(c => c.name));
    
    const addedClasses = currentClasses
      .filter(c => !previousClassNames.has(c.name))
      .map(c => c.name);
    
    const removedClasses = previousClasses
      .filter((c: any) => !currentClassNames.has(c.name))
      .map((c: any) => c.name);
    
    // Something changed - log as MODIFICATION
    const modificationSnapshot: any = {
      handler_name: entryData.handler_name,
      dog_call_name: entryData.dog_call_name,
      cwags_number: entryData.cwags_number,
      before: {
        class_count: previousState.class_count,
        total_fee: previousState.total_fee,
        classes: previousClasses
      },
      after: {
        class_count: currentSnapshot.class_count,
        total_fee: currentSnapshot.total_fee,
        classes: currentClasses
      },
      change: {
        class_count_delta: currentSnapshot.class_count - previousState.class_count,
        fee_delta: currentSnapshot.total_fee - previousState.total_fee,
        ...(addedClasses.length > 0 && { added_classes: addedClasses }),
        ...(removedClasses.length > 0 && { removed_classes: removedClasses })
      }
    };
    
    const { error } = await supabase.from('trial_activity_log').insert({
      trial_id: trialId,
      activity_type: 'entry_modified',
      entry_id: entryId,
      snapshot_data: modificationSnapshot,
      user_name: entryData.handler_name
    });
    
    if (error) {
      console.error('Failed to log entry modification:', error);
    } else {
      console.log('✅ Logged entry MODIFICATION to journal');
      console.log('   Changes:', {
        added: addedClasses,
        removed: removedClasses,
        fee_delta: modificationSnapshot.change.fee_delta
      });
    }
    
  } catch (error) {
    console.error('Error logging entry activity:', error);
  }
}

/**
 * Log fees waived with snapshot
 */
export async function logFeesWaived(
  trialId: string,
  entryId: string,
  entryInfo: {
    handler_name: string;
    dog_call_name: string;
    amount_owed: number;
    reason: string;
  }
) {
  try {
    const supabase = getSupabaseBrowser();
    
    const snapshot = {
      handler_name: entryInfo.handler_name,
      dog_call_name: entryInfo.dog_call_name,
      amount_waived: entryInfo.amount_owed,
      reason: entryInfo.reason
    };
    
    const { error } = await supabase.from('trial_activity_log').insert({
      trial_id: trialId,
      activity_type: 'fees_waived',
      entry_id: entryId,
      snapshot_data: snapshot,
      user_name: entryInfo.handler_name
    });
    
    if (error) {
      console.error('Failed to log fee waiver:', error);
    } else {
      console.log('✅ Logged fee waiver to journal with snapshot');
    }
  } catch (error) {
    console.error('Error logging fee waiver:', error);
  }
}