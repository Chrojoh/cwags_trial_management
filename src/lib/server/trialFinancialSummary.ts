import 'server-only';

import { calculateSelectionFees, getCwagsOwnerKey } from '@/lib/financialRules';
import { isBillableSelection } from '@/lib/selectionStatus';
import { fetchAllPages, fetchInBatches } from '@/lib/supabasePagination';
import { getServiceRoleClient } from '@/lib/apiAuth';
import type { CompetitorFinancial, PaymentTransaction } from '@/lib/financialOperations';

interface EntryRow {
  id: string;
  handler_name: string;
  handler_email: string | null;
  handler_phone: string | null;
  dog_call_name: string;
  cwags_number: string;
  amount_owed: number | null;
  amount_paid: number | null;
  entry_status: string | null;
  fees_waived: boolean | null;
  waiver_reason: string | null;
  is_judge_volunteer: boolean | null;
}

interface SelectionRow {
  id: string;
  entry_id: string;
  trial_round_id: string;
  entry_type: string | null;
  fee: number | null;
  entry_status: string | null;
}

interface OwnerGroup {
  handler_name: string;
  owner_id: string;
  dogs: NonNullable<CompetitorFinancial['dogs']>;
  entry_ids: string[];
  regular_runs: number;
  feo_runs: number;
  waived_regular_runs: number;
  waived_feo_runs: number;
  amount_owed: number;
  payment_history: PaymentTransaction[];
  waived_entry_count: number;
  billable_entry_count: number;
  waiver_reason: string | null;
  waived_amount: number;
}

export interface TrialFinancialReadModel {
  competitors: CompetitorFinancial[];
  entries: EntryRow[];
  selections: SelectionRow[];
}

const uniqueIds = (values: string[]) => [...new Set(values.filter(Boolean))];

export async function loadTrialFinancialReadModel(
  trialId: string
): Promise<TrialFinancialReadModel> {
  const db = getServiceRoleClient();
  const entries = await fetchAllPages<EntryRow>((from, to) =>
    db
      .from('entries')
      .select(
        'id,handler_name,handler_email,handler_phone,dog_call_name,cwags_number,amount_owed,amount_paid,entry_status,fees_waived,waiver_reason,is_judge_volunteer'
      )
      .eq('trial_id', trialId)
      .order('id')
      .range(from, to)
  );
  const entryIds = uniqueIds(entries.map((entry) => entry.id));
  const [selections, payments] = await Promise.all([
    fetchInBatches<SelectionRow>(entryIds, (ids, from, to) =>
      db
        .from('entry_selections')
        .select('id,entry_id,trial_round_id,entry_type,fee,entry_status')
        .in('entry_id', ids)
        .order('id')
        .range(from, to)
    ),
    fetchInBatches<PaymentTransaction>(entryIds, (ids, from, to) =>
      db
        .from('entry_payment_transactions')
        .select('*')
        .in('entry_id', ids)
        .order('payment_date', { ascending: false })
        .range(from, to)
    ),
  ]);

  const selectionsByEntry = new Map<string, SelectionRow[]>();
  selections.forEach((selection) => {
    const list = selectionsByEntry.get(selection.entry_id) || [];
    list.push(selection);
    selectionsByEntry.set(selection.entry_id, list);
  });
  const paymentsByEntry = new Map<string, PaymentTransaction[]>();
  payments.forEach((payment) => {
    const list = paymentsByEntry.get(payment.entry_id) || [];
    list.push(payment);
    paymentsByEntry.set(payment.entry_id, list);
  });

  const groups = new Map<string, OwnerGroup>();
  entries.forEach((entry) => {
    const entrySelections = selectionsByEntry.get(entry.id) || [];
    const activeSelections = entrySelections.filter((selection) =>
      isBillableSelection(selection.entry_status)
    );
    if (activeSelections.length === 0 && !paymentsByEntry.has(entry.id)) return;

    const ownerId = getCwagsOwnerKey(entry.cwags_number, entry.handler_name);
    const group = groups.get(ownerId) || {
      handler_name: entry.handler_name,
      owner_id: ownerId,
      dogs: [],
      entry_ids: [],
      regular_runs: 0,
      feo_runs: 0,
      waived_regular_runs: 0,
      waived_feo_runs: 0,
      amount_owed: 0,
      payment_history: [],
      waived_entry_count: 0,
      billable_entry_count: 0,
      waiver_reason: null,
      waived_amount: 0,
    };

    const regularRuns = activeSelections.filter((selection) => selection.entry_type === 'regular').length;
    const feoRuns = activeSelections.filter((selection) => selection.entry_type === 'feo').length;
    if (entry.fees_waived) {
      group.waived_regular_runs += regularRuns;
      group.waived_feo_runs += feoRuns;
      group.waived_entry_count += 1;
      group.waiver_reason = entry.waiver_reason;
    } else {
      group.regular_runs += regularRuns;
      group.feo_runs += feoRuns;
      group.billable_entry_count += 1;
    }
    group.dogs.push({
      dog_call_name: entry.dog_call_name,
      cwags_number: entry.cwags_number,
      regular_runs: regularRuns,
      feo_runs: feoRuns,
    });
    group.entry_ids.push(entry.id);

    const calculatedOwed = calculateSelectionFees(entrySelections);
    const storedOwed = Number(entry.amount_owed || 0);
    const effectiveOwed = storedOwed > 0 ? storedOwed : calculatedOwed;
    if (entry.fees_waived) group.waived_amount += calculatedOwed;
    else group.amount_owed += effectiveOwed;
    group.payment_history.push(...(paymentsByEntry.get(entry.id) || []));
    groups.set(ownerId, group);
  });

  const competitors = [...groups.values()].map<CompetitorFinancial>((group) => {
    group.payment_history.sort(
      (a, b) =>
        new Date(b.payment_date || 0).getTime() - new Date(a.payment_date || 0).getTime()
    );
    return {
      entry_id: group.entry_ids[0],
      entry_ids: group.entry_ids,
      handler_name: group.handler_name,
      dog_call_name: `${group.dogs.length} dog${group.dogs.length > 1 ? 's' : ''}`,
      cwags_number: `Owner ID: ${group.owner_id.replace(/^(cwags:|handler:)/, '')}`,
      dogs: group.dogs,
      regular_runs: group.regular_runs,
      feo_runs: group.feo_runs,
      waived_regular_runs: group.waived_regular_runs,
      waived_feo_runs: group.waived_feo_runs,
      amount_owed: group.amount_owed,
      amount_paid: group.payment_history.reduce((sum, payment) => sum + Number(payment.amount), 0),
      payment_history: group.payment_history,
      fees_waived: group.billable_entry_count === 0 && group.waived_entry_count > 0,
      has_waived_entries: group.waived_entry_count > 0,
      has_billable_entries: group.billable_entry_count > 0,
      waived_amount: group.waived_amount,
      waiver_reason: group.waiver_reason || undefined,
    };
  });
  competitors.sort((a, b) => a.handler_name.localeCompare(b.handler_name));
  return { competitors, entries, selections };
}
