import { redirect } from 'next/navigation';

type LegacyEntryPageProps = {
  params: Promise<{ trialId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Compatibility redirect for entry links created with the former duplicated
 * `/entries/entries/[trialId]` route. The entry form has one canonical
 * implementation at `/entries/[trialId]`.
 */
export default async function LegacyEntryPage({ params, searchParams }: LegacyEntryPageProps) {
  const [{ trialId }, query] = await Promise.all([params, searchParams]);
  const targetQuery = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      value.forEach((item) => targetQuery.append(key, item));
    } else if (value !== undefined) {
      targetQuery.set(key, value);
    }
  }

  const queryString = targetQuery.toString();
  redirect(`/entries/${encodeURIComponent(trialId)}${queryString ? `?${queryString}` : ''}`);
}
