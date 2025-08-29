'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Users, UserCheck, ArrowRight, ArrowLeft, Save, Plus, Trash2, Edit } from 'lucide-react';
import { simpleTrialOperations } from '@/lib/trial-operations-simple';

interface Judge {
  id: string;
  name: string;
  email: string;
  level: string;
  city: string;
  province_state: string;
  country: string;
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

export default function CreateTrialRoundsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const trialId = searchParams.get('trial');
  const isEditMode = searchParams.get('mode') === 'edit';

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [trial, setTrial] = useState<Trial | null>(null);
  const [trialClasses, setTrialClasses] = useState<TrialClass[]>([]);
  const [allJudges, setAllJudges] = useState<Judge[]>([]);
  const [qualifiedJudges, setQualifiedJudges] = useState<{ [classId: string]: Judge[] }>({});
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [rounds, setRounds] = useState<{ [classId: string]: RoundData[] }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Sort judges by proximity to trial location
  const sortJudgesByProximity = (judges: Judge[], trialData: Trial): Judge[] => {
    if (!trialData?.location) return judges.sort((a, b) => a.name.localeCompare(b.name));
    
    // Extract trial province/state from location
    // Expected format: "City, Province/State, Country" or variations
    const locationParts = trialData.location.split(',').map(part => part.trim());
    const trialProvinceState = locationParts.length >= 2 ? locationParts[locationParts.length - 2] : '';
    
    return judges.sort((a, b) => {
      const aIsLocal = a.province_state === trialProvinceState;
      const bIsLocal = b.province_state === trialProvinceState;
      
      // Local judges first
      if (aIsLocal && !bIsLocal) return -1;
      if (!aIsLocal && bIsLocal) return 1;
      
      // Both local or both non-local - sort alphabetically
      return a.name.localeCompare(b.name);
    });
  };

  // Check if judge is local (same province/state)
  const isJudgeLocal = (judge: Judge, trialData: Trial): boolean => {
    if (!trialData?.location) return false;
    
    const locationParts = trialData.location.split(',').map(part => part.trim());
    const trialProvinceState = locationParts.length >= 2 ? locationParts[locationParts.length - 2] : '';
    
    return judge.province_state === trialProvinceState;
  };

  // Load initial data
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
      console.log('Loading trial data for rounds page...');

      // Load trial basic info
      const trialResult = await simpleTrialOperations.getTrial(trialId);
      if (!trialResult.success) {
        console.error('Error loading trial:', trialResult.error);
        return;
      }

      setTrial(trialResult.data);

      // Load trial days and classes
      const daysResult = await simpleTrialOperations.getTrialDays(trialId);
      if (!daysResult.success) {
        console.error('Error loading trial days:', daysResult.error);
        return;
      }

      // Load classes for each day
      const allClasses: TrialClass[] = [];
      for (const day of daysResult.data || []) {
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

      setTrialClasses(allClasses);

      // Load all judges
      const judgesResult = await simpleTrialOperations.getAllJudges();
      if (judgesResult.success) {
        const allJudgesData = judgesResult.data || [];
        setAllJudges(allJudgesData);
        
        // Sort judges by proximity to trial location and initialize qualified judges
        const qualifiedMap: { [classId: string]: Judge[] } = {};
        for (const cls of allClasses) {
          const sortedJudges = sortJudgesByProximity(allJudgesData, trialResult.data);
          qualifiedMap[cls.id] = sortedJudges;
        }
        setQualifiedJudges(qualifiedMap);
      }

      // Load existing rounds for all classes
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

      if (allClasses.length > 0 && !selectedClassId) {
        setSelectedClassId(allClasses[0].id);
      }

    } catch (error) {
      console.error('Error loading trial data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  // Handle judge selection
  const handleJudgeSelect = (classId: string, roundIndex: number, judgeId: string) => {
    const classQualifiedJudges = qualifiedJudges[classId] || [];
    const judge = classQualifiedJudges.find(j => j.id === judgeId);
    if (!judge) return;

    setRounds(prev => ({
      ...prev,
      [classId]: prev[classId]?.map((round, idx) => 
        idx === roundIndex 
          ? { ...round, judge_name: judge.name, judge_email: judge.email }
          : round
      ) || []
    }));
  };

  // Handle reset judge selection
  const handleResetJudgeSelect = (classId: string, roundIndex: number, judgeId: string) => {
    const classQualifiedJudges = qualifiedJudges[classId] || [];
    const judge = classQualifiedJudges.find(j => j.id === judgeId);
    if (!judge) return;

    setRounds(prev => ({
      ...prev,
      [classId]: prev[classId]?.map((round, idx) => 
        idx === roundIndex 
          ? { ...round, reset_judge_name: judge.name, reset_judge_email: judge.email }
          : round
      ) || []
    }));
  };

  // Add new round
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
      [classId]: [...classRounds, newRound]
    }));
  };

  // Remove round
  const removeRound = (classId: string, roundIndex: number) => {
    setRounds(prev => ({
      ...prev,
      [classId]: (prev[classId] || []).filter((_, idx) => idx !== roundIndex)
        .map((round, idx) => ({ ...round, round_number: idx + 1 }))
    }));
  };

  // Update round field
  const updateRoundField = (classId: string, roundIndex: number, field: keyof RoundData, value: any) => {
    setRounds(prev => ({
      ...prev,
      [classId]: (prev[classId] || []).map((round, idx) => 
        idx === roundIndex 
          ? { ...round, [field]: value }
          : round
      )
    }));
  };

  // Validate rounds
  const validateRounds = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    let isValid = true;

    for (const [classId, classRounds] of Object.entries(rounds)) {
      classRounds.forEach((round, idx) => {
        const key = `${classId}-${idx}`;
        
        if (!round.judge_name.trim()) {
          newErrors[`${key}-judge`] = 'Judge is required';
          isValid = false;
        }

        if (round.has_reset && !round.reset_judge_name.trim()) {
          newErrors[`${key}-reset-judge`] = 'Reset judge is required when reset is enabled';
          isValid = false;
        }
      });
    }

    setErrors(newErrors);
    return isValid;
  };

  // Save rounds to database
  const saveRounds = async () => {
    if (!validateRounds()) {
      alert('Please fix validation errors before saving.');
      return;
    }

    setLoading(true);
    try {
      for (const [classId, classRounds] of Object.entries(rounds)) {
        if (classRounds.length === 0) continue;

        const roundsToSave = classRounds.map(round => ({
          round_number: round.round_number,
          judge_name: round.judge_name,
          judge_email: round.judge_email,
          start_time: round.start_time || null,
          estimated_duration: round.estimated_duration || null,
          max_entries: round.max_entries,
          has_reset: round.has_reset,
          reset_judge_name: round.has_reset ? round.reset_judge_name : null,
          reset_judge_email: round.has_reset ? round.reset_judge_email : null,
          notes: round.notes || null,
          round_status: 'draft'
        }));

        const result = await simpleTrialOperations.saveTrialRounds(classId, roundsToSave);
        if (!result.success) {
          console.error(`Error saving rounds for class ${classId}:`, result.error);
          alert(`Error saving rounds: ${String(result.error || 'Unknown error')}`);
          return;
        }
      }

      alert('Rounds saved successfully!');

    } catch (error) {
      console.error('Error saving rounds:', error);
      alert('Error saving rounds. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Continue or return based on mode
  const handleContinue = async () => {
    if (!validateRounds() || !trialId) return;

    setLoading(true);
    try {
      // Save rounds first
      for (const [classId, classRounds] of Object.entries(rounds)) {
        if (classRounds.length === 0) continue;

        const roundsToSave = classRounds.map(round => ({
          round_number: round.round_number,
          judge_name: round.judge_name,
          judge_email: round.judge_email,
          start_time: round.start_time || null,
          estimated_duration: round.estimated_duration || null,
          max_entries: round.max_entries,
          has_reset: round.has_reset,
          reset_judge_name: round.has_reset ? round.reset_judge_name : null,
          reset_judge_email: round.has_reset ? round.reset_judge_email : null,
          notes: round.notes || null,
          round_status: 'draft'
        }));

        const result = await simpleTrialOperations.saveTrialRounds(classId, roundsToSave);
        if (!result.success) {
          console.error(`Error saving rounds for class ${classId}:`, result.error);
          alert(`Error saving rounds: ${String(result.error || 'Unknown error')}`);
          return;
        }
      }

      // Navigate based on mode
      if (isEditMode) {
        router.push(`/dashboard/trials/${trialId}`);
      } else {
        router.push(`/dashboard/trials/create/summary?trialId=${trialId}`);
      }
      
    } catch (error) {
      console.error('Error saving rounds:', error);
      alert('Error saving rounds. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (isEditMode) {
      router.push(`/dashboard/trials/${trialId}`);
    } else {
      router.push(`/dashboard/trials/create/levels?trial=${trialId}`);
    }
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
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
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

  return (
    <MainLayout 
      title={isEditMode ? "Edit Trial - Rounds & Judge Assignment" : "Trial Rounds & Judge Assignment"}
      breadcrumbItems={breadcrumbItems}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Edit Mode Indicator */}
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

        {/* Trial Info */}
        <Card>
          <CardHeader>
            <CardTitle>{trial.trial_name}</CardTitle>
            <CardDescription>
              {trial.location} • {new Date(trial.start_date).toLocaleDateString()} - {new Date(trial.end_date).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Class Selection and Rounds */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Class List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Classes</span>
              </CardTitle>
              <CardDescription>
                Select a class to configure rounds and judges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {trialClasses.map((cls) => {
                const classRoundCount = rounds[cls.id]?.length || 0;
                const hasJudges = rounds[cls.id]?.some(r => r.judge_name) || false;
                
                return (
                  <div
                    key={cls.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedClassId === cls.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedClassId(cls.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{cls.class_name}</p>
                        <p className="text-xs text-gray-600">{cls.class_level}</p>
                        <p className="text-xs text-gray-500">Day {cls.trial_days?.day_number || 'N/A'}</p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge variant={hasJudges ? "default" : "secondary"} className="text-xs">
                          {classRoundCount} round{classRoundCount !== 1 ? 's' : ''}
                        </Badge>
                        {hasJudges && (
                          <Badge variant="outline" className="text-xs">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Assigned
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {trialClasses.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No classes configured
                </p>
              )}
            </CardContent>
          </Card>

          {/* Round Configuration */}
          <div className="lg:col-span-3">
            {selectedClass ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <Clock className="h-5 w-5" />
                        <span>{selectedClass.class_name} - {selectedClass.class_level}</span>
                      </CardTitle>
                      <CardDescription>
                        Configure rounds and assign judges for this class
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => addRound(selectedClassId)}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Round</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {selectedClassRounds.map((round, roundIndex) => (
                    <div key={roundIndex} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Round {round.round_number}</h4>
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

                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Judge Selection */}
                        <div className="space-y-2">
                          <Label>Judge *</Label>
                          <Select 
                            value={qualifiedJudges[selectedClassId]?.find(j => j.name === round.judge_name)?.id || ''}
                            onValueChange={(judgeId) => handleJudgeSelect(selectedClassId, roundIndex, judgeId)}
                          >
                            <SelectTrigger className={errors[`${selectedClassId}-${roundIndex}-judge`] ? 'border-red-500' : ''}>
                              <SelectValue placeholder="Select a judge" />
                            </SelectTrigger>
                            <SelectContent className="bg-white max-h-60 overflow-y-auto">
                              {qualifiedJudges[selectedClassId] && qualifiedJudges[selectedClassId].length > 0 ? (
                                qualifiedJudges[selectedClassId].map((judge) => (
                                  <SelectItem 
                                    key={judge.id} 
                                    value={judge.id}
                                    className="text-gray-900 hover:bg-gray-100 focus:bg-gray-100"
                                  >
                                    <div className="w-full">
                                      <div className="font-medium text-gray-900">{judge.name}</div>
                                      <div className="text-xs text-gray-600">
                                        {judge.city}, {judge.province_state}
                                        {trial && isJudgeLocal(judge, trial) && (
                                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                                            Local
                                          </span>
                                        )}
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
                            <p className="text-xs text-red-600">{errors[`${selectedClassId}-${roundIndex}-judge`]}</p>
                          )}
                        </div>

                        {/* Start Time */}
                        <div className="space-y-2">
                          <Label>Start Time</Label>
                          <Input
                            type="time"
                            value={round.start_time}
                            onChange={(e) => updateRoundField(selectedClassId, roundIndex, 'start_time', e.target.value)}
                          />
                        </div>

                        {/* Max Entries */}
                        <div className="space-y-2">
                          <Label>Max Entries</Label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={round.max_entries}
                            onChange={(e) => updateRoundField(selectedClassId, roundIndex, 'max_entries', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Has Reset */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`reset-${selectedClassId}-${roundIndex}`}
                            checked={round.has_reset}
                            onCheckedChange={(checked) => updateRoundField(selectedClassId, roundIndex, 'has_reset', checked)}
                          />
                          <Label htmlFor={`reset-${selectedClassId}-${roundIndex}`}>Has Reset Round</Label>
                        </div>
                      </div>

                      {/* Reset Judge (if has reset) */}
                      {round.has_reset && (
                        <div className="space-y-2">
                          <Label>Reset Judge *</Label>
                          <Select 
                            value={qualifiedJudges[selectedClassId]?.find(j => j.name === round.reset_judge_name)?.id || ''}
                            onValueChange={(judgeId) => handleResetJudgeSelect(selectedClassId, roundIndex, judgeId)}
                          >
                            <SelectTrigger className={errors[`${selectedClassId}-${roundIndex}-reset-judge`] ? 'border-red-500' : ''}>
                              <SelectValue placeholder="Select reset judge" />
                            </SelectTrigger>
                            <SelectContent className="bg-white max-h-60 overflow-y-auto">
                              {qualifiedJudges[selectedClassId] && qualifiedJudges[selectedClassId].length > 0 ? (
                                qualifiedJudges[selectedClassId].map((judge) => (
                                  <SelectItem 
                                    key={judge.id} 
                                    value={judge.id}
                                    className="text-gray-900 hover:bg-gray-100 focus:bg-gray-100"
                                  >
                                    <div className="w-full">
                                      <div className="font-medium text-gray-900">{judge.name}</div>
                                      <div className="text-xs text-gray-600">
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
                          {errors[`${selectedClassId}-${roundIndex}-reset-judge`] && (
                            <p className="text-xs text-red-600">{errors[`${selectedClassId}-${roundIndex}-reset-judge`]}</p>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      <div className="space-y-2">
                        <Label>Round Notes</Label>
                        <Textarea
                          value={round.notes}
                          onChange={(e) => updateRoundField(selectedClassId, roundIndex, 'notes', e.target.value)}
                          placeholder="Any special notes for this round..."
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}

                  {selectedClassRounds.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No rounds configured for this class</p>
                      <Button onClick={() => addRound(selectedClassId)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Round
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Select a class from the left to configure rounds and judges</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={saveRounds}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Rounds</span>
            </Button>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{isEditMode ? 'Back to Trial' : 'Back to Levels'}</span>
            </Button>
            <Button
              onClick={handleContinue}
              disabled={loading || !trialId}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>{isEditMode ? 'Save Changes' : 'Continue to Summary'}</span>
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