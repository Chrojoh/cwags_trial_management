// src/lib/financialOperations.ts
import { getSupabaseBrowser } from './supabaseBrowser';
import { calculateSelectionFees, getCwagsOwnerKey } from './financialRules';
import { isBillableSelection } from './selectionStatus';
import { fetchAllPages, fetchInBatches } from './supabasePagination';

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
  entry_ids?: string[];
  handler_name: string;
  cwags_number: string;
  dog_call_name: string;
  dogs?: Array<{
    dog_call_name: string;
    cwags_number: string;
    regular_runs: number;
    feo_runs: number;
  }>;
  regular_runs: number;
  feo_runs: number;
  waived_regular_runs: number; // ADD THIS
  waived_feo_runs: number; // ADD THIS
  amount_owed: number;
  amount_paid: number;
  payment_history?: PaymentTransaction[];
  fees_waived: boolean;
  has_waived_entries?: boolean;
  has_billable_entries?: boolean;
  waived_amount?: number;
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
            updated_at: new Date().toISOString(),
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
            notes: expense.notes,
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
      const { error } = await supabase.from('trial_expenses').delete().eq('id', expenseId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting expense:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Get competitor financial summary with payment history
  // Get competitor financial summary grouped by owner
  // COMPLETE REPLACEMENT for getCompetitorFinancials in src/lib/financialOperations.ts

  async getCompetitorFinancials(trialId: string): Promise<OperationResult<CompetitorFinancial[]>> {
    try {
      const entries = await fetchAllPages<any>((from, to) =>
        supabase
          .from('entries')
          .select(
            `
        id,
        handler_name,
        dog_call_name,
        cwags_number,
        amount_owed,
        amount_paid,
        fees_waived,
        waiver_reason,
        entry_selections!entry_selections_entry_id_fkey (
          id,
          entry_type,
          fee,
          entry_status
        )
      `
          )
          .eq('trial_id', trialId)
          .order('id')
          .range(from, to)
      );

      // Get payment history
      const entryIds = (entries || []).map((e: any) => e.id);
      const payments = entryIds.length
        ? await fetchInBatches<any>(entryIds, (idsForRequest, from, to) =>
            supabase
              .from('entry_payment_transactions')
              .select('*')
              .in('entry_id', idsForRequest)
              .order('payment_date', { ascending: false })
              .range(from, to)
          )
        : [];

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
        const activeSelections = selections.filter((s: any) =>
          isBillableSelection(s.entry_status)
        );

        // Skip if no active entries
        if (activeSelections.length === 0 && !paymentsByEntry[entry.id]) return;

        // This remains a compatibility grouping key until an explicit owner/account ID exists.
        const ownerId = getCwagsOwnerKey(entry.cwags_number, entry.handler_name);

        if (!ownerGroups[ownerId]) {
          ownerGroups[ownerId] = {
            handler_name: entry.handler_name,
            owner_id: ownerId,
            dogs: [],
            entry_ids: [],
            regular_runs: 0,
            feo_runs: 0,
            waived_regular_runs: 0,
            waived_feo_runs: 0,
            amount_owed: 0,
            amount_paid: 0,
            payment_history: [],
            fees_waived: false,
            waived_entry_count: 0,
            billable_entry_count: 0,
            waiver_reason: null,
            waived_amount: 0,
          };
        }

        // Count runs separately for paid vs waived
        const regularRuns = activeSelections.filter((s: any) => s.entry_type === 'regular').length;
        const feoRuns = activeSelections.filter((s: any) => s.entry_type === 'feo').length;

        // CRITICAL: Track waived runs separately from paid runs
        if (entry.fees_waived) {
          ownerGroups[ownerId].waived_regular_runs += regularRuns;
          ownerGroups[ownerId].waived_feo_runs += feoRuns;
          ownerGroups[ownerId].waived_entry_count += 1;
        } else {
          ownerGroups[ownerId].regular_runs += regularRuns;
          ownerGroups[ownerId].feo_runs += feoRuns;
          ownerGroups[ownerId].billable_entry_count += 1;
        }

        // Add dog to owner's list
        ownerGroups[ownerId].dogs.push({
          dog_call_name: entry.dog_call_name,
          cwags_number: entry.cwags_number,
          regular_runs: regularRuns,
          feo_runs: feoRuns,
        });

        ownerGroups[ownerId].entry_ids.push(entry.id);

        // Sum up fees
        const calculatedOwed = calculateSelectionFees(selections);
        const storedOwed = Number(entry.amount_owed || 0);
        const effectiveAmountOwed = storedOwed > 0 ? storedOwed : calculatedOwed;
        if (entry.fees_waived) {
          ownerGroups[ownerId].waived_amount += calculatedOwed;
        }
        ownerGroups[ownerId].amount_owed += entry.fees_waived
          ? 0
          : effectiveAmountOwed;

        // Collect payment history
        const entryPayments = paymentsByEntry[entry.id] || [];
        ownerGroups[ownerId].payment_history.push(...entryPayments);

        // Track if any fees are waived
        if (entry.fees_waived) {
          ownerGroups[ownerId].waiver_reason = entry.waiver_reason;
        }
      });

      // Convert to array and calculate totals
      const competitorFinancials: CompetitorFinancial[] = Object.values(ownerGroups).map(
        (group: any) => {
          // Calculate total paid from all payment history
          const totalPaid = group.payment_history.reduce(
            (sum: number, p: any) => sum + p.amount,
            0
          );

          // Sort payment history by date (newest first)
          group.payment_history.sort(
            (a: any, b: any) =>
              new Date(b.payment_date || 0).getTime() - new Date(a.payment_date || 0).getTime()
          );

          return {
            entry_id: group.entry_ids[0],
            entry_ids: group.entry_ids,
            handler_name: group.handler_name,
            dog_call_name: `${group.dogs.length} dog${group.dogs.length > 1 ? 's' : ''}`,
            cwags_number: `Owner ID: ${String(group.owner_id).replace(/^(cwags:|handler:)/, '')}`,
            dogs: group.dogs,
            regular_runs: group.regular_runs,
            feo_runs: group.feo_runs,
            waived_regular_runs: group.waived_regular_runs,
            waived_feo_runs: group.waived_feo_runs,
            amount_owed: group.amount_owed,
            amount_paid: totalPaid,
            payment_history: group.payment_history,
            fees_waived: group.billable_entry_count === 0 && group.waived_entry_count > 0,
            has_waived_entries: group.waived_entry_count > 0,
            has_billable_entries: group.billable_entry_count > 0,
            waived_amount: group.waived_amount,
            waiver_reason: group.waiver_reason,
          };
        }
      );

      // Sort by handler name
      competitorFinancials.sort((a, b) => a.handler_name.localeCompare(b.handler_name));

      return { success: true, data: competitorFinancials };
    } catch (error) {
      console.error('Error loading competitor financials:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

};
