export type TrialEntryStatus = 'draft' | 'open' | 'closed';

type EntryWindow = {
  entry_status?: TrialEntryStatus | null;
  entry_open_at?: string | null;
};

export const getEffectiveEntryStatus = (
  trial: EntryWindow,
  now: Date = new Date(),
): TrialEntryStatus => {
  if (trial.entry_status === 'closed') return 'closed';
  if (trial.entry_status === 'open') return 'open';

  const opensAt = trial.entry_open_at ? new Date(trial.entry_open_at) : null;
  if (opensAt && !Number.isNaN(opensAt.getTime()) && now.getTime() >= opensAt.getTime()) {
    return 'open';
  }

  return 'draft';
};

export const formatEntryCountdown = (milliseconds: number): string => {
  const remaining = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  return [
    days > 0 ? `${days}d` : null,
    `${String(hours).padStart(2, '0')}h`,
    `${String(minutes).padStart(2, '0')}m`,
    `${String(seconds).padStart(2, '0')}s`,
  ].filter(Boolean).join(' ');
};
