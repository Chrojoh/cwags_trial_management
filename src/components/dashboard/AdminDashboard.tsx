// src/components/dashboard/AdminDashboard.tsx
// UPDATED VERSION - Handles enhanced alerts with trial IDs and makes them clickable

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Calendar,
  Users,
  Trophy,
  TrendingUp,
  BarChart3,
  Plus,
  Calculator,
  UserCheck,
  UserPlus,
  Settings,
  CheckCircle,
  Eye,
  Database,
  AlertCircle,
  ChevronRight,
  Upload
} from 'lucide-react';

// UPDATED INTERFACE to support enhanced alerts
interface EnhancedAlert {
  type: 'warning' | 'info';
  message: string;
  trialId?: string;          // Optional trial ID for navigation
  trialName?: string;        // Optional trial name for display
  closingDate?: string;      // Optional closing date
}

interface AdminDashboardProps {
  stats: {
    totalTrials: number;
    activeTrials: number;
    upcomingTrials: number;
    totalUsers: number;
    totalRegistryEntries: number;
  };
  recentTrials: Array<{
    id: string;
    trial_name: string;
    start_date: string;
    end_date: string;
    trial_status: string;
    club_name: string;
    location: string;
  }>;
  allTrials: Array<{
    id: string;
    trial_name: string;
    start_date: string;
  }>;
  alerts: EnhancedAlert[];  // CHANGED TYPE
}

export default function AdminDashboard({ stats, recentTrials, allTrials, alerts }: AdminDashboardProps) {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-orange-100 text-orange-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const parts = dateString.split('-');
    const date = new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
      12, 0, 0
    );
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // NEW FUNCTION: Handle clicking on an alert that has a trial ID
  const handleAlertClick = (alert: EnhancedAlert) => {
    if (alert.trialId) {
      router.push(`/dashboard/trials/${alert.trialId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* System Alerts - ENHANCED */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <Card 
              key={idx} 
              className={`
                ${alert.type === 'warning' ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'}
                ${alert.trialId ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
              `}
              onClick={() => handleAlertClick(alert)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1">
                    <AlertCircle className={`h-5 w-5 flex-shrink-0 ${alert.type === 'warning' ? 'text-orange-600' : 'text-blue-600'}`} />
                    <span className={`${alert.type === 'warning' ? 'text-orange-900' : 'text-blue-900'} font-medium`}>
                      {alert.message}
                    </span>
                  </div>
                  {alert.trialId && (
                    <ChevronRight className={`h-5 w-5 ${alert.type === 'warning' ? 'text-orange-600' : 'text-blue-600'}`} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Trials
            </CardTitle>
            <Trophy className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.totalTrials}</div>
            <p className="text-xs text-gray-500 mt-1">All trials in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Trials
            </CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.activeTrials}</div>
            <p className="text-xs text-gray-500 mt-1">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Upcoming Trials
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.upcomingTrials}</div>
            <p className="text-xs text-gray-500 mt-1">Scheduled ahead</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.totalUsers}</div>
            <p className="text-xs text-gray-500 mt-1">System users</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trials */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-orange-600" />
              Recent Trials
            </CardTitle>
            <CardDescription>Latest trials in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTrials.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No trials found</p>
            ) : (
              <div className="space-y-3">
                {recentTrials.map((trial) => (
                  <div 
                    key={trial.id}
                    onClick={() => router.push(`/dashboard/trials/${trial.id}`)}
                    className="flex items-center justify-between p-4 border rounded-lg hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                        {trial.trial_name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-600">
                          {formatDate(trial.start_date)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {trial.club_name}
                        </span>
                      </div>
                    </div>
                    <Badge className={getStatusColor(trial.trial_status)}>
                      {trial.trial_status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2 text-orange-600" />
              Admin Quick Actions
            </CardTitle>
            <CardDescription>Administrative tools and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => router.push('/dashboard/trials/create')}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Trial
            </Button>

            <Button 
              onClick={() => router.push('/dashboard/admin/import-trial')}
              variant="outline"
              className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Trial from Excel
            </Button>

            <Button 
              onClick={() => router.push('/dashboard/trials')}
              variant="outline"
              className="w-full"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Manage Trials
            </Button>

            <Button 
              onClick={() => router.push('/dashboard/registry')}
              variant="outline"
              className="w-full"
            >
              <Database className="h-4 w-4 mr-2" />
              Manage Registry
            </Button>

            <Button 
              onClick={() => router.push('/dashboard/judges')}
              variant="outline"
              className="w-full"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Manage Judges
            </Button>

            <Button 
              onClick={() => router.push('/dashboard/users')}
              variant="outline"
              className="w-full"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Manage Users
            </Button>

            <Button 
              onClick={() => router.push('/dashboard/assignments')}
              variant="outline"
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              Trial Assignments
            </Button>

           <Button 
              onClick={() => router.push('/dashboard/admin/class-statistics')}
              variant="outline"
              className="w-full"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              CLass Summary
            </Button>
           
           <Button 
              onClick={() => router.push('/dashboard/admin/all-trials-summary')}
              variant="outline"
              className="w-full"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              All Trials Summary
            </Button>

            {allTrials.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Trial Analysis Tools</p>
                <Select onValueChange={(trialId) => router.push(`/dashboard/admin/judge-compensation/${trialId}`)}>
                  <SelectTrigger className="w-full">
                    <div className="flex items-center">
                      <Calculator className="h-4 w-4 mr-2" />
                      <span>Judge Compensation Analysis</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {allTrials.map((trial) => (
                      <SelectItem key={trial.id} value={trial.id}>
                        {trial.trial_name} - {formatDate(trial.start_date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}