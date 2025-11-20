'use client';

import { useState, useEffect, useMemo } from 'react';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import { useSeason } from '@/components/SeasonContext';
import { Division } from '@/types';
import { GitCompare, Users, Trophy, Clock, Search, X, TrendingUp, Award, BarChart3, LineChart } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface Driver {
  id: string;
  name: string;
  division: Division;
}

interface RaceResult {
  roundId: string;
  roundName: string;
  roundNumber: number;
  driverId: string;
  driverName: string;
  division: Division;
  position: number;
  fastestLap: string;
  points: number;
  raceType?: string;
  finalType?: string;
  raceName?: string;
}

interface BestTime {
  roundId: string;
  roundName: string;
  roundNumber: number;
  raceType: string;
  finalType?: string;
  driverId: string;
  driverName: string;
  division: Division;
  fastestLap: string;
  position: number;
}

// Helper function to parse time
const parseTime = (timeStr: string): number => {
  if (!timeStr) return Infinity;
  const time = parseFloat(timeStr);
  return isNaN(time) ? Infinity : time;
};

// Helper function to format time
const formatTime = (time: number): string => {
  if (time === Infinity) return 'N/A';
  return time.toFixed(3);
};

// Helper function to format race type
const formatRaceType = (raceType?: string, finalType?: string): string => {
  if (!raceType) return 'N/A';
  const type = raceType.toLowerCase();
  if (finalType) {
    if (type === 'qualification') return `Qual ${finalType.toUpperCase()}`;
    if (type === 'final') return `Final ${finalType.toUpperCase()}`;
    if (type === 'heat') return `Heat ${finalType.toUpperCase()}`;
  }
  return raceType.charAt(0).toUpperCase() + raceType.slice(1);
};

export default function ComparePage() {
  const { selectedSeason } = useSeason();
  const [mode, setMode] = useState<'compare' | 'best-times'>('compare');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [raceResults, setRaceResults] = useState<RaceResult[]>([]);
  const [points, setPoints] = useState<any[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<Division | ''>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedSeason) {
        setDrivers([]);
        setRounds([]);
        setRaceResults([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch drivers
        const driversResponse = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`);
        if (driversResponse.ok) {
          const driversData = await driversResponse.json();
          setDrivers(driversData.filter((d: any) => d.status === 'ACTIVE'));
        }

        // Fetch rounds
        const roundsResponse = await fetch(`/api/rounds?seasonId=${selectedSeason.id}`);
        let sortedRounds: any[] = [];
        if (roundsResponse.ok) {
          const roundsData = await roundsResponse.json();
          sortedRounds = roundsData.sort((a: any, b: any) => {
            return (a.roundNumber || 0) - (b.roundNumber || 0);
          });
          setRounds(sortedRounds);
        }

        // Fetch all race results
        const allResults: RaceResult[] = [];
        for (const round of sortedRounds) {
          try {
            const resultsResponse = await fetch(`/api/race-results?roundId=${round.id}`);
            if (resultsResponse.ok) {
              const resultsData = await resultsResponse.json();
              // Flatten the results (they're grouped by division)
              // resultsData is an array of { division, results: [...] }
              if (Array.isArray(resultsData)) {
                resultsData.forEach((divisionResult: any) => {
                  if (divisionResult.results && Array.isArray(divisionResult.results)) {
                    divisionResult.results.forEach((result: any) => {
                      allResults.push({
                        roundId: round.id,
                        roundName: (round.location && round.location.trim()) || 'TBD',
                        roundNumber: round.roundNumber || 0,
                        driverId: result.driverId,
                        driverName: result.driverName || '',
                        division: divisionResult.division || result.division || 'New',
                        position: result.position || result.gridPosition || 0,
                        fastestLap: result.fastestLap || '',
                        points: result.points || 0,
                        raceType: result.raceType || 'qualification',
                        finalType: result.finalType || '',
                        raceName: result.raceName || '',
                      });
                    });
                  }
                });
              }
            }
          } catch (error) {
            console.error(`Error fetching results for round ${round.id}:`, error);
          }
        }
        console.log('Fetched race results:', {
          totalResults: allResults.length,
          roundsCount: sortedRounds.length,
          sampleResult: allResults[0],
        });
        setRaceResults(allResults);

        // Fetch points data
        const pointsResponse = await fetch(`/api/points?seasonId=${selectedSeason.id}`);
        if (pointsResponse.ok) {
          const pointsData = await pointsResponse.json();
          setPoints(Array.isArray(pointsData) ? pointsData : []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSeason]);

  // Filter drivers by search query
  const filteredDrivers = useMemo(() => {
    if (!searchQuery) return drivers;
    const query = searchQuery.toLowerCase();
    return drivers.filter(driver => 
      driver.name.toLowerCase().includes(query)
    );
  }, [drivers, searchQuery]);

  // Get comparison data for selected drivers
  const comparisonData = useMemo(() => {
    if (selectedDrivers.length === 0) return [];

    const roundData: Record<string, {
      round: any;
      drivers: Record<string, {
        driver: Driver;
        results: RaceResult[];
      }>;
    }> = {};

    rounds.forEach(round => {
      roundData[round.id] = {
        round,
        drivers: {},
      };

      selectedDrivers.forEach(driverId => {
        const driver = drivers.find(d => d.id === driverId);
        if (!driver) return;

        const driverResults = raceResults.filter(r => 
          r.roundId === round.id && r.driverId === driverId
        );

        roundData[round.id].drivers[driverId] = {
          driver,
          results: driverResults,
        };
      });
    });

    return Object.values(roundData);
  }, [selectedDrivers, rounds, raceResults, drivers]);

  // Get available divisions from race results
  const availableDivisions = useMemo(() => {
    const divisions = new Set<Division>();
    raceResults.forEach(result => {
      if (result.division) {
        divisions.add(result.division);
      }
    });
    return Array.from(divisions).sort();
  }, [raceResults]);

  // Chart data for points progression
  const pointsProgressionData = useMemo(() => {
    if (selectedDrivers.length === 0 || rounds.length === 0) return [];

    const sortedRounds = [...rounds].sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0));
    
    return sortedRounds.map(round => {
      const dataPoint: any = {
        round: `R${round.roundNumber}`,
        roundNumber: round.roundNumber || 0,
        roundName: (round.location && round.location.trim()) || 'TBD',
      };

      selectedDrivers.forEach(driverId => {
        const driver = drivers.find(d => d.id === driverId);
        if (!driver) return;

        // Calculate cumulative points up to this round
        const driverPoints = points
          .filter(p => p.driverId === driverId && p.roundId && rounds.find(r => r.id === p.roundId && (r.roundNumber || 0) <= (round.roundNumber || 0)))
          .reduce((sum, p) => sum + (parseFloat(p.points) || 0), 0);

        dataPoint[driver.name] = driverPoints;
      });

      return dataPoint;
    });
  }, [selectedDrivers, rounds, points, drivers]);

  // Chart data for fastest lap times
  const fastestLapData = useMemo(() => {
    if (selectedDrivers.length === 0 || rounds.length === 0) return [];

    const sortedRounds = [...rounds].sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0));
    
    return sortedRounds.map(round => {
      const dataPoint: any = {
        round: `R${round.roundNumber}`,
        roundNumber: round.roundNumber || 0,
        roundName: (round.location && round.location.trim()) || 'TBD',
      };

      selectedDrivers.forEach(driverId => {
        const driver = drivers.find(d => d.id === driverId);
        if (!driver) return;

        const driverResults = raceResults.filter(r => 
          r.roundId === round.id && r.driverId === driverId && r.fastestLap
        );

        if (driverResults.length > 0) {
          const validTimes = driverResults
            .map(r => parseTime(r.fastestLap))
            .filter(t => t !== Infinity && t > 0);
          
          if (validTimes.length > 0) {
            const fastest = Math.min(...validTimes);
            dataPoint[driver.name] = fastest;
          }
        }
      });

      return dataPoint;
    });
  }, [selectedDrivers, rounds, raceResults, drivers]);

  // Chart data for position trends
  const positionTrendsData = useMemo(() => {
    if (selectedDrivers.length === 0 || rounds.length === 0) return [];

    const sortedRounds = [...rounds].sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0));
    
    return sortedRounds.map(round => {
      const dataPoint: any = {
        round: `R${round.roundNumber}`,
        roundNumber: round.roundNumber || 0,
        roundName: (round.location && round.location.trim()) || 'TBD',
      };

      selectedDrivers.forEach(driverId => {
        const driver = drivers.find(d => d.id === driverId);
        if (!driver) return;

        // Get best position from final races, fallback to other races
        const driverResults = raceResults.filter(r => 
          r.roundId === round.id && r.driverId === driverId
        );

        if (driverResults.length > 0) {
          const finalResults = driverResults.filter(r => r.raceType?.toLowerCase() === 'final');
          const resultsToUse = finalResults.length > 0 ? finalResults : driverResults;
          const bestPosition = Math.min(...resultsToUse.map(r => r.position || 999));
          dataPoint[driver.name] = bestPosition < 999 ? bestPosition : null;
        }
      });

      return dataPoint;
    });
  }, [selectedDrivers, rounds, raceResults, drivers]);

  // Chart data for total points and average position
  const summaryChartData = useMemo(() => {
    if (selectedDrivers.length === 0) return [];

    return selectedDrivers.map(driverId => {
      const driver = drivers.find(d => d.id === driverId);
      if (!driver) return null;

      const driverPoints = points.filter(p => p.driverId === driverId);
      const totalPoints = driverPoints.reduce((sum, p) => sum + (parseFloat(p.points) || 0), 0);
      
      const driverResults = raceResults.filter(r => r.driverId === driverId);
      const positions = driverResults
        .filter(r => r.raceType?.toLowerCase() === 'final')
        .map(r => r.position)
        .filter(p => p && p > 0);
      
      const avgPosition = positions.length > 0 
        ? positions.reduce((sum, p) => sum + p, 0) / positions.length 
        : null;

      return {
        driver: driver.name,
        totalPoints,
        avgPosition: avgPosition ? Math.round(avgPosition * 10) / 10 : null,
        racesCompleted: positions.length,
      };
    }).filter((d): d is NonNullable<typeof d> => d !== null);
  }, [selectedDrivers, drivers, points, raceResults]);

  // Chart data for points per round
  const pointsPerRoundData = useMemo(() => {
    if (selectedDrivers.length === 0 || rounds.length === 0) return [];

    const sortedRounds = [...rounds].sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0));
    
    return sortedRounds.map(round => {
      const dataPoint: any = {
        round: `R${round.roundNumber}`,
        roundNumber: round.roundNumber || 0,
        roundName: (round.location && round.location.trim()) || 'TBD',
      };

      selectedDrivers.forEach(driverId => {
        const driver = drivers.find(d => d.id === driverId);
        if (!driver) return;

        const roundPoints = points
          .filter(p => p.driverId === driverId && p.roundId === round.id)
          .reduce((sum, p) => sum + (parseFloat(p.points) || 0), 0);

        dataPoint[driver.name] = roundPoints;
      });

      return dataPoint;
    });
  }, [selectedDrivers, rounds, points, drivers]);

  // Color palette for drivers
  const driverColors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
  ];

  // Get best times per round
  const bestTimes = useMemo(() => {
    const bestTimesByRound: Record<string, {
      round: any;
      times: BestTime[];
    }> = {};

    if (!rounds.length || !raceResults.length) {
      return [];
    }

    rounds.forEach(round => {
      // Filter by selected round if specified
      if (selectedRound && round.id !== selectedRound) return;
      
      let roundResults = raceResults.filter(r => r.roundId === round.id);
      
      // Filter by selected division if specified
      if (selectedDivision) {
        roundResults = roundResults.filter(r => r.division === selectedDivision);
      }
      
      if (roundResults.length === 0) return;
      
      // Group by race type
      const byRaceType: Record<string, RaceResult[]> = {};
      roundResults.forEach(result => {
        const raceType = result.raceType || 'qualification';
        const finalType = result.finalType || '';
        const key = `${raceType}-${finalType}`;
        if (!byRaceType[key]) byRaceType[key] = [];
        byRaceType[key].push(result);
      });

      const bestTimesForRound: BestTime[] = [];
      Object.entries(byRaceType).forEach(([key, results]) => {
        const [raceType, finalType] = key.split('-');
        // Filter for results with valid fastest lap times
        const validResults = results.filter(r => {
          if (!r.fastestLap) return false;
          const time = parseTime(r.fastestLap);
          return time !== Infinity && time > 0;
        });
        
        if (validResults.length > 0) {
          const best = validResults.reduce((best, current) => {
            const bestTime = parseTime(best.fastestLap);
            const currentTime = parseTime(current.fastestLap);
            return currentTime < bestTime ? current : best;
          });

          bestTimesForRound.push({
            roundId: round.id,
            roundName: (round.location && round.location.trim()) || 'TBD',
            roundNumber: round.roundNumber || 0,
            raceType: raceType || 'qualification',
            finalType: finalType || undefined,
            driverId: best.driverId,
            driverName: best.driverName,
            division: best.division,
            fastestLap: best.fastestLap,
            position: best.position,
          });
        }
      });

      if (bestTimesForRound.length > 0) {
        bestTimesByRound[round.id] = {
          round,
          times: bestTimesForRound,
        };
      }
    });

    const result = Object.values(bestTimesByRound).sort((a, b) => a.round.roundNumber - b.round.roundNumber);
    console.log('Best times calculation:', {
      roundsCount: rounds.length,
      raceResultsCount: raceResults.length,
      bestTimesCount: result.length,
      sampleBestTime: result[0],
    });
    return result;
  }, [rounds, raceResults, selectedRound, selectedDivision]);

  const handleAddDriver = (driverId: string) => {
    if (!selectedDrivers.includes(driverId) && selectedDrivers.length < 5) {
      setSelectedDrivers([...selectedDrivers, driverId]);
    }
  };

  const handleRemoveDriver = (driverId: string) => {
    setSelectedDrivers(selectedDrivers.filter(id => id !== driverId));
  };

  if (loading) {
  return (
      <PageLayout
        title="Compare Drivers"
        subtitle="Compare driver performance and find best times"
        icon={GitCompare}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            <p className="text-slate-600 dark:text-slate-400">Loading data...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Compare Drivers"
      subtitle="Compare driver performance and find best times"
      icon={GitCompare}
      headerActions={
        <div className="flex gap-2">
          <button
            onClick={() => setMode('compare')}
            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
              mode === 'compare'
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                : 'glass text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Compare Drivers
          </button>
          <button
            onClick={() => setMode('best-times')}
            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
              mode === 'best-times'
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                : 'glass text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4 inline mr-2" />
            Best Times
          </button>
        </div>
      }
    >
      {mode === 'compare' ? (
        <>
          {/* Driver Selection */}
          <SectionCard
            title="Select Drivers to Compare"
            subtitle="Select up to 5 drivers to compare their performance"
            icon={Users}
            className="mb-8"
          >
            <div className="space-y-4">
              {/* Selected Drivers */}
              {selectedDrivers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedDrivers.map(driverId => {
                    const driver = drivers.find(d => d.id === driverId);
                    if (!driver) return null;
                    return (
                      <div
                        key={driverId}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl border border-primary-200 dark:border-primary-800"
                      >
                        <span className="font-medium text-primary-900 dark:text-primary-100">
                          {driver.name}
                        </span>
                        <button
                          onClick={() => handleRemoveDriver(driverId)}
                          className="p-1 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
                        >
                          <X className="w-4 h-4 text-primary-700 dark:text-primary-300" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Driver Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search drivers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Driver List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {filteredDrivers
                  .filter(d => !selectedDrivers.includes(d.id))
                  .map(driver => (
                    <button
                      key={driver.id}
                      onClick={() => handleAddDriver(driver.id)}
                      disabled={selectedDrivers.length >= 5}
                      className="text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="font-medium text-slate-900 dark:text-white">
                        {driver.name}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {driver.division}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </SectionCard>

          {/* Comparison Graphs */}
          {selectedDrivers.length > 0 && (
            <>
              {/* Points Progression Chart */}
              {pointsProgressionData.length > 0 && (
                <SectionCard
                  title="Points Progression"
                  subtitle="Cumulative points over rounds"
                  icon={LineChart}
                  className="mb-8"
                >
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={pointsProgressionData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                        <XAxis 
                          dataKey="round" 
                          stroke="#64748b"
                          className="text-xs dark:text-slate-400"
                          tick={{ fill: 'currentColor' }}
                        />
                        <YAxis 
                          stroke="#64748b"
                          className="text-xs dark:text-slate-400"
                          tick={{ fill: 'currentColor' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }}
                          labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                          itemStyle={{ color: '#1e293b' }}
                        />
                        <Legend />
                        {selectedDrivers.map((driverId, idx) => {
                          const driver = drivers.find(d => d.id === driverId);
                          if (!driver) return null;
                          return (
                            <Line
                              key={driverId}
                              type="monotone"
                              dataKey={driver.name}
                              stroke={driverColors[idx % driverColors.length]}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          );
                        })}
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              )}

              {/* Summary Charts - Total Points and Average Position */}
              {summaryChartData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <SectionCard
                    title="Total Points"
                    subtitle="Season total points comparison"
                    icon={Trophy}
                  >
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={summaryChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                        <XAxis 
                          dataKey="driver" 
                          stroke="#64748b"
                          className="text-xs dark:text-slate-400"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          tick={{ fill: 'currentColor' }}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          className="text-xs dark:text-slate-400"
                          tick={{ fill: 'currentColor' }}
                        />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px'
                            }}
                            itemStyle={{ color: '#1e293b' }}
                          />
                          <Bar dataKey="totalPoints" radius={[8, 8, 0, 0]}>
                            {summaryChartData.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={driverColors[idx % driverColors.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Average Position"
                    subtitle="Average final race position"
                    icon={BarChart3}
                  >
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={summaryChartData.filter(d => d !== null && d.avgPosition !== null)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                          <XAxis 
                            dataKey="driver" 
                            stroke="#64748b"
                            className="text-xs"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis 
                            stroke="#64748b" 
                            className="text-xs"
                            reversed
                            domain={['dataMin - 1', 'dataMax + 1']}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px'
                            }}
                            formatter={(value: any) => value !== null && value !== undefined ? value.toFixed(1) : 'N/A'}
                          />
                          <Bar dataKey="avgPosition" radius={[8, 8, 0, 0]}>
                            {summaryChartData.filter(d => d !== null && d.avgPosition !== null).map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={driverColors[idx % driverColors.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* Fastest Lap Times Chart */}
              {fastestLapData.some(d => selectedDrivers.some(id => {
                const driver = drivers.find(dr => dr.id === id);
                return driver && d[driver.name] !== undefined;
              })) && (
                <SectionCard
                  title="Fastest Lap Times"
                  subtitle="Best lap times across rounds"
                  icon={Clock}
                  className="mb-8"
                >
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={fastestLapData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                        <XAxis 
                          dataKey="round" 
                          stroke="#64748b"
                          className="text-xs dark:text-slate-400"
                          tick={{ fill: 'currentColor' }}
                        />
                        <YAxis 
                          stroke="#64748b"
                          className="text-xs dark:text-slate-400"
                          tick={{ fill: 'currentColor' }}
                          domain={['dataMin - 0.5', 'dataMax + 0.5']}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }}
                          itemStyle={{ color: '#1e293b' }}
                          formatter={(value: any) => value !== undefined && value !== null ? `${value.toFixed(3)}s` : 'N/A'}
                        />
                        <Legend />
                        {selectedDrivers.map((driverId, idx) => {
                          const driver = drivers.find(d => d.id === driverId);
                          if (!driver) return null;
                          return (
                            <Line
                              key={driverId}
                              type="monotone"
                              dataKey={driver.name}
                              stroke={driverColors[idx % driverColors.length]}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          );
                        })}
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              )}

              {/* Position Trends Chart */}
              {positionTrendsData.some(d => selectedDrivers.some(id => {
                const driver = drivers.find(dr => dr.id === id);
                return driver && d[driver.name] !== undefined && d[driver.name] !== null;
              })) && (
                <SectionCard
                  title="Position Trends"
                  subtitle="Final race positions over rounds"
                  icon={TrendingUp}
                  className="mb-8"
                >
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={positionTrendsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                        <XAxis 
                          dataKey="round" 
                          stroke="#64748b"
                          className="text-xs dark:text-slate-400"
                          tick={{ fill: 'currentColor' }}
                        />
                        <YAxis 
                          stroke="#64748b"
                          className="text-xs dark:text-slate-400"
                          tick={{ fill: 'currentColor' }}
                          reversed
                          domain={['dataMin - 1', 'dataMax + 1']}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }}
                          itemStyle={{ color: '#1e293b' }}
                          formatter={(value: any) => value !== null && value !== undefined ? `P${value}` : 'N/A'}
                        />
                        <Legend />
                        {selectedDrivers.map((driverId, idx) => {
                          const driver = drivers.find(d => d.id === driverId);
                          if (!driver) return null;
                          return (
                            <Line
                              key={driverId}
                              type="monotone"
                              dataKey={driver.name}
                              stroke={driverColors[idx % driverColors.length]}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          );
                        })}
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              )}

              {/* Points Per Round Chart */}
              {pointsPerRoundData.some(d => selectedDrivers.some(id => {
                const driver = drivers.find(dr => dr.id === id);
                return driver && d[driver.name] !== undefined && d[driver.name] > 0;
              })) && (
                <SectionCard
                  title="Points Per Round"
                  subtitle="Points earned in each round"
                  icon={BarChart3}
                  className="mb-8"
                >
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pointsPerRoundData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                        <XAxis 
                          dataKey="round" 
                          stroke="#64748b"
                          className="text-xs dark:text-slate-400"
                          tick={{ fill: 'currentColor' }}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          className="text-xs dark:text-slate-400"
                          tick={{ fill: 'currentColor' }}
                        />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px'
                            }}
                            itemStyle={{ color: '#1e293b' }}
                          />
                        <Legend />
                        {selectedDrivers.map((driverId, idx) => {
                          const driver = drivers.find(d => d.id === driverId);
                          if (!driver) return null;
                          return (
                            <Bar
                              key={driverId}
                              dataKey={driver.name}
                              fill={driverColors[idx % driverColors.length]}
                              radius={[4, 4, 0, 0]}
                            />
                          );
                        })}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              )}

              {/* Comparison Results Table */}
              <SectionCard
                title="Detailed Comparison"
                subtitle="Round-by-round race results"
                icon={TrendingUp}
              >
                {comparisonData.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-500 dark:text-slate-400">
                      No race results found for selected drivers
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {comparisonData.map(({ round, drivers: roundDrivers }) => (
                      <div
                        key={round.id}
                        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6"
                      >
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                          Round {round.roundNumber}: {(round.location && round.location.trim()) || 'TBD'}
                        </h3>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                  Driver
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                  Race Type
                                </th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                  Fastest Lap
                                </th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                  Position
                                </th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                  Points
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.values(roundDrivers).map(({ driver, results }) => (
                                results.length > 0 ? (
                                  results.map((result, idx) => (
                                    <tr
                                      key={`${driver.id}-${result.raceType}-${idx}`}
                                      className="border-b border-slate-100 dark:border-slate-700/50"
                                    >
                                      {idx === 0 && (
                                        <td
                                          rowSpan={results.length}
                                          className="py-3 px-4 font-medium text-slate-900 dark:text-white"
                                        >
                                          {driver.name}
                                        </td>
                                      )}
                                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                                        {formatRaceType(result.raceType, result.finalType)}
                                      </td>
                                      <td className="py-3 px-4 text-sm text-right font-mono text-slate-900 dark:text-white">
                                        {formatTime(parseTime(result.fastestLap))}s
                                      </td>
                                      <td className="py-3 px-4 text-sm text-right text-slate-600 dark:text-slate-400">
                                        {result.position}
                                      </td>
                                      <td className="py-3 px-4 text-sm text-right font-semibold text-slate-900 dark:text-white">
                                        {result.points}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr key={driver.id} className="border-b border-slate-100 dark:border-slate-700/50">
                                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                                      {driver.name}
                                    </td>
                                    <td colSpan={4} className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 text-center">
                                      No results
                                    </td>
                                  </tr>
                                )
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </>
          )}
        </>
      ) : (
        <SectionCard
          title="Best Times by Round"
          subtitle="Find the fastest times across qualifying, heat, and final races"
          icon={Award}
        >
          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap gap-4">
              {/* Round Filter */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Filter by Round
                </label>
                <select
                  value={selectedRound}
                  onChange={(e) => setSelectedRound(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Rounds</option>
                  {rounds.map(round => (
                    <option key={round.id} value={round.id}>
                      Round {round.roundNumber}: {(round.location && round.location.trim()) || 'TBD'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Division Filter */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Filter by Division
                </label>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value as Division | '')}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Divisions</option>
                  {availableDivisions.map(division => (
                    <option key={division} value={division}>
                      {division}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(selectedRound || selectedDivision) && (
              <button
                onClick={() => {
                  setSelectedRound('');
                  setSelectedDivision('');
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>

          {bestTimes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400 mb-2">
                No race results found{selectedRound || selectedDivision ? ' matching filters' : ''}
              </p>
              {raceResults.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  No race results data available. Make sure races have been completed and results have been entered.
                </p>
              )}
              {raceResults.length > 0 && rounds.length > 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Found {raceResults.length} race results across {rounds.length} rounds, but no valid fastest lap times.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {bestTimes.map(({ round, times }) => (
                <div
                  key={round.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Round {round.roundNumber}: {(round.location && round.location.trim()) || 'TBD'}
                    </h3>
                  </div>
                  
                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {times.map((bestTime, idx) => (
                      <div
                        key={idx}
                        className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Award className="w-5 h-5 text-primary-500 dark:text-primary-400" />
                              <span className="text-sm font-semibold text-slate-900 dark:text-white min-w-[120px]">
                                {formatRaceType(bestTime.raceType, bestTime.finalType)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-base font-medium text-slate-900 dark:text-white truncate">
                                {bestTime.driverName}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {bestTime.division} • Position: {bestTime.position}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 font-mono">
                              {formatTime(parseTime(bestTime.fastestLap))}s
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </PageLayout>
  );
}
