'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar,
  ArrowRight,
  ArrowLeft,
  Save,
  CheckCircle,
  Info,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { simpleTrialOperations } from '@/lib/trialOperationsSimple';

interface TrialDay {
  trial_date: string;
  selected: boolean;
  max_entries: number;
  notes: string;
  day_number?: number;
  isCustom?: boolean;
}

function TrialDaysPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowser();
  const trialId = searchParams.get('trial');
  const isEditMode = searchParams.get('mode') === 'edit';
  
  const [trial, setTrial] = useState<any>(null);
  const [trialDays, setTrialDays] = useState<TrialDay[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddDay, setShowAddDay] = useState(false);
  const [newDayDate, setNewDayDate] = useState('');

  // Helper function to format dates WITHOUT timezone shift
  const formatDateForDisplay = (dateString: string): string => {
    const parts = dateString.split('-');
    const date = new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
      12, 0, 0
    );
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Short format for header
  const formatDate = (dateString: string): string => {
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

  // Generate available days WITHOUT timezone issues
  const generateAvailableDays = useCallback(async (trialData: any) => {
    if (trialData.start_date && trialData.end_date) {
      const startParts = trialData.start_date.split('-');
      const endParts = trialData.end_date.split('-');
      
      const start = new Date(
        parseInt(startParts[0]), 
        parseInt(startParts[1]) - 1, 
        parseInt(startParts[2]),
        12, 0, 0
      );
      
      const end = new Date(
        parseInt(endParts[0]), 
        parseInt(endParts[1]) - 1, 
        parseInt(endParts[2]),
        12, 0, 0
      );
      
      const days: TrialDay[] = [];
      let dayNumber = 1;

      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        days.push({
          trial_date: dateString,
          selected: false,
          max_entries: trialData.max_entries_per_day || 50,
          notes: '',
          day_number: dayNumber++,
          isCustom: false
        });
      }

      console.log('Generated trial days:', days);

      // Check for existing saved days and restore selection
      try {
        const existingDaysResult = await simpleTrialOperations.getTrialDays(trialId!);
        if (existingDaysResult.success && existingDaysResult.data?.length > 0) {
          const existingDays = existingDaysResult.data;
          
          // Mark existing days as selected
          days.forEach(day => {
            const existingDay = existingDays.find((existing: { trial_date: string }) =>
              existing.trial_date === day.trial_date
            );
            if (existingDay) {
              day.selected = true;
              day.notes = existingDay.notes || '';
              console.log(`Restored selection for ${day.trial_date}`);
            }
          });

          // Add any custom days that are outside the trial date range
          existingDays.forEach((existing: any) => {
            const existsInGenerated = days.find(d => d.trial_date === existing.trial_date);
            if (!existsInGenerated) {
              days.push({
                trial_date: existing.trial_date,
                selected: true,
                max_entries: trialData.max_entries_per_day || 50,
                notes: existing.notes || '',
                isCustom: true
              });
              console.log(`Added custom day: ${existing.trial_date}`);
            }
          });

          // Sort days chronologically
          days.sort((a, b) => a.trial_date.localeCompare(b.trial_date));

          // Renumber days
          days.forEach((day, index) => {
            day.day_number = index + 1;
          });
        }
      } catch (error) {
        console.error('Error loading existing days:', error);
      }

      setTrialDays(days);
    }
  }, [trialId]);

  // Load trial data - moved outside useEffect so it can be reused
  const loadTrialData = useCallback(async () => {
    if (!trialId) {
      setErrors(['Trial ID not found. Please start from the beginning.']);
      setLoading(false);
      return;
    }

    try {
      console.log('Loading trial data for ID:', trialId);
      const result = await simpleTrialOperations.getTrial(trialId);
      
      if (result.success && result.data) {
        console.log('Trial data loaded:', result.data);
        setTrial(result.data);
        await generateAvailableDays(result.data);
      } else {
        console.error('Failed to load trial:', result.error);
        setErrors(['Trial not found. Please start from the beginning.']);
      }
    } catch (error) {
      console.error('Error loading trial:', error);
      setErrors(['Error loading trial data. Please try again.']);
    } finally {
      setLoading(false);
    }
  }, [trialId, generateAvailableDays]);

  // Load trial data on component mount
  useEffect(() => {
    loadTrialData();
  }, [loadTrialData]);

  const handleDayToggle = (dayIndex: number) => {
    setTrialDays(prev => 
      prev.map((day, index) => 
        index === dayIndex 
          ? { ...day, selected: !day.selected }
          : day
      )
    );
    
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleMaxEntriesChange = (dayIndex: number, value: number) => {
    setTrialDays(prev => 
      prev.map((day, index) => 
        index === dayIndex 
          ? { ...day, max_entries: value }
          : day
      )
    );
  };

  const handleNotesChange = (dayIndex: number, value: string) => {
    setTrialDays(prev => 
      prev.map((day, index) => 
        index === dayIndex 
          ? { ...day, notes: value }
          : day
      )
    );
  };

  const handleAddCustomDay = () => {
    if (!newDayDate) {
      setErrors(['Please select a date for the new day.']);
      return;
    }

    const dayExists = trialDays.find(d => d.trial_date === newDayDate);
    if (dayExists) {
      setErrors(['This day is already in the trial. Please select a different date.']);
      return;
    }

    const newDay: TrialDay = {
      trial_date: newDayDate,
      selected: true,
      max_entries: trial?.max_entries_per_day || 50,
      notes: '',
      isCustom: true
    };

    setTrialDays(prev => {
      const updated = [...prev, newDay];
      updated.sort((a, b) => a.trial_date.localeCompare(b.trial_date));
      updated.forEach((day, index) => {
        day.day_number = index + 1;
      });
      return updated;
    });

    setNewDayDate('');
    setShowAddDay(false);
    setErrors([]);
  };

  const handleRemoveDay = (dayIndex: number) => {
    const day = trialDays[dayIndex];
    if (!day.isCustom && !window.confirm(`Remove ${formatDate(day.trial_date)} from the trial?`)) {
      return;
    }

    setTrialDays(prev => {
      const updated = prev.filter((_, index) => index !== dayIndex);
      updated.forEach((day, index) => {
        day.day_number = index + 1;
      });
      return updated;
    });
  };

  // Save Draft - saves data and stays on page
  const handleSaveDraft = async () => {
    const selectedDays = trialDays.filter(d => d.selected);
    
    if (selectedDays.length === 0) {
      alert('Please select at least one day before saving.');
      return;
    }

    setSaving(true);
    setErrors([]);

    try {
      // Check for existing days
      const { data: existingDays, error: fetchError } = await supabase
        .from('trial_days')
        .select('*')
        .eq('trial_id', trialId!);

      if (fetchError) {
        throw new Error('Failed to fetch existing trial days');
      }

      const existingDayDates = new Set(existingDays?.map(d => d.trial_date) || []);

      // Save each selected day
      for (let i = 0; i < selectedDays.length; i++) {
        const day = selectedDays[i];
        const dayData = {
          trial_id: trialId!,
          trial_date: day.trial_date,
          day_number: i + 1,
          notes: day.notes || '',
          day_status: 'active'
        };

        if (existingDayDates.has(day.trial_date)) {
          // Update existing
          const existingDay = existingDays?.find(d => d.trial_date === day.trial_date);
          if (existingDay) {
            const { error: updateError } = await supabase
              .from('trial_days')
              .update({ notes: day.notes || '' })
              .eq('id', existingDay.id);
            
            if (updateError) {
              throw new Error(`Failed to update day ${day.trial_date}: ${updateError.message}`);
            }
          }
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from('trial_days')
            .insert(dayData);
          
          if (insertError) {
            throw new Error(`Failed to save day ${day.trial_date}: ${insertError.message}`);
          }
        }
      }

      console.log('Draft saved successfully');
      alert('Draft saved successfully! You can continue editing or come back later.');
      
    } catch (error) {
      console.error('Error saving draft:', error);
      alert(error instanceof Error ? error.message : 'Failed to save draft. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Main save handler - continues to next step or stays on page in edit mode
  const handleSave = async () => {
    const selectedDays = trialDays.filter(d => d.selected);
    
    if (selectedDays.length === 0) {
      setErrors(['Please select at least one day for the trial.']);
      return;
    }

    setSaving(true);
    setErrors([]);

    try {
      const { data: existingDays, error: fetchError } = await supabase
        .from('trial_days')
        .select('*')
        .eq('trial_id', trialId!)
        .order('trial_date');

      if (fetchError) {
        throw new Error('Failed to fetch existing trial days');
      }

      // Both CREATE and EDIT modes now use the same smart logic
      const existingDayDates = new Set(existingDays?.map(d => d.trial_date) || []);
      const selectedDayDates = new Set(selectedDays.map(d => d.trial_date));
      
      const daysToAdd = selectedDays.filter(d => !existingDayDates.has(d.trial_date));
      const daysToRemove = existingDays?.filter(d => !selectedDayDates.has(d.trial_date)) || [];
      const daysToUpdate = selectedDays.filter(d => existingDayDates.has(d.trial_date));

      console.log('Days to add:', daysToAdd.length);
      console.log('Days to remove:', daysToRemove.length);
      console.log('Days to update:', daysToUpdate.length);

      // Delete removed days
      if (daysToRemove.length > 0) {
        for (const day of daysToRemove) {
          const { error: deleteError } = await supabase
            .from('trial_days')
            .delete()
            .eq('id', day.id);
          
          if (deleteError) {
            throw new Error(`Failed to remove day ${day.trial_date}: ${deleteError.message}`);
          }
          console.log(`Deleted day: ${day.trial_date}`);
        }
      }

      // Add new days
      if (daysToAdd.length > 0) {
        // Get current max day number to avoid conflicts
        const maxDayNumber = existingDays && existingDays.length > 0
          ? Math.max(...existingDays.map(d => d.day_number))
          : 0;
        
        for (let i = 0; i < daysToAdd.length; i++) {
          const day = daysToAdd[i];
          const dayData = {
            trial_id: trialId!,
            trial_date: day.trial_date,
            day_number: maxDayNumber + i + 1,
            notes: day.notes || '',
            day_status: 'active'
          };

          const { error: insertError } = await supabase
            .from('trial_days')
            .insert(dayData);
          
          if (insertError) {
            throw new Error(`Failed to add day ${day.trial_date}: ${insertError.message}`);
          }
          console.log(`Added day: ${day.trial_date} with day_number ${dayData.day_number}`);
        }
      }

      // Update existing days (notes only, preserve day_number)
      if (daysToUpdate.length > 0) {
        for (const day of daysToUpdate) {
          const existing = existingDays?.find(d => d.trial_date === day.trial_date);
          if (!existing) continue;

          const { error: updateError } = await supabase
            .from('trial_days')
            .update({ notes: day.notes || '' })
            .eq('id', existing.id);
          
          if (updateError) {
            throw new Error(`Failed to update day ${day.trial_date}: ${updateError.message}`);
          }
          console.log(`Updated day: ${day.trial_date}`);
        }
      }

      console.log('All trial days saved successfully');

      if (isEditMode) {
        alert('Trial days saved successfully!');
        // Reload data to show updated state
        setLoading(true);
        await loadTrialData();
      } else {
        // In create mode, continue to next step
        router.push(`/dashboard/trials/create/levels?trial=${trialId}`);
      }
      
    } catch (error) {
      console.error('Error saving trial days:', error);
      setErrors([error instanceof Error ? error.message : 'Failed to save trial days. Please try again.']);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (isEditMode) {
      router.push(`/dashboard/trials/${trialId}`);
    } else {
      router.push(`/dashboard/trials/create?trial=${trialId}`);
    }
  };

  if (loading) {
    return (
      <MainLayout title={isEditMode ? "Edit Trial - Select Days" : "Create Trial - Select Days"}>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Loading trial data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!trial) {
    return (
      <MainLayout title={isEditMode ? "Edit Trial - Select Days" : "Create Trial - Select Days"}>
        <Alert variant="destructive">
          <AlertDescription>Trial not found. Please start from the beginning.</AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Trials', href: '/dashboard/trials' },
    ...(isEditMode 
      ? [{ label: trial.trial_name, href: `/dashboard/trials/${trialId}` }, { label: 'Edit Days' }]
      : [{ label: 'Create Trial', href: '/dashboard/trials/create' }, { label: 'Select Days' }]
    )
  ];

  const selectedCount = trialDays.filter(d => d.selected).length;
  const totalEntries = trialDays.filter(d => d.selected).reduce((sum, d) => sum + d.max_entries, 0);

  return (
    <MainLayout 
      title={isEditMode ? "Edit Trial - Select Days" : "Create Trial - Select Days"}
      breadcrumbItems={breadcrumbItems}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Progress Indicator - Only show in create mode */}
        {!isEditMode && (
          <div className="flex items-center justify-center space-x-2 mb-8">
            {['Waiver & Notice', 'Select Days', 'Choose Levels', 'Create Rounds'].map((title, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === 2;
              const isCompleted = stepNumber < 2;
              
              return (
                <div key={index} className="flex items-center">
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                      isActive 
                        ? 'bg-orange-600 text-white' 
                        : isCompleted 
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isCompleted ? <CheckCircle className="h-5 w-5" /> : stepNumber}
                    </div>
                    <span className={`text-sm ${isActive ? 'font-semibold' : ''}`}>
                      {title}
                    </span>
                  </div>
                  {index < 3 && (
                    <div className={`h-0.5 w-12 mx-2 ${isCompleted ? 'bg-green-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Trial Info Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-orange-600" />
              {trial.trial_name}
            </CardTitle>
            <CardDescription>
              {trial.start_date} to {trial.end_date} • {trial.location}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Selected Days:</span>
                <span className="ml-2 font-semibold">{selectedCount}</span>
              </div>
              <div>
                <span className="text-gray-600">Total Entry Capacity:</span>
                <span className="ml-2 font-semibold">{totalEntries}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Days Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Select Trial Days</CardTitle>
                <CardDescription>
                  Choose which days will be part of this trial
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddDay(!showAddDay)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Day
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Add Custom Day Form */}
            {showAddDay && (
              <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Add Custom Day</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddDay(false);
                      setNewDayDate('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Input
                    type="date"
                    value={newDayDate}
                    onChange={(e) => setNewDayDate(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleAddCustomDay}>
                    Add Day
                  </Button>
                </div>
              </div>
            )}

            {/* Day List */}
            {trialDays.map((day, index) => (
              <div 
                key={index}
                className={`p-4 border rounded-lg ${
                  day.selected ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={day.selected}
                    onCheckedChange={() => handleDayToggle(index)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            Day {day.day_number}: {formatDateForDisplay(day.trial_date)}
                          </span>
                          {day.isCustom && (
                            <Badge variant="secondary" className="text-xs">
                              Custom
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatDate(day.trial_date)}
                        </p>
                      </div>
                      {day.isCustom && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDay(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {day.selected && (
                      <div className="space-y-3 pl-6 border-l-2 border-orange-300">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`max-entries-${index}`} className="text-sm">
                              Max Entries for this Day
                            </Label>
                            <Input
                              id={`max-entries-${index}`}
                              type="number"
                              min="1"
                              value={day.max_entries}
                              onChange={(e) => handleMaxEntriesChange(index, parseInt(e.target.value))}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`notes-${index}`} className="text-sm">
                            Day Notes (Optional)
                          </Label>
                          <Textarea
                            id={`notes-${index}`}
                            placeholder="Special notes for this day..."
                            value={day.notes}
                            onChange={(e) => handleNotesChange(index, e.target.value)}
                            className="mt-1"
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button
            onClick={handleBack}
            variant="outline"
            disabled={saving}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {isEditMode ? 'Back to Trial' : 'Previous'}
          </Button>

        <div className="flex justify-end">
  <Button
    onClick={handleSave}
    disabled={saving || selectedCount === 0}
    className="bg-orange-600 hover:bg-orange-700"
  >
    {saving ? (
      <>
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
        Saving...
      </>
    ) : (
      <>
        {isEditMode ? 'Save Changes' : 'Save & Continue'}
        <ArrowRight className="h-4 w-4 ml-2" />
      </>
    )}
  </Button>
</div>
        </div>
      </div>
    </MainLayout>
  );
}

export default function TrialDaysPage() {
  return (
    <Suspense fallback={
      <MainLayout title="Loading...">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Loading...</p>
          </div>
        </div>
      </MainLayout>
    }>
      <TrialDaysPageContent />
    </Suspense>
  );
}