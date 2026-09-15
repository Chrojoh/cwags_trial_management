'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Lock, Unlock, Calendar, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { getEffectiveEntryStatus } from '@/lib/entryWindow';

interface TrialDay {
  id: string;
  day_number: number;
  trial_date: string;
  is_accepting_entries: boolean;
}

interface EntryControlPanelProps {
  trialId: string;
  currentStatus: 'draft' | 'open' | 'closed';
}

export default function EntryControlPanel({ trialId, currentStatus }: EntryControlPanelProps) {
  const supabase = getSupabaseBrowser();

  const [entryStatus, setEntryStatus] = useState<'draft' | 'open' | 'closed'>(currentStatus);
  const [trialDays, setTrialDays] = useState<TrialDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entryOpenLocal, setEntryOpenLocal] = useState('');
  const [entryOpenAt, setEntryOpenAt] = useState<string | null>(null);
  const [entryTimezone, setEntryTimezone] = useState('America/Edmonton');
  const [clock, setClock] = useState(() => Date.now());

  const effectiveEntryStatus = getEffectiveEntryStatus(
    { entry_status: entryStatus, entry_open_at: entryOpenAt },
    new Date(clock),
  );

  useEffect(() => {
    if (entryStatus !== 'draft' || !entryOpenAt) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [entryStatus, entryOpenAt]);

  useEffect(() => {
    loadTrialDays();
  }, [trialId]);

  const loadTrialDays = async () => {
    try {
      setLoading(true);
      const [{ data, error }, { data: schedule, error: scheduleError }] = await Promise.all([
        supabase
        .from('trial_days')
        .select('*')
        .eq('trial_id', trialId)
        .order('day_number'),
        supabase
          .from('trials')
          .select('entry_open_at,entry_timezone')
          .eq('id', trialId)
          .single(),
      ]);

      if (error) throw error;
      if (scheduleError) throw scheduleError;

      setTrialDays(data || []);
      const timezone = schedule?.entry_timezone || 'America/Edmonton';
      setEntryOpenAt(schedule?.entry_open_at || null);
      setEntryTimezone(timezone);
      setEntryOpenLocal(
        schedule?.entry_open_at
          ? formatInTimeZone(schedule.entry_open_at, timezone, "yyyy-MM-dd'T'HH:mm")
          : '',
      );
    } catch (err: any) {
      console.error('Error loading trial days:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveEntrySchedule = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      if (!entryOpenLocal) throw new Error('Choose an opening date and time.');

      const opening = fromZonedTime(entryOpenLocal, entryTimezone);
      if (Number.isNaN(opening.getTime())) throw new Error('Choose a valid opening date and time.');

      const { error: saveError } = await supabase
        .from('trials')
        .update({
          entry_open_at: opening.toISOString(),
          entry_timezone: entryTimezone,
          entry_status: 'draft',
        })
        .eq('id', trialId);
      if (saveError) throw saveError;

      setEntryStatus('draft');
      setEntryOpenAt(opening.toISOString());
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Unable to save the entry schedule.');
    } finally {
      setSaving(false);
    }
  };

  const clearEntrySchedule = async () => {
    try {
      setSaving(true);
      setError(null);
      const { error: saveError } = await supabase
        .from('trials')
        .update({ entry_open_at: null })
        .eq('id', trialId);
      if (saveError) throw saveError;
      setEntryOpenLocal('');
      setEntryOpenAt(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Unable to clear the entry schedule.');
    } finally {
      setSaving(false);
    }
  };

  const updateTrialStatus = async (newStatus: 'draft' | 'open' | 'closed') => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const { error } = await supabase
        .from('trials')
        .update(newStatus === 'draft'
          ? { entry_status: newStatus, entry_open_at: null }
          : { entry_status: newStatus })
        .eq('id', trialId);

      if (error) throw error;

      setEntryStatus(newStatus);
      if (newStatus === 'draft') {
        setEntryOpenAt(null);
        setEntryOpenLocal('');
      }
      setSuccess(true);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error updating trial status:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateDayStatus = async (dayId: string, isAccepting: boolean) => {
    try {
      setError(null);

      const { error } = await supabase
        .from('trial_days')
        .update({ is_accepting_entries: isAccepting })
        .eq('id', dayId);

      if (error) throw error;

      setTrialDays((prev) =>
        prev.map((day) => (day.id === dayId ? { ...day, is_accepting_entries: isAccepting } : day))
      );
    } catch (err: any) {
      console.error('Error updating day status:', err);
      setError(err.message);
    }
  };

  const getStatusBadge = (status: 'draft' | 'open' | 'closed') => {
    const variants = {
      draft: { label: 'Not Yet Open', color: 'bg-gray-100 text-gray-800' },
      open: { label: 'Open', color: 'bg-green-100 text-green-800' },
      closed: { label: 'Closed', color: 'bg-red-100 text-red-800' },
    };

    const variant = variants[status];
    return <Badge className={variant.color}>{variant.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    // Manual date parsing to avoid timezone shift
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Entry Control</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Entry Control
        </CardTitle>
        <CardDescription>Control when entries can be submitted for this trial</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Entry status updated successfully
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Trial-Wide Entry Status</h3>
              <p className="text-sm text-gray-600">Master control for all entry submissions</p>
            </div>
            {getStatusBadge(effectiveEntryStatus)}
          </div>

          <div className="grid gap-3">
            <Button
              onClick={() => updateTrialStatus('draft')}
              disabled={saving}
              variant="outline"
              className={`justify-start ${
                effectiveEntryStatus === 'draft'
                  ? 'bg-gray-600 text-white border-gray-600 hover:bg-gray-700 hover:text-white'
                  : 'hover:bg-gray-50'
              }`}
            >
              <Lock className="h-4 w-4 mr-2" />
              Not Yet Open
              <span
                className={`ml-auto text-xs ${
                  effectiveEntryStatus === 'draft' ? 'text-gray-200' : 'text-gray-500'
                }`}
              >
                Form visible but disabled
              </span>
            </Button>

            <Button
              onClick={() => updateTrialStatus('open')}
              disabled={saving}
              variant="outline"
              className={`justify-start ${
                effectiveEntryStatus === 'open'
                  ? 'bg-green-600 text-white border-green-600 hover:bg-green-700 hover:text-white'
                  : 'hover:bg-green-50'
              }`}
            >
              <Unlock className="h-4 w-4 mr-2" />
              Open for Entries
              <span
                className={`ml-auto text-xs ${
                  effectiveEntryStatus === 'open' ? 'text-green-100' : 'text-gray-500'
                }`}
              >
                Accepting registrations
              </span>
            </Button>

            <Button
              onClick={() => updateTrialStatus('closed')}
              disabled={saving}
              variant="outline"
              className={`justify-start ${
                effectiveEntryStatus === 'closed'
                  ? 'bg-red-600 text-white border-red-600 hover:bg-red-700 hover:text-white'
                  : 'hover:bg-red-50'
              }`}
            >
              <Lock className="h-4 w-4 mr-2" />
              Closed
              <span
                className={`ml-auto text-xs ${
                  effectiveEntryStatus === 'closed' ? 'text-red-100' : 'text-gray-500'
                }`}
              >
                No longer accepting entries
              </span>
            </Button>
          </div>
        </div>

        <div className="space-y-4 p-4 border rounded-lg bg-blue-50/40">
          <div>
            <h3 className="font-semibold text-lg">Automatic Opening</h3>
            <p className="text-sm text-gray-600">
              The public form will count down and begin accepting entries automatically at this time.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="entry-open-at">Opening date and time</Label>
              <Input
                id="entry-open-at"
                type="datetime-local"
                value={entryOpenLocal}
                onChange={(event) => setEntryOpenLocal(event.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry-timezone">Timezone where the trial is held</Label>
              <Select value={entryTimezone} onValueChange={setEntryTimezone} disabled={saving}>
                <SelectTrigger id="entry-timezone"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/St_Johns">Newfoundland</SelectItem>
                  <SelectItem value="America/Halifax">Atlantic</SelectItem>
                  <SelectItem value="America/Toronto">Eastern</SelectItem>
                  <SelectItem value="America/Winnipeg">Central</SelectItem>
                  <SelectItem value="America/Edmonton">Mountain</SelectItem>
                  <SelectItem value="America/Vancouver">Pacific</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveEntrySchedule} disabled={saving || !entryOpenLocal}>
              <Save className="h-4 w-4 mr-2" />Save Automatic Opening
            </Button>
            {entryOpenLocal && (
              <Button variant="outline" onClick={clearEntrySchedule} disabled={saving}>
                Clear Schedule
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-600">
            Use the timezone at the trial location, even if you are scheduling while travelling.
            Saving a schedule sets the trial to Not Yet Open. You can still open it early or close it at any time using the controls above.
          </p>
        </div>

        {effectiveEntryStatus === 'open' && trialDays.length > 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Per-Day Entry Control</h3>
              <p className="text-sm text-gray-600">
                Close entries for specific days (e.g., if Saturday fills up)
              </p>
            </div>

            <div className="space-y-3">
              {trialDays.map((day) => (
                <div
                  key={day.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-white"
                >
                  <div className="flex-1">
                    <div className="font-medium">Day {day.day_number}</div>
                    <div className="text-sm text-gray-600">{formatDate(day.trial_date)}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      className={
                        day.is_accepting_entries
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {day.is_accepting_entries ? 'Open' : 'Closed'}
                    </Badge>

                    <div className="flex items-center gap-2">
                      <Label htmlFor={`day-${day.id}`} className="text-sm">
                        Accept Entries
                      </Label>
                      <Switch
                        id={`day-${day.id}`}
                        checked={day.is_accepting_entries}
                        onCheckedChange={(checked: boolean) => updateDayStatus(day.id, checked)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> If a day is closed, competitors will not be able to select
                classes on that day. Use this when a specific day reaches capacity.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {effectiveEntryStatus !== 'open' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Per-day controls are only available when trial status is "Open for Entries"
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
