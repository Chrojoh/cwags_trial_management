'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Calendar,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Copy,
  Trash2,
  Users,
  MapPin,
  Clock,
  TrendingUp,
  FileText,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { simpleTrialOperations } from '@/lib/trial-operations-simple';

interface Trial {
  id: string;
  trial_name: string;
  club_name: string;
  location: string;
  start_date: string;
  end_date: string;
  trial_status: string;
  entries_open: boolean;
  max_entries_per_day: number;
  trial_secretary: string;
  secretary_email: string;
  created_at: string;
}

type TrialStatus = 'draft' | 'published' | 'active' | 'completed' | 'cancelled';

interface Stats {
  total: number;
  draft: number;
  published: number;
  active: number;
  completed: number;
}

export default function TrialsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrialStatus | 'all'>('all');
  const [trials, setTrials] = useState<Trial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    draft: 0,
    published: 0,
    active: 0,
    completed: 0
  });

  useEffect(() => {
    loadTrials();
  }, []);

  const loadTrials = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await simpleTrialOperations.getAllTrials();
      
      if (!result.success) {
        throw new Error(result.error?.toString() || 'Failed to load trials');
      }

      const trialsData = result.data || [];
      setTrials(trialsData);

      // Calculate stats from real data
      const stats = {
        total: trialsData.length,
        draft: trialsData.filter((t: Trial) => t.trial_status === 'draft').length,
        published: trialsData.filter((t: Trial) => t.trial_status === 'published').length,
        active: trialsData.filter((t: Trial) => t.trial_status === 'active').length,
        completed: trialsData.filter((t: Trial) => t.trial_status === 'completed').length,
      };
      
      setStats(stats);

    } catch (err) {
      console.error('Error loading trials:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trials');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: TrialStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'published':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: TrialStatus) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'published':
        return 'Published';
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredTrials = trials.filter(trial => {
    const matchesSearch = 
      trial.trial_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trial.club_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trial.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || trial.trial_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Trials' }
  ];

  if (loading) {
    return (
      <MainLayout 
        title="Trial Management"
        breadcrumbItems={breadcrumbItems}
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading trials...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Trial Management"
      breadcrumbItems={breadcrumbItems}
    >
      <div className="space-y-6">
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
                  onClick={loadTrials}
                  className="ml-auto"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Trials</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Draft</p>
                  <p className="text-2xl font-bold text-gray-500">{stats.draft}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Published</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.published}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.completed}</p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search trials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Filter className="h-4 w-4" />
                  <span>Status: {statusFilter === 'all' ? 'All' : getStatusLabel(statusFilter as TrialStatus)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                  All Trials
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('draft')}>
                  Draft
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('published')}>
                  Published
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                  Active
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('completed')}>
                  Completed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Link href="/dashboard/trials/create">
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Create Trial</span>
            </Button>
          </Link>
        </div>

        {/* Trials List */}
        <div className="grid gap-6">
          {filteredTrials.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {trials.length === 0 ? 'No trials found' : 'No trials match your filters'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {trials.length === 0 
                    ? 'Get started by creating your first trial.' 
                    : 'Try adjusting your search or filter criteria.'}
                </p>
                {trials.length === 0 && (
                  <Link href="/dashboard/trials/create">
                    <Button>Create Your First Trial</Button>
                  </Link>
                )}
                {trials.length > 0 && filteredTrials.length === 0 && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredTrials.map((trial) => (
              <Card key={trial.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div>
                        <CardTitle className="text-lg">{trial.trial_name}</CardTitle>
                        <CardDescription className="flex items-center space-x-2 mt-1">
                          <span>{trial.club_name}</span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{trial.location}</span>
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge className={`${getStatusColor(trial.trial_status as TrialStatus)} border`}>
                        {getStatusLabel(trial.trial_status as TrialStatus)}
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/trials/${trial.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/trials/${trial.id}`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Trial
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate Trial
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Trial
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Dates</p>
                      <p className="font-medium">
                        {formatDate(trial.start_date)}
                        {trial.start_date !== trial.end_date && ` - ${formatDate(trial.end_date)}`}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-gray-600 mb-1">Max Entries</p>
                      <p className="font-medium">
                        {trial.max_entries_per_day} per day
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-gray-600 mb-1">Secretary</p>
                      <p className="font-medium">{trial.trial_secretary}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-600 mb-1">Entry Status</p>
                      <Badge variant={trial.entries_open ? 'default' : 'secondary'}>
                        {trial.entries_open ? 'Open' : 'Closed'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      Created {formatDate(trial.created_at)}
                    </p>
                    
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push(`/dashboard/trials/${trial.id}/entries`)}
                      >
                      <Users className="h-4 w-4 mr-1" />
Entries
</Button>
<Link href={`/dashboard/trials/${trial.id}/summary`}>
 <Button variant="outline" size="sm">
   <FileText className="h-4 w-4 mr-1" />
   Reports
 </Button>
</Link>
<Link href={`/dashboard/trials/${trial.id}`}>
 <Button size="sm">
   Manage
 </Button>
</Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}