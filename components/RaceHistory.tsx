'use client';

import { useState, useEffect, useMemo } from 'react';
import { Race, Division } from '@/types';
import { Calendar, MapPin, Trophy, Clock, Medal, Award } from 'lucide-react';

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

interface RaceHistoryProps {
  races: Race[];
  drivers?: any[];
  points?: any[];
  rounds?: any[];
}

export default function RaceHistory({ races, drivers = [], points = [], rounds = [] }: RaceHistoryProps) {
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<Division>('Division 1');
  const [raceResults, setRaceResults] = useState<any[]>([]);

  // Show all races sorted by round number (first race at top)
  const sortedRaces = [...races].sort(
    (a, b) => {
      const roundA = a.round || a.roundNumber || 0;
      const roundB = b.round || b.roundNumber || 0;
      return roundA - roundB;
    }
  );

  // Get the selected race object based on ID
  const selectedRace = sortedRaces.find(r => r.id === selectedRaceId) || null;

  // Set default race to first race if available, and reset selection when races change
  useEffect(() => {
    if (sortedRaces.length > 0) {
      // Check if current selected race ID still exists in the new races list
      if (!selectedRaceId) {
        // No race selected, select the first one
        setSelectedRaceId(sortedRaces[0].id);
      } else {
        const raceStillExists = sortedRaces.some(r => r.id === selectedRaceId);
        if (!raceStillExists) {
          // If selected race doesn't exist in new list, select the first one
          setSelectedRaceId(sortedRaces[0].id);
        }
      }
    } else {
      // No races available, clear selection
      setSelectedRaceId(null);
    }
    // Only run when sortedRaces changes, not when selectedRaceId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedRaces]);

  // Fetch race results for selected race
  useEffect(() => {
    if (selectedRaceId) {
      fetch(`/api/race-results?roundId=${selectedRaceId}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          // Flatten the nested structure { division, results } to a flat array
          const flatResults: any[] = [];
          if (Array.isArray(data)) {
            data.forEach((divisionData: any) => {
              if (divisionData.results && Array.isArray(divisionData.results)) {
                flatResults.push(...divisionData.results);
              }
            });
          }
          setRaceResults(flatResults);
        })
        .catch(() => setRaceResults([]));
    } else {
      setRaceResults([]);
    }
  }, [selectedRaceId]);

  // Calculate standings by division - round-specific if race is selected, overall otherwise
  const standings = useMemo(() => {
    if (!selectedRace) {
      // No race selected - show overall standings
      const driversInDivision = drivers
        .filter((d) => d.division === selectedDivision && d.status === 'ACTIVE')
        .map(driver => {
          // Get all points for this driver (regardless of division they raced in)
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
          
          // Calculate total points
          const totalPoints = Object.values(pointsByRound).reduce((sum, pts) => sum + pts, 0);
          
          return {
            ...driver,
            totalPoints,
            roundsParticipated: Object.keys(pointsByRound).length,
          };
        })
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .map((driver, index) => ({
          ...driver,
          position: index + 1,
        }));

      return driversInDivision;
    } else {
      // Race selected - show standings sorted by final race position
      const roundId = selectedRace.id;
      
      // Get final race results for this division
      // Filter by raceName contains 'final', division match, and valid overallPosition
      const finalResults = raceResults.filter((r: any) => {
        const isFinal = (r.raceName || '').toLowerCase().includes('final');
        const divisionMatch = r.driverDivision === selectedDivision;
        const hasPosition = r.overallPosition !== null && r.overallPosition !== undefined;
        
        return isFinal && divisionMatch && hasPosition;
      });

      // Get points for this specific round
      const roundPoints = points.filter((p: any) => p.roundId === roundId);

      // If we have final results, sort by race position
      if (finalResults.length > 0) {
        // Sort by final type alphabetically (A, B, C, D) and then by overall position
        finalResults.sort((a: any, b: any) => {
          // Sort by finalType alphabetically first
          const finalTypeA = (a.finalType || '').toUpperCase();
          const finalTypeB = (b.finalType || '').toUpperCase();
          
          if (finalTypeA !== finalTypeB) {
            return finalTypeA.localeCompare(finalTypeB);
          }
          
          // Then sort by overall position
          const posA = parseInt(String(a.overallPosition)) || 999;
          const posB = parseInt(String(b.overallPosition)) || 999;
          return posA - posB;
        });
        
        // Map drivers with their results - assign sequential positions for this division
        const standingsList = finalResults.map((result: any, index: number) => {
          const driver = drivers.find(d => d.id === result.driverId);
          const driverPoints = roundPoints.filter((p: any) => p.driverId === result.driverId);
          const totalPoints = driverPoints.reduce((sum, p) => sum + (parseFloat(p.points) || 0), 0);
          
          return {
            ...(driver || { id: result.driverId, name: result.driverName || 'Unknown Driver', teamName: result.teamName }),
            totalPoints,
            roundsParticipated: 1,
            position: index + 1, // Sequential position within this division (1, 2, 3...)
            finalType: result.finalType,
            overallPosition: result.overallPosition,
          };
        });
        
        return standingsList;
      } else {
        // No final results yet - fall back to points-based sorting
        const driverPointsMap: Record<string, { driver: any; points: number; division: Division }> = {};
        
        roundPoints.forEach((point: any) => {
          const driverId = point.driverId;
          const driver = drivers.find(d => d.id === driverId);
          
          if (driver && point.division === selectedDivision) {
            if (!driverPointsMap[driverId]) {
              driverPointsMap[driverId] = {
                driver,
                points: 0,
                division: point.division,
              };
            }
            driverPointsMap[driverId].points += parseFloat(point.points) || 0;
          }
        });
        
        // Convert to array and sort by points
        const standingsList = Object.values(driverPointsMap)
          .map(({ driver, points: totalPoints }) => ({
            ...driver,
            totalPoints,
            roundsParticipated: 1,
          }))
          .sort((a, b) => b.totalPoints - a.totalPoints)
          .map((driver, index) => ({
            ...driver,
            position: index + 1,
          }));
        
        return standingsList;
      }
    }
  }, [drivers, points, selectedDivision, selectedRace]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-amber-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-slate-400" />;
    if (rank === 3) return <Award className="w-4 h-4 text-amber-600" />;
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Panel 1: Race List */}
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden h-full flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Races
            </h3>
          </div>
          <div className="overflow-y-auto flex-1">
            {sortedRaces.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                No races available.
              </div>
            ) : (
              <div>
                {sortedRaces.map((race, index) => (
                  <div
                    key={race.id}
                    onClick={() => {
                      setSelectedRaceId(race.id);
                      // Set default division to Division 1 if available, otherwise first available
                      const divisions = race.results?.map((r) => r.division) || [];
                      if (divisions.includes('Division 1')) {
                        setSelectedDivision('Division 1');
                      } else if (divisions.length > 0) {
                        setSelectedDivision(divisions[0]);
                      }
                    }}
                    className={`p-4 cursor-pointer transition-all ${
                      index > 0 ? 'border-t border-slate-200 dark:border-slate-700' : ''
                    } ${
                      selectedRaceId === race.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500 !border-l-blue-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    style={
                      selectedRaceId === race.id
                        ? { borderLeftWidth: '4px', borderLeftColor: '#3b82f6' }
                        : undefined
                    }
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        Round {race.round || race.roundNumber || 'N/A'}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                        race.status === 'completed' 
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : race.status === 'upcoming'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      }`}>
                        {race.status.charAt(0).toUpperCase() + race.status.slice(1).toLowerCase()}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{race.season} • Round {race.round}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{race.location}</span>
                      </div>
                      <div className="text-xs">
                        {new Date(race.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel 2: Standings with Division Filter */}
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden h-full flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Round Results
                </h3>
                {selectedRace && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {selectedRace.name} • Round {selectedRace.round}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {(['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New'] as Division[]).map((division) => (
                <button
                  key={division}
                  onClick={() => setSelectedDivision(division)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    selectedDivision === division
                      ? `${getDivisionColor(division)} ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-600 shadow-md`
                      : `${getDivisionColor(division)} opacity-60 hover:opacity-100`
                  }`}
                >
                  {division}
                </button>
              ))}
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(100vh - 500px)', minHeight: '400px' }}>
            {standings.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                No drivers found in {selectedDivision}
              </div>
            ) : (
              <div className="p-4">
                {/* Podium - Top 3 */}
                {standings.slice(0, 3).length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-3">
                      Podium
                    </h4>
                    <div className="space-y-2">
                      {standings.slice(0, 3).map((driver) => (
                        <div
                          key={driver.id}
                          className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          <div className="flex items-center gap-2">
                            {getRankIcon(driver.position)}
                            <span className="text-lg font-bold text-slate-900 dark:text-white">
                              {driver.position}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {driver.name}
                            </div>
                            {driver.teamName && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {driver.teamName}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              {Math.round(driver.totalPoints)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              pts
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remaining Drivers */}
                {standings.slice(3).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-3">
                      Other Finishers
                    </h4>
                    <div className="space-y-1">
                      {standings.slice(3).map((driver) => (
                        <div
                          key={driver.id}
                          className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors"
                        >
                          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 w-8">
                            {driver.position}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-slate-900 dark:text-white truncate">
                              {driver.name}
                            </div>
                          </div>
                          <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            {Math.round(driver.totalPoints)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

