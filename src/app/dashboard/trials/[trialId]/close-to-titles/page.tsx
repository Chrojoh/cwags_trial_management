// src/app/dashboard/trials/[trialId]/close-to-titles/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import MainLayout from '@/components/layout/mainLayout';
import CloseToTitlesReport from '@/components/trials/CloseToTitlesReport';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

export default function CloseToTitlesPage() {
  const params = useParams();
  const router = useRouter();
  const trialId = params.trialId as string;
  const [trialName, setTrialName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrialName();
  }, [trialId]);

  const loadTrialName = async () => {
    try {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from('trials')
        .select('trial_name')
        .eq('id', trialId)
        .single();

      if (error) throw error;
      setTrialName(data.trial_name);
    } catch (err) {
      console.error('Error loading trial name:', err);
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Trials', href: '/dashboard/trials' },
    { label: trialName || 'Trial', href: `/dashboard/trials/${trialId}` },
    { label: 'Close to Titles Report' },
  ];

  return (
    <MainLayout title="Close to Titles Report" breadcrumbItems={breadcrumbItems}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Close to Titles Report</h1>
            <p className="text-gray-600 mt-1">{trialName || 'Loading...'}</p>
          </div>
          <Button variant="outline" onClick={() => router.push(`/dashboard/trials/${trialId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trial
          </Button>
        </div>

        {/* Report Component */}
        <CloseToTitlesReport trialId={trialId} trialName={trialName} />
      </div>
    </MainLayout>
  );
}
