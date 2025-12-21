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
import { Lock, Unlock, Calendar, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

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

  useEffect(() => {
    loadTrialDays();
  }, [trialId]);

  const loadTrialDays = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trial_days')
        .select('*')
        .eq('trial_id', trialId)
        .order('day_number');

      if (error) throw error;

      setTrialDays(data || []);
    } catch (err: any) {
      console.error('Error loading trial days:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTrialStatus = async (newStatus: 'draft' | 'open' | 'closed') => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const { error } = await supabase
        .from('trials')
        .update({ entry_status: newStatus })
        .eq('id', trialId);

      if (error) throw error;

      setEntryStatus(newStatus);
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

      setTrialDays(prev =>
        prev.map(day =>
          day.id === dayId ? { ...day, is_accepting_entries: isAccepting } : day
        )
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
    return (
      <Badge className={variant.color}>
        {variant.label}
      </Badge>
    );
  };

 const formatDate = (dateString: string) => {
  // Manual date parsing to avoid timezone shift
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
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
        <CardDescription>
          Control when entries can be submitted for this trial
        </CardDescription>
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
              <p className="text-sm text-gray-600">
                Master control for all entry submissions
              </p>
            </div>
            {getStatusBadge(entryStatus)}
          </div>

          <div className="grid gap-3">
            <Button
              onClick={() => updateTrialStatus('draft')}
              disabled={saving}
              variant="outline"
              className={`justify-start ${
                entryStatus === 'draft'
                  ? 'bg-gray-600 text-white border-gray-600 hover:bg-gray-700 hover:text-white'
                  : 'hover:bg-gray-50'
              }`}
            >
              <Lock className="h-4 w-4 mr-2" />
              Not Yet Open
              <span className={`ml-auto text-xs ${
                entryStatus === 'draft' ? 'text-gray-200' : 'text-gray-500'
              }`}>
                Form visible but disabled
              </span>
            </Button>

            <Button
              onClick={() => updateTrialStatus('open')}
              disabled={saving}
              variant="outline"
              className={`justify-start ${
                entryStatus === 'open'
                  ? 'bg-green-600 text-white border-green-600 hover:bg-green-700 hover:text-white'
                  : 'hover:bg-green-50'
              }`}
            >
              <Unlock className="h-4 w-4 mr-2" />
              Open for Entries
              <span className={`ml-auto text-xs ${
                entryStatus === 'open' ? 'text-green-100' : 'text-gray-500'
              }`}>
                Accepting registrations
              </span>
            </Button>

            <Button
              onClick={() => updateTrialStatus('closed')}
              disabled={saving}
              variant="outline"
              className={`justify-start ${
                entryStatus === 'closed'
                  ? 'bg-red-600 text-white border-red-600 hover:bg-red-700 hover:text-white'
                  : 'hover:bg-red-50'
              }`}
            >
              <Lock className="h-4 w-4 mr-2" />
              Closed
              <span className={`ml-auto text-xs ${
                entryStatus === 'closed' ? 'text-red-100' : 'text-gray-500'
              }`}>
                No longer accepting entries
              </span>
            </Button>
          </div>
        </div>

        {entryStatus === 'open' && trialDays.length > 0 && (
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
                    <div className="font-medium">
                      Day {day.day_number}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDate(day.trial_date)}
                    </div>
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
                        onCheckedChange={(checked: boolean) =>
  updateDayStatus(day.id, checked)
}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> If a day is closed, competitors will not be
                able to select classes on that day. Use this when a specific day
                reaches capacity.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {entryStatus !== 'open' && (
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
