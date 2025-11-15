'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import { useSeason } from '@/components/SeasonContext';
import { Division } from '@/types';
import { getPointsForPosition } from '@/lib/pointsSystem';
import { Loader2, Filter, Trophy, Plus, Save, X } from 'lucide-react';

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
  const [selectedRaceType, setSelectedRaceType] = useState<string>('');
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [sortBy, setSortBy] = useState<'position' | 'time' | 'points'>('position');
  const [isCreatingRecord, setIsCreatingRecord] = useState(false);
  const [newRecord, setNewRecord] = useState<Partial<RaceResult>>({
    roundId: '',
    driverId: '',
    driverName: '',
    division: 'Division 1',
    position: 0,
    fastestLap: '',
    raceType: 'final',
  });
  const [drivers, setDrivers] = useState<any[]>([]);
  
  // Race Results Records state
  const [recordRoundId, setRecordRoundId] = useState<string>('');
  const [recordDivision, setRecordDivision] = useState<Division | ''>('');
  const [recordRaceType, setRecordRaceType] = useState<string>('');
  const [isSavingRecord, setIsSavingRecord] = useState(false);

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
        setDrivers([]);
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
                      points: 0, // Will be calculated dynamically
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

  // Calculate points for each result based on position and race type
  const resultsWithPoints = useMemo(() => {
    return raceResults.map(result => {
      // Calculate points based on position and race type
      // Check if there's a heat race for this round to determine points calculation
      const roundHasHeat = raceResults.some(r => 
        r.roundId === result.roundId && r.raceType === 'heat'
      );
      
      const calculatedPoints = result.position > 0
        ? getPointsForPosition(
            result.position,
            (result.raceType || 'qualification') as 'qualification' | 'heat' | 'final',
            roundHasHeat
          )
        : 0;
      
      return {
        ...result,
        points: calculatedPoints,
      };
    });
  }, [raceResults]);

  // Filter results
  const filteredResults = useMemo(() => {
    let filtered = [...resultsWithPoints];

    // Filter by divisions (multiple)
    if (selectedDivisions.length > 0) {
      filtered = filtered.filter(r => selectedDivisions.includes(r.division));
    }

    // Filter by race type (single)
    if (selectedRaceType) {
      filtered = filtered.filter(r => r.raceType && r.raceType === selectedRaceType);
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
  }, [resultsWithPoints, selectedDivisions, selectedRaceType, selectedRound, sortBy]);

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

  // Get standings for selected race (for Race Results Records)
  const selectedRaceStandings = useMemo(() => {
    if (!recordRoundId || !recordDivision || !recordRaceType) {
      return [];
    }

    const standings = resultsWithPoints
      .filter(r => 
        r.roundId === recordRoundId && 
        r.division === recordDivision && 
        r.raceType === recordRaceType
      )
      .sort((a, b) => {
        // Sort by position for ranking
        if (a.position !== b.position) {
          return a.position - b.position;
        }
        // If positions are equal, sort by fastest lap
        return parseTime(a.fastestLap) - parseTime(b.fastestLap);
      })
      .map((result, index) => ({
        ...result,
        rank: index + 1,
      }));

    return standings;
  }, [resultsWithPoints, recordRoundId, recordDivision, recordRaceType, parseTime]);

  // Get unique race types from rounds for record selection
  const availableRecordRaceTypes = useMemo(() => {
    if (!recordRoundId || !recordDivision) return [];
    const types = new Set<string>();
    resultsWithPoints
      .filter(r => r.roundId === recordRoundId && r.division === recordDivision)
      .forEach(r => {
        if (r.raceType) types.add(r.raceType);
      });
    return Array.from(types).sort();
  }, [resultsWithPoints, recordRoundId, recordDivision]);

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
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Race Results
            </h1>
            <button
              onClick={() => setIsCreatingRecord(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-md"
            >
              <Plus className="w-5 h-5" />
              Create Race Result
            </button>
          </div>
          
          {/* Create Record Modal */}
          {isCreatingRecord && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Create Race Result
                  </h2>
                  <button
                    onClick={() => {
                      setIsCreatingRecord(false);
                      setNewRecord({
                        roundId: '',
                        driverId: '',
                        driverName: '',
                        division: 'Division 1',
                        position: 0,
                        fastestLap: '',
                        raceType: 'qualification',
                      });
                    }}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Round *
                    </label>
                    <select
                      value={newRecord.roundId || ''}
                      onChange={(e) => {
                        const round = rounds.find(r => r.id === e.target.value);
                        setNewRecord({ ...newRecord, roundId: e.target.value });
                      }}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select a round</option>
                      {rounds.map(round => (
                        <option key={round.id} value={round.id}>
                          Round {round.roundNumber}: {round.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Driver *
                    </label>
                    <select
                      value={newRecord.driverId || ''}
                      onChange={(e) => {
                        const driver = drivers.find(d => d.id === e.target.value);
                        setNewRecord({ 
                          ...newRecord, 
                          driverId: e.target.value,
                          driverName: driver?.name || '',
                          division: driver?.division || 'Division 1'
                        });
                      }}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select a driver</option>
                      {drivers.map(driver => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Position *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newRecord.position || ''}
                        onChange={(e) => setNewRecord({ ...newRecord, position: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Division *
                      </label>
                      <select
                        value={newRecord.division || 'Division 1'}
                        onChange={(e) => setNewRecord({ ...newRecord, division: e.target.value as Division })}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="Division 1">Division 1</option>
                        <option value="Division 2">Division 2</option>
                        <option value="Division 3">Division 3</option>
                        <option value="Division 4">Division 4</option>
                        <option value="New">New</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Race Type *
                    </label>
                    <select
                      value={newRecord.raceType || 'final'}
                      onChange={(e) => setNewRecord({ ...newRecord, raceType: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="qualification">Qualification</option>
                      <option value="heat">Heat</option>
                      <option value="final">Final</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Fastest Lap
                    </label>
                    <input
                      type="text"
                      value={newRecord.fastestLap || ''}
                      onChange={(e) => setNewRecord({ ...newRecord, fastestLap: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., 60.131"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={async () => {
                        if (!newRecord.roundId || !newRecord.driverId || !newRecord.position) {
                          alert('Please fill in all required fields (Round, Driver, Position)');
                          return;
                        }
                        
                        try {
                          // Calculate points
                          const roundHasHeat = raceResults.some(r => 
                            r.roundId === newRecord.roundId && r.raceType === 'heat'
                          );
                          const calculatedPoints = getPointsForPosition(
                            newRecord.position || 0,
                            (newRecord.raceType || 'qualification') as 'qualification' | 'heat' | 'final',
                            roundHasHeat
                          );
                          
                          const resultToSave = {
                            roundId: newRecord.roundId,
                            driverId: newRecord.driverId,
                            division: newRecord.division || 'Division 1',
                            position: newRecord.position || 0,
                            fastestLap: newRecord.fastestLap || '',
                            raceType: newRecord.raceType || 'final',
                            raceName: '',
                            confirmed: false,
                          };
                          
                          const response = await fetch('/api/race-results', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(resultToSave),
                          });
                          
                          if (response.ok) {
                            // Refresh data
                            window.location.reload();
                          } else {
                            const errorData = await response.json();
                            alert(`Failed to save race result: ${errorData.error || 'Unknown error'}`);
                          }
                        } catch (error) {
                          console.error('Failed to save race result:', error);
                          alert('Failed to save race result. Please try again.');
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-md flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Race Result
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingRecord(false);
                        setNewRecord({
                          roundId: '',
                          driverId: '',
                          driverName: '',
                          division: 'Division 1',
                          position: 0,
                          fastestLap: '',
                          raceType: 'final',
                        });
                      }}
                      className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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

              {/* Race Type Filter - Dropdown (Single) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Race Type
                </label>
                <select
                  value={selectedRaceType}
                  onChange={(e) => setSelectedRaceType(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Race Types</option>
                  {availableRaceTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
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

          {/* Race Results Records Section */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Race Results Records</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Round *
                </label>
                <select
                  value={recordRoundId}
                  onChange={(e) => {
                    setRecordRoundId(e.target.value);
                    setRecordRaceType(''); // Reset race type when round changes
                  }}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a round</option>
                  {rounds.map(round => (
                    <option key={round.id} value={round.id}>
                      Round {round.roundNumber}: {round.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Division *
                </label>
                <select
                  value={recordDivision}
                  onChange={(e) => {
                    setRecordDivision(e.target.value as Division | '');
                    setRecordRaceType(''); // Reset race type when division changes
                  }}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select division</option>
                  <option value="Division 1">Division 1</option>
                  <option value="Division 2">Division 2</option>
                  <option value="Division 3">Division 3</option>
                  <option value="Division 4">Division 4</option>
                  <option value="New">New</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Race Type *
                </label>
                <select
                  value={recordRaceType}
                  onChange={(e) => setRecordRaceType(e.target.value)}
                  disabled={!recordRoundId || !recordDivision}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select race type</option>
                  {availableRecordRaceTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={async () => {
                    if (!recordRoundId || !recordDivision || !recordRaceType || !selectedSeason) {
                      alert('Please select Round, Division, and Race Type');
                      return;
                    }
                    
                    if (selectedRaceStandings.length === 0) {
                      alert('No results found for the selected race');
                      return;
                    }
                    
                    try {
                      setIsSavingRecord(true);
                      const timestamp = Date.now();
                      const createdAt = new Date().toISOString().split('T')[0];
                      
                      // Prepare records to save
                      const recordsToSave = selectedRaceStandings.map((standing, index) => ({
                        id: `record-${timestamp}-${index}`,
                        seasonId: selectedSeason.id,
                        roundId: recordRoundId,
                        division: recordDivision,
                        raceType: recordRaceType,
                        driverId: standing.driverId,
                        driverName: standing.driverName,
                        position: standing.position,
                        fastestLap: standing.fastestLap || '',
                        points: standing.points,
                        rank: standing.rank || index + 1,
                        createdAt: createdAt,
                      }));
                      
                      // Save to Google Sheets via API
                      const response = await fetch('/api/race-result-records', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(recordsToSave),
                      });
                      
                      if (response.ok) {
                        alert(`Successfully saved ${recordsToSave.length} driver standings to Race Results Records`);
                      } else {
                        const errorData = await response.json();
                        alert(`Failed to save record: ${errorData.error || 'Unknown error'}`);
                      }
                    } catch (error) {
                      console.error('Failed to save race result record:', error);
                      alert('Failed to save race result record. Please try again.');
                    } finally {
                      setIsSavingRecord(false);
                    }
                  }}
                  disabled={!recordRoundId || !recordDivision || !recordRaceType || selectedRaceStandings.length === 0 || isSavingRecord || !selectedSeason}
                  className="w-full px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSavingRecord ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Record
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Standings Table */}
            {selectedRaceStandings.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Rank
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Position
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Driver
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
                    {selectedRaceStandings.map((standing, index) => (
                      <tr key={standing.driverId} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {standing.rank === 1 && <Trophy className="w-4 h-4 text-amber-500" />}
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {standing.rank}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                          {standing.position}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                          {standing.driverName || 'Unknown Driver'}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600 dark:text-slate-400">
                          {standing.fastestLap || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                          {standing.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {recordRoundId && recordDivision && recordRaceType && selectedRaceStandings.length === 0 && (
              <div className="mt-4 text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                No results found for the selected race. Please ensure race results exist for this combination.
              </div>
            )}
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

