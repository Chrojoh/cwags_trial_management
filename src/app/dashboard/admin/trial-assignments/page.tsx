'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/mainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, 
  Calendar,
  Trash2,
  Plus,
  AlertCircle,
  Loader2,
  X,
  UserPlus
} from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

interface Trial {
  id: string;
  trial_name: string;
  start_date: string;
  end_date: string;
  location: string;
  trial_status: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface Assignment {
  id: string;
  trial_id: string;
  user_id: string;
  assigned_at: string;
  notes: string | null;
  trials: Trial;
  users: User;
}

export default function TrialAssignmentsPage() {
  const { user } = useAuth();
  const supabase = getSupabaseBrowser();
  
  const [trials, setTrials] = useState<Trial[]>([]);
  const [secretaries, setSecretaries] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTrialId, setSelectedTrialId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.role === 'administrator') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
  try {
    setLoading(true);
    setError(null);

    // Load trials
    console.log('Loading trials...');
    const { data: trialsData, error: trialsError } = await supabase
      .from('trials')
      .select('*')
      .order('start_date', { ascending: false });

    if (trialsError) {
      console.error('Trials error:', trialsError);
      throw new Error(`Trials: ${trialsError.message}`);
    }
    console.log('Trials loaded:', trialsData?.length);

    // Load secretaries (trial_secretary role users)
    console.log('Loading secretaries...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'trial_secretary')
      .order('first_name');

    if (usersError) {
      console.error('Users error:', usersError);
      throw new Error(`Users: ${usersError.message}`);
    }
    console.log('Secretaries loaded:', usersData?.length);

    // Load assignments
console.log('Loading assignments...');
const { data: assignmentsData, error: assignmentsError } = await supabase
  .from('trial_secretaries')
  .select(`
    *,
    trials(id, trial_name, start_date, end_date, location, trial_status),
    users!user_id(id, first_name, last_name, email, role)
  `)
  .order('assigned_at', { ascending: false });

    if (assignmentsError) {
      console.error('Assignments error:', assignmentsError);
      throw new Error(`Assignments: ${assignmentsError.message}`);
    }
    console.log('Assignments loaded:', assignmentsData?.length);

    setTrials(trialsData || []);
    setSecretaries(usersData || []);
    setAssignments(assignmentsData || []);

  } catch (err) {
    console.error('Error loading data:', err);
    setError(err instanceof Error ? err.message : 'Failed to load data');
  } finally {
    setLoading(false);
  }
};

  const addAssignment = async () => {
    if (!selectedTrialId || !selectedUserId) {
      setError('Please select both a trial and a secretary');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const { error: insertError } = await supabase
        .from('trial_secretaries')
        .insert({
          trial_id: selectedTrialId,
          user_id: selectedUserId,
          assigned_by: user?.id,
          notes: notes || null
        });

      if (insertError) {
        if (insertError.code === '23505') {
          setError('This secretary is already assigned to this trial');
        } else {
          throw insertError;
        }
        return;
      }

      // Reset form
      setSelectedTrialId('');
      setSelectedUserId('');
      setNotes('');
      setShowAddModal(false);

      // Reload data
      await loadData();

    } catch (err) {
      console.error('Error adding assignment:', err);
      setError(err instanceof Error ? err.message : 'Failed to add assignment');
    } finally {
      setSaving(false);
    }
  };

  const removeAssignment = async (assignmentId: string, trialName: string, userName: string) => {
    if (!confirm(`Remove ${userName} from ${trialName}?`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('trial_secretaries')
        .delete()
        .eq('id', assignmentId);

      if (deleteError) throw deleteError;

      await loadData();

    } catch (err) {
      console.error('Error removing assignment:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove assignment');
    } finally {
      setSaving(false);
    }
  };

  // Filter assignments by search
  const filteredAssignments = assignments.filter(a =>
    a.trials.trial_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${a.users.first_name} ${a.users.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.trials.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group assignments by trial
  const assignmentsByTrial = filteredAssignments.reduce((acc, assignment) => {
    if (!acc[assignment.trial_id]) {
      acc[assignment.trial_id] = {
        trial: assignment.trials,
        assignments: []
      };
    }
    acc[assignment.trial_id].assignments.push(assignment);
    return acc;
  }, {} as Record<string, { trial: Trial; assignments: Assignment[] }>);

  if (user?.role !== 'administrator') {
    return (
      <MainLayout title="Trial Assignments">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Only administrators can access this page.
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout title="Trial Assignments">
        <div className="flex items-center justify-center min-h-64">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Trial Secretary Assignments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trial Secretary Assignments</h1>
            <p className="text-gray-600 mt-1">
              Assign multiple secretaries to trials for coverage and flexibility
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Assignment
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Trials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trials.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Active Secretaries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{secretaries.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Input
              placeholder="Search trials or secretaries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <Users className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Assignments grouped by trial */}
        <div className="space-y-4">
          {Object.values(assignmentsByTrial).map(({ trial, assignments: trialAssignments }) => (
            <Card key={trial.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      <span>{trial.trial_name}</span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {trial.location} • {new Date(trial.start_date).toLocaleDateString()} - {new Date(trial.end_date).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge>{trialAssignments.length} {trialAssignments.length === 1 ? 'Secretary' : 'Secretaries'}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Secretary</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trialAssignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">
                          {assignment.users.first_name} {assignment.users.last_name}
                        </TableCell>
                        <TableCell>{assignment.users.email}</TableCell>
                        <TableCell>
                          {new Date(assignment.assigned_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {assignment.notes || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAssignment(
                              assignment.id,
                              trial.trial_name,
                              `${assignment.users.first_name} ${assignment.users.last_name}`
                            )}
                            disabled={saving}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}

          {Object.keys(assignmentsByTrial).length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm ? 'No assignments match your search' : 'No trial secretary assignments yet'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Assignment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Trial Secretary Assignment</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedTrialId('');
                  setSelectedUserId('');
                  setNotes('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Trial *</Label>
                <Select value={selectedTrialId} onValueChange={setSelectedTrialId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a trial" />
                  </SelectTrigger>
                  <SelectContent>
                    {trials.map((trial) => (
                      <SelectItem key={trial.id} value={trial.id}>
                        {trial.trial_name} ({new Date(trial.start_date).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Secretary *</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a secretary" />
                  </SelectTrigger>
                  <SelectContent>
                    {secretaries.map((secretary) => (
                      <SelectItem key={secretary.id} value={secretary.id}>
                        {secretary.first_name} {secretary.last_name} ({secretary.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Primary contact, backup secretary"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedTrialId('');
                    setSelectedUserId('');
                    setNotes('');
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={addAssignment}
                  disabled={saving || !selectedTrialId || !selectedUserId}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Assign Secretary
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}