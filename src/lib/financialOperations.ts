// src/lib/financialOperations.ts
import { getSupabaseBrowser } from './supabaseBrowser';

const supabase = getSupabaseBrowser();

interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TrialExpense {
  id?: string;
  trial_id: string;
  expense_category: string;
  description?: string;
  amount: number;
  paid_to?: string;
  payment_date?: string;
  notes?: string;
}

export interface PaymentTransaction {
  id?: string;
  entry_id: string;
  amount: number;
  payment_method?: string;
  payment_received_by?: string;
  payment_date?: string;
  notes?: string;
}

export interface CompetitorFinancial {
  entry_id: string;
  entry_ids?: string[]; // All entry IDs for this owner
  handler_name: string;
  cwags_number: string;
  dog_call_name: string;
  dogs?: Array<{ // List of all dogs
    dog_call_name: string;
    cwags_number: string;
    regular_runs: number;
    feo_runs: number;
  }>;
  regular_runs: number;
  feo_runs: number;
  amount_owed: number;
  amount_paid: number;
  payment_history?: PaymentTransaction[];
  fees_waived: boolean;
  waiver_reason?: string;
}

export const financialOperations = {
  // Get all expenses for a trial
  async getTrialExpenses(trialId: string): Promise<OperationResult> {
    try {
      const { data, error } = await supabase
        .from('trial_expenses')
        .select('*')
        .eq('trial_id', trialId)
        .order('expense_category');

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error loading expenses:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Save or update expense
  async saveExpense(expense: TrialExpense): Promise<OperationResult> {
    try {
      if (expense.id) {
        const { data, error } = await supabase
          .from('trial_expenses')
          .update({
            expense_category: expense.expense_category,
            description: expense.description,
            amount: expense.amount,
            paid_to: expense.paid_to,
            payment_date: expense.payment_date,
            notes: expense.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', expense.id)
          .select()
          .single();

        if (error) throw error;
        return { success: true, data };
      } else {
        const { data, error } = await supabase
          .from('trial_expenses')
          .insert({
            trial_id: expense.trial_id,
            expense_category: expense.expense_category,
            description: expense.description,
            amount: expense.amount,
            paid_to: expense.paid_to,
            payment_date: expense.payment_date,
            notes: expense.notes
          })
          .select()
          .single();

        if (error) throw error;
        return { success: true, data };
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Delete expense
  async deleteExpense(expenseId: string): Promise<OperationResult> {
    try {
      const { error } = await supabase
        .from('trial_expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting expense:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Get competitor financial summary with payment history
 // Get competitor financial summary grouped by owner
async getCompetitorFinancials(trialId: string): Promise<OperationResult<CompetitorFinancial[]>> {
  try {
    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select(`
        id,
        handler_name,
        dog_call_name,
        cwags_number,
        amount_owed,
        amount_paid,
        fees_waived,
        waiver_reason,
        entry_selections (
          id,
          entry_type,
          fee,
          entry_status
        )
      `)
      .eq('trial_id', trialId);

    if (entriesError) throw entriesError;

    // Get payment history
    const entryIds = (entries || []).map((e: any) => e.id);
    const { data: payments } = await supabase
      .from('entry_payment_transactions')
      .select('*')
      .in('entry_id', entryIds)
      .order('payment_date', { ascending: false });

    const paymentsByEntry: Record<string, PaymentTransaction[]> = {};
    (payments || []).forEach((payment: any) => {
      if (!paymentsByEntry[payment.entry_id]) {
        paymentsByEntry[payment.entry_id] = [];
      }
      paymentsByEntry[payment.entry_id].push(payment);
    });

    // Group entries by owner (using middle 4 digits of C-WAGS number)
    const ownerGroups: Record<string, any> = {};

    (entries || []).forEach((entry: any) => {
      const selections = entry.entry_selections || [];
      const activeSelections = selections.filter((s: any) => s.entry_status !== 'withdrawn');
      
      // Skip if no active entries
      if (activeSelections.length === 0 && !paymentsByEntry[entry.id]) return;

      // Extract owner ID from C-WAGS number (middle 4 digits)
      const cwagsMatch = entry.cwags_number?.match(/^\d{2}-(\d{4})-\d{2}$/);
      const ownerId = cwagsMatch ? cwagsMatch[1] : entry.handler_name; // Fallback to handler name
      
      if (!ownerGroups[ownerId]) {
        ownerGroups[ownerId] = {
          handler_name: entry.handler_name,
          owner_id: ownerId,
          dogs: [],
          entry_ids: [],
          regular_runs: 0,
          feo_runs: 0,
          amount_owed: 0,
          amount_paid: 0,
          payment_history: [],
          fees_waived: false,
          waiver_reason: null
        };
      }

      // Add dog to owner's list
      ownerGroups[ownerId].dogs.push({
        dog_call_name: entry.dog_call_name,
        cwags_number: entry.cwags_number,
        regular_runs: activeSelections.filter((s: any) => s.entry_type === 'regular').length,
        feo_runs: activeSelections.filter((s: any) => s.entry_type === 'feo').length
      });

      ownerGroups[ownerId].entry_ids.push(entry.id);

      // Sum up runs
      const regularRuns = activeSelections.filter((s: any) => s.entry_type === 'regular').length;
      const feoRuns = activeSelections.filter((s: any) => s.entry_type === 'feo').length;
      ownerGroups[ownerId].regular_runs += regularRuns;
      ownerGroups[ownerId].feo_runs += feoRuns;

      // Sum up fees
      const calculatedOwed = activeSelections.reduce((sum: number, s: any) => sum + (s.fee || 0), 0);
      ownerGroups[ownerId].amount_owed += entry.fees_waived ? 0 : (entry.amount_owed || calculatedOwed);

      // Collect payment history
      const entryPayments = paymentsByEntry[entry.id] || [];
      ownerGroups[ownerId].payment_history.push(...entryPayments);
      
      // Track if any fees are waived
      if (entry.fees_waived) {
        ownerGroups[ownerId].fees_waived = true;
        ownerGroups[ownerId].waiver_reason = entry.waiver_reason;
      }
    });

    // Convert to array and calculate totals
    const competitorFinancials: CompetitorFinancial[] = Object.values(ownerGroups).map((group: any) => {
      // Calculate total paid from all payment history
      const totalPaid = group.payment_history.reduce((sum: number, p: any) => sum + p.amount, 0);
      
      // Sort payment history by date (newest first)
      group.payment_history.sort((a: any, b: any) => 
        new Date(b.payment_date || 0).getTime() - new Date(a.payment_date || 0).getTime()
      );

      return {
        entry_id: group.entry_ids[0], // Use first entry ID for actions
        entry_ids: group.entry_ids, // Keep all entry IDs
        handler_name: group.handler_name,
        dog_call_name: `${group.dogs.length} dog${group.dogs.length > 1 ? 's' : ''}`,
        cwags_number: `Owner ID: ${group.owner_id}`,
        dogs: group.dogs, // List of all dogs
        regular_runs: group.regular_runs,
        feo_runs: group.feo_runs,
        amount_owed: group.amount_owed,
        amount_paid: totalPaid,
        payment_history: group.payment_history,
        fees_waived: group.fees_waived,
        waiver_reason: group.waiver_reason
      };
    });

    // Sort by handler name
    competitorFinancials.sort((a, b) => a.handler_name.localeCompare(b.handler_name));

    return { success: true, data: competitorFinancials };
  } catch (error) {
    console.error('Error loading competitor financials:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
},

  // Add a payment transaction
  async addPaymentTransaction(transaction: PaymentTransaction): Promise<OperationResult> {
    try {
      const { data, error } = await supabase
        .from('entry_payment_transactions')
        .insert(transaction)
        .select()
        .single();

      if (error) throw error;

      // Recalculate total paid
      const { data: payments } = await supabase
        .from('entry_payment_transactions')
        .select('amount')
        .eq('entry_id', transaction.entry_id);

      const totalPaid = (payments || []).reduce((sum, p) => sum + p.amount, 0);

      await supabase
        .from('entries')
        .update({ amount_paid: totalPaid })
        .eq('id', transaction.entry_id);

      return { success: true, data };
    } catch (error) {
      console.error('Error adding payment:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Waive fees for all of an owner's entries
async waiveFees(entryIds: string | string[], reason: string): Promise<OperationResult> {
  try {
    const ids = Array.isArray(entryIds) ? entryIds : [entryIds];
    
    const { data, error } = await supabase
      .from('entries')
      .update({
        fees_waived: true,
        waiver_reason: reason,
        amount_owed: 0
      })
      .in('id', ids)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error waiving fees:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
},

// Unwaive fees for all of an owner's entries
async unwaiveFees(entryIds: string | string[]): Promise<OperationResult> {
  try {
    const ids = Array.isArray(entryIds) ? entryIds : [entryIds];
    
    // Recalculate owed amount for each entry
    for (const entryId of ids) {
      const { data: entry } = await supabase
        .from('entries')
        .select(`entry_selections (fee, entry_status)`)
        .eq('id', entryId)
        .single();

      const selections = entry?.entry_selections || [];
      const activeSelections = selections.filter((s: any) => s.entry_status !== 'withdrawn');
      const calculatedOwed = activeSelections.reduce((sum: number, s: any) => sum + (s.fee || 0), 0);

      await supabase
        .from('entries')
        .update({
          fees_waived: false,
          waiver_reason: null,
          amount_owed: calculatedOwed
        })
        .eq('id', entryId);
    }

    return { success: true };
  } catch (error) {
    console.error('Error unwaiving fees:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
};