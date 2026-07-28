'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Judge } from '@/types/judge';
import type { JudgeAssignmentStatus } from '@/lib/judgeSelector';
import {
  getMatchingCertification,
  nextComboboxIndex,
  searchJudges,
} from '@/lib/judgeSelector';

interface HistoricalAssignment {
  name: string;
  email?: string;
  status: Exclude<JudgeAssignmentStatus, 'valid'>;
}

interface JudgeAutocompleteProps {
  judges: Judge[];
  className: string;
  selectedJudge?: Judge;
  historicalAssignment?: HistoricalAssignment;
  isTba?: boolean;
  allowTba?: boolean;
  onSelect: (judge: Judge) => void;
  onSelectTba?: () => void;
  onClear: () => void;
  placeholder?: string;
  error?: boolean;
}

const historicalLabel: Record<HistoricalAssignment['status'], string> = {
  inactive: 'Inactive judge',
  not_certified: 'No longer certified for this class',
  missing: 'Judge record no longer available',
};

export default function JudgeAutocomplete({
  judges,
  className,
  selectedJudge,
  historicalAssignment,
  isTba = false,
  allowTba = false,
  onSelect,
  onSelectTba,
  onClear,
  placeholder = 'Type to search judges...',
  error = false,
}: JudgeAutocompleteProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const filteredJudges = searchJudges(judges, searchTerm, className);

  useEffect(() => setActiveIndex(filteredJudges.length ? 0 : -1), [searchTerm, judges]);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, []);

  const selectJudge = (judge: Judge) => {
    onSelect(judge);
    setSearchTerm('');
    setIsOpen(false);
  };

  const clearSelection = () => {
    onClear();
    setSearchTerm('');
    setIsOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const selectedName = isTba
    ? 'TBA - To Be Announced'
    : selectedJudge?.name || historicalAssignment?.name;

  return (
    <div ref={containerRef} className="relative mt-1">
      {selectedName ? (
        <div className={`flex items-center gap-2 rounded-lg border-2 bg-white px-3 py-2 ${error ? 'border-red-500 bg-red-50' : 'border-gray-400'}`}>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900">{selectedName}</div>
            {selectedJudge && (
              <div className="text-sm text-gray-600">
                {[selectedJudge.city, selectedJudge.province_state].filter(Boolean).join(', ')}
                {' · '}{getMatchingCertification(selectedJudge, className)}
              </div>
            )}
            {historicalAssignment && (
              <div className="text-sm font-semibold text-amber-700">
                {historicalLabel[historicalAssignment.status]}
              </div>
            )}
          </div>
          <button type="button" onClick={clearSelection} aria-label="Change judge" className="rounded p-1 hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
            value={searchTerm}
            onChange={(event) => { setSearchTerm(event.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setIsOpen(true);
                const direction = event.key as 'ArrowDown' | 'ArrowUp';
                setActiveIndex((current) => nextComboboxIndex(direction, current, filteredJudges.length));
              } else if (event.key === 'Enter' && isOpen && activeIndex >= 0) {
                event.preventDefault();
                selectJudge(filteredJudges[activeIndex]);
              } else if (event.key === 'Escape') {
                setIsOpen(false);
              }
            }}
            placeholder={placeholder}
            className={`w-full rounded-lg border-2 py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500 bg-red-50' : 'border-gray-400 hover:border-orange-500 focus:border-orange-600'}`}
          />
        </div>
      )}

      {isOpen && !selectedName && (
        <div id={listboxId} role="listbox" className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border-2 border-gray-300 bg-white shadow-xl">
          {allowTba && !searchTerm && (
            <button type="button" role="option" aria-selected="false" onClick={() => { onSelectTba?.(); setIsOpen(false); }} className="w-full border-b px-4 py-3 text-left font-semibold italic text-gray-500 hover:bg-orange-100">
              TBA - To Be Announced
            </button>
          )}
          {filteredJudges.map((judge, index) => (
            <button
              id={`${listboxId}-${index}`}
              key={judge.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectJudge(judge)}
              className={`w-full border-b px-4 py-3 text-left last:border-b-0 ${index === activeIndex ? 'bg-orange-100' : 'hover:bg-orange-50'}`}
            >
              <div className="font-semibold text-gray-900">{judge.name}</div>
              <div className="text-sm text-gray-600">
                {[judge.city, judge.province_state].filter(Boolean).join(', ')} · {getMatchingCertification(judge, className)}
              </div>
            </button>
          ))}
          {!filteredJudges.length && (
            <div className="px-4 py-3 text-center text-sm text-gray-500">
              {judges.length ? 'No judges match your search' : 'No active judges are certified for this class'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
