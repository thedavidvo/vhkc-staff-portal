'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Season } from '@/types';

interface SeasonContextType {
  seasons: Season[];
  selectedSeason: Season | null;
  setSelectedSeason: (season: Season | null) => void;
  addSeason: (season: Season) => Promise<void>;
  updateSeason: (season: Season) => Promise<void>;
  deleteSeason: (seasonId: string) => Promise<void>;
  refreshSeasons: () => Promise<void>;
  loading: boolean;
}

const SeasonContext = createContext<SeasonContextType | undefined>(undefined);
const SELECTED_SEASON_STORAGE_KEY = 'selectedSeasonId';

const getLatestSeason = (seasonList: Season[]) => {
  return [...seasonList].sort((a, b) => {
    if (a.startDate && b.startDate) return b.startDate.localeCompare(a.startDate);
    const numA = parseInt(a.name.match(/(\d+)/)?.[1] || '0', 10);
    const numB = parseInt(b.name.match(/(\d+)/)?.[1] || '0', 10);
    return numB - numA;
  })[0] || null;
};

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeasonState] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  const setSelectedSeason = (season: Season | null) => {
    setSelectedSeasonState(season);
    if (typeof window === 'undefined') return;

    if (season?.id) {
      localStorage.setItem(SELECTED_SEASON_STORAGE_KEY, season.id);
    } else {
      localStorage.removeItem(SELECTED_SEASON_STORAGE_KEY);
    }
  };

  const refreshSeasons = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/seasons');
      if (!response.ok) {
        throw new Error('Failed to fetch seasons');
      }
      const data = await response.json();
      setSeasons(data);

      // Keep currently selected season if possible, otherwise restore from persisted preference.
      const persistedSeasonId = typeof window !== 'undefined'
        ? localStorage.getItem(SELECTED_SEASON_STORAGE_KEY)
        : null;
      const targetSeasonId = selectedSeason?.id || persistedSeasonId;

      if (targetSeasonId) {
        const updatedSelectedSeason = data.find((s: Season) => s.id === targetSeasonId);
        if (updatedSelectedSeason) {
          setSelectedSeason(updatedSelectedSeason);
          return;
        }

        if (persistedSeasonId && typeof window !== 'undefined') {
          localStorage.removeItem(SELECTED_SEASON_STORAGE_KEY);
        }
      }

      // Only auto-select latest on dashboard startup when nothing is selected/persisted.
      if (!selectedSeason && !persistedSeasonId && data.length > 0 && pathname === '/dashboard') {
        const latest = getLatestSeason(data);
        setSelectedSeason(latest);
      }
    } catch (error) {
      console.error('Failed to fetch seasons:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSeasons();
  }, []);

  const addSeason = async (season: Season) => {
    try {
      const response = await fetch('/api/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(season),
      });
      if (!response.ok) {
        throw new Error('Failed to add season');
      }
      await refreshSeasons();
      setSelectedSeason(season);
    } catch (error) {
      console.error('Failed to add season:', error);
      throw error;
    }
  };

  const updateSeason = async (season: Season) => {
    try {
      console.log('SeasonContext updateSeason called for season:', season.id);
      const response = await fetch('/api/seasons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(season),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to update season:', response.status, errorData);
        const errorMessage = errorData.error || 'Failed to update season';
        throw new Error(errorMessage);
      }
      
      // Refresh seasons to get updated data from database
      // refreshSeasons will automatically update selectedSeason if it matches
      await refreshSeasons();
    } catch (error) {
      console.error('Failed to update season:', error);
      throw error;
    }
  };

  const deleteSeason = async (seasonId: string) => {
    try {
      const response = await fetch(`/api/seasons?seasonId=${seasonId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete season');
      }
      await refreshSeasons();
      if (selectedSeason?.id === seasonId) {
        const remainingSeasons = seasons.filter(s => s.id !== seasonId);
        const fallback = getLatestSeason(remainingSeasons);
        setSelectedSeason(fallback);
      }
    } catch (error) {
      console.error('Failed to delete season:', error);
      throw error;
    }
  };

  return (
    <SeasonContext.Provider
      value={{
        seasons,
        selectedSeason,
        setSelectedSeason,
        addSeason,
        updateSeason,
        deleteSeason,
        refreshSeasons,
        loading,
      }}
    >
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason() {
  const context = useContext(SeasonContext);
  if (context === undefined) {
    throw new Error('useSeason must be used within a SeasonProvider');
  }
  return context;
}
