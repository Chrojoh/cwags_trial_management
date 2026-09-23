import type { TrialPermission } from '@/lib/trialPermissions';

export type TrialWorkflowKey =
  | 'details'
  | 'collaborators'
  | 'application'
  | 'copy-entry-link'
  | 'entries'
  | 'time-calculator'
  | 'financials'
  | 'close-to-titles'
  | 'live-event'
  | 'summary'
  | 'award-confirmations'
  | 'post-trial-package'
  | 'journal';

export interface TrialWorkflowItem {
  key: TrialWorkflowKey;
  label: string;
  cardLabel?: string;
  permission: TrialPermission;
  route?: string;
  action?: 'copy-entry-link';
}

// This is the single workflow order used by both the sidebar and trial cards.
// Keep setup first, trial-day work in the middle, and closing/audit work last.
export const TRIAL_WORKFLOW: readonly TrialWorkflowItem[] = [
  { key: 'details', label: 'Trial Details', permission: 'view_trial', route: '' },
  {
    key: 'collaborators',
    label: 'Trial Collaborators',
    permission: 'manage_collaborators',
    route: '/collaborators',
  },
  {
    key: 'application',
    label: 'Trial Application',
    permission: 'generate_trial_application',
    route: '/trial-application',
  },
  {
    key: 'copy-entry-link',
    label: 'Copy Entry Link',
    permission: 'manage_entries',
    action: 'copy-entry-link',
  },
  { key: 'entries', label: 'Entries', permission: 'manage_entries', route: '/entries' },
  {
    key: 'time-calculator',
    label: 'Time Calculator',
    cardLabel: 'Time Calculator',
    permission: 'manage_financials',
    route: '/time-calculator',
  },
  {
    key: 'financials',
    label: 'Financial Summary',
    permission: 'manage_financials',
    route: '/financials',
  },
  {
    key: 'close-to-titles',
    label: 'Close to Titles',
    permission: 'generate_reports',
    route: '/close-to-titles',
  },
  {
    key: 'live-event',
    label: 'Running Order & Score Entry',
    cardLabel: 'Running Order & Scores',
    permission: 'manage_running_order',
    route: '/live-event',
  },
  { key: 'summary', label: 'Summary', permission: 'generate_reports', route: '/summary' },
  {
    key: 'award-confirmations',
    label: 'Award Confirmations',
    permission: 'generate_reports',
    route: '/award-confirmations',
  },
  {
    key: 'post-trial-package',
    label: 'Post-Trial Submission',
    permission: 'generate_reports',
    route: '/post-trial-package',
  },
  {
    key: 'journal',
    label: 'Activity Journal',
    permission: 'view_trial',
    route: '/journal',
  },
] as const;

export function trialWorkflowHref(trialId: string, item: TrialWorkflowItem) {
  return item.route === undefined ? undefined : `/dashboard/trials/${trialId}${item.route}`;
}
