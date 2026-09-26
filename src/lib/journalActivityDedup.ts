type ActivityRecord = {
  id?: string;
  entry_id?: string | null;
  activity_type?: string | null;
  created_at?: string | null;
  snapshot_data?: any;
};

const classSignature = (classes: any[] | null | undefined) =>
  (Array.isArray(classes) ? classes : [])
    .map((item) =>
      [
        item?.name || item?.class_name || '',
        Number(item?.round || item?.round_number || 0),
        Number(item?.day_number || 0),
        String(item?.entry_type || '').toLowerCase(),
        String(item?.entry_status || '').toLowerCase(),
        Number(item?.fee || 0),
      ].join('|')
    )
    .sort()
    .join('||');

/**
 * A public entry edit normally writes its own complete before/after record.
 * The database DELETE safety net writes an equivalent record first. Hide only
 * that redundant safety-net row; retain it whenever application logging failed.
 */
export function dedupeSelectionDeletionAudits<T extends ActivityRecord>(activities: T[]): T[] {
  return activities.filter((activity) => {
    const snapshot = activity.snapshot_data || {};
    if (activity.activity_type !== 'entry_modified' || snapshot.operation !== 'selection_delete') {
      return true;
    }

    const createdAt = Date.parse(String(activity.created_at || ''));
    const afterSignature = classSignature(snapshot.after?.classes);

    const equivalentApplicationRecord = activities.some((candidate) => {
      if (candidate === activity) return false;
      if (candidate.activity_type !== 'entry_modified') return false;
      if (candidate.entry_id !== activity.entry_id) return false;
      if (candidate.snapshot_data?.operation === 'selection_delete') return false;

      const candidateCreatedAt = Date.parse(String(candidate.created_at || ''));
      if (!Number.isFinite(createdAt) || !Number.isFinite(candidateCreatedAt)) return false;
      if (candidateCreatedAt < createdAt || candidateCreatedAt - createdAt > 30_000) return false;

      return classSignature(candidate.snapshot_data?.after?.classes) === afterSignature;
    });

    return !equivalentApplicationRecord;
  });
}
