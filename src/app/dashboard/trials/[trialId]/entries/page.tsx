// src/app/dashboard/trials/[trialId]/entries/page.tsx
// Complete rewrite with collapsible selections and prominent email/amount display

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { calculateBalance } from '@/lib/financialUtils';
import { Input } from '@/components/ui/input';
import { financialOperations } from '@/lib/financialOperations';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { getDivisionColor } from '@/lib/divisionUtils';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Edit,
  Loader2,
  AlertCircle,
  Mail,
  Clock,
  ArrowUpCircle,
  Phone,
  DollarSign,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Download
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
  amount_paid?: number;
  fees_waived?: boolean;      // ✅ ADD THIS
  amount_owed?: number;        // ✅ ADD THIS
  entry_selections?: {
    id: string;
    trial_round_id: string;
    entry_type: string;
    fee: number;
    running_position: number;
    entry_status: string;
    division?: string;
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
  amount_paid: number;
  fees_waived: boolean;     
  amount_owed: number; 
  entry_selections: {
    id: string;
    trial_round_id: string;
    entry_type: string;
    fee: number;
    running_position: number;
    entry_status: string;
    class_display: string;
    day_info: string;
    division?: string;
  }[];
  entry_ids: string[];
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
  const supabase = getSupabaseBrowser();
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
  
  // NEW: State for tracking expanded entries
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

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

  // NEW: Toggle function for expanding/collapsing entries
  const toggleExpanded = (cwagsNumber: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cwagsNumber)) {
        newSet.delete(cwagsNumber);
      } else {
        newSet.add(cwagsNumber);
      }
      return newSet;
    });
  };

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
      const stats = statsResult.success
        ? statsResult.data
        : { total: 0, byStatus: {}, byPayment: {} };

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
          amount_paid: entry.amount_paid || 0,
          fees_waived: entry.fees_waived || false,   
          amount_owed: entry.amount_owed || 0,
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
            day_info: dayInfo,
            division: selection.division
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
    router.push(`/entries/${trialId}?cwags=${entry.cwags_number}`);
  };

  const confirmEntry = async (entryId: string, handlerName: string, dogName: string) => {
  if (!confirm(`Confirm entry for ${handlerName} - ${dogName}?`)) return;

  try {
    const { error } = await supabase
      .from('entries')
      .update({ entry_status: 'confirmed' })
      .eq('id', entryId);

    if (error) throw error;

    alert('Entry confirmed successfully!');
    loadTrialAndEntries(); // Reload the entries list
  } catch (err) {
    console.error('Error confirming entry:', err);
    alert('Failed to confirm entry');
  }
};

const waitlistEntry = async (entryId: string, handlerName: string, dogName: string) => {
  if (!confirm(`Move entry to waitlist for ${handlerName} - ${dogName}?`)) return;

  try {
    const { error } = await supabase
      .from('entries')
      .update({ entry_status: 'waitlisted' })
      .eq('id', entryId);

    if (error) throw error;

    alert('Entry moved to waitlist successfully!');
    loadTrialAndEntries(); // Reload the entries list
  } catch (err) {
    console.error('Error waitlisting entry:', err);
    alert('Failed to waitlist entry');
  }
};

const promoteFromWaitlist = async (entryId: string, handlerName: string, dogName: string) => {
  if (!confirm(`Promote ${handlerName} - ${dogName} from waitlist to confirmed?`)) return;

  try {
    const { error } = await supabase
      .from('entries')
      .update({ entry_status: 'confirmed' })
      .eq('id', entryId);

    if (error) throw error;

    alert('Entry promoted to confirmed successfully!');
    loadTrialAndEntries(); // Reload the entries list
  } catch (err) {
    console.error('Error promoting entry:', err);
    alert('Failed to promote entry');
  }
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
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
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

const exportToCSV = async () => {
  try {
    // Get financial data grouped by owner (this has correct balance calculation)
    const financialsResult = await financialOperations.getCompetitorFinancials(trialId);
    
    if (!financialsResult.success || !financialsResult.data) {
      alert('Failed to load financial data for export');
      return;
    }

    const competitors = financialsResult.data;

    // Create a map of owner_id to email/phone from entries
    const ownerContactInfo: Record<string, { email: string; phone: string }> = {};
    
    entries.forEach(entry => {
      // Extract owner ID from C-WAGS number (middle 4 digits)
      const cwagsMatch = entry.cwags_number?.match(/^\d{2}-(\d{4})-\d{2}$/);
      const ownerId = cwagsMatch ? cwagsMatch[1] : entry.handler_name;
      
      if (!ownerContactInfo[ownerId]) {
        ownerContactInfo[ownerId] = {
          email: entry.handler_email || 'N/A',
          phone: entry.handler_phone || 'N/A'
        };
      }
    });

    // Create CSV header
    const headers = [
      'Handler Name',
      'Email',
      'Phone',
      'Dogs (Runs)',
      'Total Runs',
      'Amount Owing'
    ];
    
    // Create CSV rows from competitor financials
    const rows = competitors.map(comp => {
      // Get contact info
      const cwagsMatch = comp.cwags_number?.match(/Owner ID: (.+)/);
      const ownerId = cwagsMatch ? cwagsMatch[1] : comp.handler_name;
      const contact = ownerContactInfo[ownerId] || { email: 'N/A', phone: 'N/A' };
      
      // Format dogs with run counts: "Roxy (2) Fluffy (8) Rosey (4)"
      const dogsWithRuns = (comp.dogs || [])
  .map((dog: any) => {
          const totalRuns = dog.regular_runs + dog.feo_runs;
          return `${dog.dog_call_name} (${totalRuns})`;
        })
        .join(' ');
      
      // Calculate total runs
      const totalRuns = comp.regular_runs + comp.feo_runs + 
                       comp.waived_regular_runs + comp.waived_feo_runs;
      
      // Calculate balance using the SAME formula as financials page
      const balance = calculateBalance(
  comp.amount_owed,
  comp.amount_paid
);


      
      return [
        comp.handler_name,
        contact.email,
        contact.phone,
        dogsWithRuns,
        totalRuns.toString(),
        balance.toFixed(2)
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${trial?.trial_name || 'trial'}_entries_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    alert('Failed to export CSV');
  }
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
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`Entries - ${trial.trial_name}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{trial.trial_name}</h1>
            <p className="text-gray-600">{trial.location}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {entryStats.total}
              </div>
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
              <DropdownMenuContent align="end"className="bg-white">
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
            <Button onClick={exportToCSV}>
  <Download className="h-4 w-4 mr-2" />
  Export to CSV
</Button>
            <Button onClick={() => {
              const entryLink = `${window.location.origin}/entries/${trialId}`;
              navigator.clipboard.writeText(entryLink).then(() => {
                alert('Entry link copied to clipboard!');
              });
            }}>
              Copy Entry Link
            </Button>
          </div>
        </div>

        {/* Entries List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Trial Entries ({filteredEntries.length})</span>
            </CardTitle>
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
                {filteredEntries.map((entry) => {
                  const isExpanded = expandedEntries.has(entry.cwags_number);
                  const amountOwed = entry.total_fee - entry.amount_paid;
                  
                  return (
                    <div key={entry.cwags_number} className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
                      {/* Team Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900 text-lg">
                                {entry.handler_name} • {entry.dog_call_name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                Registration: {entry.cwags_number}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center gap-2">
  <Badge className={`${getStatusColor(entry.entry_status)} border`}>
    {entry.entry_status}
  </Badge>
  
  {/* Buttons for SUBMITTED entries */}
  {entry.entry_status === 'submitted' && (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="outline"
        onClick={() => confirmEntry(entry.entry_ids[0], entry.handler_name, entry.dog_call_name)}
        className="h-6 px-2 py-0 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
      >
        <CheckCircle className="h-3 w-3 mr-1" />
        Confirm
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => waitlistEntry(entry.entry_ids[0], entry.handler_name, entry.dog_call_name)}
        className="h-6 px-2 py-0 text-xs bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-300"
      >
        <Clock className="h-3 w-3 mr-1" />
        Waitlist
      </Button>
    </div>
  )}
  
  {/* Button for WAITLISTED entries */}
  {entry.entry_status === 'waitlisted' && (
    <Button
      size="sm"
      variant="outline"
      onClick={() => promoteFromWaitlist(entry.entry_ids[0], entry.handler_name, entry.dog_call_name)}
      className="h-6 px-2 py-0 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
    >
      <ArrowUpCircle className="h-3 w-3 mr-1" />
      Promote to Confirmed
    </Button>
  )}
</div>
                              <Badge className={getPaymentStatusColor(entry.payment_status)}>
                                {entry.payment_status}
                              </Badge>
                              {entry.is_junior_handler && (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                  Junior Handler
                                </Badge>
                              )}
                              {/* Show unique divisions */}
                              {(() => {
                                const divisions = [...new Set(
                                  entry.entry_selections
                                    .map(sel => sel.division)
                                    .filter(div => div != null)
                                )];
                                
                                return divisions.map((division: string) => (
                                  <Badge 
                                    key={division}
                                    className={getDivisionColor(division)}
                                  >
                                    Div {division}
                                  </Badge>
                                ));
                              })()}
                            </div>
                          </div>
                          
                          {/* PROMINENT EMAIL AND AMOUNT OWED */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <Mail className="h-5 w-5 text-blue-600 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-blue-900 mb-0.5">Email</p>
                                <p className="text-sm text-blue-700 truncate">{entry.handler_email}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                              <DollarSign className="h-5 w-5 text-green-600 flex-shrink-0" />
                              <div>
                                <p className="text-xs font-medium text-green-900 mb-0.5">Amount Owed</p>
                                <p className="text-lg font-bold text-green-700">
                                  {formatCurrency(amountOwed)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Phone */}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-4 w-4" />
                            <span>{entry.handler_phone}</span>
                          </div>
                        </div>
                        
                        {/* Edit button */}
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

                      {/* Entry Summary & Collapse Toggle */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{entry.entry_selections.length}</span> class selections
                          {entry.amount_paid > 0 && (
                            <span className="ml-4">
                              Paid: <span className="font-medium text-green-600">{formatCurrency(entry.amount_paid)}</span>
                            </span>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(entry.cwags_number)}
                          className="flex items-center gap-2"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Hide Selections
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              View Selections
                            </>
                          )}
                        </Button>
                      </div>

                      {/* COLLAPSIBLE Class Selections */}
                      {isExpanded && (
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
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}