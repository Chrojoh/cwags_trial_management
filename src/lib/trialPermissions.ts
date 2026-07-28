export const TRIAL_COLLABORATOR_ROLES = ['secretary', 'assistant', 'read_only'] as const;

export type TrialCollaboratorRole = (typeof TRIAL_COLLABORATOR_ROLES)[number];
export type EffectiveTrialRole = 'administrator' | 'owner' | TrialCollaboratorRole | 'legacy_secretary';

export const TRIAL_PERMISSIONS = [
  'view_trial',
  'edit_trial',
  'manage_entries',
  'manage_waitlist',
  'manage_running_order',
  'score_entries',
  'manage_financials',
  'generate_reports',
  'generate_trial_application',
  'manage_collaborators',
  'delete_trial',
] as const;

export type TrialPermission = (typeof TRIAL_PERMISSIONS)[number];

const ALL_PERMISSIONS = new Set<TrialPermission>(TRIAL_PERMISSIONS);
const SECRETARY_PERMISSIONS = new Set<TrialPermission>([
  'view_trial', 'edit_trial', 'manage_entries', 'manage_waitlist', 'manage_running_order',
  'score_entries', 'manage_financials', 'generate_reports', 'generate_trial_application',
]);

const ROLE_PERMISSIONS: Record<EffectiveTrialRole, ReadonlySet<TrialPermission>> = {
  administrator: ALL_PERMISSIONS,
  owner: ALL_PERMISSIONS,
  secretary: SECRETARY_PERMISSIONS,
  legacy_secretary: SECRETARY_PERMISSIONS,
  assistant: new Set([
    'view_trial', 'manage_entries', 'manage_waitlist', 'manage_running_order', 'score_entries',
  ]),
  read_only: new Set(['view_trial', 'generate_reports', 'generate_trial_application']),
};

export function hasTrialPermission(role: EffectiveTrialRole | null, permission: TrialPermission) {
  return role !== null && ROLE_PERMISSIONS[role].has(permission);
}

export function isTrialCollaboratorRole(value: unknown): value is TrialCollaboratorRole {
  return typeof value === 'string' && TRIAL_COLLABORATOR_ROLES.includes(value as TrialCollaboratorRole);
}
