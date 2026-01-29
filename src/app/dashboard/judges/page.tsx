// src/app/dashboard/judges/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; 
import JudgeStatistics from '@/components/JudgeStatistics';
import { Plus, Search, Edit, Trash2, X, Filter, UserCheck, UserX, ArrowLeft, Calendar, AlertTriangle } from 'lucide-react';
import { 
  getAllJudges, 
  createJudge, 
  updateJudge, 
  deleteJudge 
} from '@/lib/judges';
import { getJudgeLastDate, preloadJudgeLastDates } from '@/lib/judgeLastDate';
import type { Judge, JudgeFormData } from '../../../types/judge';
import { 
  OBEDIENCE_LEVELS, 
  RALLY_LEVELS, 
  SCENT_LEVELS, 
  GAMES_LEVELS,
  emptyJudgeForm,
  sortCertificationLevels 
} from '../../../types/judge';

interface JudgeWithDate extends Judge {
  lastJudgingDate: Date | null;
  monthsSinceLastJudging: number | null;
}

export default function JudgesPage() {
  const router = useRouter();
  const [judges, setJudges] = useState<Judge[]>([]);
  const [judgesWithDates, setJudgesWithDates] = useState<JudgeWithDate[]>([]);
  const [filteredJudges, setFilteredJudges] = useState<JudgeWithDate[]>([]);
  const [judgeLastDates, setJudgeLastDates] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingDates, setLoadingDates] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [inactivityFilter, setInactivityFilter] = useState<'all' | '11months' | '1year'>('all');
  const [selectedJudges, setSelectedJudges] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingJudge, setEditingJudge] = useState<Judge | null>(null);
  const [formData, setFormData] = useState<JudgeFormData>(emptyJudgeForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadJudges();
    loadJudgeDates();
  }, []);

  useEffect(() => {
    if (!loadingDates && judges.length > 0) {
      processJudgesWithDates();
    }
  }, [judges, loadingDates]);

  useEffect(() => {
    applyFilters();
  }, [judgesWithDates, searchTerm, showActiveOnly, inactivityFilter]);

  const loadJudges = async () => {
    setLoading(true);
    try {
      const data = await getAllJudges();
      setJudges(data);
    } catch (error) {
      console.error('Error loading judges:', error);
      alert('Failed to load judges');
    } finally {
      setLoading(false);
    }
  };

  const loadJudgeDates = async () => {
    setLoadingDates(true);
    try {
      await preloadJudgeLastDates();
      console.log('Judge dates preloaded');
    } catch (error) {
      console.error('Error preloading judge dates:', error);
    } finally {
      setLoadingDates(false);
    }
  };

  const getLastDateForJudge = async (judgeName: string): Promise<string> => {
    if (judgeLastDates.has(judgeName)) {
      return judgeLastDates.get(judgeName)!;
    }

    const lastDate = await getJudgeLastDate(judgeName);
    setJudgeLastDates(prev => new Map(prev).set(judgeName, lastDate));
    return lastDate;
  };

  const calculateMonthsSince = (dateStr: string): number | null => {
    if (!dateStr || dateStr === 'No record found' || dateStr === 'Error loading' || dateStr === 'Loading...') {
      return null;
    }

    try {
      const lastDate = new Date(dateStr);
      const now = new Date();
      const diffTime = now.getTime() - lastDate.getTime();
      const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44); // Average days per month
      return Math.floor(diffMonths);
    } catch (error) {
      return null;
    }
  };

  const processJudgesWithDates = async () => {
    const judgesWithDateInfo: JudgeWithDate[] = await Promise.all(
      judges.map(async (judge) => {
        const dateStr = await getLastDateForJudge(judge.name);
        const monthsSince = calculateMonthsSince(dateStr);
        
        let lastDate: Date | null = null;
        if (dateStr && dateStr !== 'No record found' && dateStr !== 'Error loading') {
          try {
            lastDate = new Date(dateStr);
          } catch (e) {
            lastDate = null;
          }
        }

        return {
          ...judge,
          lastJudgingDate: lastDate,
          monthsSinceLastJudging: monthsSince
        };
      })
    );

    setJudgesWithDates(judgesWithDateInfo);
  };

  const applyFilters = () => {
    let filtered = [...judgesWithDates];

    // Active/Inactive filter
    if (showActiveOnly) {
      filtered = filtered.filter(j => j.is_active);
    }

    // Inactivity filter
    if (inactivityFilter === '11months') {
      filtered = filtered.filter(j => 
        j.monthsSinceLastJudging !== null && j.monthsSinceLastJudging >= 11
      );
    } else if (inactivityFilter === '1year') {
      filtered = filtered.filter(j => 
        j.monthsSinceLastJudging !== null && j.monthsSinceLastJudging >= 12
      );
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        j =>
          j.name.toLowerCase().includes(term) ||
          j.email?.toLowerCase().includes(term) ||
          j.city?.toLowerCase().includes(term) ||
          j.province_state?.toLowerCase().includes(term)
      );
    }

    setFilteredJudges(filtered);
  };

  const handleSelectJudge = (judgeId: string) => {
    setSelectedJudges(prev => {
      const newSet = new Set(prev);
      if (newSet.has(judgeId)) {
        newSet.delete(judgeId);
      } else {
        newSet.add(judgeId);
      }
      return newSet;
    });
  };

  const handleBulkMarkInactive = async () => {
    if (selectedJudges.size === 0) {
      alert('Please select judges to mark as inactive');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to mark ${selectedJudges.size} judge(s) as inactive?\n\nPlease verify these judges are truly inactive before proceeding.`
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      // Update each selected judge
      for (const judgeId of selectedJudges) {
        const judge = judges.find(j => j.id === judgeId);
        if (judge) {
          // Properly convert Judge to JudgeFormData
          const judgeFormData: JudgeFormData = {
            name: judge.name,
            email: judge.email,
            phone: judge.phone || '',
            city: judge.city || '',
            province_state: judge.province_state || '',
            country: judge.country || '',
            obedience_levels: judge.obedience_levels || [],
            rally_levels: judge.rally_levels || [],
            games_levels: judge.games_levels || [],
            scent_levels: judge.scent_levels || [],
            is_active: false
          };
          
          await updateJudge(judgeId, judgeFormData);
        }
      }

      alert(`Successfully marked ${selectedJudges.size} judge(s) as inactive`);
      setSelectedJudges(new Set());
      await loadJudges();
    } catch (error) {
      console.error('Error marking judges inactive:', error);
      alert('Failed to update judges');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    setEditingJudge(null);
    setFormData(emptyJudgeForm);
    setShowModal(true);
  };

  const handleEdit = (judge: Judge) => {
    setEditingJudge(judge);
    setFormData({
      name: judge.name,
      email: judge.email,
      phone: judge.phone || '',
      city: judge.city || '',
      province_state: judge.province_state || '',
      country: judge.country || '',
      obedience_levels: judge.obedience_levels || [],
      rally_levels: judge.rally_levels || [],
      games_levels: judge.games_levels || [],
      scent_levels: judge.scent_levels || [],
      is_active: judge.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (judge: Judge) => {
    if (!confirm(`Are you sure you want to delete ${judge.name}?`)) return;

    try {
      await deleteJudge(judge.id);
      await loadJudges();
    } catch (error) {
      console.error('Error deleting judge:', error);
      alert('Failed to delete judge');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingJudge) {
        await updateJudge(editingJudge.id, formData);
      } else {
        await createJudge(formData);
      }
      setShowModal(false);
      await loadJudges();
    } catch (error) {
      console.error('Error saving judge:', error);
      alert('Failed to save judge');
    } finally {
      setSaving(false);
    }
  };

  const toggleLevel = (discipline: 'obedience_levels' | 'rally_levels' | 'games_levels' | 'scent_levels', level: string) => {
    const current = formData[discipline];
    const updated = current.includes(level)
      ? current.filter(l => l !== level)
      : [...current, level];
    
    setFormData({ ...formData, [discipline]: updated });
  };

  // Count judges by inactivity
  const elevenMonthsCount = judgesWithDates.filter(j => 
    j.is_active && j.monthsSinceLastJudging !== null && j.monthsSinceLastJudging >= 11 && j.monthsSinceLastJudging < 12
  ).length;

  const oneYearCount = judgesWithDates.filter(j => 
    j.is_active && j.monthsSinceLastJudging !== null && j.monthsSinceLastJudging >= 12
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading judges...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Judge Management</h1>
          <p className="text-gray-600 mt-1">Manage C-WAGS certified judges</p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Judges</p>
                <p className="text-2xl font-bold">{judges.length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold">{judges.filter(j => j.is_active).length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-2xl font-bold">{judges.filter(j => !j.is_active).length}</p>
              </div>
              <UserX className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
               onClick={() => setInactivityFilter('11months')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">11+ Months</p>
                <p className="text-2xl font-bold">{elevenMonthsCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
               onClick={() => setInactivityFilter('1year')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">1+ Year</p>
                <p className="text-2xl font-bold">{oneYearCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col gap-4">
            {/* Search and Active Filter Row */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex-1 w-full md:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={() => setShowActiveOnly(!showActiveOnly)}
                  className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                    showActiveOnly
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  {showActiveOnly ? 'Active Only' : 'All Judges'}
                </button>
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Judge
                </button>
              </div>
            </div>

            {/* Inactivity Filter Row */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-gray-700">Filter by last judging:</span>
              <button
                onClick={() => setInactivityFilter('all')}
                className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                  inactivityFilter === 'all'
                    ? 'bg-gray-700 text-white border-gray-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                All Judges
              </button>
              <button
                onClick={() => setInactivityFilter('11months')}
                className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                  inactivityFilter === '11months'
                    ? 'bg-yellow-600 text-white border-yellow-600'
                    : 'bg-white text-yellow-700 border-yellow-300 hover:bg-yellow-50'
                }`}
              >
                11+ Months Inactive ({elevenMonthsCount})
              </button>
              <button
                onClick={() => setInactivityFilter('1year')}
                className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                  inactivityFilter === '1year'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-red-700 border-red-300 hover:bg-red-50'
                }`}
              >
                1+ Year Inactive ({oneYearCount})
              </button>
              {inactivityFilter !== 'all' && (
                <span className="ml-2 text-xs text-gray-500 italic">
                  Manually select judges to mark as inactive
                </span>
              )}
            </div>

            {/* Bulk Actions Row */}
            {selectedJudges.size > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-sm font-medium text-blue-900">
                  {selectedJudges.size} judge(s) selected - Please verify before marking inactive
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedJudges(new Set())}
                    className="px-3 py-1 text-sm text-blue-700 hover:text-blue-900"
                  >
                    Clear Selection
                  </button>
                  <button
                    onClick={handleBulkMarkInactive}
                    disabled={saving}
                    className="px-4 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                  >
                    {saving ? 'Updating...' : 'Mark as Inactive'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Judge Cards Grid */}
        {filteredJudges.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No judges found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJudges.map((judge) => (
  <div key={judge.id} className="space-y-4">  {/* ← Wrap in div with space-y-4 */}
    <JudgeCard 
      judge={judge}
      isSelected={selectedJudges.has(judge.id)}
      onSelect={handleSelectJudge}
      onEdit={handleEdit}
      onDelete={handleDelete}
      getLastDate={getLastDateForJudge}
      loadingDates={loadingDates}
    />
    
    {/* ✅ ADD THIS: Statistics card below each judge */}
    <JudgeStatistics judgeName={judge.name} />
  </div>
))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingJudge ? 'Edit Judge' : 'Add New Judge'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Province/State</label>
                  <input
                    type="text"
                    value={formData.province_state}
                    onChange={(e) => setFormData({ ...formData, province_state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Certifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Certifications</h3>
                
                {/* Scent */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Scent</label>
                  <div className="flex flex-wrap gap-2">
                    {SCENT_LEVELS.map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => toggleLevel('scent_levels', level)}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${
                          formData.scent_levels.includes(level)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Obedience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Obedience</label>
                  <div className="flex flex-wrap gap-2">
                    {OBEDIENCE_LEVELS.map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => toggleLevel('obedience_levels', level)}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${
                          formData.obedience_levels.includes(level)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rally */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rally</label>
                  <div className="flex flex-wrap gap-2">
                    {RALLY_LEVELS.map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => toggleLevel('rally_levels', level)}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${
                          formData.rally_levels.includes(level)
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Games */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Games</label>
                  <div className="flex flex-wrap gap-2">
                    {GAMES_LEVELS.map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => toggleLevel('games_levels', level)}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${
                          formData.games_levels.includes(level)
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active Judge</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : editingJudge ? 'Update Judge' : 'Add Judge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Separate component for judge card to handle async date loading
function JudgeCard({ 
  judge, 
  isSelected,
  onSelect,
  onEdit, 
  onDelete,
  getLastDate,
  loadingDates
}: { 
  judge: JudgeWithDate;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (judge: Judge) => void;
  onDelete: (judge: Judge) => void;
  getLastDate: (name: string) => Promise<string>;
  loadingDates: boolean;
}) {
  const [lastDate, setLastDate] = useState<string>('Loading...');

  useEffect(() => {
    if (!loadingDates) {
      getLastDate(judge.name).then(setLastDate);
    }
  }, [judge.name, loadingDates]);

  // Determine warning level
  const getWarningLevel = () => {
    if (judge.monthsSinceLastJudging === null) return 'none';
    if (judge.monthsSinceLastJudging >= 12) return 'severe'; // 1+ year
    if (judge.monthsSinceLastJudging >= 11) return 'warning'; // 11+ months
    return 'none';
  };

  const warningLevel = getWarningLevel();

  return (
    <div className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 ${
      isSelected ? 'ring-2 ring-blue-500' : ''
    } ${
      warningLevel === 'severe' ? 'border-2 border-red-300' : 
      warningLevel === 'warning' ? 'border-2 border-yellow-300' : ''
    }`}>
      {/* Selection Checkbox */}
      <div className="flex items-start gap-3 mb-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(judge.id)}
          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          title="Select to mark as inactive"
        />
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">{judge.name}</h3>
              {judge.city && judge.province_state && (
                <p className="text-sm text-gray-600">{judge.city}, {judge.province_state}</p>
              )}
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              judge.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {judge.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Last Judging Date with Warning */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-gray-600">Last judging date:</span>
              <span className={loadingDates ? 'text-gray-400' : 'text-gray-900'}>
                {lastDate}
              </span>
            </div>
            {warningLevel !== 'none' && judge.monthsSinceLastJudging !== null && (
              <div className={`mt-2 flex items-center gap-2 text-xs font-medium ${
                warningLevel === 'severe' ? 'text-red-700' : 'text-yellow-700'
              }`}>
                <AlertTriangle className="h-3 w-3" />
                <span>{judge.monthsSinceLastJudging} months since last judging</span>
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="space-y-1 mb-4">
            <p className="text-sm text-gray-600">{judge.email}</p>
            {judge.phone && <p className="text-sm text-gray-600">{judge.phone}</p>}
          </div>

          {/* Certifications */}
          <div className="space-y-3 mb-4">
            {/* Scent */}
            {judge.scent_levels && judge.scent_levels.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Scent</p>
                <div className="flex flex-wrap gap-1">
                  {sortCertificationLevels(judge.scent_levels, SCENT_LEVELS).map((level: string) => (
                    <span key={level} className="px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800">
                      {level}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Obedience */}
            {judge.obedience_levels && judge.obedience_levels.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Obedience</p>
                <div className="flex flex-wrap gap-1">
                  {sortCertificationLevels(judge.obedience_levels, OBEDIENCE_LEVELS).map((level: string) => (
                    <span key={level} className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800">
                      {level.replace('Obedience ', '')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Rally */}
            {judge.rally_levels && judge.rally_levels.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Rally</p>
                <div className="flex flex-wrap gap-1">
                  {sortCertificationLevels(judge.rally_levels, RALLY_LEVELS).map((level: string) => (
                    <span key={level} className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800">
                      {level}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Games */}
            {judge.games_levels && judge.games_levels.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Games</p>
                <div className="flex flex-wrap gap-1">
                  {sortCertificationLevels(judge.games_levels, GAMES_LEVELS).map((level: string) => (
                    <span key={level} className="px-2 py-0.5 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
                      {level}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <button
              onClick={() => onEdit(judge)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={() => onDelete(judge)}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}