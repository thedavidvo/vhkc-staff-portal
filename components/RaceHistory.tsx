'use client';

import { useState, useEffect, useMemo } from 'react';
import { Race, Division } from '@/types';
import { MapPin, Trophy, Medal, Award } from 'lucide-react';
import { useSeason } from '@/components/SeasonContext';
import { getSeasonNumber, getDivisionsForSeason } from '@/lib/divisions';

interface RaceHistoryProps {
  races: Race[];
  drivers?: any[];
  points?: any[];
  rounds?: any[];
}

export default function RaceHistory({ races, drivers = [], points = [], rounds = [] }: RaceHistoryProps) {
  const { selectedSeason } = useSeason();
  const seasonNumber = getSeasonNumber(selectedSeason);
  const divisionsForSeason = getDivisionsForSeason(seasonNumber);
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Panel 1: Race List */}
      <div className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Rounds</h3>
        </div>
        <div className="overflow-y-auto flex-1" style={{ maxHeight: '420px' }}>
          {sortedRaces.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No races available.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedRaces.map((race) => (
                <div
                  key={race.id}
                  onClick={() => {
                    setSelectedRaceId(race.id);
                    const divisions = race.results?.map((r) => r.division) || [];
                    if (divisions.includes('Division 1')) {
                      setSelectedDivision('Division 1');
                    } else if (divisions.length > 0) {
                      setSelectedDivision(divisions[0]);
                    }
                  }}
                  className={`px-3 py-3 cursor-pointer transition-colors ${
                    selectedRaceId === race.id
                      ? 'bg-slate-900 dark:bg-slate-100'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-semibold ${
                      selectedRaceId === race.id ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'
                    }`}>
                      Round {race.round || race.roundNumber || 'N/A'}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      race.status === 'completed'
                        ? selectedRaceId === race.id ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900' : 'text-green-700 dark:text-green-400'
                        : selectedRaceId === race.id ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {race.status.charAt(0).toUpperCase() + race.status.slice(1)}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs ${
                    selectedRaceId === race.id ? 'text-white/70 dark:text-slate-900/60' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    <MapPin className="w-3 h-3" />
                    <span>{race.location || 'TBD'}</span>
                    {race.date && (
                      <>
                        <span>·</span>
                        <span>{new Date(race.date).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panel 2: Standings with Division Filter */}
      <div className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {selectedRace ? `Round ${selectedRace.round} Results` : 'Results'}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {divisionsForSeason.map((division) => (
              <button
                key={division}
                onClick={() => setSelectedDivision(division)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors border ${
                  selectedDivision === division
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {division}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1" style={{ maxHeight: '370px' }}>
          {standings.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No results for {selectedDivision}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase w-10">Pos</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Driver</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {standings.map((driver) => (
                  <tr key={driver.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {getRankIcon(driver.position)}
                        {driver.position > 3 && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 w-4">{driver.position}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-sm font-medium ${
                        driver.position <= 3 ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {driver.name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {Math.round(driver.totalPoints)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

