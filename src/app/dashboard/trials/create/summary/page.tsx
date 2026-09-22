import { redirect } from 'next/navigation';

interface LegacyTrialSummaryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Compatibility endpoint for bookmarks created by the retired creation wizard.
 *
 * Trial creation now finishes on the trial workspace so the secretary can review
 * the draft, generate the application, obtain approval, and publish in order.
 * Keeping the old publishing screen reachable would bypass that progression.
 */
export default async function LegacyTrialSummaryPage({
  searchParams,
}: LegacyTrialSummaryPageProps) {
  const query = await searchParams;
  const rawTrialId = query.trial;
  const trialId = Array.isArray(rawTrialId) ? rawTrialId[0] : rawTrialId;

  if (trialId) {
    redirect(`/dashboard/trials/${encodeURIComponent(trialId)}`);
  }

  redirect('/dashboard/trials');
}
