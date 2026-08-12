const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse a database DATE value as a local calendar date at noon.
 * Noon avoids the previous/next-day rollover caused by parsing YYYY-MM-DD
 * as UTC midnight.
 */
export function parseDateOnly(value: string | null | undefined): Date {
  const match = value?.match(DATE_ONLY_PATTERN);
  if (!match) return new Date(Number.NaN);

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
}

export function localDateOnly(value: Date = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function compareDateOnly(a: string, b: string): number {
  return a.localeCompare(b);
}

/** Return the calendar-date portion of either a DATE or ISO timestamp. */
export function dateOnlyValue(value: string | null | undefined): string {
  const match = value?.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || '';
}

export function formatDateOnly(
  value: string | null | undefined,
  locale = 'en-US',
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = parseDateOnly(dateOnlyValue(value));
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(locale, options);
}
