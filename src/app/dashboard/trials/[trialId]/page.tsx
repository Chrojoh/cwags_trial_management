'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ShareableEntryLink from '@/components/public/ShareableEntryLink';
import { 
  Calendar,
  Edit,
  Save,
  X,
   AlertCircle,
  Users,
  FileText,
  Clock,
  MapPin,
  Eye,
  Settings,
  Loader2,
  ExternalLink,
  BarChart3,
  CheckCircle
} from 'lucide-react';
import { simpleTrialOperations } from '@/lib/trialOperationsSimple';

interface TrialData {
  id: string;
  trial_name: string;
  club_name: string;
  location: string;
  start_date: string;
  end_date: string;
  trial_status: string;
  trial_secretary: string;
  secretary_email: string;
  secretary_phone: string;
  max_entries_per_day: number;
  waiver_text: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface TrialDay {
  id: string;
  day_number: number;
  trial_date: string;
  day_status: string;
  notes: string;
}

interface TrialClass {
  id: string;
  class_name: string;
  class_type: string;
  class_level: string;
  entry_fee: number;
  max_entries: number;
  class_order: number;
  trial_day_id?: string;
  trial_days?: {
    day_number: number;
    trial_date: string;
  };
}

interface TrialRound {
  id: string;
  round_number: number;
  judge_name: string;
  judge_email: string;
  start_time: string;
  trial_class_id?: string;
  trial_classes?: {
    class_name: string;
    trial_days?: {
      day_number: number;
    };
  };
}

export default function TrialDetailPage() {
  const router = useRouter();
  const params = useParams();
  const trialId = params.trialId as string;

  const [trial, setTrial] = useState<TrialData | null>(null);
  const [trialDays, setTrialDays] = useState<TrialDay[]>([]);
  const [trialClasses, setTrialClasses] = useState<TrialClass[]>([]);
  const [trialRounds, setTrialRounds] = useState<TrialRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<TrialData>>({});

  useEffect(() => {
    if (trialId) {
      loadTrialData();
    }
  }, [trialId]);

  const loadTrialData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading complete trial data for ID:', trialId);

      // Load trial basic info
      const trialResult = await simpleTrialOperations.getTrial(trialId);
      if (!trialResult.success) {
        throw new Error('Failed to load trial data');
      }

      // Load trial days
      const daysResult = await simpleTrialOperations.getTrialDays(trialId);
      if (!daysResult.success) {
        console.warn('Failed to load trial days:', daysResult.error);
      }

      // Load trial classes
      const classesResult = await simpleTrialOperations.getAllTrialClasses(trialId);
      if (!classesResult.success) {
        console.warn('Failed to load trial classes:', classesResult.error);
      }

      // Load trial rounds
      const roundsResult = await simpleTrialOperations.getAllTrialRounds(trialId);
      if (!roundsResult.success) {
        console.warn('Failed to load trial rounds:', roundsResult.error);
      }

      setTrial(trialResult.data);
      setTrialDays(daysResult.data || []);
      setTrialClasses(classesResult.data || []);
      setTrialRounds(roundsResult.data || []);

      console.log('Trial data loaded successfully');

    } catch (err) {
      console.error('Error loading trial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trial data');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (section: string, data: any = {}) => {
    setEditingSection(section);
    setEditData(data);
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditData({});
  };

  const saveSection = async (section: string) => {
    setSaving(true);
    try {
      let result;

      switch (section) {
        case 'basic':
          result = await simpleTrialOperations.updateTrial(trialId, editData);
          if (result.success) {
            setTrial(result.data);
          }
          break;
        // Add other section saves here later
      }

      if (result?.success) {
        setEditingSection(null);
        setEditData({});
      } else {
        const errorMessage = typeof result?.error === 'string' 
          ? result.error 
          : result?.error?.message || 'Failed to save changes';
        throw new Error(errorMessage);
      }

    } catch (err) {
      console.error('Error saving section:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

 const handleEditNavigation = (editType: string) => {
     console.log('handleEditNavigation called with:', editType);
  const routes = {
    days: `/dashboard/trials/create/days?trial=${trialId}&mode=edit`,
    classes: `/dashboard/trials/create/levels?trial=${trialId}&mode=edit`,
    rounds: `/dashboard/trials/create/rounds?trial=${trialId}&mode=edit`  // Change this line
  };
  
  if (routes[editType as keyof typeof routes]) {
    router.push(routes[editType as keyof typeof routes]);
  }
};

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
  if (loading) {
    return (
      <MainLayout title="Loading Trial...">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading trial data...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !trial) {
    return (
      <MainLayout title="Trial Not Found">
        <div className="max-w-6xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Trial not found. It may have been deleted or you may not have permission to view it.'}
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => router.push('/dashboard/trials')}>
              Back to Trials
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Trials', href: '/dashboard/trials' },
    { label: trial.trial_name }
  ];

  return (
    <MainLayout 
      title={trial.trial_name}
      breadcrumbItems={breadcrumbItems}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Trial Header */}
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-blue-900">{trial.trial_name}</CardTitle>
                <CardDescription className="text-blue-700 mt-2">
                  <span className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{trial.location}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(trial.start_date)} - {formatDate(trial.end_date)}</span>
                    </span>
                  </span>
                </CardDescription>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className={`${getStatusColor(trial.trial_status)} border text-sm px-3 py-1`}>
                  {trial.trial_status.charAt(0).toUpperCase() + trial.trial_status.slice(1)}
                </Badge>
                <Button variant="outline" onClick={() => router.push('/dashboard/trials')}>
                  <Eye className="h-4 w-4 mr-2" />
                  All Trials
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{trialDays.length}</div>
              <div className="text-sm text-gray-600">Trial Days</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{trialClasses.length}</div>
              <div className="text-sm text-gray-600">Classes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{trialRounds.length}</div>
              <div className="text-sm text-gray-600">Rounds</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {[...new Set(trialRounds.map(r => r.judge_name))].length}
              </div>
              <div className="text-sm text-gray-600">Judges</div>
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="days" className="relative group">
              <span>Days ({trialDays.length})</span>
              <span
                className="ml-2 opacity-40 group-hover:opacity-80 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditNavigation('days');
                }}
              >
                <Edit className="h-3 w-3" />
              </span>
            </TabsTrigger>
            <TabsTrigger value="classes" className="relative group">
              <span>Classes ({trialClasses.length})</span>
              <span
                className="ml-2 opacity-40 group-hover:opacity-80 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditNavigation('classes');
                }}
              >
                <Edit className="h-3 w-3" />
              </span>
            </TabsTrigger>
            <TabsTrigger value="rounds" className="relative group">
              <span>Rounds ({trialRounds.length})</span>
              <span
                className="ml-2 opacity-40 group-hover:opacity-80 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditNavigation('rounds');
                }}
              >
                <Edit className="h-3 w-3" />
              </span>
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span>Basic Trial Information</span>
                  </CardTitle>
                  {editingSection !== 'basic' && (
                    <Button 
                      variant="outline" 
                      onClick={() => startEditing('basic', trial)}
                      className="flex items-center space-x-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingSection === 'basic' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="trial_name">Trial Name</Label>
                        <Input
                          id="trial_name"
                          value={editData.trial_name || ''}
                          onChange={(e) => setEditData((prev: Partial<TrialData>) => ({ ...prev, trial_name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="club_name">Club Name</Label>
                        <Input
                          id="club_name"
                          value={editData.club_name || ''}
                          onChange={(e) => setEditData((prev: Partial<TrialData>) => ({ ...prev, club_name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="trial_secretary">Trial Secretary</Label>
                        <Input
                          id="trial_secretary"
                          value={editData.trial_secretary || ''}
                          onChange={(e) => setEditData((prev: Partial<TrialData>) => ({ ...prev, trial_secretary: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="secretary_email">Secretary Email</Label>
                        <Input
                          id="secretary_email"
                          type="email"
                          value={editData.secretary_email || ''}
                          onChange={(e) => setEditData((prev: Partial<TrialData>) => ({ ...prev, secretary_email: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="secretary_phone">Secretary Phone</Label>
                        <Input
                          id="secretary_phone"
                          value={editData.secretary_phone || ''}
                          onChange={(e) => setEditData((prev: Partial<TrialData>) => ({ ...prev, secretary_phone: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="max_entries_per_day">Max Entries Per Day</Label>
                        <Input
                          id="max_entries_per_day"
                          type="number"
                          min="1"
                          value={editData.max_entries_per_day || ''}
                          onChange={(e) => setEditData((prev: Partial<TrialData>) => ({ ...prev, max_entries_per_day: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={editData.notes || ''}
                        onChange={(e) => setEditData((prev: Partial<TrialData>) => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={() => saveSection('basic')} 
                        disabled={saving}
                        className="flex items-center space-x-2"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        <span>Save Changes</span>
                      </Button>
                      <Button variant="outline" onClick={cancelEditing}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Trial Name</Label>
                      <p className="text-gray-900 mt-1">{trial.trial_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Club Name</Label>
                      <p className="text-gray-900 mt-1">{trial.club_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Location</Label>
                      <p className="text-gray-900 mt-1">{trial.location}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Trial Dates</Label>
                      <p className="text-gray-900 mt-1">
                        {formatDate(trial.start_date)} - {formatDate(trial.end_date)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Trial Secretary</Label>
                      <p className="text-gray-900 mt-1">{trial.trial_secretary}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Secretary Email</Label>
                      <p className="text-gray-900 mt-1">{trial.secretary_email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Secretary Phone</Label>
                      <p className="text-gray-900 mt-1">{trial.secretary_phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Max Entries Per Day</Label>
                      <p className="text-gray-900 mt-1">{trial.max_entries_per_day}</p>
                    </div>
                    {trial.notes && (
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium text-gray-600">Notes</Label>
                        <p className="text-gray-900 mt-1">{trial.notes}</p>
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium text-gray-600">Created</Label>
                      <p className="text-gray-900 mt-1">
                        {formatDate(trial.created_at)}
                        {trial.updated_at && trial.updated_at !== trial.created_at && (
                          <span className="text-gray-500 ml-2">
                            (Updated {formatDate(trial.updated_at)})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trial Days Tab */}
          <TabsContent value="days">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span>Trial Days</span>
                </CardTitle>
                <CardDescription>
                  Days configured for this trial
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trialDays.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No trial days configured yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {trialDays.map((day) => (
                      <div key={day.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Day {day.day_number}</span>
                          <Badge variant="outline">{day.day_status}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{formatDate(day.trial_date)}</p>
                        {day.notes && (
                          <p className="text-sm text-gray-500 mt-2">{day.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trial Classes Tab */}
          <TabsContent value="classes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span>Trial Classes</span>
                </CardTitle>
                <CardDescription>
                  Classes and levels configured for this trial
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trialClasses.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No classes configured yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trialClasses.map((cls) => (
                      <div key={cls.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{cls.class_name}</h3>
                            <p className="text-sm text-gray-600">
                              Day {cls.trial_days?.day_number || 'N/A'} • {cls.class_type} • {cls.class_level}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${cls.entry_fee}</p>
                            <p className="text-sm text-gray-600">Max: {cls.max_entries}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trial Rounds Tab */}
          <TabsContent value="rounds">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span>Trial Rounds</span>
                </CardTitle>
                <CardDescription>
                  Rounds and judge assignments for this trial
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trialRounds.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No rounds configured yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trialRounds.map((round) => {
                      // Find the corresponding day for this round's class
                      const roundDay = trialDays.find(day => 
                        trialClasses.some(cls => 
                          String(cls.trial_day_id) === String(day.id) && 
                          String(cls.id) === String(round.trial_class_id)
                        )
                      );
                      
                      return (
                        <div key={round.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">
                                {round.trial_classes?.class_name || 'Unknown Class'} - Round {round.round_number}
                              </h3>
                              <p className="text-sm text-gray-600">
                                Day {roundDay?.day_number || round.trial_classes?.trial_days?.day_number || 'N/A'}
                                {round.start_time && ` • ${round.start_time}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{round.judge_name}</p>
                              <p className="text-sm text-gray-600">{round.judge_email}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

         {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                  <span>Trial Settings & Actions</span>
                </CardTitle>
                <CardDescription>
                  Manage trial status and edit trial components
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Current Status</Label>
                    <div className="mt-2">
                      <Badge className={`${getStatusColor(trial.trial_status)} text-base px-4 py-2`}>
                        {trial.trial_status.charAt(0).toUpperCase() + trial.trial_status.slice(1)}
                      </Badge>
                    </div>
                    {trial.trial_status === 'draft' && (
                      <div className="mt-4">
                        <Button 
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={async () => {
                            const result = await simpleTrialOperations.publishTrial(trialId);
                            if (result.success) {
                              alert('Trial published successfully!');
                              loadTrialData();
                            }
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Publish Trial
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Entry Management Section */}
                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-medium mb-4">Entry Management</h3>
                    <div className="space-y-3">
                      <Button 
                        variant="default" 
                        className="w-full justify-start bg-green-600 hover:bg-green-700"
                        onClick={() => router.push(`/dashboard/trials/${trialId}/entries`)}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Manage Entries (0 entries)
                      </Button>
                      <div className="mt-4 mb-4">
  <ShareableEntryLink 
    trialId={trialId} 
    trialName={trial?.trial_name || 'Trial'}
  />
</div>
                      <Button 
                        variant="default" 
                        className="w-full justify-start bg-blue-600 hover:bg-blue-700"
                        onClick={() => router.push(`/dashboard/trials/${trialId}/live-event`)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Live Event Management
                      </Button>
                      <Button 
                        variant="default" 
                        className="w-full justify-start bg-purple-600 hover:bg-purple-700"
                        onClick={() => router.push(`/dashboard/trials/${trialId}/summary`)}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Class Summary Sheet
                      </Button>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-medium mb-4">Edit Trial Components</h3>
                    <div className="space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => handleEditNavigation('days')}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Edit Days ({trialDays.length} configured)
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => handleEditNavigation('classes')}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Edit Classes & Levels ({trialClasses.length} configured)
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => handleEditNavigation('rounds')}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Edit Rounds & Judges ({trialRounds.length} configured)
                      </Button>
                    </div>
                  </div>

       <div className="pt-4 border-t">
                    <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <FileText className="h-4 w-4 mr-2" />
                        View/Edit Waiver Text
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Eye className="h-4 w-4 mr-2" />
                        Preview Trial Premium
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}