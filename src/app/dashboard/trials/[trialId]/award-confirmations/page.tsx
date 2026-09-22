'use client';

import { useParams } from 'next/navigation';
import { BadgeCheck } from 'lucide-react';
import MainLayout from '@/components/layout/mainLayout';
import RibbonExpenseEstimator from '@/components/financials/RibbonExpenseEstimator';

export default function AwardConfirmationsPage() {
  const params = useParams();
  const trialId = params.trialId as string;

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Trials', href: '/dashboard/trials' },
    { label: 'Award Confirmations' },
  ];

  return (
    <MainLayout title="Award Confirmations" breadcrumbItems={breadcrumbItems}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <BadgeCheck className="h-8 w-8 text-orange-600" />
            Award Confirmations
          </h1>
          <p className="mt-1 text-gray-600">
            Verify title and Ace awards detected from saved scores before publishing winners.
          </p>
        </div>

        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Use this page before posting this trial&apos;s results to the Tracker. The calculation combines
          prior Tracker totals with this trial&apos;s saved results, so posting first can count the current
          results twice.
        </div>

        <RibbonExpenseEstimator trialId={trialId} awardsOnly />
      </div>
    </MainLayout>
  );
}
