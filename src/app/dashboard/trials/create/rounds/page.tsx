'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { hasPermission } from '@/lib/permissions';
import { PERMISSIONS } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Users, UserCheck, ArrowRight, ArrowLeft, Save, Plus, Trash2, Edit, Settings } from 'lucide-react';
import { simpleTrialOperations } from '@/lib/trialOperationsSimple';
import { getClassOrder } from '@/lib/cwagsClassNames';


interface DatabaseJudge {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city: string;
  province_state: string;
  country: string;
  level?: string;
  obedience_levels?: string[];
  rally_levels?: string[];
  games_levels?: string[];
  scent_levels?: string[];
  is_active: boolean;
}

interface TrialClass {
  id: string;
  class_name: string;
  class_level: string;
  class_type: string;
  subclass: string;
  max_entries: number;
  trial_day_id?: string;
  trial_days?: {
    day_number: number;
    trial_date: string;
  };
}

interface RoundData {
  id?: string;
  round_number: number;
  judge_name: string;
  judge_email: string;
  start_time: string;
  estimated_duration: string;
  max_entries: number;
  has_reset: boolean;
  reset_judge_name: string;
  reset_judge_email: string;
  notes: string;
}

interface Trial {
  id: string;
  trial_name: string;
  location: string;
  start_date: string;
  end_date: string;
}

interface TrialDay {
  id: string;
  day_number: number;
  trial_date: string;
}

function CreateRoundsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const trialId = searchParams.get('trial');
  const isEditMode = searchParams.get('mode') === 'edit';

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [trial, setTrial] = useState<Trial | null>(null);
  const [trialDays, setTrialDays] = useState<TrialDay[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string>(''); // NEW: Track selected day
  const [trialClasses, setTrialClasses] = useState<TrialClass[]>([]);
  const [qualifiedJudges, setQualifiedJudges] = useState<{ [classId: string]: DatabaseJudge[] }>({});
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [rounds, setRounds] = useState<{ [classId: string]: RoundData[] }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const sortJudgesByProximity = (judges: DatabaseJudge[], trialData: Trial): DatabaseJudge[] => {
    if (!trialData?.location) return judges.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    const locationParts = trialData.location.split(',').map(part => part.trim());
    const trialProvinceState = locationParts.length >= 2 ? 
      locationParts[locationParts.length - 2] : '';
    
    return judges.sort((a, b) => {
      const aIsLocal = a.province_state === trialProvinceState;
      const bIsLocal = b.province_state === trialProvinceState;
      
      if (aIsLocal && !bIsLocal) return -1;
      if (!aIsLocal && bIsLocal) return 1;
      
      return (a.name || '').localeCompare(b.name || '');
    });
  };

  const filterJudgesByClassType = (judges: DatabaseJudge[], classType: string): DatabaseJudge[] => {
    return judges.filter(judge => {
      switch (classType.toLowerCase()) {
        case 'scent':
          return judge.scent_levels && judge.scent_levels.length > 0;
        case 'rally':
          return judge.rally_levels && judge.rally_levels.length > 0;
        case 'obedience':
          return judge.obedience_levels && judge.obedience_levels.length > 0;
        case 'games':
          return judge.games_levels && judge.games_levels.length > 0;
        default:
          return true;
      }
    });
  };

  const formatShortDate = (dateString: string) => {
    const parts = dateString.split('-');
    const date = new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
      12, 0, 0
    );
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  useEffect(() => {
    if (trialId) {
      loadTrialData();
    } else {
      setInitialLoading(false);
    }
  }, [trialId]);

  const loadTrialData = async () => {
    if (!trialId) return;

    setInitialLoading(true);
    try {
      const trialResult = await simpleTrialOperations.getTrial(trialId);
      if (!trialResult.success) {
        console.error('Error loading trial:', trialResult.error);
        return;
      }

      setTrial(trialResult.data);

      const daysResult = await simpleTrialOperations.getTrialDays(trialId);
      if (!daysResult.success) {
        console.error('Error loading trial days:', daysResult.error);
        return;
      }

      const days = daysResult.data || [];
      setTrialDays(days);

      // NEW: Set default selected day to first day
      if (days.length > 0 && !selectedDayId) {
        setSelectedDayId(days[0].id);
      }

      const allClasses: TrialClass[] = [];
      for (const day of days) {
        try {
          const dayClassesResult = await simpleTrialOperations.getTrialClasses(day.id);
          if (dayClassesResult.success && dayClassesResult.data) {
            const dayClasses = dayClassesResult.data.map((cls: any) => ({
              id: cls.id,
              class_name: cls.class_name || '',
              class_level: cls.class_level || '',
              class_type: cls.class_type || '',
              subclass: cls.subclass || '',
              max_entries: cls.max_entries || 50,
              trial_day_id: day.id,
              trial_days: {
                day_number: day.day_number,
                trial_date: day.trial_date
              }
            }));
            allClasses.push(...dayClasses);
          }
        } catch (error) {
          console.error(`Error loading classes for day ${day.id}:`, error);
        }
      }

      // Sort classes by day number first, then by official CWAGS class order
const sortedClasses = allClasses.sort((a, b) => {
  // First sort by day number
  const dayA = a.trial_days?.day_number || 0;
  const dayB = b.trial_days?.day_number || 0;
  if (dayA !== dayB) return dayA - dayB;
  
  // Then sort by the official CWAGS class order
  return getClassOrder(a.class_name) - getClassOrder(b.class_name);
});

setTrialClasses(sortedClasses);

      const judgesResult = await simpleTrialOperations.getAllJudges();
      if (judgesResult.success) {
        const allJudgesData = judgesResult.data || [];
        
        const qualifiedMap: { [classId: string]: DatabaseJudge[] } = {};
        for (const cls of allClasses) {
          const certifiedJudges = filterJudgesByClassType(allJudgesData, cls.class_type);
          const sortedJudges = sortJudgesByProximity(certifiedJudges, trialResult.data);
          qualifiedMap[cls.id] = sortedJudges;
        }
        setQualifiedJudges(qualifiedMap);
      }

      const roundsData: { [classId: string]: RoundData[] } = {};
      for (const cls of allClasses) {
        const roundsResult = await simpleTrialOperations.getTrialRounds(cls.id);
        if (roundsResult.success && roundsResult.data && roundsResult.data.length > 0) {
          roundsData[cls.id] = roundsResult.data.map((round: any) => ({
            id: round.id,
            round_number: round.round_number || 1,
            judge_name: round.judge_name || '',
            judge_email: round.judge_email || '',
            start_time: round.start_time || '',
            estimated_duration: round.estimated_duration || '',
            max_entries: round.max_entries || cls.max_entries || 50,
            has_reset: round.has_reset || false,
            reset_judge_name: round.reset_judge_name || '',
            reset_judge_email: round.reset_judge_email || '',
            notes: round.notes || ''
          }));
        } else {
          roundsData[cls.id] = [{
            round_number: 1,
            judge_name: '',
            judge_email: '',
            start_time: '',
            estimated_duration: '',
            max_entries: cls.max_entries || 50,
            has_reset: false,
            reset_judge_name: '',
            reset_judge_email: '',
            notes: ''
          }];
        }
      }

      setRounds(roundsData);

      // NEW: Set selected class to first class of selected day
      const firstDayClass = allClasses.find(c => c.trial_day_id === (days[0]?.id || ''));
      if (firstDayClass && !selectedClassId) {
        setSelectedClassId(firstDayClass.id);
      }

    } catch (error) {
      console.error('Error loading trial data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  // NEW: When day changes, update selected class to first class of that day
  useEffect(() => {
    if (selectedDayId && trialClasses.length > 0) {
      const dayClasses = trialClasses.filter(c => c.trial_day_id === selectedDayId);
      if (dayClasses.length > 0 && !dayClasses.find(c => c.id === selectedClassId)) {
        setSelectedClassId(dayClasses[0].id);
      }
    }
  }, [selectedDayId, trialClasses]);

  const handleJudgeSelect = (classId: string, roundIndex: number, judgeId: string) => {
    const classQualifiedJudges = qualifiedJudges[classId] || [];
    const judge = classQualifiedJudges.find(j => j.id === judgeId);
    if (!judge) return;

    setRounds(prev => ({
      ...prev,
      [classId]: prev[classId]?.map((round, idx) => 
        idx === roundIndex 
          ? { ...round, judge_name: judge.name || '', judge_email: judge.email || '' }
          : round
      ) || []
    }));
  };

  const handleResetJudgeSelect = (classId: string, roundIndex: number, judgeId: string) => {
    const classQualifiedJudges = qualifiedJudges[classId] || [];
    const judge = classQualifiedJudges.find(j => j.id === judgeId);
    if (!judge) return;

    setRounds(prev => ({
      ...prev,
      [classId]: prev[classId]?.map((round, idx) => 
        idx === roundIndex 
          ? { ...round, reset_judge_name: judge.name || '', reset_judge_email: judge.email || '' }
          : round
      ) || []
    }));
  };

  const handleRoundChange = (classId: string, roundIndex: number, field: keyof RoundData, value: any) => {
    setRounds(prev => ({
      ...prev,
      [classId]: prev[classId]?.map((round, idx) => 
        idx === roundIndex ? { ...round, [field]: value } : round
      ) || []
    }));
  };

  const addRound = (classId: string) => {
    const classRounds = rounds[classId] || [];
    const newRound: RoundData = {
      round_number: classRounds.length + 1,
      judge_name: '',
      judge_email: '',
      start_time: '',
      estimated_duration: '',
      max_entries: trialClasses.find(c => c.id === classId)?.max_entries || 50,
      has_reset: false,
      reset_judge_name: '',
      reset_judge_email: '',
      notes: ''
    };
    
    setRounds(prev => ({
      ...prev,
      [classId]: [...(prev[classId] || []), newRound]
    }));
  };

  const removeRound = (classId: string, roundIndex: number) => {
    setRounds(prev => ({
      ...prev,
      [classId]: prev[classId]?.filter((_, idx) => idx !== roundIndex)
        .map((round, idx) => ({ ...round, round_number: idx + 1 })) || []
    }));
  };

  const validateRounds = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    let isValid = true;

    Object.entries(rounds).forEach(([classId, classRounds]) => {
      classRounds.forEach((round, idx) => {
        if (!round.judge_name || !round.judge_email) {
          newErrors[`${classId}-${idx}-judge`] = 'Judge is required';
          isValid = false;
        }
        if (round.has_reset && (!round.reset_judge_name || !round.reset_judge_email)) {
          newErrors[`${classId}-${idx}-reset-judge`] = 'Reset judge is required when reset is enabled';
          isValid = false;
        }
      });
    });

    setErrors(newErrors);
    return isValid;
  };

 const handleSaveProgress = async () => {
    // No validation for Save Progress - allow partial saves!
    setLoading(true);
    try {
      let savedCount = 0;
      let skippedCount = 0;

      for (const [classId, classRounds] of Object.entries(rounds)) {
        // Only save rounds that have at least a judge assigned
        const completeRounds = classRounds.filter(round => 
          round.judge_name && round.judge_email
        );

        if (completeRounds.length === 0) {
          console.log(`Skipping class ${classId} - no judges assigned yet`);
          skippedCount++;
          continue;
        }

        const roundsData = completeRounds.map(round => ({
          id: round.id,
          round_number: round.round_number,
          judge_name: round.judge_name,
          judge_email: round.judge_email,
          feo_available: true,
          round_status: 'scheduled',
          start_time: round.start_time || null,
          estimated_duration: round.estimated_duration || null,
          max_entries: round.max_entries,
          has_reset: round.has_reset,
          reset_judge_name: round.reset_judge_name || null,
          reset_judge_email: round.reset_judge_email || null,
          notes: round.notes || null
        }));

        const result = await simpleTrialOperations.saveTrialRounds(classId, roundsData);
        
        if (!result.success) {
          const errorMessage = typeof result.error === 'string' 
            ? result.error 
            : result.error?.message || 'Failed to save rounds';
          throw new Error(errorMessage);
        }
        
        savedCount++;
      }

      const message = savedCount > 0
        ? `Saved ${savedCount} class(es) successfully!${skippedCount > 0 ? ` Skipped ${skippedCount} class(es) without judges.` : ''}`
        : 'No rounds with judges assigned to save yet. Assign at least one judge to save progress.';
      
      alert(message);
      
      // Reload the data to get the saved round IDs
      if (savedCount > 0) {
        await loadTrialData();
      }
      
    } catch (error) {
      console.error('Error saving rounds:', error);
      alert(`Error saving rounds: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!validateRounds()) {
      alert('Please fix the errors before saving.');
      return;
    }

    setLoading(true);
    try {
      for (const [classId, classRounds] of Object.entries(rounds)) {
        const roundsData = classRounds.map(round => ({
          id: round.id,
          round_number: round.round_number,
          judge_name: round.judge_name,
          judge_email: round.judge_email,
          feo_available: true,
          round_status: 'scheduled',
          start_time: round.start_time || null,
          estimated_duration: round.estimated_duration || null,
          max_entries: round.max_entries,
          has_reset: round.has_reset,
          reset_judge_name: round.reset_judge_name || null,
          reset_judge_email: round.reset_judge_email || null,
          notes: round.notes || null
        }));

        const result = await simpleTrialOperations.saveTrialRounds(classId, roundsData);
        
        if (!result.success) {
          const errorMessage = typeof result.error === 'string' 
            ? result.error 
            : result.error?.message || 'Failed to save rounds';
          throw new Error(errorMessage);
        }
      }

     alert('Rounds saved successfully!');
      // Always navigate after "Save & Continue"
      router.push(`/dashboard/trials/${trialId}`);
    } catch (error) {
      console.error('Error saving rounds:', error);
      alert(`Error saving rounds: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (isEditMode) {
      router.push(`/dashboard/trials/${trialId}`);
    } else {
      router.push(`/dashboard/trials/create/levels?trial=${trialId}`);
    }
  };

  const handleManageJudges = () => {
    router.push('/dashboard/judges');
  };

  if (!user) {
    return (
      <MainLayout title="Trial Rounds">
        <Alert variant="destructive">
          <AlertDescription>You must be logged in to access this page.</AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  if (!trialId) {
    return (
      <MainLayout title="Trial Rounds">
        <Alert variant="destructive">
          <AlertDescription>
            No trial ID provided. Please start from the trial creation process.
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  if (initialLoading) {
    return (
      <MainLayout title={isEditMode ? "Edit Trial - Rounds & Judges" : "Trial Rounds"}>
        <div className="flex items-center justify-center min-h-64">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading trial data...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!trial) {
    return (
      <MainLayout title={isEditMode ? "Edit Trial - Rounds & Judges" : "Trial Rounds"}>
        <Alert variant="destructive">
          <AlertDescription>Trial not found. Please check the trial ID and try again.</AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Trials', href: '/dashboard/trials' },
    ...(isEditMode 
      ? [{ label: trial.trial_name, href: `/dashboard/trials/${trialId}` }, { label: 'Edit Rounds' }]
      : [{ label: 'Create Trial', href: '/dashboard/trials/create' }, { label: 'Rounds' }]
    )
  ];

  const selectedClass = trialClasses.find(c => c.id === selectedClassId);
  const selectedClassRounds = selectedClassId ? rounds[selectedClassId] || [] : [];
  
  // NEW: Filter classes by selected day
  const dayClasses = trialClasses.filter(c => c.trial_day_id === selectedDayId);

  return (
    <MainLayout 
      title={isEditMode ? "Edit Trial - Rounds & Judge Assignment" : "Trial Rounds & Judge Assignment"}
      breadcrumbItems={breadcrumbItems}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {isEditMode && (
          <Card className="bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-orange-900">
                <Edit className="h-5 w-5" />
                <span>Editing Rounds & Judge Assignments</span>
              </CardTitle>
              <CardDescription className="text-orange-700">
                You are editing the rounds and judge assignments for this trial. Changes will be saved immediately.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{trial.trial_name}</CardTitle>
                <CardDescription>
                  {trial.location} • {new Date(trial.start_date).toLocaleDateString()} - {new Date(trial.end_date).toLocaleDateString()}
                </CardDescription>
              </div>
              {hasPermission(user, PERMISSIONS.MANAGE_JUDGES) && (
  <Button 
    variant="outline" 
    onClick={() => router.push('/dashboard/judges')}
    className="w-full justify-start"
  >
    <UserCheck className="h-4 w-4 mr-2" />
    Manage Judges
  </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* NEW: DAY TABS */}
        <Card>
          <CardHeader>
            <CardTitle>Select Trial Day</CardTitle>
            <CardDescription>Choose which day to assign judges for</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${trialDays.length}, minmax(0, 1fr))` }}>
              {trialDays.map((day) => (
                <button
                  key={day.id}
                  onClick={() => setSelectedDayId(day.id)}
                  className={`
                    px-4 py-3 rounded-lg font-semibold transition-all border-2
                    ${selectedDayId === day.id 
                      ? 'bg-[#5b3214] text-white border-[#5b3214]' 
                      : 'bg-white text-[#5b3214] border-[#5b3214] hover:bg-[#5b3214] hover:text-white'
                    }
                  `}
                >
                  <div className="text-center">
                    <div className="text-sm font-semibold">Day {day.day_number}</div>
                    <div className="text-xs mt-1 opacity-90">
                      {formatShortDate(day.trial_date)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* NEW: SCROLLABLE Class Selection Sidebar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Classes</span>
              </CardTitle>
              <CardDescription>
                Select a class to configure rounds
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {/* NEW: Fixed height scrollable container */}
              <div className="max-h-[500px] overflow-y-auto px-6 py-4 space-y-2">
                {dayClasses.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No classes for this day
                  </div>
                ) : (
                  dayClasses.map((cls) => {
                    const classRoundCount = rounds[cls.id]?.length || 0;
                    const hasJudges = rounds[cls.id]?.some(r => r.judge_name) || false;
                    
                    return (
                      <div
                        key={cls.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedClassId === cls.id
                            ? 'bg-orange-50 border-orange-200'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedClassId(cls.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{cls.class_name}</p>
                            <p className="text-xs text-gray-600">{cls.class_level}</p>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            <Badge variant={hasJudges ? "default" : "secondary"} className="text-xs">
                              {classRoundCount} round{classRoundCount !== 1 ? 's' : ''}
                            </Badge>
                            {hasJudges && (
                              <UserCheck className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rounds Configuration */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedClass ? `${selectedClass.class_name} - Rounds` : 'Select a class'}
                  </CardTitle>
                  {selectedClass && (
                    <CardDescription>
                      Configure rounds and assign judges for this class
                    </CardDescription>
                  )}
                </div>
                {selectedClass && (
                  <Button
                    onClick={() => addRound(selectedClassId)}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Round
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedClass ? (
                <div className="text-center text-gray-500 py-8">
                  Select a class from the left to configure its rounds and judges
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedClassRounds.map((round, roundIndex) => (
                    <div
                      key={roundIndex}
                      className="border rounded-lg p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Round {round.round_number}</h3>
                        {selectedClassRounds.length > 1 && (
                          <Button
                            onClick={() => removeRound(selectedClassId, roundIndex)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label className="text-base font-semibold">Judge *</Label>
                          <Select
                            value={qualifiedJudges[selectedClassId]?.find(j => j.name === round.judge_name)?.id || ''}
                            onValueChange={(judgeId) => handleJudgeSelect(selectedClassId, roundIndex, judgeId)}
                          >
                            <SelectTrigger
                              className={`mt-1 text-base h-auto py-3 ${
                                errors[`${selectedClassId}-${roundIndex}-judge`] 
                                  ? 'border-red-500 bg-red-50' 
                                  : 'border-gray-400 hover:border-orange-500 focus:border-orange-600'
                              }`}
                            >
                              <SelectValue placeholder="👤 Select a judge..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-2 border-gray-300 shadow-xl max-h-60 overflow-y-auto">
                              {qualifiedJudges[selectedClassId] && qualifiedJudges[selectedClassId].length > 0 ? (
                                qualifiedJudges[selectedClassId].map((judge) => (
                                  <SelectItem 
                                    key={judge.id} 
                                    value={judge.id}
                                    className="text-base py-3 hover:bg-orange-100 focus:bg-orange-100 cursor-pointer"
                                  >
                                    <div className="w-full">
                                      <div className="font-semibold text-gray-900">{judge.name}</div>
                                      <div className="text-sm text-gray-600">
                                        {judge.city}, {judge.province_state}
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="loading" disabled className="text-gray-500">
                                  No judges found
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {errors[`${selectedClassId}-${roundIndex}-judge`] && (
                            <p className="text-sm text-red-600 font-medium mt-1">
                              {errors[`${selectedClassId}-${roundIndex}-judge`]}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label>Start Time</Label>
                          <Input
                            type="time"
                            value={round.start_time}
                            onChange={(e) => handleRoundChange(selectedClassId, roundIndex, 'start_time', e.target.value)}
                          />
                        </div>

                        <div>
                          <Label>Estimated Duration</Label>
                          <Input
                            placeholder="e.g., 2 hours"
                            value={round.estimated_duration}
                            onChange={(e) => handleRoundChange(selectedClassId, roundIndex, 'estimated_duration', e.target.value)}
                          />
                        </div>

                        <div>
                          <Label>Max Entries</Label>
                          <Input
                            type="number"
                            value={round.max_entries}
                            onChange={(e) => handleRoundChange(selectedClassId, roundIndex, 'max_entries', parseInt(e.target.value))}
                          />
                        </div>

                        <div className="flex items-center space-x-2 pt-6">
                          <Checkbox
                            id={`reset-${roundIndex}`}
                            checked={round.has_reset}
                            onCheckedChange={(checked) => handleRoundChange(selectedClassId, roundIndex, 'has_reset', checked)}
                          />
                          <Label htmlFor={`reset-${roundIndex}`} className="cursor-pointer">
                            Has Reset Judge
                          </Label>
                        </div>

                        {round.has_reset && (
                          <div className="col-span-2">
                            <Label>Reset Judge *</Label>
                            <Select
                              value={qualifiedJudges[selectedClassId]?.find(j => j.name === round.reset_judge_name)?.id || ''}
                              onValueChange={(judgeId) => handleResetJudgeSelect(selectedClassId, roundIndex, judgeId)}
                            >
                              <SelectTrigger
                                className={`mt-1 ${
                                  errors[`${selectedClassId}-${roundIndex}-reset-judge`] 
                                    ? 'border-red-500 bg-red-50' 
                                    : ''
                                }`}
                              >
                                <SelectValue placeholder="Select reset judge..." />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-2 border-gray-300 shadow-xl max-h-60 overflow-y-auto">
                                {qualifiedJudges[selectedClassId]?.map((judge) => (
                                  <SelectItem key={judge.id} value={judge.id}>
                                    {judge.name} - {judge.city}, {judge.province_state}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {errors[`${selectedClassId}-${roundIndex}-reset-judge`] && (
                              <p className="text-sm text-red-600 mt-1">
                                {errors[`${selectedClassId}-${roundIndex}-reset-judge`]}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="col-span-2">
                          <Label>Notes</Label>
                          <Textarea
                            placeholder="Optional notes for this round..."
                            value={round.notes}
                            onChange={(e) => handleRoundChange(selectedClassId, roundIndex, 'notes', e.target.value)}
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

       {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <Button
                onClick={handleBack}
                variant="outline"
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              <div className="flex gap-3">
                {/* NEW: Save Progress Button */}
                <Button
                  onClick={handleSaveProgress}
                  variant="outline"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Progress
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isEditMode ? 'Save Changes' : 'Save & Continue'}
                    </>
                  )}
                </Button>
              </div>  {/* ← ADD THIS LINE - closes "flex gap-3" */}
            </div>    {/* ← This closes "flex justify-between" */}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

export default function CreateRoundsPage() {
  return (
    <Suspense fallback={
      <MainLayout title="Loading...">
        <div className="flex items-center justify-center min-h-64">
          <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    }>
      <CreateRoundsPageContent />
    </Suspense>
  );
}