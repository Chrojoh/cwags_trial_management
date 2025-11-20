// src/app/dashboard/judges/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; 
import { Plus, Search, Edit, Trash2, X, Filter, UserCheck, UserX, ArrowLeft } from 'lucide-react';
import { 
  getAllJudges, 
  createJudge, 
  updateJudge, 
  deleteJudge 
} from '@/lib/judges';
import type { Judge, JudgeFormData } from '../../../types/judge';
import { 
  OBEDIENCE_LEVELS, 
  RALLY_LEVELS, 
  SCENT_LEVELS, 
  GAMES_LEVELS,
  emptyJudgeForm,
  sortCertificationLevels 
} from '../../../types/judge';

export default function JudgesPage() {
  const router = useRouter(); // ⭐ ADD THIS LINE
  const [judges, setJudges] = useState<Judge[]>([]);
  const [filteredJudges, setFilteredJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingJudge, setEditingJudge] = useState<Judge | null>(null);
  const [formData, setFormData] = useState<JudgeFormData>(emptyJudgeForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadJudges();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [judges, searchTerm, showActiveOnly]);

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

  const applyFilters = () => {
    let filtered = [...judges];

    if (showActiveOnly) {
      filtered = filtered.filter(j => j.is_active);
    }

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
  <h1 className="text-2xl font-bold text-gray-900">Judge Management</h1>
  <div className="w-32"></div> {/* Spacer for centering */}
</div>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
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
        </div>

        {/* Judge Cards Grid */}
        {filteredJudges.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No judges found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJudges.map((judge) => (
              <div key={judge.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
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

                {/* Contact Info */}
                <div className="mb-4 space-y-1">
                  <p className="text-sm text-gray-900">{judge.email}</p>
                  {judge.phone && <p className="text-sm text-gray-600">{judge.phone}</p>}
                </div>

                {/* Certification Badges */}
                <div className="space-y-3 mb-4">
                  {/* Scent - FIRST */}
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

                  {/* Obedience - SECOND */}
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

                  {/* Rally - THIRD */}
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

                  {/* Games - FOURTH */}
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
                    onClick={() => handleEdit(judge)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(judge)}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
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
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Province/State
                    </label>
                    <input
                      type="text"
                      value={formData.province_state}
                      onChange={(e) => setFormData({ ...formData, province_state: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Certification Levels */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Certification Levels</h3>
                
                {/* Scent - FIRST */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Scent</h4>
                  <div className="flex flex-wrap gap-2">
                    {SCENT_LEVELS.map((level: string) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => toggleLevel('scent_levels', level)}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
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

                {/* Obedience - SECOND */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Obedience</h4>
                  <div className="flex flex-wrap gap-2">
                    {OBEDIENCE_LEVELS.map((level: string) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => toggleLevel('obedience_levels', level)}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
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

                {/* Rally - THIRD */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Rally</h4>
                  <div className="flex flex-wrap gap-2">
                    {RALLY_LEVELS.map((level: string) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => toggleLevel('rally_levels', level)}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
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

                {/* Games - FOURTH */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Games</h4>
                  <div className="flex flex-wrap gap-2">
                    {GAMES_LEVELS.map((level: string) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => toggleLevel('games_levels', level)}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
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