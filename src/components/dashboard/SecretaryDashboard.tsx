// src/components/dashboard/SecretaryDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Mail,
  TrendingUp,
  Plus,
  Download
} from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { financialOperations } from '@/lib/financialOperations';

interface Trial {
  id: string;
  trial_name: string;
  start_date: string;
  end_date: string;
  trial_status: string;
}

interface TrialMetrics {
  totalEntries: number;
  pendingPayment: number;
  waitlisted: number;
  confirmed: number;
  expectedRevenue: number;
  collected: number;
  outstanding: number;
  daysUntilStart: number;
  runningOrderPublished: boolean;
  classesSetUp: {
    total: number;
    configured: number;
  };
  judgesAssigned: {
    total: number;
    assigned: number;
  };
  breakEvenAnalysis: {
    totalFixedCosts: number;
    cwagsExpense: number;
    regularNetPerRun: number;
    feoNetPerRun: number;
    totalPaidRuns: number;
    totalFeoRuns: number;
    totalWaivedRegular: number;
    totalWaivedFeo: number;
    totalWaivedCosts: number;
    currentRevenue: number;
    totalAllCosts: number;
    currentNetIncome: number;
    breakEvenRuns: number;
    paidRunsNeeded: number;
    isProfitable: boolean;
    progressPercent: number;
  } | null;
}

interface ActionItem {
  type: 'warning' | 'info';
  message: string;
  count?: number;
}

interface OutstandingEntry {
  handler_name: string;
  handler_email: string;
  balance: number;
}

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

interface SecretaryDashboardProps {
  userTrials: Trial[];
  userId: string;
}

export default function SecretaryDashboard({ userTrials, userId }: SecretaryDashboardProps) {
  const router = useRouter();
  const supabase = getSupabaseBrowser();
  
  const [selectedTrialId, setSelectedTrialId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<TrialMetrics | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [outstandingEntries, setOutstandingEntries] = useState<OutstandingEntry[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  // Select default trial (most important one)
  useEffect(() => {
    if (userTrials.length > 0 && !selectedTrialId) {
      // Priority: active > published > upcoming > draft
      const activeTrial = userTrials.find(t => t.trial_status === 'active');
      const publishedTrial = userTrials.find(t => t.trial_status === 'published');
      const upcomingTrial = [...userTrials]
        .filter(t => new Date(t.start_date) > new Date())
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];
      
      const defaultTrial = activeTrial || publishedTrial || upcomingTrial || userTrials[0];
      setSelectedTrialId(defaultTrial.id);
    }
  }, [userTrials, selectedTrialId]);

  // Load metrics when trial is selected
  useEffect(() => {
    if (selectedTrialId) {
      loadTrialMetrics(selectedTrialId);
    }
  }, [selectedTrialId]);

  const loadTrialMetrics = async (trialId: string) => {
    try {
      setLoading(true);

      // Get trial info for days calculation
      const { data: trialData } = await supabase
        .from('trials')
        .select('start_date')
        .eq('id', trialId)
        .single();

      // Get all entries for this trial
      const { data: entries } = await supabase
        .from('entries')
        .select(`
          id,
          entry_status,
          payment_status,
          amount_owed,
          amount_paid,
          fees_waived,
          entry_selections (
            id,
            entry_type,
            entry_status
          )
        `)
        .eq('trial_id', trialId);

      // Count entries by status (excluding FEO)
      const nonFeoEntries = entries?.filter(e => 
        e.entry_selections?.some(s => s.entry_type?.toLowerCase() !== 'feo')
      ) || [];

      const totalEntries = nonFeoEntries.length;
      const pendingPayment = nonFeoEntries.filter(e => e.payment_status === 'pending').length;
      const waitlisted = nonFeoEntries.filter(e => e.entry_status === 'waitlisted').length;
      const confirmed = nonFeoEntries.filter(e => e.entry_status === 'confirmed').length;

      // Get financial metrics using the SAME function as the Financial Summary page
      const financialsResult = await financialOperations.getCompetitorFinancials(trialId);
      
      if (!financialsResult.success || !financialsResult.data) {
        throw new Error('Failed to load financial data');
      }

      const competitors = financialsResult.data;

      // Calculate totals using EXACT same formula as financials page
      const expectedRevenue = competitors.reduce((sum, c) => sum + (c.fees_waived ? 0 : c.amount_owed), 0);
      const collected = competitors.reduce((sum, c) => sum + c.amount_paid, 0);
      const outstanding = competitors.reduce((sum, c) => {
        const balance = c.fees_waived ? 0 : (c.amount_owed - c.amount_paid);
        return sum + balance;
      }, 0);

      // Calculate days until start
      const startDate = new Date(trialData?.start_date || '');
      const today = new Date();
      const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Check if running order is published (ANY round with status 'published')
      const { data: roundsData } = await supabase
        .from('trial_rounds')
        .select(`
          id,
          round_status,
          trial_classes!inner(
            trial_days!inner(
              trial_id
            )
          )
        `)
        .eq('trial_classes.trial_days.trial_id', trialId);

      const runningOrderPublished = roundsData?.some(r => r.round_status === 'published') || false;

      // Count total rounds for this trial (each round needs a judge)
      const { data: allRounds } = await supabase
        .from('trial_rounds')
        .select(`
          id,
          judge_name,
          trial_classes!inner(
            trial_days!inner(
              trial_id
            )
          )
        `)
        .eq('trial_classes.trial_days.trial_id', trialId);

      const totalRounds = allRounds?.length || 0;

      // Count rounds with judges assigned
      const roundsWithJudges = allRounds?.filter(r => r.judge_name && r.judge_name.trim() !== '') || [];
      const configuredRounds = roundsWithJudges.length;

      // Get unique judges assigned
      const uniqueJudges = new Set(roundsWithJudges.map(r => r.judge_name)).size;

      // Load break-even analysis (full analysis like financials page)
      const { data: breakEvenConfig } = await supabase
        .from('trial_break_even_config')
        .select('*')
        .eq('trial_id', trialId)
        .single();

      let breakEvenAnalysis = null;

      if (breakEvenConfig) {
        // Calculate current status (RUNS not ENTRIES!)
        const totalPaidRuns = competitors.reduce((sum, c) => sum + (c.regular_runs || 0), 0);
        const totalFeoRuns = competitors.reduce((sum, c) => sum + (c.feo_runs || 0), 0);
        const totalWaivedRegular = competitors.reduce((sum, c) => sum + (c.waived_regular_runs || 0), 0);
        const totalWaivedFeo = competitors.reduce((sum, c) => sum + (c.waived_feo_runs || 0), 0);

        // Calculate total regular runs (both paid and waived - ALL are charged C-WAGS fee)
        const totalRegularRuns = totalPaidRuns + totalWaivedRegular;
        
        // C-WAGS fees are charged on ALL regular runs (paid and waived)
        const cwagsExpense = totalRegularRuns * breakEvenConfig.regular_cwags_fee;
        
        // Calculate fixed costs INCLUDING C-WAGS fees
        const totalFixedCosts = 
          breakEvenConfig.hall_rental + 
          breakEvenConfig.ribbons + 
          breakEvenConfig.insurance + 
          breakEvenConfig.other_fixed_costs +
          cwagsExpense;  // ← C-WAGS is a fixed cost based on total runs

        // Calculate net per run
        const regularNetPerRun = 
          breakEvenConfig.regular_entry_fee - 
          breakEvenConfig.regular_cwags_fee - 
          breakEvenConfig.regular_judge_fee;

        const feoNetPerRun = 
          breakEvenConfig.feo_entry_fee - 
          breakEvenConfig.feo_judge_fee;

        // Calculate waived run costs (only judge fees, C-WAGS already in fixed costs)
        const waivedJudgeCosts = (totalWaivedRegular * breakEvenConfig.regular_judge_fee) + 
                                  (totalWaivedFeo * breakEvenConfig.feo_judge_fee);

        // Calculate revenue and costs
        const currentRevenue = (totalPaidRuns * regularNetPerRun) + (totalFeoRuns * feoNetPerRun);
        const totalAllCosts = totalFixedCosts + waivedJudgeCosts;
        const currentNetIncome = currentRevenue - totalAllCosts;

        // Calculate break-even point
        const breakEvenRuns = regularNetPerRun > 0 ? Math.ceil(totalFixedCosts / regularNetPerRun) : 0;
        const paidRunsNeeded = Math.max(0, breakEvenRuns - totalPaidRuns);

        breakEvenAnalysis = {
          totalFixedCosts,
          cwagsExpense,  // Track C-WAGS separately for display
          regularNetPerRun,
          feoNetPerRun,
          totalPaidRuns,
          totalFeoRuns,
          totalWaivedRegular,
          totalWaivedFeo,
          totalWaivedCosts: waivedJudgeCosts,
          currentRevenue,
          totalAllCosts,
          currentNetIncome,
          breakEvenRuns,
          paidRunsNeeded,
          isProfitable: currentNetIncome >= 0,
          progressPercent: breakEvenRuns > 0 ? Math.min(100, Math.round((totalPaidRuns / breakEvenRuns) * 100)) : 100
        };
      }

      setMetrics({
        totalEntries,
        pendingPayment,
        waitlisted,
        confirmed,
        expectedRevenue,
        collected,
        outstanding,
        daysUntilStart,
        runningOrderPublished,
        classesSetUp: {
          total: totalRounds,
          configured: configuredRounds
        },
        judgesAssigned: {
          total: totalRounds,
          assigned: uniqueJudges
        },
        breakEvenAnalysis
      });

      // Generate action items and outstanding entries list
      const items: ActionItem[] = [];
      
      // Get handler emails from entries table
      const { data: entriesWithEmails } = await supabase
        .from('entries')
        .select('handler_name, handler_email')
        .eq('trial_id', trialId);

      // Create email lookup map
      const emailLookup: Record<string, string> = {};
      (entriesWithEmails || []).forEach((e: any) => {
        if (!emailLookup[e.handler_name] && e.handler_email) {
          emailLookup[e.handler_name] = e.handler_email;
        }
      });
      
      // Get detailed list of entries with outstanding balances
      const outstandingList: OutstandingEntry[] = competitors
        .map(c => {
          const balance = c.fees_waived ? 0 : (c.amount_owed - c.amount_paid);
          return {
            handler_name: c.handler_name,
            handler_email: emailLookup[c.handler_name] || '',
            balance: balance
          };
        })
        .filter(entry => entry.balance > 0)
        .sort((a, b) => b.balance - a.balance); // Sort by balance descending
      
      setOutstandingEntries(outstandingList);
      
      // Check for days approaching time limit
      const { data: trialDays } = await supabase
        .from('trial_days')
        .select('id, day_number, trial_date')
        .eq('trial_id', trialId)
        .order('day_number');

      if (trialDays && trialDays.length > 0) {
        for (const day of trialDays) {
          // Get daily allotment (default 250 minutes if not set)
          const { data: allotment } = await supabase
            .from('trial_daily_allotments')
            .select('allotted_minutes')
            .eq('trial_day_id', day.id)
            .single();

          const allottedMinutes = allotment?.allotted_minutes || 250;

          // Get all classes for this day with entry counts
          const { data: dayClasses } = await supabase
            .from('trial_classes')
            .select(`
              id,
              class_name,
              class_type,
              trial_rounds!inner(
                id,
                entry_selections(id, entry_status)
              )
            `)
            .eq('trial_day_id', day.id);

          // Get time configurations for this trial
          const { data: timeConfigs } = await supabase
            .from('trial_time_configurations')
            .select('class_name, discipline, minutes_per_run')
            .eq('trial_id', trialId)
            .eq('is_active', true);

          // Build time lookup
          const timeLookup: Record<string, number> = {};
          (timeConfigs || []).forEach((config: any) => {
            timeLookup[config.class_name] = config.minutes_per_run;
          });

          // Calculate scheduled time
          let scheduledMinutes = 0;
          (dayClasses || []).forEach((cls: any) => {
            const minutesPerRun = timeLookup[cls.class_name] || 2.5; // Default 2.5 min if not configured
            
            // Count active entries across all rounds
            const totalEntries = cls.trial_rounds.reduce((sum: number, round: any) => {
              const activeEntries = (round.entry_selections || []).filter(
                (sel: any) => sel.entry_status?.toLowerCase() !== 'withdrawn'
              ).length;
              return sum + activeEntries;
            }, 0);

            scheduledMinutes += totalEntries * minutesPerRun;
          });

          // Alert if over 80% capacity
          const percentUsed = (scheduledMinutes / allottedMinutes) * 100;
          if (percentUsed >= 80) {
            const minutesOver = scheduledMinutes - allottedMinutes;
            items.push({
              type: 'warning',
              message: minutesOver > 0
                ? `Day ${day.day_number} is ${minutesOver.toFixed(0)} minutes over time limit (${scheduledMinutes.toFixed(0)}/${allottedMinutes} min)`
                : `Day ${day.day_number} is at ${percentUsed.toFixed(0)}% capacity (${scheduledMinutes.toFixed(0)}/${allottedMinutes} min)`
            });
          }
        }
      }
      
      if (waitlisted > 0) {
        items.push({
          type: 'info',
          message: `${waitlisted} waitlisted ${waitlisted === 1 ? 'entry' : 'entries'}`,
          count: waitlisted
        });
      }

      // Check for near-capacity classes (90% or more full)
      const { data: classesWithCounts } = await supabase
        .from('trial_classes')
        .select(`
          id,
          class_name,
          max_entries,
          trial_rounds!inner(
            id,
            entry_selections(id, entry_status)
          ),
          trial_days!inner(
            trial_id
          )
        `)
        .eq('trial_days.trial_id', trialId);

      const nearCapacityClasses: string[] = [];
      classesWithCounts?.forEach((cls: any) => {
        const totalEntries = cls.trial_rounds?.reduce((sum: number, round: any) => {
          const activeEntries = round.entry_selections?.filter(
            (sel: any) => sel.entry_status?.toLowerCase() !== 'withdrawn'
          ).length || 0;
          return sum + activeEntries;
        }, 0) || 0;

        const capacityPercent = (totalEntries / cls.max_entries) * 100;
        if (capacityPercent >= 90) {
          const spotsLeft = cls.max_entries - totalEntries;
          nearCapacityClasses.push(`${cls.class_name} (${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left)`);
        }
      });

      if (nearCapacityClasses.length > 0) {
        items.push({
          type: 'warning',
          message: `Classes near capacity: ${nearCapacityClasses.join(', ')}`
        });
      }

      setActionItems(items);

      // Load recent activity (last 2 days from trial_activity_log)
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoISO = twoDaysAgo.toISOString();

      const { data: activityData } = await supabase
        .from('trial_activity_log')
        .select('*')
        .eq('trial_id', trialId)
        .in('activity_type', ['entry_submitted', 'entry_modified', 'dog_substituted', 'fees_waived'])
        .gte('created_at', twoDaysAgoISO)
        .order('created_at', { ascending: false });

      const activity: RecentActivity[] = [];
      
      (activityData || []).forEach((item: any) => {
        const snapshot = item.snapshot_data || {};
        
        if (item.activity_type === 'entry_submitted') {
          activity.push({
            id: item.id,
            type: 'entry_created',
            message: `New entry: ${snapshot.dog_call_name} (${snapshot.handler_name}) - ${snapshot.class_count} ${snapshot.class_count === 1 ? 'class' : 'classes'}`,
            timestamp: item.created_at
          });
        } else if (item.activity_type === 'entry_modified') {
          const added = (snapshot.after?.class_count || 0) - (snapshot.before?.class_count || 0);
          const action = added > 0 ? `Added ${added} class${Math.abs(added) !== 1 ? 'es' : ''}` : `Removed ${Math.abs(added)} class${Math.abs(added) !== 1 ? 'es' : ''}`;
          activity.push({
            id: item.id,
            type: 'entry_modified',
            message: `Modified: ${snapshot.dog_call_name} - ${action}`,
            timestamp: item.created_at
          });
        } else if (item.activity_type === 'dog_substituted') {
          const substitute = snapshot.substitute || {};
          const original = snapshot.original || {};
          activity.push({
            id: item.id,
            type: 'dog_substituted',
            message: `Dog substitution: ${substitute.dog_call_name} replaced ${original.dog_call_name}`,
            timestamp: item.created_at
          });
        } else if (item.activity_type === 'fees_waived') {
          activity.push({
            id: item.id,
            type: 'fees_waived',
            message: `Fees waived: ${snapshot.dog_call_name} ($${snapshot.amount_waived || 0})`,
            timestamp: item.created_at
          });
        }
      });

      // Also load recent payments
      const { data: entriesData } = await supabase
        .from('entries')
        .select('id')
        .eq('trial_id', trialId);

      const entryIds = (entriesData || []).map((e: any) => e.id);
      
      if (entryIds.length > 0) {
        const { data: paymentsData } = await supabase
          .from('entry_payment_transactions')
          .select(`
            id,
            amount,
            payment_date,
            created_at,
            entries!inner(handler_name, dog_call_name)
          `)
          .in('entry_id', entryIds)
          .gte('payment_date', twoDaysAgoISO)
          .order('payment_date', { ascending: false });

        (paymentsData || []).forEach((payment: any) => {
          activity.push({
            id: `payment-${payment.id}`,
            type: 'payment_received',
            message: `Payment: ${payment.entries.handler_name} - $${payment.amount}`,
            timestamp: payment.payment_date || payment.created_at
          });
        });
      }

      // Sort all activity by timestamp (all from last 2 days)
      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activity);

    } catch (error) {
      console.error('Error loading trial metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedTrial = userTrials.find(t => t.id === selectedTrialId);

  const exportToCSV = async () => {
    if (!selectedTrialId) return;

    try {
      // Get financial data grouped by owner
      const financialsResult = await financialOperations.getCompetitorFinancials(selectedTrialId);
      
      if (!financialsResult.success || !financialsResult.data) {
        alert('Failed to load financial data for export');
        return;
      }

      const competitors = financialsResult.data;

      // Get all entries to map owner IDs to contact info
      const { data: entries } = await supabase
        .from('entries')
        .select('cwags_number, handler_email, handler_phone')
        .eq('trial_id', selectedTrialId);

      const ownerContactInfo: Record<string, { email: string; phone: string }> = {};
      
      entries?.forEach(entry => {
        const cwagsMatch = entry.cwags_number?.match(/^\d{2}-(\d{4})-\d{2}$/);
        const ownerId = cwagsMatch ? cwagsMatch[1] : entry.cwags_number;
        
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
      
      // Create CSV rows
      const rows = competitors.map(comp => {
        const cwagsMatch = comp.cwags_number?.match(/Owner ID: (.+)/);
        const ownerId = cwagsMatch ? cwagsMatch[1] : comp.handler_name;
        const contact = ownerContactInfo[ownerId] || { email: 'N/A', phone: 'N/A' };
        
        // Format dogs with run counts
        const dogsWithRuns = (comp.dogs || [])
          .map((dog: any) => {
            const totalRuns = dog.regular_runs + dog.feo_runs;
            return `${dog.dog_call_name} (${totalRuns})`;
          })
          .join(' ');
        
        // Calculate total runs
        const totalRuns = comp.regular_runs + comp.feo_runs + 
                         comp.waived_regular_runs + comp.waived_feo_runs;
        
        // Calculate balance
        const balance = comp.fees_waived ? 0 : (comp.amount_owed - comp.amount_paid);
        
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
      link.setAttribute('download', `${selectedTrial?.trial_name || 'trial'}_entries_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert('Failed to export CSV');
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

  const getStatusBadge = (status: string) => {
    const colors = {
      'active': 'bg-green-100 text-green-800',
      'published': 'bg-orange-100 text-orange-800',
      'draft': 'bg-gray-100 text-gray-800',
      'completed': 'bg-purple-100 text-purple-800'
    };
    return colors[status as keyof typeof colors] || colors.draft;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trial metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trial Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Select Trial
              </label>
              <Select value={selectedTrialId} onValueChange={setSelectedTrialId}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {userTrials.map((trial) => (
                    <SelectItem key={trial.id} value={trial.id}>
                      <div className="flex items-center space-x-2">
                        <span>{trial.trial_name}</span>
                        <Badge className={`ml-2 ${getStatusBadge(trial.trial_status)}`}>
                          {trial.trial_status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedTrial && (
              <div className="text-right">
                <p className="text-sm text-gray-600">{formatDate(selectedTrial.start_date)}</p>
                {metrics && metrics.daysUntilStart > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Starts in {metrics.daysUntilStart} {metrics.daysUntilStart === 1 ? 'day' : 'days'}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!metrics ? (
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No trial selected</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Entry Stats */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 Entries</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-gray-900">{metrics.totalEntries}</div>
                  <div className="text-sm text-gray-600">Total Entries</div>
                </CardContent>
              </Card>
              
              <Card className="border-orange-200">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-orange-600">{metrics.pendingPayment}</div>
                  <div className="text-sm text-gray-600">Pending Payment</div>
                </CardContent>
              </Card>
              
              <Card className="border-yellow-200">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-yellow-600">{metrics.waitlisted}</div>
                  <div className="text-sm text-gray-600">Waitlisted</div>
                </CardContent>
              </Card>
              
              <Card className="border-green-200">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-green-600">{metrics.confirmed}</div>
                  <div className="text-sm text-gray-600">Confirmed</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Financial Stats */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">💰 Financials</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    ${metrics.expectedRevenue.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Expected Revenue</div>
                </CardContent>
              </Card>
              
              <Card className="border-orange-200">
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    ${metrics.outstanding.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Outstanding</div>
                </CardContent>
              </Card>
              
              <Card className="border-green-200">
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${metrics.collected.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Collected</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Outstanding Balances */}
          {outstandingEntries.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <span>Outstanding Balances ({outstandingEntries.length})</span>
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToCSV}
                    disabled={!selectedTrialId}
                    className="bg-white hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg border">
                  <table className="w-full">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Competitor</th>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Email</th>
                        <th className="text-right p-3 text-sm font-semibold text-gray-700">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {outstandingEntries.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-3 text-sm font-medium text-gray-900">
                            {entry.handler_name}
                          </td>
                          <td className="p-3 text-sm text-gray-600">
                            {entry.handler_email || 'No email'}
                          </td>
                          <td className="p-3 text-sm font-semibold text-right text-orange-700">
                            ${entry.balance.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Other Action Items */}
          {actionItems.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <span>Action Items</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {actionItems.map((item, idx) => (
                    <li key={idx} className="flex items-center space-x-2 text-sm">
                      <span className={item.type === 'warning' ? 'text-orange-700' : 'text-blue-700'}>
                        • {item.message}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Break-Even Analysis */}
          {metrics.breakEvenAnalysis && (
            <Card className={metrics.breakEvenAnalysis.isProfitable ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50'}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className={`h-5 w-5 ${metrics.breakEvenAnalysis.isProfitable ? 'text-green-600' : 'text-orange-600'}`} />
                  <span>Break-Even Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Status Alert */}
                  <div className={`p-3 rounded-lg ${metrics.breakEvenAnalysis.isProfitable ? 'bg-green-100' : 'bg-orange-100'}`}>
                    <p className={`font-semibold ${metrics.breakEvenAnalysis.isProfitable ? 'text-green-800' : 'text-orange-800'}`}>
                      {metrics.breakEvenAnalysis.isProfitable ? (
                        <>✓ Profitable! ${Math.abs(metrics.breakEvenAnalysis.currentNetIncome).toFixed(2)} above break-even</>
                      ) : (
                        <>Need {metrics.breakEvenAnalysis.paidRunsNeeded} more paid runs</>
                      )}
                    </p>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded">
                      <div className="text-xs text-gray-600">Fixed Costs</div>
                      <div className="text-lg font-bold text-red-600">
                        ${metrics.breakEvenAnalysis.totalFixedCosts.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Includes ${metrics.breakEvenAnalysis.cwagsExpense.toFixed(2)} C-WAGS fees
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded">
                      <div className="text-xs text-gray-600">Net Per Run</div>
                      <div className="text-lg font-bold text-green-600">
                        ${metrics.breakEvenAnalysis.regularNetPerRun.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Break-Even Point */}
                  <div className="bg-white p-3 rounded">
                    <div className="text-xs text-gray-600 mb-1">Break-Even Point</div>
                    <p className="text-sm">
                      Need <strong>{metrics.breakEvenAnalysis.breakEvenRuns} paid runs</strong> at ${metrics.breakEvenAnalysis.regularNetPerRun.toFixed(2)}/run
                    </p>
                  </div>

                  {/* Current Status */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Paid Regular Runs:</span>
                      <span className="font-semibold">{metrics.breakEvenAnalysis.totalPaidRuns}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Paid FEO Runs:</span>
                      <span className="font-semibold">{metrics.breakEvenAnalysis.totalFeoRuns}</span>
                    </div>
                    {metrics.breakEvenAnalysis.totalWaivedRegular > 0 && (
                      <div className="flex justify-between text-sm text-purple-700">
                        <span>Waived Regular Runs:</span>
                        <span className="font-semibold">{metrics.breakEvenAnalysis.totalWaivedRegular}</span>
                      </div>
                    )}
                    {metrics.breakEvenAnalysis.totalWaivedFeo > 0 && (
                      <div className="flex justify-between text-sm text-purple-700">
                        <span>Waived FEO Runs:</span>
                        <span className="font-semibold">{metrics.breakEvenAnalysis.totalWaivedFeo}</span>
                      </div>
                    )}
                  </div>

                  {/* Financial Summary */}
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Revenue (Paid Runs):</span>
                      <span className="font-semibold text-green-700">
                        ${metrics.breakEvenAnalysis.currentRevenue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Costs:</span>
                      <span className="font-semibold text-red-700">
                        ${metrics.breakEvenAnalysis.totalAllCosts.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="font-semibold">Net Income:</span>
                      <span className={`font-bold ${metrics.breakEvenAnalysis.currentNetIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        ${metrics.breakEvenAnalysis.currentNetIncome.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progress to Break-Even</span>
                      <span>{metrics.breakEvenAnalysis.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          metrics.breakEvenAnalysis.progressPercent >= 100 ? 'bg-green-600' : 'bg-orange-600'
                        }`}
                        style={{ width: `${metrics.breakEvenAnalysis.progressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/dashboard/trials')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Trials
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/dashboard/trials/${selectedTrialId}/live-event`)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Running Order
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/dashboard/trials/${selectedTrialId}/financials`)}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Financial Summary
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/dashboard/trials/${selectedTrialId}/journal`)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Activity Journal
                </Button>

                <Button 
                  variant="outline"
                  className="w-full justify-start"
                  onClick={exportToCSV}
                  disabled={!selectedTrialId}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Entries CSV
                </Button>

                <Button 
                  onClick={() => router.push('/dashboard/trials/create')}
                  className="w-full justify-start bg-orange-600 hover:bg-orange-700 text-white mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Trial
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <span>Recent Activity</span>
                </CardTitle>
                <CardDescription>Last 2 days</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="text-sm">
                        <p className="text-gray-900">{activity.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}