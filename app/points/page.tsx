'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import { useSeason } from '@/components/SeasonContext';
import { Division } from '@/types';
import { Loader2, Trophy, Save, Edit2, X, Check } from 'lucide-react';
import { getPointsForPosition } from '@/lib/pointsSystem';

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
      return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
  }
};

interface DriverPoints {
  driverId: string;
  driverName: string;
  division: Division;
  roundId: string;
  roundName: string;
  roundNumber: number;
  position: number;
  points: number;
  confirmed: boolean;
  raceType?: string;
  finalType?: string;
}

export default function PointsPage() {
  const { selectedSeason } = useSeason();
  const [rounds, setRounds] = useState<any[]>([]);
  const [driverPoints, setDriverPoints] = useState<DriverPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<string>('all');
  const [selectedDivision, setSelectedDivision] = useState<Division | 'all'>('all');
  const [selectedRaceType, setSelectedRaceType] = useState<string>('all');
  const [drivers, setDrivers] = useState<any[]>([]);
  
  // Editing state
  const [editingPoints, setEditingPoints] = useState<Record<string, number>>({});
  const [originalPoints, setOriginalPoints] = useState<DriverPoints[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch rounds, drivers, and race results
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedSeason) {
        setRounds([]);
        setDriverPoints([]);
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
        
        // Fetch rounds
        const roundsResponse = await fetch(`/api/rounds?seasonId=${selectedSeason.id}`);
        
        if (roundsResponse.ok) {
          const roundsData = await roundsResponse.json();
          const sortedRounds = roundsData.sort((a: any, b: any) => {
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            return dateB - dateA; // Most recent first
          });
          setRounds(sortedRounds);

          // Fetch race results for each round
          const allPoints: DriverPoints[] = [];
          for (const round of roundsData) {
            try {
              const resultsResponse = await fetch(`/api/race-results?roundId=${round.id}`);
              if (resultsResponse.ok) {
                const resultsData = await resultsResponse.json();
                
                // Check if round has heat races
                const hasHeatRace = resultsData.some((r: any) => r.raceType === 'heat');
                
                // Group results by division and race type for points calculation
                const resultsByDivisionAndType: Record<string, any[]> = {};
                resultsData.forEach((result: any) => {
                  const key = `${result.division}-${result.raceType}-${result.finalType || ''}`;
                  if (!resultsByDivisionAndType[key]) {
                    resultsByDivisionAndType[key] = [];
                  }
                  resultsByDivisionAndType[key].push(result);
                });
                
                // Calculate points for each group
                Object.values(resultsByDivisionAndType).forEach((groupResults: any[]) => {
                  // Sort by position to calculate overall position
                  const sortedResults = [...groupResults].sort((a, b) => a.position - b.position);
                  
                  sortedResults.forEach((result, index) => {
                    const overallPosition = index + 1;
                    const points = getPointsForPosition(
                      overallPosition,
                      result.raceType || 'qualification',
                      hasHeatRace
                    );
                    
                    const driver = drivers.find((d: any) => d.id === result.driverId);
                    
                    allPoints.push({
                      driverId: result.driverId,
                      driverName: result.driverName || driver?.name || 'Unknown Driver',
                      division: result.division,
                      roundId: round.id,
                      roundName: round.name,
                      roundNumber: round.roundNumber || 0,
                      position: result.position,
                      points: points,
                      confirmed: false,
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
          setDriverPoints(allPoints);
          setOriginalPoints(allPoints);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSeason]);

  // Track changes in editing
  useEffect(() => {
    setHasUnsavedChanges(Object.keys(editingPoints).length > 0);
  }, [editingPoints]);

  // Filter points
  const filteredPoints = useMemo(() => {
    let filtered = [...driverPoints];

    if (selectedRound !== 'all') {
      filtered = filtered.filter(p => p.roundId === selectedRound);
    }

    if (selectedDivision !== 'all') {
      filtered = filtered.filter(p => p.division === selectedDivision);
    }

    if (selectedRaceType !== 'all') {
      filtered = filtered.filter(p => p.raceType === selectedRaceType);
    }

    // Sort by round (most recent first), then by points (highest first)
    return filtered.sort((a, b) => {
      const roundCompare = b.roundNumber - a.roundNumber;
      if (roundCompare !== 0) return roundCompare;
      return b.points - a.points;
    });
  }, [driverPoints, selectedRound, selectedDivision, selectedRaceType]);

  // Group by driver
  const pointsByDriver = useMemo(() => {
    const grouped: Record<string, DriverPoints[]> = {};
    filteredPoints.forEach(point => {
      if (!grouped[point.driverId]) {
        grouped[point.driverId] = [];
      }
      grouped[point.driverId].push(point);
    });
    return grouped;
  }, [filteredPoints]);

  // Calculate total points per driver
  const driverTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.keys(pointsByDriver).forEach(driverId => {
      totals[driverId] = pointsByDriver[driverId].reduce((sum, p) => sum + p.points, 0);
    });
    return totals;
  }, [pointsByDriver]);

  // Calculate points per round per driver (when a specific round is selected)
  const roundTotalsByDriver = useMemo(() => {
    if (selectedRound === 'all') return {};
    
    const totals: Record<string, number> = {};
    // Sum all points for each driver in the selected round
    filteredPoints.forEach(point => {
      if (point.roundId === selectedRound) {
        const key = point.driverId;
        if (!totals[key]) {
          totals[key] = 0;
        }
        totals[key] += point.points || 0;
      }
    });
    return totals;
  }, [filteredPoints, selectedRound]);

  // Group points by driver and round for display
  const pointsByDriverAndRound = useMemo(() => {
    const grouped: Record<string, Record<string, DriverPoints[]>> = {};
    filteredPoints.forEach(point => {
      if (!grouped[point.driverId]) {
        grouped[point.driverId] = {};
      }
      if (!grouped[point.driverId][point.roundId]) {
        grouped[point.driverId][point.roundId] = [];
      }
      grouped[point.driverId][point.roundId].push(point);
    });
    return grouped;
  }, [filteredPoints]);

  // Handler to edit points
  const handleEditPoints = (point: DriverPoints, newPoints: number) => {
    const key = `${point.driverId}-${point.roundId}-${point.raceType}-${point.finalType || ''}`;
    setEditingPoints(prev => ({
      ...prev,
      [key]: newPoints
    }));
  };

  // Handler to save all changes to Google Sheets
  const handleSaveAllChanges = async () => {
    if (!selectedSeason) {
      alert('No season selected');
      return;
    }

    if (Object.keys(editingPoints).length === 0) {
      alert('No changes to save');
      return;
    }

    const confirmMsg = `Save ${Object.keys(editingPoints).length} point change(s) to Google Sheets?`;
    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      setIsSaving(true);

      // Update each modified point
      for (const [key, newPoints] of Object.entries(editingPoints)) {
        // Parse the key to extract point details
        const [driverId, roundId, raceType, finalType] = key.split('-');
        
        // Find the original point
        const originalPoint = driverPoints.find(p => 
          p.driverId === driverId && 
          p.roundId === roundId && 
          p.raceType === raceType && 
          (p.finalType || '') === finalType
        );

        if (!originalPoint) continue;

        // Update the race result with new points via API
        const response = await fetch('/api/race-results', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roundId,
            driverId,
            division: originalPoint.division,
            raceType: raceType || 'qualification',
            finalType: finalType || undefined,
            points: newPoints,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update points for ${originalPoint.driverName}`);
        }
      }

      // Refresh data after saving
      const roundsResponse = await fetch(`/api/rounds?seasonId=${selectedSeason.id}`);
      if (roundsResponse.ok) {
        const roundsData = await roundsResponse.json();
        
        // Fetch results for each round
        const allPoints: DriverPoints[] = [];
        for (const round of roundsData) {
          try {
            const resultsResponse = await fetch(`/api/race-results?roundId=${round.id}`);
            if (resultsResponse.ok) {
              const resultsData = await resultsResponse.json();
              
              // Check if round has heat races
              const hasHeatRace = resultsData.some((r: any) => r.raceType === 'heat');
              
              // Group results by division and race type for points calculation
              const resultsByDivisionAndType: Record<string, any[]> = {};
              resultsData.forEach((result: any) => {
                const key = `${result.division}-${result.raceType}-${result.finalType || ''}`;
                if (!resultsByDivisionAndType[key]) {
                  resultsByDivisionAndType[key] = [];
                }
                resultsByDivisionAndType[key].push(result);
              });
              
              // Calculate points for each group
              Object.values(resultsByDivisionAndType).forEach((groupResults: any[]) => {
                const sortedResults = [...groupResults].sort((a, b) => a.position - b.position);
                
                sortedResults.forEach((result, index) => {
                  const overallPosition = index + 1;
                  const points = getPointsForPosition(
                    overallPosition,
                    result.raceType || 'qualification',
                    hasHeatRace
                  );
                  
                  const driver = drivers.find((d: any) => d.id === result.driverId);
                  
                  allPoints.push({
                    driverId: result.driverId,
                    driverName: result.driverName || driver?.name || 'Unknown Driver',
                    division: result.division,
                    roundId: round.id,
                    roundName: round.name,
                    roundNumber: round.roundNumber || 0,
                    position: result.position,
                    points: result.points || points,
                    confirmed: false,
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
        setDriverPoints(allPoints);
        setOriginalPoints(allPoints);
      }

      // Clear editing state
      setEditingPoints({});
      alert('Points saved successfully!');
    } catch (error) {
      console.error('Error saving points:', error);
      alert('Failed to save points. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler to cancel all changes
  const handleCancelChanges = () => {
    if (Object.keys(editingPoints).length > 0) {
      if (confirm('Discard all unsaved changes?')) {
        setEditingPoints({});
      }
    }
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
                <p className="text-slate-600 dark:text-slate-400">Loading points...</p>
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
              Points Management
            </h1>
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelChanges}
                  disabled={isSaving}
                  className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-all font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel Changes
                </button>
                <button
                  onClick={handleSaveAllChanges}
                  disabled={isSaving}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save All Changes ({Object.keys(editingPoints).length})
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Round
                </label>
                <select
                  value={selectedRound}
                  onChange={(e) => setSelectedRound(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Rounds</option>
                  {rounds.map(round => (
                    <option key={round.id} value={round.id}>
                      Round {round.roundNumber}: {round.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Division
                </label>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value as Division | 'all')}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Divisions</option>
                  <option value="Division 1">Division 1</option>
                  <option value="Division 2">Division 2</option>
                  <option value="Division 3">Division 3</option>
                  <option value="Division 4">Division 4</option>
                  <option value="New">New</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Race Type
                </label>
                <select
                  value={selectedRaceType}
                  onChange={(e) => setSelectedRaceType(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Race Types</option>
                  <option value="qualification">Qualification</option>
                  <option value="heat">Heat</option>
                  <option value="final">Final</option>
                </select>
              </div>
            </div>
          </div>

          {/* Points Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
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
                      Position
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Race Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Points
                    </th>
                    {selectedRound !== 'all' && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Round Total
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Total Points
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredPoints.length === 0 ? (
                    <tr>
                      <td colSpan={selectedRound !== 'all' ? 7 : 6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        No points data found. Adjust your filters or add race results.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      // Track which drivers we've shown round totals for
                      const shownRoundTotals = new Set<string>();
                      
                      return filteredPoints.map((point, index) => {
                        const totalPoints = driverTotals[point.driverId] || 0;
                        const roundTotal = selectedRound !== 'all' ? (roundTotalsByDriver[point.driverId] || 0) : null;
                        
                        // Check if this is the first row for this driver in this round (to show round total)
                        const driverRoundKey = `${point.driverId}-${point.roundId}`;
                        const isFirstRowForDriverRound = !shownRoundTotals.has(driverRoundKey);
                        if (isFirstRowForDriverRound) {
                          shownRoundTotals.add(driverRoundKey);
                        }
                      
                      return (
                        <tr key={`${point.roundId}-${point.driverId}-${point.raceType}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {totalPoints === Math.max(...Object.values(driverTotals)) && totalPoints > 0 && (
                                <Trophy className="w-4 h-4 text-amber-500" />
                              )}
                              <span className="text-sm font-medium text-slate-900 dark:text-white">
                                {point.driverName || 'Unknown Driver'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getDivisionColor(point.division)}`}>
                              {point.division}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                            Round {point.roundNumber}: {point.roundName}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {point.position}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 capitalize">
                            {point.raceType || 'qualification'} {point.finalType && `(${point.finalType})`}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={editingPoints[`${point.driverId}-${point.roundId}-${point.raceType}-${point.finalType || ''}`] ?? point.points}
                                onChange={(e) => handleEditPoints(point, parseInt(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-semibold"
                                min="0"
                              />
                              {editingPoints[`${point.driverId}-${point.roundId}-${point.raceType}-${point.finalType || ''}`] !== undefined && (
                                <span className="text-xs text-orange-600 dark:text-orange-400">*</span>
                              )}
                            </div>
                          </td>
                          {selectedRound !== 'all' && (
                            <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                              {isFirstRowForDriverRound ? (
                                <span className="px-2 py-1 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-300 rounded font-bold">
                                  {roundTotal}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                            {totalPoints}
                          </td>
                        </tr>
                        );
                      });
                    })()
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

