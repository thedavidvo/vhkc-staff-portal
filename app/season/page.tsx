'use client';

import Header from '@/components/Header';
import EditSeasonModal from '@/components/EditSeasonModal';
import AddSeasonModal from '@/components/AddSeasonModal';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSeason } from '@/components/SeasonContext';
import { mockLocations } from '@/data/mockData';
import { Edit2, Trash2, Calendar, Plus } from 'lucide-react';

export default function SeasonPage() {
  const router = useRouter();
  const { seasons, selectedSeason, setSelectedSeason, updateSeason, deleteSeason, addSeason } = useSeason();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<typeof seasons[0] | null>(null);

  const handleUpdateSeason = (updatedSeason: typeof seasons[0]) => {
    updateSeason(updatedSeason);
  };

  const handleDeleteSeason = (seasonId: string) => {
    if (!confirm('Are you sure you want to delete this season? This action cannot be undone.')) {
      return;
    }
    deleteSeason(seasonId);
  };

  const handleEditSeason = (season: typeof seasons[0]) => {
    setEditingSeason(season);
    setIsEditModalOpen(true);
  };

  const handleCardClick = (season: typeof seasons[0]) => {
    setSelectedSeason(season);
  };

  const handleAddSeason = (seasonData: {
    name: string;
    startDate: string;
    endDate: string;
    numberOfRounds: number;
  }) => {
    const newSeason = {
      id: `season-${Date.now()}`,
      name: seasonData.name,
      startDate: seasonData.startDate,
      endDate: seasonData.endDate,
      numberOfRounds: seasonData.numberOfRounds,
      rounds: [],
    };
    addSeason(newSeason);
    setIsAddModalOpen(false);
    // Reset dashboard when a new season is added
    router.push('/dashboard');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Filter rounds based on selected season
  const displayedRounds = useMemo(() => {
    if (!selectedSeason) {
      return [];
    }
    return selectedSeason.rounds.sort((a, b) => a.roundNumber - b.roundNumber);
  }, [selectedSeason]);

  // Group all seasons by year for display
  const seasonsByYear = useMemo(() => {
    const grouped: { [year: string]: typeof seasons } = {};
    
    seasons.forEach((season) => {
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
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-md font-medium"
            >
              <Plus className="w-5 h-5" />
              Add New Season
            </button>
          </div>

          {seasons.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-12 text-center">
              <Calendar className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                No seasons yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Get started by creating your first season using the dropdown in the sidebar
              </p>
            </div>
          ) : (
            <>
              {/* Selected Season Rounds Display */}
              {selectedSeason && (
                <div className="mb-8 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                    {selectedSeason.name} - Rounds
                  </h2>
                  {displayedRounds.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {displayedRounds.map((round) => (
                        <div
                          key={round.id}
                          className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          <div className="font-semibold text-slate-900 dark:text-white mb-2">
                            {round.name}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                            {round.location}
                          </div>
                          {round.date && (
                            <div className="text-xs text-slate-500 dark:text-slate-500">
                              {new Date(round.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          )}
                          <div className="mt-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              round.status === 'completed' 
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                : round.status === 'upcoming'
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                            }`}>
                              {round.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400">
                      No rounds for this season yet.
                    </p>
                  )}
                </div>
              )}

              {/* All Seasons Display */}
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
                          onClick={() => handleCardClick(season)}
                          className={`bg-white dark:bg-slate-800 rounded-xl shadow-md border p-4 flex flex-col cursor-pointer transition-all ${
                            selectedSeason?.id === season.id
                              ? 'border-primary-500 ring-2 ring-primary-500'
                              : 'border-slate-200 dark:border-slate-700 hover:shadow-lg'
                          }`}
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

                        <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-700">
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-medium">{season.rounds.length}</span> round{season.rounds.length !== 1 ? 's' : ''}
                          </div>
                          {selectedSeason?.id === season.id && (
                            <div className="mt-2 text-xs text-primary-600 dark:text-primary-400 font-medium">
                              Selected
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              </div>
            </>
          )}
        </div>
      </div>

      <EditSeasonModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSeason(null);
        }}
        season={editingSeason}
        onUpdate={handleUpdateSeason}
        locations={mockLocations}
      />

      <AddSeasonModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddSeason}
      />
    </>
  );
}
