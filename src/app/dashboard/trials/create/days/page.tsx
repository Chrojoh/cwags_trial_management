'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { 
  Calendar,
  ArrowRight,
  ArrowLeft,
  Save,
  CheckCircle,
  Info,
  Plus,
  Minus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { simpleTrialOperations } from '@/lib/trial-operations-simple';

interface TrialDay {
  trial_date: string;
  selected: boolean;
  max_entries: number;
  notes: string;
  day_number?: number;
}

export default function TrialDaysPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trialId = searchParams.get('trial');
  const isEditMode = searchParams.get('mode') === 'edit';
  
  const [trial, setTrial] = useState<any | null>(null);
  const [trialDays, setTrialDays] = useState<TrialDay[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  }, [trialId]);

  // Generate the available days based on start and end date
  const generateAvailableDays = async (trialData: any) => {
    if (trialData.start_date && trialData.end_date) {
      const start = new Date(trialData.start_date);
      const end = new Date(trialData.end_date);
      const days: TrialDay[] = [];
      let dayNumber = 1;

      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
  // Fix timezone issue - format date manually instead of using toISOString()
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;
  
  days.push({
    trial_date: dateString,
    selected: false,
    max_entries: trialData.max_entries_per_day || 50,
    notes: '',
    day_number: dayNumber++
  });
}

      console.log('Generated trial days (default unselected):', days);

      // Check for existing saved days and restore selection
      try {
        const existingDaysResult = await simpleTrialOperations.getTrialDays(trialId!);
        if (existingDaysResult.success && existingDaysResult.data?.length > 0) {
          const existingDays = existingDaysResult.data;
          
          // Mark existing days as selected
          days.forEach(day => {
            const existingDay = existingDays.find((existing: any) => 
              existing.trial_date === day.trial_date
            );
            if (existingDay) {
              day.selected = true;
              console.log(`Restored selection for ${day.trial_date}`);
            }
          });
        }
      } catch (error) {
        console.error('Error loading existing days:', error);
        // Continue with unselected days if loading existing fails
      }

      setTrialDays(days);
    }
  };

  const handleDayToggle = (dayIndex: number) => {
    setTrialDays(prev => 
      prev.map((day, index) => 
        index === dayIndex 
          ? { ...day, selected: !day.selected }
          : day
      )
    );
    
    // Clear errors when user makes changes
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleMaxEntriesChange = (dayIndex: number, value: number) => {
    setTrialDays(prev => 
      prev.map((day, index) => 
        index === dayIndex 
          ? { ...day, max_entries: Math.max(1, value) }
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

  // Quick selection helpers
  const selectAllDays = () => {
    setTrialDays(prev => prev.map(day => ({ ...day, selected: true })));
  };

  const selectNoneDays = () => {
    setTrialDays(prev => prev.map(day => ({ ...day, selected: false })));
  };

  const selectOddDays = () => {
    setTrialDays(prev => 
      prev.map((day, index) => ({ 
        ...day, 
        selected: (index + 1) % 2 === 1 // 1st, 3rd, 5th day, etc.
      }))
    );
  };

  const selectEvenDays = () => {
    setTrialDays(prev => 
      prev.map((day, index) => ({ 
        ...day, 
        selected: (index + 1) % 2 === 0 // 2nd, 4th, 6th day, etc.
      }))
    );
  };

  const selectWeekends = () => {
    setTrialDays(prev => 
      prev.map(day => {
        const date = new Date(day.trial_date);
        const dayOfWeek = date.getDay();
        return { 
          ...day, 
          selected: dayOfWeek === 0 || dayOfWeek === 6 // Sunday or Saturday
        };
      })
    );
  };

  const validateSelection = (): boolean => {
    const newErrors: string[] = [];
    
    const selectedDays = trialDays.filter(day => day.selected);
    if (selectedDays.length === 0) {
      newErrors.push('You must select at least one trial day.');
    }

    // Check for invalid max entries
    const invalidEntries = trialDays.some(day => day.selected && day.max_entries < 1);
    if (invalidEntries) {
      newErrors.push('Max entries must be at least 1 for selected days.');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleNext = async () => {
    if (!validateSelection() || !trialId) return;

    setSaving(true);
    try {
      // Save selected days to database
      const selectedDays = trialDays.filter(day => day.selected);
      const daysToSave = selectedDays.map((day, index) => ({
        trial_date: day.trial_date,
        day_number: index + 1,
        day_status: 'draft',
        notes: day.notes || null
      }));

      console.log('Saving trial days:', daysToSave);

      const result = await simpleTrialOperations.saveTrialDays(trialId, daysToSave);
      
      if (result.success) {
  console.log('Trial days saved successfully');
  if (isEditMode) {
    // Return to trial detail page
    router.push(`/dashboard/trials/${trialId}`);
  } else {
    // Navigate to level selection
    router.push(`/dashboard/trials/create/levels?trial=${trialId}`);
  }
} else {
        console.error('Error saving trial days:', result.error);
        setErrors(['Error saving trial days. Please try again.']);
      }
    } catch (error) {
      console.error('Error saving trial days:', error);
      setErrors(['Error saving trial days. Please try again.']);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (trialId) {
      router.push(`/dashboard/trials/create?trial=${trialId}`);
    } else {
      router.push('/dashboard/trials/create');
    }
  };

  const handleSaveDraft = async () => {
    if (!trialId) return;

    setSaving(true);
    try {
      const selectedDays = trialDays.filter(day => day.selected);
      if (selectedDays.length > 0) {
        const daysToSave = selectedDays.map((day, index) => ({
          trial_date: day.trial_date,
          day_number: index + 1,
          day_status: 'draft',
          notes: day.notes || null
        }));

        console.log('Saving draft days:', daysToSave);

        const result = await simpleTrialOperations.saveTrialDays(trialId, daysToSave);
        
        if (result.success) {
          alert('Draft saved successfully!');
        } else {
          console.error('Error saving draft:', result.error);
          alert('Error saving draft. Please try again.');
        }
      } else {
        alert('Please select at least one day before saving.');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Error saving draft. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <MainLayout title="Create Trial - Select Days">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading trial data...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!trial) {
    return (
      <MainLayout title="Create Trial - Select Days">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>
              {errors.length > 0 ? errors[0] : 'Trial not found.'}
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => router.push('/dashboard/trials/create')}>
              Start Over
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const selectedCount = trialDays.filter(day => day.selected).length;
  const totalDaysAvailable = trialDays.length;
  const totalMaxEntries = trialDays
    .filter(day => day.selected)
    .reduce((sum, day) => sum + day.max_entries, 0);

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Trials', href: '/dashboard/trials' },
    { label: 'Create Trial', href: '/dashboard/trials/create' },
    { label: 'Select Days' }
  ];

  const stepTitles = [
    'Basic Information',
    'Waiver & Notice',
    'Select Days',
    'Choose Levels',
    'Create Rounds',
    'Summary'
  ];

  return (
    <MainLayout 
      title="Create Trial - Select Days"
      breadcrumbItems={breadcrumbItems}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 mb-8 overflow-x-auto">
          {stepTitles.map((title, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === 3; // Current step
            const isCompleted = stepNumber < 3; // Previous steps
            
            return (
              <div key={stepNumber} className="flex items-center flex-shrink-0">
                <div className={`flex items-center space-x-2 ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
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
                {index < stepTitles.length - 1 && (
                  <div className={`ml-4 w-8 sm:w-16 h-0.5 ${
                    stepNumber < 3 ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

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

        {/* Quick Selection Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Selection</CardTitle>
            <CardDescription>Choose common day patterns with one click</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={selectAllDays} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                All Days
              </Button>
              <Button variant="outline" onClick={selectNoneDays} size="sm">
                <Minus className="h-4 w-4 mr-1" />
                None
              </Button>
              <Button variant="outline" onClick={selectOddDays} size="sm">
                Odd Days (1st, 3rd, 5th...)
              </Button>
              <Button variant="outline" onClick={selectEvenDays} size="sm">
                Even Days (2nd, 4th, 6th...)
              </Button>
              <Button variant="outline" onClick={selectWeekends} size="sm">
                <Calendar className="h-4 w-4 mr-1" />
                Weekends
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Selection Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Selection Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{selectedCount}</div>
                <div className="text-sm text-gray-600">Days Selected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{totalMaxEntries}</div>
                <div className="text-sm text-gray-600">Total Max Entries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{totalDaysAvailable}</div>
                <div className="text-sm text-gray-600">Available Days</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Day Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span>Select Trial Days</span>
            </CardTitle>
            <CardDescription>
              Choose which days to include in your trial and set the maximum entries for each day.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {trialDays.map((day, index) => (
              <div 
                key={day.trial_date}
                className={`border rounded-lg p-4 transition-all ${
                  day.selected 
                    ? 'border-blue-300 bg-blue-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start space-x-4">
                  {/* Checkbox */}
                  <div className="flex items-center space-x-3 pt-1">
                    <Checkbox
                      checked={day.selected}
                      onCheckedChange={() => handleDayToggle(index)}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    {day.selected && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Selected
                      </Badge>
                    )}
                  </div>

                  {/* Day Details */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Date */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Date</Label>
                      <div className="mt-1">
                        <div className="font-semibold text-gray-900">
                          {formatDate(day.trial_date)}
                        </div>
                        <div className="text-sm text-gray-600">
                          Day {index + 1} of {totalDaysAvailable}
                        </div>
                      </div>
                    </div>

                    {/* Max Entries */}
                    <div>
                      <Label htmlFor={`entries-${index}`} className="text-sm font-medium text-gray-700">
                        Max Entries
                      </Label>
                      <div className="mt-1 flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMaxEntriesChange(index, day.max_entries - 5)}
                          disabled={!day.selected || day.max_entries <= 5}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          id={`entries-${index}`}
                          type="number"
                          min="1"
                          max="200"
                          value={day.max_entries}
                          onChange={(e) => handleMaxEntriesChange(index, parseInt(e.target.value) || 1)}
                          disabled={!day.selected}
                          className="w-20 text-center"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMaxEntriesChange(index, day.max_entries + 5)}
                          disabled={!day.selected || day.max_entries >= 200}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <Label htmlFor={`notes-${index}`} className="text-sm font-medium text-gray-700">
                        Day Notes (Optional)
                      </Label>
                      <Input
                        id={`notes-${index}`}
                        value={day.notes}
                        onChange={(e) => handleNotesChange(index, e.target.value)}
                        disabled={!day.selected}
                        placeholder="Special notes for this day..."
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Draft</span>
            </Button>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={saving}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>
            <Button
              onClick={handleNext}
              disabled={selectedCount === 0 || saving}
              className="flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>{isEditMode ? 'Save & Return' : 'Continue to Levels'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}