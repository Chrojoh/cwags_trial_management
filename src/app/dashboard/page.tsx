// src/app/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/mainLayout';
import { useAuth } from '@/hooks/useAuth';
import { simpleTrialOperations } from '@/lib/trialOperationsSimple';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import SecretaryDashboard from '@/components/dashboard/SecretaryDashboard';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface Trial {
  id: string;
  trial_name: string;
  start_date: string;
  end_date: string;
  trial_status: string;
  club_name: string;
  location: string;
  entries_close_date?: string;  // ADDED: For trial closing alerts
  entry_status?: string;         // ADDED: For filtering which trials show alerts
}

// ADDED: Enhanced alert interface with trial navigation support
interface EnhancedAlert {
  type: 'warning' | 'info';
  message: string;
  trialId?: string;
  trialName?: string;
  closingDate?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();
  const { user, getDisplayInfo } = useAuth();
  const userInfo = getDisplayInfo();
 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Admin stats
  const [adminStats, setAdminStats] = useState({
    totalTrials: 0,
    activeTrials: 0,
    upcomingTrials: 0,
    totalUsers: 0,
    totalRegistryEntries: 0
  });
  const [recentTrials, setRecentTrials] = useState<Trial[]>([]);
  const [allTrials, setAllTrials] = useState<Trial[]>([]);
  const [adminAlerts, setAdminAlerts] = useState<EnhancedAlert[]>([]);  // CHANGED: Now uses EnhancedAlert type
  
  // Secretary data
  const [userTrials, setUserTrials] = useState<Trial[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (user?.role === 'administrator') {
        await loadAdminData();
      } else if (user?.role === 'trial_secretary') {
        await loadSecretaryData();
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    // Get all trials
    const trialsResult = await simpleTrialOperations.getAllTrials();
    if (!trialsResult.success) {
      throw new Error('Failed to load trials data');
    }

    const trials = trialsResult.data || [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Calculate trial stats
    const totalTrials = trials.length;
    const activeTrials = trials.filter((trial: Trial) => trial.trial_status === 'active').length;
    const upcomingTrials = trials.filter((trial: Trial) => 
      trial.start_date > todayStr && 
      ['draft', 'published'].includes(trial.trial_status)
    ).length;

    // Get total users count
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get total registry entries count
    const { count: totalRegistryEntries } = await supabase
      .from('cwags_registry')
      .select('*', { count: 'exact', head: true });

    setAdminStats({
      totalTrials,
      activeTrials,
      upcomingTrials,
      totalUsers: totalUsers || 0,
      totalRegistryEntries: totalRegistryEntries || 0
    });

    // Get recent trials (last 5)
    const recent = trials
      .sort((a: Trial, b: Trial) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
      .slice(0, 5);
    
    setRecentTrials(recent);

    // Store all trials for judge compensation dropdown
    const allTrialsSorted = [...trials].sort((a: Trial, b: Trial) => 
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
    setAllTrials(allTrialsSorted);

    // === ENHANCED: Generate admin alerts with trial details ===
    const alerts: EnhancedAlert[] = [];
    
    // Check for trials without secretary assignments
    const { data: trialsWithoutSecretary } = await supabase
      .from('trials')
      .select('id')
      .is('trial_secretary', null);
    
    if (trialsWithoutSecretary && trialsWithoutSecretary.length > 0) {
      alerts.push({
        type: 'warning',
        message: `${trialsWithoutSecretary.length} ${trialsWithoutSecretary.length === 1 ? 'trial needs' : 'trials need'} secretary assignment`
      });
    }

    // NEW: Enhanced check for trials closing entries soon
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    
    // Find trials with entries_close_date set and within the next 7 days
    const closingSoon = trials.filter((t: Trial) => {
      if (!t.entries_close_date || t.entry_status !== 'open') {
        return false;
      }
      
      const closeDate = new Date(t.entries_close_date);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      closeDate.setHours(0, 0, 0, 0);
      
      // Check if closing date is in the future and within 7 days
      return closeDate >= todayDate && closeDate <= oneWeekFromNow;
    });
    
    // Sort by closing date (soonest first)
    closingSoon.sort((a: Trial, b: Trial) => {
      const dateA = new Date(a.entries_close_date!).getTime();
      const dateB = new Date(b.entries_close_date!).getTime();
      return dateA - dateB;
    });
    
    // Create individual alerts for each trial closing soon
    closingSoon.forEach((trial: Trial) => {
      const closeDate = new Date(trial.entries_close_date!);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      closeDate.setHours(0, 0, 0, 0);
      
      const daysUntil = Math.ceil((closeDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let timeText = '';
      if (daysUntil === 0) timeText = 'today';
      else if (daysUntil === 1) timeText = 'tomorrow';
      else timeText = `in ${daysUntil} days`;
      
      alerts.push({
        type: daysUntil <= 1 ? 'warning' : 'info',
        message: `${trial.trial_name} closes entries ${timeText}`,
        trialId: trial.id,
        trialName: trial.trial_name,
        closingDate: trial.entries_close_date
      });
    });

    setAdminAlerts(alerts);
  };

  const loadSecretaryData = async () => {
    // Get trials where user is the creator
    const { data: createdTrials } = await supabase
      .from('trials')
      .select('*')
      .eq('created_by', user?.id)
      .order('start_date', { ascending: false });

    // Check trial_secretaries table for assigned trials
    const { data: assignedFromSecretaries } = await supabase
      .from('trial_secretaries')
      .select(`
        trial_id,
        trials (*)
      `)
      .eq('user_id', user?.id);

    // Check trial_assignments table for assigned trials
    const { data: assignedFromAssignments } = await supabase
      .from('trial_assignments')
      .select(`
        trial_id,
        trials (*)
      `)
      .eq('user_id', user?.id);

    // Combine all sources of trials
    const allSecretaryTrials = [
      ...(createdTrials || []),
      ...(assignedFromSecretaries?.map((at: any) => at.trials).filter(Boolean) || []),
      ...(assignedFromAssignments?.map((at: any) => at.trials).filter(Boolean) || [])
    ];

    // Remove duplicates by trial id and sort by start date
    const uniqueTrials = Array.from(
      new Map(allSecretaryTrials.map(t => [t.id, t])).values()
    ).sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

    setUserTrials(uniqueTrials);
  };

  if (loading) {
    return (
      <MainLayout title="Dashboard">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-800 rounded-lg shadow-lg text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                Welcome back, {userInfo?.first_name || 'User'}!
              </h1>
              <p className="text-orange-100 text-lg">
                {userInfo?.role === 'administrator' ? 'Administrator' : 'Trial Secretary'}
              </p>
              {userInfo?.club_name && (
                <p className="text-orange-200 text-sm mt-1">
                  {userInfo.club_name}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-orange-100 text-sm">
                {new Date().toLocaleDateString('en-CA', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadDashboardData}
                className="ml-4"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Role-Based Dashboard */}
        {user?.role === 'administrator' ? (
          <AdminDashboard 
            stats={adminStats}
            recentTrials={recentTrials}
            allTrials={allTrials}
            alerts={adminAlerts}
          />
        ) : user?.role === 'trial_secretary' ? (
          <SecretaryDashboard 
            userTrials={userTrials}
            userId={user.id}
          />
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unknown user role. Please contact support.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </MainLayout>
  );
}