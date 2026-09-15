export function hasCompleteEntrySnapshot(type: string, snapshot: Record<string, any> | null | undefined) {
  if (!snapshot) return false;
  if (type === 'entry_created') return Array.isArray(snapshot.classes);
  if (type === 'entry_modified') return Array.isArray(snapshot.after?.classes);
  if (type === 'entry_deleted') return Array.isArray(snapshot.classes);
  return false;
}

export function journalPaymentDate(value: string | null | undefined) {
  if (!value) return 'Not recorded';
  const date = String(value).slice(0, 10);
  const parts = date.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return 'Not recorded';
  return new Date(parts[0], parts[1] - 1, parts[2], 12).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}
