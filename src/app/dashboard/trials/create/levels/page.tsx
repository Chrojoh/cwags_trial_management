'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar,
  ArrowRight,
  ArrowLeft,
  Save,
  CheckCircle,
  Info,
  Edit
} from 'lucide-react';
import { simpleTrialOperations, CWAGS_LEVELS } from '@/lib/trialOperationsSimple';

interface LevelSelection {
  levelName: string;
  category: string;
  selected: boolean;
  entryFee: number;
  maxEntries: number;
  feoAvailable?: boolean;
  feoPrice?: number;
  gamesSubclass?: string;
  notes: string;
}

interface TrialDay {
  id: string;
  day_number: number;
  trial_date: string;
  day_status: string;
}

interface Trial {
  id: string;
  trial_name: string;
  club_name: string;
  location: string;
  start_date: string;
  end_date: string;
}

function TrialLevelsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trialId = searchParams.get('trial');
  const isEditMode = searchParams.get('mode') === 'edit';
  
  const [trial, setTrial] = useState<Trial | null>(null);
  const [trialDays, setTrialDays] = useState<TrialDay[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Scent Work');
  const [levelSelections, setLevelSelections] = useState<{ [dayId: string]: LevelSelection[] }>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load trial data and days
  useEffect(() => {
    const loadTrialData = async () => {
      if (!trialId) {
        setErrors(['Trial ID not found. Please start from the beginning.']);
        setLoading(false);
        return;
      }

      try {
        console.log('Loading trial and days data for ID:', trialId);
        
        // Load trial basic info
        const trialResult = await simpleTrialOperations.getTrial(trialId);
        if (!trialResult.success) {
          console.error('Error loading trial:', trialResult.error);
          setErrors(['Failed to load trial data.']);
          setLoading(false);
          return;
        }

        // Load trial days
        const daysResult = await simpleTrialOperations.getTrialDays(trialId);
        if (!daysResult.success) {
          console.error('Error loading trial days:', daysResult.error);
          setErrors(['Failed to load trial days.']);
          setLoading(false);
          return;
        }

        console.log('Trial data:', trialResult.data);
        console.log('Trial days:', daysResult.data);

        setTrial(trialResult.data);
        setTrialDays(daysResult.data);
        
        // Initialize level selections for each day
        await initializeLevelSelections(daysResult.data);
        
      } catch (error) {
        console.error('Error loading trial data:', error);
        setErrors(['Error loading trial data. Please try again.']);
      } finally {
        setLoading(false);
      }
    };

    loadTrialData();
  }, [trialId]);

  const initializeLevelSelections = async (days: TrialDay[]) => {
    const initialSelections: { [dayId: string]: LevelSelection[] } = {};
    
    // First, try to load existing classes for each day
    for (const day of days) {
      try {
        const existingClassesResult = await simpleTrialOperations.getTrialClasses(day.id);
        
        if (existingClassesResult.success && existingClassesResult.data && existingClassesResult.data.length > 0) {
          // Convert existing classes back to level selections
          const existingLevels = existingClassesResult.data.map((cls: any) => ({
            levelName: cls.class_level || '',
            category: cls.subclass || '',
            selected: true,
            entryFee: parseFloat(String(cls.entry_fee || 0)) || 25,
            maxEntries: parseInt(String(cls.max_entries || 0)) || 20,
            feoAvailable: cls.feo_available || false,
            feoPrice: parseFloat(String(cls.feo_price || 0)) || 0,
            gamesSubclass: cls.games_subclass || '',
            notes: String(cls.notes || '')
          }));

          // Create full level list with existing selections marked
          initialSelections[day.id] = Object.entries(CWAGS_LEVELS).flatMap(([category, levels]) =>
            levels.map(levelName => {
             interface ExistingLevel {
  levelName: string;
  category: string;
  [key: string]: any;
}

const existing = existingLevels.find((e: ExistingLevel) => e.levelName === levelName && e.category === category);
              return existing || {
                levelName,
                category,
                selected: false,
                entryFee: 25,
                maxEntries: 20,
                feoAvailable: false,
                feoPrice: 0,
                gamesSubclass: '',
                notes: ''
              };
            })
          );
        } else {
          // No existing classes, create default selections
          initialSelections[day.id] = Object.entries(CWAGS_LEVELS).flatMap(([category, levels]) =>
            levels.map(levelName => ({
              levelName,
              category,
              selected: false,
              entryFee: 25,
              maxEntries: 20,
              feoAvailable: false,
              feoPrice: 0,
              gamesSubclass: '',
              notes: ''
            }))
          );
        }
      } catch (error) {
        console.error(`Error loading existing classes for day ${day.id}:`, error);
        // Fallback to default selections
        initialSelections[day.id] = Object.entries(CWAGS_LEVELS).flatMap(([category, levels]) =>
          levels.map(levelName => ({
            levelName,
            category,
            selected: false,
            entryFee: 25,
            maxEntries: 20,
            feoAvailable: false,
            feoPrice: 0,
            gamesSubclass: '',
            notes: ''
          }))
        );
      }
    }
    
    setLevelSelections(initialSelections);
  };

  const updateLevelSelection = (dayId: string, levelIndex: number, field: keyof LevelSelection, value: string | number | boolean) => {
    setLevelSelections(prev => ({
      ...prev,
      [dayId]: prev[dayId]?.map((level, index) => 
        index === levelIndex 
          ? { ...level, [field]: value }
          : level
      ) || []
    }));
    
    // Clear errors when user makes changes
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const validateSelections = (): boolean => {
    const newErrors: string[] = [];
    
    // Check if at least one level is selected across all days
   const hasSelection = Object.values(levelSelections).some(dayLevels => 
  dayLevels.some(level => level.selected)
);

if (!hasSelection) {
  newErrors.push('You must select at least one level for at least one day.');
}

    // Check for valid entry fees and max entries
    Object.entries(levelSelections).forEach(([, dayLevels]) => {
      dayLevels.forEach((level) => {
        if (level.selected) {
          if (level.entryFee < 0) {
            newErrors.push(`Entry fee for ${level.levelName} must be 0 or greater.`);
          }
          if (level.maxEntries < 1) {
            newErrors.push(`Max entries for ${level.levelName} must be at least 1.`);
          }
          // Check if Games class has required subclass
          if (level.category === 'Games' && (!level.gamesSubclass || level.gamesSubclass.trim() === '')) {
            newErrors.push(`Games subclass is required for ${level.levelName}.`);
          }
        }
      });
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const saveClassesForAllDays = async (): Promise<boolean> => {
    if (!validateSelections() || !trialId) return false;
    

    try {
      console.log('Starting to save classes for all days...');
      
      for (const [dayId, dayLevels] of Object.entries(levelSelections)) {
        const selectedLevels = dayLevels.filter(level => level.selected);
        
        if (selectedLevels.length > 0) {
          // Prepare classes data with proper types and validation including FEO data
          const classesToSave = selectedLevels.map((level, index) => {
            // Ensure all numeric values are properly typed
            const entryFee = typeof level.entryFee === 'number' ? level.entryFee : parseFloat(String(level.entryFee)) || 0;
            const maxEntries = typeof level.maxEntries === 'number' ? level.maxEntries : parseInt(String(level.maxEntries)) || 1;
            const feoPrice = level.feoAvailable && level.feoPrice ? 
              (typeof level.feoPrice === 'number' ? level.feoPrice : parseFloat(String(level.feoPrice)) || 0) : 0;
            
            // Map category names to database-allowed class_type values
            const classTypeMapping: { [key: string]: string } = {
              'Scent Work': 'scent',
              'Rally': 'rally',
              'Obedience': 'obedience', 
              'Games': 'games'
            };
            
            const classType = classTypeMapping[level.category] || 'scent'; // Default fallback

            return {
              class_name: level.levelName.trim(),
              class_type: classType,
              subclass: level.category.trim(),
              class_level: level.levelName.trim(),
              entry_fee: entryFee,
              max_entries: maxEntries,
              feo_available: level.feoAvailable || false,
              feo_price: feoPrice,
              games_subclass: level.category === 'Games' ? (level.gamesSubclass || null) : null,
              class_order: index + 1,
              class_status: 'draft',
              notes: level.notes?.trim() || null
            };
          });

          console.log(`Saving ${classesToSave.length} classes for day ${dayId}:`, classesToSave);
          
          const result = await simpleTrialOperations.saveTrialClasses(dayId, classesToSave);
          
          if (!result.success) {
            console.error(`Error saving classes for day ${dayId}:`, result.error);
            const errorMessage = typeof result.error === 'string' 
              ? result.error 
              : (result.error && typeof result.error === 'object' && 'message' in result.error)
                ? String(result.error.message)
                : 'Unknown error';
            throw new Error(`Failed to save classes for day ${dayId}: ${errorMessage}`);
          }
          
          console.log(`Successfully saved classes for day ${dayId}`);
        }
      }

      console.log('All classes saved successfully');
      return true;
      
    } catch (error) {
      console.error('Error saving classes:', error);
      setErrors([error instanceof Error ? error.message : 'Error saving trial classes. Please try again.']);
      return false;
    }
  };

  const handleNext = async () => {
    if (!validateSelections() || !trialId) return;

    setSaving(true);
    try {
      const success = await saveClassesForAllDays();
      
      if (success) {
        console.log('Classes saved successfully');
        
        // Navigate based on mode
        if (isEditMode) {
          console.log('Edit mode: returning to trial detail page');
          router.push(`/dashboard/trials/${trialId}`);
        } else {
          console.log('Creation mode: continuing to rounds page');
          router.push(`/dashboard/trials/create/rounds?trial=${trialId}`);
        }
      }
    } catch (error) {
      console.error('Error in handleNext:', error);
      setErrors(['Error saving trial classes. Please try again.']);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (isEditMode) {
      router.push(`/dashboard/trials/${trialId}`);
    } else {
      router.push(`/dashboard/trials/create/days?trial=${trialId}`);
    }
  };

  const handleSaveDraft = async () => {
    if (!trialId) return;

    setSaving(true);
    try {
      const success = await saveClassesForAllDays();
      
      if (success) {
        alert('Draft saved successfully!');
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

  const getSelectedLevelsCount = () => {
    return Object.values(levelSelections).reduce((total, dayLevels) => 
      total + dayLevels.filter(level => level.selected).length, 0
    );
  };

  if (loading) {
    return (
      <MainLayout title={isEditMode ? "Edit Trial - Classes & Levels" : "Create Trial - Choose Levels"}>
        <div className="max-w-6xl mx-auto">
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

  if (!trial || trialDays.length === 0) {
    return (
      <MainLayout title={isEditMode ? "Edit Trial - Classes & Levels" : "Create Trial - Choose Levels"}>
        <div className="max-w-6xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>
              {errors.length > 0 ? errors[0] : 'Trial or trial days not found.'}
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

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Trials', href: '/dashboard/trials' },
    ...(isEditMode 
      ? [{ label: trial.trial_name, href: `/dashboard/trials/${trialId}` }, { label: 'Edit Classes' }]
      : [
          { label: 'Create Trial', href: '/dashboard/trials/create' },
          { label: 'Select Days', href: `/dashboard/trials/create/days?trial=${trialId}` },
          { label: 'Choose Levels' }
        ]
    )
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
      title={isEditMode ? "Edit Trial - Classes & Levels" : "Create Trial - Choose Levels"}
      breadcrumbItems={breadcrumbItems}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Progress Steps - only show in creation mode */}
        {!isEditMode && (
          <div className="flex items-center justify-center space-x-4 mb-8 overflow-x-auto">
            {stepTitles.map((title, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === 4; // Current step
              const isCompleted = stepNumber < 4; // Previous steps
              
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
                      stepNumber < 4 ? 'bg-green-600' : 'bg-gray-200'
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
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-orange-900">
                <Edit className="h-5 w-5" />
                <span>Editing Classes & Levels</span>
              </CardTitle>
              <CardDescription className="text-orange-700">
                You are editing the classes and levels for this trial. Changes will be saved immediately.
              </CardDescription>
            </CardHeader>
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
              {trialDays.length} trial days selected
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Instructions */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {isEditMode 
              ? 'Modify which levels/classes are offered for each trial day. Update entry fees and maximum entries as needed.'
              : 'Select which levels/classes you want to offer for each trial day. Configure entry fees and maximum entries for each level.'
            }
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

        {/* Selection Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Selection Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{getSelectedLevelsCount()}</div>
                <div className="text-sm text-gray-600">Levels Selected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{trialDays.length}</div>
                <div className="text-sm text-gray-600">Trial Days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  ${Object.values(levelSelections).reduce((total, dayLevels) => 
                    total + dayLevels.filter(level => level.selected).reduce((sum, level) => sum + level.entryFee, 0), 0
                  )}
                </div>
                <div className="text-sm text-gray-600">Total Entry Fees</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Select Category</CardTitle>
            <CardDescription>Choose a category to view available levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2 mb-4">
              {Object.keys(CWAGS_LEVELS).map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category)}
                  className="flex-1"
                >
                  {category}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Level Selection for Each Day */}
        {trialDays.map(day => (
          <Card key={day.id} className="border-2 border-gray-400"> {/* Darker border for day selection */}
            <CardHeader className="bg-gray-50">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span>Day {day.day_number} - {formatDate(day.trial_date)}</span>
                <Badge variant="outline" className="border-gray-500">
                  {levelSelections[day.id]?.filter(l => l.selected && l.category === selectedCategory).length || 0} selected
                </Badge>
              </CardTitle>
              <CardDescription>
                Configure levels for {selectedCategory}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {levelSelections[day.id]
                  ?.filter(level => level.category === selectedCategory)
                  .map((level) => {
  const actualIndex = levelSelections[day.id]?.findIndex(l => 
    l.levelName === level.levelName && l.category === level.category
  ) || 0;
                    
                    return (
                      <div
                        key={`${day.id}-${level.levelName}`}
                        className={`border rounded-lg p-4 transition-all ${
                          level.selected 
                            ? 'border-blue-300 bg-blue-50' 
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        {/* Level Selection */}
                        <div className="flex items-center space-x-3 mb-3">
                          <Checkbox
                            checked={level.selected}
                            onCheckedChange={(checked) => 
                              updateLevelSelection(day.id, actualIndex, 'selected', checked)
                            }
                            className="w-5 h-5 border-2 border-gray-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{level.levelName}</div>
                            <div className="text-sm text-gray-600">{level.category}</div>
                          </div>
                          {level.selected && (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Selected
                            </Badge>
                          )}
                        </div>

                        {/* Configuration Options */}
                        {level.selected && (
                          <div className="space-y-3 pt-3 border-t">
                            {/* Entry Fee and Max Entries */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Entry Fee ($)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={level.entryFee}
                                  onChange={(e) => updateLevelSelection(day.id, actualIndex, 'entryFee', parseFloat(e.target.value) || 0)}
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Max Entries</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={level.maxEntries}
                                  onChange={(e) => updateLevelSelection(day.id, actualIndex, 'maxEntries', parseInt(e.target.value) || 1)}
                                  className="h-8"
                                />
                              </div>
                            </div>

                            {/* FEO Configuration */}
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`feo-${day.id}-${actualIndex}`}
                                  checked={level.feoAvailable || false}
                                  onCheckedChange={(checked) => updateLevelSelection(day.id, actualIndex, 'feoAvailable', checked)}
                                />
                                <Label htmlFor={`feo-${day.id}-${actualIndex}`} className="text-xs">
                                  FEO Available
                                </Label>
                              </div>
                              
                              {level.feoAvailable && (
                                <div>
                                  <Label className="text-xs">FEO Price ($)</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={level.feoPrice || ''}
                                    onChange={(e) => updateLevelSelection(day.id, actualIndex, 'feoPrice', parseFloat(e.target.value) || 0)}
                                    placeholder="15.00"
                                    className="h-8"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Games Subclass - Only show for Games classes */}
                            {level.category === 'Games' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-red-600">Games Subclass (Required) *</Label>
                                <select
                                  value={level.gamesSubclass || ''}
                                  onChange={(e) => updateLevelSelection(day.id, actualIndex, 'gamesSubclass', e.target.value)}
                                  className="w-full h-8 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  required
                                >
                                  <option value="">Select Subclass</option>
                                  <option value="GB">GB</option>
                                  <option value="BJ">BJ</option>
                                  <option value="C">C</option>
                                  <option value="T">T</option>
                                  <option value="P">P</option>
                                </select>
                              </div>
                            )}

                            {/* Notes */}
                            <div>
                              <Label className="text-xs">Notes (Optional)</Label>
                              <Input
                                value={level.notes}
                                onChange={(e) => updateLevelSelection(day.id, actualIndex, 'notes', e.target.value)}
                                placeholder="Special notes for this level..."
                                className="h-8"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        ))}

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
              <span>{isEditMode ? 'Back to Trial' : 'Previous'}</span>
            </Button>
            <Button
              onClick={handleNext}
              disabled={getSelectedLevelsCount() === 0 || saving}
              className="flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>{isEditMode ? 'Save Changes' : 'Continue to Rounds'}</span>
                  {!isEditMode && <ArrowRight className="h-4 w-4" />}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
// Add this at the very end of the file:
export default function TrialLevelsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <TrialLevelsPageContent />
    </Suspense>
  )
}