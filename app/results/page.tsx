'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import { useSeason } from '@/components/SeasonContext';
import { Division } from '@/types';
import { getPointsForPosition } from '@/lib/pointsSystem';
import { Loader2, Filter, Trophy } from 'lucide-react';

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
      return 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200';
  }
};

interface RaceResult {
  roundId: string;
  roundName: string;
  roundNumber: number;
  date: string;
  driverId: string;
  driverName: string;
  division: Division;
  position: number;
  fastestLap: string;
  points: number;
  raceType?: string;
}

export default function ResultsPage() {
  const { selectedSeason } = useSeason();
  const [rounds, setRounds] = useState<any[]>([]);
  const [raceResults, setRaceResults] = useState<RaceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDivisions, setSelectedDivisions] = useState<Division[]>([]);
  const [selectedRaceTypes, setSelectedRaceTypes] = useState<string[]>([]);
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [sortBy, setSortBy] = useState<'position' | 'time' | 'points'>('position');

  // Helper function to parse time - time is in decimal format (e.g., 60.131)
  const parseTime = (timeStr: string): number => {
    if (!timeStr) return Infinity;
    // Time is already a decimal number, just parse it
    const time = parseFloat(timeStr);
    return isNaN(time) ? Infinity : time;
  };

  // Fetch rounds and race results
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedSeason) {
        setRounds([]);
        setRaceResults([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const roundsResponse = await fetch(`/api/rounds?seasonId=${selectedSeason.id}`);
        
        if (roundsResponse.ok) {
          const roundsData = await roundsResponse.json();
          setRounds(roundsData.sort((a: any, b: any) => {
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            return dateA - dateB;
          }));

          // Fetch results for each round
          const allResults: RaceResult[] = [];
          for (const round of roundsData) {
            try {
              const resultsResponse = await fetch(`/api/race-results?roundId=${round.id}`);
              if (resultsResponse.ok) {
                const resultsData = await resultsResponse.json();
                // Flatten the results structure
                resultsData.forEach((divisionResult: any) => {
                  divisionResult.results?.forEach((result: any) => {
                    allResults.push({
                      roundId: round.id,
                      roundName: round.name,
                      roundNumber: round.roundNumber || 0,
                      date: round.date,
                      driverId: result.driverId,
                      driverName: result.driverName || '',
                      division: divisionResult.division,
                      position: result.position,
                      fastestLap: result.fastestLap || '',
                      points: result.points || 0,
                      raceType: result.raceType || 'qualification',
                    });
                  });
                });
              }
            } catch (error) {
              console.error(`Error fetching results for round ${round.id}:`, error);
            }
          }
          setRaceResults(allResults);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSeason]);

  // Get unique race types from results
  const availableRaceTypes = useMemo(() => {
    const types = new Set<string>();
    raceResults.forEach(r => {
      if (r.raceType) types.add(r.raceType);
    });
    return Array.from(types).sort();
  }, [raceResults]);

  // Filter results
  const filteredResults = useMemo(() => {
    let filtered = [...raceResults];

    // Filter by divisions (multiple)
    if (selectedDivisions.length > 0) {
      filtered = filtered.filter(r => selectedDivisions.includes(r.division));
    }

    // Filter by race types (multiple)
    if (selectedRaceTypes.length > 0) {
      filtered = filtered.filter(r => r.raceType && selectedRaceTypes.includes(r.raceType));
    }

    // Filter by round (single)
    if (selectedRound) {
      filtered = filtered.filter(r => r.roundId === selectedRound);
    }

    // Sort based on selected sort option
    return filtered.sort((a, b) => {
      // First sort by round date
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      
      // Then by selected sort option
      if (sortBy === 'time') {
        // Sort by fastest lap time (parse time string)
        const timeA = parseTime(a.fastestLap);
        const timeB = parseTime(b.fastestLap);
        return timeA - timeB;
      } else if (sortBy === 'points') {
        return b.points - a.points; // Descending
      } else {
        // Default: by position
        return a.position - b.position;
      }
    });
  }, [raceResults, selectedDivisions, selectedRaceTypes, selectedRound, sortBy]);

  // Calculate overall position based on sorted results
  // Overall position is calculated within each race (round + raceType) based on the current sort order
  const resultsWithOverallPosition = useMemo(() => {
    // Group by round and race type to calculate overall position per race
    const grouped: Record<string, Record<string, RaceResult[]>> = {};
    filteredResults.forEach(result => {
      const roundKey = result.roundId;
      const typeKey = result.raceType || 'unknown';
      if (!grouped[roundKey]) {
        grouped[roundKey] = {};
      }
      if (!grouped[roundKey][typeKey]) {
        grouped[roundKey][typeKey] = [];
      }
      grouped[roundKey][typeKey].push(result);
    });

    // Create a map to store overall positions
    const positionMap = new Map<string, number>();
    
    // Calculate overall position for each race group based on sortBy
    Object.keys(grouped).forEach(roundKey => {
      Object.keys(grouped[roundKey]).forEach(typeKey => {
        const raceResults = grouped[roundKey][typeKey];
        // Sort within each race group based on sortBy
        const sorted = [...raceResults].sort((a, b) => {
          if (sortBy === 'time') {
            const timeA = parseTime(a.fastestLap);
            const timeB = parseTime(b.fastestLap);
            if (timeA !== timeB) return timeA - timeB;
            // If times are equal, sort by position
            return a.position - b.position;
          } else if (sortBy === 'points') {
            if (b.points !== a.points) return b.points - a.points;
            // If points are equal, sort by position
            return a.position - b.position;
          } else {
            // Sort by position (race finish)
            return a.position - b.position;
          }
        });

        // Assign overall positions (1-based)
        sorted.forEach((result, index) => {
          const key = `${result.roundId}-${result.driverId}-${result.raceType}`;
          positionMap.set(key, index + 1);
        });
      });
    });

    // Map results with overall positions
    return filteredResults.map(result => {
      const key = `${result.roundId}-${result.driverId}-${result.raceType}`;
      return {
        ...result,
        overallPosition: positionMap.get(key) || 0,
      };
    });
  }, [filteredResults, sortBy]);

  // Group results by round and race type for comparison
  const groupedResults = useMemo(() => {
    const grouped: Record<string, Record<string, RaceResult[]>> = {};
    filteredResults.forEach(result => {
      const roundKey = result.roundId;
      const typeKey = result.raceType || 'unknown';
      if (!grouped[roundKey]) {
        grouped[roundKey] = {};
      }
      if (!grouped[roundKey][typeKey]) {
        grouped[roundKey][typeKey] = [];
      }
      grouped[roundKey][typeKey].push(result);
    });
    return grouped;
  }, [filteredResults]);

  if (loading) {
    return (
      <>
        <Header hideSearch />
        <div className="p-4 md:p-6">
          <div className="max-w-[95%] mx-auto">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                <p className="text-slate-600 dark:text-slate-400">Loading results...</p>
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-6">
            Race Results
          </h1>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Filters</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Round Filter - Dropdown (Single) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Round
                </label>
                <select
                  value={selectedRound}
                  onChange={(e) => setSelectedRound(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Rounds</option>
                  {rounds.map(round => (
                    <option key={round.id} value={round.id}>
                      Round {round.roundNumber}: {round.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Division Filter - Multiple */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Divisions (Multiple)
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-300 dark:border-slate-600 rounded-lg p-2">
                  {['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New'].map(division => (
                    <label key={division} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedDivisions.includes(division as Division)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDivisions([...selectedDivisions, division as Division]);
                          } else {
                            setSelectedDivisions(selectedDivisions.filter(d => d !== division));
                          }
                        }}
                        className="rounded border-slate-300 dark:border-slate-600"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{division}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Race Type Filter - Buttons (Multiple) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Race Type (Multiple)
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableRaceTypes.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        if (selectedRaceTypes.includes(type)) {
                          setSelectedRaceTypes(selectedRaceTypes.filter(t => t !== type));
                        } else {
                          setSelectedRaceTypes([...selectedRaceTypes, type]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedRaceTypes.includes(type)
                          ? 'bg-primary-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                  {availableRaceTypes.length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No race types available</p>
                  )}
                </div>
              </div>

              {/* Sort By Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'position' | 'time' | 'points')}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="position">By Grid Finish</option>
                  <option value="time">By Time</option>
                  <option value="points">By Points</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Overall Position
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Race Finish
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Driver
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Division
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Round
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Race Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Fastest Lap
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {resultsWithOverallPosition.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        No results found. Adjust your filters or add race results.
                      </td>
                    </tr>
                  ) : (
                    resultsWithOverallPosition.map((result, index) => (
                      <tr key={`${result.roundId}-${result.driverId}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {result.overallPosition === 1 && <Trophy className="w-4 h-4 text-amber-500" />}
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {result.overallPosition}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {result.position}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                          {result.driverName || 'Unknown Driver'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getDivisionColor(result.division)}`}>
                            {result.division}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          Round {result.roundNumber}: {result.roundName}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 capitalize">
                            {result.raceType || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600 dark:text-slate-400">
                          {result.fastestLap || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                          {result.points}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

