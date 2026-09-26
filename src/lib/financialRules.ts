import { isBillableSelection } from '@/lib/selectionStatus';

export { isBillableSelection } from '@/lib/selectionStatus';

export function calculateSelectionFees(
  selections: Array<{ fee?: number | null; entry_status?: string | null }>
): number {
  return selections.reduce(
    (total, selection) =>
      isBillableSelection(selection.entry_status) ? total + Number(selection.fee || 0) : total,
    0
  );
}

export function calculateBalance(amountOwed: number, amountPaid: number, feesWaived: boolean) {
  return feesWaived ? 0 : Number(amountOwed || 0) - Number(amountPaid || 0);
}

export function derivePaymentStatus(
  amountOwed: number,
  amountPaid: number,
  feesWaived: boolean
): 'waived' | 'pending' | 'paid' | 'overpaid' {
  if (feesWaived) return 'waived';
  const balance = calculateBalance(amountOwed, amountPaid, false);
  if (balance < -0.005) return 'overpaid';
  if (balance <= 0.005) return 'paid';
  return 'pending';
}

export function getCwagsOwnerKey(cwagsNumber: string | null | undefined, handlerName: string) {
  const match = cwagsNumber?.match(/^(\d{2}-\d{4})-\d{2}$/);
  return match ? `cwags:${match[1]}` : `handler:${handlerName.trim().toLowerCase()}`;
}

export function shouldIncludeEntryInFinancialSummary(
  entryStatus: string | null | undefined,
  activeSelectionCount: number,
  hasPayments: boolean
) {
  if (activeSelectionCount > 0 || hasPayments) return true;

  // Keep legitimate parent entry records visible even when they temporarily or
  // historically have no billable selections. This preserves the handler's
  // complete dog list without treating an inactive entry as financially active.
  const normalizedStatus = entryStatus?.trim().toLowerCase() || '';
  return ['submitted', 'confirmed', 'entered'].includes(normalizedStatus);
}
