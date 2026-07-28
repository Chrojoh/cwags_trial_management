export type SelectionStatus = string | null | undefined;

export const normalizeSelectionStatus = (status: SelectionStatus) =>
  String(status ?? '').trim().toLowerCase();

export const WAITLISTED_SELECTION_STATUS = 'waitlisted' as const;
export const NON_ACTIVE_SELECTION_STATUSES = ['waitlisted', 'withdrawn'] as const;
export const NON_ACTIVE_SELECTION_STATUSES_FILTER = '("waitlisted","withdrawn")';

const INACTIVE_SELECTION_STATUSES = new Set<string>(NON_ACTIVE_SELECTION_STATUSES);
const NON_SCORABLE_SELECTION_STATUSES = new Set<string>([
  ...NON_ACTIVE_SELECTION_STATUSES,
  'no_show',
  'absent',
  'scratched',
]);

// Keep concern-specific predicates even while their rules match. This prevents
// callers from recreating status rules when one concern changes later.
export const isActiveSelection = (status: SelectionStatus): boolean =>
  !INACTIVE_SELECTION_STATUSES.has(normalizeSelectionStatus(status));

export const isRunningOrderSelection = (status: SelectionStatus): boolean =>
  isActiveSelection(status);

export const isScorableSelection = (status: SelectionStatus): boolean =>
  !NON_SCORABLE_SELECTION_STATUSES.has(normalizeSelectionStatus(status));

export const isBillableSelection = (status: SelectionStatus): boolean =>
  isActiveSelection(status);

export const isWaitlistedSelection = (status: SelectionStatus): boolean =>
  normalizeSelectionStatus(status) === WAITLISTED_SELECTION_STATUS;

export const isWithdrawnSelection = (status: SelectionStatus): boolean =>
  normalizeSelectionStatus(status) === 'withdrawn';

export const isAbsentSelection = (status: SelectionStatus): boolean => {
  const normalizedStatus = normalizeSelectionStatus(status);
  return normalizedStatus === 'no_show' || normalizedStatus === 'absent';
};
