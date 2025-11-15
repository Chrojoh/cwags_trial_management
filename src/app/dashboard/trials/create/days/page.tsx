'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar,
  ArrowRight,
  ArrowLeft,
  Save,
  CheckCircle,
  Info,
  Plus,
  Minus,
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
  isCustom?: boolean;  // Track if this is a custom-added day
}

function TrialDaysPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      12, 0, 0  // Set to noon to avoid timezone issues
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
      // Parse dates as local dates, not UTC
      const startParts = trialData.start_date.split('-');
      const endParts = trialData.end_date.split('-');
      
      const start = new Date(
        parseInt(startParts[0]), 
        parseInt(startParts[1]) - 1, 
        parseInt(startParts[2]),
        12, 0, 0 // Set to noon to avoid timezone issues
      );
      
      const end = new Date(
        parseInt(endParts[0]), 
        parseInt(endParts[1]) - 1, 
        parseInt(endParts[2]),
        12, 0, 0
      );
      
      const days: TrialDay[] = [];
      let dayNumber = 1;

      // Generate days without timezone conversion
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
              console.log(`Restored selection for ${day.trial_date}`);
            }
          });

          // Add any custom days that are outside the trial date range
          existingDays.forEach((existing: any) => {
            const existsInGenerated = days.find(d => d.trial_date === existing.trial_date);
            if (!existsInGenerated) {
              // This is a custom day outside the original date range
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

  // Load trial data on component mount
  useEffect(() => {
    const loadTrialData = async () => {
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
          generateAvailableDays(result.data);
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
    };

    loadTrialData();
  }, [trialId, generateAvailableDays]);

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

    // Check if day already exists
    const dayExists = trialDays.find(d => d.trial_date === newDayDate);
    if (dayExists) {
      setErrors(['This day is already in the trial. Please select a different date.']);
      return;
    }

    // Add new day
    const newDay: TrialDay = {
      trial_date: newDayDate,
      selected: true,  // Auto-select new days
      max_entries: trial?.max_entries_per_day || 50,
      notes: '',
      isCustom: true
    };

    setTrialDays(prev => {
      const updated = [...prev, newDay];
      // Sort chronologically
      updated.sort((a, b) => a.trial_date.localeCompare(b.trial_date));
      // Renumber
      updated.forEach((day, index) => {
        day.day_number = index + 1;
      });
      return updated;
    });

    // Reset form
    setNewDayDate('');
    setShowAddDay(false);
    setErrors([]);
  };

  const handleRemoveDay = (dayIndex: number) => {
    const day = trialDays[dayIndex];
    if (!day.isCustom && !window.confirm(`Remove ${formatDate(day.trial_date)} from the trial? This will delete all classes and entries for this day.`)) {
      return;
    }

    setTrialDays(prev => {
      const updated = prev.filter((_, index) => index !== dayIndex);
      // Renumber remaining days
      updated.forEach((d, index) => {
        d.day_number = index + 1;
      });
      return updated;
    });
  };

  const handleQuickSelect = (pattern: string) => {
    setTrialDays(prev => prev.map((day, index) => {
      switch (pattern) {
        case 'all':
          return { ...day, selected: true };
        case 'none':
          return { ...day, selected: false };
        case 'odd':
          return { ...day, selected: index % 2 === 0 };
        case 'even':
          return { ...day, selected: index % 2 === 1 };
        case 'weekends':
          const parts = day.trial_date.split('-');
          const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          const dayOfWeek = date.getDay();
          return { ...day, selected: dayOfWeek === 0 || dayOfWeek === 6 };
        default:
          return day;
      }
    }));
  };

  const handleSave = async () => {
  const selectedDays = trialDays.filter(day => day.selected);
  
  if (selectedDays.length === 0) {
    setErrors(['Please select at least one day for your trial.']);
    return;
  }

  setSaving(true);
  setErrors([]);

  try {
    console.log('Saving trial days:', selectedDays);

    if (isEditMode) {
      // ===== SMART EDIT: Only add/remove/update what changed =====
      
      // Get existing days from database
      const { data: existingDays, error: fetchError } = await supabase
        .from('trial_days')
        .select('*')
        .eq('trial_id', trialId)
        .order('day_number');
      
      if (fetchError) {
        throw new Error(`Failed to fetch existing days: ${fetchError.message}`);
      }

      const existingDates = new Set(existingDays?.map(d => d.trial_date) || []);
      const selectedDates = new Set(selectedDays.map(d => d.trial_date));

      // Find days to ADD (in selectedDays but not in existingDays)
      const daysToAdd = selectedDays.filter(day => !existingDates.has(day.trial_date));
      
      // Find days to REMOVE (in existingDays but not in selectedDays)
      const daysToRemove = existingDays?.filter(day => !selectedDates.has(day.trial_date)) || [];

      // Find days to UPDATE (in both, but notes changed)
      const daysToUpdate = selectedDays.filter(day => {
        const existing = existingDays?.find(d => d.trial_date === day.trial_date);
        if (!existing) return false;
        
        return existing.notes !== (day.notes || '');
      });

      console.log('Days to add:', daysToAdd.length);
      console.log('Days to remove:', daysToRemove.length);
      console.log('Days to update:', daysToUpdate.length);

      // DELETE removed days
      if (daysToRemove.length > 0) {
        for (const day of daysToRemove) {
          const { error: deleteError } = await supabase
            .from('trial_days')
            .delete()
            .eq('id', day.id);
          
          if (deleteError) {
            throw new Error(`Failed to delete day ${day.trial_date}: ${deleteError.message}`);
          }
          console.log(`Deleted day: ${day.trial_date}`);
        }
      }

      // INSERT new days (CRITICAL FIX: Don't auto-assign day_number in edit mode)
      if (daysToAdd.length > 0) {
        // SAFETY: In edit mode, new days get the NEXT available number
        // They DON'T automatically insert in the middle and renumber everything
        // This prevents disrupting existing classes/entries
        
        const maxDayNumber = Math.max(0, ...(existingDays?.map(d => d.day_number) || [0]));
        
        for (let i = 0; i < daysToAdd.length; i++) {
          const day = daysToAdd[i];
          const dayData = {
            trial_id: trialId!,
            trial_date: day.trial_date,
            // IMPORTANT: Append to the end, don't renumber existing days
            day_number: maxDayNumber + i + 1,
            notes: day.notes || '',
            day_status: 'active'
          };

          console.log(`Adding new day ${dayData.day_number}:`, dayData);
          console.log('⚠️ Note: This day is added to the END. Use "Custom Day Number" if you need it in a specific position.');

          const { error: insertError } = await supabase
            .from('trial_days')
            .insert(dayData);
          
          if (insertError) {
            throw new Error(`Failed to add day ${day.trial_date}: ${insertError.message}`);
          }
        }
      }

      // UPDATE existing days that changed
      if (daysToUpdate.length > 0) {
        for (const day of daysToUpdate) {
          const existing = existingDays?.find(d => d.trial_date === day.trial_date);
          if (!existing) continue;

          const { error: updateError } = await supabase
            .from('trial_days')
            .update({
              notes: day.notes || ''
            })
            .eq('id', existing.id);
          
          if (updateError) {
            throw new Error(`Failed to update day ${day.trial_date}: ${updateError.message}`);
          }
          console.log(`Updated day: ${day.trial_date}`);
        }
      }

      // REMOVED: Automatic renumbering in edit mode
      // This was dangerous because it could disrupt existing classes/entries
      // If you need to renumber, you should do it manually via a separate action

    } else {
      // ===== CREATE MODE: Insert all selected days =====
      // In create mode, we CAN number chronologically because nothing exists yet
      for (let i = 0; i < selectedDays.length; i++) {
        const day = selectedDays[i];
        const dayData = {
          trial_id: trialId!,
          trial_date: day.trial_date,
          day_number: i + 1,
          notes: day.notes || '',
          day_status: 'active'
        };

        const { error: insertError } = await supabase
          .from('trial_days')
          .insert(dayData);
        
        if (insertError) {
          throw new Error(`Failed to save day ${day.trial_date}: ${insertError.message}`);
        }
      }
    }

    console.log('All trial days saved successfully');
    
    if (isEditMode) {
      router.push(`/dashboard/trials/${trialId}`);
    } else {
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
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
                        ? 'bg-blue-600 text-white' 
                        : isCompleted 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-200 text-gray-600'
                    }`}>
                      {stepNumber}
                    </div>
                    <span className="text-sm font-medium hidden sm:block">{title}</span>
                  </div>
                  {index < 3 && (
                    <div className={`ml-4 w-8 sm:w-16 h-0.5 ${
                      stepNumber < 2 ? 'bg-green-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Mode Indicator */}
        {isEditMode && (
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-orange-900">
                <Info className="h-5 w-5" />
                <span className="font-semibold">Editing Days</span>
              </div>
              <p className="text-sm text-orange-700 mt-2">
                You can add custom days outside the original trial date range. Changes will be saved when you click "Save Changes".
              </p>
            </CardContent>
          </Card>
        )}

        {/* Trial Summary */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-900">
              <Calendar className="h-5 w-5" />
              <span>{trial.trial_name}</span>
            </CardTitle>
            <CardDescription className="text-blue-700">
              Trial period: {formatDate(trial.start_date)} to {formatDate(trial.end_date)}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Instructions */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Days are <strong>unselected by default</strong>. Select which days you want to include in your trial. 
            You can customize the maximum entries and add notes for each day. Use the quick selection buttons for common patterns.
            {isEditMode && " In edit mode, you can also add custom days outside the original date range."}
          </AlertDescription>
        </Alert>

        {/* Errors */}
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

        {/* Quick Selection and Add Day */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Quick Selection</CardTitle>
                <CardDescription>
                  Choose common day patterns with one click
                </CardDescription>
              </div>
              {isEditMode && (
                <Button 
                  onClick={() => setShowAddDay(!showAddDay)} 
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Day
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => handleQuickSelect('all')} 
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                All Days
              </Button>
              <Button 
                onClick={() => handleQuickSelect('none')} 
                variant="outline"
                size="sm"
              >
                <Minus className="h-4 w-4 mr-2" />
                None
              </Button>
              <Button 
                onClick={() => handleQuickSelect('odd')} 
                variant="outline"
                size="sm"
              >
                Odd Days (1st, 3rd, 5th...)
              </Button>
              <Button 
                onClick={() => handleQuickSelect('even')} 
                variant="outline"
                size="sm"
              >
                Even Days (2nd, 4th, 6th...)
              </Button>
              <Button 
                onClick={() => handleQuickSelect('weekends')} 
                variant="outline"
                size="sm"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Weekends
              </Button>
            </div>

            {/* Add Custom Day Form */}
            {showAddDay && (
              <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Add Custom Day</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setShowAddDay(false);
                      setNewDayDate('');
                      setErrors([]);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-day-date">Select Date</Label>
                  <Input
                    id="new-day-date"
                    type="date"
                    value={newDayDate}
                    onChange={(e) => setNewDayDate(e.target.value)}
                  />
                  <p className="text-xs text-gray-600">
                    Add days outside the original trial date range (e.g., for weather makeup days)
                  </p>
                </div>
                <Button 
                  onClick={handleAddCustomDay}
                  size="sm"
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add This Day
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selection Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Selection Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600">{selectedCount}</div>
                <div className="text-sm text-gray-600">Days Selected</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">{totalEntries}</div>
                <div className="text-sm text-gray-600">Total Max Entries</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600">{trialDays.length}</div>
                <div className="text-sm text-gray-600">Available Days</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Select Trial Days */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Select Trial Days</span>
            </CardTitle>
            <CardDescription>
              Choose which days to include in your trial and set the maximum entries for each day.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {trialDays.map((day, index) => (
              <div 
                key={index} 
                className={`border rounded-lg p-4 transition-all ${
                  day.selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id={`day-${index}`}
                    checked={day.selected}
                    onCheckedChange={() => handleDayToggle(index)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <Label 
                        htmlFor={`day-${index}`} 
                        className="font-medium text-base cursor-pointer"
                      >
                        {formatDateForDisplay(day.trial_date)}
                        {day.isCustom && (
                          <Badge variant="secondary" className="ml-2">Custom Day</Badge>
                        )}
                      </Label>
                      {isEditMode && (
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
                    <p className="text-sm text-gray-500">
                      Day {day.day_number} of {trialDays.length}
                    </p>
                    
                    {day.selected && (
                      <div className="mt-3 space-y-3 pl-1">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`max-${index}`} className="text-sm">
                              Max Entries
                            </Label>
                            <Input
                              id={`max-${index}`}
                              type="number"
                              min="1"
                              value={day.max_entries}
                              onChange={(e) => handleMaxEntriesChange(index, parseInt(e.target.value) || 50)}
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

          <div className="flex space-x-3">
            {!isEditMode && (
              <Button
                onClick={() => router.push('/dashboard/trials')}
                variant="outline"
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={saving || selectedCount === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  {isEditMode ? 'Save Changes' : 'Continue to Levels'}
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
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Loading...</p>
          </div>
        </div>
      </MainLayout>
    }>
      <TrialDaysPageContent />
    </Suspense>
  );
}