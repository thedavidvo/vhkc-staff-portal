'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '@/components/Header';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import { useSeason } from '@/components/SeasonContext';
import { Division } from '@/types';
import { getPointsForPosition } from '@/lib/pointsSystem';
import { Loader2, Filter, Trophy, Search, FileText, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

// Helper function to get division color
const getDivisionColor = (division: Division | string) => {
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
    case 'Open':
      return 'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
  }
};

// Helper function to get final type color
const getRaceTypeColor = (raceType?: string, finalType?: string) => {
  if (!finalType) return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
  
  // Color coding for Final types - matching division badge style
  if (raceType?.toLowerCase() === 'final') {
    switch (finalType.toUpperCase()) {
      case 'A':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      case 'B':
        return 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200';
      case 'C':
        return 'bg-lime-100 dark:bg-lime-900 text-lime-800 dark:text-lime-200';
      case 'D':
        return 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200';
      case 'E':
        return 'bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200';
      case 'F':
        return 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
    }
  }
  
  // Color coding for Heat types - matching division badge style
  if (raceType?.toLowerCase() === 'heat') {
    switch (finalType.toUpperCase()) {
      case 'A':
        return 'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200';
      case 'B':
        return 'bg-fuchsia-100 dark:bg-fuchsia-900 text-fuchsia-800 dark:text-fuchsia-200';
      case 'C':
        return 'bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200';
      case 'D':
        return 'bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200';
      case 'E':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'F':
        return 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
    }
  }
  
  // Color coding for Qualification groups - matching division badge style
  if (raceType?.toLowerCase() === 'qualification') {
    switch (finalType.toUpperCase()) {
      case '1':
        return 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200';
      case '2':
        return 'bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200';
      case '3':
        return 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
    }
  }
  
  return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
};

// Helper function to format race type display
const formatRaceType = (raceType?: string, finalType?: string) => {
  if (!raceType) return 'N/A';
  
  const capitalizedType = raceType.charAt(0).toUpperCase() + raceType.slice(1);
  
  if (finalType) {
    if (raceType.toLowerCase() === 'qualification') {
      return `Qualification Group ${finalType.toUpperCase()}`;
    } else if (raceType.toLowerCase() === 'final') {
      return `Final ${finalType.toUpperCase()}`;
    } else if (raceType.toLowerCase() === 'heat') {
      return `Heat ${finalType.toUpperCase()}`;
    }
  }
  
  return capitalizedType;
};

interface RaceResult {
  roundId: string;
  roundName: string;
  roundNumber: number;
  date: string;
  driverId: string;
  driverName: string;
  division: Division; // Race division
  position: number;
  fastestLap: string;
  points: number;
  raceType?: string;
  finalType?: string;
  overallPosition?: number;
}

export default function ResultsPage() {
  const { selectedSeason } = useSeason();
  const [rounds, setRounds] = useState<any[]>([]);
  const [raceResults, setRaceResults] = useState<RaceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDivision, setSelectedDivision] = useState<Division>('Division 1'); // Race Division
  const [selectedDriverDivision, setSelectedDriverDivision] = useState<Division | 'All'>('All'); // Driver Division filter
  const [selectedRaceType, setSelectedRaceType] = useState<string>('');
  const [selectedHeatType, setSelectedHeatType] = useState<string>('');
  const [selectedFinalType, setSelectedFinalType] = useState<string>('');
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [sortBy, setSortBy] = useState<'position' | 'time' | 'points'>('position');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [divisionChanges, setDivisionChanges] = useState<any[]>([]);
  const [sortColumn, setSortColumn] = useState<'driver' | 'points' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Helper function to parse time - time is in decimal format (e.g., 60.131)
  const parseTime = (timeStr: string): number => {
    if (!timeStr) return Infinity;
    // Time is already a decimal number, just parse it
    const time = parseFloat(timeStr);
    return isNaN(time) ? Infinity : time;
  };

  // Helper function to get driver's division at a specific point in time based on round
  const getDriverDivisionAtRound = useCallback((driverId: string, roundId: string, roundNumber: number): Division | undefined => {
      if (!driverId) {
        return undefined;
      }

      // Fallback to current division
      const driver = drivers.find(d => d.id === driverId);
      const currentDivision = driver?.division;

      if (!roundId || divisionChanges.length === 0) {
        return currentDivision;
      }

      // Get all division changes for this driver
      const driverChanges = divisionChanges.filter(c => c.driverId === driverId);
      if (driverChanges.length === 0) {
        return currentDivision;
      }

      // Get the target round for comparison
      const targetRound = rounds.find(r => r.id === roundId);
      const targetRoundNumber = targetRound?.roundNumber || roundNumber;
      const isTargetPreSeason = roundId.startsWith('pre-season-');

      // Sort changes by round number, with pre-season first (round 0)
      const sortedChanges = [...driverChanges].sort((a, b) => {
        const aIsPreSeason = a.roundId.startsWith('pre-season-');
        const bIsPreSeason = b.roundId.startsWith('pre-season-');
        
        // Pre-season always comes first
        if (aIsPreSeason && !bIsPreSeason) return -1;
        if (!aIsPreSeason && bIsPreSeason) return 1;
        if (aIsPreSeason && bIsPreSeason) return 0; // Both pre-season, order doesn't matter
        
        // Get round numbers for comparison
        const aRound = rounds.find(r => r.id === a.roundId);
        const bRound = rounds.find(r => r.id === b.roundId);
        const aRoundNumber = aRound?.roundNumber || 0;
        const bRoundNumber = bRound?.roundNumber || 0;
        
        return aRoundNumber - bRoundNumber;
      });

      // Find the most recent change that occurred at or before the target round
      let mostRecentChange = null;
      
      for (const change of sortedChanges) {
        const changeIsPreSeason = change.roundId.startsWith('pre-season-');
        
        // If target is pre-season, only consider pre-season changes
        if (isTargetPreSeason) {
          if (changeIsPreSeason) {
            mostRecentChange = change;
          }
          continue;
        }
        
        // If change is pre-season and target is not, this change applies to all rounds
        if (changeIsPreSeason) {
          mostRecentChange = change;
          continue;
        }
        
        // Compare round numbers for regular rounds
        const changeRound = rounds.find(r => r.id === change.roundId);
        const changeRoundNumber = changeRound?.roundNumber || 0;
        
        if (changeRoundNumber <= targetRoundNumber) {
          mostRecentChange = change;
        } else {
          // Changes are sorted, so we can break once we exceed target
          break;
        }
      }

      // If we found a change, return the appropriate division
      if (mostRecentChange) {
        if (mostRecentChange.changeType === 'promotion' || mostRecentChange.changeType === 'demotion') {
          return mostRecentChange.toDivision || currentDivision;
        } else if (mostRecentChange.changeType === 'division_start' || mostRecentChange.changeType === 'mid_season_join') {
          return mostRecentChange.divisionStart || currentDivision;
        }
      }

      // Fallback to current division
      return currentDivision;
  }, [drivers, divisionChanges, rounds]);

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
        
        // Fetch division changes
        const divisionChangesResponse = await fetch(`/api/division-changes?seasonId=${selectedSeason.id}`);
        if (divisionChangesResponse.ok) {
          const divisionChangesData = await divisionChangesResponse.json();
          setDivisionChanges(Array.isArray(divisionChangesData) ? divisionChangesData : []);
        }
        
        const roundsResponse = await fetch(`/api/rounds?seasonId=${selectedSeason.id}`);
        
        if (roundsResponse.ok) {
          const roundsData = await roundsResponse.json();
          const sortedRounds = roundsData.sort((a: any, b: any) => {
            const roundA = a.roundNumber || 0;
            const roundB = b.roundNumber || 0;
            return roundA - roundB;
          });
          setRounds(sortedRounds);
          
          // Auto-select the first round if no round is selected
          if (sortedRounds.length > 0 && !selectedRound) {
            setSelectedRound(sortedRounds[0].id);
          }

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
                      roundName: round.location || 'TBD',
                      roundNumber: round.roundNumber || 0,
                      date: round.date,
                      driverId: result.driverId,
                      driverName: result.driverName || '',
                      division: divisionResult.division,
                      position: result.overallPosition || result.gridPosition || result.position || 0, // Map race finish from overallPosition
                      fastestLap: result.fastestLap || '',
                      points: 0, // Will be calculated dynamically
                      raceType: result.raceType || 'qualification',
                      finalType: result.finalType || '',
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
      // Only include race types for the selected round
      const matchesRound = !selectedRound || r.roundId === selectedRound;
      
      if (r.raceType && matchesRound) {
        types.add(r.raceType);
      }
    });
    return Array.from(types).sort();
  }, [raceResults, selectedRound]);

  // Get available heat types based on selected race type, round, and division
  const availableHeatTypes = useMemo(() => {
    if (selectedRaceType !== 'heat') return [];
    
    const heatTypes = new Set<string>();
    raceResults.forEach(r => {
      const matchesRound = !selectedRound || r.roundId === selectedRound;
      const matchesDivision = !selectedDivision || r.division === selectedDivision;
      
      if (r.raceType === 'heat' && r.finalType && matchesRound && matchesDivision) {
        heatTypes.add(r.finalType.toUpperCase());
      }
    });
    return Array.from(heatTypes).sort();
  }, [raceResults, selectedRaceType, selectedRound, selectedDivision]);

  // Get available final types based on selected race type, round, and division
  const availableFinalTypes = useMemo(() => {
    if (selectedRaceType !== 'final') return [];
    
    const finalTypes = new Set<string>();
    raceResults.forEach(r => {
      const matchesRound = !selectedRound || r.roundId === selectedRound;
      const matchesDivision = !selectedDivision || r.division === selectedDivision;
      
      if (r.raceType === 'final' && r.finalType && matchesRound && matchesDivision) {
        finalTypes.add(r.finalType.toUpperCase());
      }
    });
    return Array.from(finalTypes).sort();
  }, [raceResults, selectedRaceType, selectedRound, selectedDivision]);

  // Auto-select the first race type when available race types change
  useEffect(() => {
    if (availableRaceTypes.length > 0 && !selectedRaceType) {
      setSelectedRaceType(availableRaceTypes[0]);
    }
  }, [availableRaceTypes, selectedRaceType]);

  // Reset heat/final type when race type changes
  useEffect(() => {
    setSelectedHeatType('');
    setSelectedFinalType('');
  }, [selectedRaceType]);

  // Auto-select first heat type when available
  useEffect(() => {
    if (availableHeatTypes.length > 0 && !selectedHeatType) {
      setSelectedHeatType(availableHeatTypes[0]);
    }
  }, [availableHeatTypes, selectedHeatType]);

  // Auto-select first final type when available
  useEffect(() => {
    if (availableFinalTypes.length > 0 && !selectedFinalType) {
      setSelectedFinalType(availableFinalTypes[0]);
    }
  }, [availableFinalTypes, selectedFinalType]);

  // Filter results first (without points calculation)
  const filteredResults = useMemo(() => {
    let filtered = [...raceResults];

    // Filter by driver name search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(r => 
        r.driverName.toLowerCase().includes(query)
      );
    }

    // Filter by race type
    if (selectedRaceType) {
      filtered = filtered.filter(r => r.raceType && r.raceType === selectedRaceType);
    }

    // Filter by heat type if heat is selected
    if (selectedRaceType === 'heat' && selectedHeatType) {
      filtered = filtered.filter(r => 
        r.finalType && r.finalType.toUpperCase() === selectedHeatType.toUpperCase()
      );
    }

    // Filter by final type if final is selected
    if (selectedRaceType === 'final' && selectedFinalType) {
      filtered = filtered.filter(r => 
        r.finalType && r.finalType.toUpperCase() === selectedFinalType.toUpperCase()
      );
    }

    // Filter by division (single)
    if (selectedDivision) {
      filtered = filtered.filter(r => r.division === selectedDivision);
    }

    // Filter by round (single) - always filter if a round is selected
    if (selectedRound) {
      filtered = filtered.filter(r => r.roundId === selectedRound);
    }

    // Sort based on race type
    return filtered.sort((a, b) => {
      // If race type is qualification, sort by fastest lap
      if (selectedRaceType === 'qualification') {
        const timeA = parseTime(a.fastestLap);
        const timeB = parseTime(b.fastestLap);
        return timeA - timeB;
      }
      
      // For heat and final races, sort by race finish (position)
      if (selectedRaceType === 'heat' || selectedRaceType === 'final') {
        // First sort by finalType (A before B before C, etc.)
        const finalTypeA = a.finalType?.toUpperCase() || 'Z';
        const finalTypeB = b.finalType?.toUpperCase() || 'Z';
        if (finalTypeA !== finalTypeB) {
          return finalTypeA.localeCompare(finalTypeB);
        }
        
        // Then by race finish position
        return a.position - b.position;
      }
      
      // Default sorting
      return a.position - b.position;
    });
  }, [raceResults, selectedDivision, selectedRaceType, selectedHeatType, selectedFinalType, selectedRound, sortBy, searchQuery, sortColumn]);

  // Calculate overall position and points based on selected filters
  // Overall position is simply the ranking within the current filtered and sorted results
  // Points are calculated based on overall position (not race position)
  const resultsWithOverallPosition = useMemo(() => {
    let results = filteredResults.map((result, index) => {
      const overallPosition = index + 1;
      
      // Calculate points based on overall position and race type
      let calculatedPoints = 0;
      
      // Do not apply points for qualification races
      if (result.raceType !== 'qualification') {
        // Check if there's a heat race for this round to determine points calculation
        const roundHasHeat = raceResults.some(r => 
          r.roundId === result.roundId && r.raceType === 'heat'
        );
        
        calculatedPoints = getPointsForPosition(
          overallPosition,
          (result.raceType || 'qualification') as 'qualification' | 'heat' | 'final',
          roundHasHeat
        );
      }
      
      return {
        ...result,
        overallPosition,
        points: calculatedPoints,
      };
    });

    // Apply column sorting if active
    if (sortColumn === 'driver') {
      results = [...results].sort((a, b) => {
        const comparison = a.driverName.localeCompare(b.driverName);
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    } else if (sortColumn === 'points') {
      results = [...results].sort((a, b) => {
        const comparison = b.points - a.points; // Default highest to lowest
        return sortDirection === 'asc' ? -comparison : comparison;
      });
    }

    return results;
  }, [filteredResults, raceResults, sortColumn, sortDirection]);

  // Handler for column sorting
  const handleSort = (column: 'driver' | 'points') => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column with default direction
      setSortColumn(column);
      setSortDirection(column === 'points' ? 'desc' : 'asc'); // Points default to desc (high to low), driver to asc
    }
  };

  // Reset view handler
  const handleResetView = () => {
    setSortColumn(null);
    setSortDirection('asc');
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
      <PageLayout
        title="Race Results"
        subtitle="View and analyze race results across all rounds"
        icon={FileText}
      >
        {/* Filters */}
        <SectionCard
          icon={Filter}
          title="Filters"
          className="mb-8"
        >
          {/* Driver Search */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Search Driver
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by driver name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {/* Round Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Round
                </label>
                <select
                  value={selectedRound}
                  onChange={(e) => setSelectedRound(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {rounds.map(round => (
                    <option key={round.id} value={round.id}>
                      Round {round.roundNumber}: {round.location || 'TBD'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Race Type Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Race Type
                </label>
                <select
                  value={selectedRaceType}
                  onChange={(e) => setSelectedRaceType(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {availableRaceTypes.length === 0 ? (
                    <option value="">No race types available</option>
                  ) : (
                    availableRaceTypes.map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Heat Type Filter - Always show when heat is selected */}
              {selectedRaceType === 'heat' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Heat Type
                  </label>
                  <select
                    value={selectedHeatType}
                    onChange={(e) => setSelectedHeatType(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {availableHeatTypes.length === 0 ? (
                      <option value="">No heat types available</option>
                    ) : (
                      <>
                        <option value="">All Heat Types</option>
                        {availableHeatTypes.map(type => (
                          <option key={type} value={type}>
                            Heat {type}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              )}

              {/* Final Type Filter - Always show when final is selected */}
              {selectedRaceType === 'final' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Final Type
                  </label>
                  <select
                    value={selectedFinalType}
                    onChange={(e) => setSelectedFinalType(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {availableFinalTypes.length === 0 ? (
                      <option value="">No final types available</option>
                    ) : (
                      <>
                        <option value="">All Final Types</option>
                        {availableFinalTypes.map(type => (
                          <option key={type} value={type}>
                            Final {type}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              )}

              {/* Race Division Filter - Conditional options based on race type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Race Division
                </label>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value as Division)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Division 1">Division 1</option>
                  <option value="Division 2">Division 2</option>
                  {(selectedRaceType === 'qualification' || selectedRaceType === 'heat') && (
                    <option value="Open">Open</option>
                  )}
                  {selectedRaceType === 'final' && (
                    <>
                      <option value="Division 3">Division 3</option>
                      <option value="Division 4">Division 4</option>
                      <option value="New">New</option>
                    </>
                  )}
                </select>
              </div>

              {/* Driver Division Filter - All divisions available */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Driver Division
                </label>
                <select
                  value={selectedDriverDivision}
                  onChange={(e) => setSelectedDriverDivision(e.target.value as Division | 'All')}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="All">All Divisions</option>
                  <option value="Division 1">Division 1</option>
                  <option value="Division 2">Division 2</option>
                  <option value="Division 3">Division 3</option>
                  <option value="Division 4">Division 4</option>
                  <option value="New">New</option>
                  <option value="Open">Open</option>
                </select>
              </div>
            </div>
        </SectionCard>

        {/* Results Table */}
        <SectionCard
          title="Race Results"
          icon={Trophy}
          noPadding
        >
          {sortColumn && (
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Sorted by {sortColumn === 'driver' ? 'Driver' : 'Points'} ({sortDirection === 'asc' ? 'ascending' : 'descending'})
              </p>
              <button
                onClick={handleResetView}
                className="px-3 py-1.5 text-sm bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
              >
                Reset View
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Overall Position
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Race Finish
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      onClick={() => handleSort('driver')}
                    >
                      <div className="flex items-center gap-2">
                        Driver
                        {sortColumn === 'driver' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Driver Division
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Round
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Race Division
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Race Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Fastest Lap
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      onClick={() => handleSort('points')}
                    >
                      <div className="flex items-center gap-2">
                        Points
                        {sortColumn === 'points' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-40" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {resultsWithOverallPosition.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        No results found. Adjust your filters or add race results.
                      </td>
                    </tr>
                  ) : (
                    resultsWithOverallPosition.map((result, index) => {
                      const driverDivision = getDriverDivisionAtRound(result.driverId, result.roundId, result.roundNumber);
                      return (
                      <tr key={`${result.roundId}-${result.driverId}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-800">
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
                            {driverDivision ? (
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getDivisionColor(driverDivision)}`}>
                                {driverDivision}
                          </span>
                            ) : (
                              <span className="text-sm text-slate-400 dark:text-slate-500">-</span>
                            )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          Round {result.roundNumber}: {result.roundName}
                        </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getDivisionColor(result.division)}`}>
                              {result.division}
                            </span>
                          </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getRaceTypeColor(result.raceType, result.finalType)}`}>
                            {formatRaceType(result.raceType, result.finalType)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600 dark:text-slate-400">
                          {result.fastestLap || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                          {result.points}
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
        </SectionCard>
      </PageLayout>
    </>
  );
}
