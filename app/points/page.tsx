'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import { useSeason } from '@/components/SeasonContext';
import { Division } from '@/types';
import { Loader2, Check, Edit2, Save, X } from 'lucide-react';

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
          const sortedRounds = roundsData.sort((a: any, b: any) => {
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            return dateB - dateA; // Most recent first
          });
          setRounds(sortedRounds);
          
          // Set the most recent round as default if available and no round is selected
          if (sortedRounds.length > 0 && selectedRound === 'all') {
            setSelectedRound(sortedRounds[0].id);
          }

          // Fetch results for each round from Race Results Records
          const allPoints: DriverPoints[] = [];
          for (const round of roundsData) {
            try {
              const recordsResponse = await fetch(`/api/race-result-records?roundId=${round.id}`);
              if (recordsResponse.ok) {
                const recordsData = await recordsResponse.json();
                // Records are already flat, just map them to DriverPoints format
                recordsData.forEach((record: any) => {
                  allPoints.push({
                    driverId: record.driverId,
                    driverName: record.driverName || '',
                    division: record.division,
                    roundId: round.id,
                    roundName: round.name,
                    roundNumber: round.roundNumber || 0,
                    position: record.position,
                    points: record.points || 0,
                    confirmed: false, // Race result records don't have confirmed field
                    raceType: record.raceType || 'qualification',
                    finalType: record.finalType || '',
                  });
                });
              }
            } catch (error) {
              console.error(`Error fetching records for round ${round.id}:`, error);
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

  const handleEditPoints = (point: DriverPoints) => {
    setEditingPoint({ driverId: point.driverId, roundId: point.roundId });
    setEditedPoints(point.points);
  };

  const handleSavePoints = async (point: DriverPoints) => {
    try {
      // Update Race Results Records (where the data comes from)
      const finalType = point.finalType || '';
      const response = await fetch(`/api/race-result-records?roundId=${point.roundId}&driverId=${point.driverId}&division=${encodeURIComponent(point.division)}&raceType=${encodeURIComponent(point.raceType || 'qualification')}&finalType=${encodeURIComponent(finalType)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: editedPoints,
        }),
      });

      if (response.ok) {
        // Update local state
        setDriverPoints(prev => prev.map(p => 
          p.driverId === point.driverId && p.roundId === point.roundId && p.raceType === point.raceType && (p.finalType || '') === (point.finalType || '')
            ? { ...p, points: editedPoints }
            : p
        ));
        setEditingPoint(null);
        
        // Refresh data to ensure we have the latest
        const recordsResponse = await fetch(`/api/race-result-records?roundId=${point.roundId}`);
        if (recordsResponse.ok) {
          const recordsData = await recordsResponse.json();
          // Update the points for this specific record
          setDriverPoints(prev => prev.map(p => {
            const matchingRecord = recordsData.find((r: any) => 
              r.driverId === p.driverId && 
              r.roundId === p.roundId && 
              r.division === p.division &&
              r.raceType === p.raceType &&
              (r.finalType || '') === (p.finalType || '')
            );
            return matchingRecord ? { ...p, points: matchingRecord.points || p.points } : p;
          }));
        }
        
        alert('Points updated successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to update points: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating points:', error);
      alert('Failed to update points. Please try again.');
    }
  };

  const handleConfirmPoints = async (point: DriverPoints) => {
    try {
      // Race Results Records don't have a confirmed field
      // Points are considered confirmed when they're saved
      alert('Points are automatically confirmed when saved in Race Results Records.');
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredPoints.length === 0 ? (
                    <tr>
                      <td colSpan={selectedRound !== 'all' ? 8 : 7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        No points data found. Adjust your filters or add race results.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      // Track which drivers we've shown round totals for
                      const shownRoundTotals = new Set<string>();
                      
                      return filteredPoints.map((point, index) => {
                        const isEditing = editingPoint?.driverId === point.driverId && editingPoint?.roundId === point.roundId;
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
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                            {point.driverName || 'Unknown Driver'}
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
                            {point.raceType || 'qualification'}
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

