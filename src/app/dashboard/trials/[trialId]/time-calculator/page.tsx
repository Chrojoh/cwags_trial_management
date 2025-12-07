'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getClassOrder } from '@/lib/cwagsClassNames';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Clock, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  ArrowLeft,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { getDefaultTimeConfigurations, DEFAULT_DAILY_ALLOTMENT } from '@/lib/trialTimeDefaults';

interface TimeConfig {
  id?: string;
  class_name: string;
  minutes_per_run: number;
  entry_count: number;
  total_minutes: number;
}

interface DayData {
  day_id: string;
  day_number: number;
  trial_date: string;
  allotted_minutes: number;
  scent_configs: TimeConfig[];
  rally_configs: TimeConfig[];
}

export default function TrialTimeCalculatorPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const supabase = getSupabaseBrowser();
  const trialId = params.trialId as string;
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [trial, setTrial] = useState<any>(null);
  const [daysData, setDaysData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [editingAllotment, setEditingAllotment] = useState<Record<string, number>>({});
  const [editingMinutes, setEditingMinutes] = useState<Record<string, number>>({});
  useEffect(() => {
    if (trialId && user) {
      loadData();
    }
  }, [trialId, user]);

  const loadData = async () => {
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

      // Load trial days
      const { data: daysData, error: daysError } = await supabase
        .from('trial_days')
        .select('*')
        .eq('trial_id', trialId)
        .order('day_number');

      if (daysError) throw daysError;

      // Check if time configs exist
      const { data: existingConfigs, error: configsError } = await supabase
        .from('trial_time_configurations')
        .select('*')
        .eq('trial_id', trialId);

      if (configsError) throw configsError;

      // If no configs exist, initialize with defaults
      if (!existingConfigs || existingConfigs.length === 0) {
        await initializeDefaults();
        setHasInitialized(true);
        // Reload after initialization
        await loadData();
        return;
      }

      // Load entry counts per day and class
      const processedDays = await Promise.all(
        daysData.map(async (day) => {
          // Load daily allotment
          const { data: allotmentData } = await supabase
            .from('trial_daily_allotments')
            .select('allotted_minutes')
            .eq('trial_day_id', day.id)
            .single();

        // Get entry counts using the same method as Live Event page
console.log('Loading entries for day', day.day_number);

// Get all entries for this trial with their selections
const { data: entriesData, error: entriesError } = await supabase
  .from('entries')
  .select(`
    id,
    handler_name,
    entry_selections (
      id,
      trial_round_id,
      entry_status,
      entry_type
    )
  `)
  .eq('trial_id', trialId);

if (entriesError) {
  console.error('Error loading entries:', entriesError);
}

// Get all rounds for this trial to map round IDs to class names and days
const { data: allRounds } = await supabase
  .from('trial_rounds')
  .select(`
    id,
    trial_classes!inner (
      class_name,
      trial_day_id
    )
  `);

console.log('Rounds for mapping:', allRounds?.length);

// Create a map of round_id -> { className, dayId }
const roundToClass: Record<string, { className: string; dayId: string }> = {};
allRounds?.forEach((round: any) => {
  if (round.trial_classes) {
    roundToClass[round.id] = {
      className: round.trial_classes.class_name,
      dayId: round.trial_classes.trial_day_id
    };
  }
});

// Count entries per class for this specific day
const classEntryCounts: Record<string, number> = {};

if (entriesData) {
  entriesData.forEach((entry: any) => {
    entry.entry_selections?.forEach((selection: any) => {
      const roundInfo = roundToClass[selection.trial_round_id];
      
      // Only count if:
      // 1. The round exists
      // 2. It's for this specific day
      // 3. It's not withdrawn
      // 4. It's not FEO
      if (
        roundInfo &&
        roundInfo.dayId === day.id &&
        selection.entry_status?.toLowerCase() !== 'withdrawn' &&
        selection.entry_type?.toLowerCase() !== 'feo'
      ) {
        const className = roundInfo.className;
        classEntryCounts[className] = (classEntryCounts[className] || 0) + 1;
      }
    });
  });
}

console.log('Entry counts for day', day.day_number, ':', classEntryCounts);

          // Separate scent and rally configs
          const scentConfigs = existingConfigs
            .filter(c => c.discipline === 'scent')
            .map(c => ({
              id: c.id,
              class_name: c.class_name,
              minutes_per_run: c.minutes_per_run,
              entry_count: classEntryCounts[c.class_name] || 0,
              total_minutes: c.minutes_per_run * (classEntryCounts[c.class_name] || 0)
            }));

          const rallyConfigs = existingConfigs
            .filter(c => c.discipline === 'rally_obedience_games')
            .map(c => ({
              id: c.id,
              class_name: c.class_name,
              minutes_per_run: c.minutes_per_run,
              entry_count: classEntryCounts[c.class_name] || 0,
              total_minutes: c.minutes_per_run * (classEntryCounts[c.class_name] || 0)
            }));

          return {
            day_id: day.id,
            day_number: day.day_number,
            trial_date: day.trial_date,
            allotted_minutes: allotmentData?.allotted_minutes || DEFAULT_DAILY_ALLOTMENT,
            scent_configs: scentConfigs,
            rally_configs: rallyConfigs
          };
        })
      );

      setDaysData(processedDays);

    } catch (err) {
      console.error('Error loading time calculator data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

 const initializeDefaults = async () => {
  try {
    const defaultConfigs = getDefaultTimeConfigurations(trialId);
    
    console.log('Attempting to insert default configs:', defaultConfigs.length, 'items');
    
    const { data, error: insertError } = await supabase
      .from('trial_time_configurations')
      .insert(defaultConfigs)
      .select();

    if (insertError) {
      console.error('Insert error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      throw insertError;
    }

    console.log('Initialized default time configurations:', data?.length);
  } catch (err) {
    console.error('Error initializing defaults:', err);
    setError(`Failed to initialize defaults: ${err instanceof Error ? err.message : 'Unknown error'}`);
    throw err;
  }
};

  const updateMinutesPerRun = async (configId: string, newMinutes: number) => {
    try {
      setSaving(true);

      const { error: updateError } = await supabase
        .from('trial_time_configurations')
        .update({ 
          minutes_per_run: newMinutes,
          updated_at: new Date().toISOString()
        })
        .eq('id', configId);

      if (updateError) throw updateError;

      // Reload to show updated calculations
      await loadData();
    } catch (err) {
      console.error('Error updating minutes per run:', err);
      setError('Failed to update time configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateDailyAllotment = async (dayId: string, minutes: number) => {
    try {
      setSaving(true);

      const { error: upsertError } = await supabase
        .from('trial_daily_allotments')
        .upsert({
          trial_day_id: dayId,
          allotted_minutes: minutes,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'trial_day_id'
        });

      if (upsertError) throw upsertError;

      // Reload to show updated calculations
      await loadData();
    } catch (err) {
      console.error('Error updating daily allotment:', err);
      setError('Failed to update daily allotment');
    } finally {
      setSaving(false);
    }
  };
const handleAllotmentChange = (dayId: string, value: string) => {
  setEditingAllotment(prev => ({
    ...prev,
    [dayId]: parseInt(value) || 0
  }));
};

const handleAllotmentSave = async (dayId: string) => {
  const newValue = editingAllotment[dayId];
  if (newValue !== undefined) {
    await updateDailyAllotment(dayId, newValue);
    // Clear the editing state
    setEditingAllotment(prev => {
      const updated = { ...prev };
      delete updated[dayId];
      return updated;
    });
  }
};
const handleMinutesChange = (configId: string, value: string) => {
  setEditingMinutes(prev => ({
    ...prev,
    [configId]: parseFloat(value) || 0
  }));
};

const handleMinutesSave = async (configId: string) => {
  const newValue = editingMinutes[configId];
  if (newValue !== undefined) {
    await updateMinutesPerRun(configId, newValue);
    // Clear the editing state
    setEditingMinutes(prev => {
      const updated = { ...prev };
      delete updated[configId];
      return updated;
    });
  }
};
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <MainLayout title="Trial Time Calculator">
        <div className="flex items-center justify-center min-h-64">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      </MainLayout>
    );
  }

  if (user?.role !== 'administrator' && user?.role !== 'trial_secretary') {
    return (
      <MainLayout title="Trial Time Calculator">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Only administrators and trial secretaries can access this page.
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Trials', href: '/dashboard/trials' },
    { label: trial?.trial_name || 'Trial', href: `/dashboard/trials/${trialId}` },
    { label: 'Time Calculator' }
  ];

 return (
  <MainLayout 
    title="Trial Time Calculator"
    breadcrumbItems={breadcrumbItems}
  >
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trial Time Calculator</h1>
          <p className="text-gray-600 mt-1">
            {trial?.trial_name} - Calculate running times per day
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/trials/${trialId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trial
          </Button>
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {hasInitialized && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Default time configurations have been initialized. You can now customize the minutes per run for each class.
          </AlertDescription>
        </Alert>
      )}

      {/* Day Tabs */}
<Card>
  <CardHeader>
    <CardTitle>Select Day</CardTitle>
    <CardDescription>Click a day to view and edit time calculations</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {daysData.map((dayData) => {
        const totalMinutes = [
          ...dayData.scent_configs,
          ...dayData.rally_configs
        ].reduce((sum, config) => sum + config.total_minutes, 0);
        const remaining = dayData.allotted_minutes - totalMinutes;
        const isOvertime = remaining < 0;
        const isExpanded = expandedDays.includes(dayData.day_id);

        return (
         <Button
  key={dayData.day_id}
  variant={isExpanded ? "default" : "outline"}
  className={`h-auto py-4 px-4 ${
    isExpanded 
      ? 'bg-white text-black hover:bg-white border-2 border-orange-600' 
      : isOvertime 
        ? 'border-red-300 hover:border-red-400' 
        : ''
  }`}
  onClick={() => {
    // Expand the day
    if (!expandedDays.includes(dayData.day_id)) {
      setExpandedDays([...expandedDays, dayData.day_id]);
    }
    // Scroll to it
    document.getElementById(`day-${dayData.day_id}`)?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  }}
>
  <div className="text-left w-full space-y-2">
    {/* Day Number - Always dark, easier to read */}
    <div className="font-bold text-base text-gray-900">
      Day {dayData.day_number}
    </div>
    
    {/* Date */}
    <div className="text-sm text-gray-700">
      {new Date(dayData.trial_date + 'T12:00:00').toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })}
    </div>
    
    {/* Usage Stats */}
    <div className="text-sm text-gray-700">
      <div>Used: {totalMinutes.toFixed(0)} min</div>
      <div>Allotment: {dayData.allotted_minutes} min</div>
    </div>
    
    {/* Status */}
    <div className={`text-sm font-bold ${
      isOvertime ? 'text-red-700' : 'text-green-700'
    }`}>
      {isOvertime ? '⚠️ Over by ' : '✓ '}
      {Math.abs(remaining).toFixed(0)} min
    </div>
  </div>
</Button>
        );
      })}
    </div>
  </CardContent>
</Card>

     {/* Day-by-Day Breakdown */}
{daysData.map((dayData) => {
  const totalMinutes = [
    ...dayData.scent_configs,
    ...dayData.rally_configs
  ].reduce((sum, config) => sum + config.total_minutes, 0);

  const remaining = dayData.allotted_minutes - totalMinutes;
  const isOvertime = remaining < 0;

  return (
    <Card key={dayData.day_id} id={`day-${dayData.day_id}`}>
      <CardHeader 
        className="cursor-pointer hover:bg-gray-50"
        onClick={() => {
          // Toggle expansion
          const currentExpanded = expandedDays.includes(dayData.day_id);
          if (currentExpanded) {
            setExpandedDays(expandedDays.filter(id => id !== dayData.day_id));
          } else {
            setExpandedDays([...expandedDays, dayData.day_id]);
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <span>Day {dayData.day_number} - {formatDate(dayData.trial_date)}</span>
              <Badge variant={expandedDays.includes(dayData.day_id) ? "default" : "outline"}>
                {expandedDays.includes(dayData.day_id) ? 'Click to collapse' : 'Click to expand'}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Total: {totalMinutes.toFixed(0)} min • 
              Allotment: {dayData.allotted_minutes} min • 
              <span className={isOvertime ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                {isOvertime ? 'Over by ' : 'Under by '}
                {Math.abs(remaining).toFixed(0)} min
                {isOvertime && ' ⚠️'}
              </span>
            </CardDescription>
          </div>
          <div className="text-right flex items-center space-x-4">
  <div>
    <Label className="text-sm">Daily Allotment (minutes)</Label>
    <Input
      type="number"
      value={editingAllotment[dayData.day_id] ?? dayData.allotted_minutes}
      onChange={(e) => {
        e.stopPropagation();
        handleAllotmentChange(dayData.day_id, e.target.value);
      }}
      onBlur={() => handleAllotmentSave(dayData.day_id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAllotmentSave(dayData.day_id);
          e.currentTarget.blur(); // Remove focus after saving
        }
      }}
      onClick={(e) => e.stopPropagation()}
      className="w-24 mt-1"
      min="0"
      placeholder="250"
    />
    <p className="text-xs text-gray-500 mt-1">Press Enter to save</p>
  </div>
</div>
        </div>
      </CardHeader>
      
      {/* Only show content if expanded */}
      {expandedDays.includes(dayData.day_id) && (
        <CardContent className="space-y-6">
          {/* Scent Table */}
         <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3">Scent Classes</h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Class</TableHead>
                    <TableHead className="text-center text-xs sm:text-sm">Min/Run</TableHead>
                    <TableHead className="text-center text-xs sm:text-sm">Entries</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">Total (min)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayData.scent_configs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium text-xs sm:text-sm whitespace-normal sm:whitespace-nowrap">
                        {config.class_name}
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          step="0.25"
                          value={editingMinutes[config.id!] ?? config.minutes_per_run}
                          onChange={(e) => handleMinutesChange(config.id!, e.target.value)}
                          onBlur={() => handleMinutesSave(config.id!)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleMinutesSave(config.id!);
                              e.currentTarget.blur();
                            }
                          }}
                          className="w-16 sm:w-20 mx-auto text-center text-xs sm:text-sm py-2 min-h-[44px]"
                          min="0"
                        />
                      </TableCell>
                      <TableCell className="text-center text-xs sm:text-sm">
                        {config.entry_count}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        {config.total_minutes.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>


          {/* Rally / Obedience / Games Table */}
         <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3">Rally / Obedience / Games</h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Class</TableHead>
                    <TableHead className="text-center text-xs sm:text-sm">Min/Run</TableHead>
                    <TableHead className="text-center text-xs sm:text-sm">Entries</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">Total (min)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayData.rally_configs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium text-xs sm:text-sm whitespace-normal sm:whitespace-nowrap">
                        {config.class_name}
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          step="0.25"
                          value={editingMinutes[config.id!] ?? config.minutes_per_run}
                          onChange={(e) => handleMinutesChange(config.id!, e.target.value)}
                          onBlur={() => handleMinutesSave(config.id!)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleMinutesSave(config.id!);
                              e.currentTarget.blur();
                            }
                          }}
                          className="w-16 sm:w-20 mx-auto text-center text-xs sm:text-sm py-2 min-h-[44px]"
                          min="0"
                        />
                      </TableCell>
                      <TableCell className="text-center text-xs sm:text-sm">
                        {config.entry_count}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        {config.total_minutes.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Summary */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-gray-600">Total Time Used</div>
                  <div className="text-2xl font-bold">{totalMinutes.toFixed(2)} min</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-gray-600">Daily Allotment</div>
                  <div className="text-2xl font-bold">{dayData.allotted_minutes} min</div>
                </CardContent>
              </Card>
              <Card className={isOvertime ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}>
                <CardContent className="pt-4">
                  <div className="text-sm text-gray-600">Remaining</div>
                  <div className={`text-2xl font-bold ${isOvertime ? 'text-red-700' : 'text-green-700'}`}>
                    {isOvertime ? '-' : '+'}{Math.abs(remaining).toFixed(2)} min
                    {isOvertime && ' ⚠️'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
})}
    </div>
  </MainLayout>
);
}