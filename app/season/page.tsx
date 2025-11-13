'use client';

import Header from '@/components/Header';
import AddSeasonModal from '@/components/AddSeasonModal';
import EditSeasonModal from '@/components/EditSeasonModal';
import { useState, useMemo } from 'react';
import { Season } from '@/types';
import { mockSeasons, mockLocations } from '@/data/mockData';
import { Plus, Edit2, Trash2, Calendar } from 'lucide-react';

export default function SeasonPage() {
  const [seasons, setSeasons] = useState<Season[]>(mockSeasons);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);

  const handleAddSeason = (seasonData: {
    name: string;
    startDate: string;
    endDate: string;
    numberOfRounds: number;
  }) => {
    const newSeason: Season = {
      id: `season-${Date.now()}`,
      name: seasonData.name,
      startDate: seasonData.startDate,
      endDate: seasonData.endDate,
      numberOfRounds: seasonData.numberOfRounds,
      rounds: [],
    };
    setSeasons([...seasons, newSeason]);
  };

  const handleUpdateSeason = (updatedSeason: Season) => {
    setSeasons(seasons.map((s) => (s.id === updatedSeason.id ? updatedSeason : s)));
  };

  const handleDeleteSeason = (seasonId: string) => {
    if (!confirm('Are you sure you want to delete this season? This action cannot be undone.')) {
      return;
    }
    setSeasons(seasons.filter((s) => s.id !== seasonId));
  };

  const handleEditSeason = (season: Season) => {
    setSelectedSeason(season);
    setIsEditModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Group seasons by year
  const seasonsByYear = useMemo(() => {
    const grouped: { [year: string]: Season[] } = {};
    
    seasons.forEach((season) => {
      // Use startDate year if available, otherwise use "TBD" or current year
      let year: string;
      if (season.startDate) {
        year = new Date(season.startDate).getFullYear().toString();
      } else {
        year = 'TBD';
      }
      
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(season);
    });

    // Sort years in descending order (newest first), with "TBD" at the end
    const sortedYears = Object.keys(grouped).sort((a, b) => {
      if (a === 'TBD') return 1;
      if (b === 'TBD') return -1;
      return parseInt(b) - parseInt(a);
    });
    
    return sortedYears.map((year) => ({
      year,
      seasons: grouped[year],
    }));
  }, [seasons]);

  return (
    <>
      <Header hideSearch />
      <div className="p-6">
        <div className="max-w-[95%] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Season Management
            </h1>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-md"
            >
              <Plus className="w-5 h-5" />
              Add Season
            </button>
          </div>

          {seasons.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-12 text-center">
              <Calendar className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                No seasons yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Get started by creating your first season
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-md"
              >
                Add Season
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {seasonsByYear.map(({ year, seasons: yearSeasons }) => (
                <div key={year} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {year}
                    </h2>
                    <div className="flex-1 h-px bg-slate-300 dark:bg-slate-600"></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {yearSeasons.map((season) => (
                      <div
                        key={season.id}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-4 flex flex-col"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex-1 pr-2">
                            {season.name}
                          </h2>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditSeason(season)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              aria-label="Edit season"
                            >
                              <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </button>
                            <button
                              onClick={() => handleDeleteSeason(season.id)}
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              aria-label="Delete season"
                            >
                              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-3">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {formatDate(season.startDate)} - {formatDate(season.endDate)}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                          <span className="font-medium">{season.rounds.length}</span> round{season.rounds.length !== 1 ? 's' : ''}
                        </div>

                        {season.rounds.length > 0 && (
                          <div className="mt-auto">
                            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                              Rounds:
                            </h3>
                            <div className="space-y-1.5 min-h-[280px]">
                              {[...season.rounds].sort((a, b) => a.roundNumber - b.roundNumber).map((round) => (
                                <div
                                  key={round.id}
                                  className="px-2 py-1.5 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-700 dark:text-slate-300"
                                >
                                  <div className="font-medium">Round {round.roundNumber}</div>
                                  <div className="text-slate-600 dark:text-slate-400 truncate">{round.name}</div>
                                  {round.date && (
                                    <div className="text-slate-500 dark:text-slate-500 text-[10px] mt-0.5">
                                      {new Date(round.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddSeasonModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddSeason}
      />

      <EditSeasonModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSeason(null);
        }}
        season={selectedSeason}
        onUpdate={handleUpdateSeason}
        locations={mockLocations}
      />
    </>
  );
}
