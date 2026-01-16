'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { ArrowLeft, Calendar, DollarSign, FileEdit, UserPlus, Trash2, AlertCircle, Filter, X } from 'lucide-react';

interface JournalEntry {
  id: string;
  timestamp: string;
  type: 'entry_created' | 'entry_modified' | 'payment_received' | 'entry_withdrawn' | 'fees_waived' | 'selection_modified';
  handler_name: string;
  dog_call_name: string;
  cwags_number: string;
  description: string;
  amount?: number;
  payment_method?: string;
  payment_received_by?: string;
  notes?: string;
  changed_fields?: string[];
  entry_id?: string;
  snapshot?: any; // Store the snapshot data for modal display
}

export default function TrialJournalPage() {
  const params = useParams();
  const router = useRouter();
  const trialId = params.trialId as string;
  const supabase = getSupabaseBrowser();

  const [trial, setTrial] = useState<any>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  
  // Details modal state
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [entryDetails, setEntryDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadJournalData();
  }, [trialId]);

  useEffect(() => {
    filterJournalEntries();
  }, [journalEntries, searchTerm, typeFilter, dateRange]);

  const loadJournalData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load trial info
      const { data: trialData, error: trialError } = await supabase
        .from('trials')
        .select('*')
        .eq('id', trialId)
        .single();

      if (trialError) throw trialError;
      setTrial(trialData);

      const entries: JournalEntry[] = [];

      // ✅ PART 1: Load entry submissions and modifications from trial_activity_log
      const { data: activityData, error: activityError } = await supabase
        .from('trial_activity_log')
        .select('*')
        .eq('trial_id', trialId)
        .in('activity_type', ['entry_submitted', 'entry_modified', 'fees_waived'])
        .order('created_at', { ascending: false });

      if (activityError) throw activityError;

      // Process activity log entries with snapshots
      (activityData || []).forEach((activity: any) => {
        const snapshot = activity.snapshot_data || {};
        
        if (activity.activity_type === 'entry_submitted') {
          entries.push({
            id: activity.id,
            timestamp: activity.created_at,
            type: 'entry_created',
            handler_name: snapshot.handler_name || activity.user_name || 'Unknown',
            dog_call_name: snapshot.dog_call_name || 'Unknown',
            cwags_number: snapshot.cwags_number || 'Unknown',
            description: `Entry submitted for ${snapshot.dog_call_name} with ${snapshot.class_count || 0} class${(snapshot.class_count || 0) !== 1 ? 'es' : ''}`,
            amount: snapshot.total_fee || 0,
            entry_id: activity.entry_id,
            snapshot: snapshot // Store snapshot for modal
          });
        } 
        
        else if (activity.activity_type === 'entry_modified') {
          const before = snapshot.before || {};
          const after = snapshot.after || {};
          const change = snapshot.change || {};
          
          let description = `Modified entry for ${snapshot.dog_call_name}`;
          
          // Build detailed description with added/removed classes
          const details = [];
          if (change.added_classes && change.added_classes.length > 0) {
            details.push(`➕ Added: ${change.added_classes.join(', ')}`);
          }
          if (change.removed_classes && change.removed_classes.length > 0) {
            details.push(`➖ Removed: ${change.removed_classes.join(', ')}`);
          }
          if (change.class_count_delta !== 0) {
            details.push(`Classes: ${before.class_count} → ${after.class_count}`);
          }
          if (change.fee_delta !== 0) {
            details.push(`Fee: $${before.total_fee} → $${after.total_fee}`);
          }
          
          if (details.length > 0) {
            description += '\n' + details.join('\n');
          }
          
          entries.push({
            id: activity.id,
            timestamp: activity.created_at,
            type: 'entry_modified',
            handler_name: snapshot.handler_name || activity.user_name || 'Unknown',
            dog_call_name: snapshot.dog_call_name || 'Unknown',
            cwags_number: snapshot.cwags_number || 'Unknown',
            description: description,
            amount: after.total_fee || 0,
            entry_id: activity.entry_id,
            snapshot: snapshot // Store snapshot for modal (use 'after' state)
          });
        }
        
        else if (activity.activity_type === 'fees_waived') {
          entries.push({
            id: activity.id,
            timestamp: activity.created_at,
            type: 'fees_waived',
            handler_name: snapshot.handler_name || activity.user_name || 'Unknown',
            dog_call_name: snapshot.dog_call_name || 'Unknown',
            cwags_number: snapshot.cwags_number || 'Unknown',
            description: `Fees waived for ${snapshot.dog_call_name}`,
            notes: snapshot.reason || 'No reason provided',
            amount: snapshot.amount_waived || 0,
            entry_id: activity.entry_id,
            snapshot: snapshot // Store snapshot for modal
          });
        }
      });

      // ✅ PART 2: Load ALL payments from entry_payment_transactions (source of truth)
      // First get all entries for this trial to map payments to handlers
      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select('id, handler_name, dog_call_name, cwags_number')
        .eq('trial_id', trialId);

      if (entriesError) throw entriesError;

      const entryIds = (entriesData || []).map(e => e.id);
      
      if (entryIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('entry_payment_transactions')
          .select('*')
          .in('entry_id', entryIds)
          .order('payment_date', { ascending: false });

        if (paymentsError) throw paymentsError;

        // Add payments to journal entries
        (paymentsData || []).forEach((payment: any) => {
          const entry = entriesData?.find(e => e.id === payment.entry_id);
          
          entries.push({
            id: `payment-${payment.id}`,
            timestamp: payment.payment_date || payment.created_at,
            type: 'payment_received',
            handler_name: entry?.handler_name || 'Unknown',
            dog_call_name: entry?.dog_call_name || 'Unknown',
            cwags_number: entry?.cwags_number || 'Unknown',
            description: `Payment received: $${payment.amount}`,
            amount: payment.amount || 0,
            payment_method: payment.payment_method,
            payment_received_by: payment.payment_received_by,
            notes: payment.notes,
            entry_id: payment.entry_id
          });
        });
      }

      // Sort by timestamp (merge entries and payments chronologically)
      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setJournalEntries(entries);
    } catch (err: any) {
      console.error('Error loading journal data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterJournalEntries = () => {
    let filtered = [...journalEntries];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.handler_name.toLowerCase().includes(search) ||
        entry.dog_call_name.toLowerCase().includes(search) ||
        entry.cwags_number.toLowerCase().includes(search) ||
        entry.description.toLowerCase().includes(search)
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.type === typeFilter);
    }

    // Apply date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfToday.getDate() - 7);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        if (dateRange === 'today') return entryDate >= startOfToday;
        if (dateRange === 'week') return entryDate >= startOfWeek;
        if (dateRange === 'month') return entryDate >= startOfMonth;
        return true;
      });
    }

    setFilteredEntries(filtered);
  };

  const openDetailsModal = async (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setLoadingDetails(true);

    try {
      // Use snapshot data if available (for entry submissions and modifications)
      if (entry.snapshot) {
        const snapshot = entry.snapshot;
        
        // For entry_modified, use the 'after' state
        const displayState = entry.type === 'entry_modified' && snapshot.after 
          ? snapshot.after 
          : snapshot;
        
        // Build selections from snapshot classes
        const selections = (displayState.classes || []).map((classData: any, index: number) => ({
          id: `snapshot-${index}`,
          fee: classData.fee || 0,
          division: classData.division,
          entry_type: classData.entry_type || 'regular',
          jump_height: classData.jump_height,
          running_position: null,
          entry_status: 'active',
          created_at: entry.timestamp,
          trial_rounds: {
            round_number: classData.round || 1,
            trial_classes: {
              class_name: classData.name || 'Unknown Class',
              class_order: index
            }
          }
        }));

        // Fetch current payments for this entry (still from transactions table)
        const { data: paymentsData } = await supabase
          .from('entry_payment_transactions')
          .select('*')
          .eq('entry_id', entry.entry_id)
          .order('payment_date', { ascending: false });

        setEntryDetails({
          entry: {
            handler_name: snapshot.handler_name || displayState.handler_name,
            dog_call_name: snapshot.dog_call_name || displayState.dog_call_name,
            cwags_number: snapshot.cwags_number || displayState.cwags_number,
            handler_email: snapshot.handler_email,
            handler_phone: snapshot.handler_phone,
            total_fee: displayState.total_fee || snapshot.total_fee,
            entry_status: 'active',
            fees_waived: false,
            from_snapshot: true, // Flag to show this is historical data
            snapshot_timestamp: entry.timestamp
          },
          selections: selections,
          payments: paymentsData || []
        });
      } 
      // For payments, fetch current entry details
      else {
        const { data: entryData, error: entryError } = await supabase
          .from('entries')
          .select(`
            *,
            entry_selections (
              *,
              trial_rounds (
                round_number,
                trial_classes (
                  class_name,
                  class_order
                )
              )
            )
          `)
          .eq('id', entry.entry_id)
          .single();

        if (entryError) throw entryError;

        const { data: paymentsData } = await supabase
          .from('entry_payment_transactions')
          .select('*')
          .eq('entry_id', entry.entry_id)
          .order('payment_date', { ascending: false });

        setEntryDetails({
          entry: entryData,
          selections: entryData?.entry_selections || [],
          payments: paymentsData || []
        });
      }
    } catch (err) {
      console.error('Error loading entry details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetailsModal = () => {
    setSelectedEntry(null);
    setEntryDetails(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'entry_created':
        return <UserPlus className="h-5 w-5 text-blue-600" />;
      case 'entry_modified':
        return <FileEdit className="h-5 w-5 text-orange-600" />;
      case 'payment_received':
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'fees_waived':
        return <AlertCircle className="h-5 w-5 text-purple-600" />;
      case 'entry_withdrawn':
        return <Trash2 className="h-5 w-5 text-red-600" />;
      default:
        return <FileEdit className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'entry_created':
        return 'bg-blue-100 text-blue-800';
      case 'entry_modified':
        return 'bg-orange-100 text-orange-800';
      case 'payment_received':
        return 'bg-green-100 text-green-800';
      case 'fees_waived':
        return 'bg-purple-100 text-purple-800';
      case 'entry_withdrawn':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    if (isToday) {
      return `Today at ${timeStr}`;
    } else if (isYesterday) {
      return `Yesterday at ${timeStr}`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      }) + ` at ${timeStr}`;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading journal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto" />
          <p className="mt-4 text-red-600 font-semibold">Error loading journal</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push(`/dashboard/trials/${trialId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Trial
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Activity Journal</h1>
              {trial && (
                <p className="text-gray-600 mt-1">
                  {trial.trial_name} • {new Date(trial.trial_start_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search handler, dog, or CWAGS #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            />

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Types</option>
              <option value="entry_created">Entries Created</option>
              <option value="entry_modified">Entries Modified</option>
              <option value="payment_received">Payments</option>
              <option value="fees_waived">Fees Waived</option>
            </select>

            {/* Date Range */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
            </select>

            {/* Clear Filters */}
            {(searchTerm || typeFilter !== 'all' || dateRange !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setTypeFilter('all');
                  setDateRange('all');
                }}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Journal Entries */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {filteredEntries.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {searchTerm || typeFilter !== 'all' || dateRange !== 'all'
                ? 'No entries match your filters'
                : 'No activity recorded yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openDetailsModal(entry)}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getTypeIcon(entry.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {entry.handler_name}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-700">
                          {entry.dog_call_name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(entry.type)}`}>
                          {entry.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex-shrink-0 text-sm text-gray-500">
                        {formatTimestamp(entry.timestamp)}
                      </div>
                    </div>

                    <div className="text-gray-700 whitespace-pre-line">
                      {entry.description}
                    </div>

                    {entry.amount !== undefined && (
                      <div className="mt-2 text-sm font-semibold text-gray-900">
                        {formatCurrency(entry.amount)}
                      </div>
                    )}

                    {entry.payment_method && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Method:</span> {entry.payment_method}
                        {entry.payment_received_by && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="font-medium">Received by:</span> {entry.payment_received_by}
                          </>
                        )}
                      </div>
                    )}

                    {entry.notes && (
                      <div className="mt-2 text-sm text-gray-600 italic">
                        Note: {entry.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-gray-900">Entry Details</h2>
                  {entryDetails?.entry?.from_snapshot && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      Historical Snapshot
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {selectedEntry.handler_name} • {selectedEntry.dog_call_name} • {selectedEntry.cwags_number}
                </p>
                {entryDetails?.entry?.from_snapshot && (
                  <p className="text-xs text-blue-600 mt-1">
                    📸 Showing entry as it was on {formatTimestamp(entryDetails.entry.snapshot_timestamp)}
                  </p>
                )}
              </div>
              <button
                onClick={closeDetailsModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {loadingDetails ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading details...</p>
                </div>
              ) : entryDetails ? (
                <div className="space-y-6">
                  {/* Entry Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Entry Information
                    </h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Handler Name:</span>
                          <p className="font-medium text-gray-900">{entryDetails.entry.handler_name}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Dog Name:</span>
                          <p className="font-medium text-gray-900">{entryDetails.entry.dog_call_name}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">CWAGS Number:</span>
                          <p className="font-medium text-gray-900">{entryDetails.entry.cwags_number}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Entry Status:</span>
                          <p className="font-medium text-gray-900">
                            {entryDetails.entry.entry_status || 'Active'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Class Entries */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Class Entries ({entryDetails.selections.length})
                    </h3>
                    <div className="space-y-2">
                      {entryDetails.selections.map((selection: any) => {
                        const trialClass = selection.trial_rounds?.trial_classes;
                        const isWithdrawn = selection.entry_status === 'withdrawn';
                        
                        return (
                          <div
                            key={selection.id}
                            className={`border rounded-lg p-4 ${
                              isWithdrawn 
                                ? 'bg-red-50 border-red-200' 
                                : 'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {isWithdrawn && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded">
                                      WITHDRAWN
                                    </span>
                                  )}
                                  <span className="font-semibold text-gray-900">
                                    {trialClass?.class_name || 'Unknown Class'}
                                  </span>
                                  {selection.trial_rounds?.round_number && (
                                    <span className="text-sm text-gray-600">
                                      (Round {selection.trial_rounds.round_number})
                                    </span>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                  {selection.entry_type && (
                                    <div className="text-gray-600">
                                      Type: <span className="text-gray-900">
                                        {selection.entry_type === 'feo' ? 'FEO' : 'Regular'}
                                      </span>
                                    </div>
                                  )}
                                  {selection.division && (
                                    <div className="text-gray-600">
                                      Division: <span className="text-gray-900">{selection.division}</span>
                                    </div>
                                  )}
                                  {selection.jump_height && (
                                    <div className="text-gray-600">
                                      Jump Height: <span className="text-gray-900">{selection.jump_height}</span>
                                    </div>
                                  )}
                                  {selection.running_position && (
                                    <div className="text-gray-600">
                                      Running Position: <span className="text-gray-900">#{selection.running_position}</span>
                                    </div>
                                  )}
                                  
                                  <div className="text-gray-600 col-span-2 mt-1 pt-1 border-t border-gray-200">
                                    Entered: <span className="text-gray-900">
                                      {formatTimestamp(selection.created_at)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right ml-4">
                                <p className="font-semibold text-gray-900">
                                  {formatCurrency(selection.fee)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {entryDetails.selections.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No class selections found
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Financial Summary
                    </h3>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Fees:</span>
                          <span className="font-semibold">
                            {formatCurrency(entryDetails.entry.total_fee || 0)}
                          </span>
                        </div>
                        {entryDetails.entry.fees_waived && (
                          <div className="flex justify-between text-orange-600">
                            <span>Fees Waived:</span>
                            <span className="font-semibold">
                              {formatCurrency(entryDetails.entry.total_fee || 0)}
                            </span>
                          </div>
                        )}
                        <div className="border-t border-gray-200 pt-2 mt-2">
                          <div className="flex justify-between text-lg font-bold">
                            <span>Amount Due:</span>
                            <span className={entryDetails.entry.fees_waived ? 'text-green-600' : ''}>
                              {formatCurrency(entryDetails.entry.fees_waived ? 0 : (entryDetails.entry.total_fee || 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment History */}
                  {entryDetails.payments.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Payment History ({entryDetails.payments.length})
                      </h3>
                      <div className="space-y-2">
                        {entryDetails.payments.map((payment: any) => (
                          <div
                            key={payment.id}
                            className="bg-green-50 border border-green-200 rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <DollarSign className="h-4 w-4 text-green-600" />
                                  <span className="font-semibold text-gray-900">
                                    Payment Received
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                  <div className="text-gray-600">
                                    Date: <span className="text-gray-900">
                                      {new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                  {payment.payment_method && (
                                    <div className="text-gray-600">
                                      Method: <span className="text-gray-900">{payment.payment_method}</span>
                                    </div>
                                  )}
                                  {payment.payment_received_by && (
                                    <div className="text-gray-600">
                                      Received by: <span className="text-gray-900">{payment.payment_received_by}</span>
                                    </div>
                                  )}
                                  {payment.notes && (
                                    <div className="text-gray-600 col-span-2">
                                      Notes: <span className="text-gray-900">{payment.notes}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <p className="font-semibold text-green-600 text-lg">
                                  +{formatCurrency(payment.amount)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No details available
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              <button
                onClick={closeDetailsModal}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}