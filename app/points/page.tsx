'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import { useSeason } from '@/components/SeasonContext';
import { Division } from '@/types';
import { Loader2, Save, X, ArrowUp, ArrowDown, Trophy, Edit, Trash2 } from 'lucide-react';
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

// Helper function to get race type badge color
const getRaceTypeBadgeColor = (raceType: string, finalType?: string) => {
  if (raceType === 'final' && finalType) {
    // Color code Final A, B, C, D, E, F
    switch (finalType.toUpperCase()) {
      case 'A':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      case 'B':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
      case 'C':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'D':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'E':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'F':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  }
  
  // Other race types
  switch (raceType) {
    case 'qualification':
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    case 'heat':
      return 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200';
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
  overallPosition: number;
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
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<Division>('Division 1');
  const [selectedRaceType, setSelectedRaceType] = useState<string>('');
  const [drivers, setDrivers] = useState<any[]>([]);
  
  // Editing state
  const [editingPoints, setEditingPoints] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savedPoints, setSavedPoints] = useState<Record<string, number>>({});
  
  // Get available race types from current data
  const availableRaceTypes = useMemo(() => {
    const raceTypes = new Set<string>();
    driverPoints.forEach(point => {
      if (point.raceType) {
        raceTypes.add(point.raceType);
      }
    });
    const hasHeat = raceTypes.has('heat');
    const types: string[] = [];
    if (hasHeat) {
      types.push('heat');
    }
    if (raceTypes.has('final')) {
      types.push('final');
    }
    return types;
  }, [driverPoints]);

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
                
                // Results are grouped by division, so we need to flatten them
                const allResults: any[] = [];
                if (Array.isArray(resultsData)) {
                  resultsData.forEach((divisionGroup: any) => {
                    if (divisionGroup.results && Array.isArray(divisionGroup.results)) {
                      divisionGroup.results.forEach((result: any) => {
                        allResults.push({
                          ...result,
                          division: divisionGroup.division || result.division,
                        });
                      });
                    }
                  });
                }
                
                // Check if round has heat races
                const hasHeatRace = allResults.some((r: any) => r.raceType === 'heat');
                
                // Group results by division and race type for points calculation
                const resultsByDivisionAndType: Record<string, any[]> = {};
                allResults.forEach((result: any) => {
                  const key = `${result.division}-${result.raceType || 'qualification'}-${result.finalType || ''}`;
                  if (!resultsByDivisionAndType[key]) {
                    resultsByDivisionAndType[key] = [];
                  }
                  resultsByDivisionAndType[key].push(result);
                });
                
                // Calculate points for each group
                Object.values(resultsByDivisionAndType).forEach((groupResults: any[]) => {
                  // Sort by overallPosition if available, otherwise by position
                  const sortedResults = [...groupResults].sort((a, b) => {
                    if (a.overallPosition && b.overallPosition) {
                      return a.overallPosition - b.overallPosition;
                    }
                    return (a.position || 0) - (b.position || 0);
                  });
                  
                  sortedResults.forEach((result, index) => {
                    const overallPosition = result.overallPosition || (index + 1);
                    const points = result.points || getPointsForPosition(
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
                      roundName: round.location || 'TBD',
                      roundNumber: round.roundNumber || 0,
                      position: result.position || result.gridPosition || 0,
                      overallPosition: overallPosition,
                      points: points,
                      confirmed: result.confirmed || false,
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
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSeason, drivers.length]);

  // Track changes in editing
  useEffect(() => {
    setHasUnsavedChanges(Object.keys(editingPoints).length > 0);
  }, [editingPoints]);

  // Auto-select first round when rounds are loaded
  useEffect(() => {
    if (rounds.length > 0 && !selectedRound) {
      setSelectedRound(rounds[0].id);
    }
  }, [rounds, selectedRound]);

  // Auto-select first race type when available race types are loaded
  useEffect(() => {
    if (availableRaceTypes.length > 0 && !selectedRaceType) {
      setSelectedRaceType(availableRaceTypes[0]);
    }
  }, [availableRaceTypes, selectedRaceType]);

  // Filter points and calculate overall position based on filters
  const filteredPoints = useMemo(() => {
    let filtered = [...driverPoints];

    if (selectedRound) {
      filtered = filtered.filter(p => p.roundId === selectedRound);
    }

    if (selectedDivision) {
      filtered = filtered.filter(p => p.division === selectedDivision);
    }

    if (selectedRaceType) {
      filtered = filtered.filter(p => p.raceType === selectedRaceType);
    }

    // Group by division and round only (not by race type) to calculate overall position across all race types
    const grouped: Record<string, DriverPoints[]> = {};
    filtered.forEach(point => {
      const key = `${point.division}-${point.roundId}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(point);
    });

    // Helper function to get race type priority for sorting (Final A > Final B > Final C, etc.)
    const getRaceTypePriority = (raceType: string, finalType?: string): number => {
      if (raceType === 'final' && finalType) {
        // Final A = 1, Final B = 2, etc. (lower number = higher priority)
        return finalType.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
      }
      if (raceType === 'heat') return 100; // Heat races come after finals
      if (raceType === 'qualification') return 200; // Qualification comes last
      return 300; // Unknown types
    };

    // Calculate overall position across all race types within each group
    const pointsWithOverallPosition: DriverPoints[] = [];
    Object.values(grouped).forEach(group => {
      // Check if heat races exist for this round/division combination in the original data
      // (not just in the filtered group, because user might be filtering by race type)
      const firstPoint = group[0];
      if (!firstPoint) return;
      
      // Check original driverPoints data to see if heat races exist for this round/division
      const hasHeatRace = driverPoints.some(p => 
        p.roundId === firstPoint.roundId && 
        p.division === firstPoint.division &&
        p.raceType === 'heat'
      );
      
      // Sort by points (considering edits) - this allows dynamic movement when editing
      // Points take priority over race type when editing
      const sorted = [...group].sort((a, b) => {
        const aKey = `${a.driverId}-${a.roundId}-${a.raceType}-${a.finalType || ''}`;
        const bKey = `${b.driverId}-${b.roundId}-${b.raceType}-${b.finalType || ''}`;
        const aPoints = editingPoints[aKey] !== undefined ? editingPoints[aKey] : (savedPoints[aKey] || a.points);
        const bPoints = editingPoints[bKey] !== undefined ? editingPoints[bKey] : (savedPoints[bKey] || b.points);
        
        // Primary sort: by points (higher first) - this enables dynamic movement
        if (bPoints !== aPoints) {
          return bPoints - aPoints;
        }
        
        // Secondary sort: by race type priority (Final A > Final B > ...) when points are equal
        const aPriority = getRaceTypePriority(a.raceType || 'qualification', a.finalType);
        const bPriority = getRaceTypePriority(b.raceType || 'qualification', b.finalType);
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // Tertiary sort: by driver name for consistency
        return a.driverName.localeCompare(b.driverName);
      });

      // Assign overall positions sequentially across all race types
      sorted.forEach((point, index) => {
        const newOverallPosition = index + 1;
        
        const key = `${point.driverId}-${point.roundId}-${point.raceType}-${point.finalType || ''}`;
        const hasEdit = editingPoints[key] !== undefined;
        const hasSaved = savedPoints[key] !== undefined;
        
        let finalPoints: number;
        
        // If points are being edited, use the edited value (don't recalculate)
        if (hasEdit) {
          finalPoints = editingPoints[key];
        } else if (hasSaved) {
          // If points were previously saved, use saved value
          finalPoints = savedPoints[key];
        } else {
          // Only recalculate if no edits or saved values exist
          // Use major points for final if heat race exists, minor points for heat if heat race exists
          const raceType = point.raceType || 'qualification';
          finalPoints = getPointsForPosition(
            newOverallPosition,
            raceType as 'qualification' | 'heat' | 'final',
            hasHeatRace
          );
        }
        
        pointsWithOverallPosition.push({
          ...point,
          overallPosition: newOverallPosition,
          points: finalPoints,
        });
      });
    });

    // Sort by round (most recent first), then by overall position
    return pointsWithOverallPosition.sort((a, b) => {
      const roundCompare = b.roundNumber - a.roundNumber;
      if (roundCompare !== 0) return roundCompare;
      return a.overallPosition - b.overallPosition;
    });
  }, [driverPoints, selectedRound, selectedDivision, selectedRaceType, editingPoints, savedPoints]);

  // Calculate total points per driver
  const driverTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredPoints.forEach(point => {
      const key = `${point.driverId}-${point.roundId}-${point.raceType}-${point.finalType || ''}`;
      const points = editingPoints[key] !== undefined ? editingPoints[key] : (savedPoints[key] || point.points);
      
      if (!totals[point.driverId]) {
        totals[point.driverId] = 0;
      }
      totals[point.driverId] += points;
    });
    return totals;
  }, [filteredPoints, editingPoints, savedPoints]);

  // Handler to edit points
  const handleEditPoints = (point: DriverPoints, newPoints: number) => {
    const key = `${point.driverId}-${point.roundId}-${point.raceType}-${point.finalType || ''}`;
    setEditingPoints(prev => ({
      ...prev,
      [key]: newPoints
    }));
  };

  // Handler to save all points (current state of the view)
  const handleSaveAllChanges = async () => {
    if (!selectedSeason) {
      alert('No season selected');
      return;
    }

    const pointsToSave = filteredPoints.length;
    if (pointsToSave === 0) {
      alert('No points to save');
      return;
    }

    const confirmMsg = `Save ${pointsToSave} point record(s) to the database?`;
    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      setIsSaving(true);

      // Save all current points from the filtered view
      for (const point of filteredPoints) {
        const key = `${point.driverId}-${point.roundId}-${point.raceType}-${point.finalType || ''}`;
        const currentPoints = editingPoints[key] !== undefined 
          ? editingPoints[key] 
          : (savedPoints[key] || point.points);
        
        const pointsId = `points-${point.roundId}-${point.driverId}-${point.raceType}-${point.finalType || ''}`;
        
        // Save to points table via API
        const response = await fetch('/api/points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: pointsId,
            seasonId: selectedSeason.id,
            roundId: point.roundId,
            driverId: point.driverId,
            division: point.division,
            raceType: point.raceType || 'qualification',
            finalType: point.finalType || undefined,
            overallPosition: point.overallPosition,
            points: currentPoints,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save points for ${point.driverName}`);
        }
      }

      // Move edited points to saved points
      setSavedPoints(prev => ({ ...prev, ...editingPoints }));
      setEditingPoints({});
      
      // Refresh data
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
              
              // Flatten results
              const allResults: any[] = [];
              if (Array.isArray(resultsData)) {
                resultsData.forEach((divisionGroup: any) => {
                  if (divisionGroup.results && Array.isArray(divisionGroup.results)) {
                    divisionGroup.results.forEach((result: any) => {
                      allResults.push({
                        ...result,
                        division: divisionGroup.division || result.division,
                      });
                    });
                  }
                });
              }
              
              const hasHeatRace = allResults.some((r: any) => r.raceType === 'heat');
              
              const resultsByDivisionAndType: Record<string, any[]> = {};
              allResults.forEach((result: any) => {
                const key = `${result.division}-${result.raceType || 'qualification'}-${result.finalType || ''}`;
                if (!resultsByDivisionAndType[key]) {
                  resultsByDivisionAndType[key] = [];
                }
                resultsByDivisionAndType[key].push(result);
              });
              
              Object.values(resultsByDivisionAndType).forEach((groupResults: any[]) => {
                const sortedResults = [...groupResults].sort((a, b) => {
                  if (a.overallPosition && b.overallPosition) {
                    return a.overallPosition - b.overallPosition;
                  }
                  return (a.position || 0) - (b.position || 0);
                });
                
                sortedResults.forEach((result, index) => {
                  const overallPosition = result.overallPosition || (index + 1);
                  const points = result.points || getPointsForPosition(
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
                    roundName: round.location || 'TBD',
                    roundNumber: round.roundNumber || 0,
                    position: result.position || result.gridPosition || 0,
                    overallPosition: overallPosition,
                    points: points,
                    confirmed: result.confirmed || false,
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
      }

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

  // Handler to delete points
  const handleDeletePoints = async (point: DriverPoints) => {
    if (!selectedSeason) {
      alert('No season selected');
      return;
    }

    const confirmMsg = `Are you sure you want to delete points for ${point.driverName} in Round ${point.roundNumber} (${point.raceType}${point.finalType ? ` ${point.finalType}` : ''})?`;
    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      // First, fetch the actual points from the database to get the real ID
      const pointsResponse = await fetch(`/api/points?roundId=${point.roundId}`);
      if (!pointsResponse.ok) {
        throw new Error('Failed to fetch points');
      }

      const allPoints = await pointsResponse.json();
      
      // Find the point that matches this driver, race type, and final type
      const matchingPoint = allPoints.find((p: any) => 
        p.driverId === point.driverId &&
        p.raceType === (point.raceType || 'qualification') &&
        (p.finalType || '') === (point.finalType || '')
      );

      if (!matchingPoint || !matchingPoint.id) {
        // Point doesn't exist in database yet, just remove from local state
        setDriverPoints(prev => prev.filter(p => 
          !(p.driverId === point.driverId && 
            p.roundId === point.roundId &&
            p.raceType === point.raceType &&
            (p.finalType || '') === (point.finalType || ''))
        ));
        alert('Points removed from view (were not saved in database)');
        return;
      }

      // Delete using the actual ID
      const deleteResponse = await fetch(`/api/points?id=${matchingPoint.id}`, {
        method: 'DELETE',
      });

      if (!deleteResponse.ok) {
        throw new Error('Failed to delete points');
      }

      // Remove from local state
      setDriverPoints(prev => prev.filter(p => 
        !(p.driverId === point.driverId && 
          p.roundId === point.roundId &&
          p.raceType === point.raceType &&
          (p.finalType || '') === (point.finalType || ''))
      ));

      // Clear any editing state for this point
      const key = `${point.driverId}-${point.roundId}-${point.raceType}-${point.finalType || ''}`;
      setEditingPoints(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
      setSavedPoints(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });

      alert('Points deleted successfully!');
    } catch (error) {
      console.error('Error deleting points:', error);
      alert('Failed to delete points. Please try again.');
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
      <PageLayout
        title="Points Management"
        subtitle="View and edit driver points across all rounds"
        icon={Trophy}
        headerActions={
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <button
                onClick={handleCancelChanges}
                disabled={isSaving}
                className="px-4 py-2.5 bg-slate-500 text-white rounded-xl hover:bg-slate-600 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel Changes
              </button>
            )}
            <button
              onClick={handleSaveAllChanges}
              disabled={isSaving || filteredPoints.length === 0}
              className="px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg hover:shadow-xl hover-lift disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Points ({filteredPoints.length})
                </>
              )}
            </button>
          </div>
        }
      >
        {/* Filters */}
        <SectionCard
          icon={Edit}
          title="Filters"
          className="mb-8"
        >
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
                  {rounds.map(round => (
                    <option key={round.id} value={round.id}>
                      Round {round.roundNumber}: {round.location || 'TBD'}
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
                  onChange={(e) => setSelectedDivision(e.target.value as Division)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
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
                  {availableRaceTypes.includes('heat') && (
                    <option value="heat">Heat</option>
                  )}
                  {availableRaceTypes.includes('final') && (
                    <option value="final">Final</option>
                  )}
                </select>
              </div>
            </div>
        </SectionCard>

        {/* Points Table */}
        <SectionCard
          title="Points Table"
          icon={Trophy}
          noPadding
        >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Overall Position
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
                      Race Position
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Race Type
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
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        No points data found. Adjust your filters or add race results.
                      </td>
                    </tr>
                  ) : (
                    filteredPoints.map((point, index) => {
                      const key = `${point.driverId}-${point.roundId}-${point.raceType}-${point.finalType || ''}`;
                      const currentPoints = editingPoints[key] !== undefined ? editingPoints[key] : (savedPoints[key] || point.points);
                      const totalPoints = driverTotals[point.driverId] || 0;
                      const previousPoint = index > 0 ? filteredPoints[index - 1] : null;
                      const previousKey = previousPoint ? `${previousPoint.driverId}-${previousPoint.roundId}-${previousPoint.raceType}-${previousPoint.finalType || ''}` : null;
                      const previousPoints = previousKey ? (editingPoints[previousKey] !== undefined ? editingPoints[previousKey] : (savedPoints[previousKey] || previousPoint?.points || 0)) : null;
                      const pointsChanged = currentPoints !== point.points;
                      const movedDown = previousPoint && previousPoints !== null && previousPoints < currentPoints;
                      
                      return (
                        <tr 
                          key={`${point.roundId}-${point.driverId}-${point.raceType}-${index}`} 
                          className={`hover:bg-slate-50 dark:hover:bg-slate-700 ${movedDown ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                        >
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                            {point.overallPosition}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {point.driverName}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getDivisionColor(point.division)}`}>
                              {point.division}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                            Round {point.roundNumber}: {point.roundName}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {point.position || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getRaceTypeBadgeColor(point.raceType || 'qualification', point.finalType)}`}>
                              {point.raceType === 'final' && point.finalType 
                                ? `Final ${point.finalType.toUpperCase()}` 
                                : point.raceType ? point.raceType.charAt(0).toUpperCase() + point.raceType.slice(1) 
                                : 'Qualification'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={currentPoints}
                                onChange={(e) => handleEditPoints(point, parseInt(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-semibold"
                                min="0"
                              />
                              {pointsChanged && (
                                <span className="text-xs text-orange-600 dark:text-orange-400">*</span>
                              )}
                              {movedDown && (
                                <ArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                            {totalPoints}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDeletePoints(point)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                              title="Delete points"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
