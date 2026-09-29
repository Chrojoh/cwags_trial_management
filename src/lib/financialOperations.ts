// src/lib/financialOperations.ts
import { getSupabaseBrowser } from './supabaseBrowser';
import {
  calculateSelectionFees,
  getCwagsOwnerKey,
  shouldIncludeEntryInFinancialSummary,
} from './financialRules';
import { isBillableSelection } from './selectionStatus';
import { fetchAllPages, fetchInBatches } from './supabasePagination';
import { financialOwnerLabel, resolveFinancialOwnerKeys } from './financialOwnerIdentity';

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
  created_at?: string;
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
    entry_id: string;
    dog_call_name: string;
    cwags_number: string;
    entry_status: string | null;
    regular_runs: number;
    feo_runs: number;
    waitlisted_runs: number;
    amount_owed: number;
    quoted_fee: number;
    fees_waived: boolean;
    waiver_reason?: string | null;
    is_judge_volunteer: boolean;
  }>;
  regular_runs: number;
  feo_runs: number;
  waived_regular_runs: number;
  waived_feo_runs: number;
  amount_owed: number;
  quoted_fee?: number;
  quoted_regular_runs?: number;
  quoted_feo_runs?: number;
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
        handler_email,
        handler_phone,
        dog_call_name,
        cwags_number,
        amount_owed,
        amount_paid,
        entry_status,
        fees_waived,
        waiver_reason,
        is_judge_volunteer,
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

      // Group entries by owner (using registration year plus the owner digits).
      const ownerGroups: Record<string, any> = {};
      const ownerKeys = resolveFinancialOwnerKeys(entries || []);

      (entries || []).forEach((entry: any) => {
        const selections = entry.entry_selections || [];
        const activeSelections = selections.filter((s: any) =>
          isBillableSelection(s.entry_status)
        );

        if (
          !shouldIncludeEntryInFinancialSummary(
            entry.entry_status,
            activeSelections.length,
            Boolean(paymentsByEntry[entry.id])
          )
        ) return;

        // This remains a compatibility grouping key until an explicit owner/account ID exists.
        const ownerId = ownerKeys.get(entry.id) || getCwagsOwnerKey(entry.cwags_number, entry.handler_name);

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
            quoted_fee: 0,
            quoted_regular_runs: 0,
            quoted_feo_runs: 0,
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
        const regularRuns = activeSelections.filter(
          (selection: any) => String(selection.entry_type || '').toLowerCase() === 'regular'
        ).length;
        const feoRuns = activeSelections.filter(
          (selection: any) => String(selection.entry_type || '').toLowerCase() === 'feo'
        ).length;
        const waitlistedRuns = selections.filter(
          (s: any) => String(s.entry_status || '').toLowerCase() === 'waitlisted'
        ).length;
        const calculatedOwed = calculateSelectionFees(selections);
        const awaitingAcceptance = entry.entry_status === 'submitted';

        // Track accepted waived runs separately so financial reporting can apply
        // the C-WAGS charge to regular runs without treating them as entry revenue.
        if (awaitingAcceptance) {
          ownerGroups[ownerId].quoted_regular_runs += regularRuns;
          ownerGroups[ownerId].quoted_feo_runs += feoRuns;
          if (!entry.fees_waived) ownerGroups[ownerId].quoted_fee += calculatedOwed;
        } else if (entry.fees_waived) {
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
          entry_id: entry.id,
          dog_call_name: entry.dog_call_name,
          cwags_number: entry.cwags_number,
          entry_status: entry.entry_status,
          regular_runs: regularRuns,
          feo_runs: feoRuns,
          waitlisted_runs: waitlistedRuns,
          amount_owed: entry.fees_waived ? 0 : Number(entry.amount_owed || calculatedOwed),
          quoted_fee: awaitingAcceptance && !entry.fees_waived ? calculatedOwed : 0,
          fees_waived: Boolean(entry.fees_waived),
          waiver_reason: entry.waiver_reason,
          is_judge_volunteer: Boolean(entry.is_judge_volunteer),
        });

        ownerGroups[ownerId].entry_ids.push(entry.id);

        // Sum up fees
        const storedOwed = Number(entry.amount_owed || 0);
        const effectiveAmountOwed = storedOwed > 0 ? storedOwed : calculatedOwed;
        if (!awaitingAcceptance && entry.fees_waived) {
          ownerGroups[ownerId].waived_amount += calculatedOwed;
        }
        if (!awaitingAcceptance) {
          ownerGroups[ownerId].amount_owed += entry.fees_waived
            ? 0
            : effectiveAmountOwed;
        }

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
              String(b.payment_date || '').localeCompare(String(a.payment_date || ''))
          );

          return {
            entry_id: group.entry_ids[0],
            entry_ids: group.entry_ids,
            handler_name: group.handler_name,
            dog_call_name: `${group.dogs.length} dog${group.dogs.length > 1 ? 's' : ''}`,
            cwags_number: financialOwnerLabel(group.owner_id),
            dogs: group.dogs,
            regular_runs: group.regular_runs,
            feo_runs: group.feo_runs,
            waived_regular_runs: group.waived_regular_runs,
            waived_feo_runs: group.waived_feo_runs,
            amount_owed: group.amount_owed,
            quoted_fee: group.quoted_fee,
            quoted_regular_runs: group.quoted_regular_runs,
            quoted_feo_runs: group.quoted_feo_runs,
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
