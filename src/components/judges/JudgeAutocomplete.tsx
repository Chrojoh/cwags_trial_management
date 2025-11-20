// src/components/judges/JudgeAutocomplete.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import type { Judge } from '../../types/judge';
import { Search, X } from 'lucide-react';

interface JudgeAutocompleteProps {
  judges: Judge[];
  selectedJudge?: { name: string; email: string };
  onSelect: (judge: Judge) => void;
  placeholder?: string;
  error?: boolean;
}

export default function JudgeAutocomplete({
  judges,
  selectedJudge,
  onSelect,
  placeholder = "Type to search judges...",
  error = false
}: JudgeAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredJudges, setFilteredJudges] = useState<Judge[]>(judges);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Filter judges based on search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const filtered = judges.filter(judge =>
        judge.name.toLowerCase().includes(term) ||
        judge.city?.toLowerCase().includes(term) ||
        judge.province_state?.toLowerCase().includes(term)
      );
      setFilteredJudges(filtered);
    } else {
      setFilteredJudges(judges);
    }
  }, [searchTerm, judges]);

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (judge: Judge) => {
    onSelect(judge);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect({ id: '', name: '', email: '', is_active: true, obedience_levels: [], rally_levels: [], games_levels: [], scent_levels: [] } as Judge);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected Judge Display or Search Input */}
      {selectedJudge?.name ? (
        <div className={`flex items-center justify-between px-3 py-2 border-2 rounded-lg bg-white ${
          error ? 'border-red-500 bg-red-50' : 'border-gray-400'
        }`}>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">{selectedJudge.name}</div>
            <div className="text-sm text-gray-600">{selectedJudge.email}</div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="ml-2 p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={`w-full pl-10 pr-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500 bg-red-50' : 'border-gray-400 hover:border-orange-500 focus:border-orange-600'
            }`}
          />
        </div>
      )}

      {/* Dropdown List */}
      {isOpen && !selectedJudge?.name && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filteredJudges.length > 0 ? (
            filteredJudges.map((judge) => (
              <button
                key={judge.id}
                type="button"
                onClick={() => handleSelect(judge)}
                className="w-full text-left px-4 py-3 hover:bg-orange-100 focus:bg-orange-100 border-b border-gray-100 last:border-b-0"
              >
                <div className="font-semibold text-gray-900">{judge.name}</div>
                <div className="text-sm text-gray-600">
                  {judge.city && judge.province_state ? `${judge.city}, ${judge.province_state}` : judge.email}
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              {judges.length === 0 ? 'No qualified judges found for this class' : 'No judges match your search'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}