'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import { useSeason } from '@/components/SeasonContext';
import { Division } from '@/types';
import { Loader2, Check, Edit2, Save, X } from 'lucide-react';

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
}

export default function PointsPage() {
  const { selectedSeason } = useSeason();
  const [rounds, setRounds] = useState<any[]>([]);
  const [driverPoints, setDriverPoints] = useState<DriverPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<string>('all');
  const [selectedDivision, setSelectedDivision] = useState<Division | 'all'>('all');
  const [editingPoint, setEditingPoint] = useState<{ driverId: string; roundId: string } | null>(null);
  const [editedPoints, setEditedPoints] = useState<number>(0);

  // Fetch rounds and race results
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedSeason) {
        setRounds([]);
        setDriverPoints([]);
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
            return dateB - dateA; // Most recent first
          }));

          // Fetch results for each round
          const allPoints: DriverPoints[] = [];
          for (const round of roundsData) {
            try {
              const resultsResponse = await fetch(`/api/race-results?roundId=${round.id}`);
              if (resultsResponse.ok) {
                const resultsData = await resultsResponse.json();
                // Flatten the results structure
                resultsData.forEach((divisionResult: any) => {
                  divisionResult.results?.forEach((result: any) => {
                    allPoints.push({
                      driverId: result.driverId,
                      driverName: result.driverName || '',
                      division: divisionResult.division,
                      roundId: round.id,
                      roundName: round.name,
                      roundNumber: round.roundNumber || 0,
                      position: result.position,
                      points: result.points || 0,
                      confirmed: result.confirmed || false,
                      raceType: result.raceType || 'qualification',
                    });
                  });
                });
              }
            } catch (error) {
              console.error(`Error fetching results for round ${round.id}:`, error);
            }
          }
          setDriverPoints(allPoints);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSeason]);

  // Filter points
  const filteredPoints = useMemo(() => {
    let filtered = [...driverPoints];

    if (selectedRound !== 'all') {
      filtered = filtered.filter(p => p.roundId === selectedRound);
    }

    if (selectedDivision !== 'all') {
      filtered = filtered.filter(p => p.division === selectedDivision);
    }

    // Sort by round (most recent first), then by position
    return filtered.sort((a, b) => {
      const roundCompare = b.roundNumber - a.roundNumber;
      if (roundCompare !== 0) return roundCompare;
      return a.position - b.position;
    });
  }, [driverPoints, selectedRound, selectedDivision]);

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

  const handleEditPoints = (point: DriverPoints) => {
    setEditingPoint({ driverId: point.driverId, roundId: point.roundId });
    setEditedPoints(point.points);
  };

  const handleSavePoints = async (point: DriverPoints) => {
    try {
      const response = await fetch(`/api/race-results?roundId=${point.roundId}&driverId=${point.driverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          division: point.division,
          position: point.position,
          fastestLap: '',
          points: editedPoints,
          raceType: point.raceType || 'qualification',
          confirmed: point.confirmed,
        }),
      });

      if (response.ok) {
        // Update local state
        setDriverPoints(prev => prev.map(p => 
          p.driverId === point.driverId && p.roundId === point.roundId
            ? { ...p, points: editedPoints }
            : p
        ));
        setEditingPoint(null);
        alert('Points updated successfully!');
      } else {
        alert('Failed to update points. Please try again.');
      }
    } catch (error) {
      console.error('Error updating points:', error);
      alert('Failed to update points. Please try again.');
    }
  };

  const handleConfirmPoints = async (point: DriverPoints) => {
    try {
      // Update confirmed status via API
      const response = await fetch(`/api/race-results?roundId=${point.roundId}&driverId=${point.driverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          division: point.division,
          position: point.position,
          fastestLap: '',
          points: point.points,
          raceType: point.raceType || 'qualification',
          confirmed: true,
        }),
      });

      if (response.ok) {
        setDriverPoints(prev => prev.map(p => 
          p.driverId === point.driverId && p.roundId === point.roundId
            ? { ...p, confirmed: true }
            : p
        ));
        alert('Points confirmed!');
      } else {
        alert('Failed to confirm points. Please try again.');
      }
    } catch (error) {
      console.error('Error confirming points:', error);
      alert('Failed to confirm points. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingPoint(null);
    setEditedPoints(0);
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-6">
            Points Management
          </h1>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      Points
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Total Points
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredPoints.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        No points data found. Adjust your filters or add race results.
                      </td>
                    </tr>
                  ) : (
                    filteredPoints.map((point, index) => {
                      const isEditing = editingPoint?.driverId === point.driverId && editingPoint?.roundId === point.roundId;
                      const totalPoints = driverTotals[point.driverId] || 0;
                      
                      return (
                        <tr key={`${point.roundId}-${point.driverId}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                            {point.driverName || 'Unknown Driver'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {point.division}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                            Round {point.roundNumber}: {point.roundName}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {point.position}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editedPoints}
                                onChange={(e) => setEditedPoints(parseInt(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                min="0"
                              />
                            ) : (
                              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                {point.points}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                            {totalPoints}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSavePoints(point)}
                                    className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                    title="Save"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                    title="Cancel"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditPoints(point)}
                                    className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                    title="Edit Points"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  {!point.confirmed && (
                                    <button
                                      onClick={() => handleConfirmPoints(point)}
                                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                      title="Confirm Points"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
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

