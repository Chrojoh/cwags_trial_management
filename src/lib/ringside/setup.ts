export type RowCallTrialDetails = {
  id: string;
  trial_name: string | null;
  location: string | null;
  start_date: string | null;
};

export function rowCallNumberForTrial(trial: RowCallTrialDetails) {
  const date = String(trial.start_date || '').replaceAll('-', '') || 'TRIAL';
  const suffix = String(trial.id || '')
    .replaceAll('-', '')
    .slice(0, 8)
    .toUpperCase();
  return `CW-${date}-${suffix}`;
}

export function rowCallShowValues(trial: RowCallTrialDetails) {
  return {
    public_show_number: rowCallNumberForTrial(trial),
    title: String(trial.trial_name || 'C-Wags Trial').trim(),
    show_date: trial.start_date || null,
    venue: String(trial.location || '').trim(),
  };
}
