'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar,
  ArrowRight,
  ArrowLeft,
  Save,
  CheckCircle,
  Info,
  Edit,
  DollarSign,
  Trophy
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
  gamesSubclasses?: string[];
  notes: string;
}

interface TrialDay {
  id: string;
  day_number: number;
  trial_date: string;
  day_status: string;
}

interface ExistingClass {
  id: string;
  class_name: string;
  class_level: string;
  entry_fee: number;
  feo_available: boolean;
  feo_price: number;
  games_subclass: string | null;
  notes: string | null;
  [key: string]: any;
}

interface Trial {
  id: string;
  trial_name: string;
  club_name: string;
  location: string;
  start_date: string;
  end_date: string;
  default_entry_fee?: number;    // ✅ NEW: Default regular fee
  default_feo_price?: number;    // ✅ NEW: Default FEO price
}

const getGameName = (subclass: string): string => {
  const gameNames: { [key: string]: string } = {
    'GB': 'Grab Bag',
    'BJ': 'Blackjack',
    'C': 'Colors',
    'T': 'Teams',
    'P': 'Pairs'
  };
  return gameNames[subclass] || subclass;
};

function TrialLevelsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trialId = searchParams.get('trial');
  const supabase = getSupabaseBrowser();
  const isEditMode = searchParams.get('mode') === 'edit';
  
  const [trial, setTrial] = useState<Trial | null>(null);
  const [trialDays, setTrialDays] = useState<TrialDay[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Scent Work');
  const [selectedDayTab, setSelectedDayTab] = useState<string>('0'); // ✅ Track selected day tab
  const [levelSelections, setLevelSelections] = useState<{ [dayId: string]: LevelSelection[] }>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadTrialData = async () => {
      if (!trialId) {
        setErrors(['Trial ID not found. Please start from the beginning.']);
        setLoading(false);
        return;
      }

      try {
        console.log('Loading trial and days data for ID:', trialId);
        
        const trialResult = await simpleTrialOperations.getTrial(trialId);
        if (!trialResult.success) {
          console.error('Error loading trial:', trialResult.error);
          setErrors(['Failed to load trial data.']);
          setLoading(false);
          return;
        }
        setTrial(trialResult.data);

        const daysResult = await simpleTrialOperations.getTrialDays(trialId);
        if (!daysResult.success) {
          console.error('Error loading trial days:', daysResult.error);
          setErrors(['Failed to load trial days.']);
          setLoading(false);
          return;
        }
        
        const days = daysResult.data || [];
        setTrialDays(days);
        
        // ✅ Set initial day tab
        if (days.length > 0) {
          setSelectedDayTab('0');
        }
        
        // ✅ Pass trial data to loadExistingClasses so it can use default fees
        await loadExistingClasses(days, trialResult.data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading trial data:', error);
        setErrors(['An error occurred loading trial data.']);
        setLoading(false);
      }
    };

    loadTrialData();
  }, [trialId]);

  // ✅ UPDATED: Now accepts trial data to use default fees
  const loadExistingClasses = async (days: TrialDay[], trialData: Trial) => {
    const initialSelections: { [dayId: string]: LevelSelection[] } = {};
    
    // ✅ Get default fees from trial data, with fallbacks
    const defaultEntryFee = trialData.default_entry_fee ?? 25;
    const defaultFeoPrice = trialData.default_feo_price ?? 15;
    
    console.log('Using default fees:', { defaultEntryFee, defaultFeoPrice });
    
    for (const day of days) {
      try {
        const classesResult = await simpleTrialOperations.getTrialClasses(day.id);
        
        if (classesResult.success && classesResult.data) {
          const existingClasses: ExistingClass[] = classesResult.data;
          
          const gamesSubclassMap = new Map<string, string[]>();
          const nonGamesClasses = new Map<string, ExistingClass>();
          
          existingClasses.forEach(cls => {
            const category = cls.subclass || 'Scent Work';
            
            if (category === 'Games' && cls.games_subclass) {
              const key = cls.class_name;
              if (!gamesSubclassMap.has(key)) {
                gamesSubclassMap.set(key, []);
              }
              gamesSubclassMap.get(key)!.push(cls.games_subclass);
            } else {
              nonGamesClasses.set(cls.class_name, cls);
            }
          });

          const existingLevels = existingClasses.map((cls: ExistingClass) => {
            const category = cls.subclass || 'Scent Work';
            const levelName = cls.class_name;
            
            if (category === 'Games') {
              return {
                levelName,
                category,
                selected: true,
                entryFee: cls.entry_fee || defaultEntryFee,
                maxEntries: 20,
                feoAvailable: cls.feo_available || false,
                feoPrice: cls.feo_price || defaultFeoPrice,
                gamesSubclasses: gamesSubclassMap.get(levelName) || [],
                notes: String(cls.notes || '')
              };
            } else {
              return {
                levelName,
                category,
                selected: true,
                entryFee: cls.entry_fee || defaultEntryFee,
                maxEntries: 20,
                feoAvailable: cls.feo_available || false,
                feoPrice: cls.feo_price || defaultFeoPrice,
                gamesSubclasses: [],
                notes: String(cls.notes || '')
              };
            }
          });

          const uniqueLevels = Array.from(
            new Map(existingLevels.map(level => [
              `${level.category}-${level.levelName}`, 
              level
            ])).values()
          );

          initialSelections[day.id] = Object.entries(CWAGS_LEVELS).flatMap(([category, levels]) =>
            levels.map(levelName => {
              const existing = uniqueLevels.find((e) => 
                e.levelName === levelName && e.category === category
              );
              return existing || {
                levelName,
                category,
                selected: false,
                entryFee: defaultEntryFee,
                maxEntries: 20,
                feoAvailable: false,
                feoPrice: defaultFeoPrice,
                gamesSubclasses: [],
                notes: ''
              };
            })
          );
        } else {
          initialSelections[day.id] = Object.entries(CWAGS_LEVELS).flatMap(([category, levels]) =>
            levels.map(levelName => ({
              levelName,
              category,
              selected: false,
              entryFee: defaultEntryFee,
              maxEntries: 20,
              feoAvailable: false,
              feoPrice: defaultFeoPrice,
              gamesSubclasses: [],
              notes: ''
            }))
          );
        }
      } catch (error) {
        console.error(`Error loading existing classes for day ${day.id}:`, error);
        initialSelections[day.id] = Object.entries(CWAGS_LEVELS).flatMap(([category, levels]) =>
          levels.map(levelName => ({
            levelName,
            category,
            selected: false,
            entryFee: defaultEntryFee,
            maxEntries: 20,
            feoAvailable: false,
            feoPrice: defaultFeoPrice,
            gamesSubclasses: [],
            notes: ''
          }))
        );
      }
    }
    
    setLevelSelections(initialSelections);
  };

  const updateLevelSelection = (
    dayId: string, 
    levelIndex: number, 
    field: keyof LevelSelection, 
    value: string | number | boolean | string[]
  ) => {
    setLevelSelections(prev => ({
      ...prev,
      [dayId]: prev[dayId]?.map((level, index) => 
        index === levelIndex 
          ? { ...level, [field]: value }
          : level
      ) || []
    }));
    
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const validateSelections = (): boolean => {
    const newErrors: string[] = [];
    
    const hasSelection = Object.values(levelSelections).some(dayLevels => 
      dayLevels.some(level => level.selected)
    );

    if (!hasSelection) {
      newErrors.push('You must select at least one level for at least one day.');
      setErrors(newErrors);
      return false;
    }

    Object.entries(levelSelections).forEach(([dayId, dayLevels]) => {
      const day = trialDays.find(d => d.id === dayId);
      const dayNumber = day?.day_number || 0;
      
      dayLevels.forEach(level => {
        if (level.selected && level.category === 'Games') {
          if (!level.gamesSubclasses || level.gamesSubclasses.length === 0) {
            newErrors.push(
              `Day ${dayNumber} - ${level.levelName}: You must select at least one Games subclass (GB, BJ, C, T, or P)`
            );
          }
        }
      });
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return false;
    }

    return true;
  };

  const saveClassesForAllDays = async (): Promise<boolean> => {
    try {
      for (const [dayId, dayLevels] of Object.entries(levelSelections)) {
        const selectedLevels = dayLevels.filter(level => level.selected);
        
        if (selectedLevels.length > 0) {
          const { data: existingClasses } = await supabase
            .from('trial_classes')
            .select('*')
            .eq('trial_day_id', dayId);

          const existingClassMap = new Map(
            (existingClasses || []).map(cls => [cls.class_name + (cls.games_subclass || ''), cls])
          );

          const classesToUpdate: LevelSelection[] = [];
          const classesToInsert: LevelSelection[] = [];

          selectedLevels.forEach(level => {
            if (level.category === 'Games' && level.gamesSubclasses && level.gamesSubclasses.length > 0) {
              level.gamesSubclasses.forEach(subclass => {
                const key = level.levelName + subclass;
                if (existingClassMap.has(key)) {
                  classesToUpdate.push({ ...level, gamesSubclasses: [subclass] });
                } else {
                  classesToInsert.push({ ...level, gamesSubclasses: [subclass] });
                }
              });
            } else {
              if (existingClassMap.has(level.levelName)) {
                classesToUpdate.push(level);
              } else {
                classesToInsert.push(level);
              }
            }
          });

          if (existingClasses && existingClasses.length > 0) {
            const selectedKeys = new Set<string>();
            selectedLevels.forEach(level => {
              if (level.category === 'Games' && level.gamesSubclasses) {
                level.gamesSubclasses.forEach(subclass => {
                  selectedKeys.add(level.levelName + subclass);
                });
              } else {
                selectedKeys.add(level.levelName);
              }
            });

            const classesToDelete = existingClasses.filter(cls => {
              const key = cls.class_name + (cls.games_subclass || '');
              return !selectedKeys.has(key);
            });

            if (classesToDelete.length > 0) {
              const deleteIds = classesToDelete.map(cls => cls.id);
              const { error: deleteError } = await supabase
                .from('trial_classes')
                .delete()
                .in('id', deleteIds);
              
              if (deleteError) {
                throw new Error(`Failed to delete classes for day ${dayId}: ${deleteError.message}`);
              }
              console.log(`Deleted ${classesToDelete.length} classes for day ${dayId}`);
            }
          }

          if (classesToInsert.length > 0) {
            type TrialClassInsert = {
              trial_day_id: string;
              class_name: string;
              class_type: string;
              subclass: string;
              class_level: string;
              entry_fee: number;
              max_entries: number;
              feo_available: boolean;
              feo_price: number;
              games_subclass: string | null;
              class_order: number;
              class_status: string;
              notes: string | null;
            };

            const newClasses: TrialClassInsert[] = classesToInsert.flatMap((level, index) => {
              const entryFee = typeof level.entryFee === 'number' ? level.entryFee : parseFloat(String(level.entryFee)) || 0;
              const feoPrice = level.feoAvailable && level.feoPrice ? 
                (typeof level.feoPrice === 'number' ? level.feoPrice : parseFloat(String(level.feoPrice)) || 0) : 0;
              
              const classTypeMapping: { [key: string]: string } = {
                'Scent Work': 'scent',
                'Rally': 'rally',
                'Obedience': 'obedience', 
                'Games': 'games'
              };
              
              const classType = classTypeMapping[level.category] || 'scent';
              
              if (level.category === 'Games' && level.gamesSubclasses && level.gamesSubclasses.length > 0) {
                return level.gamesSubclasses.map((subclass, subIndex): TrialClassInsert => ({
                  trial_day_id: dayId,
                  class_name: level.levelName.trim(),
                  class_type: classType,
                  subclass: level.category.trim(),
                  class_level: level.levelName.trim(),
                  entry_fee: entryFee,
                  max_entries: 50,
                  feo_available: level.feoAvailable || false,
                  feo_price: feoPrice,
                  games_subclass: subclass,
                  class_order: (existingClasses?.length || 0) + index * 10 + subIndex,
                  class_status: 'draft',
                  notes: level.notes?.trim() || null
                }));
              } else {
                return [{
                  trial_day_id: dayId,
                  class_name: level.levelName.trim(),
                  class_type: classType,
                  subclass: level.category.trim(),
                  class_level: level.levelName.trim(),
                  entry_fee: entryFee,
                  max_entries: 50,
                  feo_available: level.feoAvailable || false,
                  feo_price: feoPrice,
                  games_subclass: null,
                  class_order: (existingClasses?.length || 0) + index,
                  class_status: 'draft',
                  notes: level.notes?.trim() || null
                }];
              }
            });
            
            const { error: insertError } = await supabase
              .from('trial_classes')
              .insert(newClasses);
            
            if (insertError) {
              throw new Error(`Failed to insert new classes for day ${dayId}: ${insertError.message}`);
            }
            
            console.log(`Inserted ${newClasses.length} new classes for day ${dayId}`);
          }
          
          if (classesToUpdate.length > 0) {
            for (const level of classesToUpdate) {
              const gamesSubclass = (level.category === 'Games' && level.gamesSubclasses && level.gamesSubclasses.length > 0) 
                ? level.gamesSubclasses[0] 
                : null;
              
              const existing = existingClassMap.get(level.levelName + (gamesSubclass || ''));
              if (!existing) continue;
              
              const entryFee = typeof level.entryFee === 'number' ? level.entryFee : parseFloat(String(level.entryFee)) || 0;
              const feoPrice = level.feoAvailable && level.feoPrice ? 
                (typeof level.feoPrice === 'number' ? level.feoPrice : parseFloat(String(level.feoPrice)) || 0) : 0;
              
              const { error: updateError } = await supabase
                .from('trial_classes')
                .update({
                  entry_fee: entryFee,
                  feo_available: level.feoAvailable || false,
                  feo_price: feoPrice,
                  games_subclass: gamesSubclass,
                  notes: level.notes?.trim() || null
                })
                .eq('id', existing.id);
              
              if (updateError) {
                throw new Error(`Failed to update class ${level.levelName} for day ${dayId}: ${updateError.message}`);
              }
            }
            
            console.log(`Updated ${classesToUpdate.length} classes for day ${dayId}`);
          }
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

  const formatDayDate = (dateString: string) => {
    const parts = dateString.split('-');
    const date = new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
      12, 0, 0
    );
    
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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
              <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
        {!isEditMode && (
          <div className="flex items-center justify-center space-x-4 mb-8 overflow-x-auto">
            {stepTitles.map((title, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === 4;
              const isCompleted = stepNumber < 4;
              
              return (
                <div key={stepNumber} className="flex items-center flex-shrink-0">
                  <div className={`flex items-center space-x-2 ${
                    isActive ? 'text-orange-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isActive 
                        ? 'bg-orange-600 text-white' 
                        : isCompleted 
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                    }`}>
                      {isCompleted ? <CheckCircle className="h-4 w-4" /> : stepNumber}
                    </div>
                    <span className="text-sm font-medium hidden sm:inline">{title}</span>
                  </div>
                  {index < stepTitles.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-300'
                    }`}></div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-orange-600" />
              Trial Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Trial Name</p>
                <p className="font-semibold">{trial.trial_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-semibold">{trial.location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Number of Days</p>
                <p className="font-semibold">{trialDays.length} days</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Selected Levels</p>
                <p className="font-semibold">{getSelectedLevelsCount()} levels selected</p>
              </div>
            </div>
            
            {/* ✅ NEW: Display default fees */}
            {(trial.default_entry_fee !== undefined || trial.default_feo_price !== undefined) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-medium text-gray-700">Default Entry Fees</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <div>
                    <p className="text-xs text-gray-500">Regular Entry</p>
                    <p className="text-sm font-semibold text-gray-900">
                      ${(trial.default_entry_fee ?? 25).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">FEO Entry</p>
                    <p className="text-sm font-semibold text-gray-900">
                      ${(trial.default_feo_price ?? 15).toFixed(2)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 pl-6">
                  These defaults are applied to all new classes and can be adjusted individually below.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filter by Category</CardTitle>
            <CardDescription>Choose a category to view available levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.keys(CWAGS_LEVELS).map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                  className="flex-1 min-w-[120px]"
                >
                  {category}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ✅ DAY TABS */}
        <Tabs value={selectedDayTab} onValueChange={setSelectedDayTab} className="w-full">
          <TabsList 
            className="grid w-full mb-4 gap-2" 
            style={{ gridTemplateColumns: `repeat(${trialDays.length}, minmax(0, 1fr))` }}
          >
            {trialDays.map((day, index) => (
              <TabsTrigger 
                key={day.id} 
                value={index.toString()} 
                className="
                  text-sm px-3 py-2 rounded-md
                  border-2 border-[#5b3214] text-[#5b3214]
                  data-[state=active]:bg-[#5b3214] data-[state=active]:text-white
                  hover:bg-white
                  transition-colors
                "
              >
                Day {day.day_number} - {formatDayDate(day.trial_date)}
              </TabsTrigger>
            ))}
          </TabsList>

          {trialDays.map((day, dayIndex) => (
            <TabsContent key={day.id} value={dayIndex.toString()}>
              <Card>
                <CardHeader className="bg-gray-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Day {day.day_number} - {formatDate(day.trial_date)}
                    </CardTitle>
                    <Badge variant="outline">
                      {levelSelections[day.id]?.filter(l => l.selected && l.category === selectedCategory).length || 0} selected
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {levelSelections[day.id]
                      ?.map((level, index) => ({ level, originalIndex: index }))
                      .filter(({ level }) => level.category === selectedCategory)
                      .map(({ level, originalIndex: actualIndex }) => {
                        return (
                          <div
                            key={`${day.id}-${level.levelName}`}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              level.selected 
                                ? 'border-orange-300 bg-orange-50' 
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center space-x-3 mb-3">
                              <Checkbox
                                checked={level.selected}
                                onCheckedChange={(checked) => 
                                  updateLevelSelection(day.id, actualIndex, 'selected', checked)
                                }
                                className="w-5 h-5 border-2 border-gray-400 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
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

                            {level.selected && (
                              <div className="space-y-3 pt-3 border-t">
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

                                <div className="space-y-2">
                                  <div className="flex items-center space-x-3 p-3 bg-orange-50 border-2 border-orange-200 rounded-lg">
                                    <Checkbox
                                      id={`feo-${day.id}-${actualIndex}`}
                                      checked={level.feoAvailable || false}
                                      onCheckedChange={(checked) => updateLevelSelection(day.id, actualIndex, 'feoAvailable', checked)}
                                      className="w-6 h-6"
                                    />
                                    <Label 
                                      htmlFor={`feo-${day.id}-${actualIndex}`} 
                                      className="text-sm font-semibold text-orange-900 cursor-pointer"
                                    >
                                      ✓ FEO Available for this class
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
                                        placeholder={(trial.default_feo_price ?? 15).toFixed(2)}
                                        className="h-8"
                                      />
                                    </div>
                                  )}
                                </div>

                                {level.category === 'Games' && (
                                  <div className="space-y-2 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                                    <Label className="text-sm font-semibold text-purple-900">
                                      Games Subclasses (Select all that apply) *
                                    </Label>
                                    <p className="text-xs text-purple-700 mb-3">
                                      Each subclass will create a separate class entry
                                    </p>
                                    <div className="space-y-2">
                                      {['GB', 'BJ', 'C', 'T', 'P'].map(subclass => (
                                        <div key={subclass} className="flex items-center space-x-3">
                                          <Checkbox
                                            id={`${day.id}-${level.levelName}-${subclass}`}
                                            checked={level.gamesSubclasses?.includes(subclass) || false}
                                            onCheckedChange={(checked) => {
                                              const current = level.gamesSubclasses || [];
                                              const updated = checked
                                                ? [...current, subclass]
                                                : current.filter(s => s !== subclass);
                                              updateLevelSelection(day.id, actualIndex, 'gamesSubclasses', updated);
                                            }}
                                            className="w-5 h-5"
                                          />
                                          <Label 
                                            htmlFor={`${day.id}-${level.levelName}-${subclass}`} 
                                            className="text-sm font-medium cursor-pointer flex-1"
                                          >
                                            <span className="font-bold text-purple-700">{subclass}</span>
                                            <span className="text-gray-600"> - {getGameName(subclass)}</span>
                                          </Label>
                                        </div>
                                      ))}
                                    </div>
                                    {level.gamesSubclasses && level.gamesSubclasses.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-purple-300">
                                        <p className="text-xs text-purple-700">
                                          <strong>Selected ({level.gamesSubclasses.length}):</strong> {level.gamesSubclasses.join(', ')}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}

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
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex items-center justify-between pt-6 border-t">
  <div>
    <Button
      variant="outline"
      onClick={handleBack}
      disabled={saving}
      className="flex items-center space-x-2"
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{isEditMode ? 'Back to Trial' : 'Previous'}</span>
    </Button>
  </div>

  <Button
    onClick={handleNext}
    disabled={getSelectedLevelsCount() === 0 || saving}
    className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700"
  >
    {saving ? (
      <>
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <span>Saving...</span>
      </>
    ) : (
      <>
        <span>{isEditMode ? 'Save Changes' : 'Save & Continue to Rounds'}</span>
        <ArrowRight className="h-4 w-4" />
      </>
    )}
  </Button>
</div>
      </div>
    </MainLayout>
  );
}

export default function TrialLevelsPage() {
  return (
    <Suspense fallback={
      <MainLayout title="Loading...">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </MainLayout>
    }>
      <TrialLevelsPageContent />
    </Suspense>
  );
}