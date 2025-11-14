'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
// TODO: Replace with API calls to fetch drivers and races by season
import { Division, RaceResult } from '@/types';
import { Trophy, Medal, Award } from 'lucide-react';

// TODO: Replace with API call to fetch race history for a driver
const getDriverRaceHistory = (driverId: string, races: any[]): RaceResult[] => {
  const history: RaceResult[] = [];
  
  races
    .filter((race) => race.status === 'completed' && race.results)
    .forEach((race) => {
      race.results?.forEach((divisionResult: any) => {
        const driverResult = divisionResult.results.find((r: any) => r.driverId === driverId);
        if (driverResult) {
          history.push({
            raceId: race.id,
            raceName: race.name,
            trackName: race.location,
            season: race.season,
            round: race.round,
            position: driverResult.position,
            qualificationTime: `1:${(Math.floor(Math.random() * 5) + 15).toString().padStart(2, '0')}.${Math.floor(Math.random() * 99).toString().padStart(2, '0')}`,
            fastestLap: driverResult.fastestLap,
            points: driverResult.points,
            date: race.date,
          });
        }
      });
    });
  
  return history.sort((a, b) => a.round - b.round);
};

export default function StandingsPage() {
  const [selectedDivision, setSelectedDivision] = useState<Division>('Division 1');
  const [viewMode, setViewMode] = useState<'drivers' | 'teams'>('drivers');

  const divisions: Division[] = ['Division 1', 'Division 2', 'Division 3', 'Division 4'];
  
  // TODO: Fetch drivers and races from API based on selected season
  const [drivers] = useState<any[]>([]);
  const [races] = useState<any[]>([]);

  const standings = useMemo(() => {
    const driversInDivision = drivers
      .filter((d) => d.division === selectedDivision && d.status === 'ACTIVE')
      .sort((a, b) => b.pointsTotal - a.pointsTotal);

    return driversInDivision.map((driver, index) => {
      const raceHistory = getDriverRaceHistory(driver.id, races);
      const roundPoints = raceHistory.map((race) => ({
        round: race.round,
        points: race.points,
        raceName: race.raceName,
      }));
      
      // Find the lowest points round (drop round)
      const dropRound = roundPoints.length > 0 
        ? roundPoints.reduce((min, current) => current.points < min.points ? current : min)
        : null;
      
      return {
        ...driver,
        rank: index + 1,
        roundPoints,
        dropRound,
      };
    });
  }, [selectedDivision, drivers, races]);

  // Calculate team standings
  const teamStandings = useMemo(() => {
    const teamsMap = new Map<string, { name: string; drivers: any[]; totalPoints: number }>();
    
    drivers
      .filter((d) => d.division === selectedDivision && d.status === 'ACTIVE' && d.teamName)
      .forEach((driver) => {
        const teamName = driver.teamName!;
        if (!teamsMap.has(teamName)) {
          teamsMap.set(teamName, { name: teamName, drivers: [], totalPoints: 0 });
        }
        const team = teamsMap.get(teamName)!;
        team.drivers.push(driver);
        team.totalPoints += driver.pointsTotal;
      });
    
    return Array.from(teamsMap.values())
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((team, index) => ({
        ...team,
        rank: index + 1,
      }));
  }, [selectedDivision, drivers]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-amber-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return null;
  };

  return (
    <>
      <Header hideSearch />
      <div className="p-4 md:p-6">
        <div className="max-w-[95%] mx-auto">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {viewMode === 'drivers' ? 'Driver Standings' : 'Team Standings'}
              </h1>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('drivers')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    viewMode === 'drivers'
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  Drivers
                </button>
                <button
                  onClick={() => setViewMode('teams')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    viewMode === 'teams'
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  Teams
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {divisions.map((div) => (
                <button
                  key={div}
                  onClick={() => setSelectedDivision(div)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedDivision === div
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>
          </div>

          {viewMode === 'drivers' ? (
            <div className="space-y-4">
              {standings.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-8 text-center">
                  <p className="text-slate-500 dark:text-slate-400">
                    No drivers found in {selectedDivision}
                  </p>
                </div>
              ) : (
                standings.map((driver) => (
                  <div
                    key={driver.id}
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getRankIcon(driver.rank)}
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {driver.name}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {driver.teamName || 'No Team'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-600 dark:text-slate-400">Total Points</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                          {driver.pointsTotal.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {driver.roundPoints.map((round) => (
                        <div
                          key={round.round}
                          className="bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                        >
                          <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                            Round {round.round}
                          </div>
                          <div className="text-lg font-bold text-slate-900 dark:text-white">
                            {round.points}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-500 truncate mt-1">
                            {round.raceName}
                          </div>
                        </div>
                      ))}
                      
                      {driver.dropRound && (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-3">
                          <div className="text-xs text-red-700 dark:text-red-400 mb-1 font-semibold">
                            Drop Round
                          </div>
                          <div className="text-lg font-bold text-red-900 dark:text-red-200">
                            {driver.dropRound.points}
                          </div>
                          <div className="text-xs text-red-600 dark:text-red-400 truncate mt-1">
                            Round {driver.dropRound.round}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {teamStandings.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-8 text-center">
                  <p className="text-slate-500 dark:text-slate-400">
                    No teams found in {selectedDivision}
                  </p>
                </div>
              ) : (
                teamStandings.map((team) => (
                  <div
                    key={team.name}
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getRankIcon(team.rank)}
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {team.name}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {team.drivers.length} driver{team.drivers.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-600 dark:text-slate-400">Total Points</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                          {team.totalPoints.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Drivers:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {team.drivers.map((driver) => {
                          const raceHistory = getDriverRaceHistory(driver.id);
                          const roundPoints = raceHistory.map((race) => ({
                            round: race.round,
                            points: race.points,
                            raceName: race.raceName,
                          }));
                          
                          return (
                            <div
                              key={driver.id}
                              className="bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {driver.name}
                                  </div>
                                  <div className="text-xs text-slate-600 dark:text-slate-400">
                                    {driver.pointsTotal.toLocaleString()} pts
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {roundPoints.map((round) => (
                                  <div
                                    key={round.round}
                                    className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300"
                                  >
                                    R{round.round}: {round.points}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

