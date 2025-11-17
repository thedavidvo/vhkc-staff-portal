'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSeasons = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/seasons');
      if (!response.ok) {
        throw new Error('Failed to fetch seasons');
      }
      const data = await response.json();
      setSeasons(data);
      if (data.length > 0 && !selectedSeason) {
        setSelectedSeason(data[0]);
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
      const response = await fetch('/api/seasons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(season),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to update season:', response.status, errorData);
        throw new Error('Failed to update season');
      }
      // Refresh seasons to get updated data from database
      await refreshSeasons();
      // Update selected season with fresh data from the refreshed seasons
      const refreshedSeasons = await fetch('/api/seasons').then(r => r.json());
      const updatedSeason = refreshedSeasons.find((s: Season) => s.id === season.id);
      if (updatedSeason && selectedSeason?.id === season.id) {
        setSelectedSeason(updatedSeason);
      }
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
        setSelectedSeason(remainingSeasons[0] || null);
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
