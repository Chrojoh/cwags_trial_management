'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar,
  ArrowLeft,
  Save,
  CheckCircle,
  Info,
  Users,
  DollarSign,
  Clock,
  MapPin,
  Mail,
  Phone,
  Trophy,
  UserCheck,
  Edit,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { simpleTrialOperations } from '@/lib/trialOperationsSimple';

interface TrialSummaryData {
  trial: any;
  days: any[];
  classes: any[];
  rounds: any[];
  stats: {
    totalDays: number;
    totalClasses: number;
    totalRounds: number;
    uniqueJudges: number;
  };
}

function TrialSummaryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [trialData, setTrialData] = useState<TrialSummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get trial ID from URL params or localStorage
  const trialIdFromParams = searchParams.get('trialId');
  const trialIdFromStorage = typeof window !== 'undefined' ? localStorage.getItem('currentTrialId') : null;
  const trialId = trialIdFromParams || trialIdFromStorage;

  useEffect(() => {
    console.log('Summary page - Trial ID from params:', trialIdFromParams);
    console.log('Summary page - Trial ID from storage:', trialIdFromStorage);
    console.log('Summary page - Using trial ID:', trialId);

    if (!trialId) {
      console.error('No trial ID available');
      setError('No trial ID provided. Please start the trial creation process from the beginning.');
      setIsLoading(false);
      return;
    }

    loadTrialSummary();
  }, [trialId]);

  const loadTrialSummary = async () => {
    if (!trialId) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('Loading trial summary for ID:', trialId);
      const result = await simpleTrialOperations.getTrialSummary(trialId);

      if (result.success && result.data) {
        console.log('Trial summary loaded:', result.data);
        setTrialData(result.data);
      } else {
        const errorMessage = String(result.error || 'Failed to load trial data');
        console.error('Error loading trial summary:', result.error);
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error loading trial summary:', error);
      setError('Failed to load trial data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (trialId) {
      router.push(`/dashboard/trials/create/rounds?trialId=${trialId}`);
    } else {
      router.push('/dashboard/trials/create/rounds');
    }
  };

  const handleSaveDraft = async () => {
    if (!trialId || !trialData) return;

    try {
      console.log('Saving trial as draft:', trialId);
      
      const updateData = {
        trial_status: 'draft',
        updated_at: new Date().toISOString()
      };

      const result = await simpleTrialOperations.updateTrial(trialId, updateData);
      
      if (result.success) {
        console.log('Trial saved as draft successfully');
        // Show success message or toast
      } else {
        console.error('Error saving draft:', result.error);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const handlePublishTrial = async () => {
    if (!trialId) return;

    setIsSubmitting(true);
    try {
      console.log('Publishing trial:', trialId);
      
      const result = await simpleTrialOperations.publishTrial(trialId);
      
      if (result.success) {
        console.log('Trial published successfully');
        // Redirect to trial management page
        router.push('/dashboard/trials');
      } else {
        console.error('Error publishing trial:', result.error);
        setError('Failed to publish trial');
      }
    } catch (error) {
      console.error('Error publishing trial:', error);
      setError('Failed to publish trial');
    } finally {
      setIsSubmitting(false);
    }
  };

 const formatDate = (dateString: string) => {
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

  const formatTime = (timeString: string) => {
    if (!timeString) return 'TBD';
    return new Date(`2024-01-01T${timeString}`).toLocaleTimeString('en-CA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatLocation = (trial: any) => {
    if (!trial) return 'Location not specified';
    
    const parts = [];
    if (trial.venue_name) parts.push(trial.venue_name);
    if (trial.city) parts.push(trial.city);
    if (trial.province) parts.push(trial.province);
    if (trial.country) parts.push(trial.country);
    
    return parts.length > 0 ? parts.join(', ') : trial.location || 'Location not specified';
  };

  // Loading state
  if (isLoading) {
    return (
      <MainLayout 
        title="Trial Summary & Confirmation"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Trials', href: '/dashboard/trials' },
          { label: 'Create Trial', href: '/dashboard/trials/create' },
          { label: 'Summary' }
        ]}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-lg text-gray-600">Loading trial summary...</span>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (error || !trialData) {
    return (
      <MainLayout 
        title="Trial Summary & Confirmation"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Trials', href: '/dashboard/trials' },
          { label: 'Create Trial', href: '/dashboard/trials/create' },
          { label: 'Summary' }
        ]}
      >
        <div className="max-w-6xl mx-auto">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Error loading trial data:</strong> {error || 'Unknown error occurred'}
            </AlertDescription>
          </Alert>
          <div className="mt-6 space-x-3">
            <Button onClick={() => router.push('/dashboard/trials/create')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Start Over
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard/trials')}>
              Back to Trials
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const trial = trialData?.trial || {};
  const days = trialData?.days || [];
  const classes = trialData?.classes || [];
  const rounds = trialData?.rounds || [];
  const stats = trialData?.stats || { totalDays: 0, totalClasses: 0, totalRounds: 0, uniqueJudges: 0 };

  // Calculate revenue and statistics with safety checks
  const totalEstimatedRevenue = classes.reduce((sum: number, cls: any) => {
    const entryFee = cls.entry_fee || 0;
    const maxEntries = cls.max_entries || 0;
    return sum + (entryFee * maxEntries);
  }, 0);
  
  const totalMaxEntries = classes.reduce((sum: number, cls: any) => sum + (cls.max_entries || 0), 0);
  const averageEntryFee = totalMaxEntries > 0 ? Math.round(totalEstimatedRevenue / totalMaxEntries) : 0;

  // Group rounds by day for display
  const roundsByDay = rounds.reduce((acc: any, round: any) => {
    const dayDate = round.trial_classes?.trial_days?.trial_date;
    if (!dayDate) return acc;
    
    if (!acc[dayDate]) {
      acc[dayDate] = [];
    }
    acc[dayDate].push({
      ...round,
      levelName: round.trial_classes?.class_name,
      startTime: round.start_time,
      duration: round.estimated_duration ? Math.round(round.estimated_duration / 60000) : 60, // Convert to minutes
      judgeName: round.judge_name,
      hasReset: round.has_reset,
      resetJudge: round.reset_judge_name
    });
    return acc;
  }, {});

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Trials', href: '/dashboard/trials' },
    { label: 'Create Trial', href: '/dashboard/trials/create' },
    { label: 'Summary' }
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
      title="Trial Summary & Confirmation"
      breadcrumbItems={breadcrumbItems}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 mb-8 overflow-x-auto">
          {stepTitles.map((title, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === 6; // Current step
            const isCompleted = stepNumber < 6; // Previous steps
            
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
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : stepNumber}
                  </div>
                  <span className="text-sm font-medium hidden sm:block">{title}</span>
                </div>
                {index < stepTitles.length - 1 && (
                  <div className={`ml-4 w-8 sm:w-16 h-0.5 ${
                    stepNumber < 6 ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Completion Alert */}
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Trial setup complete!</strong> Review all details below and publish your trial to start accepting entries.
          </AlertDescription>
        </Alert>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Classes</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalClasses}</p>
                </div>
                <Trophy className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Rounds</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalRounds}</p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Judges</p>
                  <p className="text-2xl font-bold text-green-600">{stats.uniqueJudges}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Est. Revenue</p>
                  <p className="text-2xl font-bold text-emerald-600">${totalEstimatedRevenue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trial Information Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Info className="h-5 w-5 text-blue-600" />
                <span>Trial Information</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/trials/create?trialId=${trialId}`)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">{trial.trial_name}</h4>
                  <p className="text-gray-600 flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    {trial.club_name}
                  </p>
                  <p className="text-gray-600 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {formatLocation(trial)}
                  </p>
                  <p className="text-gray-600 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(trial.start_date)} - {formatDate(trial.end_date)}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Trial Secretary</h4>
                  <p className="text-gray-600 flex items-center">
                    <UserCheck className="h-4 w-4 mr-2" />
                    {trial.trial_secretary}
                  </p>
                  <p className="text-gray-600 flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    {trial.secretary_email}
                  </p>
                  <p className="text-gray-600 flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    {trial.secretary_phone}
                  </p>
                </div>
              </div>
            </div>
            
            {trial.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-700">
                  <strong>Notes:</strong> {trial.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule by Day */}
        <div className="space-y-6">
          {Object.entries(roundsByDay).map(([dayDate, dayRounds]: [string, any]) => (
            <Card key={dayDate}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span>{formatDate(dayDate)}</span>
                    <Badge variant="outline">{dayRounds.length} rounds</Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/trials/create/rounds?trialId=${trialId}`)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Schedule
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dayRounds
                    .sort((a: any, b: any) => (a.startTime || '').localeCompare(b.startTime || ''))
                    .map((round: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm font-medium text-gray-900">
                          {formatTime(round.startTime)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{round.levelName}</div>
                          <div className="text-sm text-gray-600">
                            Judge: {round.judgeName} • {round.duration} min
                            {round.hasReset && ` • Reset: ${round.resetJudge}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {round.hasReset && (
                          <Badge variant="secondary" className="text-xs">Reset</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {round.max_entries} entries
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <span>Revenue Projection</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">By Class</h4>
                <div className="space-y-2">
                  {classes.map((cls: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{cls.class_name} ({formatDate(cls.trial_days?.trial_date).split(',')[0]})</span>
                      <span className="font-medium">${(cls.entry_fee * cls.max_entries).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Possible Entries</span>
                    <span>{totalMaxEntries}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Average Entry Fee</span>
                    <span>${averageEntryFee}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total Estimated Revenue</span>
                    <span className="text-emerald-600">${totalEstimatedRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
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
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>
            <Button
              onClick={handlePublishTrial}
              disabled={isSubmitting}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Publish Trial</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default function TrialSummaryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <TrialSummaryPageContent />
    </Suspense>
  )
}