'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import StatsCards from '@/components/StatsCards';
import RaceHistory from '@/components/RaceHistory';
import PromotionsModal from '@/components/PromotionsModal';
import DemotionsModal from '@/components/DemotionsModal';
import { useSeason } from '@/components/SeasonContext';
import { Calendar, MapPin, Flag, Trophy, Medal, Award, Loader2 } from 'lucide-react';
import { Division } from '@/types';

export default function Dashboard() {
  const router = useRouter();
  const { selectedSeason } = useSeason();
  const [isPromotionsModalOpen, setIsPromotionsModalOpen] = useState(false);
  const [isDemotionsModalOpen, setIsDemotionsModalOpen] = useState(false);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [demotions, setDemotions] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch drivers and rounds from API
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedSeason) {
        setDrivers([]);
        setRounds([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [driversResponse, roundsResponse] = await Promise.all([
          fetch(`/api/drivers?seasonId=${selectedSeason.id}`),
          fetch(`/api/rounds?seasonId=${selectedSeason.id}`),
        ]);

        if (driversResponse.ok) {
          const driversData = await driversResponse.json();
          setDrivers(driversData);
        }

        if (roundsResponse.ok) {
          const roundsData = await roundsResponse.json();
          // Sort rounds by date
          const sortedRounds = roundsData.sort((a: any, b: any) => {
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            return dateA - dateB;
          });
          setRounds(sortedRounds);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSeason]);

  // Calculate dynamic stats
  const stats = useMemo(() => {
    const activeDrivers = drivers.filter((d) => d.status === 'ACTIVE');
    const uniqueDivisions = new Set(drivers.map((d) => d.division));
    return {
      totalDrivers: activeDrivers.length,
      driversPromoted: promotions.length,
      driversDemoted: demotions.length,
      activeDivisions: uniqueDivisions.size,
    };
  }, [promotions, demotions, drivers]);

  // Convert rounds to races format for compatibility
  const races = useMemo(() => {
    return rounds.map((round) => ({
      id: round.id,
      name: round.name,
      season: selectedSeason?.name || '',
      round: round.roundNumber,
      date: round.date,
      location: round.location,
      address: round.address,
      status: round.status,
    }));
  }, [rounds, selectedSeason]);

  // Filter races by selected season
  const filteredRaces = useMemo(() => {
    return races;
  }, [races]);

  // Check if season has ended
  const isSeasonEnded = useMemo(() => {
    if (!selectedSeason || !selectedSeason.endDate) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(selectedSeason.endDate);
    endDate.setHours(0, 0, 0, 0);
    return endDate < today;
  }, [selectedSeason]);

  // Find next upcoming race - sorted by date
  const nextUpcomingRace = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingRounds = rounds
      .filter((round) => round.status === 'upcoming' && round.date)
      .map((round) => {
        const raceDate = new Date(round.date);
        raceDate.setHours(0, 0, 0, 0);
        return {
          ...round,
          raceDate,
        };
      })
      .filter((round) => {
        // Show upcoming races that are today or in the future
        return round.raceDate >= today;
      })
      .sort((a, b) => a.raceDate.getTime() - b.raceDate.getTime());
    
    if (upcomingRounds.length === 0) return null;
    
    const nextRound = upcomingRounds[0];
    return {
      id: nextRound.id,
      name: nextRound.name,
      season: selectedSeason?.name || '',
      round: nextRound.roundNumber,
      date: nextRound.date,
      location: nextRound.location,
      address: nextRound.address,
      status: nextRound.status,
    };
  }, [rounds, selectedSeason]);

  // Check if there are no upcoming races
  const hasNoUpcomingRaces = !nextUpcomingRace;

  // Get top 3 drivers for each division (except New)
  const topDriversByDivision = useMemo(() => {
    if (!isSeasonEnded) return null;

    const divisions: Division[] = ['Division 1', 'Division 2', 'Division 3', 'Division 4'];
    const result: Record<Division, any[]> = {
      'Division 1': [],
      'Division 2': [],
      'Division 3': [],
      'Division 4': [],
      'New': [],
    };

    divisions.forEach((division) => {
      const driversInDivision = drivers
        .filter((d) => d.division === division && d.status === 'ACTIVE')
        .sort((a, b) => b.pointsTotal - a.pointsTotal)
        .slice(0, 3); // Get top 3
      
      result[division] = driversInDivision;
    });

    return result;
  }, [isSeasonEnded]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-amber-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return null;
  };

  const handlePromotionConfirm = (driverId: string) => {
    // In a real app, this would make an API call to confirm the promotion
    setPromotions(promotions.filter((p) => p.driverId !== driverId));
  };

  const handlePromotionDecline = (driverId: string) => {
    // In a real app, this would make an API call to decline the promotion
    setPromotions(promotions.filter((p) => p.driverId !== driverId));
  };

  const handleDemotionConfirm = (driverId: string) => {
    // In a real app, this would make an API call to confirm the demotion
    setDemotions(demotions.filter((d) => d.driverId !== driverId));
  };

  const handleDemotionDecline = (driverId: string) => {
    // In a real app, this would make an API call to decline the demotion
    setDemotions(demotions.filter((d) => d.driverId !== driverId));
  };

  if (loading) {
    return (
      <>
        <Header hideSearch />
        <div className="p-4 md:p-6">
          <div className="max-w-[95%] mx-auto">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                <p className="text-slate-600 dark:text-slate-400">Loading dashboard data...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header hideSearch />
      <div className="p-4 md:p-6">
        <div className="max-w-[95%] mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Dashboard
            </h1>
          </div>

          {/* Next Upcoming Race / Status Message */}
          {nextUpcomingRace ? (
            <div className="mb-6 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg border border-primary-400 overflow-hidden">
              <div className="p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <Flag className="w-6 h-6" />
                  <h2 className="text-xl font-bold">Next Upcoming Race</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm opacity-90 mb-1">Date</p>
                      <p className="font-semibold">
                        {new Date(nextUpcomingRace.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Flag className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm opacity-90 mb-1">Race</p>
                      <p className="font-semibold">{nextUpcomingRace.name}</p>
                      <p className="text-sm opacity-90">{nextUpcomingRace.season} • Round {nextUpcomingRace.round}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm opacity-90 mb-1">Location</p>
                      <p className="font-semibold">{nextUpcomingRace.location}</p>
                      <p className="text-sm opacity-90">{nextUpcomingRace.address}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : hasNoUpcomingRaces ? (
            <div className="mb-6 bg-slate-200 dark:bg-slate-700 rounded-xl shadow-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Flag className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {isSeasonEnded ? 'The Season Has Ended' : 'No Upcoming Races'}
                  </h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  {isSeasonEnded
                    ? `${selectedSeason?.name || 'Season'} ended on ${selectedSeason?.endDate ? new Date(selectedSeason.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}.`
                    : 'There are no upcoming races scheduled at this time.'}
                </p>
              </div>
            </div>
          ) : null}

          <StatsCards 
            stats={stats} 
            onPromotedClick={() => setIsPromotionsModalOpen(true)}
            onDemotedClick={() => setIsDemotionsModalOpen(true)}
            onDriversClick={() => router.push('/drivers')}
            onDivisionsClick={() => router.push('/divisions')}
          />

          {/* Top 3 by Division - Only show when season has ended */}
          {isSeasonEnded && topDriversByDivision && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                Season Champions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(['Division 1', 'Division 2', 'Division 3', 'Division 4'] as Division[]).map((division) => {
                  const topDrivers = topDriversByDivision[division];
                  if (topDrivers.length === 0) return null;

                  return (
                    <div
                      key={division}
                      className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-4"
                    >
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                        {division}
                      </h3>
                      <div className="space-y-3">
                        {topDrivers.map((driver, index) => {
                          const rank = index + 1;
                          return (
                            <div
                              key={driver.id}
                              className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg"
                            >
                              <div className="flex-shrink-0">
                                {getRankIcon(rank)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                  {driver.name}
                                </div>
                                {driver.teamName && (
                                  <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                    {driver.teamName}
                                  </div>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-sm font-bold text-slate-900 dark:text-white">
                                  {driver.pointsTotal.toLocaleString()}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-500">
                                  pts
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Season Races
            </h2>
            <RaceHistory races={filteredRaces} />
          </div>
        </div>
      </div>

      <PromotionsModal
        isOpen={isPromotionsModalOpen}
        onClose={() => setIsPromotionsModalOpen(false)}
        promotions={promotions}
        onConfirm={handlePromotionConfirm}
        onDecline={handlePromotionDecline}
      />

      <DemotionsModal
        isOpen={isDemotionsModalOpen}
        onClose={() => setIsDemotionsModalOpen(false)}
        demotions={demotions}
        onConfirm={handleDemotionConfirm}
        onDecline={handleDemotionDecline}
      />
    </>
  );
}

