'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/mainLayout';
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
} from '@/components/ui/dropdownMenu';
import { 
  Calendar,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Copy,
  Trash2,
  Users,
  MapPin,
  FileText,
  AlertCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { simpleTrialOperations } from '@/lib/trialOperationsSimple';

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

export default function DraftTrialsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [trials, setTrials] = useState<Trial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDraftTrials();
  }, []);

  const loadDraftTrials = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await simpleTrialOperations.getAllTrials();
      
      if (!result.success) {
        throw new Error(result.error?.toString() || 'Failed to load trials');
      }

      // Filter for draft trials only
      const draftTrials = (result.data || []).filter((trial: Trial) => trial.trial_status === 'draft');
      setTrials(draftTrials);

    } catch (err) {
      console.error('Error loading draft trials:', err);
      setError(err instanceof Error ? err.message : 'Failed to load draft trials');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredTrials = trials.filter(trial => 
    trial.trial_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trial.club_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trial.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Trials', href: '/dashboard/trials' },
    { label: 'Draft Trials' }
  ];

  if (loading) {
    return (
      <MainLayout 
        title="Draft Trials"
        breadcrumbItems={breadcrumbItems}
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-600" />
            <p className="text-gray-600">Loading draft trials...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Draft Trials"
      breadcrumbItems={breadcrumbItems}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Draft Trials</h1>
            <p className="text-gray-600 mt-1">
              Trials in draft status - {trials.length} found
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard/trials')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>All Trials</span>
            </Button>
            <Link href="/dashboard/trials/create">
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Create Trial</span>
              </Button>
            </Link>
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
                  onClick={loadDraftTrials}
                  className="ml-auto"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search draft trials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Trials List */}
        <div className="grid gap-6">
          {filteredTrials.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {trials.length === 0 ? 'No draft trials found' : 'No trials match your search'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {trials.length === 0 
                    ? 'All trials have been published or there are no trials yet.' 
                    : 'Try adjusting your search criteria.'}
                </p>
                {trials.length === 0 && (
                  <div className="space-x-2">
                    <Link href="/dashboard/trials/create">
                      <Button>Create New Trial</Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      onClick={() => router.push('/dashboard/trials')}
                    >
                      View All Trials
                    </Button>
                  </div>
                )}
                {trials.length > 0 && filteredTrials.length === 0 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchTerm('')}
                  >
                    Clear Search
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
                      <Badge className="bg-gray-100 text-gray-800 border-gray-200 border">
                        Draft
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
                      <p className="text-gray-600 mb-1">Status</p>
                      <Badge variant="secondary">
                        Ready to Configure
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      Created {formatDate(trial.created_at)}
                    </p>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Users className="h-4 w-4 mr-1" />
                        Setup
                      </Button>
                      <Link href={`/dashboard/trials/${trial.id}`}>
                        <Button size="sm">
                          Continue Setup
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