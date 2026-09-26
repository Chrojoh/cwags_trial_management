export interface FinancialIdentityEntry {
  id: string;
  cwags_number?: string | null;
  handler_name?: string | null;
  handler_email?: string | null;
  handler_phone?: string | null;
}

const normalizeText = (value: string | null | undefined) =>
  String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();

const normalizePhone = (value: string | null | undefined) =>
  String(value || '').replace(/\D/g, '');

export const officialOwnerKey = (cwagsNumber: string | null | undefined) => {
  const match = String(cwagsNumber || '').trim().match(/^(\d{2}-\d{4})-\d{2}$/);
  return match ? `cwags:${match[1]}` : null;
};

export const handlerIdentityKey = (entry: FinancialIdentityEntry) => {
  const email = normalizeText(entry.handler_email);
  const phone = normalizePhone(entry.handler_phone);
  const name = normalizeText(entry.handler_name);
  return `identity:${email}|${phone}|${name}`;
};

/**
 * Resolve every dog entry to one handler key. Official YY-OOOO identifiers win.
 * A pending dog joins that official account when its verified contact identity
 * matches another dog; otherwise pending dogs remain grouped by contact identity.
 */
export function resolveFinancialOwnerKeys<T extends FinancialIdentityEntry>(entries: T[]) {
  const officialByIdentity = new Map<string, string>();

  entries.forEach((entry) => {
    const official = officialOwnerKey(entry.cwags_number);
    if (official) officialByIdentity.set(handlerIdentityKey(entry), official);
  });

  return new Map(
    entries.map((entry) => {
      const identity = handlerIdentityKey(entry);
      return [entry.id, officialOwnerKey(entry.cwags_number) || officialByIdentity.get(identity) || identity];
    })
  );
}

export function financialOwnerLabel(ownerKey: string) {
  if (ownerKey.startsWith('cwags:')) return `Owner ID: ${ownerKey.slice('cwags:'.length)}`;
  return 'Pending registration';
}
