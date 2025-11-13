'use client';

import { useState, useRef, useEffect } from 'react';
import { useSeason } from './SeasonContext';
import { ChevronDown, Calendar } from 'lucide-react';

export default function SeasonSelector() {
  const { seasons, selectedSeason, setSelectedSeason } = useSeason();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800 dark:bg-slate-700 border border-slate-700 dark:border-slate-600 rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors shadow-sm text-left"
      >
        <Calendar className="w-4 h-4 text-slate-300 dark:text-slate-300 flex-shrink-0" />
        <span className="font-medium text-slate-200 dark:text-white text-sm truncate flex-1">
          {selectedSeason ? selectedSeason.name : 'Select Season'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-300 dark:text-slate-300 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-slate-800 dark:bg-slate-900 rounded-lg shadow-xl border border-slate-700 dark:border-slate-600 z-50 max-h-96 overflow-y-auto">
          <div className="py-2">
            {seasons.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                No seasons available
              </div>
            ) : (
              seasons.map((season) => (
                <button
                  key={season.id}
                  onClick={() => {
                    setSelectedSeason(season);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm ${
                    selectedSeason?.id === season.id
                      ? 'bg-primary-500 text-white'
                      : 'text-slate-200 dark:text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="font-medium">{season.name}</div>
                  <div className={`text-xs mt-0.5 ${
                    selectedSeason?.id === season.id
                      ? 'text-white opacity-90'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {new Date(season.startDate).getFullYear()} • {season.rounds.length} rounds
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

