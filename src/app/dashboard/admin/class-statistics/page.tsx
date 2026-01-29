// src/app/dashboard/admin/class-statistics/page.tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/mainLayout';
import ClassJudgeStatistics from '@/components/ClassJudgeStatistics';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function ClassStatisticsPage() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold mb-2">Class Judge Statistics</h1>
          <p className="text-gray-600">
            Select a class to view all judges who have judged it, with detailed performance statistics
          </p>
        </div>

        <ClassJudgeStatistics />
      </div>
    </MainLayout>
  );
}