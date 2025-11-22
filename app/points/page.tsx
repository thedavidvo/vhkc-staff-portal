'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '@/components/Header';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import { useSeason } from '@/components/SeasonContext';
import { Division } from '@/types';
import { Loader2, Save, X, ArrowUp, ArrowDown, Trophy, Edit, Trash2, List, Check, FileText, MessageSquare } from 'lucide-react';
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
    case 'Open':
      return 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  }
};

// Open divisions include New, Division 4, and Division 3
const openDivisions: Division[] = ['Division 3', 'Division 4', 'New'];

// Helper to check if a division is part of Open
const isOpenDivision = (div: Division): boolean => {
  return openDivisions.includes(div);
};

// Helper function to get race type badge color
const getRaceTypeBadgeColor = (raceType: string, finalType?: string) => {
  // Color code by type letter (A, B, C, D, E, F) for both finals and heats
  if (finalType) {
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
        // For other letters, use a consistent color based on race type
        return raceType === 'heat' 
          ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
    }
  }
  
  // Other race types without type letter
  switch (raceType) {
    case 'qualification':
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    case 'heat':
      return 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
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
  pointsPosition?: number; // Ranking based on points
  points: number;
  confirmed: boolean;
  raceType?: string;
  finalType?: string;
}

interface SavedPoint {
  id: string;
  seasonId: string;
  roundId: string;
  driverId: string;
  driverName: string;
  driverDivision: Division; // Driver's division at the time of the race
  raceDivision: Division | 'Open'; // Race division (the division the race was run in)
  raceType: string;
  finalType?: string;
  overallPosition?: number;
  points: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
  roundName?: string;
  roundNumber?: number;
  seasonName?: string;
}

export default function PointsPage() {
  const { selectedSeason } = useSeason();
  const [rounds, setRounds] = useState<any[]>([]);
  const [driverPoints, setDriverPoints] = useState<DriverPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<Division>('Division 1');
  const [selectedRaceType, setSelectedRaceType] = useState<string>('');
  const [selectedHeatType, setSelectedHeatType] = useState<string>('');
  const [selectedFinalType, setSelectedFinalType] = useState<string>('');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [divisionChanges, setDivisionChanges] = useState<any[]>([]);
  
  // Tab state for saved points
  const [activeTab, setActiveTab] = useState<'points' | 'saved'>('points');
  
  // Sync filters between tabs when switching
  const handleTabChange = (newTab: 'points' | 'saved') => {
    if (newTab === 'saved') {
      // When switching to saved points, sync filters from points management
      setSavedPointsRoundFilter(selectedRound);
      setSavedPointsRaceTypeFilter(selectedRaceType);
      // Map division filter - always sync the division value
      setSavedPointsDivisionFilter(selectedDivision || 'all');
      // Clear final type filter when switching tabs (since it's removed for final races)
      setSavedPointsFinalTypeFilter('');
    } else {
      // When switching to points management, sync filters from saved points
      setSelectedRound(savedPointsRoundFilter);
      setSelectedRaceType(savedPointsRaceTypeFilter);
      // Map division filter - convert 'all' to default 'Division 1', otherwise use the division value
      if (savedPointsDivisionFilter !== 'all') {
        setSelectedDivision(savedPointsDivisionFilter);
      } else {
        // Keep current division or default to Division 1
        setSelectedDivision(selectedDivision || 'Division 1');
      }
    }
    setActiveTab(newTab);
  };
  
  // Editing state
  const [editingPoints, setEditingPoints] = useState<Record<string, number>>({});
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteModalPoint, setNoteModalPoint] = useState<DriverPoints | SavedPoint | null>(null);
  const [noteModalIsViewOnly, setNoteModalIsViewOnly] = useState(false);
  const [noteModalValue, setNoteModalValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savedPoints, setSavedPoints] = useState<Record<string, number>>({});
  const [savedNotes, setSavedNotes] = useState<Record<string, string>>({});
  
  // Saved points view state
  const [savedPointsList, setSavedPointsList] = useState<SavedPoint[]>([]);
  const [loadingSavedPoints, setLoadingSavedPoints] = useState(false);
  
  // Saved points filters
  const [savedPointsRoundFilter, setSavedPointsRoundFilter] = useState<string>('');
  const [savedPointsDivisionFilter, setSavedPointsDivisionFilter] = useState<Division | 'all'>('all');
  const [savedPointsRaceTypeFilter, setSavedPointsRaceTypeFilter] = useState<string>('');
  const [savedPointsFinalTypeFilter, setSavedPointsFinalTypeFilter] = useState<string>('');
  
  // Saved points editing state
  const [editingSavedPoint, setEditingSavedPoint] = useState<string | null>(null);
  const [editingSavedPointValues, setEditingSavedPointValues] = useState<Record<string, { points: number; overallPosition?: number; note?: string }>>({});
  const [isSavingSavedPoint, setIsSavingSavedPoint] = useState(false);
  const [deletingSavedPointId, setDeletingSavedPointId] = useState<string | null>(null);
  
  // Get available divisions based on race type
  const availableDivisions = useMemo(() => {
    if (selectedRaceType === 'heat') {
      // Heat races: Only Division 1, Division 2, and Open (remove Division 3, Division 4, New)
      return ['Division 1', 'Division 2', 'Open'] as Division[];
    }
    if (selectedRaceType === 'final') {
      // Final races: Division 1, Division 2, Division 3, Division 4, New (no Open)
      return ['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New'] as Division[];
    }
    // For other race types, show all divisions
    return ['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New', 'Open'] as Division[];
  }, [selectedRaceType]);

  // Auto-set division based on race type
  useEffect(() => {
    // Ensure selected division is in available divisions
    if (!availableDivisions.includes(selectedDivision)) {
      setSelectedDivision('Division 1');
    }
  }, [selectedRaceType, availableDivisions, selectedDivision]);

  // Reset final type when race type changes
  useEffect(() => {
    // Clear final type filter when not final, or when final is selected (filter is removed)
    if (selectedRaceType !== 'final') {
      setSelectedFinalType('');
    } else if (selectedRaceType === 'final') {
      // Clear final type when final is selected since filter is removed
      setSelectedFinalType('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRaceType]);
  
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

  // Get available heat types from current data
  const availableHeatTypes = useMemo(() => {
    const heatTypes = new Set<string>();
    driverPoints.forEach(point => {
      if (point.raceType === 'heat' && point.finalType) {
        heatTypes.add(point.finalType.toUpperCase());
      }
    });
    return Array.from(heatTypes).sort();
  }, [driverPoints]);

  // Get available final types from current data
  const availableFinalTypes = useMemo(() => {
    const finalTypes = new Set<string>();
    driverPoints.forEach(point => {
      if (point.raceType === 'final' && point.finalType) {
        finalTypes.add(point.finalType.toUpperCase());
      }
    });
    return Array.from(finalTypes).sort();
  }, [driverPoints]);

  // Get available final types from saved points (for saved points tab filter)
  const availableSavedPointsFinalTypes = useMemo(() => {
    const finalTypes = new Set<string>();
    savedPointsList.forEach(point => {
      if (point.finalType && (point.raceType === 'heat' || point.raceType === 'final')) {
        finalTypes.add(point.finalType.toUpperCase());
      }
    });
    return Array.from(finalTypes).sort();
  }, [savedPointsList]);

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
        let driversData: any[] = [];
        if (driversResponse.ok) {
          driversData = await driversResponse.json();
          setDrivers(driversData);
        }
        
        // Fetch division changes
        const divisionChangesResponse = await fetch(`/api/division-changes?seasonId=${selectedSeason.id}`);
        let divisionChangesData: any[] = [];
        if (divisionChangesResponse.ok) {
          divisionChangesData = await divisionChangesResponse.json();
          setDivisionChanges(Array.isArray(divisionChangesData) ? divisionChangesData : []);
        }
        
        // Fetch rounds
        const roundsResponse = await fetch(`/api/rounds?seasonId=${selectedSeason.id}`);
        
        if (roundsResponse.ok) {
          const roundsData = await roundsResponse.json();
          const sortedRounds = roundsData.sort((a: any, b: any) => {
            // Sort by round number ascending (Round 1 first)
            return (a.roundNumber || 0) - (b.roundNumber || 0);
          });
          setRounds(sortedRounds);

          // First, fetch saved points from database
          const savedPointsResponse = await fetch(`/api/points?seasonId=${selectedSeason.id}`);
          const savedPointsMap = new Map<string, any>();
          const savedPointsObj: Record<string, number> = {};
          const savedNotesObj: Record<string, string> = {};
          if (savedPointsResponse.ok) {
            const savedPointsData = await savedPointsResponse.json();
            savedPointsData.forEach((point: any) => {
              const key = `${point.roundId}-${point.driverId}-${point.raceType || 'qualification'}-${point.finalType || ''}`;
              savedPointsMap.set(key, point);
              savedPointsObj[key] = point.points;
              if (point.note) {
                savedNotesObj[key] = point.note;
              }
            });
          }
          setSavedPoints(savedPointsObj);
          setSavedNotes(savedNotesObj);

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
                    
                    // Get the driver's division at the time of this round using division_changes
                    // Inline helper to avoid dependency issues
                    const getDivisionAtRound = (driverId: string, roundId: string, roundNumber: number): Division | undefined => {
                      if (!driverId || !divisionChangesData.length) {
                        const d = driversData.find((d: any) => d.id === driverId);
                        return d?.division;
                      }
                      
                      const driverChanges = divisionChangesData.filter((c: any) => c.driverId === driverId);
                      if (driverChanges.length === 0) {
                        const d = driversData.find((d: any) => d.id === driverId);
                        return d?.division;
                      }
                      
                      const targetRound = roundsData.find((r: any) => r.id === roundId);
                      const targetRoundNumber = targetRound?.roundNumber || roundNumber;
                      const isTargetPreSeason = roundId.startsWith('pre-season-');
                      
                      const sortedChanges = [...driverChanges].sort((a: any, b: any) => {
                        const aIsPreSeason = a.roundId.startsWith('pre-season-');
                        const bIsPreSeason = b.roundId.startsWith('pre-season-');
                        if (aIsPreSeason && !bIsPreSeason) return -1;
                        if (!aIsPreSeason && bIsPreSeason) return 1;
                        if (aIsPreSeason && bIsPreSeason) return 0;
                        const aRound = roundsData.find((r: any) => r.id === a.roundId);
                        const bRound = roundsData.find((r: any) => r.id === b.roundId);
                        const aRoundNumber = aRound?.roundNumber || 0;
                        const bRoundNumber = bRound?.roundNumber || 0;
                        return aRoundNumber - bRoundNumber;
                      });
                      
                      let mostRecentChange = null;
                      for (const change of sortedChanges) {
                        const changeIsPreSeason = change.roundId.startsWith('pre-season-');
                        if (isTargetPreSeason) {
                          if (changeIsPreSeason) mostRecentChange = change;
                          continue;
                        }
                        if (changeIsPreSeason) {
                          mostRecentChange = change;
                          continue;
                        }
                        const changeRound = roundsData.find((r: any) => r.id === change.roundId);
                        const changeRoundNumber = changeRound?.roundNumber || 0;
                        if (changeRoundNumber <= targetRoundNumber) {
                          mostRecentChange = change;
                        } else {
                          break;
                        }
                      }
                      
                      if (mostRecentChange) {
                        if (mostRecentChange.changeType === 'promotion' || mostRecentChange.changeType === 'demotion') {
                          return mostRecentChange.toDivision;
                        } else if (mostRecentChange.changeType === 'division_start' || mostRecentChange.changeType === 'mid_season_join') {
                          return mostRecentChange.divisionStart;
                        }
                      }
                      
                      const d = driversData.find((d: any) => d.id === driverId);
                      return d?.division;
                    };
                    
                    const driverDivisionAtRound = getDivisionAtRound(
                      result.driverId,
                      round.id,
                      round.roundNumber || 0
                    ) || result.division;
                    
                    // Check if there's a saved point for this result
                    const savedPointKey = `${round.id}-${result.driverId}-${result.raceType || 'qualification'}-${result.finalType || ''}`;
                    const savedPoint = savedPointsMap.get(savedPointKey);
                    
                    // Use saved points if available, otherwise use calculated points
                    // Use saved division if available (preserves historical division), otherwise use calculated historical division
                    const finalPoints = savedPoint ? savedPoint.points : points;
                    const finalDivision = savedPoint ? savedPoint.division : driverDivisionAtRound;
                    const finalOverallPosition = savedPoint?.overallPosition !== undefined ? savedPoint.overallPosition : overallPosition;
                    
                    allPoints.push({
                      driverId: result.driverId,
                      driverName: result.driverName || driver?.name || 'Unknown Driver',
                      division: finalDivision, // Use historical division (from saved points or calculated)
                      roundId: round.id,
                      roundName: round.location || 'TBD',
                      roundNumber: round.roundNumber || 0,
                      position: result.position || result.gridPosition || 0,
                      overallPosition: finalOverallPosition,
                      points: finalPoints,
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
  }, [selectedSeason]);
  
  // Fetch division changes when season changes
  useEffect(() => {
    const fetchDivisionChanges = async () => {
      if (!selectedSeason?.id) {
        setDivisionChanges([]);
        return;
      }
      
      try {
        const response = await fetch(`/api/division-changes?seasonId=${selectedSeason.id}`);
        if (response.ok) {
          const data = await response.json();
          setDivisionChanges(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to fetch division changes:', error);
        setDivisionChanges([]);
      }
    };
    
    fetchDivisionChanges();
  }, [selectedSeason]);

  // Fetch saved points from database
  useEffect(() => {
    const fetchSavedPoints = async () => {
      if (!selectedSeason || activeTab !== 'saved') {
        setSavedPointsList([]);
        return;
      }

      try {
        setLoadingSavedPoints(true);
        const response = await fetch(`/api/points?seasonId=${selectedSeason.id}`);
        if (response.ok) {
          const pointsData = await response.json();
          
          // Fetch race results to get race division
          const raceResultsMap = new Map<string, Division | 'Open'>();
          for (const round of rounds) {
            try {
              const resultsResponse = await fetch(`/api/race-results?roundId=${round.id}`);
              if (resultsResponse.ok) {
                const resultsData = await resultsResponse.json();
                resultsData.forEach((divisionResult: any) => {
                  const raceDiv = divisionResult.division as Division | 'Open';
                  divisionResult.results?.forEach((result: any) => {
                    const key = `${round.id}-${result.driverId}-${result.raceType || 'qualification'}-${result.finalType || ''}`;
                    raceResultsMap.set(key, raceDiv);
                  });
                });
              }
            } catch (error) {
              console.error(`Error fetching race results for ${round.id}:`, error);
            }
          }
          
          // Helper to get driver's division at a specific round
          const getDriverDivisionAtRound = (driverId: string, roundId: string, roundNumber: number): Division | undefined => {
            if (!driverId || !divisionChanges.length) {
              const d = drivers.find((d: any) => d.id === driverId);
              return d?.division;
            }
            
            const driverChanges = divisionChanges.filter((c: any) => c.driverId === driverId);
            if (driverChanges.length === 0) {
              const d = drivers.find((d: any) => d.id === driverId);
              return d?.division;
            }
            
            const targetRound = rounds.find((r: any) => r.id === roundId);
            const targetRoundNumber = targetRound?.roundNumber || roundNumber;
            const isTargetPreSeason = roundId.startsWith('pre-season-');
            
            const sortedChanges = [...driverChanges].sort((a: any, b: any) => {
              const aIsPreSeason = a.roundId.startsWith('pre-season-');
              const bIsPreSeason = b.roundId.startsWith('pre-season-');
              if (aIsPreSeason && !bIsPreSeason) return -1;
              if (!aIsPreSeason && bIsPreSeason) return 1;
              if (aIsPreSeason && bIsPreSeason) return 0;
              const aRound = rounds.find((r: any) => r.id === a.roundId);
              const bRound = rounds.find((r: any) => r.id === b.roundId);
              const aRoundNumber = aRound?.roundNumber || 0;
              const bRoundNumber = bRound?.roundNumber || 0;
              return aRoundNumber - bRoundNumber;
            });
            
            let mostRecentChange = null;
            for (const change of sortedChanges) {
              const changeIsPreSeason = change.roundId.startsWith('pre-season-');
              if (isTargetPreSeason) {
                if (changeIsPreSeason) mostRecentChange = change;
                continue;
              }
              if (changeIsPreSeason) {
                mostRecentChange = change;
                continue;
              }
              const changeRound = rounds.find((r: any) => r.id === change.roundId);
              const changeRoundNumber = changeRound?.roundNumber || 0;
              if (changeRoundNumber <= targetRoundNumber) {
                mostRecentChange = change;
              } else {
                break;
              }
            }
            
            if (mostRecentChange) {
              if (mostRecentChange.changeType === 'promotion' || mostRecentChange.changeType === 'demotion') {
                return mostRecentChange.toDivision;
              } else if (mostRecentChange.changeType === 'division_start' || mostRecentChange.changeType === 'mid_season_join') {
                return mostRecentChange.divisionStart;
              }
            }
            
            const d = drivers.find((d: any) => d.id === driverId);
            return d?.division;
          };
          
          // Fetch driver names and round info, and get both driver and race divisions
          const pointsWithDetails: SavedPoint[] = pointsData.map((point: any) => {
            const driver = drivers.find((d: any) => d.id === point.driverId);
            const round = rounds.find((r: any) => r.id === point.roundId);
            
            // Get race division from race results
            const raceResultKey = `${point.roundId}-${point.driverId}-${point.raceType || 'qualification'}-${point.finalType || ''}`;
            const raceDivision = raceResultsMap.get(raceResultKey) || (point.division as Division | 'Open');
            
            // Get driver's division at the time of the race
            const driverDivision = getDriverDivisionAtRound(
              point.driverId,
              point.roundId,
              round?.roundNumber || 0
            ) || point.division;
            
            return {
              id: point.id,
              seasonId: point.seasonId,
              roundId: point.roundId,
              driverId: point.driverId,
              driverName: driver?.name || 'Unknown Driver',
              driverDivision: driverDivision, // Driver's division at time of race
              raceDivision: raceDivision, // Race division (the division the race was run in)
              raceType: point.raceType || 'qualification',
              finalType: point.finalType,
              overallPosition: point.overallPosition,
              points: point.points,
              note: point.note || undefined,
              createdAt: point.createdAt,
              updatedAt: point.updatedAt,
              roundName: round?.location || 'TBD',
              roundNumber: round?.roundNumber || 0,
              seasonName: selectedSeason.name,
            };
          });
          
          setSavedPointsList(pointsWithDetails);
        }
      } catch (error) {
        console.error('Failed to fetch saved points:', error);
        setSavedPointsList([]);
      } finally {
        setLoadingSavedPoints(false);
      }
    };

    if (drivers.length > 0 && rounds.length > 0) {
      fetchSavedPoints();
    }
  }, [selectedSeason, drivers, rounds, activeTab, divisionChanges]);

  // Recalculate driver divisions when divisionChanges, drivers, or rounds change
  useEffect(() => {
    if (driverPoints.length === 0 || divisionChanges.length === 0 || drivers.length === 0 || rounds.length === 0) {
      return;
    }

    // Helper function to get driver's division at a specific round
    const getDriverDivisionAtRound = (driverId: string, roundId: string, roundNumber: number): Division | undefined => {
      if (!driverId) return undefined;

      const driver = drivers.find(d => d.id === driverId);
      const currentDivision = driver?.division;

      if (!roundId || divisionChanges.length === 0) return currentDivision;

      const driverChanges = divisionChanges.filter((c: any) => c.driverId === driverId);
      if (driverChanges.length === 0) return currentDivision;

      const targetRound = rounds.find(r => r.id === roundId);
      const targetRoundNumber = targetRound?.roundNumber || roundNumber;
      const isTargetPreSeason = roundId.startsWith('pre-season-');

      const sortedChanges = [...driverChanges].sort((a: any, b: any) => {
        const aIsPreSeason = a.roundId.startsWith('pre-season-');
        const bIsPreSeason = b.roundId.startsWith('pre-season-');
        if (aIsPreSeason && !bIsPreSeason) return -1;
        if (!aIsPreSeason && bIsPreSeason) return 1;
        if (aIsPreSeason && bIsPreSeason) return 0;
        const aRound = rounds.find(r => r.id === a.roundId);
        const bRound = rounds.find(r => r.id === b.roundId);
        const aRoundNumber = aRound?.roundNumber || 0;
        const bRoundNumber = bRound?.roundNumber || 0;
        return aRoundNumber - bRoundNumber;
      });

      let mostRecentChange = null;
      for (const change of sortedChanges) {
        const changeIsPreSeason = change.roundId.startsWith('pre-season-');
        if (isTargetPreSeason) {
          if (changeIsPreSeason) mostRecentChange = change;
          continue;
        }
        if (changeIsPreSeason) {
          mostRecentChange = change;
          continue;
        }
        const changeRound = rounds.find(r => r.id === change.roundId);
        const changeRoundNumber = changeRound?.roundNumber || 0;
        if (changeRoundNumber <= targetRoundNumber) {
          mostRecentChange = change;
        } else {
          break;
        }
      }

      if (mostRecentChange) {
        if (mostRecentChange.changeType === 'promotion' || mostRecentChange.changeType === 'demotion') {
          return mostRecentChange.toDivision || currentDivision;
        } else if (mostRecentChange.changeType === 'division_start' || mostRecentChange.changeType === 'mid_season_join') {
          return mostRecentChange.divisionStart || currentDivision;
        }
      }

      return currentDivision;
    };

    // Update divisions for all points
    const updatedPoints = driverPoints.map(point => {
      const historicalDivision = getDriverDivisionAtRound(point.driverId, point.roundId, point.roundNumber);
      return {
        ...point,
        division: historicalDivision || point.division
      };
    });

    // Only update if divisions actually changed
    const hasChanges = updatedPoints.some((updated, index) => 
      updated.division !== driverPoints[index].division
    );

    if (hasChanges) {
      setDriverPoints(updatedPoints);
    }
    // Only run when divisionChanges, drivers, or rounds change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divisionChanges.length, drivers.length, rounds.length]);

  // Track changes in editing
  useEffect(() => {
    setHasUnsavedChanges(Object.keys(editingPoints).length > 0 || Object.keys(editingNotes).length > 0);
  }, [editingPoints, editingNotes]);

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

  // Reset heat type when race type changes, and auto-select first heat type when heat is selected
  useEffect(() => {
    if (selectedRaceType !== 'heat') {
      setSelectedHeatType('');
    } else if (selectedRaceType === 'heat' && availableHeatTypes.length > 0) {
      // Auto-select first available heat type if none selected or if current selection is invalid
      if (!selectedHeatType || !availableHeatTypes.includes(selectedHeatType)) {
        setSelectedHeatType(availableHeatTypes[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRaceType, availableHeatTypes]);

  // Filter points and calculate overall position based on filters
  const filteredPoints = useMemo(() => {
    let filtered = [...driverPoints];

    if (selectedRound) {
      filtered = filtered.filter(p => p.roundId === selectedRound);
    }

    if (selectedDivision) {
      // For final races, filter by driver division (p.division is the historical driver division at time of race)
      // For other race types, filter by race division (p.division represents the race division)
      if (selectedDivision === 'Open') {
        filtered = filtered.filter(p => isOpenDivision(p.division) || p.division === 'Open');
      } else {
        filtered = filtered.filter(p => p.division === selectedDivision);
      }
    }

    if (selectedRaceType) {
      filtered = filtered.filter(p => p.raceType === selectedRaceType);
      
      // If heat race is selected, require heat type selection and filter by it
      // Heat types should be treated separately
      if (selectedRaceType === 'heat') {
        if (selectedHeatType) {
          filtered = filtered.filter(p => (p.finalType || '').toUpperCase() === selectedHeatType.toUpperCase());
        } else {
          // If no heat type selected, return empty to force selection
          filtered = [];
        }
      }
      
      // Final type filter is removed when final is selected, so no filtering by final type
    }

    // Helper function to get race type priority for sorting (Final A > Final B > Final C, etc.)
    const getRaceTypePriority = (raceType: string, finalType?: string): number => {
      if (raceType === 'final' && finalType) {
        // Final A = 1, Final B = 2, etc. (lower number = higher priority)
        return finalType.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
      }
      if (raceType === 'heat' && finalType) {
        // Heat A = 101, Heat B = 102, etc.
        return 100 + (finalType.charCodeAt(0) - 'A'.charCodeAt(0) + 1);
      }
      if (raceType === 'heat') return 100; // Heat races come after finals
      if (raceType === 'qualification') return 200; // Qualification comes last
      return 300; // Unknown types
    };

    // Sort all filtered points
    // For final races: sort by Race Type (Final A > Final B > Final C) then by race position
    // For heat races: sort by race overallPosition (finish position)
    // For other races, sort by points
    const sorted = [...filtered].sort((a, b) => {
      const aRaceType = a.raceType || 'qualification';
      const bRaceType = b.raceType || 'qualification';
      const isARace = aRaceType === 'heat' || aRaceType === 'final';
      const isBRace = bRaceType === 'heat' || bRaceType === 'final';
      
      // For final races specifically, sort by Race Type first, then by position
      if (aRaceType === 'final' && bRaceType === 'final') {
        // Primary sort: by Race Type (Final A > Final B > Final C, etc.)
        const aFinalType = (a.finalType || '').toUpperCase();
        const bFinalType = (b.finalType || '').toUpperCase();
        
        // Compare final types: A < B < C, etc. (lower charCode = higher priority)
        if (aFinalType !== bFinalType) {
          const aCode = aFinalType.charCodeAt(0) || 999;
          const bCode = bFinalType.charCodeAt(0) || 999;
          return aCode - bCode;
        }
        
        // Secondary sort: by race position (overallPosition)
        if (a.overallPosition !== b.overallPosition) {
          return a.overallPosition - b.overallPosition;
        }
        
        // Tertiary sort: by driver name for consistency
        return a.driverName.localeCompare(b.driverName);
      }
      
      // For heat races, sort by race overallPosition (finish position in the race)
      if (isARace && isBRace) {
        // Both are heat/final (but not both final, handled above) - sort by race overallPosition
        if (a.overallPosition !== b.overallPosition) {
          return a.overallPosition - b.overallPosition;
        }
        // If same position, sort by race type priority
        const aPriority = getRaceTypePriority(aRaceType, a.finalType);
        const bPriority = getRaceTypePriority(bRaceType, b.finalType);
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        return a.driverName.localeCompare(b.driverName);
      }
      
      // For non-heat/final races, or mixed types, sort by points
      const aKey = `${a.driverId}-${a.roundId}-${a.raceType}-${a.finalType || ''}`;
      const bKey = `${b.driverId}-${b.roundId}-${b.raceType}-${b.finalType || ''}`;
      const aPoints = editingPoints[aKey] !== undefined ? editingPoints[aKey] : (savedPoints[aKey] || a.points);
      const bPoints = editingPoints[bKey] !== undefined ? editingPoints[bKey] : (savedPoints[bKey] || b.points);
      
      // Primary sort: by points (higher first) - this enables dynamic movement
      if (bPoints !== aPoints) {
        return bPoints - aPoints;
      }
      
      // Secondary sort: by race type priority when points are equal
      const aPriority = getRaceTypePriority(aRaceType, a.finalType);
      const bPriority = getRaceTypePriority(bRaceType, b.finalType);
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Tertiary sort: by driver name for consistency
      return a.driverName.localeCompare(b.driverName);
    });

    // Assign overall positions and calculate initial points
    // For heat and final races, use the race's overallPosition (finish position)
    // For other races, assign sequential positions based on points ranking
    const pointsWithOverallPosition: DriverPoints[] = [];
    sorted.forEach((point, index) => {
      const raceType = point.raceType || 'qualification';
      const isHeatOrFinal = raceType === 'heat' || raceType === 'final';
      
      // For heat and final, use the race's overallPosition (finish position in the race)
      // For other races, assign sequential position based on ranking
      const displayOverallPosition = isHeatOrFinal 
        ? point.overallPosition 
        : (index + 1);
      
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
        // Check if heat races exist for this specific round/division in the original data
        const hasHeatRace = driverPoints.some(p => 
          p.roundId === point.roundId && 
          p.division === point.division &&
          p.raceType === 'heat'
        );
        
        // Use the race's overallPosition for heat/final, or the calculated position for others
        const positionForPoints = isHeatOrFinal ? point.overallPosition : (index + 1);
        
        // Use major points for final if heat race exists, minor points for heat if heat race exists
        finalPoints = getPointsForPosition(
          positionForPoints,
          raceType as 'qualification' | 'heat' | 'final',
          hasHeatRace
        );
      }
      
      pointsWithOverallPosition.push({
        ...point,
        overallPosition: displayOverallPosition,
        points: finalPoints,
      });
    });

    // Calculate points position
    // For final races: use the sort order (Race Type then position)
    // For other races: use points ranking
    // Check if we're filtering by final race type
    const isFinalRace = selectedRaceType === 'final';
    
    let withPointsPosition: DriverPoints[];
    
    if (isFinalRace) {
      // For final races, points position is the order in the sorted array
      // The array is already sorted by Race Type (Final A > Final B) then by overall position
      withPointsPosition = pointsWithOverallPosition.map((point, index) => {
        const key = `${point.driverId}-${point.roundId}-${point.raceType}-${point.finalType || ''}`;
        const pointsPosition = index + 1; // Use sort order as points position
        
        // Recalculate points based on points position instead of race position
        const hasEdit = editingPoints[key] !== undefined;
        const hasSaved = savedPoints[key] !== undefined;
        
        let recalculatedPoints = point.points;
        
        // Only recalculate if no edits or saved values exist
        if (!hasEdit && !hasSaved) {
          const hasHeatRace = driverPoints.some(p => 
            p.roundId === point.roundId && 
            p.division === point.division &&
            p.raceType === 'heat'
          );
          
          // Use points position to calculate points distribution
          recalculatedPoints = getPointsForPosition(
            pointsPosition,
            'final',
            hasHeatRace
          );
        }
        
        return {
          ...point,
          pointsPosition,
          points: recalculatedPoints,
        };
      });
    } else {
      // For non-final races, calculate points position based on points ranking
      const sortedByPoints = [...pointsWithOverallPosition].sort((a, b) => {
        const aKey = `${a.driverId}-${a.roundId}-${a.raceType}-${a.finalType || ''}`;
        const bKey = `${b.driverId}-${b.roundId}-${b.raceType}-${b.finalType || ''}`;
        const aPoints = editingPoints[aKey] !== undefined ? editingPoints[aKey] : (savedPoints[aKey] !== undefined ? savedPoints[aKey] : a.points);
        const bPoints = editingPoints[bKey] !== undefined ? editingPoints[bKey] : (savedPoints[bKey] !== undefined ? savedPoints[bKey] : b.points);
        // If points are equal, maintain original order for consistency
        if (bPoints === aPoints) {
          return 0;
        }
        return bPoints - aPoints; // Descending order
      });
      
      // Create a map of point to its position in sorted array for efficient lookup
      const pointToPositionMap = new Map<string, number>();
      sortedByPoints.forEach((point, index) => {
        const key = `${point.driverId}-${point.roundId}-${point.raceType}-${point.finalType || ''}`;
        pointToPositionMap.set(key, index + 1);
      });
      
      // Assign points position and recalculate points based on points position
      withPointsPosition = pointsWithOverallPosition.map((point) => {
        const key = `${point.driverId}-${point.roundId}-${point.raceType}-${point.finalType || ''}`;
        const pointsPosition = pointToPositionMap.get(key) || 1;
        
        // Recalculate points based on points position instead of race position
        const raceType = point.raceType || 'qualification';
        const hasEdit = editingPoints[key] !== undefined;
        const hasSaved = savedPoints[key] !== undefined;
        
        let recalculatedPoints = point.points;
        
        // Only recalculate if no edits or saved values exist
        if (!hasEdit && !hasSaved) {
          const hasHeatRace = driverPoints.some(p => 
            p.roundId === point.roundId && 
            p.division === point.division &&
            p.raceType === 'heat'
          );
          
          // Use points position to calculate points distribution
          recalculatedPoints = getPointsForPosition(
            pointsPosition,
            raceType as 'qualification' | 'heat' | 'final',
            hasHeatRace
          );
        }
        
        return {
          ...point,
          pointsPosition,
          points: recalculatedPoints,
        };
      });
    }

    // Final sort: maintain the ordering from the initial sort
    // For final races: Race Type (Final A > Final B) then position
    // For other races: overall position then round
    return withPointsPosition.sort((a, b) => {
      const aRaceType = a.raceType || 'qualification';
      const bRaceType = b.raceType || 'qualification';
      
      // For final races, maintain Race Type then position ordering
      if (aRaceType === 'final' && bRaceType === 'final') {
        // Primary sort: by Race Type (Final A > Final B > Final C, etc.)
        const aFinalType = (a.finalType || '').toUpperCase();
        const bFinalType = (b.finalType || '').toUpperCase();
        
        if (aFinalType !== bFinalType) {
          const aCode = aFinalType.charCodeAt(0) || 999;
          const bCode = bFinalType.charCodeAt(0) || 999;
          return aCode - bCode;
        }
        
        // Secondary sort: by overall position
        if (a.overallPosition !== b.overallPosition) {
          return a.overallPosition - b.overallPosition;
        }
        
        // Tertiary sort: by round (most recent first)
        return b.roundNumber - a.roundNumber;
      }
      
      // For other race types, sort by overall position first, then by round
      if (a.overallPosition !== b.overallPosition) {
        return a.overallPosition - b.overallPosition;
      }
      // Secondary sort: by round (most recent first)
      const roundCompare = b.roundNumber - a.roundNumber;
      return roundCompare;
    });
  }, [driverPoints, selectedRound, selectedDivision, selectedRaceType, selectedHeatType, selectedFinalType, editingPoints, savedPoints]);

  // Calculate total points per driver across all rounds and race types
  const driverTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    // Calculate totals from all driverPoints, not just filteredPoints, to include heat and final for the same round
    driverPoints.forEach(point => {
      const key = `${point.driverId}-${point.roundId}-${point.raceType}-${point.finalType || ''}`;
      const points = editingPoints[key] !== undefined ? editingPoints[key] : (savedPoints[key] || point.points);
      
      // Sum all points for each driver across all rounds and race types
      if (!totals[point.driverId]) {
        totals[point.driverId] = 0;
      }
      totals[point.driverId] += points;
    });
    
    return totals;
  }, [driverPoints, editingPoints, savedPoints]);

  // Handler to edit points
  const handleEditPoints = (point: DriverPoints, newPoints: number) => {
    const key = `${point.driverId}-${point.roundId}-${point.raceType}-${point.finalType || ''}`;
    setEditingPoints(prev => ({
      ...prev,
      [key]: newPoints
    }));
  };

  // Handler to open note modal
  const handleOpenNoteModal = (point: DriverPoints | SavedPoint, viewOnly: boolean = false) => {
    // Check if it's a SavedPoint by checking for 'id' property
    if ('id' in point) {
      // SavedPoint
      const existingNote = (point as SavedPoint).note || '';
      setNoteModalPoint(point as SavedPoint);
      setNoteModalValue(existingNote);
      setNoteModalIsViewOnly(viewOnly);
      setShowNoteModal(true);
    } else {
      // DriverPoints
      const driverPoint = point as DriverPoints;
      const key = `${driverPoint.driverId}-${driverPoint.roundId}-${driverPoint.raceType}-${driverPoint.finalType || ''}`;
      const existingNote = editingNotes[key] || savedNotes[key] || '';
      setNoteModalPoint(driverPoint);
      setNoteModalValue(existingNote);
      setNoteModalIsViewOnly(viewOnly);
      setShowNoteModal(true);
    }
  };

  // Handler to save note
  const handleSaveNote = () => {
    if (!noteModalPoint || noteModalIsViewOnly) return;
    
    // Check if it's a SavedPoint by checking for 'id' property
    if ('id' in noteModalPoint) {
      // SavedPoint - update the editingSavedPointValues
      const savedPoint = noteModalPoint as SavedPoint;
      setEditingSavedPointValues(prev => ({
        ...prev,
        [savedPoint.id]: {
          ...prev[savedPoint.id],
          points: savedPoint.points,
          overallPosition: savedPoint.overallPosition,
          note: noteModalValue.trim(),
        }
      }));
    } else {
      // DriverPoints
      const driverPoint = noteModalPoint as DriverPoints;
      const key = `${driverPoint.driverId}-${driverPoint.roundId}-${driverPoint.raceType}-${driverPoint.finalType || ''}`;
      setEditingNotes(prev => ({
        ...prev,
        [key]: noteModalValue.trim()
      }));
    }
    
    setShowNoteModal(false);
    setNoteModalPoint(null);
    setNoteModalValue('');
    setNoteModalIsViewOnly(false);
  };

  // Handler to cancel note
  const handleCancelNote = () => {
    setShowNoteModal(false);
    setNoteModalPoint(null);
    setNoteModalValue('');
    setNoteModalIsViewOnly(false);
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
        const currentNote = editingNotes[key] !== undefined 
          ? editingNotes[key] 
          : (savedNotes[key] || '');
        
        const pointsId = `points-${point.roundId}-${point.driverId}-${point.raceType}-${point.finalType || ''}`;
        
        // IMPORTANT: Use the historical division (point.division) which is already calculated
        // based on division_changes, not the current driver division
        // This ensures points are preserved with the division at the time of the race
        const response = await fetch('/api/points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: pointsId,
            seasonId: selectedSeason.id,
            roundId: point.roundId,
            driverId: point.driverId,
            division: point.division, // Historical division at time of race
            raceType: point.raceType || 'qualification',
            finalType: point.finalType || undefined,
            overallPosition: point.overallPosition,
            points: currentPoints,
            note: currentNote || undefined,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save points for ${point.driverName}`);
        }
      }

      // Move edited points and notes to saved
      setSavedPoints(prev => ({ ...prev, ...editingPoints }));
      setSavedNotes(prev => ({ ...prev, ...editingNotes }));
      setEditingPoints({});
      setEditingNotes({});
      
      // Refresh saved points list - the useEffect will handle it when activeTab is 'saved'
      // The useEffect dependency on activeTab will trigger a refresh
      
      // Refresh data - reload the entire page data
      const fetchData = async () => {
        // Fetch drivers
        const driversResponse = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`);
        let driversData: any[] = [];
        if (driversResponse.ok) {
          driversData = await driversResponse.json();
          setDrivers(driversData);
        }
        
        // Fetch division changes
        const divisionChangesResponse = await fetch(`/api/division-changes?seasonId=${selectedSeason.id}`);
        let divisionChangesData: any[] = [];
        if (divisionChangesResponse.ok) {
          divisionChangesData = await divisionChangesResponse.json();
          setDivisionChanges(Array.isArray(divisionChangesData) ? divisionChangesData : []);
        }
        
        // Fetch rounds
        const roundsResponse = await fetch(`/api/rounds?seasonId=${selectedSeason.id}`);
        if (roundsResponse.ok) {
          const roundsData = await roundsResponse.json();
          const sortedRounds = roundsData.sort((a: any, b: any) => {
            // Sort by round number ascending (Round 1 first)
            return (a.roundNumber || 0) - (b.roundNumber || 0);
          });
          setRounds(sortedRounds);

          // Fetch saved points from database
          const savedPointsResponse = await fetch(`/api/points?seasonId=${selectedSeason.id}`);
          const savedPointsMap = new Map<string, any>();
          const savedPointsObj: Record<string, number> = {};
          const savedNotesObj: Record<string, string> = {};
          if (savedPointsResponse.ok) {
            const savedPointsData = await savedPointsResponse.json();
            savedPointsData.forEach((point: any) => {
              const key = `${point.roundId}-${point.driverId}-${point.raceType || 'qualification'}-${point.finalType || ''}`;
              savedPointsMap.set(key, point);
              savedPointsObj[key] = point.points;
              if (point.note) {
                savedNotesObj[key] = point.note;
              }
            });
          }
          setSavedPoints(savedPointsObj);
          setSavedNotes(savedNotesObj);

          // Fetch race results for each round
          const allPoints: DriverPoints[] = [];
          for (const round of roundsData) {
            try {
              const resultsResponse = await fetch(`/api/race-results?roundId=${round.id}`);
              if (resultsResponse.ok) {
                const resultsData = await resultsResponse.json();
                
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
                    
                    const driver = driversData.find((d: any) => d.id === result.driverId);
                    
                    // Get historical division
                    const getDivisionAtRound = (driverId: string, roundId: string, roundNumber: number): Division | undefined => {
                      if (!driverId || !divisionChangesData.length) {
                        const d = driversData.find((d: any) => d.id === driverId);
                        return d?.division;
                      }
                      
                      const driverChanges = divisionChangesData.filter((c: any) => c.driverId === driverId);
                      if (driverChanges.length === 0) {
                        const d = driversData.find((d: any) => d.id === driverId);
                        return d?.division;
                      }
                      
                      const targetRound = roundsData.find((r: any) => r.id === roundId);
                      const targetRoundNumber = targetRound?.roundNumber || roundNumber;
                      const isTargetPreSeason = roundId.startsWith('pre-season-');
                      
                      const sortedChanges = [...driverChanges].sort((a: any, b: any) => {
                        const aIsPreSeason = a.roundId.startsWith('pre-season-');
                        const bIsPreSeason = b.roundId.startsWith('pre-season-');
                        if (aIsPreSeason && !bIsPreSeason) return -1;
                        if (!aIsPreSeason && bIsPreSeason) return 1;
                        if (aIsPreSeason && bIsPreSeason) return 0;
                        const aRound = roundsData.find((r: any) => r.id === a.roundId);
                        const bRound = roundsData.find((r: any) => r.id === b.roundId);
                        const aRoundNumber = aRound?.roundNumber || 0;
                        const bRoundNumber = bRound?.roundNumber || 0;
                        return aRoundNumber - bRoundNumber;
                      });
                      
                      let mostRecentChange = null;
                      for (const change of sortedChanges) {
                        const changeIsPreSeason = change.roundId.startsWith('pre-season-');
                        if (isTargetPreSeason) {
                          if (changeIsPreSeason) mostRecentChange = change;
                          continue;
                        }
                        if (changeIsPreSeason) {
                          mostRecentChange = change;
                          continue;
                        }
                        const changeRound = roundsData.find((r: any) => r.id === change.roundId);
                        const changeRoundNumber = changeRound?.roundNumber || 0;
                        if (changeRoundNumber <= targetRoundNumber) {
                          mostRecentChange = change;
                        } else {
                          break;
                        }
                      }
                      
                      if (mostRecentChange) {
                        if (mostRecentChange.changeType === 'promotion' || mostRecentChange.changeType === 'demotion') {
                          return mostRecentChange.toDivision;
                        } else if (mostRecentChange.changeType === 'division_start' || mostRecentChange.changeType === 'mid_season_join') {
                          return mostRecentChange.divisionStart;
                        }
                      }
                      
                      const d = driversData.find((d: any) => d.id === driverId);
                      return d?.division;
                    };
                    
                    const driverDivisionAtRound = getDivisionAtRound(
                      result.driverId,
                      round.id,
                      round.roundNumber || 0
                    ) || result.division;
                    
                    // Check if there's a saved point
                    const savedPointKey = `${round.id}-${result.driverId}-${result.raceType || 'qualification'}-${result.finalType || ''}`;
                    const savedPoint = savedPointsMap.get(savedPointKey);
                    
                    const finalPoints = savedPoint ? savedPoint.points : points;
                    const finalDivision = savedPoint ? savedPoint.division : driverDivisionAtRound;
                    const finalOverallPosition = savedPoint?.overallPosition !== undefined ? savedPoint.overallPosition : overallPosition;
                    
                    allPoints.push({
                      driverId: result.driverId,
                      driverName: result.driverName || driver?.name || 'Unknown Driver',
                      division: finalDivision,
                      roundId: round.id,
                      roundName: round.location || 'TBD',
                      roundNumber: round.roundNumber || 0,
                      position: result.position || result.gridPosition || 0,
                      overallPosition: finalOverallPosition,
                      points: finalPoints,
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
      };
      
      await fetchData();

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
    if (Object.keys(editingPoints).length > 0 || Object.keys(editingNotes).length > 0) {
      if (confirm('Discard all unsaved changes?')) {
        setEditingPoints({});
        setEditingNotes({});
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

      // Refresh saved points list - the useEffect will handle it when activeTab is 'saved'
      // Force refresh by triggering the useEffect
      if (activeTab === 'saved' && drivers.length > 0 && rounds.length > 0) {
        // Re-use the same logic as the useEffect
        const fetchSavedPoints = async () => {
          try {
            const response = await fetch(`/api/points?seasonId=${selectedSeason.id}`);
            if (response.ok) {
              const pointsData = await response.json();
              
              // Fetch race results to get race division
              const raceResultsMap = new Map<string, Division | 'Open'>();
              for (const round of rounds) {
                try {
                  const resultsResponse = await fetch(`/api/race-results?roundId=${round.id}`);
                  if (resultsResponse.ok) {
                    const resultsData = await resultsResponse.json();
                    resultsData.forEach((divisionResult: any) => {
                      const raceDiv = divisionResult.division as Division | 'Open';
                      divisionResult.results?.forEach((result: any) => {
                        const key = `${round.id}-${result.driverId}-${result.raceType || 'qualification'}-${result.finalType || ''}`;
                        raceResultsMap.set(key, raceDiv);
                      });
                    });
                  }
                } catch (error) {
                  console.error(`Error fetching race results for ${round.id}:`, error);
                }
              }
              
              // Helper to get driver's division at a specific round (same as in useEffect)
              const getDriverDivisionAtRound = (driverId: string, roundId: string, roundNumber: number): Division | undefined => {
                if (!driverId || !divisionChanges.length) {
                  const d = drivers.find((d: any) => d.id === driverId);
                  return d?.division;
                }
                
                const driverChanges = divisionChanges.filter((c: any) => c.driverId === driverId);
                if (driverChanges.length === 0) {
                  const d = drivers.find((d: any) => d.id === driverId);
                  return d?.division;
                }
                
                const targetRound = rounds.find((r: any) => r.id === roundId);
                const targetRoundNumber = targetRound?.roundNumber || roundNumber;
                const isTargetPreSeason = roundId.startsWith('pre-season-');
                
                const sortedChanges = [...driverChanges].sort((a: any, b: any) => {
                  const aIsPreSeason = a.roundId.startsWith('pre-season-');
                  const bIsPreSeason = b.roundId.startsWith('pre-season-');
                  if (aIsPreSeason && !bIsPreSeason) return -1;
                  if (!aIsPreSeason && bIsPreSeason) return 1;
                  if (aIsPreSeason && bIsPreSeason) return 0;
                  const aRound = rounds.find((r: any) => r.id === a.roundId);
                  const bRound = rounds.find((r: any) => r.id === b.roundId);
                  const aRoundNumber = aRound?.roundNumber || 0;
                  const bRoundNumber = bRound?.roundNumber || 0;
                  return aRoundNumber - bRoundNumber;
                });
                
                let mostRecentChange = null;
                for (const change of sortedChanges) {
                  const changeIsPreSeason = change.roundId.startsWith('pre-season-');
                  if (isTargetPreSeason) {
                    if (changeIsPreSeason) mostRecentChange = change;
                    continue;
                  }
                  if (changeIsPreSeason) {
                    mostRecentChange = change;
                    continue;
                  }
                  const changeRound = rounds.find((r: any) => r.id === change.roundId);
                  const changeRoundNumber = changeRound?.roundNumber || 0;
                  if (changeRoundNumber <= targetRoundNumber) {
                    mostRecentChange = change;
                  } else {
                    break;
                  }
                }
                
                if (mostRecentChange) {
                  if (mostRecentChange.changeType === 'promotion' || mostRecentChange.changeType === 'demotion') {
                    return mostRecentChange.toDivision;
                  } else if (mostRecentChange.changeType === 'division_start' || mostRecentChange.changeType === 'mid_season_join') {
                    return mostRecentChange.divisionStart;
                  }
                }
                
                const d = drivers.find((d: any) => d.id === driverId);
                return d?.division;
              };
              
              const pointsWithDetails: SavedPoint[] = pointsData.map((p: any) => {
                const driver = drivers.find((d: any) => d.id === p.driverId);
                const round = rounds.find((r: any) => r.id === p.roundId);
                
                const raceResultKey = `${p.roundId}-${p.driverId}-${p.raceType || 'qualification'}-${p.finalType || ''}`;
                const raceDivision = raceResultsMap.get(raceResultKey) || (p.division as Division | 'Open');
                
                const driverDivision = getDriverDivisionAtRound(
                  p.driverId,
                  p.roundId,
                  round?.roundNumber || 0
                ) || p.division;
                
                return {
                  id: p.id,
                  seasonId: p.seasonId,
                  roundId: p.roundId,
                  driverId: p.driverId,
                  driverName: driver?.name || 'Unknown Driver',
                  driverDivision: driverDivision,
                  raceDivision: raceDivision,
                  raceType: p.raceType || 'qualification',
                  finalType: p.finalType,
                  overallPosition: p.overallPosition,
                  points: p.points,
                  createdAt: p.createdAt,
                  updatedAt: p.updatedAt,
                  roundName: round?.location || 'TBD',
                  roundNumber: round?.roundNumber || 0,
                  seasonName: selectedSeason.name,
                };
              });
              
              setSavedPointsList(pointsWithDetails);
            }
          } catch (error) {
            console.error('Failed to refresh saved points:', error);
          }
        };
        await fetchSavedPoints();
      }

      alert('Points deleted successfully!');
    } catch (error) {
      console.error('Error deleting points:', error);
      alert('Failed to delete points. Please try again.');
    }
  };

  // Handler to edit saved point
  const handleEditSavedPoint = (point: SavedPoint) => {
    // If another point is being edited, cancel it first
    if (editingSavedPoint && editingSavedPoint !== point.id) {
      setEditingSavedPointValues({});
    }
    setEditingSavedPoint(point.id);
    setEditingSavedPointValues({
      [point.id]: {
        points: point.points,
        overallPosition: point.overallPosition,
        note: point.note || '',
      }
    });
  };

  // Handler to cancel editing saved point
  const handleCancelEditSavedPoint = () => {
    setEditingSavedPoint(null);
    setEditingSavedPointValues({});
  };

  // Handler to save edited saved point
  const handleSaveSavedPoint = async (point: SavedPoint) => {
    if (!selectedSeason) {
      alert('No season selected');
      return;
    }

    const editedValues = editingSavedPointValues[point.id];
    if (!editedValues) {
      return;
    }

    try {
      setIsSavingSavedPoint(true);

      const response = await fetch('/api/points', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: point.id,
          seasonId: point.seasonId,
          roundId: point.roundId,
          driverId: point.driverId,
          division: point.driverDivision, // Preserve historical driver division
          raceType: point.raceType,
          finalType: point.finalType || undefined,
          overallPosition: editedValues.overallPosition !== undefined ? editedValues.overallPosition : point.overallPosition,
          points: editedValues.points,
          note: editedValues.note !== undefined ? editedValues.note : point.note || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update points');
      }

      // Refresh saved points list - the useEffect will handle it when activeTab is 'saved'

      // Also refresh main driver points to reflect changes
      const fetchData = async () => {
        const driversResponse = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`);
        let driversData: any[] = [];
        if (driversResponse.ok) {
          driversData = await driversResponse.json();
        }
        
        const divisionChangesResponse = await fetch(`/api/division-changes?seasonId=${selectedSeason.id}`);
        let divisionChangesData: any[] = [];
        if (divisionChangesResponse.ok) {
          divisionChangesData = await divisionChangesResponse.json();
        }
        
        const roundsResponse = await fetch(`/api/rounds?seasonId=${selectedSeason.id}`);
        if (roundsResponse.ok) {
          const roundsData = await roundsResponse.json();
          
          const savedPointsResponse = await fetch(`/api/points?seasonId=${selectedSeason.id}`);
          const savedPointsMap = new Map<string, any>();
          if (savedPointsResponse.ok) {
            const savedPointsData = await savedPointsResponse.json();
            savedPointsData.forEach((p: any) => {
              const key = `${p.roundId}-${p.driverId}-${p.raceType || 'qualification'}-${p.finalType || ''}`;
              savedPointsMap.set(key, p);
            });
          }

          const allPoints: DriverPoints[] = [];
          for (const round of roundsData) {
            try {
              const resultsResponse = await fetch(`/api/race-results?roundId=${round.id}`);
              if (resultsResponse.ok) {
                const resultsData = await resultsResponse.json();
                
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
                    
                    const driver = driversData.find((d: any) => d.id === result.driverId);
                    
                    const getDivisionAtRound = (driverId: string, roundId: string, roundNumber: number): Division | undefined => {
                      if (!driverId || !divisionChangesData.length) {
                        const d = driversData.find((d: any) => d.id === driverId);
                        return d?.division;
                      }
                      
                      const driverChanges = divisionChangesData.filter((c: any) => c.driverId === driverId);
                      if (driverChanges.length === 0) {
                        const d = driversData.find((d: any) => d.id === driverId);
                        return d?.division;
                      }
                      
                      const targetRound = roundsData.find((r: any) => r.id === roundId);
                      const targetRoundNumber = targetRound?.roundNumber || roundNumber;
                      const isTargetPreSeason = roundId.startsWith('pre-season-');
                      
                      const sortedChanges = [...driverChanges].sort((a: any, b: any) => {
                        const aIsPreSeason = a.roundId.startsWith('pre-season-');
                        const bIsPreSeason = b.roundId.startsWith('pre-season-');
                        if (aIsPreSeason && !bIsPreSeason) return -1;
                        if (!aIsPreSeason && bIsPreSeason) return 1;
                        if (aIsPreSeason && bIsPreSeason) return 0;
                        const aRound = roundsData.find((r: any) => r.id === a.roundId);
                        const bRound = roundsData.find((r: any) => r.id === b.roundId);
                        const aRoundNumber = aRound?.roundNumber || 0;
                        const bRoundNumber = bRound?.roundNumber || 0;
                        return aRoundNumber - bRoundNumber;
                      });
                      
                      let mostRecentChange = null;
                      for (const change of sortedChanges) {
                        const changeIsPreSeason = change.roundId.startsWith('pre-season-');
                        if (isTargetPreSeason) {
                          if (changeIsPreSeason) mostRecentChange = change;
                          continue;
                        }
                        if (changeIsPreSeason) {
                          mostRecentChange = change;
                          continue;
                        }
                        const changeRound = roundsData.find((r: any) => r.id === change.roundId);
                        const changeRoundNumber = changeRound?.roundNumber || 0;
                        if (changeRoundNumber <= targetRoundNumber) {
                          mostRecentChange = change;
                        } else {
                          break;
                        }
                      }
                      
                      if (mostRecentChange) {
                        if (mostRecentChange.changeType === 'promotion' || mostRecentChange.changeType === 'demotion') {
                          return mostRecentChange.toDivision;
                        } else if (mostRecentChange.changeType === 'division_start' || mostRecentChange.changeType === 'mid_season_join') {
                          return mostRecentChange.divisionStart;
                        }
                      }
                      
                      const d = driversData.find((d: any) => d.id === driverId);
                      return d?.division;
                    };
                    
                    const driverDivisionAtRound = getDivisionAtRound(
                      result.driverId,
                      round.id,
                      round.roundNumber || 0
                    ) || result.division;
                    
                    const savedPointKey = `${round.id}-${result.driverId}-${result.raceType || 'qualification'}-${result.finalType || ''}`;
                    const savedPoint = savedPointsMap.get(savedPointKey);
                    
                    const finalPoints = savedPoint ? savedPoint.points : points;
                    const finalDivision = savedPoint ? savedPoint.division : driverDivisionAtRound;
                    const finalOverallPosition = savedPoint?.overallPosition !== undefined ? savedPoint.overallPosition : overallPosition;
                    
                    allPoints.push({
                      driverId: result.driverId,
                      driverName: result.driverName || driver?.name || 'Unknown Driver',
                      division: finalDivision,
                      roundId: round.id,
                      roundName: round.location || 'TBD',
                      roundNumber: round.roundNumber || 0,
                      position: result.position || result.gridPosition || 0,
                      overallPosition: finalOverallPosition,
                      points: finalPoints,
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
      };
      
      await fetchData();

      setEditingSavedPoint(null);
      setEditingSavedPointValues({});
      alert('Saved point updated successfully!');
    } catch (error) {
      console.error('Error updating saved point:', error);
      alert('Failed to update saved point. Please try again.');
    } finally {
      setIsSavingSavedPoint(false);
    }
  };

  // Handler to delete saved point
  const handleDeleteSavedPoint = async (point: SavedPoint) => {
    if (!selectedSeason) {
      alert('No season selected');
      return;
    }

    const confirmMsg = `Are you sure you want to delete saved points for ${point.driverName} in Round ${point.roundNumber} (${point.raceType}${point.finalType ? ` ${point.finalType}` : ''})?`;
    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      setDeletingSavedPointId(point.id);

      const deleteResponse = await fetch(`/api/points?id=${point.id}`, {
        method: 'DELETE',
      });

      if (!deleteResponse.ok) {
        throw new Error('Failed to delete points');
      }

      // Refresh will happen via useEffect when activeTab changes

      // Also refresh main driver points
      const fetchData = async () => {
        const driversResponse = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`);
        let driversData: any[] = [];
        if (driversResponse.ok) {
          driversData = await driversResponse.json();
        }
        
        const divisionChangesResponse = await fetch(`/api/division-changes?seasonId=${selectedSeason.id}`);
        let divisionChangesData: any[] = [];
        if (divisionChangesResponse.ok) {
          divisionChangesData = await divisionChangesResponse.json();
        }
        
        const roundsResponse = await fetch(`/api/rounds?seasonId=${selectedSeason.id}`);
        if (roundsResponse.ok) {
          const roundsData = await roundsResponse.json();
          
          const savedPointsResponse = await fetch(`/api/points?seasonId=${selectedSeason.id}`);
          const savedPointsMap = new Map<string, any>();
          if (savedPointsResponse.ok) {
            const savedPointsData = await savedPointsResponse.json();
            savedPointsData.forEach((p: any) => {
              const key = `${p.roundId}-${p.driverId}-${p.raceType || 'qualification'}-${p.finalType || ''}`;
              savedPointsMap.set(key, p);
            });
          }

          const allPoints: DriverPoints[] = [];
          for (const round of roundsData) {
            try {
              const resultsResponse = await fetch(`/api/race-results?roundId=${round.id}`);
              if (resultsResponse.ok) {
                const resultsData = await resultsResponse.json();
                
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
                    
                    const driver = driversData.find((d: any) => d.id === result.driverId);
                    
                    const getDivisionAtRound = (driverId: string, roundId: string, roundNumber: number): Division | undefined => {
                      if (!driverId || !divisionChangesData.length) {
                        const d = driversData.find((d: any) => d.id === driverId);
                        return d?.division;
                      }
                      
                      const driverChanges = divisionChangesData.filter((c: any) => c.driverId === driverId);
                      if (driverChanges.length === 0) {
                        const d = driversData.find((d: any) => d.id === driverId);
                        return d?.division;
                      }
                      
                      const targetRound = roundsData.find((r: any) => r.id === roundId);
                      const targetRoundNumber = targetRound?.roundNumber || roundNumber;
                      const isTargetPreSeason = roundId.startsWith('pre-season-');
                      
                      const sortedChanges = [...driverChanges].sort((a: any, b: any) => {
                        const aIsPreSeason = a.roundId.startsWith('pre-season-');
                        const bIsPreSeason = b.roundId.startsWith('pre-season-');
                        if (aIsPreSeason && !bIsPreSeason) return -1;
                        if (!aIsPreSeason && bIsPreSeason) return 1;
                        if (aIsPreSeason && bIsPreSeason) return 0;
                        const aRound = roundsData.find((r: any) => r.id === a.roundId);
                        const bRound = roundsData.find((r: any) => r.id === b.roundId);
                        const aRoundNumber = aRound?.roundNumber || 0;
                        const bRoundNumber = bRound?.roundNumber || 0;
                        return aRoundNumber - bRoundNumber;
                      });
                      
                      let mostRecentChange = null;
                      for (const change of sortedChanges) {
                        const changeIsPreSeason = change.roundId.startsWith('pre-season-');
                        if (isTargetPreSeason) {
                          if (changeIsPreSeason) mostRecentChange = change;
                          continue;
                        }
                        if (changeIsPreSeason) {
                          mostRecentChange = change;
                          continue;
                        }
                        const changeRound = roundsData.find((r: any) => r.id === change.roundId);
                        const changeRoundNumber = changeRound?.roundNumber || 0;
                        if (changeRoundNumber <= targetRoundNumber) {
                          mostRecentChange = change;
                        } else {
                          break;
                        }
                      }
                      
                      if (mostRecentChange) {
                        if (mostRecentChange.changeType === 'promotion' || mostRecentChange.changeType === 'demotion') {
                          return mostRecentChange.toDivision;
                        } else if (mostRecentChange.changeType === 'division_start' || mostRecentChange.changeType === 'mid_season_join') {
                          return mostRecentChange.divisionStart;
                        }
                      }
                      
                      const d = driversData.find((d: any) => d.id === driverId);
                      return d?.division;
                    };
                    
                    const driverDivisionAtRound = getDivisionAtRound(
                      result.driverId,
                      round.id,
                      round.roundNumber || 0
                    ) || result.division;
                    
                    const savedPointKey = `${round.id}-${result.driverId}-${result.raceType || 'qualification'}-${result.finalType || ''}`;
                    const savedPoint = savedPointsMap.get(savedPointKey);
                    
                    const finalPoints = savedPoint ? savedPoint.points : points;
                    const finalDivision = savedPoint ? savedPoint.division : driverDivisionAtRound;
                    const finalOverallPosition = savedPoint?.overallPosition !== undefined ? savedPoint.overallPosition : overallPosition;
                    
                    allPoints.push({
                      driverId: result.driverId,
                      driverName: result.driverName || driver?.name || 'Unknown Driver',
                      division: finalDivision,
                      roundId: round.id,
                      roundName: round.location || 'TBD',
                      roundNumber: round.roundNumber || 0,
                      position: result.position || result.gridPosition || 0,
                      overallPosition: finalOverallPosition,
                      points: finalPoints,
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
      };
      
      await fetchData();

      // Refresh saved points list
      const pointsResponse = await fetch(`/api/points?seasonId=${selectedSeason.id}`);
      if (pointsResponse.ok) {
        const pointsData = await pointsResponse.json();
        
        // Fetch race results to get race division
        const raceResultsMap = new Map<string, Division | 'Open'>();
        for (const round of rounds) {
          try {
            const resultsResponse = await fetch(`/api/race-results?roundId=${round.id}`);
            if (resultsResponse.ok) {
              const resultsData = await resultsResponse.json();
              resultsData.forEach((divisionResult: any) => {
                const raceDiv = divisionResult.division as Division | 'Open';
                divisionResult.results?.forEach((result: any) => {
                  const key = `${round.id}-${result.driverId}-${result.raceType || 'qualification'}-${result.finalType || ''}`;
                  raceResultsMap.set(key, raceDiv);
                });
              });
            }
          } catch (error) {
            console.error(`Error fetching race results for ${round.id}:`, error);
          }
        }
        
        // Helper to get driver's division at a specific round
        const getDriverDivisionAtRound = (driverId: string, roundId: string, roundNumber: number): Division | undefined => {
          if (!driverId || !divisionChanges.length) {
            const d = drivers.find((d: any) => d.id === driverId);
            return d?.division;
          }
          
          const driverChanges = divisionChanges.filter((c: any) => c.driverId === driverId);
          if (driverChanges.length === 0) {
            const d = drivers.find((d: any) => d.id === driverId);
            return d?.division;
          }
          
          const targetRound = rounds.find((r: any) => r.id === roundId);
          const targetRoundNumber = targetRound?.roundNumber || roundNumber;
          const isTargetPreSeason = roundId.startsWith('pre-season-');
          
          const sortedChanges = [...driverChanges].sort((a: any, b: any) => {
            const aIsPreSeason = a.roundId.startsWith('pre-season-');
            const bIsPreSeason = b.roundId.startsWith('pre-season-');
            if (aIsPreSeason && !bIsPreSeason) return -1;
            if (!aIsPreSeason && bIsPreSeason) return 1;
            if (aIsPreSeason && bIsPreSeason) return 0;
            const aRound = rounds.find((r: any) => r.id === a.roundId);
            const bRound = rounds.find((r: any) => r.id === b.roundId);
            const aRoundNumber = aRound?.roundNumber || 0;
            const bRoundNumber = bRound?.roundNumber || 0;
            return aRoundNumber - bRoundNumber;
          });
          
          let mostRecentChange = null;
          for (const change of sortedChanges) {
            const changeIsPreSeason = change.roundId.startsWith('pre-season-');
            if (isTargetPreSeason) {
              if (changeIsPreSeason) mostRecentChange = change;
              continue;
            }
            if (changeIsPreSeason) {
              mostRecentChange = change;
              continue;
            }
            const changeRound = rounds.find((r: any) => r.id === change.roundId);
            const changeRoundNumber = changeRound?.roundNumber || 0;
            if (changeRoundNumber <= targetRoundNumber) {
              mostRecentChange = change;
            } else {
              break;
            }
          }
          
          if (mostRecentChange) {
            if (mostRecentChange.changeType === 'promotion' || mostRecentChange.changeType === 'demotion') {
              return mostRecentChange.toDivision;
            } else if (mostRecentChange.changeType === 'division_start' || mostRecentChange.changeType === 'mid_season_join') {
              return mostRecentChange.divisionStart;
            }
          }
          
          const d = drivers.find((d: any) => d.id === driverId);
          return d?.division;
        };
        
        const pointsWithDetails: SavedPoint[] = pointsData.map((p: any) => {
          const driver = drivers.find((d: any) => d.id === p.driverId);
          const round = rounds.find((r: any) => r.id === p.roundId);
          
          const raceResultKey = `${p.roundId}-${p.driverId}-${p.raceType || 'qualification'}-${p.finalType || ''}`;
          const raceDivision = raceResultsMap.get(raceResultKey) || (p.division as Division | 'Open');
          
          const driverDivision = getDriverDivisionAtRound(
            p.driverId,
            p.roundId,
            round?.roundNumber || 0
          ) || p.division;
          
          return {
            id: p.id,
            seasonId: p.seasonId,
            roundId: p.roundId,
            driverId: p.driverId,
            driverName: driver?.name || 'Unknown Driver',
            driverDivision: driverDivision,
            raceDivision: raceDivision,
            raceType: p.raceType || 'qualification',
            finalType: p.finalType,
            overallPosition: p.overallPosition,
            points: p.points,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            roundName: round?.location || 'TBD',
            roundNumber: round?.roundNumber || 0,
            seasonName: selectedSeason.name,
          };
        });
        setSavedPointsList(pointsWithDetails);
      }

      alert('Saved point deleted successfully!');
    } catch (error) {
      console.error('Error deleting saved point:', error);
      alert('Failed to delete saved point. Please try again.');
    } finally {
      setDeletingSavedPointId(null);
    }
  };

  // Filter saved points
  const filteredSavedPoints = useMemo(() => {
    let filtered = [...savedPointsList];

    if (savedPointsRoundFilter) {
      filtered = filtered.filter(p => p.roundId === savedPointsRoundFilter);
    }

    if (savedPointsDivisionFilter !== 'all') {
      // For final races, filter by driver division
      // For other race types, filter by race division
      if (savedPointsRaceTypeFilter === 'final') {
        // Filter by driver division for final races
        if (savedPointsDivisionFilter === 'Open') {
          filtered = filtered.filter(p => {
            const div = p.driverDivision;
            return div === 'Open' || (div && isOpenDivision(div));
          });
        } else {
          filtered = filtered.filter(p => p.driverDivision === savedPointsDivisionFilter);
        }
      } else {
        // Filter by race division for non-final races
        if (savedPointsDivisionFilter === 'Open') {
          filtered = filtered.filter(p => p.raceDivision === 'Open');
        } else {
          filtered = filtered.filter(p => p.raceDivision === savedPointsDivisionFilter);
        }
      }
    }

    if (savedPointsRaceTypeFilter) {
      filtered = filtered.filter(p => p.raceType === savedPointsRaceTypeFilter);
    }

    // Filter by final type (race group A, B, C)
    if (savedPointsFinalTypeFilter) {
      filtered = filtered.filter(p => (p.finalType || '').toUpperCase() === savedPointsFinalTypeFilter.toUpperCase());
    }

    // Apply the same sorting logic as filteredPoints final sort in points management
    // This matches the final sort at the end of filteredPoints useMemo (lines 1015-1050)
    return filtered.sort((a, b) => {
      const aRaceType = a.raceType || 'qualification';
      const bRaceType = b.raceType || 'qualification';
      
      // For final races, maintain Race Type then position ordering
      if (aRaceType === 'final' && bRaceType === 'final') {
        // Primary sort: by Race Type (Final A > Final B > Final C, etc.)
        const aFinalType = (a.finalType || '').toUpperCase();
        const bFinalType = (b.finalType || '').toUpperCase();
        
        if (aFinalType !== bFinalType) {
          const aCode = aFinalType.charCodeAt(0) || 999;
          const bCode = bFinalType.charCodeAt(0) || 999;
          return aCode - bCode;
        }
        
        // Secondary sort: by overall position
        const aOverallPos = a.overallPosition ?? 0;
        const bOverallPos = b.overallPosition ?? 0;
        if (aOverallPos !== bOverallPos) {
          return aOverallPos - bOverallPos;
        }
        
        // Tertiary sort: by round (most recent first)
        const aRoundNum = a.roundNumber ?? 0;
        const bRoundNum = b.roundNumber ?? 0;
        return bRoundNum - aRoundNum;
      }
      
      // For other race types, sort by overall position first, then by round
      const aOverallPos = a.overallPosition ?? 0;
      const bOverallPos = b.overallPosition ?? 0;
      if (aOverallPos !== bOverallPos) {
        return aOverallPos - bOverallPos;
      }
      
      // Secondary sort: by round (most recent first)
      const aRoundNum = a.roundNumber ?? 0;
      const bRoundNum = b.roundNumber ?? 0;
      const roundCompare = bRoundNum - aRoundNum;
      return roundCompare;
    });
  }, [savedPointsList, savedPointsRoundFilter, savedPointsDivisionFilter, savedPointsRaceTypeFilter, savedPointsFinalTypeFilter]);

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
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => handleTabChange('points')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'points'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Points Management
          </button>
          <button
            onClick={() => handleTabChange('saved')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'saved'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Saved Points
          </button>
        </div>

        {activeTab === 'points' && (
          <>
            {/* Inline Filters */}
            <SectionCard icon={Edit} title="Filters" className="mb-8">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
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
                
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Race Type
                  </label>
                  <select
                    value={selectedRaceType}
                    onChange={(e) => {
                      const newRaceType = e.target.value;
                      setSelectedRaceType(newRaceType);
                      if (newRaceType !== 'heat') {
                        setSelectedHeatType('');
                      }
                      // Always clear final type since filter is removed when final is selected
                      setSelectedFinalType('');
                    }}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Race Types</option>
                    {availableRaceTypes.includes('heat') && (
                      <option value="heat">Heat</option>
                    )}
                    {availableRaceTypes.includes('final') && (
                      <option value="final">Final</option>
                    )}
                  </select>
                </div>
                
                {/* Heat Type filter inline (Final Type filter removed when final is selected) */}
                {selectedRaceType === 'heat' && availableHeatTypes.length > 0 && (
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Heat Type
                    </label>
                    <select
                      value={selectedHeatType}
                      onChange={(e) => setSelectedHeatType(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    >
                      <option value="">Select Heat Type</option>
                      {availableHeatTypes.map(heatType => (
                        <option key={heatType} value={heatType}>Heat {heatType}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {selectedRaceType === 'final' ? 'Driver Division' : 'Race Division'}
                  </label>
                  <select
                    value={selectedDivision}
                    onChange={(e) => setSelectedDivision(e.target.value as Division)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {availableDivisions.map(div => (
                      <option key={div} value={div}>{div}</option>
                    ))}
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
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Points Position
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
                          Overall Position
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
                          <td colSpan={10} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
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
                              className={`hover:bg-slate-50 dark:hover:bg-slate-800 ${movedDown ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                            >
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                                {point.pointsPosition || '-'}
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
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                                {point.overallPosition}
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
                                  <div className="relative">
                                    <input
                                      type="number"
                                      value={currentPoints}
                                      onChange={(e) => handleEditPoints(point, parseInt(e.target.value) || 0)}
                                      className={`w-20 px-2 py-1 border rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold ${
                                        pointsChanged 
                                          ? 'border-orange-500 dark:border-orange-400 border-2' 
                                          : 'border-slate-300 dark:border-slate-700'
                                      }`}
                                      min="0"
                                    />
                                    {pointsChanged && (
                                      <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm" title={`Changed from ${point.points} to ${currentPoints}`}>
                                        {currentPoints > point.points ? '↑' : currentPoints < point.points ? '↓' : '='}
                                      </div>
                                    )}
                                  </div>
                                  {pointsChanged && (
                                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                      {point.points} → {currentPoints}
                                    </span>
                                  )}
                                  {(editingNotes[key] || savedNotes[key]) && (
                                    <button
                                      onClick={() => handleOpenNoteModal(point)}
                                      className="p-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/40 rounded transition-colors group relative"
                                      title={`Note attached: ${((editingNotes[key] || savedNotes[key]) || '').substring(0, 100)}${((editingNotes[key] || savedNotes[key]) || '').length > 100 ? '...' : ''}`}
                                    >
                                      <MessageSquare className="w-4 h-4" />
                                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary-500 rounded-full border border-white dark:border-slate-800"></span>
                                    </button>
                                  )}
                                  {movedDown && (
                                    <ArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                                {totalPoints}
                                {/* Show breakdown if both heat and final exist for this driver/round */}
                                {(() => {
                                  const roundHeatPoints = driverPoints
                                    .filter(p => p.driverId === point.driverId && p.roundId === point.roundId && p.raceType === 'heat')
                                    .reduce((sum, p) => {
                                      const key = `${p.driverId}-${p.roundId}-${p.raceType}-${p.finalType || ''}`;
                                      const pts = editingPoints[key] !== undefined ? editingPoints[key] : (savedPoints[key] || p.points);
                                      return sum + pts;
                                    }, 0);
                                  const roundFinalPoints = driverPoints
                                    .filter(p => p.driverId === point.driverId && p.roundId === point.roundId && p.raceType === 'final')
                                    .reduce((sum, p) => {
                                      const key = `${p.driverId}-${p.roundId}-${p.raceType}-${p.finalType || ''}`;
                                      const pts = editingPoints[key] !== undefined ? editingPoints[key] : (savedPoints[key] || p.points);
                                      return sum + pts;
                                    }, 0);
                                  
                                  if (roundHeatPoints > 0 && roundFinalPoints > 0 && point.roundId === selectedRound) {
                                    return (
                                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-1 font-normal">
                                        ({roundHeatPoints}H + {roundFinalPoints}F)
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleOpenNoteModal(point)}
                                    className={`p-2 rounded-lg transition-colors ${
                                      (editingNotes[key] || savedNotes[key]) 
                                        ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/40' 
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                                    title={(editingNotes[key] || savedNotes[key]) ? `Note: ${editingNotes[key] || savedNotes[key]}` : 'Add note'}
                                  >
                                    <FileText className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePoints(point)}
                                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                                    title="Delete points"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
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

        {activeTab === 'saved' && (
          <>
            {/* Saved Points Filters - Inline */}
            <SectionCard icon={Edit} title="Saved Points Filters" className="mb-8">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Round
                  </label>
                  <select
                    value={savedPointsRoundFilter}
                    onChange={(e) => setSavedPointsRoundFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Rounds</option>
                    {rounds.map(round => (
                      <option key={round.id} value={round.id}>
                        Round {round.roundNumber}: {round.location || 'TBD'}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Race Type
                  </label>
                  <select
                    value={savedPointsRaceTypeFilter}
                    onChange={(e) => {
                      const newRaceType = e.target.value;
                      setSavedPointsRaceTypeFilter(newRaceType);
                      // Clear final type filter when race type changes or when final is selected
                      if (!newRaceType || newRaceType === 'final') {
                        setSavedPointsFinalTypeFilter('');
                      }
                      // Clear Open division filter when final is selected
                      if (newRaceType === 'final' && savedPointsDivisionFilter === 'Open') {
                        setSavedPointsDivisionFilter('all');
                      }
                    }}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Race Types</option>
                    <option value="qualification">Qualification</option>
                    <option value="heat">Heat</option>
                    <option value="final">Final</option>
                  </select>
                </div>
                
                {savedPointsRaceTypeFilter !== 'final' && (
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Race Group
                    </label>
                    <select
                      value={savedPointsFinalTypeFilter}
                      onChange={(e) => setSavedPointsFinalTypeFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">All Race Groups</option>
                      {availableSavedPointsFinalTypes.map((finalType: string) => (
                        <option key={finalType} value={finalType}>Group {finalType}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {savedPointsRaceTypeFilter === 'final' ? 'Driver Division' : 'Race Division'}
                  </label>
                  <select
                    value={savedPointsDivisionFilter}
                    onChange={(e) => setSavedPointsDivisionFilter(e.target.value as Division | 'all')}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Divisions</option>
                    <option value="Division 1">Division 1</option>
                    <option value="Division 2">Division 2</option>
                    {savedPointsRaceTypeFilter !== 'heat' && (
                      <>
                        <option value="Division 3">Division 3</option>
                        <option value="Division 4">Division 4</option>
                        <option value="New">New</option>
                      </>
                    )}
                    {savedPointsRaceTypeFilter !== 'final' && (
                      <option value="Open">Open</option>
                    )}
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Showing {filteredSavedPoints.length} of {savedPointsList.length} saved points
              </p>
            </SectionCard>
            
            {/* Saved Points Table with updated columns */}
            <SectionCard title="All Saved Points" icon={Trophy} noPadding className="mb-8">
              {loadingSavedPoints ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                  <p className="ml-2 text-slate-600 dark:text-slate-400">Loading saved points...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Season
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Round
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Driver
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
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Position
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Points
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Note
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Saved At
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {filteredSavedPoints.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                            {savedPointsList.length === 0 
                              ? 'No saved points found. Save points from the Points Management tab.'
                              : 'No saved points match the selected filters.'}
                          </td>
                        </tr>
                      ) : (
                        filteredSavedPoints.map((point) => {
                          const isEditing = editingSavedPoint === point.id;
                          const editedValues = editingSavedPointValues[point.id];
                          const currentPoints = isEditing && editedValues ? editedValues.points : point.points;
                          const currentPosition = isEditing && editedValues ? editedValues.overallPosition : point.overallPosition;
                          const currentNote = isEditing && editedValues ? editedValues.note : point.note;

                          return (
                            <tr 
                              key={point.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                {point.seasonName || point.seasonId}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                Round {point.roundNumber}: {point.roundName || 'TBD'}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-medium text-slate-900 dark:text-white">
                                  {point.driverName}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getDivisionColor(point.driverDivision)}`}>
                                  {point.driverDivision}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getDivisionColor(point.raceDivision as Division)}`}>
                                  {point.raceDivision}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getRaceTypeBadgeColor(point.raceType, point.finalType)}`}>
                                  {point.raceType === 'final' && point.finalType 
                                    ? `Final ${point.finalType.toUpperCase()}` 
                                    : point.raceType === 'heat' && point.finalType
                                    ? `Heat ${point.finalType.toUpperCase()}`
                                    : point.raceType ? point.raceType.charAt(0).toUpperCase() + point.raceType.slice(1) 
                                    : 'Qualification'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={currentPosition || ''}
                                    onChange={(e) => {
                                      const value = e.target.value ? parseInt(e.target.value) : undefined;
                                      setEditingSavedPointValues(prev => ({
                                        ...prev,
                                        [point.id]: {
                                          ...prev[point.id],
                                          overallPosition: value,
                                        }
                                      }));
                                    }}
                                    className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                                    min="1"
                                    placeholder="-"
                                  />
                                ) : (
                                  <span className="text-sm text-slate-600 dark:text-slate-400">
                                    {point.overallPosition || '-'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={currentPoints}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value) || 0;
                                      setEditingSavedPointValues(prev => ({
                                        ...prev,
                                        [point.id]: {
                                          ...prev[point.id],
                                          points: value,
                                        }
                                      }));
                                    }}
                                    className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold"
                                    min="0"
                                  />
                                ) : (
                                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {point.points}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <textarea
                                    value={currentNote || ''}
                                    onChange={(e) => {
                                      setEditingSavedPointValues(prev => ({
                                        ...prev,
                                        [point.id]: {
                                          ...prev[point.id],
                                          note: e.target.value,
                                        }
                                      }));
                                    }}
                                    className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm resize-none"
                                    rows={2}
                                    maxLength={500}
                                    placeholder="Add note..."
                                  />
                                ) : point.note ? (
                                  <button
                                    onClick={() => handleOpenNoteModal(point, true)}
                                    className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/40 rounded transition-colors"
                                    title="View note"
                                  >
                                    <MessageSquare className="w-5 h-5" />
                                  </button>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-600">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                {point.updatedAt ? new Date(point.updatedAt).toLocaleDateString() : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => handleSaveSavedPoint(point)}
                                        disabled={isSavingSavedPoint}
                                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/40 rounded-lg transition-colors disabled:opacity-50"
                                        title="Save changes"
                                      >
                                        {isSavingSavedPoint ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Check className="w-4 h-4" />
                                        )}
                                      </button>
                                      <button
                                        onClick={handleCancelEditSavedPoint}
                                        disabled={isSavingSavedPoint}
                                        className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                                        title="Cancel editing"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleEditSavedPoint(point)}
                                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                                        title="Edit points"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSavedPoint(point)}
                                        disabled={deletingSavedPointId === point.id}
                                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg transition-colors disabled:opacity-50"
                                        title="Delete points"
                                      >
                                        {deletingSavedPointId === point.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-4 h-4" />
                                        )}
                                      </button>
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
              )}
            </SectionCard>
          </>
        )}

      </PageLayout>

      {/* Note Modal */}
      {showNoteModal && noteModalPoint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {noteModalIsViewOnly ? 'View Note' : 'Add Note'} for {noteModalPoint.driverName}
              </h3>
              <button
                onClick={handleCancelNote}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Round {noteModalPoint.roundNumber}: {noteModalPoint.roundName} - {noteModalPoint.raceType}
                {noteModalPoint.finalType ? ` ${noteModalPoint.finalType.toUpperCase()}` : ''}
              </p>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Reason for point change
              </label>
              {noteModalIsViewOnly ? (
                <div className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white min-h-[100px] whitespace-pre-wrap">
                  {noteModalValue || 'No note available'}
                </div>
              ) : (
                <>
                  <textarea
                    value={noteModalValue}
                    onChange={(e) => setNoteModalValue(e.target.value)}
                    placeholder="Enter reason for manual point adjustment..."
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {noteModalValue.length}/500 characters
                  </p>
                </>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelNote}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
              >
                {noteModalIsViewOnly ? 'Close' : 'Cancel'}
              </button>
              {!noteModalIsViewOnly && (
                <button
                  onClick={handleSaveNote}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Note
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
