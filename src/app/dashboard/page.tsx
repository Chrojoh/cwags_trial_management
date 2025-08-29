'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { simpleTrialOperations } from '@/lib/trial-operations-simple';
import { 
  Calendar,
  Users,
  Trophy,
  Clock,
  Plus,
  FileText,
  Settings,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Eye
} from 'lucide-react';

interface DashboardStats {
  totalTrials: number;
  activeTrials: number;
  upcomingTrials: number;
  totalEntries: number;
}

interface Trial {
  id: string;
  trial_name: string;
  start_date: string;
  end_date: string;
  trial_status: string;
  club_name: string;
  location: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, getDisplayInfo } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTrials: 0,
    activeTrials: 0,
    upcomingTrials: 0,
    totalEntries: 0
  });
  const [recentTrials, setRecentTrials] = useState<Trial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userInfo = getDisplayInfo();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all trials
      const trialsResult = await simpleTrialOperations.getAllTrials();
      
      if (!trialsResult.success) {
        throw new Error('Failed to load trials data');
      }

      const trials = trialsResult.data || [];
      
      // Calculate stats from real data
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const totalTrials = trials.length;
      const activeTrials = trials.filter((trial: Trial) => trial.trial_status === 'active').length;
      const upcomingTrials = trials.filter((trial: Trial) => 
        trial.start_date > todayStr && 
        ['draft', 'published'].includes(trial.trial_status)
      ).length;

      setStats({
        totalTrials,
        activeTrials,
        upcomingTrials,
        totalEntries: 0 // Will implement entry counting later
      });

      // Get recent trials (last 5)
      const recentTrials = trials
        .sort((a: Trial, b: Trial) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
        .slice(0, 5);
      
      setRecentTrials(recentTrials);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <MainLayout title="Dashboard">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                Welcome back, {userInfo?.fullName || 'User'}!
              </h1>
              <p className="text-blue-100 text-lg">
                {userInfo?.club_name && `${userInfo.club_name} • `}
                {userInfo?.role === 'administrator' ? 'Administrator' : 'Trial Secretary'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-sm">
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
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadDashboardData}
                  className="ml-auto"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Trials
              </CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalTrials}</div>
              <p className="text-xs text-gray-600 mt-1">
                All time trials managed
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Trials
              </CardTitle>
              <Trophy className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.activeTrials}</div>
              <p className="text-xs text-gray-600 mt-1">
                Currently running
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Upcoming Trials
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.upcomingTrials}</div>
              <p className="text-xs text-gray-600 mt-1">
                Scheduled ahead
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Entries
              </CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalEntries}</div>
              <p className="text-xs text-gray-600 mt-1">
                Competition entries
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Trials */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span>Recent Trials</span>
              </CardTitle>
              <CardDescription>
                Latest trial events and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentTrials.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No trials created yet</p>
                  <Button 
                    onClick={() => router.push('/dashboard/trials/create')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Trial
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTrials.map((trial) => (
                    <div key={trial.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{trial.trial_name}</h3>
                        <p className="text-sm text-gray-600">{trial.club_name}</p>
                        <p className="text-sm text-gray-500">{trial.location}</p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(trial.start_date)}
                          {trial.start_date !== trial.end_date && (
                            <span> - {formatDate(trial.end_date)}</span>
                          )}
                        </p>
                        <Badge className={getStatusColor(trial.trial_status)}>
                          {trial.trial_status}
                        </Badge>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push(`/dashboard/trials/${trial.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-blue-600" />
                <span>Quick Actions</span>
              </CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
  <Button 
    onClick={() => router.push('/dashboard/trials/create')}
    className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white"
  >
    <Plus className="h-4 w-4 mr-2" />
    Create New Trial
  </Button>
  
  <Button 
    variant="outline" 
    onClick={() => router.push('/dashboard/trials')}
    className="w-full justify-start"
  >
    <Calendar className="h-4 w-4 mr-2" />
    Manage Trials
  </Button>
</CardContent>
          </Card>
        </div>

        {/* Recent Activity Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>
              Latest system activity and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.totalTrials === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">No recent activity</p>
                  <p className="text-sm text-gray-400 mt-1">Activity will appear here as you use the system</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">System ready for trial management</span>
                    <span className="text-gray-400 ml-auto">Just now</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600">Database connected successfully</span>
                    <span className="text-gray-400 ml-auto">Few moments ago</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">User {userInfo?.fullName} logged in</span>
                    <span className="text-gray-400 ml-auto">Recently</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}