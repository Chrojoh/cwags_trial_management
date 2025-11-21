// src/app/dashboard/admin/registry/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Search, Users, Award, Calendar, Edit2, Save, X, Dog, User, ArrowLeft, RefreshCw, Plus} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  searchByRegistryNumber,
  searchByHandlerName,
  getDogProfile,
  updateRegistry,
  preloadTrialData,
  clearCache,
  parseRegistrationNumber,
  type RegistryDog,
  type TitleProgress
} from '@/lib/registryOperations';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

const supabase = getSupabaseBrowser();

export default function AdminRegistryPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'registry' | 'handler'>('registry');
  const [searchResults, setSearchResults] = useState<RegistryDog[]>([]);
  const [selectedDog, setSelectedDog] = useState<RegistryDog | null>(null);
  const [ownersDogs, setOwnersDogs] = useState<RegistryDog[]>([]);
  const [titleProgress, setTitleProgress] = useState<TitleProgress[]>([]);
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<RegistryDog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Add Dog Modal
  const [showAddDog, setShowAddDog] = useState(false);
  const [newDogForm, setNewDogForm] = useState({
    cwags_number: '',
    dog_call_name: '',
    handler_name: '',
    handler_email: '',
    handler_phone: '',
    emergency_contact: '',
    breed: '',
    dog_sex: '',
    is_junior_handler: false,
    is_active: true
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔄 Preloading trial data...');
        await preloadTrialData();
        console.log('✅ Trial data loaded');
        setInitialLoad(false);
      } catch (error) {
        console.error('❌ Error preloading trial data:', error);
        setInitialLoad(false);
      }
    };
    loadData();
  }, []);

  const getRegistrationParts = (regNumber: string) => {
    const parsed = parseRegistrationNumber(regNumber);
    if (!parsed) return null;
    return {
      year: `20${parsed.year}`,
      ownerId: parsed.ownerId,
      dogNumber: parsed.dogNumber
    };
  };

  const toggleLevelDetails = (index: number) => {
    const newExpanded = new Set(expandedLevels);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLevels(newExpanded);
  };

  const handleAddDog = async () => {
    if (!newDogForm.cwags_number || !newDogForm.dog_call_name || !newDogForm.handler_name) {
      alert('Please fill in required fields: Registration Number, Call Name, and Handler Name');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('cwags_registry')
        .insert([newDogForm])
        .select()
        .single();

      if (error) throw error;

      alert('✅ Dog added successfully!');
      setShowAddDog(false);
      setNewDogForm({
        cwags_number: '',
        dog_call_name: '',
        handler_name: '',
        handler_email: '',
        handler_phone: '',
        emergency_contact: '',
        breed: '',
        dog_sex: '',
        is_junior_handler: false,
        is_active: true
      });
    } catch (error) {
      console.error('Error adding dog:', error);
      alert('Failed to add dog. Check console for details.');
    } finally {
      setSaving(false);
    }
  };
const cleanCwagsNumber = (input: string): string => {
  const digits = input.replace(/\D/g, "");
  if (!digits) return input;

  // Part 1: first 2 digits
  const part1 = digits.slice(0, 2).padEnd(2, "0");
  
  // Part 2: next 4 digits
  const part2 = digits.slice(2, 6).padEnd(4, "0");
  
  // Part 3: everything after digit 6, padded left to 2 digits
  let part3 = digits.slice(6);
  part3 = part3.padStart(2, "0").slice(-2);

  return `${part1}-${part2}-${part3}`;
};
const handleSearch = async () => {
  if (!searchTerm.trim()) {
    alert('Please enter a search term');
    return;
  }

  setLoading(true);
  setError(null);
  setSelectedDog(null);

  try {
    let results: RegistryDog[] = [];

    if (searchType === 'registry') {
      const formattedNumber = cleanCwagsNumber(searchTerm);
      setSearchTerm(formattedNumber);
      
      console.log('🔍 Searching by registry number:', formattedNumber);
      const dog = await searchByRegistryNumber(formattedNumber);
      
      // ✅ ADD THESE THREE LINES:
      console.log('🔍 Dog found?', dog);
      console.log('🔍 Dog details:', JSON.stringify(dog, null, 2));
      
      if (dog) {
        results = [dog];
      }
    } else {
      console.log('🔍 Searching by handler name:', searchTerm);
      results = await searchByHandlerName(searchTerm);
    }

    // ✅ ADD THIS LINE:
    console.log('🔍 Search results:', results);
    
  setSearchResults(results);

// Auto-load profile if found
if (results.length === 1) {
  // Only one result - load it automatically
  await loadDogDetails(results[0].cwags_number);
} else if (results.length === 0) {
  setError('No dogs found matching your search');
}
  } catch (err) {
    console.error('Search error:', err);
    setError('Failed to search registry');
  } finally {
    setLoading(false);
  }
};

  const loadDogDetails = async (regNumber: string) => {
    setLoading(true);
    setSearchResults([]);
    setExpandedLevels(new Set()); // Reset expanded levels
    
    try {
      console.log('🔍 Loading dog profile for:', regNumber);
      const profile = await getDogProfile(regNumber);
      
      if (profile) {
        console.log('✅ Profile loaded:', {
          dog: profile.dog.dog_call_name,
          ownersDogs: profile.ownersDogs?.length || 0,
          titleProgress: profile.titleProgress?.length || 0,
          allRecords: profile.allTrialRecords?.length || 0
        });
        
        setSelectedDog(profile.dog);
        setEditForm(profile.dog);
        setOwnersDogs(profile.ownersDogs || []);
        setTitleProgress(profile.titleProgress || []);
        setAllRecords(profile.allTrialRecords || []);
      } else {
        alert('Could not load dog profile');
      }
    } catch (error) {
      console.error('❌ Error loading dog details:', error);
      alert('Error loading dog details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editForm || !selectedDog) return;
    
    setSaving(true);
    try {
      const success = await updateRegistry(editForm.id, {
        handler_name: editForm.handler_name,
        dog_call_name: editForm.dog_call_name,
        handler_email: editForm.handler_email,
        handler_phone: editForm.handler_phone,
        emergency_contact: editForm.emergency_contact,
        breed: editForm.breed,
        dog_sex: editForm.dog_sex,
        is_junior_handler: editForm.is_junior_handler,
        is_active: editForm.is_active
      });
      
      if (success) {
        setSelectedDog(editForm);
        setIsEditing(false);
        alert('Successfully updated registry information');
      } else {
        alert('Failed to update registry information');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    if (confirm('Refresh trial data? This will reload the latest data from Excel.')) {
      clearCache();
      await preloadTrialData();
      alert('Trial data refreshed successfully!');
    }
  };

  if (initialLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-xl font-semibold text-slate-900">Loading Trial Data...</p>
          <p className="text-sm text-slate-600 mt-2">Fetching Data for Tracker web.xlsx</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Registry Management</h1>
                <p className="text-slate-600 mt-1">Search and manage dog registrations with full title tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddDog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Dog
              </button>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh trial data from Excel"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm">Refresh</span>
              </button>
              <div className="flex items-center gap-2 text-sm text-slate-500 bg-red-50 px-3 py-2 rounded-lg">
                <Users className="h-4 w-4" />
                <span className="font-semibold">Administrator</span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex gap-4">
            <div className="flex-1 flex gap-2">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as 'registry' | 'handler')}
                className="px-4 py-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="registry">Registry Number</option>
                <option value="handler">Handler Name</option>
              </select>
              
              <input
  type="text"
  placeholder={searchType === 'registry' ? 'Enter C-WAGS number (e.g., 17-1734-03)' : 'Enter handler name'}
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value.toUpperCase())} // ✅ ADDED .toUpperCase()
  onKeyPress={(e) => {  // ✅ ADDED THIS BLOCK
    if (e.key === 'Enter') {
      handleSearch();
    }
  }}
  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
/>
              
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 flex items-center gap-2 font-medium transition-colors"
              >
                <Search className="h-5 w-5" />
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>

        {/* Add Dog Modal */}
        {showAddDog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Add New Dog</h2>
                <button
                  onClick={() => setShowAddDog(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Registration Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newDogForm.cwags_number}
                      onChange={(e) => setNewDogForm({...newDogForm, cwags_number: e.target.value})}
                      placeholder="e.g., 24-1234-01"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Call Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newDogForm.dog_call_name}
                      onChange={(e) => setNewDogForm({...newDogForm, dog_call_name: e.target.value})}
                      placeholder="e.g., Max"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Handler Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newDogForm.handler_name}
                    onChange={(e) => setNewDogForm({...newDogForm, handler_name: e.target.value})}
                    placeholder="e.g., John Smith"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={newDogForm.handler_email}
                      onChange={(e) => setNewDogForm({...newDogForm, handler_email: e.target.value})}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={newDogForm.handler_phone}
                      onChange={(e) => setNewDogForm({...newDogForm, handler_phone: e.target.value})}
                      placeholder="(555) 123-4567"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Breed</label>
                    <input
                      type="text"
                      value={newDogForm.breed}
                      onChange={(e) => setNewDogForm({...newDogForm, breed: e.target.value})}
                      placeholder="e.g., Border Collie"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Sex</label>
                    <select
                      value={newDogForm.dog_sex}
                      onChange={(e) => setNewDogForm({...newDogForm, dog_sex: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Emergency Contact</label>
                  <input
                    type="text"
                    value={newDogForm.emergency_contact}
                    onChange={(e) => setNewDogForm({...newDogForm, emergency_contact: e.target.value})}
                    placeholder="Name and phone"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-6 pt-4 border-t border-slate-200">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newDogForm.is_junior_handler}
                      onChange={(e) => setNewDogForm({...newDogForm, is_junior_handler: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">Junior Handler</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newDogForm.is_active}
                      onChange={(e) => setNewDogForm({...newDogForm, is_active: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">Active Status</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                <button
                  onClick={handleAddDog}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 font-medium"
                >
                  {saving ? 'Adding...' : 'Add Dog'}
                </button>
                <button
                  onClick={() => setShowAddDog(false)}
                  className="px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Multiple Search Results */}
        {searchResults.length > 1 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Found {searchResults.length} dogs - Select one:
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((dog) => (
                <div
                  key={dog.id}
                  onClick={() => loadDogDetails(dog.cwags_number)}
                  className="p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
                >
                  <p className="font-bold text-slate-900">{dog.dog_call_name}</p>
                  <p className="text-sm text-slate-600 font-mono mt-1">{dog.cwags_number}</p>
                  <p className="text-sm text-slate-500 mt-1">{dog.handler_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dog Details Card */}
        {selectedDog && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info Card */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Dog className="h-6 w-6 text-blue-600" />
                  {selectedDog.dog_call_name}
                </h2>
                
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center gap-2 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit Information
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm(selectedDog);
                      }}
                      disabled={saving}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Registration Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Registration Number</p>
                  <p className="text-lg font-mono font-semibold text-slate-900">{selectedDog.cwags_number}</p>
                  {(() => {
                    const parts = getRegistrationParts(selectedDog.cwags_number);
                    if (parts) {
                      return (
                        <p className="text-xs text-slate-500 mt-1">
                          Year: {parts.year} • Owner ID: {parts.ownerId}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Registered Since</p>
                  <p className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {new Date(selectedDog.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Total Trials: {allRecords.length}
                  </p>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Handler Name</label>
                    {isEditing && editForm ? (
                      <input
                        type="text"
                        value={editForm.handler_name}
                        onChange={(e) => setEditForm({...editForm, handler_name: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-slate-900 flex items-center gap-2 py-2">
                        <User className="h-4 w-4 text-slate-400" />
                        {selectedDog.handler_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Call Name</label>
                    {isEditing && editForm ? (
                      <input
                        type="text"
                        value={editForm.dog_call_name}
                        onChange={(e) => setEditForm({...editForm, dog_call_name: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-slate-900 py-2">{selectedDog.dog_call_name}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                    {isEditing && editForm ? (
                      <input
                        type="email"
                        value={editForm.handler_email || ''}
                        onChange={(e) => setEditForm({...editForm, handler_email: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-slate-900 py-2">{selectedDog.handler_email || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                    {isEditing && editForm ? (
                      <input
                        type="tel"
                        value={editForm.handler_phone || ''}
                        onChange={(e) => setEditForm({...editForm, handler_phone: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-slate-900 py-2">{selectedDog.handler_phone || 'Not provided'}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Breed</label>
                    {isEditing && editForm ? (
                      <input
                        type="text"
                        value={editForm.breed || ''}
                        onChange={(e) => setEditForm({...editForm, breed: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-slate-900 py-2">{selectedDog.breed || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Sex</label>
                    {isEditing && editForm ? (
                      <select
                        value={editForm.dog_sex || ''}
                        onChange={(e) => setEditForm({...editForm, dog_sex: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    ) : (
                      <p className="text-slate-900 py-2">{selectedDog.dog_sex || 'Not provided'}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Emergency Contact</label>
                  {isEditing && editForm ? (
                    <input
                      type="text"
                      value={editForm.emergency_contact || ''}
                      onChange={(e) => setEditForm({...editForm, emergency_contact: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-slate-900 py-2">{selectedDog.emergency_contact || 'Not provided'}</p>
                  )}
                </div>

                <div className="flex gap-6 pt-4 border-t border-slate-200">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isEditing && editForm ? editForm.is_junior_handler : selectedDog.is_junior_handler}
                      onChange={(e) => isEditing && editForm && setEditForm({...editForm, is_junior_handler: e.target.checked})}
                      disabled={!isEditing}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className="text-sm text-slate-700">Junior Handler</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isEditing && editForm ? editForm.is_active : selectedDog.is_active}
                      onChange={(e) => isEditing && editForm && setEditForm({...editForm, is_active: e.target.checked})}
                      disabled={!isEditing}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className="text-sm text-slate-700">Active Status</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Sidebar - Owner's Other Dogs */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Owner's Other Dogs
                  {selectedDog && (() => {
                    const parts = getRegistrationParts(selectedDog.cwags_number);
                    if (parts) {
                      return (
                        <span className="text-sm font-normal text-slate-500">
                          (ID: {parts.ownerId})
                        </span>
                      );
                    }
                    return null;
                  })()}
                </h3>
                
                {ownersDogs.length > 0 ? (
                  <div className="space-y-3">
                    {ownersDogs.map((dog) => (
                      <div
                        key={dog.id}
                        onClick={() => loadDogDetails(dog.cwags_number)}
                        className="p-3 bg-slate-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors border border-slate-200 hover:border-blue-300"
                      >
                        <p className="font-semibold text-slate-900">{dog.dog_call_name}</p>
                        <p className="text-sm text-slate-600 font-mono">{dog.cwags_number}</p>
                        {(() => {
                          const parts = getRegistrationParts(dog.cwags_number);
                          if (parts) {
                            return (
                              <p className="text-xs text-slate-500 mt-1">
                                {parts.year}
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm italic">No other dogs for this owner</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Title Progress Section */}
        {selectedDog && titleProgress.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Award className="h-6 w-6 text-yellow-600" />
              Title Progress & Q's Summary
            </h3>

            <div className="space-y-4">
              {titleProgress.map((level, index) => (
                <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="p-4 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">{level.level}</h4>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-slate-600">
                            Total Q's: <span className="font-semibold text-slate-900">{level.totalQs}</span>
                          </span>
                          <span className="text-slate-600">
                            Judges: <span className="font-semibold text-slate-900">{level.uniqueJudges}/2</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {level.hasTitle ? (
                            <div>
                              <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 font-semibold text-sm">
                                ✓ Title Earned
                              </div>
                              {level.titleDate && (
                                <p className="text-xs text-slate-600 mt-1">{level.titleDate}</p>
                              )}
                              {level.aceQs !== undefined && level.aceQs > 0 && (
                                <div className="mt-2">
                                  {level.aceQs >= 10 ? (
                                    <>
                                      <p className="text-sm text-purple-700 font-semibold">
                                        Ace x{Math.floor(level.aceQs / 10)}
                                      </p>
                                      <p className="text-xs text-slate-600">
                                        {level.qsToNextMilestone} Q's to next Ace
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-sm text-purple-700 font-semibold">
                                        Working toward Ace: {level.aceQs}/10
                                      </p>
                                      <p className="text-xs text-slate-600">
                                        {level.qsToNextMilestone} Q's needed
                                      </p>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 font-semibold text-sm">
                                In Progress
                              </div>
                              <div className="text-sm text-slate-600 mt-2 space-y-1">
                                {level.qsToTitle !== undefined && level.qsToTitle > 0 && (
                                  <p>Need {level.qsToTitle} more Q's</p>
                                )}
                                {level.judgesNeeded !== undefined && level.judgesNeeded > 0 && (
                                  <p>Need {level.judgesNeeded} more judge{level.judgesNeeded > 1 ? 's' : ''}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                       <button
  onClick={() => toggleLevelDetails(index)}
  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
>
  {expandedLevels.has(index) ? 'Hide Details' : 'Details'}
</button>
                      </div>
                    </div>
                  </div>

                  {/* Trial Details - Expandable */}
                  {expandedLevels.has(index) && level.records.length > 0 && (
                    <div className="p-4 border-t border-slate-200 bg-white">
                      <p className="text-sm font-semibold text-slate-700 mb-3">
                        All Trials ({level.records.length}):
                      </p>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {level.records.map((record, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-slate-100 last:border-0">
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-slate-600 w-24">{record.date}</span>
                              <span className="text-slate-900 flex-1">{record.trial}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-600">Judge: {record.judge}</span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold">
                                {record.qs} Q{record.qs > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Selection State */}
        {!selectedDog && !loading && searchResults.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Search className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Dog Selected</h3>
            <p className="text-slate-600 mb-6">Search for a dog by registration number or handler name to view and edit their information, track titles, and see Q progress.</p>
            <div className="inline-flex gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Dog className="h-4 w-4" />
                <span>Full dog profile</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Owner's other dogs</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                <span>Title progress</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}