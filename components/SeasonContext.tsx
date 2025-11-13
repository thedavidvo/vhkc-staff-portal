'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Season } from '@/types';
import { mockSeasons } from '@/data/mockData';

interface SeasonContextType {
  seasons: Season[];
  selectedSeason: Season | null;
  setSelectedSeason: (season: Season | null) => void;
  addSeason: (season: Season) => void;
  updateSeason: (season: Season) => void;
  deleteSeason: (seasonId: string) => void;
}

const SeasonContext = createContext<SeasonContextType | undefined>(undefined);

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [seasons, setSeasons] = useState<Season[]>(mockSeasons);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(mockSeasons[0] || null);

  const addSeason = (season: Season) => {
    setSeasons([...seasons, season]);
    setSelectedSeason(season);
  };

  const updateSeason = (updatedSeason: Season) => {
    setSeasons(seasons.map((s) => (s.id === updatedSeason.id ? updatedSeason : s)));
    if (selectedSeason?.id === updatedSeason.id) {
      setSelectedSeason(updatedSeason);
    }
  };

  const deleteSeason = (seasonId: string) => {
    setSeasons(seasons.filter((s) => s.id !== seasonId));
    if (selectedSeason?.id === seasonId) {
      const remainingSeasons = seasons.filter((s) => s.id !== seasonId);
      setSelectedSeason(remainingSeasons[0] || null);
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

