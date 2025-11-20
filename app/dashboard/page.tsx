'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import StatsCards from '@/components/StatsCards';
import RaceHistory from '@/components/RaceHistory';
import { useSeason } from '@/components/SeasonContext';
import { Calendar, MapPin, Flag, Trophy, Medal, Award, Loader2, LayoutDashboard, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { Division } from '@/types';
import DivisionChangesModal from '@/components/DivisionChangesModal';

// Helper function to get division color
const getDivisionColor = (division: Division) => {
  switch (division) {
    case 'Division 1':
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    case 'Division 2':
      return 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200';
    case 'Division 3':
      return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
    case 'Division 4':
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    case 'New':
      return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
  }
};

export default function Dashboard() {
  const router = useRouter();
  const { selectedSeason, loading: seasonsLoading } = useSeason();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);
  const [divisionChanges, setDivisionChanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loadingChanges, setLoadingChanges] = useState(false);
  const [promotionsModalOpen, setPromotionsModalOpen] = useState(false);
  const [demotionsModalOpen, setDemotionsModalOpen] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuthenticated = localStorage.getItem('isAuthenticated');
      if (isAuthenticated !== 'true') {
        router.replace('/login');
      } else {
        setIsCheckingAuth(false);
      }
    }
  }, [router]);

  // Fetch drivers, rounds, and race results from API
  useEffect(() => {
    if (isCheckingAuth || seasonsLoading) return;
    const fetchData = async () => {
      if (!selectedSeason) {
        setDrivers([]);
        setRounds([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [driversResponse, roundsResponse, pointsResponse] = await Promise.all([
          fetch(`/api/drivers?seasonId=${selectedSeason.id}`),
          fetch(`/api/rounds?seasonId=${selectedSeason.id}`),
          fetch(`/api/points?seasonId=${selectedSeason.id}`),
        ]);

        if (driversResponse.ok) {
          const driversData = await driversResponse.json();
          setDrivers(driversData);
        }

        if (roundsResponse.ok) {
          const roundsData = await roundsResponse.json();
          const sortedRounds = (roundsData || []).sort((a: any, b: any) => {
            const roundA = a.roundNumber || 0;
            const roundB = b.roundNumber || 0;
            return roundA - roundB;
          });
          setRounds(sortedRounds);
        }

        if (pointsResponse.ok) {
          const pointsData = await pointsResponse.json();
          setPoints(pointsData || []);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSeason, isCheckingAuth, seasonsLoading]);

  // Fetch division changes for the season
  useEffect(() => {
    const fetchDivisionChanges = async () => {
      if (!selectedSeason?.id) {
        setDivisionChanges([]);
        return;
      }

      try {
        setLoadingChanges(true);
        const response = await fetch(`/api/division-changes?seasonId=${selectedSeason.id}`);
        if (response.ok) {
          const data = await response.json();
          setDivisionChanges(Array.isArray(data) ? data : []);
        } else {
          setDivisionChanges([]);
        }
      } catch (error) {
        console.error('Failed to fetch division changes:', error);
        setDivisionChanges([]);
      } finally {
        setLoadingChanges(false);
      }
    };

    fetchDivisionChanges();
  }, [selectedSeason]);

  // Calculate dynamic stats
  const stats = useMemo(() => {
    const activeDrivers = drivers.filter((d) => d.status === 'ACTIVE');
    const uniqueDivisions = new Set(drivers.map((d) => d.division));
    return {
      totalDrivers: activeDrivers.length,
      activeDivisions: uniqueDivisions.size,
    };
  }, [drivers]);

  // Separate promotions and demotions
  const promotions = useMemo(() => {
    return divisionChanges.filter((c: any) => c.changeType === 'promotion');
  }, [divisionChanges]);

  const demotions = useMemo(() => {
    return divisionChanges.filter((c: any) => c.changeType === 'demotion');
  }, [divisionChanges]);

  // Convert rounds to races format
  const races = useMemo(() => {
    if (!rounds || rounds.length === 0) return [];
    return rounds.map((round) => ({
      id: round.id,
      name: round.location || 'TBD',
      season: selectedSeason?.name || '',
      round: round.roundNumber || 0,
      date: round.date || '',
      location: round.location || '',
      address: round.address || '',
      status: round.status || 'upcoming',
    }));
  }, [rounds, selectedSeason]);

  const filteredRaces = useMemo(() => {
    return [...races].sort((a, b) => {
      const roundA = a.round || 0;
      const roundB = b.round || 0;
      return roundA - roundB;
    });
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

  // Find next upcoming race
  const nextUpcomingRace = useMemo(() => {
    if (!rounds || rounds.length === 0) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingRounds = rounds
      .filter((round) => round && round.status === 'upcoming' && round.date)
      .map((round) => {
        try {
          const raceDate = new Date(round.date);
          raceDate.setHours(0, 0, 0, 0);
          return {
            ...round,
            raceDate,
          };
        } catch (e) {
          return null;
        }
      })
      .filter((round): round is NonNullable<typeof round> => {
        if (!round) return false;
        return round.raceDate >= today;
      })
      .sort((a, b) => a.raceDate.getTime() - b.raceDate.getTime());
    
    if (upcomingRounds.length === 0) return null;
    
    const nextRound = upcomingRounds[0];
    return {
      id: nextRound.id,
      name: nextRound.location || 'TBD',
      season: selectedSeason?.name || '',
      round: nextRound.roundNumber || 0,
      date: nextRound.date || '',
      location: nextRound.location || '',
      address: nextRound.address || '',
      status: nextRound.status || 'upcoming',
    };
  }, [rounds, selectedSeason]);

  const hasNoUpcomingRaces = !nextUpcomingRace;

  // Get top 3 drivers for each division
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
        .slice(0, 3);
      
      result[division] = driversInDivision;
    });

    return result;
  }, [isSeasonEnded, drivers]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-amber-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return null;
  };

  // Calculate overall standings by division
  const [selectedStandingsDivision, setSelectedStandingsDivision] = useState<Division>('Division 1');
  
  const overallStandings = useMemo(() => {
    const sortedRounds = [...rounds].sort((a: any, b: any) => {
      const roundA = a.roundNumber || 0;
      const roundB = b.roundNumber || 0;
      return roundA - roundB;
    });

    const driversInDivision = drivers
      .filter((d) => d.division === selectedStandingsDivision && d.status === 'ACTIVE')
      .map(driver => {
        const driverPoints = points.filter((p: any) => p.driverId === driver.id);
        
        const pointsByRound: Record<string, number> = {};
        driverPoints.forEach((p: any) => {
          const roundId = p.roundId;
          if (!pointsByRound[roundId]) {
            pointsByRound[roundId] = 0;
          }
          pointsByRound[roundId] += parseFloat(p.points) || 0;
        });
        
        const totalPoints = Object.values(pointsByRound).reduce((sum, pts) => sum + pts, 0);
        
        const pointsPerRound = sortedRounds.map((round: any) => ({
          roundId: round.id,
          roundNumber: round.roundNumber || 0,
          points: Math.round(pointsByRound[round.id] || 0),
        }));
        
        return {
          ...driver,
          totalPoints,
          pointsPerRound,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((driver, index) => ({
        ...driver,
        position: index + 1,
      }));

    return driversInDivision;
  }, [drivers, points, selectedStandingsDivision, rounds]);

  if (isCheckingAuth || seasonsLoading || loading) {
    return (
      <>
        <Header hideSearch />
        <div className="p-4 md:p-6">
          <div className="max-w-[95%] mx-auto">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                <p className="text-slate-600 dark:text-slate-400">
                  {isCheckingAuth ? 'Checking authentication...' : seasonsLoading ? 'Loading seasons...' : 'Loading dashboard data...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <PageLayout
      title="Dashboard"
      subtitle="Welcome back! Here's your racing overview"
      icon={LayoutDashboard}
    >
      {/* Stats Cards */}
      <StatsCards 
        stats={stats} 
        onDriversClick={() => router.push('/drivers')}
        onDivisionsClick={() => router.push('/divisions')}
        onPromotionsClick={() => setPromotionsModalOpen(true)}
        onDemotionsClick={() => setDemotionsModalOpen(true)}
        promotionsCount={promotions.length}
        demotionsCount={demotions.length}
      />

      {/* Division Changes Modals */}
      <DivisionChangesModal
        isOpen={promotionsModalOpen}
        onClose={() => setPromotionsModalOpen(false)}
        type="promotions"
        changes={promotions}
        rounds={rounds}
        loading={loadingChanges}
      />
      <DivisionChangesModal
        isOpen={demotionsModalOpen}
        onClose={() => setDemotionsModalOpen(false)}
        type="demotions"
        changes={demotions}
        rounds={rounds}
        loading={loadingChanges}
      />

      {/* Next Upcoming Race */}
      {nextUpcomingRace ? (
        <div className="mb-8 bg-gradient-to-br from-primary-500 via-primary-600 to-blue-600 rounded-3xl shadow-modern-2xl border border-primary-400/20 overflow-hidden relative hover-lift animate-fadeIn">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl animate-float"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-2xl animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="p-8 text-white relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <Flag className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Next Upcoming Race</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
        <SectionCard
          title={isSeasonEnded ? 'The Season Has Ended' : 'No Upcoming Races'}
          icon={Flag}
          className="mb-8"
        >
          <p className="text-slate-600 dark:text-slate-400">
            {isSeasonEnded
              ? `${selectedSeason?.name || 'Season'} ended on ${selectedSeason?.endDate ? new Date(selectedSeason.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}.`
              : 'There are no upcoming races scheduled at this time.'}
          </p>
        </SectionCard>
      ) : null}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Season Champions */}
        {isSeasonEnded && topDriversByDivision && (
          <div className="lg:col-span-1">
            <SectionCard
              title="Season Champions"
              icon={Trophy}
            >
              <div className="space-y-4">
                {(['Division 1', 'Division 2', 'Division 3', 'Division 4'] as Division[]).map((division) => {
                  const topDrivers = topDriversByDivision[division];
                  if (topDrivers.length === 0) return null;

                  return (
                    <div
                      key={division}
                      className="p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all duration-200"
                    >
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-xs ${getDivisionColor(division)}`}>
                          {division}
                        </span>
                      </h3>
                      <div className="space-y-2">
                        {topDrivers.map((driver, index) => {
                          const rank = index + 1;
                          return (
                            <div
                              key={driver.id}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors duration-200"
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
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>
        )}

        {/* Right Column - Standings & Race History */}
        <div className={isSeasonEnded && topDriversByDivision ? "lg:col-span-2 space-y-8" : "lg:col-span-3 space-y-8"}>
          {/* Standings Section */}
          <SectionCard
            title="Standings"
            icon={BarChart3}
            actions={
              <div className="flex items-center gap-2 flex-wrap">
                {(['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New'] as Division[]).map((division) => (
                  <button
                    key={division}
                    onClick={() => setSelectedStandingsDivision(division)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedStandingsDivision === division
                        ? `${getDivisionColor(division)} ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-600 shadow-md`
                        : `${getDivisionColor(division)} opacity-60 hover:opacity-100`
                    }`}
                  >
                    {division}
                  </button>
                ))}
              </div>
            }
            noPadding
          >
            <div className="overflow-x-auto">
              {overallStandings.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  No drivers found in {selectedStandingsDivision}
                </div>
              ) : (
                <div className="relative">
                  <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-20">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase sticky left-0 bg-slate-50 dark:bg-slate-800 z-30">
                            Pos
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase sticky left-[60px] bg-slate-50 dark:bg-slate-800 z-30">
                            Driver
                          </th>
                          {rounds.length > 0 && (
                            <>
                              {[...rounds].sort((a: any, b: any) => (a.roundNumber || 0) - (b.roundNumber || 0)).map((round: any) => (
                                <th
                                  key={round.id}
                                  className="px-3 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase min-w-[60px]"
                                  title={round.location || 'TBD'}
                                >
                                  R{round.roundNumber || ''}
                                </th>
                              ))}
                            </>
                          )}
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                            Points
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {overallStandings.map((driver) => {
                          const sortedRoundsForDisplay = [...rounds].sort((a: any, b: any) => (a.roundNumber || 0) - (b.roundNumber || 0));
                          return (
                            <tr
                              key={driver.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white dark:bg-slate-800 z-10">
                                <div className="flex items-center gap-2">
                                  {getRankIcon(driver.position)}
                                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {driver.position}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 sticky left-[60px] bg-white dark:bg-slate-800 z-10">
                                <div className="text-sm font-medium text-slate-900 dark:text-white">
                                  {driver.name}
                                </div>
                                {driver.teamName && (
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {driver.teamName}
                                  </div>
                                )}
                              </td>
                              {sortedRoundsForDisplay.map((round: any) => {
                                const roundPoints = driver.pointsPerRound?.find((pr: any) => pr.roundId === round.id);
                                return (
                                  <td
                                    key={round.id}
                                    className="px-3 py-3 whitespace-nowrap text-center"
                                  >
                                    <div className={`text-sm ${
                                      roundPoints && roundPoints.points > 0
                                        ? 'font-medium text-slate-900 dark:text-white'
                                        : 'text-slate-400 dark:text-slate-500'
                                    }`}>
                                      {roundPoints ? roundPoints.points : '-'}
                                    </div>
                                  </td>
                                );
                              })}
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {Math.round(driver.totalPoints)}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Race History */}
          <SectionCard
            title="Season Races"
            icon={Flag}
            noPadding
          >
            <div className="p-6">
              <RaceHistory races={filteredRaces} drivers={drivers} points={points} rounds={rounds} />
            </div>
          </SectionCard>
        </div>
      </div>
    </PageLayout>
  );
}
