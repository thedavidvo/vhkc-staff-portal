'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import StatsCards from '@/components/StatsCards';
import RaceHistory from '@/components/RaceHistory';
import { useSeason } from '@/components/SeasonContext';
import { Calendar, MapPin, Flag, Trophy, Medal, Award, Loader2, LayoutDashboard, BarChart3 } from 'lucide-react';
import { Division } from '@/types';

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
  const [teams, setTeams] = useState<any[]>([]);
  const [locationsCount, setLocationsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [standingsListHeight, setStandingsListHeight] = useState(300);
  const [isResizingStandings, setIsResizingStandings] = useState(false);
  const [teamStandingsListHeight, setTeamStandingsListHeight] = useState(280);
  const [isResizingTeamStandings, setIsResizingTeamStandings] = useState(false);
  const standingsResizeStartRef = useRef<{ y: number; height: number } | null>(null);
  const teamStandingsResizeStartRef = useRef<{ y: number; height: number } | null>(null);

  const handleStandingsResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    standingsResizeStartRef.current = {
      y: e.clientY,
      height: standingsListHeight,
    };
    setIsResizingStandings(true);
  };

  const handleTeamStandingsResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    teamStandingsResizeStartRef.current = {
      y: e.clientY,
      height: teamStandingsListHeight,
    };
    setIsResizingTeamStandings(true);
  };

  useEffect(() => {
    if (!isResizingStandings) return;

    const onPointerMove = (e: PointerEvent) => {
      if (!standingsResizeStartRef.current) return;

      const deltaY = e.clientY - standingsResizeStartRef.current.y;
      const nextHeight = standingsResizeStartRef.current.height + deltaY;
      const clampedHeight = Math.min(640, Math.max(220, nextHeight));
      setStandingsListHeight(clampedHeight);
    };

    const onPointerUp = () => {
      setIsResizingStandings(false);
      standingsResizeStartRef.current = null;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isResizingStandings]);

  useEffect(() => {
    if (!isResizingTeamStandings) return;

    const onPointerMove = (e: PointerEvent) => {
      if (!teamStandingsResizeStartRef.current) return;

      const deltaY = e.clientY - teamStandingsResizeStartRef.current.y;
      const nextHeight = teamStandingsResizeStartRef.current.height + deltaY;
      const clampedHeight = Math.min(560, Math.max(180, nextHeight));
      setTeamStandingsListHeight(clampedHeight);
    };

    const onPointerUp = () => {
      setIsResizingTeamStandings(false);
      teamStandingsResizeStartRef.current = null;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isResizingTeamStandings]);

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
        setPoints([]);
        setTeams([]);
        setLocationsCount(0);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [driversResponse, roundsResponse, pointsResponse, teamsResponse, locationsResponse] = await Promise.all([
          fetch(`/api/drivers?seasonId=${selectedSeason.id}`),
          fetch(`/api/rounds?seasonId=${selectedSeason.id}`),
          fetch(`/api/points?seasonId=${selectedSeason.id}`),
          fetch(`/api/teams?seasonId=${selectedSeason.id}`),
          fetch('/api/locations'),
        ]);

        if (driversResponse.ok) {
          const driversData = await driversResponse.json();
          setDrivers(driversData);
        }

        if (roundsResponse.ok) {
          const roundsData = await roundsResponse.json();
          const sortedRounds = (Array.isArray(roundsData) ? roundsData : []).sort((a: any, b: any) => {
            const roundA = a.roundNumber || 0;
            const roundB = b.roundNumber || 0;
            return roundA - roundB;
          });
          setRounds(sortedRounds);
        } else {
          console.error('Failed to fetch rounds:', roundsResponse.status, roundsResponse.statusText);
          setRounds([]);
        }

        if (pointsResponse.ok) {
          const pointsData = await pointsResponse.json();
          setPoints(pointsData || []);
        }

        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          setTeams(Array.isArray(teamsData) ? teamsData : []);
        } else {
          setTeams([]);
        }

        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json();
          setLocationsCount(Array.isArray(locationsData) ? locationsData.length : 0);
        } else {
          setLocationsCount(0);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setRounds([]);
        setDrivers([]);
        setPoints([]);
        setTeams([]);
        setLocationsCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSeason, isCheckingAuth, seasonsLoading]);

  // Calculate dynamic stats
  const stats = useMemo(() => {
    const activeDrivers = drivers.filter((d) => d.status === 'ACTIVE');
    const uniqueDivisions = new Set(activeDrivers.map((d) => d.division));
    return {
      totalRounds: rounds.length,
      totalDrivers: drivers.length,
      activeDivisions: uniqueDivisions.size,
      totalTeams: teams.length,
      totalLocations: locationsCount,
    };
  }, [drivers, rounds.length, teams.length, locationsCount]);

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

  // Check if season has ended using season metadata first, then rounds as fallback.
  const isSeasonEnded = useMemo(() => {
    if (!selectedSeason) return false;

    const seasonStatus = String((selectedSeason as any).status || '').toLowerCase();
    if (seasonStatus === 'ended' || seasonStatus === 'completed') {
      return true;
    }

    if (selectedSeason.endDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedSeason.endDate);
      if (!isNaN(endDate.getTime())) {
        endDate.setHours(0, 0, 0, 0);
        // Treat the end date itself as an ended season day.
        if (endDate <= today) {
          return true;
        }
      }
    }

    if (rounds.length > 0) {
      const normalizedStatuses = rounds
        .map((round: any) => String(round?.status || '').toLowerCase())
        .filter(Boolean);
      if (normalizedStatuses.length > 0 && normalizedStatuses.every((status) => status === 'completed')) {
        return true;
      }
    }

    return false;
  }, [selectedSeason, rounds]);

  // Find next upcoming race
  const nextUpcomingRace = useMemo(() => {
    if (!rounds || rounds.length === 0) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingRounds = rounds
      .filter((round) => {
        // Filter for upcoming rounds with a valid date
        if (!round || round.status !== 'upcoming') return false;
        if (!round.date || round.date.trim() === '') return false;
        return true;
      })
      .map((round) => {
        try {
          const raceDate = new Date(round.date);
          if (isNaN(raceDate.getTime())) return null;
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

  // Get top 3 drivers for each division sorted by total points
  const topDriversByDivision = useMemo(() => {
    if (!isSeasonEnded) return null;

    const divisions: Division[] = ['Division 1', 'Division 2', 'Division 3', 'Division 4'];
    const result: Record<Division, any[]> = {
      'Division 1': [],
      'Division 2': [],
      'Division 3': [],
      'Division 4': [],
      'New': [],
      'Open': [],
    };

    divisions.forEach((division) => {
      const driversInDivision = drivers
        .filter((d) => d.division === division && d.status === 'ACTIVE')
        .map(driver => {
          const driverPoints = points.filter((p: any) => p.driverId === driver.id);
          const pointsByRound: Record<string, number> = {};
          driverPoints.forEach((p: any) => {
            const roundId = p.roundId;
            if (!pointsByRound[roundId]) pointsByRound[roundId] = 0;
            pointsByRound[roundId] += parseFloat(p.points) || 0;
          });
          const totalPoints = Object.values(pointsByRound).reduce((sum, pts) => sum + pts, 0);
          return { ...driver, totalPoints };
        })
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, 3);

      result[division] = driversInDivision;
    });

    return result;
  }, [isSeasonEnded, drivers, points]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-amber-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return null;
  };

  // Calculate overall standings by division
  const [selectedStandingsDivision, setSelectedStandingsDivision] = useState<Division>('Division 1');
  const [selectedTeamStandingsDivision, setSelectedTeamStandingsDivision] = useState<'All' | Division>('All');

  const teamDivisionOptions = useMemo(() => {
    const normalized = new Set<Division>();

    teams.forEach((team: any) => {
      const division = team?.division as Division | undefined;
      if (division) normalized.add(division);
    });

    if (normalized.size === 0) {
      drivers.forEach((driver: any) => {
        if (driver?.teamName && driver?.division) {
          normalized.add(driver.division as Division);
        }
      });
    }

    const order: Division[] = ['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New', 'Open'];
    return order.filter((division) => normalized.has(division));
  }, [teams, drivers]);

  useEffect(() => {
    if (selectedTeamStandingsDivision !== 'All' && !teamDivisionOptions.includes(selectedTeamStandingsDivision)) {
      setSelectedTeamStandingsDivision('All');
    }
  }, [selectedTeamStandingsDivision, teamDivisionOptions]);
  
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

  const teamStandings = useMemo(() => {
    const activeDrivers = drivers.filter((d) => {
      if (d.status !== 'ACTIVE') return false;
      if (!d.teamName || String(d.teamName).trim() === '') return false;
      if (selectedTeamStandingsDivision === 'All') return true;
      return d.division === selectedTeamStandingsDivision;
    });

    const activeDriverById = new Map(activeDrivers.map((driver) => [driver.id, driver]));
    const teamMap = new Map<string, { id: string; name: string; driverIds: Set<string>; totalPoints: number }>();

    activeDrivers.forEach((driver) => {
      const teamName = String(driver.teamName).trim();
      if (!teamMap.has(teamName)) {
        teamMap.set(teamName, {
          id: teamName,
          name: teamName,
          driverIds: new Set<string>(),
          totalPoints: 0,
        });
      }
      teamMap.get(teamName)!.driverIds.add(driver.id);
    });

    points.forEach((point: any) => {
      const driver = activeDriverById.get(point.driverId);
      if (!driver || !driver.teamName) return;
      const teamName = String(driver.teamName).trim();
      const team = teamMap.get(teamName);
      if (!team) return;
      team.totalPoints += parseFloat(point.points) || 0;
    });

    return Array.from(teamMap.values())
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((team, index) => ({
        ...team,
        position: index + 1,
        driverCount: team.driverIds.size,
      }));
  }, [drivers, points, selectedTeamStandingsDivision]);

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
        onRoundsClick={() => router.push('/season')}
        onDriversClick={() => router.push('/drivers')}
        onDivisionsClick={() => router.push('/divisions')}
        onTeamsClick={() => router.push('/teams')}
        onLocationsClick={() => router.push('/locations')}
      />

      {/* Next Upcoming Race / Season Champions */}
      {nextUpcomingRace ? (
        <SectionCard icon={Flag} title="Next Upcoming Race" className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
            <div className="flex items-start gap-3 sm:pr-6 pb-4 sm:pb-0">
              <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Date</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {new Date(nextUpcomingRace.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 sm:px-6 py-4 sm:py-0">
              <Flag className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Round</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Round {nextUpcomingRace.round}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{nextUpcomingRace.season}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 sm:pl-6 pt-4 sm:pt-0">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Location</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{nextUpcomingRace.location}</p>
                {nextUpcomingRace.address && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{nextUpcomingRace.address}</p>
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      ) : isSeasonEnded ? (
        <SectionCard title="Season Champions" icon={Trophy} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {(['Division 1', 'Division 2', 'Division 3', 'Division 4'] as Division[]).map((division) => {
              const topDrivers = topDriversByDivision?.[division] || [];
              if (topDrivers.length === 0) return null;
              return (
                <div key={division} className="p-3 rounded-md border border-slate-100 dark:border-slate-800">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mb-2 ${getDivisionColor(division)}`}>
                    {division}
                  </span>
                  <div className="space-y-1.5">
                    {topDrivers.map((driver, index) => (
                      <div key={driver.id} className="flex items-center gap-2">
                        <div className="flex-shrink-0 w-5">{getRankIcon(index + 1)}</div>
                        <span className="text-sm text-slate-900 dark:text-white truncate">{driver.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {(!topDriversByDivision || !(['Division 1', 'Division 2', 'Division 3', 'Division 4'] as Division[]).some((division) => (topDriversByDivision?.[division] || []).length > 0)) && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No champion data available yet.</p>
            )}
          </div>
        </SectionCard>
      ) : hasNoUpcomingRaces ? (
        <SectionCard
          title="No Upcoming Races"
          icon={Flag}
          className="mb-6"
        >
          <p className="text-sm text-slate-600 dark:text-slate-400">
            There are no upcoming races scheduled at this time.
          </p>
        </SectionCard>
      ) : null}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Standings & Race History */}
        <div className="lg:col-span-3 space-y-6">
          {/* Race History */}
          <SectionCard title="Season Races" icon={Flag} noPadding>
            <div className="p-4">
              <RaceHistory races={filteredRaces} drivers={drivers} points={points} rounds={rounds} />
            </div>
          </SectionCard>

          {/* Standings Section */}
          <SectionCard
            title="Standings"
            icon={BarChart3}
            actions={
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1">Drag to resize</span>
                {(['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New'] as Division[]).map((division) => (
                  <button
                    key={division}
                    onClick={() => setSelectedStandingsDivision(division)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                      selectedStandingsDivision === division
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
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
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No drivers found in {selectedStandingsDivision}
                </div>
              ) : (
                <>
                  <div className="overflow-y-auto" style={{ maxHeight: `${standingsListHeight}px` }}>
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-20">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase sticky left-0 bg-slate-50 dark:bg-slate-800 z-30">
                          Pos
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase sticky left-[60px] bg-slate-50 dark:bg-slate-800 z-30">
                          Driver
                        </th>
                        {[...rounds].sort((a: any, b: any) => (a.roundNumber || 0) - (b.roundNumber || 0)).map((round: any) => (
                          <th
                            key={round.id}
                            className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase min-w-[50px]"
                            title={round.location || 'TBD'}
                          >
                            R{round.roundNumber || ''}
                          </th>
                        ))}
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Pts
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                      {overallStandings.map((driver) => {
                        const sortedRoundsForDisplay = [...rounds].sort((a: any, b: any) => (a.roundNumber || 0) - (b.roundNumber || 0));
                        return (
                          <tr key={driver.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-2.5 whitespace-nowrap sticky left-0 bg-white dark:bg-slate-900 z-10">
                              <div className="flex items-center gap-1.5">
                                {getRankIcon(driver.position)}
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {driver.position}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 sticky left-[60px] bg-white dark:bg-slate-900 z-10">
                              <span className="text-sm font-medium text-slate-900 dark:text-white">
                                {driver.name}
                              </span>
                            </td>
                            {sortedRoundsForDisplay.map((round: any) => {
                              const roundPoints = driver.pointsPerRound?.find((pr: any) => pr.roundId === round.id);
                              return (
                                <td key={round.id} className="px-3 py-2.5 whitespace-nowrap text-center">
                                  <span className={`text-sm ${
                                    roundPoints && roundPoints.points > 0
                                      ? 'font-medium text-slate-900 dark:text-white'
                                      : 'text-slate-300 dark:text-slate-600'
                                  }`}>
                                    {roundPoints && roundPoints.points > 0 ? roundPoints.points : '–'}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="px-4 py-2.5 whitespace-nowrap text-right">
                              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                {Math.round(driver.totalPoints)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                  <div
                    role="separator"
                    aria-orientation="horizontal"
                    aria-label="Resize standings list"
                    onPointerDown={handleStandingsResizeStart}
                    className={`h-3 border-t border-slate-100 dark:border-slate-800 cursor-row-resize select-none touch-none ${
                      isResizingStandings ? 'bg-slate-100 dark:bg-slate-800' : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="h-1 w-12 rounded-full bg-slate-300 dark:bg-slate-600 mx-auto mt-1" />
                  </div>
                </>
              )}
            </div>
          </SectionCard>

          {/* Team Standings */}
          <SectionCard
            title="Team Standings"
            icon={Trophy}
            actions={
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['All', ...teamDivisionOptions] as const).map((division) => (
                  <button
                    key={division}
                    onClick={() => setSelectedTeamStandingsDivision(division as 'All' | Division)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                      selectedTeamStandingsDivision === division
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
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
              {teamStandings.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No team standings available yet.
                </div>
              ) : (
                <>
                  <div className="overflow-y-auto" style={{ maxHeight: `${teamStandingsListHeight}px` }}>
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Pos</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Team</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Drivers</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                        {teamStandings.map((team) => (
                          <tr key={team.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {getRankIcon(team.position)}
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">{team.position}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-sm font-medium text-slate-900 dark:text-white">{team.name}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span className="text-sm text-slate-700 dark:text-slate-300">{team.driverCount}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span className="text-sm font-semibold text-slate-900 dark:text-white">{Math.round(team.totalPoints)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div
                    role="separator"
                    aria-orientation="horizontal"
                    aria-label="Resize team standings list"
                    onPointerDown={handleTeamStandingsResizeStart}
                    className={`h-3 border-t border-slate-100 dark:border-slate-800 cursor-row-resize select-none touch-none ${
                      isResizingTeamStandings ? 'bg-slate-100 dark:bg-slate-800' : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="h-1 w-12 rounded-full bg-slate-300 dark:bg-slate-600 mx-auto mt-1" />
                  </div>
                </>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </PageLayout>
  );
}
