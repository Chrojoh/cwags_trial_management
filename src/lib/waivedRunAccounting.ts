export interface RunAccountingSource {
  regular_runs?: number | null;
  feo_runs?: number | null;
  waived_regular_runs?: number | null;
  waived_feo_runs?: number | null;
}

export interface RunAccountingSummary {
  paidRegularRuns: number;
  paidFeoRuns: number;
  waivedRegularRuns: number;
  waivedFeoRuns: number;
  allRegularRuns: number;
}

const safeRunCount = (value: number | null | undefined) => {
  const count = Number(value || 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

/**
 * Summarizes accepted run buckets produced by the financial read model.
 * Waitlisted, withdrawn, and awaiting-acceptance selections never enter these buckets.
 */
export function summarizeRunAccounting(
  competitors: RunAccountingSource[]
): RunAccountingSummary {
  const summary = competitors.reduce(
    (totals, competitor) => ({
      paidRegularRuns: totals.paidRegularRuns + safeRunCount(competitor.regular_runs),
      paidFeoRuns: totals.paidFeoRuns + safeRunCount(competitor.feo_runs),
      waivedRegularRuns:
        totals.waivedRegularRuns + safeRunCount(competitor.waived_regular_runs),
      waivedFeoRuns: totals.waivedFeoRuns + safeRunCount(competitor.waived_feo_runs),
    }),
    { paidRegularRuns: 0, paidFeoRuns: 0, waivedRegularRuns: 0, waivedFeoRuns: 0 }
  );

  return {
    ...summary,
    allRegularRuns: summary.paidRegularRuns + summary.waivedRegularRuns,
  };
}

/** C-WAGS charges apply to accepted waived regular runs, never waived FEO runs. */
export function calculateWaivedRegularCwagsCost(
  summary: Pick<RunAccountingSummary, 'waivedRegularRuns'>,
  regularCwagsFee: number
) {
  const fee = Number(regularCwagsFee || 0);
  return summary.waivedRegularRuns * (Number.isFinite(fee) && fee > 0 ? fee : 0);
}

export interface WaiverValueSource {
  waived_amount?: number | null;
  amount_paid?: number | null;
  amount_owed?: number | null;
}

/**
 * Returns the entry value actually forgiven after payments covering billable
 * dogs are accounted for. This works for fully and partially waived handlers.
 */
export function calculateNetWaivedAmount(source: WaiverValueSource) {
  const grossWaivedValue = Math.max(0, Number(source.waived_amount || 0));
  const paymentTowardWaived = Math.max(
    0,
    Number(source.amount_paid || 0) - Number(source.amount_owed || 0)
  );
  return Math.max(0, grossWaivedValue - paymentTowardWaived);
}
