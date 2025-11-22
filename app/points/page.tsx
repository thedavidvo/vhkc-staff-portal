'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import { useSeason } from '@/components/SeasonContext';
import { Division } from '@/types';
import { Loader2, Save, X, ArrowUp, ArrowDown, ArrowUpDown, Trophy, Edit, Trash2, List, Check, FileText, MessageSquare, Plus } from 'lucide-react';
import { getPointsForPosition, getAllPointsForPosition } from '@/lib/pointsSystem';

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
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  }
};

// Helper function to get race type badge color - matching division badge style
const getRaceTypeBadgeColor = (raceType: string, finalType?: string) => {
  if (raceType === 'final' && finalType) {
    // Color code Final A, B, C, D, E, F - matching division badge style
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
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
    }
  }
  
  if (raceType === 'heat' && finalType) {
    // Color code Heat A, B, C, D, E, F - matching division badge style
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
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
    }
  }
  
  // Other race types
  switch (raceType) {
    case 'qualification':
      return 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200';
    case 'heat':
      return 'bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  }
};

interface DriverPoints {
  driverId: string;
  driverName: string;
  division: Division;
  driverDivision?: Division;
  roundId: string;
  roundName: string;
  roundNumber: number;
  position: number;
  overallPosition: number;
  points: number;
  confirmed: boolean;
  raceType?: string;
  finalType?: string;
  note?: string;
}

export default function PointsPage() {
  const { selectedSeason } = useSeason();
  const [rounds, setRounds] = useState<any[]>([]);
  const [driverPoints, setDriverPoints] = useState<DriverPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [selectedRaceType, setSelectedRaceType] = useState<string>('');
  const [selectedHeatType, setSelectedHeatType] = useState<string>('');
  const [selectedFinalType, setSelectedFinalType] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<Division>('Division 1'); // Race Division
  const [selectedDriverDivision, setSelectedDriverDivision] = useState<Division | 'All'>('All'); // Driver Division filter
  const [drivers, setDrivers] = useState<any[]>([]);
  
  // Editing state
  const [editingPoints, setEditingPoints] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savedPoints, setSavedPoints] = useState<Record<string, number>>({});
  
  // Sorting state for points management table
  const [sortColumn, setSortColumn] = useState<'driver' | 'points' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Sorting state for saved points table
  const [savedSortColumn, setSavedSortColumn] = useState<'driver' | 'points' | null>(null);
  const [savedSortDirection, setSavedSortDirection] = useState<'asc' | 'desc'>('asc');

  // Tab state for saved points
  const [activeTab, setActiveTab] = useState<'points' | 'saved'>('points');

  // Saved points state
  const [savedPointsList, setSavedPointsList] = useState<any[]>([]);
  const [loadingSavedPoints, setLoadingSavedPoints] = useState(false);
  const [selectedSavedPoints, setSelectedSavedPoints] = useState<Set<string>>(new Set());
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [editingSavedPoints, setEditingSavedPoints] = useState<{ [key: string]: number }>({});
  const [savingSavedPoint, setSavingSavedPoint] = useState<string | null>(null);

  // Note modal state
  const [noteModalPoint, setNoteModalPoint] = useState<any>(null);
  const [noteModalIsViewOnly, setNoteModalIsViewOnly] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  
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
    // Only show heat and final (no qualification) in Points Management
    if (hasHeat) {
      types.push('heat');
    }
    if (raceTypes.has('final')) {
      types.push('final');
    }
    return types;
  }, [driverPoints]);

  // Get available heat types based on selected race type, round, and division
  const availableHeatTypes = useMemo(() => {
    if (selectedRaceType !== 'heat') return [];
    
    const heatTypes = new Set<string>();
    driverPoints.forEach(point => {
      const matchesRound = !selectedRound || point.roundId === selectedRound;
      const matchesDivision = !selectedDivision || point.division === selectedDivision;
      
      if (point.raceType === 'heat' && point.finalType && matchesRound && matchesDivision) {
        heatTypes.add(point.finalType.toUpperCase());
      }
    });
    
    // If no heat types found, return default first heat type if heat race type exists
    if (heatTypes.size === 0 && selectedRaceType === 'heat') {
      return ['A'];
    }
    
    return Array.from(heatTypes).sort();
  }, [driverPoints, selectedRaceType, selectedRound, selectedDivision, selectedDriverDivision]);

  // Get available final types based on selected race type, round, and division
  const availableFinalTypes = useMemo(() => {
    if (selectedRaceType !== 'final') return [];
    
    const finalTypes = new Set<string>();
    driverPoints.forEach(point => {
      const matchesRound = !selectedRound || point.roundId === selectedRound;
      const matchesDivision = !selectedDivision || point.division === selectedDivision;
      
      if (point.raceType === 'final' && point.finalType && matchesRound && matchesDivision) {
        finalTypes.add(point.finalType.toUpperCase());
      }
    });
    
    // If no final types found, return default first final type if final race type exists
    if (finalTypes.size === 0 && selectedRaceType === 'final') {
      return ['A'];
    }
    
    return Array.from(finalTypes).sort();
  }, [driverPoints, selectedRaceType, selectedRound, selectedDivision, selectedDriverDivision]);

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
            const roundA = a.roundNumber || 0;
            const roundB = b.roundNumber || 0;
            return roundA - roundB; // Round 1 first (ascending)
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
                    
                    // Determine driver's division at this round
                    const driverDivision = result.driverDivision || driver?.division || result.division;
                    
                    allPoints.push({
                      driverId: result.driverId,
                      driverName: result.driverName || driver?.name || 'Unknown Driver',
                      division: result.division, // Race division
                      driverDivision: driverDivision, // Driver's division at that round
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

  // Reset heat/final type when race type changes
  useEffect(() => {
      setSelectedHeatType('');
    setSelectedFinalType('');
  }, [selectedRaceType]);

  // Fetch saved points when switching to saved tab
  useEffect(() => {
    if (activeTab === 'saved' && selectedSeason) {
      fetchSavedPoints();
    }
  }, [activeTab, selectedSeason]);

  // Fetch saved points from API
  const fetchSavedPoints = async () => {
    if (!selectedSeason) return;

      try {
        setLoadingSavedPoints(true);
        const response = await fetch(`/api/points?seasonId=${selectedSeason.id}`);
      
        if (response.ok) {
          const pointsData = await response.json();
          
        // Fetch all rounds to get round numbers
        const roundsResponse = await fetch(`/api/rounds?seasonId=${selectedSeason.id}`);
        const roundsData = roundsResponse.ok ? await roundsResponse.json() : [];
        
        // Map points with round information
        const enrichedPoints = pointsData.map((point: any) => {
          const round = roundsData.find((r: any) => r.id === point.roundId);
            return {
            ...point,
              roundNumber: round?.roundNumber || 0,
            roundName: round?.location || 'TBD',
            raceDivision: point.division, // Race division
            driverDivision: point.driverDivision || point.division, // Driver division at that round
            };
          });
          
        setSavedPointsList(enrichedPoints);
        }
      } catch (error) {
      console.error('Error fetching saved points:', error);
      } finally {
        setLoadingSavedPoints(false);
      }
    };

  // Helper function to check if a division is "Open"
  const isOpenDivision = (division: string) => {
    return division === 'Open' || division === 'Division 3 (Open)' || division === 'Division 4 (Open)';
  };

  // Filtered saved points based on filters
  const filteredSavedPoints = useMemo(() => {
    let filtered = [...savedPointsList];

    if (selectedRound) {
      filtered = filtered.filter(p => p.roundId === selectedRound);
    }

    if (selectedRaceType) {
      filtered = filtered.filter(p => p.raceType === selectedRaceType);
    }

    if (selectedRaceType === 'heat' && selectedHeatType) {
      filtered = filtered.filter(p => 
        p.finalType && p.finalType.toUpperCase() === selectedHeatType.toUpperCase()
      );
    }

    if (selectedRaceType === 'final' && selectedFinalType) {
      filtered = filtered.filter(p => 
        p.finalType && p.finalType.toUpperCase() === selectedFinalType.toUpperCase()
      );
    }

    // Filter by race division
    if (selectedDivision) {
      filtered = filtered.filter(p => p.raceDivision === selectedDivision);
    }

    // Filter by driver division
    if (selectedDriverDivision && selectedDriverDivision !== 'All') {
      filtered = filtered.filter(p => p.driverDivision === selectedDriverDivision);
    }

    // Apply column sorting if active
    if (savedSortColumn === 'driver') {
      return [...filtered].sort((a, b) => {
        const comparison = a.driverName.localeCompare(b.driverName);
        return savedSortDirection === 'asc' ? comparison : -comparison;
      });
    } else if (savedSortColumn === 'points') {
      return [...filtered].sort((a, b) => {
        const comparison = b.points - a.points;
        return savedSortDirection === 'asc' ? -comparison : comparison;
      });
    }

    return filtered;
  }, [savedPointsList, selectedRound, selectedRaceType, selectedHeatType, selectedFinalType, selectedDivision, selectedDriverDivision, savedSortColumn, savedSortDirection]);

  // Filter points and calculate overall position based on filters
  const filteredPoints = useMemo(() => {
    let filtered = [...driverPoints];

    if (selectedRound) {
      filtered = filtered.filter(p => p.roundId === selectedRound);
    }

    if (selectedRaceType) {
      filtered = filtered.filter(p => p.raceType === selectedRaceType);
    }

    // Filter by heat type if heat is selected
    if (selectedRaceType === 'heat' && selectedHeatType) {
      filtered = filtered.filter(p => 
        p.finalType && p.finalType.toUpperCase() === selectedHeatType.toUpperCase()
      );
    }

    // Filter by final type if final is selected
    if (selectedRaceType === 'final' && selectedFinalType) {
      filtered = filtered.filter(p => 
        p.finalType && p.finalType.toUpperCase() === selectedFinalType.toUpperCase()
      );
    }

    // Filter by race division
    if (selectedDivision) {
      filtered = filtered.filter(p => p.division === selectedDivision);
    }

    // Filter by driver division
    if (selectedDriverDivision && selectedDriverDivision !== 'All') {
      filtered = filtered.filter(p => p.driverDivision === selectedDriverDivision);
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
    let sorted = pointsWithOverallPosition.sort((a, b) => {
      const roundCompare = b.roundNumber - a.roundNumber;
      if (roundCompare !== 0) return roundCompare;
      return a.overallPosition - b.overallPosition;
    });

    // Apply column sorting if active
    if (sortColumn === 'driver') {
      return [...sorted].sort((a, b) => {
        const comparison = a.driverName.localeCompare(b.driverName);
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    } else if (sortColumn === 'points') {
      return [...sorted].sort((a, b) => {
        const aKey = `${a.driverId}-${a.roundId}-${a.raceType}-${a.finalType || ''}`;
        const bKey = `${b.driverId}-${b.roundId}-${b.raceType}-${b.finalType || ''}`;
        const aPoints = editingPoints[aKey] !== undefined ? editingPoints[aKey] : (savedPoints[aKey] !== undefined ? savedPoints[aKey] : a.points);
        const bPoints = editingPoints[bKey] !== undefined ? editingPoints[bKey] : (savedPoints[bKey] !== undefined ? savedPoints[bKey] : b.points);
        
        const comparison = bPoints - aPoints; // Default highest to lowest
        return sortDirection === 'asc' ? -comparison : comparison;
      });
    }

    return sorted;
  }, [driverPoints, selectedRound, selectedDivision, selectedDriverDivision, selectedRaceType, selectedHeatType, selectedFinalType, editingPoints, savedPoints, sortColumn, sortDirection]);

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

  // Handler for column sorting in points management table
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

  // Handler for column sorting in saved points table
  const handleSavedSort = (column: 'driver' | 'points') => {
    if (savedSortColumn === column) {
      // Toggle direction if same column
      setSavedSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                  } else {
      // Set new column with default direction
      setSavedSortColumn(column);
      setSavedSortDirection(column === 'points' ? 'desc' : 'asc'); // Points default to desc (high to low), driver to asc
    }
  };

  // Reset view handlers
  const handleResetView = () => {
    setSortColumn(null);
    setSortDirection('asc');
  };

  const handleResetSavedView = () => {
    setSavedSortColumn(null);
    setSavedSortDirection('asc');
  };

  // Handle select all saved points
  const handleToggleAllSavedPoints = () => {
    if (selectedSavedPoints.size === filteredSavedPoints.length) {
      setSelectedSavedPoints(new Set());
    } else {
      const allIds = filteredSavedPoints.map(p => p.id);
      setSelectedSavedPoints(new Set(allIds));
    }
  };

  // Handle toggle single saved point
  const handleToggleSavedPoint = (pointId: string) => {
    const newSelected = new Set(selectedSavedPoints);
    if (newSelected.has(pointId)) {
      newSelected.delete(pointId);
    } else {
      newSelected.add(pointId);
    }
    setSelectedSavedPoints(newSelected);
  };

  // Handle delete selected saved points
  const handleDeleteSelectedSavedPoints = async () => {
    if (selectedSavedPoints.size === 0) {
      alert('No points selected');
      return;
    }

    const confirmMsg = `Are you sure you want to delete ${selectedSavedPoints.size} selected saved point(s)?`;
    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      setIsDeletingSelected(true);
      
      // Delete all selected points
      const deletePromises = Array.from(selectedSavedPoints).map(pointId => 
        fetch(`/api/points?id=${pointId}`, {
          method: 'DELETE',
        })
      );

      const results = await Promise.all(deletePromises);
      
      // Check if all deletes were successful
      const failedDeletes = results.filter(r => !r.ok);
      if (failedDeletes.length > 0) {
        throw new Error(`Failed to delete ${failedDeletes.length} points`);
      }

      // Clear selection
      setSelectedSavedPoints(new Set());

      // Refresh saved points data
      await fetchSavedPoints();

      alert(`Successfully deleted ${selectedSavedPoints.size} saved points!`);
            } catch (error) {
      console.error('Error deleting selected points:', error);
      alert('Failed to delete some points. Please try again.');
    } finally {
      setIsDeletingSelected(false);
    }
  };

  // Handle save note for point change
  const handleSaveNote = async () => {
    if (!noteModalPoint || !selectedSeason) return;

    const key = `${noteModalPoint.driverId}-${noteModalPoint.roundId}-${noteModalPoint.raceType}-${noteModalPoint.finalType || ''}`;
    const currentPoints = editingPoints[key] !== undefined ? editingPoints[key] : (savedPoints[key] || noteModalPoint.points);
    
    try {
      const pointsId = `points-${noteModalPoint.roundId}-${noteModalPoint.driverId}-${noteModalPoint.raceType}-${noteModalPoint.finalType || ''}`;
      
      // Save to points table via API with note
      const response = await fetch('/api/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pointsId,
          seasonId: selectedSeason.id,
          roundId: noteModalPoint.roundId,
          driverId: noteModalPoint.driverId,
          division: noteModalPoint.division,
          raceType: noteModalPoint.raceType || 'qualification',
          finalType: noteModalPoint.finalType || undefined,
          overallPosition: noteModalPoint.overallPosition,
          points: currentPoints,
          note: noteText, // Save the note
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save note');
      }

      // Update saved points to include this point with note
      setSavedPoints(prev => ({ ...prev, [key]: currentPoints }));
      
      // Close modal
      setNoteModalPoint(null);
      setNoteText('');
      
      alert('Note saved successfully!');
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    }
  };

  // Handle cancel note
  const handleCancelNote = () => {
    setNoteModalPoint(null);
    setNoteText('');
  };

  // Handle edit saved point
  const handleEditSavedPoint = (pointId: string, currentPoints: number) => {
    setEditingSavedPoints(prev => ({ ...prev, [pointId]: currentPoints }));
  };

  // Handle save edited saved point
  const handleSaveSavedPoint = async (point: any) => {
    const newPoints = editingSavedPoints[point.id];
    if (newPoints === undefined || newPoints === point.points) {
      // No changes, just remove from editing
      const newEditing = { ...editingSavedPoints };
      delete newEditing[point.id];
      setEditingSavedPoints(newEditing);
      return;
    }

    try {
      setSavingSavedPoint(point.id);
      
      // Update the point in the database
      const response = await fetch('/api/points', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: point.id,
          points: newPoints,
          note: point.note, // Preserve existing note
          updatedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update points');
      }

      // Refresh saved points
      await fetchSavedPoints();
      
      // Remove from editing
      const newEditing = { ...editingSavedPoints };
      delete newEditing[point.id];
      setEditingSavedPoints(newEditing);
      
      alert('Points updated successfully!');
    } catch (error) {
      console.error('Error updating saved point:', error);
      alert('Failed to update points. Please try again.');
    } finally {
      setSavingSavedPoint(null);
    }
  };

  // Handle cancel editing saved point
  const handleCancelEditSavedPoint = (pointId: string) => {
    const newEditing = { ...editingSavedPoints };
    delete newEditing[pointId];
    setEditingSavedPoints(newEditing);
  };

  // Handle bulk delete all filtered saved points
  const handleBulkDeleteSavedPoints = async () => {
    if (filteredSavedPoints.length === 0) {
      alert('No points to delete');
      return;
    }

    const confirmMsg = `Are you sure you want to delete ALL ${filteredSavedPoints.length} filtered saved point(s)? This cannot be undone.`;
    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      setIsDeletingSelected(true);
      
      const deletePromises = filteredSavedPoints.map(point =>
        fetch(`/api/points?id=${point.id}`, { method: 'DELETE' })
      );

      const results = await Promise.all(deletePromises);
      
      const failedDeletes = results.filter(r => !r.ok);
      if (failedDeletes.length > 0) {
        throw new Error(`Failed to delete ${failedDeletes.length} points`);
      }

      // Clear selection
      setSelectedSavedPoints(new Set());

      // Refresh saved points data
      await fetchSavedPoints();

      alert(`Successfully deleted ${filteredSavedPoints.length} saved points!`);
            } catch (error) {
      console.error('Error bulk deleting points:', error);
      alert('Failed to delete some points. Please try again.');
    } finally {
      setIsDeletingSelected(false);
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
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
                
              <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Race Type
                  </label>
                  <select
                    value={selectedRaceType}
                  onChange={(e) => setSelectedRaceType(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {availableRaceTypes.includes('heat') && (
                      <option value="heat">Heat</option>
                    )}
                    {availableRaceTypes.includes('final') && (
                      <option value="final">Final</option>
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
                  {selectedRaceType === 'heat' && (
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
            
            {/* Tab Switcher */}
            <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('points')}
                  className={`px-6 py-3 font-medium transition-colors relative ${
                    activeTab === 'points'
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Points Management
                  {activeTab === 'points' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('saved')}
                  className={`px-6 py-3 font-medium transition-colors relative ${
                    activeTab === 'saved'
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Saved Results
                  {activeTab === 'saved' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Points Management Tab */}
            {activeTab === 'points' && (
            <>{/* Points Table */}
            <SectionCard
              title="Points Table"
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
                          Race Position
                        </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      onClick={() => handleSort('points')}
                    >
                      <div className="flex items-center gap-2">
                          Race Points
                        {sortColumn === 'points' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-40" />
                        )}
                      </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Total Points (H + F)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Note
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {filteredPoints.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
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
                      // Only show movedDown indicator when not sorting by driver or points
                      const movedDown = !sortColumn && previousPoint && previousPoints !== null && previousPoints < currentPoints;
                          
                          return (
                            <tr 
                              key={`${point.roundId}-${point.driverId}-${point.raceType}-${index}`} 
                              className={`hover:bg-slate-50 dark:hover:bg-slate-800 ${movedDown ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
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
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getDivisionColor(point.driverDivision || point.division)}`}>
                                  {point.driverDivision || point.division}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                Round {point.roundNumber}: {point.roundName}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getDivisionColor(point.division)}`}>
                                  {point.division}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getRaceTypeBadgeColor(point.raceType || 'qualification', point.finalType)}`}>
                                  {point.raceType === 'final' && point.finalType 
                                    ? `Final ${point.finalType.toUpperCase()}` 
                                    : point.raceType === 'heat' && point.finalType
                                    ? `Heat ${point.finalType.toUpperCase()}`
                                    : point.raceType ? point.raceType.charAt(0).toUpperCase() + point.raceType.slice(1) 
                                    : 'Qualification'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                {point.position || '-'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      value={currentPoints}
                                      onChange={(e) => handleEditPoints(point, parseInt(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold"
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
                              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                {(() => {
                                  // Get all points for this driver in this round
                                  const driverRoundPoints = filteredPoints.filter(p => 
                                    p.driverId === point.driverId && p.roundId === point.roundId
                                  );
                                  const heatPoints = driverRoundPoints
                                    .filter(p => p.raceType === 'heat')
                                    .reduce((sum, p) => {
                                      const pointKey = `${p.driverId}-${p.roundId}-${p.raceType}-${p.finalType || ''}`;
                                      const pts = editingPoints[pointKey] !== undefined ? editingPoints[pointKey] : (savedPoints[pointKey] || p.points);
                                      return sum + pts;
                                    }, 0);
                                  const finalPoints = driverRoundPoints
                                    .filter(p => p.raceType === 'final')
                                    .reduce((sum, p) => {
                                      const pointKey = `${p.driverId}-${p.roundId}-${p.raceType}-${p.finalType || ''}`;
                                      const pts = editingPoints[pointKey] !== undefined ? editingPoints[pointKey] : (savedPoints[pointKey] || p.points);
                                      return sum + pts;
                                    }, 0);
                                  
                                  if (heatPoints > 0 && finalPoints > 0) {
                                    return (
                                      <span className="font-medium">
                                        {totalPoints} <span className="text-xs text-slate-500 dark:text-slate-400">({heatPoints}H + {finalPoints}F)</span>
                                      </span>
                                    );
                                  } else if (heatPoints > 0) {
                                    return (
                                      <span className="font-medium">
                                        {totalPoints} <span className="text-xs text-slate-500 dark:text-slate-400">({heatPoints}H)</span>
                                      </span>
                                    );
                                  } else if (finalPoints > 0) {
                                    return (
                                      <span className="font-medium">
                                        {totalPoints} <span className="text-xs text-slate-500 dark:text-slate-400">({finalPoints}F)</span>
                                      </span>
                                    );
                                  }
                                  return <span className="font-semibold">{totalPoints}</span>;
                                })()}
                              </td>
                              <td className="px-4 py-3">
                                <div className="relative flex items-center gap-2">
                                  {/* Show note icon if points changed or note exists */}
                                  {(pointsChanged || point.note) && (
                                    <>
                                  <button
                                        onClick={() => {
                                          if (expandedNote === key) {
                                            setExpandedNote(null);
                                          } else {
                                            setExpandedNote(key);
                                            setNoteModalPoint(point);
                                            setNoteText(point.note || '');
                                          }
                                        }}
                                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg transition-colors relative"
                                        title={point.note ? "View/edit note" : "Add note for point change"}
                                      >
                                        <MessageSquare className="w-4 h-4" />
                                        {point.note && !pointsChanged && (
                                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary-500 rounded-full border border-white dark:border-slate-800"></span>
                                        )}
                                  </button>
                                      {expandedNote === key && (
                                        <div className="absolute right-0 top-full mt-2 z-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl p-4 w-80 max-w-[90vw]">
                                          <div className="flex items-start justify-between mb-2">
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                                              {point.note && !pointsChanged ? 'Note' : 'Add Note'}
                                            </h4>
                                            <button
                                              onClick={() => {
                                                setExpandedNote(null);
                                                setNoteText('');
                                              }}
                                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                            >
                                              <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                            </button>
                                          </div>
                                          {point.note && !pointsChanged ? (
                                            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                                              {point.note}
                                            </p>
                                          ) : (
                                            <>
                                              <textarea
                                                value={noteText}
                                                onChange={(e) => setNoteText(e.target.value)}
                                                rows={4}
                                                className="w-full px-3 py-2 mb-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="Enter reason for changing points..."
                                              />
                                              <div className="flex justify-end gap-2">
                                                <button
                                                  onClick={() => {
                                                    setExpandedNote(null);
                                                    setNoteText('');
                                                  }}
                                                  className="px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                                >
                                                  Cancel
                                                </button>
                                                <button
                                                  onClick={async () => {
                                                    await handleSaveNote();
                                                    setExpandedNote(null);
                                                  }}
                                                  disabled={!noteText.trim()}
                                                  className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded transition-colors disabled:cursor-not-allowed"
                                                >
                                                  Save Note
                                                </button>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}
                                  {/* Show + button if no note exists and points haven't changed */}
                                  {!pointsChanged && !point.note && (
                                    <>
                                      <button
                                        onClick={() => {
                                          if (expandedNote === key) {
                                            setExpandedNote(null);
                                          } else {
                                            setExpandedNote(key);
                                            setNoteModalPoint(point);
                                            setNoteText('');
                                          }
                                        }}
                                        className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                                        title="Add note"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </button>
                                      {expandedNote === key && (
                                        <div className="absolute right-0 top-full mt-2 z-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl p-4 w-80 max-w-[90vw]">
                                          <div className="flex items-start justify-between mb-2">
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Add Note</h4>
                                            <button
                                              onClick={() => {
                                                setExpandedNote(null);
                                                setNoteText('');
                                              }}
                                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                            >
                                              <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                            </button>
                                          </div>
                                          <textarea
                                            value={noteText}
                                            onChange={(e) => setNoteText(e.target.value)}
                                            rows={4}
                                            className="w-full px-3 py-2 mb-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="Enter note for this race result..."
                                          />
                                          <div className="flex justify-end gap-2">
                                            <button
                                              onClick={() => {
                                                setExpandedNote(null);
                                                setNoteText('');
                                              }}
                                              className="px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              onClick={async () => {
                                                await handleSaveNote();
                                                setExpandedNote(null);
                                              }}
                                              disabled={!noteText.trim()}
                                              className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded transition-colors disabled:cursor-not-allowed"
                                            >
                                              Save Note
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
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
          </>
        )}

            {/* Saved Results Tab */}
        {activeTab === 'saved' && (
              <SectionCard title="Saved Results" icon={List} noPadding>
                {loadingSavedPoints ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                    <p className="ml-2 text-slate-600 dark:text-slate-400">Loading saved points...</p>
                  </div>
                ) : (
                  <>
                    {/* Action Buttons */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Showing {filteredSavedPoints.length} of {savedPointsList.length} saved points
                          {selectedSavedPoints.size > 0 && (
                            <span className="ml-2 text-primary-600 dark:text-primary-400 font-medium">
                              ({selectedSavedPoints.size} selected)
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2">
                          {selectedSavedPoints.size > 0 && (
                            <button
                              onClick={handleDeleteSelectedSavedPoints}
                              disabled={isDeletingSelected}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                              title="Delete selected saved points"
                            >
                              <Trash2 className="w-4 h-4" />
                              {isDeletingSelected ? 'Deleting...' : `Delete Selected (${selectedSavedPoints.size})`}
                            </button>
                          )}
                          {filteredSavedPoints.length > 0 && (
                            <button
                              onClick={handleBulkDeleteSavedPoints}
                              disabled={isDeletingSelected}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                              title="Delete all filtered saved points"
                            >
                              <Trash2 className="w-4 h-4" />
                              {isDeletingSelected ? 'Deleting...' : `Delete All (${filteredSavedPoints.length})`}
                            </button>
                          )}
                </div>
              </div>
                    </div>

                    {/* Saved Results Table */}
                    {savedSortColumn && (
                      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Sorted by {savedSortColumn === 'driver' ? 'Driver' : 'Points'} ({savedSortDirection === 'asc' ? 'ascending' : 'descending'})
                        </p>
                        <button
                          onClick={handleResetSavedView}
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
                            <th className="px-4 py-3 text-left">
                              <input
                                type="checkbox"
                                checked={selectedSavedPoints.size === filteredSavedPoints.length && filteredSavedPoints.length > 0}
                                onChange={handleToggleAllSavedPoints}
                                className="w-4 h-4 text-primary-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-primary-500 focus:ring-2"
                                title="Select/Deselect all"
                              />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Round
                        </th>
                            <th 
                              className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              onClick={() => handleSavedSort('driver')}
                            >
                              <div className="flex items-center gap-2">
                          Driver
                                {savedSortColumn === 'driver' ? (
                                  savedSortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                                ) : (
                                  <ArrowUpDown className="w-4 h-4 opacity-40" />
                                )}
                              </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Driver Division
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Race Division
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Race Type
                        </th>
                            <th 
                              className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              onClick={() => handleSavedSort('points')}
                            >
                              <div className="flex items-center gap-2">
                          Points
                                {savedSortColumn === 'points' ? (
                                  savedSortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                                ) : (
                                  <ArrowUpDown className="w-4 h-4 opacity-40" />
                                )}
                              </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Note
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {filteredSavedPoints.length === 0 ? (
                        <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                No saved points found. Adjust your filters or save some points first.
                          </td>
                        </tr>
                      ) : (
                        filteredSavedPoints.map((point) => {
                              const isEditing = editingSavedPoints[point.id] !== undefined;
                              const editValue = editingSavedPoints[point.id];
                              const isSaving = savingSavedPoint === point.id;

                          return (
                                <tr key={point.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                  <td className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={selectedSavedPoints.has(point.id)}
                                      onChange={() => handleToggleSavedPoint(point.id)}
                                      className="w-4 h-4 text-primary-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-primary-500 focus:ring-2"
                                    />
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                    Round {point.roundNumber}
                              </td>
                                  <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                                  {point.driverName || 'Unknown'}
                              </td>
                              <td className="px-4 py-3">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getDivisionColor(point.driverDivision || point.raceDivision)}`}>
                                  {point.driverDivision || point.raceDivision}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getDivisionColor(point.raceDivision)}`}>
                                  {point.raceDivision}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getRaceTypeBadgeColor(point.raceType || 'qualification', point.finalType)}`}>
                                  {point.raceType === 'final' && point.finalType 
                                    ? `Final ${point.finalType.toUpperCase()}` 
                                    : point.raceType === 'heat' && point.finalType
                                    ? `Heat ${point.finalType.toUpperCase()}`
                                    : point.raceType ? point.raceType.charAt(0).toUpperCase() + point.raceType.slice(1) 
                                    : 'Qualification'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={isEditing ? editValue : point.points}
                                    onChange={(e) => {
                                      if (!isEditing) {
                                        handleEditSavedPoint(point.id, point.points);
                                      }
                                      setEditingSavedPoints(prev => ({ ...prev, [point.id]: parseFloat(e.target.value) || 0 }));
                                    }}
                                    className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                    disabled={isSaving}
                                    min="0"
                                  />
                                  {isEditing && (
                                    <>
                                      <button
                                        onClick={() => handleSaveSavedPoint(point)}
                                        disabled={isSaving}
                                        className="p-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded transition-colors"
                                        title="Save changes"
                                      >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                      </button>
                                      <button
                                        onClick={() => handleCancelEditSavedPoint(point.id)}
                                        disabled={isSaving}
                                        className="p-1.5 bg-slate-400 hover:bg-slate-500 disabled:bg-slate-300 text-white rounded transition-colors"
                                        title="Cancel editing"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                                  <td className="px-4 py-3">
                                    <div className="relative flex items-center gap-2">
                                      {point.note ? (
                                    <>
                                      <button
                                            onClick={() => setExpandedNote(expandedNote === point.id ? null : point.id)}
                                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg transition-colors relative"
                                            title="View/edit note"
                                          >
                                            <MessageSquare className="w-4 h-4" />
                                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary-500 rounded-full border border-white dark:border-slate-800"></span>
                                      </button>
                                          {expandedNote === point.id && (
                                            <div className="absolute right-0 top-full mt-2 z-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl p-4 w-80 max-w-[90vw]">
                                              <div className="flex items-start justify-between mb-2">
                                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Note</h4>
                                      <button
                                                  onClick={() => setExpandedNote(null)}
                                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                                >
                                                  <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                      </button>
                                </div>
                                              <textarea
                                                value={noteText || point.note}
                                                onChange={(e) => setNoteText(e.target.value)}
                                                rows={4}
                                                className="w-full px-3 py-2 mb-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="Edit note..."
                                              />
                                              <div className="flex justify-end gap-2">
                                                <button
                                                  onClick={() => {
                                                    setExpandedNote(null);
                                                    setNoteText('');
                                                  }}
                                                  className="px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                                >
                                                  Cancel
                                                </button>
                                                <button
                                                  onClick={async () => {
                                                    // Update note for saved point
                                                    try {
                                                      const response = await fetch('/api/points', {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                          id: point.id,
                                                          note: noteText || point.note,
                                                          updatedAt: new Date().toISOString(),
                                                        }),
                                                      });

                                                      if (!response.ok) {
                                                        throw new Error('Failed to update note');
                                                      }

                                                      await fetchSavedPoints();
                                                      setExpandedNote(null);
                                                      setNoteText('');
                                                      alert('Note updated successfully!');
                                                    } catch (error) {
                                                      console.error('Error updating note:', error);
                                                      alert('Failed to update note. Please try again.');
                                                    }
                                                  }}
                                                  disabled={!noteText && !point.note}
                                                  className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded transition-colors disabled:cursor-not-allowed"
                                                >
                                                  Save Note
              </button>
            </div>
                </div>
                                          )}
                                        </>
              ) : (
                <>
                                          <button
                                            onClick={() => {
                                              setExpandedNote(expandedNote === point.id ? null : point.id);
                                              setNoteText('');
                                            }}
                                            className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                                            title="Add note"
                                          >
                                            <Plus className="w-4 h-4" />
                                          </button>
                                          {expandedNote === point.id && (
                                            <div className="absolute right-0 top-full mt-2 z-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl p-4 w-80 max-w-[90vw]">
                                              <div className="flex items-start justify-between mb-2">
                                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Add Note</h4>
                                                <button
                                                  onClick={() => {
                                                    setExpandedNote(null);
                                                    setNoteText('');
                                                  }}
                                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                                >
                                                  <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                                </button>
                                              </div>
                  <textarea
                                                value={noteText}
                                                onChange={(e) => setNoteText(e.target.value)}
                    rows={4}
                                                className="w-full px-3 py-2 mb-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="Enter note for this saved point..."
                                              />
                                              <div className="flex justify-end gap-2">
              <button
                                                  onClick={() => {
                                                    setExpandedNote(null);
                                                    setNoteText('');
                                                  }}
                                                  className="px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                                >
                                                  Cancel
              </button>
                <button
                                                  onClick={async () => {
                                                    // Add note to saved point
                                                    try {
                                                      const response = await fetch('/api/points', {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                          id: point.id,
                                                          note: noteText,
                                                          updatedAt: new Date().toISOString(),
                                                        }),
                                                      });

                                                      if (!response.ok) {
                                                        throw new Error('Failed to add note');
                                                      }

                                                      await fetchSavedPoints();
                                                      setExpandedNote(null);
                                                      setNoteText('');
                                                      alert('Note added successfully!');
                                                    } catch (error) {
                                                      console.error('Error adding note:', error);
                                                      alert('Failed to add note. Please try again.');
                                                    }
                                                  }}
                                                  disabled={!noteText.trim()}
                                                  className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded transition-colors disabled:cursor-not-allowed"
                                                >
                  Save Note
                </button>
            </div>
          </div>
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
                  </>
              )}
            </SectionCard>
        )}
      </PageLayout>
    </>
  );
}
