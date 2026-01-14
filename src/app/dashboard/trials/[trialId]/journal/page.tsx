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
}

// Helper function to detect automatic fee updates
const isAutomaticFeeUpdate = (auditLine: string): boolean => {
  if (!auditLine) return false;
  
  const line = auditLine.toLowerCase();
  
  // Skip if it ONLY mentions total_fee or amount_owed updates
  // without mentioning actual changes like classes, selections, etc.
  const isOnlyFeeUpdate = (
    line.includes('updated total_fee') ||
    line.includes('total_fee updated') ||
    line.includes('updated amount_owed')
  ) && !(
    line.includes('class') ||
    line.includes('selection') ||
    line.includes('withdraw') ||
    line.includes('added') ||
    line.includes('removed')
  );
  
  return isOnlyFeeUpdate;
};
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

      // 1. Get all entries with their creation and modification history
      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select('*')
        .eq('trial_id', trialId)
        .order('submitted_at', { ascending: false });

      if (entriesError) throw entriesError;

      // Process entry creations
      (entriesData || []).forEach((entry: any) => {
        // Entry creation
        entries.push({
          id: `entry-created-${entry.id}`,
          timestamp: entry.submitted_at || entry.created_at,
          type: 'entry_created',
          handler_name: entry.handler_name,
          dog_call_name: entry.dog_call_name,
          cwags_number: entry.cwags_number || 'Unknown',
          description: `Entry submitted for ${entry.dog_call_name}`,
          amount: entry.total_fee || entry.amount_owed || 0,
          entry_id: entry.id
        });

        // Fee waiver if applicable (these fields might not exist in older schemas)
        if (entry.fees_waived) {
          entries.push({
            id: `fees-waived-${entry.id}`,
            timestamp: entry.created_at,
            type: 'fees_waived',
            handler_name: entry.handler_name,
            dog_call_name: entry.dog_call_name,
            cwags_number: entry.cwags_number || 'Unknown',
            description: `Fees waived for ${entry.dog_call_name}`,
            notes: entry.waiver_reason || 'No reason provided',
            amount: entry.total_fee || entry.amount_owed || 0,
            entry_id: entry.id
          });
        }

       // Parse audit trail for modifications
if (entry.audit_trail && entry.audit_trail !== 'Entry created') {
  const auditLines = entry.audit_trail.split('\n').filter((line: string) => 
    line.trim() && line !== 'Entry created'
  );
  
  auditLines.forEach((line: string, index: number) => {
    // ✅ SKIP automatic fee updates
    if (isAutomaticFeeUpdate(line)) {
      return; // Skip this audit line
    }
    
    const timestampMatch = line.match(/at (\d{4}-\d{2}-\d{2}T[\d:\.]+Z)/);
    const timestamp = timestampMatch ? timestampMatch[1] : entry.created_at;
    
    entries.push({
      id: `audit-${entry.id}-${index}`,
      timestamp: timestamp,
      type: 'entry_modified',
      handler_name: entry.handler_name,
      dog_call_name: entry.dog_call_name,
      cwags_number: entry.cwags_number,
      description: line,
      entry_id: entry.id
    });
  });
}
      });

      // 2. Get all payment transactions
      const entryIds = (entriesData || []).map((e: any) => e.id);
      if (entryIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('entry_payment_transactions')
          .select('*')
          .in('entry_id', entryIds)
          .order('payment_date', { ascending: false });

        if (paymentsError) throw paymentsError;

        (paymentsData || []).forEach((payment: any) => {
          // Find the corresponding entry
          const entry = entriesData?.find((e: any) => e.id === payment.entry_id);
          
          entries.push({
            id: `payment-${payment.id}`,
            timestamp: payment.payment_date || payment.created_at,
            type: 'payment_received',
            handler_name: entry?.handler_name || 'Unknown',
            dog_call_name: entry?.dog_call_name || 'Unknown',
            cwags_number: entry?.cwags_number || 'Unknown',
            description: `Payment received for ${entry?.dog_call_name || 'entry'}`,
            amount: payment.amount,
            payment_method: payment.payment_method,
            payment_received_by: payment.payment_received_by,
            notes: payment.notes,
            entry_id: payment.entry_id
          });
        });

       // 3. Get entry selections for detailed class-level changes
const { data: selectionsData, error: selectionsError } = await supabase
  .from('entry_selections')
  .select(`
    *,
    trial_rounds!inner (
      round_number,
      trial_classes!inner (
        class_name,
        class_level
      )
    )
  `)
  .in('entry_id', entryIds)
  .order('created_at', { ascending: false });

if (selectionsError) throw selectionsError;

// Group selections by entry to detect additions
const selectionsByEntry: Record<string, any[]> = {};
(selectionsData || []).forEach((selection: any) => {
  if (!selectionsByEntry[selection.entry_id]) {
    selectionsByEntry[selection.entry_id] = [];
  }
  selectionsByEntry[selection.entry_id].push(selection);
});

// Process each entry's selections
Object.entries(selectionsByEntry).forEach(([entryId, selections]) => {
  const entry = entriesData?.find((e: any) => e.id === entryId);
  if (!entry) return;
  
  const entrySubmitTime = new Date(entry.submitted_at || entry.created_at).getTime();
  
  // Find selections added AFTER initial submission (more than 5 minutes after)
  const addedLater = selections.filter((sel: any) => {
    const selectionTime = new Date(sel.created_at).getTime();
    const minutesDiff = (selectionTime - entrySubmitTime) / (1000 * 60);
    return minutesDiff > 5 && sel.entry_status !== 'withdrawn';
  });
  
  // Group added selections by their timestamp (within 1 minute = same modification)
  const additionGroups: Record<string, any[]> = {};
  addedLater.forEach((sel: any) => {
    const timestamp = new Date(sel.created_at);
    const roundedTime = new Date(
      timestamp.getFullYear(),
      timestamp.getMonth(),
      timestamp.getDate(),
      timestamp.getHours(),
      timestamp.getMinutes()
    ).toISOString();
    
    if (!additionGroups[roundedTime]) {
      additionGroups[roundedTime] = [];
    }
    additionGroups[roundedTime].push(sel);
  });
  
  // Create journal entries for each group of additions
  Object.entries(additionGroups).forEach(([timestamp, addedSelections]) => {
    const classNames = addedSelections.map((s: any) => 
      `${s.trial_rounds?.trial_classes?.class_name || 'Unknown'} R${s.trial_rounds?.round_number || '?'}`
    ).join(', ');
    
    entries.push({
      id: `classes-added-${entryId}-${timestamp}`,
      timestamp: timestamp,
      type: 'entry_modified',
      handler_name: entry.handler_name,
      dog_call_name: entry.dog_call_name,
      cwags_number: entry.cwags_number || 'Unknown',
      description: `Added ${addedSelections.length} class${addedSelections.length > 1 ? 'es' : ''}: ${classNames}`,
      entry_id: entryId
    });
  });
  
  // Track withdrawals
  selections.forEach((selection: any) => {
    if (selection.entry_status === 'withdrawn') {
      const className = selection.trial_rounds?.trial_classes?.class_name || 'Unknown';
      const roundNum = selection.trial_rounds?.round_number || '?';
      
      entries.push({
        id: `withdrawn-${selection.id}`,
        timestamp: selection.created_at,
        type: 'entry_withdrawn',
        handler_name: entry.handler_name,
        dog_call_name: entry.dog_call_name,
        cwags_number: entry.cwags_number || 'Unknown',
        description: `Withdrew from ${className} Round ${roundNum} (${selection.entry_type || 'regular'})`,
        amount: selection.fee || 0,
        entry_id: selection.entry_id
      });
    }
  });
});
      }

      // Sort all entries by timestamp (most recent first)
      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setJournalEntries(entries);
      setFilteredEntries(entries);

    } catch (err) {
      console.error('Error loading journal data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load journal data');
    } finally {
      setLoading(false);
    }
  };

  const filterJournalEntries = () => {
    let filtered = [...journalEntries];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.handler_name.toLowerCase().includes(term) ||
        entry.dog_call_name.toLowerCase().includes(term) ||
        entry.cwags_number.toLowerCase().includes(term) ||
        entry.description.toLowerCase().includes(term)
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.type === typeFilter);
    }

    // Apply date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (dateRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(entry => 
        new Date(entry.timestamp) >= cutoffDate
      );
    }

    setFilteredEntries(filtered);
  };

  const loadEntryDetails = async (journalEntry: JournalEntry) => {
    if (!journalEntry.entry_id) return;

    try {
      setLoadingDetails(true);
      setSelectedEntry(journalEntry);

      // Get the full entry with selections
      const { data: entryData, error: entryError } = await supabase
        .from('entries')
        .select('*')
        .eq('id', journalEntry.entry_id)
        .single();

      if (entryError) throw entryError;

      // Get entry selections with class details
      const { data: selections, error: selectionsError } = await supabase
        .from('entry_selections')
        .select(`
          id,
          entry_id,
          trial_round_id,
          entry_type,
          fee,
          running_position,
          entry_status,
          division,
          games_subclass,
          jump_height,
          created_at,
          trial_rounds!inner (
            id,
            round_number,
            judge_name,
            trial_class_id,
            trial_classes!inner (
              id,
              class_name,
              class_type,
              subclass,
              class_level,
              games_subclass,
              entry_fee,
              feo_price,
              trial_day_id,
              trial_days!inner (
                trial_date,
                day_number,
                trial_id
              )
            )
          )
        `)
        .eq('entry_id', journalEntry.entry_id)
        .order('created_at', { ascending: true });

      if (selectionsError) throw selectionsError;

      // Get payment history for this entry
      const { data: payments } = await supabase
        .from('entry_payment_transactions')
        .select('*')
        .eq('entry_id', journalEntry.entry_id)
        .order('payment_date', { ascending: false });

      setEntryDetails({
        entry: entryData,
        selections: selections || [],
        payments: payments || []
      });

    } catch (err) {
      console.error('Error loading entry details:', err);
      alert('Failed to load entry details');
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
        return <UserPlus className="h-5 w-5 text-green-600" />;
      case 'entry_modified':
        return <FileEdit className="h-5 w-5 text-blue-600" />;
      case 'payment_received':
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'entry_withdrawn':
        return <Trash2 className="h-5 w-5 text-red-600" />;
      case 'fees_waived':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      entry_created: { label: 'Entry Created', className: 'bg-green-100 text-green-800' },
      entry_modified: { label: 'Modified', className: 'bg-blue-100 text-blue-800' },
      payment_received: { label: 'Payment', className: 'bg-green-100 text-green-800' },
      entry_withdrawn: { label: 'Withdrawn', className: 'bg-red-100 text-red-800' },
      fees_waived: { label: 'Fees Waived', className: 'bg-orange-100 text-orange-800' },
      selection_modified: { label: 'Class Changed', className: 'bg-purple-100 text-purple-800' }
    };

    const badge = badges[type] || { label: 'Unknown', className: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDateSafe = (dateString: string) => {
    if (!dateString) return 'Unknown';
    
    // Use noon trick to avoid timezone issues
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    
    const date = new Date(
      parseInt(parts[0]),      // year
      parseInt(parts[1]) - 1,  // month (0-indexed)
      parseInt(parts[2]),      // day
      12, 0, 0                 // Set to noon to avoid timezone shifts
    );
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isRecentlyAdded = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24; // Added within last 24 hours
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading journal...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`/dashboard/trials/${trialId}`)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Trial
        </button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Activity Journal</h1>
            <p className="text-gray-600 mt-1">{trial?.trial_name}</p>
            <p className="text-sm text-gray-500 mt-1">
              Complete chronological record of all trial activities
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Events</p>
            <p className="text-2xl font-bold text-gray-900">{filteredEntries.length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Handler, dog, or C-WAGS #"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Activity Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Types</option>
              <option value="entry_created">Entries Created</option>
              <option value="entry_modified">Modifications</option>
              <option value="payment_received">Payments</option>
              <option value="entry_withdrawn">Withdrawals</option>
              <option value="fees_waived">Fee Waivers</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Journal Entries */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No journal entries found matching your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Handler
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Dog
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    C-WAGS #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatTimestamp(entry.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(entry.type)}
                        {getTypeBadge(entry.type)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {entry.handler_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {entry.dog_call_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                      {entry.cwags_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div>
                        {entry.description}
                        {entry.payment_method && (
                          <div className="text-xs text-gray-500 mt-1">
                            Method: {entry.payment_method}
                            {entry.payment_received_by && ` • Received by: ${entry.payment_received_by}`}
                          </div>
                        )}
                        {entry.notes && (
                          <div className="text-xs text-gray-500 mt-1 italic">
                            Note: {entry.notes}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold">
                      {entry.amount !== undefined && (
                        <span className={
                          entry.type === 'payment_received' ? 'text-green-600' :
                          entry.type === 'entry_withdrawn' ? 'text-red-600' :
                          'text-gray-900'
                        }>
                          {entry.type === 'payment_received' ? '+' : ''}
                          {formatCurrency(entry.amount)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => loadEntryDetails(entry)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Footer */}
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                Showing {filteredEntries.length} of {journalEntries.length} total events
              </span>
              <div className="flex gap-4">
                <span className="text-gray-600">
                  Entries: {journalEntries.filter(e => e.type === 'entry_created').length}
                </span>
                <span className="text-gray-600">
                  Payments: {journalEntries.filter(e => e.type === 'payment_received').length}
                </span>
                <span className="text-green-600 font-semibold">
                  Total Paid: {formatCurrency(
                    journalEntries
                      .filter(e => e.type === 'payment_received')
                      .reduce((sum, e) => sum + (e.amount || 0), 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Entry Details
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedEntry.handler_name} • {selectedEntry.dog_call_name} • {selectedEntry.cwags_number}
                </p>
              </div>
              <button
                onClick={closeDetailsModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading details...</p>
                  </div>
                </div>
              ) : entryDetails ? (
                <div className="space-y-6">
                  {/* Activity Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      {getTypeIcon(selectedEntry.type)}
                      {getTypeBadge(selectedEntry.type)}
                      <span className="text-sm text-gray-500 ml-auto">
                        {formatTimestamp(selectedEntry.timestamp)}
                      </span>
                    </div>
                    <p className="text-gray-700">{selectedEntry.description}</p>
                    {selectedEntry.notes && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        Note: {selectedEntry.notes}
                      </p>
                    )}
                  </div>

                  {/* Changes Summary - Only for modifications */}
                  {selectedEntry.type === 'entry_modified' && entryDetails.selections && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <FileEdit className="h-5 w-5" />
                        What Changed
                      </h3>
                      <div className="space-y-2 text-sm">
                        {(() => {
                          const modTime = new Date(selectedEntry.timestamp);
                          const recentClasses = entryDetails.selections.filter((s: any) => {
                            const enteredTime = new Date(s.created_at);
                            const timeDiff = Math.abs(modTime.getTime() - enteredTime.getTime()) / (1000 * 60);
                            return timeDiff < 5; // Within 5 minutes of modification
                          });
                          
                          const withdrawnClasses = entryDetails.selections.filter((s: any) => 
                            s.entry_status === 'withdrawn'
                          );

                          return (
                            <>
                              {recentClasses.length > 0 && (
                                <div className="bg-green-100 border border-green-300 rounded p-2">
                                  <p className="font-medium text-green-900 mb-1">
                                    ✓ Added {recentClasses.length} class{recentClasses.length !== 1 ? 'es' : ''}:
                                  </p>
                                  <ul className="list-disc list-inside text-green-800 ml-2">
                                    {recentClasses.map((s: any) => (
                                      <li key={s.id}>
                                        {s.trial_rounds?.trial_classes?.class_name || 'Unknown'} 
                                        {s.entry_type === 'feo' && ' (FEO)'}
                                        {' - '}Round {s.trial_rounds?.round_number}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {withdrawnClasses.length > 0 && (
                                <div className="bg-red-100 border border-red-300 rounded p-2">
                                  <p className="font-medium text-red-900 mb-1">
                                    ✗ Withdrew from {withdrawnClasses.length} class{withdrawnClasses.length !== 1 ? 'es' : ''}:
                                  </p>
                                  <ul className="list-disc list-inside text-red-800 ml-2">
                                    {withdrawnClasses.map((s: any) => (
                                      <li key={s.id}>
                                        {s.trial_rounds?.trial_classes?.class_name || 'Unknown'} 
                                        {s.entry_type === 'feo' && ' (FEO)'}
                                        {' - '}Round {s.trial_rounds?.round_number}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {recentClasses.length === 0 && withdrawnClasses.length === 0 && (
                                <p className="text-blue-800">
                                  Other modifications (fee updates, handler info changes, etc.)
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Entry Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Entry Information
                    </h3>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Handler Name</p>
                        <p className="font-medium">{entryDetails.entry.handler_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Dog Name</p>
                        <p className="font-medium">{entryDetails.entry.dog_call_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">C-WAGS Number</p>
                        <p className="font-medium font-mono">{entryDetails.entry.cwags_number || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Entry Status</p>
                        <p className="font-medium capitalize">{entryDetails.entry.entry_status || 'submitted'}</p>
                      </div>
                      {entryDetails.entry.dog_breed && (
                        <div>
                          <p className="text-sm text-gray-500">Breed</p>
                          <p className="font-medium">{entryDetails.entry.dog_breed}</p>
                        </div>
                      )}
                      {entryDetails.entry.handler_email && (
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium text-sm">{entryDetails.entry.handler_email}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Class Selections */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Class Entries ({entryDetails.selections.length})
                    </h3>
                    
                    {selectedEntry.type === 'entry_modified' && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Tip:</strong> Classes highlighted in <span className="bg-green-200 px-1 rounded">green</span> were added recently (within 24 hours of this modification).
                        </p>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      {entryDetails.selections.map((selection: any) => {
                        const trialRound = selection.trial_rounds;
                        const trialClass = trialRound?.trial_classes;
                        const trialDay = trialClass?.trial_days;
                        const isWithdrawn = selection.entry_status === 'withdrawn';
                        const isRecent = isRecentlyAdded(selection.created_at);

                        return (
                          <div
                            key={selection.id}
                            className={`border rounded-lg p-4 ${
                              isWithdrawn 
                                ? 'bg-red-50 border-red-200' 
                                : isRecent 
                                ? 'bg-green-50 border-green-300 shadow-md' 
                                : 'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold text-gray-900">
                                    {trialClass?.class_name || 'Unknown Class'}
                                  </span>
                                  {selection.entry_type === 'feo' && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                                      FEO
                                    </span>
                                  )}
                                  {isWithdrawn && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded">
                                      WITHDRAWN
                                    </span>
                                  )}
                                  {isRecent && !isWithdrawn && (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded">
                                      NEW
                                    </span>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                  {trialClass?.class_type && (
                                    <div className="text-gray-600">
                                      Type: <span className="text-gray-900 capitalize">{trialClass.class_type}</span>
                                    </div>
                                  )}
                                  {trialClass?.class_level && (
                                    <div className="text-gray-600">
                                      Level: <span className="text-gray-900">{trialClass.class_level}</span>
                                    </div>
                                  )}
                                  {(selection.games_subclass || trialClass?.games_subclass) && (
                                    <div className="text-gray-600">
                                      Games Type: <span className="text-gray-900">{selection.games_subclass || trialClass?.games_subclass}</span>
                                    </div>
                                  )}
                                  {trialClass?.subclass && (
                                    <div className="text-gray-600">
                                      Subclass: <span className="text-gray-900">{trialClass.subclass}</span>
                                    </div>
                                  )}
                                  {trialDay && (
                                    <div className="text-gray-600">
                                      Date: <span className="text-gray-900">{formatDateSafe(trialDay.trial_date)}</span>
                                    </div>
                                  )}
                                  {trialRound?.round_number && (
                                    <div className="text-gray-600">
                                      Round: <span className="text-gray-900">{trialRound.round_number}</span>
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
                                  
                                  {/* Show when this class was entered */}
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

                  {/* Audit Trail */}
                  {entryDetails.entry.audit_trail && entryDetails.entry.audit_trail !== 'Entry created' && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Modification History
                      </h3>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="space-y-2 text-sm">
                          {entryDetails.entry.audit_trail.split('\n').map((line: string, index: number) => (
                            line.trim() && (
                              <div key={index} className="flex items-start gap-2">
                                <FileEdit className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700">{line}</span>
                              </div>
                            )
                          ))}
                        </div>
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
