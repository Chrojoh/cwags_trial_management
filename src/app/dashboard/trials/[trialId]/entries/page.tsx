'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getDivisionColor } from '@/lib/divisionUtils';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdownMenu';
import { 
  Users,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  Calendar,
  Trophy,
  List
} from 'lucide-react';
import { simpleTrialOperations, type EntryData } from '@/lib/trialOperationsSimple';

interface Trial {
  id: string;
  trial_name: string;
  club_name: string;
  location: string;
  start_date: string;
  end_date: string;
  trial_status: string;
}

interface EntryWithSelections extends EntryData {
  entry_selections?: {
    id: string;
    trial_round_id: string;
    entry_type: string;
    fee: number;
    running_position: number;
    entry_status: string;
    trial_rounds?: {
      round_number: number;
      judge_name: string;
      trial_classes?: {
        class_name: string;
        class_level: string;
        trial_days?: {
          day_number: number;
          trial_date: string;
        };
      };
    };
  }[];
}

interface GroupedEntry {
  cwags_number: string;
  handler_name: string;
  dog_call_name: string;
  handler_email: string;
  handler_phone: string;
  entry_status: string;
  payment_status: string;
  submitted_at: string;
  is_junior_handler: boolean;
  total_fee: number;
  entry_selections: {
    id: string;
    trial_round_id: string;
    entry_type: string;
    fee: number;
    running_position: number;
    entry_status: string;
    class_display: string;
    day_info: string;
  }[];
  entry_ids: string[]; // Track all entry IDs for this team
}

interface EntryStats {
  total: number;
  byStatus: Record<string, number>;
  byPayment: Record<string, number>;
}

export default function TrialEntriesPage() {
  const router = useRouter();
  const params = useParams();
  const trialId = params.trialId as string;

  const [trial, setTrial] = useState<Trial | null>(null);
  const [entries, setEntries] = useState<EntryWithSelections[]>([]);
  const [groupedEntries, setGroupedEntries] = useState<GroupedEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<GroupedEntry[]>([]);
  const [entryStats, setEntryStats] = useState<EntryStats>({
    total: 0,
    byStatus: {},
    byPayment: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (trialId) {
      loadTrialAndEntries();
    }
  }, [trialId]);

  useEffect(() => {
    processGroupedEntries();
  }, [entries]);

  useEffect(() => {
    filterEntries();
  }, [groupedEntries, searchTerm, statusFilter]);

  const loadTrialAndEntries = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading trial and entries for ID:', trialId);

      // Load trial info
      const trialResult = await simpleTrialOperations.getTrial(trialId);
      if (!trialResult.success) {
        throw new Error('Failed to load trial data');
      }

      // Load entries with selections
      const entriesResult = await simpleTrialOperations.getTrialEntriesWithSelections(trialId);
      if (!entriesResult.success) {
        throw new Error('Failed to load entries data');
      }

      // Load entry statistics
      const statsResult = await simpleTrialOperations.getTrialEntryStats(trialId);
      const stats = statsResult.success ? statsResult.data : { total: 0, byStatus: {}, byPayment: {} };

      setTrial(trialResult.data);
      setEntries(entriesResult.data || []);
      setEntryStats(stats);

      console.log('Trial and entries loaded successfully');

    } catch (err) {
      console.error('Error loading trial and entries:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trial and entries');
    } finally {
      setLoading(false);
    }
  };

  const processGroupedEntries = () => {
    // Group entries by cwags_number
    const grouped: Record<string, GroupedEntry> = {};

    entries.forEach(entry => {
      const cwagsNumber = entry.cwags_number;
      
      if (!grouped[cwagsNumber]) {
        // Create new grouped entry
        grouped[cwagsNumber] = {
          cwags_number: cwagsNumber,
          handler_name: entry.handler_name,
          dog_call_name: entry.dog_call_name,
          handler_email: entry.handler_email,
          handler_phone: entry.handler_phone,
          entry_status: entry.entry_status,
          payment_status: entry.payment_status,
          submitted_at: entry.submitted_at || '',
          is_junior_handler: entry.is_junior_handler,
          total_fee: 0,
          entry_selections: [],
          entry_ids: []
        };
      }

      // Add this entry's ID to the group
      grouped[cwagsNumber].entry_ids.push(entry.id!);

      // Add all entry selections to the group
      if (entry.entry_selections) {
        entry.entry_selections.forEach(selection => {
          const dayInfo = selection.trial_rounds?.trial_classes?.trial_days 
            ? `Day ${selection.trial_rounds.trial_classes.trial_days.day_number}`
            : 'Day 1';
          
          const className = selection.trial_rounds?.trial_classes?.class_name || 'Unknown Class';
          const roundNumber = selection.trial_rounds?.round_number || 1;
          
          grouped[cwagsNumber].entry_selections.push({
            id: selection.id,
            trial_round_id: selection.trial_round_id,
            entry_type: selection.entry_type,
            fee: selection.fee,
            running_position: selection.running_position,
            entry_status: selection.entry_status,
            class_display: `${className} - R${roundNumber}`,
            day_info: dayInfo
          });

          // Add to total fee
          grouped[cwagsNumber].total_fee += selection.fee;
        });
      }
    });

    setGroupedEntries(Object.values(grouped));
  };

  const filterEntries = () => {
    let filtered = groupedEntries;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(entry => 
        entry.handler_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.dog_call_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.cwags_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.handler_email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(entry => entry.entry_status === statusFilter);
    }

    setFilteredEntries(filtered);
  };

  const handleEditEntry = (entry: GroupedEntry) => {
    // Route to the entry form with cwags_number pre-filled to trigger auto-lookup
    router.push(`/entries/${trialId}?cwags=${entry.cwags_number}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'withdrawn':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'waitlisted':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEntryTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'feo':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  if (loading) {
    return (
      <MainLayout title="Loading Entries...">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-600" />
              <p className="text-gray-600">Loading entries...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !trial) {
    return (
      <MainLayout title="Entries Not Found">
        <div className="max-w-7xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Trial not found or you may not have permission to view entries.'}
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => router.push('/dashboard/trials')}>
              Back to Trials
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Trials', href: '/dashboard/trials' },
    { label: trial.trial_name, href: `/dashboard/trials/${trialId}` },
    { label: 'Entries' }
  ];

  return (
    <MainLayout 
      title={`${trial.trial_name} - Entries`}
      breadcrumbItems={breadcrumbItems}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Trial Header */}
        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-orange-900">{trial.trial_name}</CardTitle>
                <CardDescription className="text-orange-700 mt-2">
                  <span className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(trial.start_date)} - {formatDate(trial.end_date)}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{entryStats.total} Entries</span>
                    </span>
                  </span>
                </CardDescription>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" onClick={() => router.push(`/dashboard/trials/${trialId}`)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Trial Details
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Entry Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{entryStats.total}</div>
              <div className="text-sm text-gray-600">Total Entries</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {entryStats.byStatus?.confirmed || 0}
              </div>
              <div className="text-sm text-gray-600">Confirmed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {entryStats.byStatus?.submitted || 0}
              </div>
              <div className="text-sm text-gray-600">Pending Review</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {entryStats.byPayment?.paid || 0}
              </div>
              <div className="text-sm text-gray-600">Paid</div>
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Actions and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Filter className="h-4 w-4" />
                  <span>Status: {statusFilter === 'all' ? 'All' : statusFilter}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                  All Entries
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('submitted')}>
                  Submitted
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('confirmed')}>
                  Confirmed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('withdrawn')}>
                  Withdrawn
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('waitlisted')}>
                  Waitlisted
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex space-x-2">
            <Button onClick={() => {
              const entryLink = `${window.location.origin}/entries/${trialId}`;
              navigator.clipboard.writeText(entryLink).then(() => {
                alert('Entry link copied to clipboard!');
              }).catch(() => {
                alert(`Entry link: ${entryLink}`);
              });
            }}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Entry Link
            </Button>
          </div>
        </div>

        {/* Grouped Entries List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-orange-600" />
              <span>Trial Entries ({filteredEntries.length} teams)</span>
            </CardTitle>
            <CardDescription>
              Entries grouped by registration number (handler-dog teams)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {groupedEntries.length === 0 ? 'No entries yet' : 'No entries match your filters'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {groupedEntries.length === 0 
                    ? 'Entries will appear here once competitors register.' 
                    : 'Try adjusting your search or filter criteria.'}
                </p>
                {groupedEntries.length > 0 && filteredEntries.length === 0 && (
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
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEntries.map((entry) => (
                  <div key={entry.cwags_number} className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
                    {/* Team Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {entry.handler_name} • {entry.dog_call_name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Registration: {entry.cwags_number}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={`${getStatusColor(entry.entry_status)} border`}>
                              {entry.entry_status}
                            </Badge>
                            <Badge className={getPaymentStatusColor(entry.payment_status)}>
                              {entry.payment_status}
                            </Badge>
                            {entry.is_junior_handler && (
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                Junior Handler
                              </Badge>
                            )}
                            {/* Show unique divisions from entry selections */}
{(() => {
  const divisions = [...new Set(
    entry.entry_selections
      .map((sel: any) => sel.division)
      .filter((div: any) => div != null)
  )];
  
  return divisions.map((division: string) => (
    <Badge 
      key={division}
      className={
        division === 'A' ? 'bg-orange-100 text-orange-700 border-orange-300' :
        division === 'B' ? 'bg-green-100 text-green-700 border-green-300' :
        division === 'TO' ? 'bg-purple-100 text-purple-700 border-purple-300' :
        division === 'JR' ? 'bg-blue-100 text-blue-700 border-blue-300' :
        'bg-gray-100 text-gray-700'
      }
    >
      Div {division}
    </Badge>
  ));
})()}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 mb-1">Contact</p>
                            <div className="space-y-1">
                              <p className="flex items-center space-x-1">
                                <Mail className="h-3 w-3" />
                                <span>{entry.handler_email}</span>
                              </p>
                              <p className="flex items-center space-x-1">
                                <Phone className="h-3 w-3" />
                                <span>{entry.handler_phone}</span>
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-gray-600 mb-1">Entry Summary</p>
                            <p className="font-medium">
                              {entry.entry_selections.length} class selections
                            </p>
                            <p className="text-lg font-semibold text-green-600">
                              Total: {formatCurrency(entry.total_fee)}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-gray-600 mb-1">Submitted</p>
                            <p className="font-medium">
                              {formatDate(entry.submitted_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditEntry(entry)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit Entry
                        </Button>
                      </div>
                    </div>

                    {/* Class Selections */}
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium text-gray-700 mb-3">Class Selections:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {entry.entry_selections.map((selection, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Badge className={`${getEntryTypeColor(selection.entry_type)} border text-xs`}>
                                {selection.entry_type.toUpperCase()}
                              </Badge>
                              <div>
                                <p className="text-sm font-medium">
                                  {selection.day_info} - {selection.class_display}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Running Position: #{selection.running_position} • Status: {selection.entry_status}
                                </p>
                              </div>
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(selection.fee)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}