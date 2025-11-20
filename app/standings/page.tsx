'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import { useSeason } from '@/components/SeasonContext';
import { Division } from '@/types';
import { Trophy, Medal, Award, Loader2, BarChart3, Users, UsersRound } from 'lucide-react';

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

// Helper function to get division gradient
const getDivisionGradient = (division: Division) => {
  switch (division) {
    case 'Division 1':
      return 'from-blue-500 via-blue-600 to-blue-700';
    case 'Division 2':
      return 'from-pink-500 via-pink-600 to-rose-600';
    case 'Division 3':
      return 'from-orange-500 via-orange-600 to-amber-600';
    case 'Division 4':
      return 'from-yellow-500 via-yellow-600 to-amber-600';
    case 'New':
      return 'from-purple-500 via-purple-600 to-indigo-600';
    default:
      return 'from-slate-500 to-slate-600';
  }
};

export default function StandingsPage() {
  const { selectedSeason } = useSeason();
  const [selectedDivision, setSelectedDivision] = useState<Division>('Division 1');
  const [viewMode, setViewMode] = useState<'drivers' | 'teams'>('drivers');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const allDivisions: Division[] = ['Division 1', 'Division 2', 'Division 3', 'Division 4'];
  const teamDivisions: Division[] = ['Division 1', 'Division 2'];
  const divisions = viewMode === 'teams' ? teamDivisions : allDivisions;

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedSeason) {
        setDrivers([]);
        setRounds([]);
        setPoints([]);
        setTeams([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch drivers
        const driversResponse = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`);
        if (driversResponse.ok) {
          const driversData = await driversResponse.json();
          setDrivers(driversData);
        }

        // Fetch rounds
        const roundsResponse = await fetch(`/api/rounds?seasonId=${selectedSeason.id}`);
        if (roundsResponse.ok) {
          const roundsData = await roundsResponse.json();
          const sortedRounds = roundsData.sort((a: any, b: any) => {
            return (a.roundNumber || 0) - (b.roundNumber || 0);
          });
          setRounds(sortedRounds);
        }

        // Fetch points by season
        const pointsResponse = await fetch(`/api/points?seasonId=${selectedSeason.id}`);
        if (pointsResponse.ok) {
          const pointsData = await pointsResponse.json();
          setPoints(pointsData || []);
        }

        // Fetch teams
        const teamsResponse = await fetch(`/api/teams?seasonId=${selectedSeason.id}`);
        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          setTeams(teamsData || []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSeason]);

  // Calculate standings
  const standings = useMemo(() => {
    const driversInDivision = drivers
      .filter((d) => d.division === selectedDivision && d.status === 'ACTIVE')
      .map(driver => {
        // Calculate points per round for this driver from the points table
        const roundPoints: Array<{ roundId: string; roundNumber: number; roundName: string; location: string; points: number }> = [];
        
        // Get all points for this driver (regardless of division they raced in)
        // This ensures drivers who were promoted/demoted can see their historical points
        const driverPoints = points.filter((p: any) => p.driverId === driver.id);
        
        // Create a map of roundId -> total points for this driver
        const pointsByRound: Record<string, number> = {};
        driverPoints.forEach((p: any) => {
          const roundId = p.roundId;
          if (!pointsByRound[roundId]) {
            pointsByRound[roundId] = 0;
          }
          pointsByRound[roundId] += parseFloat(p.points) || 0;
        });
        
        // For each round, add points (0 if driver didn't participate)
        rounds.forEach(round => {
          const roundTotal = pointsByRound[round.id] || 0;
          roundPoints.push({
            roundId: round.id,
            roundNumber: round.roundNumber || 0,
            roundName: round.location || 'TBD',
            location: round.location || round.address || 'TBA',
            points: roundTotal,
          });
        });

        // Calculate drop round
        const totalRounds = rounds.length;
        const participatedRounds = roundPoints.filter(rp => rp.points > 0).length;
        const missedRounds = totalRounds - participatedRounds;
        
        let dropRound: { roundId: string; roundNumber: number; roundName: string; location: string; points: number } | null = null;
        
        if (missedRounds === 1) {
          // If they missed exactly one race, drop that round (0 points)
          const missedRoundPoint = roundPoints.find(rp => rp.points === 0);
          if (missedRoundPoint) {
            dropRound = missedRoundPoint;
          }
        } else if (participatedRounds === totalRounds && roundPoints.length > 0) {
          // If they attended all rounds, drop the lowest scoring round (can be 0)
          dropRound = roundPoints.reduce((min, current) => 
            current.points < min.points ? current : min
          );
        } else if (missedRounds > 1) {
          // If they missed multiple races, drop one of the 0-point rounds
          const zeroPointRounds = roundPoints.filter(rp => rp.points === 0);
          if (zeroPointRounds.length > 0) {
            dropRound = zeroPointRounds[0];
          }
        }

        // Calculate total points (sum of all rounds - drop round)
        const totalPoints = roundPoints.reduce((sum, rp) => sum + rp.points, 0);
        const finalPoints = dropRound ? totalPoints - dropRound.points : totalPoints;

        return {
          ...driver,
          roundPoints,
          dropRound,
          totalPoints: finalPoints,
          rawTotalPoints: totalPoints,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((driver, index) => ({
        ...driver,
        rank: index + 1,
      }));

    return driversInDivision;
  }, [drivers, rounds, points, selectedDivision]);

  // Update selected division if it's not available in current view mode
  useEffect(() => {
    if (viewMode === 'teams' && (selectedDivision === 'Division 3' || selectedDivision === 'Division 4')) {
      setSelectedDivision('Division 1');
    }
  }, [viewMode, selectedDivision]);

  // Calculate team standings - total points combined per team per round
  const teamStandings = useMemo(() => {
    const teamsMap = new Map<string, { 
      name: string; 
      division: Division;
      drivers: any[]; // Drivers with points (for calculations)
      allDrivers?: any[]; // All drivers (for display)
      roundPoints: Array<{ roundId: string; roundNumber: number; roundName: string; location: string; points: number }>;
      totalPoints: number;
    }>();
    
    // Initialize all teams from the teams list (even if they have no drivers with points)
    teams.forEach((team: any) => {
      // Use team's division from teams table (not driver division)
      // Only use selectedDivision as fallback if team.division is null/undefined/empty
      const teamDivision = (team.division && team.division.trim() !== '') 
        ? (team.division as Division) 
        : (selectedDivision as Division);
      
      // Only include teams that match the selected division exactly
      if (teamDivision === selectedDivision) {
        // Get all drivers for this team (regardless of driver's division, since team division is what matters)
        const teamDrivers = drivers.filter((d: any) => d.teamName === team.name);
        
        // Get drivers with points from standings for this team
        const driversWithPoints = standings.filter((d: any) => d.teamName === team.name);
        
        teamsMap.set(team.name, { 
          name: team.name, 
          division: teamDivision, // Use team's division, not driver's division
          drivers: driversWithPoints, // Drivers with points for calculations
          allDrivers: teamDrivers, // All drivers for display (from drivers list, not standings)
          roundPoints: [],
          totalPoints: 0 
        });
      }
    });
    
    // Group drivers by team from standings (drivers with points) - for teams not in teams list
    // Only add teams that match the selected division
    standings.forEach((driver) => {
      if (driver.teamName) {
        const teamName = driver.teamName;
        if (!teamsMap.has(teamName)) {
          // Team not in teams list, but has drivers with points - add it
          // Try to find team in teams list to get its division
          const teamFromList = teams.find((t: any) => t.name === teamName);
          const teamDivision = (teamFromList?.division && teamFromList.division.trim() !== '') 
            ? (teamFromList.division as Division) 
            : (selectedDivision as Division);
          
          // Only add if team division matches selected division
          if (teamDivision === selectedDivision) {
            const allTeamDrivers = drivers.filter((d: any) => d.teamName === teamName);
            teamsMap.set(teamName, { 
              name: teamName, 
              division: teamDivision, // Use team's division if found, otherwise selected division
              drivers: [driver], 
              allDrivers: allTeamDrivers,
              roundPoints: [],
              totalPoints: 0 
            });
          }
        } else {
          // Add driver to existing team
          const team = teamsMap.get(teamName)!;
          if (!team.drivers.find((d: any) => d.id === driver.id)) {
            team.drivers.push(driver);
          }
        }
      }
    });
    
    // Calculate points per round for each team (sum of all drivers' points for that round)
    teamsMap.forEach((team) => {
      // Initialize round points map with all rounds
      const roundPointsMap: Record<string, { roundId: string; roundNumber: number; roundName: string; location: string; points: number }> = {};
      
      // Initialize all rounds from rounds list
      rounds.forEach((round: any) => {
        roundPointsMap[round.id] = {
          roundId: round.id,
          roundNumber: round.roundNumber || 0,
          roundName: round.location || 'TBD',
          location: round.location || round.address || 'TBA',
          points: 0
        };
      });
      
      // For each driver in the team, sum up their points for each round
      team.drivers.forEach((driver) => {
        driver.roundPoints.forEach((round: { roundId: string; roundNumber: number; roundName: string; location: string; points: number }) => {
          if (roundPointsMap[round.roundId]) {
            // Sum up points from all drivers for this round
            roundPointsMap[round.roundId].points += round.points;
          }
        });
      });
      
      // Convert to array and sort by round number
      team.roundPoints = Object.values(roundPointsMap).sort((a, b) => a.roundNumber - b.roundNumber);
      
      // Calculate total points (sum of all round points)
      team.totalPoints = team.roundPoints.reduce((sum, rp) => sum + rp.points, 0);
    });
    
    return Array.from(teamsMap.values())
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((team, index) => ({
        ...team,
        rank: index + 1,
      }));
  }, [standings, rounds, teams, drivers, selectedDivision]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-amber-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return null;
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
                <p className="text-slate-600 dark:text-slate-400">Loading standings...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageLayout
        title={viewMode === 'drivers' ? 'Driver Standings' : 'Team Standings'}
        subtitle="View current standings across all divisions"
        icon={BarChart3}
        headerActions={
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('drivers')}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                viewMode === 'drivers'
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                  : 'glass text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Drivers
            </button>
            <button
              onClick={() => setViewMode('teams')}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                viewMode === 'teams'
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                  : 'glass text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <UsersRound className="w-4 h-4 inline mr-2" />
              Teams
            </button>
          </div>
        }
      >
        {/* Division Filter */}
        <SectionCard
          title="Select Division"
          className="mb-8"
        >
          <div className="flex flex-wrap gap-2">
            {divisions.map((div) => (
              <button
                key={div}
                onClick={() => setSelectedDivision(div)}
                className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                  selectedDivision === div
                    ? `bg-gradient-to-r ${getDivisionGradient(div)} text-white shadow-lg`
                    : 'glass text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {div}
              </button>
            ))}
          </div>
        </SectionCard>

        {/* Standings Content */}
        {viewMode === 'drivers' ? (
          <SectionCard
            title={`${selectedDivision} Driver Standings`}
            icon={Users}
          >
            {standings.length === 0 ? (
              <div className="text-center py-12">
                  <p className="text-slate-500 dark:text-slate-400">
                    No drivers found in {selectedDivision}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {standings.map((driver) => (
                  <div
                    key={driver.id}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-shrink-0 w-64">
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20 text-primary font-bold text-sm">
                            {driver.rank}
                          </div>
                          {getRankIcon(driver.rank)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                            {driver.name}
                          </h3>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 justify-center flex-1 min-w-0">
                        {driver.roundPoints.map((round: { roundId: string; roundNumber: number; roundName: string; location: string; points: number }) => (
                          <div
                            key={round.roundId}
                            className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-2 min-w-[100px] flex-shrink-0"
                          >
                            <div className="text-xs text-slate-600 dark:text-slate-400 mb-0.5">
                              R{round.roundNumber}
                            </div>
                            <div className="text-base font-bold text-slate-900 dark:text-white mb-0.5">
                              {round.points}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {round.location}
                            </div>
                          </div>
                        ))}
                        
                        {driver.dropRound && (
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-200 dark:border-red-800 p-2 min-w-[100px] flex-shrink-0">
                            <div className="text-xs text-red-700 dark:text-red-400 mb-0.5 font-semibold">
                              Drop
                            </div>
                            <div className="text-base font-bold text-red-900 dark:text-red-200 mb-0.5">
                              {driver.dropRound.points}
                            </div>
                            <div className="text-xs text-red-600 dark:text-red-400 truncate">
                              R{driver.dropRound.roundNumber}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-slate-600 dark:text-slate-400">Total Points</div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                          {driver.totalPoints.toLocaleString()}
                        </div>
                        {driver.dropRound && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            (Dropped: {driver.dropRound.points})
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </SectionCard>
          ) : (
            <SectionCard
              title={`${selectedDivision} Team Standings`}
              icon={UsersRound}
            >
              {teamStandings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 dark:text-slate-400">
                    No teams found in {selectedDivision}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teamStandings.map((team) => (
                  <div
                    key={team.name}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 flex-shrink-0 w-64">
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20 text-primary font-bold text-sm">
                            {team.rank}
                          </div>
                          {getRankIcon(team.rank)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                            {team.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${getDivisionColor(team.division)}`}>
                              {team.division}
                            </span>
                            {(() => {
                              const driversToShow = (team.allDrivers && team.allDrivers.length > 0) ? team.allDrivers : team.drivers;
                              return driversToShow.length > 0 ? (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-xs text-slate-600 dark:text-slate-400">
                                    {driversToShow.map((driver: any, idx: number) => (
                                      <span key={driver.id || driver.driverId || idx}>
                                        {driver.name || driver.driverName}
                                        {idx < driversToShow.length - 1 && ', '}
                                      </span>
                                    ))}
                                  </span>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  No drivers
                                </p>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 justify-center flex-1 min-w-0">
                        {team.roundPoints.map((round: { roundId: string; roundNumber: number; roundName: string; location: string; points: number }) => (
                          <div
                            key={round.roundId}
                            className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-2 min-w-[100px] flex-shrink-0"
                          >
                            <div className="text-xs text-slate-600 dark:text-slate-400 mb-0.5">
                              R{round.roundNumber}
                            </div>
                            <div className="text-base font-bold text-slate-900 dark:text-white mb-0.5">
                              {round.points}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {round.location}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-slate-600 dark:text-slate-400">Total Points</div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                          {team.totalPoints.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}
      </PageLayout>
    </>
  );
}
