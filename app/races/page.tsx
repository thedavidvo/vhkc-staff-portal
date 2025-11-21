'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Header from '@/components/Header';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import Modal from '@/components/Modal';
import { useSeason } from '@/components/SeasonContext';
import { Race, Division, DriverRaceResult } from '@/types';
import { Plus, Save, Trash2, Loader2, Flag, Calendar, Users, Trophy } from 'lucide-react';
import { getPointsForPosition } from '@/lib/pointsSystem';

// Helper function to get division color (for table cells with division badges)
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

// Helper function to get race type for separation
const getRaceType = (raceName: string): 'qual' | 'heat' | 'final' | 'other' => {
  const upperName = raceName.toUpperCase();
  if (upperName.startsWith('QUAL')) {
    return 'qual';
  } else if (upperName.startsWith('HEAT')) {
    return 'heat';
  } else if (upperName.startsWith('FINAL')) {
    return 'final';
  }
  return 'other';
};

// Helper function to parse race name for sorting
// Returns { type: 'qual'|'heat'|'final', order: number }
const parseRaceNameForSorting = (raceName: string): { type: string; order: number } => {
  const upperName = raceName.toUpperCase();
  
  // Determine race type order: Qual = 1, Heat = 2, Final = 3
  let typeOrder = 0;
  let groupOrder = 0;
  
  if (upperName.startsWith('QUAL')) {
    typeOrder = 1;
    // Extract group number (e.g., "Qual Group 1" -> 1)
    const groupMatch = raceName.match(/Group\s+(\d+)/i);
    if (groupMatch) {
      groupOrder = parseInt(groupMatch[1], 10);
    }
  } else if (upperName.startsWith('HEAT')) {
    typeOrder = 2;
    // Extract final type letter (e.g., "Heat A" -> 1 for A)
    const letterMatch = raceName.match(/\s+([A-F])$/i);
    if (letterMatch) {
      const letter = letterMatch[1].toUpperCase();
      groupOrder = letter.charCodeAt(0) - 64; // A=1, B=2, etc.
    }
  } else if (upperName.startsWith('FINAL')) {
    typeOrder = 3;
    // Extract final type letter (e.g., "Final A" -> 1 for A)
    const letterMatch = raceName.match(/\s+([A-F])$/i);
    if (letterMatch) {
      const letter = letterMatch[1].toUpperCase();
      groupOrder = letter.charCodeAt(0) - 64; // A=1, B=2, etc.
    }
  }
  
  return { type: typeOrder.toString(), order: groupOrder };
};

// Helper function to sort race names
const sortRaceNames = (raceNames: string[]): string[] => {
  return [...raceNames].sort((a, b) => {
    const aParsed = parseRaceNameForSorting(a);
    const bParsed = parseRaceNameForSorting(b);
    
    // First sort by race type (Qual, Heat, Final)
    if (aParsed.type !== bParsed.type) {
      return parseInt(aParsed.type, 10) - parseInt(bParsed.type, 10);
    }
    
    // Then sort by group/letter order (1-6 for Qual, A-F for Heat/Final)
    return aParsed.order - bParsed.order;
  });
};

// Helper function to parse race selection into raceType and finalType
const parseRaceSelection = (selection: string) => {
  let raceType = 'qualification';
  let finalType = '';
  
  const lowerSelection = selection.toLowerCase();
  if (lowerSelection.includes('qual')) {
    raceType = 'qualification';
    const groupMatch = selection.match(/Group\s+(\d+)/i);
    if (groupMatch) {
      finalType = groupMatch[1];
    }
  } else if (lowerSelection.includes('heat')) {
    raceType = 'heat';
    const letterMatch = selection.match(/\s+([A-Z])$/);
    if (letterMatch) {
      finalType = letterMatch[1];
    }
  } else if (lowerSelection.includes('final')) {
    raceType = 'final';
    const letterMatch = selection.match(/\s+([A-Z])$/);
    if (letterMatch) {
      finalType = letterMatch[1];
    }
  }
  
  return { raceType, finalType };
};

// Helper function to filter division results by selection
const filterDivisionResultsBySelection = (
  divisionResults: any[],
  selection?: string | null
) => {
  if (!selection) return divisionResults;
  
  const { raceType, finalType } = parseRaceSelection(selection);
  let filtered = divisionResults.filter(
    (r: any) => (r.raceType || 'qualification').toLowerCase() === raceType.toLowerCase()
  );
  
  if (raceType === 'qualification' && finalType) {
    filtered = filtered.filter((r: any) => (r.finalType || '') === finalType);
  } else if ((raceType === 'heat' || raceType === 'final') && finalType) {
    filtered = filtered.filter(
      (r: any) => (r.finalType || '').toUpperCase() === finalType.toUpperCase()
    );
  }
  
  if (filtered.length === 0) {
    filtered = divisionResults.filter((r: any) => {
      if (r.raceName === selection) {
        return true;
      }
      // Fallback to normalize legacy formats "Race (type)"
      const oldFormatMatch = (r.raceName || '').match(/^(.+)\s*\((\w+)\)$/);
      if (oldFormatMatch) {
        const capitalizedRaceType =
          oldFormatMatch[2].charAt(0).toUpperCase() + oldFormatMatch[2].slice(1);
        const normalizedName = `${oldFormatMatch[1]} - ${capitalizedRaceType}`;
        return normalizedName === selection;
      }
      return false;
    });
  }
  
  return filtered;
};

// Helper function to sort race results based on race type
const sortRaceResults = (results: any[], selection?: string | null) => {
  if (!selection || results.length === 0) return results;
  const { raceType } = parseRaceSelection(selection);
  const normalizedRaceType = raceType?.toLowerCase();
  const sorted = [...results];
  
  // For saved qualifications, sort by best time (fastestLap)
  if (normalizedRaceType === 'qualification') {
    sorted.sort((a, b) => {
      // Parse time in format like "1:23.456" or "83.456"
      const parseTime = (time: string): number => {
        if (!time || time.trim() === '') return Infinity;
        const cleaned = time.trim().replace(/[^\d:.]/g, '');
        if (cleaned.includes(':')) {
          const [minutes, seconds] = cleaned.split(':');
          return parseFloat(minutes || '0') * 60 + parseFloat(seconds || '0');
        }
        return parseFloat(cleaned) || Infinity;
      };
      const timeA = parseTime(a.fastestLap || '');
      const timeB = parseTime(b.fastestLap || '');
      return timeA - timeB;
    });
  } else if (normalizedRaceType === 'heat' || normalizedRaceType === 'final') {
    // For saved heat and finals, sort by overall position
    sorted.sort((a, b) => {
      const posA = parseInt(a.overallPosition || a.position || '0') || Infinity;
      const posB = parseInt(b.overallPosition || b.position || '0') || Infinity;
      return posA - posB;
    });
  }
  return sorted;
};

export default function RacesPage() {
  const { selectedSeason } = useSeason();
  const [rounds, setRounds] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch rounds and drivers from API
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedSeason) {
        setRounds([]);
        setDrivers([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [roundsResponse, driversResponse] = await Promise.all([
          fetch(`/api/rounds?seasonId=${selectedSeason.id}`),
          fetch(`/api/drivers?seasonId=${selectedSeason.id}`),
        ]);
        
        if (roundsResponse.ok) {
          const data = await roundsResponse.json();
          // Sort rounds by date
          const sortedRounds = data.sort((a: any, b: any) => {
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            return dateA - dateB;
          });
          setRounds(sortedRounds);
        }
        
        if (driversResponse.ok) {
          const driversData = await driversResponse.json();
          setDrivers(driversData);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSeason]);
  
  // Convert rounds to races format
  const races = useMemo(() => {
    return rounds.map((round) => ({
      id: round.id,
      name: round.location || 'TBD',
      season: selectedSeason?.name || '',
      round: round.roundNumber,
      roundNumber: round.roundNumber,
      date: round.date,
      location: round.location,
      address: round.address,
      status: round.status,
      results: [], // Will be populated from race results if needed
    }));
  }, [rounds, selectedSeason]);

  const [selectedEvent, setSelectedEvent] = useState<Race | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [selectedUIDivision, setSelectedUIDivision] = useState<Division | 'Open' | null>(null); // Track UI division (Open/Div1/Div2)
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [types, setTypes] = useState<string[]>([]);
  const [driverResults, setDriverResults] = useState<DriverRaceResult[]>([]);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [selectedRaceType, setSelectedRaceType] = useState<'qualification' | 'heat' | 'final'>('final');
  const [selectedFinalType, setSelectedFinalType] = useState<string>('A');
  const [selectedGroup, setSelectedGroup] = useState<string>('1');
  const shouldLoadResultsRef = useRef(true); // Track if we should load results from saved data

  // Fetch race results for a specific round
  const fetchRaceResults = async (roundId: string, resultsSheetId?: string) => {
    try {
      // Always include roundId, and optionally include resultsSheetId for specific sheet filtering
      let url = `/api/race-results?roundId=${roundId}`;
      if (resultsSheetId) {
        url += `&resultsSheetId=${resultsSheetId}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const results = await response.json();
        return results;
      }
      return [];
    } catch (error) {
      console.error('Error fetching race results:', error);
      return [];
    }
  };

  // Update selected event when races change and load its results
  useEffect(() => {
    const loadEventResults = async () => {
      if (races.length > 0 && !selectedEvent) {
        const firstRace = races[0];
        const results = await fetchRaceResults(firstRace.id);
        setSelectedEvent({ ...firstRace, results });
        setSelectedDivision('Division 1');
        setSelectedUIDivision('Division 1');
      } else if (races.length === 0) {
        setSelectedEvent(null);
        setSelectedDivision(null);
        setSelectedUIDivision(null);
      } else if (selectedEvent && !races.find((r) => r.id === selectedEvent.id)) {
        // If current selected event is not in filtered races, select first one
        const firstRace = races[0];
        const results = await fetchRaceResults(firstRace.id);
        setSelectedEvent({ ...firstRace, results });
        setSelectedDivision('Division 1');
        setSelectedUIDivision('Division 1');
      } else if (selectedEvent && !selectedEvent.results) {
        // If selected event doesn't have results, fetch them
        const results = await fetchRaceResults(selectedEvent.id);
        setSelectedEvent({ ...selectedEvent, results });
      }
    };
    
    loadEventResults();
  }, [races, selectedEvent]);

  // Load division results when division is set and extract race types
  useEffect(() => {
    if (selectedEvent && selectedDivision && selectedEvent.results) {
      // First, try to find results by resultsSheetId if we have a selectedType
      // This ensures we load drivers from the same sheet within the selected division
      let divisionResults: any[] = [];
      let resultsSheetId: string | null = null;
      
      if (selectedType && shouldLoadResultsRef.current) {
        // Look for results with the same raceType/finalType ONLY in the selected division
        // to find the resultsSheetId
        // Handle "Open" division - if selectedDivision is one of openDivisions, also check for "Open" race_division
        let divisionResult = selectedEvent.results.find((r: any) => r.division === selectedDivision);
        if (!divisionResult && isOpenDivision(selectedDivision)) {
          divisionResult = selectedEvent.results.find((r: any) => r.division === 'Open');
        }
        if (divisionResult && divisionResult.results) {
          const { raceType, finalType } = parseRaceSelection(selectedType);
          const matchingResult = divisionResult.results.find((r: any) => 
            (r.raceType || 'qualification').toLowerCase() === raceType.toLowerCase() &&
            (r.finalType || '') === (finalType || '')
          );
          
          if (matchingResult && matchingResult.resultsSheetId) {
            resultsSheetId = matchingResult.resultsSheetId;
          }
        }
        
        // If we found a resultsSheetId, fetch all results for that sheet
        if (resultsSheetId) {
          console.log('Loading results by resultsSheetId:', resultsSheetId);
          const loadSheetResults = async () => {
            const sheetResults = await fetchRaceResults(selectedEvent.id, resultsSheetId!);
            
            // Flatten results from the selected division only
            // Handle "Open" division - if selectedDivision is one of openDivisions, also check for "Open" race_division
            const allSheetResults: any[] = [];
            sheetResults.forEach((divisionResult: any) => {
              // Check if this division result matches the selected division
              const matchesDivision = divisionResult.division === selectedDivision;
              // Also check if selectedDivision is an open division and race_division is "Open"
              const matchesOpen = isOpenDivision(selectedDivision) && divisionResult.division === 'Open';
              
              if (divisionResult.results && (matchesDivision || matchesOpen)) {
                allSheetResults.push(...divisionResult.results);
              }
            });
            
            // Extract unique race types from sheet results in the selected division
            const uniqueRaceTypes = new Set<string>();
            types.forEach(type => uniqueRaceTypes.add(type));
            allSheetResults.forEach((result: any) => {
              if (result.raceName && result.raceName.trim() !== '') {
                let raceName = result.raceName;
                const invalidPattern = /^(\w+)\s*\((\1)\)$/i;
                if (invalidPattern.test(raceName)) {
                  return;
                }
                const oldFormatMatch = raceName.match(/^(.+)\s*\((\w+)\)$/);
                if (oldFormatMatch) {
                  const capitalizedRaceType = oldFormatMatch[2].charAt(0).toUpperCase() + oldFormatMatch[2].slice(1);
                  raceName = `${oldFormatMatch[1]} - ${capitalizedRaceType}`;
                } else {
                  const newFormatMatch = raceName.match(/^(.+)\s*-\s*(\w+)$/);
                  if (newFormatMatch) {
                    const capitalizedRaceType = newFormatMatch[2].charAt(0).toUpperCase() + newFormatMatch[2].slice(1);
                    raceName = `${oldFormatMatch[1]} - ${capitalizedRaceType}`;
                  }
                }
                uniqueRaceTypes.add(raceName);
              }
            });
            
            const existingTypes = Array.from(uniqueRaceTypes);
            setTypes(existingTypes);
            
            // Filter by selectedType (results are already filtered by selectedDivision)
            const filteredResults = filterDivisionResultsBySelection(allSheetResults, selectedType);
            // Sort results based on race type
            const sortedResults = sortRaceResults(filteredResults, selectedType);
            setDriverResults(sortedResults.length > 0 ? [...sortedResults] : []);
            shouldLoadResultsRef.current = false;
          };
          
          loadSheetResults();
          return; // Exit early, we're fetching by sheet ID
        }
      }
      
      // Fallback: use division-based filtering if no resultsSheetId found
      // Handle "Open" division - if selectedDivision is one of openDivisions, also check for "Open" race_division
      let divisionResult = selectedEvent.results.find((r: any) => r.division === selectedDivision);
      if (!divisionResult && isOpenDivision(selectedDivision)) {
        // Also check for "Open" race_division
        divisionResult = selectedEvent.results.find((r: any) => r.division === 'Open');
      }
      if (divisionResult && divisionResult.results) {
        divisionResults = divisionResult.results || [];
        
        // Extract unique race types from saved results and populate types array
        // Use functional update to ensure we work with the latest types value
        setTypes((prevTypes) => {
          const uniqueRaceTypes = new Set<string>();
          
          // First, collect all race types from saved results
          const savedRaceTypes = new Set<string>();
          divisionResults.forEach((result: any) => {
            if (result.raceName) {
              // Use the saved raceName directly
              let raceName = result.raceName;
              
              // Skip invalid race name patterns (e.g., "Qualification (qualification)", "Heat (heat)", "Final (final)")
              const invalidPattern = /^(\w+)\s*\((\1)\)$/i;
              if (invalidPattern.test(raceName)) {
                // Skip invalid names like "Qualification (qualification)"
                return;
              }
              
              // Handle both old format "(qualification)" and new format "- qualification"
              // Convert old format to new format if needed
              const oldFormatMatch = raceName.match(/^(.+)\s*\((\w+)\)$/);
              if (oldFormatMatch) {
                const capitalizedRaceType = oldFormatMatch[2].charAt(0).toUpperCase() + oldFormatMatch[2].slice(1);
                raceName = `${oldFormatMatch[1]} - ${capitalizedRaceType}`;
              } else {
                // Capitalize race type in new format "Name - type"
                const newFormatMatch = raceName.match(/^(.+)\s*-\s*(\w+)$/);
                if (newFormatMatch) {
                  const capitalizedRaceType = newFormatMatch[2].charAt(0).toUpperCase() + newFormatMatch[2].slice(1);
                  raceName = `${newFormatMatch[1]} - ${capitalizedRaceType}`;
                }
              }
              
              savedRaceTypes.add(raceName);
              uniqueRaceTypes.add(raceName);
            }
            // Removed fallback logic that creates invalid names like "Qualification - Qualification"
            // Only use raceName if it exists - skip results without valid raceName
          });
          
          // Only preserve manually added types that DON'T exist in saved results
          // This prevents duplicates when saving and reloading
          prevTypes.forEach(type => {
            if (!savedRaceTypes.has(type)) {
              uniqueRaceTypes.add(type);
            }
          });
          
          // Return merged types (saved + manually added that aren't saved yet)
          const mergedTypes = Array.from(uniqueRaceTypes);
          
          // Only update if types have actually changed to avoid unnecessary re-renders
          const currentTypesSet = new Set(prevTypes);
          const hasChanged = mergedTypes.length !== currentTypesSet.size || 
                            mergedTypes.some(t => !currentTypesSet.has(t)) ||
                            prevTypes.some(t => !uniqueRaceTypes.has(t));
          
          if (hasChanged) {
            return mergedTypes;
          }
          return prevTypes; // No change, return previous value
        });
        
        // Calculate existing types for selection logic
        const uniqueRaceTypesForSelection = new Set<string>();
        types.forEach(type => uniqueRaceTypesForSelection.add(type));
        divisionResults.forEach((result: any) => {
          // Only use raceName if it exists and is not empty
          // Skip fallback logic that creates invalid names like "Qualification (qualification)"
          if (result.raceName && result.raceName.trim() !== '') {
            let raceName = result.raceName;
            // Clean up invalid race name patterns (e.g., "Qualification (qualification)", "Heat (heat)", "Final (final)")
            const invalidPattern = /^(\w+)\s*\((\1)\)$/i;
            if (invalidPattern.test(raceName)) {
              // Skip invalid names like "Qualification (qualification)"
              return;
            }
            if (!uniqueRaceTypesForSelection.has(raceName)) {
              uniqueRaceTypesForSelection.add(raceName);
            }
          }
        });
        const existingTypes = Array.from(uniqueRaceTypesForSelection);
        
        // Auto-select the first type if none is selected
        if (!selectedType || !existingTypes.includes(selectedType)) {
          // If we have manually added types, prefer keeping the last selected one
          // Otherwise select the first one
          setSelectedType(existingTypes[existingTypes.length - 1] || existingTypes[0] || null);
        }
        
        // Only update driver results if we should load them (not when user is typing)
        // Use the first type if selectedType is null (it will be set above)
        const typeToUse = selectedType || existingTypes[0];
        if (shouldLoadResultsRef.current && typeToUse) {
          // Extract race type from selectedType
          // Handle new format: "Race Name - Qualification" -> "qualification"
          // Handle old format: "Race Name (qualification)" -> "qualification"
          let typeRaceType: string | null = null;
          
          // Try new format first (e.g., "Name - Type")
          const newFormatMatch = typeToUse.match(/-\s*(\w+)$/);
          if (newFormatMatch) {
            typeRaceType = newFormatMatch[1].toLowerCase();
          } else {
            // Try old format (e.g., "Name (type)")
            const oldFormatMatch = typeToUse.match(/\((\w+)\)$/);
            if (oldFormatMatch) {
              typeRaceType = oldFormatMatch[1].toLowerCase();
            }
          }
          
          // Try to find resultsSheetId from the first matching result in the selected division
          let sheetId: string | null = null;
          const matchingResult = divisionResults.find((r: any) => {
            if (typeRaceType) {
              return r.raceType?.toLowerCase() === typeRaceType;
            }
            return r.raceName === typeToUse;
          });
          
          if (matchingResult && matchingResult.resultsSheetId) {
            sheetId = matchingResult.resultsSheetId;
          }
          
          // If we have a resultsSheetId, fetch all results for that sheet but filter by selectedDivision
          if (sheetId) {
            console.log('Loading results by resultsSheetId:', sheetId);
            const loadSheetResults = async () => {
              const sheetResults = await fetchRaceResults(selectedEvent.id, sheetId!);
              
              // Flatten results from the selected division only
              // Handle "Open" division - if selectedDivision is one of openDivisions, also check for "Open" race_division
              const allSheetResults: any[] = [];
              sheetResults.forEach((divisionResult: any) => {
                // Check if this division result matches the selected division
                const matchesDivision = divisionResult.division === selectedDivision;
                // Also check if selectedDivision is an open division and race_division is "Open"
                const matchesOpen = isOpenDivision(selectedDivision) && divisionResult.division === 'Open';
                
                if (divisionResult.results && (matchesDivision || matchesOpen)) {
                  allSheetResults.push(...divisionResult.results);
                }
              });
              
              // Filter by selectedType (results are already filtered by selectedDivision)
              const filteredResults = filterDivisionResultsBySelection(allSheetResults, typeToUse);
              // Sort results based on race type
              const sortedResults = sortRaceResults(filteredResults, typeToUse);
              setDriverResults(sortedResults.length > 0 ? [...sortedResults] : []);
              shouldLoadResultsRef.current = false;
            };
            
            loadSheetResults();
          } else {
            // Fallback to division-based filtering
            if (typeRaceType) {
              const filteredResults = divisionResults.filter((r: any) => {
                // Compare raceType in lowercase for case-insensitive matching
                return r.raceType?.toLowerCase() === typeRaceType;
              });
              // Sort results based on race type
              const sortedResults = sortRaceResults(filteredResults, typeToUse);
              setDriverResults([...sortedResults]);
            } else {
              // If no race type match, try to match by exact raceName
              const filteredResults = divisionResults.filter((r: any) => {
                // Normalize raceName formats for comparison
                let normalizedRaceName = r.raceName || '';
                
                // Convert old format to new format for comparison
                const oldFormatMatch = normalizedRaceName.match(/^(.+)\s*\((\w+)\)$/);
                if (oldFormatMatch) {
                  const capitalizedRaceType = oldFormatMatch[2].charAt(0).toUpperCase() + oldFormatMatch[2].slice(1);
                  normalizedRaceName = `${oldFormatMatch[1]} - ${capitalizedRaceType}`;
                }
                
                return normalizedRaceName === typeToUse;
              });
              // Sort results based on race type
              const sortedResults = sortRaceResults(filteredResults, typeToUse);
              setDriverResults([...sortedResults]);
            }
            shouldLoadResultsRef.current = false; // Don't auto-load again until type/division changes
          }
        } else if (shouldLoadResultsRef.current && !typeToUse) {
          // If no type selected, show empty
          setDriverResults([]);
          shouldLoadResultsRef.current = false;
        }
      } else {
        // No results for this division
        if (shouldLoadResultsRef.current) {
          setDriverResults([]);
        }
        // Only clear types if there are no manually added types and no saved results
        // This preserves manually added race names even when there are no saved results yet
        if (types.length === 0) {
          setTypes([]);
          setSelectedType(null);
        }
        // If types exist (manually added), keep them even if there are no saved results
      }
    }
  }, [selectedEvent, selectedDivision, selectedType]);
  
  // Reset the load flag when division or type changes
  useEffect(() => {
    shouldLoadResultsRef.current = true;
  }, [selectedDivision, selectedType]);

  // Available divisions - combining Division 3, 4, and New into "Open" for race management
  const availableDivisions: (Division | 'Open')[] = ['Division 1', 'Division 2', 'Open'];
  const openDivisions: Division[] = ['Division 3', 'Division 4', 'New'];
  
  // Helper to check if a division is an open division
  const isOpenDivision = (div: Division | null): boolean => {
    return div ? openDivisions.includes(div) : false;
  };
  
  // Get unique driver counts per division for selected event
  const divisionDriverCounts = useMemo<Record<Division, number>>(() => {
    if (!selectedEvent) return {
      'Division 1': 0,
      'Division 2': 0,
      'Division 3': 0,
      'Division 4': 0,
      'New': 0,
    };
    const uniqueDrivers: Record<Division, Set<string>> = {
      'Division 1': new Set(),
      'Division 2': new Set(),
      'Division 3': new Set(),
      'Division 4': new Set(),
      'New': new Set(),
    };
    
    // Count unique drivers per division
    selectedEvent.results?.forEach((divisionResult) => {
      const division = divisionResult.division;
      if (division in uniqueDrivers && divisionResult.results) {
        divisionResult.results.forEach((result: any) => {
          // Only count valid driver IDs (not temporary ones)
          if (result.driverId && !result.driverId.startsWith('temp-')) {
            uniqueDrivers[division as Division].add(result.driverId);
          }
        });
      }
    });
    
    // Convert sets to counts
    const counts: Record<Division, number> = {
      'Division 1': uniqueDrivers['Division 1'].size,
      'Division 2': uniqueDrivers['Division 2'].size,
      'Division 3': uniqueDrivers['Division 3'].size,
      'Division 4': uniqueDrivers['Division 4'].size,
      'New': uniqueDrivers['New'].size,
    };
    
    return counts;
  }, [selectedEvent]);

  const handleAddDivision = () => {
    if (!selectedEvent) return;
    const newDivision: Division = 'New';
    setSelectedDivision(newDivision);
    setSelectedUIDivision('Open'); // New is part of Open
    setSelectedType(null);
    setDriverResults([]);
  };

  const handleAddType = () => {
    setIsTypeModalOpen(true);
  };

  const handleTypeModalSubmit = () => {
    if (selectedRaceType) {
      let raceName = '';
      const capitalizedRaceType = selectedRaceType.charAt(0).toUpperCase() + selectedRaceType.slice(1);
      
      if (selectedRaceType === 'qualification') {
        // Format: "Qual Group 1"
        raceName = `${capitalizedRaceType === 'Qualification' ? 'Qual' : capitalizedRaceType} Group ${selectedGroup}`;
      } else if (selectedRaceType === 'heat') {
        // Format: "Heat A"
        raceName = `${capitalizedRaceType} ${selectedFinalType}`;
      } else if (selectedRaceType === 'final') {
        // Format: "Final A"
        raceName = `${capitalizedRaceType} ${selectedFinalType}`;
      }
      
      // Use functional update to ensure we're working with the latest types value
      setTypes((prevTypes) => {
        // Check if this race name already exists
        if (prevTypes.includes(raceName)) {
          return prevTypes; // Don't add duplicates
        }
        return [...prevTypes, raceName];
      });
      setSelectedType(raceName);
      setSelectedRaceType('final');
      setSelectedFinalType('A');
      setSelectedGroup('1');
      setIsTypeModalOpen(false);
      // Reset the load flag so empty spreadsheet will be shown
      shouldLoadResultsRef.current = true;
    }
  };

  const handleTypeModalCancel = () => {
    setSelectedRaceType('final');
    setSelectedFinalType('A');
    setSelectedGroup('1');
    setIsTypeModalOpen(false);
  };

  const handleDeleteType = async (typeName: string) => {
    if (!confirm(`Are you sure you want to delete the race name "${typeName}"? This will also delete all race results for this race type.`)) {
      return;
    }
    
    if (!selectedEvent) return;
    
    // Extract race type from typeName
    // New format: "Qual Group 1", "Heat A", "Final A"
    // Old format: "Race Name - qualification"
    let raceType: string | null = null;
    const upperType = typeName.toUpperCase();
    
    // Check for new format (no hyphen)
    if (upperType.startsWith('QUAL')) {
      raceType = 'qualification';
    } else if (upperType.startsWith('HEAT')) {
      raceType = 'heat';
    } else if (upperType.startsWith('FINAL')) {
      raceType = 'final';
    } else {
      // Fallback to old format with hyphen (e.g., "Race Name - Qualification" -> "qualification")
      const match = typeName.match(/-?\s*(\w+)$/);
      if (match) {
        const typeStr = match[1].toLowerCase();
        if (typeStr.includes('qual')) {
          raceType = 'qualification';
        } else if (typeStr.includes('heat')) {
          raceType = 'heat';
        } else if (typeStr.includes('final')) {
          raceType = 'final';
        }
      }
    }
    
    if (raceType && selectedEvent) {
      try {
        // Delete race results from Google Sheets
        const response = await fetch(`/api/race-results?roundId=${selectedEvent.id}&raceType=${raceType}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete race results from Google Sheets');
        }
      } catch (error) {
        console.error('Error deleting race results:', error);
        alert('Failed to delete race results from Google Sheets. Please try again.');
        return;
      }
    }
    
    // Update UI immediately: remove from types list
    const updatedTypes = types.filter((t) => t !== typeName);
    setTypes(updatedTypes);
    
    // Clear selected type if it was the deleted one
    if (selectedType === typeName) {
      setSelectedType(null);
      setDriverResults([]);
    }
    
    // Refresh race results for the selected event
    if (selectedEvent) {
      const refreshedResults = await fetchRaceResults(selectedEvent.id);
      setSelectedEvent({ ...selectedEvent, results: refreshedResults });
      
      // Force re-extraction of types from refreshed results
      // This ensures the UI is in sync with the database
      if (selectedDivision) {
        // Handle "Open" division - if selectedDivision is one of openDivisions, also check for "Open" race_division
        let refreshedDivisionResult = refreshedResults.find((r: any) => r.division === selectedDivision);
        if (!refreshedDivisionResult && isOpenDivision(selectedDivision)) {
          refreshedDivisionResult = refreshedResults.find((r: any) => r.division === 'Open');
        }
        if (refreshedDivisionResult && refreshedDivisionResult.results) {
          const divisionResults = refreshedDivisionResult.results || [];
          const uniqueRaceTypes = new Set<string>();
          
          // Collect race names from refreshed results
          divisionResults.forEach((result: any) => {
            if (result.raceName && result.raceName.trim() !== '') {
              let raceName = result.raceName;
              // Skip invalid race name patterns
              const invalidPattern = /^(\w+)\s*\((\1)\)$/i;
              if (invalidPattern.test(raceName)) {
                return;
              }
              uniqueRaceTypes.add(raceName);
            }
          });
          
          // Update types list with fresh data from database
          const freshTypes = Array.from(uniqueRaceTypes);
          setTypes(freshTypes);
          
          // Auto-select a type if none is selected and types are available
          if (!selectedType && freshTypes.length > 0) {
            setSelectedType(freshTypes[0]);
          }
        } else {
          // No results for this division, clear types
          setTypes([]);
        }
      }
    }
  };

  const handleUpdateDriverResult = (index: number, field: keyof DriverRaceResult, value: string | number, forceAddRow = false) => {
    setDriverResults((prev) => {
      let updated = [...prev];
      const currentDivision = selectedDivision || 'Division 1';
      
      // Ensure the array is large enough
      while (updated.length <= index) {
        const existingRow = prev[updated.length] || {};
        updated.push({
          driverId: existingRow.driverId || `temp-${Date.now()}-${updated.length}`,
          driverAlias: existingRow.driverAlias || '',
          driverName: existingRow.driverName || '',
          division: existingRow.division || currentDivision,
          kartNumber: existingRow.kartNumber || '',
          gridPosition: existingRow.gridPosition !== undefined ? existingRow.gridPosition : (updated.length + 1),
          position: existingRow.position !== undefined ? existingRow.position : (updated.length + 1),
          overallPosition: existingRow.overallPosition !== undefined ? existingRow.overallPosition : (updated.length + 1),
          fastestLap: existingRow.fastestLap || '',
          points: existingRow.points || 0,
        });
      }
      
      // Update the specific field - preserve existing values for gridPosition and overallPosition
      const existingRow = updated[index];
      updated[index] = { 
        ...existingRow, 
        [field]: value,
        // Preserve gridPosition and overallPosition unless explicitly being updated
        gridPosition: field === 'gridPosition' ? (typeof value === 'number' ? value : existingRow.gridPosition) : existingRow.gridPosition,
        overallPosition: field === 'overallPosition' ? (typeof value === 'number' ? value : existingRow.overallPosition) : existingRow.overallPosition,
      };
      
      // Auto-add new row if editing the last row and it has data, or if forceAddRow is true
      const isLastRow = index === updated.length - 1;
      const hasData = value && (value.toString().trim().length > 0);
      
      if (isLastRow && (hasData || forceAddRow)) {
        const newResult: DriverRaceResult = {
          driverId: `temp-${Date.now()}-${updated.length}`,
          driverAlias: '',
          driverName: '',
          division: currentDivision,
          kartNumber: '',
          gridPosition: updated.length + 1,
          position: updated.length + 1,
          overallPosition: updated.length + 1,
          fastestLap: '',
          points: 0,
        };
        updated.push(newResult);
      }
      
      return updated;
    });
  };
  
  // Handle delete row
  const handleDeleteRow = async (index: number) => {
    if (!selectedEvent || !selectedDivision || !selectedType) return;
    
    const rowToDelete = driverResults[index];
    if (!rowToDelete) return;
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this row?')) {
      return;
    }
    
    // If this is a saved result (has a real driverId), delete from database
    if (rowToDelete.driverId && !rowToDelete.driverId.startsWith('temp-')) {
      try {
        const { raceType, finalType } = parseRaceSelection(selectedType);
        const deleteParams = new URLSearchParams({
          roundId: selectedEvent.id,
          driverId: rowToDelete.driverId,
        });
        if (raceType) deleteParams.set('raceType', raceType);
        if (finalType) deleteParams.set('finalType', finalType);
        
        const response = await fetch(`/api/race-results?${deleteParams.toString()}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete race result');
        }
      } catch (error) {
        console.error('Error deleting race result:', error);
        alert('Failed to delete race result. Please try again.');
        return;
      }
    }
    
    // Remove from local state - preserve gridPosition and overallPosition for other rows
    setDriverResults((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      const currentDivision = selectedDivision || 'Division 1';
      // Ensure at least 3 rows remain for editing
      while (updated.length < 3) {
        updated.push({
          driverId: `temp-${Date.now()}-${updated.length}`,
          driverAlias: '',
          driverName: '',
          division: currentDivision,
          kartNumber: '',
          gridPosition: updated.length + 1,
          position: updated.length + 1,
          overallPosition: updated.length + 1,
          fastestLap: '',
          points: 0,
        });
      }
      return updated;
    });
    
    // Refresh race results but prevent useEffect from reloading and clearing the table
    if (selectedEvent) {
      // Set the flag to false BEFORE refreshing to prevent useEffect from reloading results
      // This ensures the local state changes (row deletion) are preserved
      shouldLoadResultsRef.current = false;
      
      try {
        const refreshedResults = await fetchRaceResults(selectedEvent.id);
        // Only update the event results, don't let useEffect reload driverResults
        setSelectedEvent((prevEvent) => {
          if (!prevEvent) return prevEvent;
          return { ...prevEvent, results: refreshedResults };
        });
      } catch (error) {
        console.error('Error refreshing race results after delete:', error);
        // Don't show error to user, local state is already updated
      }
    }
  };
  
  // Batch update function for multiple fields at once
  const handleBatchUpdateDriverResult = (index: number, updates: Partial<DriverRaceResult>, forceAddRow = false) => {
    setDriverResults((prev) => {
      let updated = [...prev];
      const currentDivision = selectedDivision || 'Division 1';
      
      // Ensure the array is large enough
      while (updated.length <= index) {
        const existingRow = prev[updated.length] || {};
        updated.push({
          driverId: existingRow.driverId || `temp-${Date.now()}-${updated.length}`,
          driverAlias: existingRow.driverAlias || '',
          driverName: existingRow.driverName || '',
          division: existingRow.division || currentDivision,
          kartNumber: existingRow.kartNumber || '',
          gridPosition: existingRow.gridPosition !== undefined ? existingRow.gridPosition : (updated.length + 1),
          position: existingRow.position !== undefined ? existingRow.position : (updated.length + 1),
          overallPosition: existingRow.overallPosition !== undefined ? existingRow.overallPosition : (updated.length + 1),
          fastestLap: existingRow.fastestLap || '',
          points: existingRow.points || 0,
        });
      }
      
      // Update all fields at once - preserve existing gridPosition and overallPosition unless explicitly updated
      const existingRow = updated[index];
      updated[index] = { 
        ...existingRow, 
        ...updates,
        // Only update gridPosition/overallPosition if explicitly provided in updates
        gridPosition: updates.gridPosition !== undefined ? updates.gridPosition : existingRow.gridPosition,
        overallPosition: updates.overallPosition !== undefined ? updates.overallPosition : existingRow.overallPosition,
      };
      
      // Auto-add new row if editing the last row and it has data, or if forceAddRow is true
      const isLastRow = index === updated.length - 1;
      const hasData = Object.values(updates).some(v => v && v.toString().trim().length > 0);
      
      if (isLastRow && (hasData || forceAddRow)) {
        const newResult: DriverRaceResult = {
          driverId: `temp-${Date.now()}-${updated.length}`,
          driverAlias: '',
          driverName: '',
          division: currentDivision,
          kartNumber: '',
          gridPosition: updated.length + 1,
          position: updated.length + 1,
          overallPosition: updated.length + 1,
          fastestLap: '',
          points: 0,
        };
        updated.push(newResult);
      }
      
      return updated;
    });
  };

  const getDivisionResults = () => {
    if (!selectedEvent || !selectedDivision) return [];
    // Handle "Open" division - if selectedDivision is one of openDivisions, also check for "Open" race_division
    let divisionResult = selectedEvent.results?.find((r) => r.division === selectedDivision);
    if (!divisionResult && isOpenDivision(selectedDivision)) {
      // Check for "Open" race_division (cast to any to handle "Open" as a valid race_division value)
      divisionResult = selectedEvent.results?.find((r: any) => r.division === 'Open');
    }
    return divisionResult?.results || [];
  };

  const handleSave = async () => {
    if (!selectedEvent || !selectedDivision) {
      alert('Please select an event and division before saving.');
      return;
    }
    
    // Filter out empty rows (rows with no driver name or alias)
    const validResults = driverResults.filter(
      (result) => (result.driverName?.trim() || result.driverAlias?.trim())
    );
    
    if (validResults.length === 0) {
      alert('No valid results to save. Please add at least one driver result.');
      return;
    }
    
    try {
      // Extract raceType and finalType from selectedType
      // New format: "Qual Group 1", "Heat A", "Final A"
      // Old format: "Race Name - Type"
      if (!selectedType) {
        alert('Please select a race type before saving.');
        return;
      }
      
      let raceType = 'qualification';
      let finalType = '';
      const upperType = selectedType.toUpperCase();
      
      // Check for new format (no hyphen)
      if (upperType.startsWith('QUAL')) {
        raceType = 'qualification';
        // Extract group number for qual (e.g., "Qual Group 1" -> group is "1")
        // Store group number in finalType for qualification races
        const groupMatch = selectedType.match(/Group\s+(\d+)/i);
        if (groupMatch) {
          finalType = groupMatch[1]; // Store group number in finalType
        }
      } else if (upperType.startsWith('HEAT')) {
        raceType = 'heat';
        // Extract final type letter (e.g., "Heat A" -> "A")
        const letterMatch = selectedType.match(/\s+([A-F])$/i);
        if (letterMatch) {
          finalType = letterMatch[1].toUpperCase();
        }
      } else if (upperType.startsWith('FINAL')) {
        raceType = 'final';
        // Extract final type letter (e.g., "Final A" -> "A")
        const letterMatch = selectedType.match(/\s+([A-F])$/i);
        if (letterMatch) {
          finalType = letterMatch[1].toUpperCase();
        }
      } else {
        // Fallback to old format with hyphen (e.g., "Race Name - Qualification" -> "qualification")
        const match = selectedType.match(/-?\s*(\w+)$/);
        if (match) {
          const typeStr = match[1].toLowerCase();
          if (typeStr.includes('qual')) {
            raceType = 'qualification';
          } else if (typeStr.includes('heat')) {
            raceType = 'heat';
          } else if (typeStr.includes('final')) {
            raceType = 'final';
          }
        }
      }
      
      // Determine if there's a heat race (check if there are multiple race types for this round)
      const hasHeatRace = types.length > 1 || raceType === 'heat';
      
      // VALIDATION: Check for duplicate drivers in the same race
      const driverIds = new Set<string>();
      const duplicateDrivers: string[] = [];
      
      for (const result of validResults) {
        // Try to find driver by name or aliases
        const driver = drivers.find(
          (d) =>
            d.name?.toLowerCase() === result.driverName?.toLowerCase().trim() ||
            d.name?.toLowerCase() === result.driverAlias?.toLowerCase().trim() ||
            `${d.firstName} ${d.lastName}`.toLowerCase().trim() === result.driverName?.toLowerCase().trim() ||
            d.firstName?.toLowerCase() === result.driverName?.toLowerCase().trim() ||
            d.lastName?.toLowerCase() === result.driverName?.toLowerCase().trim() ||
            d.aliases?.some((a: string) => a.toLowerCase() === result.driverAlias?.toLowerCase().trim()) ||
            d.aliases?.some((a: string) => a.toLowerCase() === result.driverName?.toLowerCase().trim())
        );
        
        if (driver) {
          if (driverIds.has(driver.id)) {
            duplicateDrivers.push(driver.name || result.driverName || result.driverAlias || 'Unknown');
          } else {
            driverIds.add(driver.id);
          }
        }
      }
      
      if (duplicateDrivers.length > 0) {
        alert(`Cannot save: The following drivers are registered twice in this race:\n${duplicateDrivers.join(', ')}\n\nPlease remove duplicates before saving.`);
        return;
      }
      
      // Find driver IDs from names/aliases and calculate points
      const resultsToSave = await Promise.all(
        validResults.map(async (result) => {
          // Try to find driver by name or aliases - VALIDATION: must exist
          let driverId = result.driverId;
          let driver = null;
          
          if (!driverId || driverId.startsWith('temp-')) {
            driver = drivers.find(
              (d) =>
                d.name?.toLowerCase() === result.driverName?.toLowerCase().trim() ||
                d.name?.toLowerCase() === result.driverAlias?.toLowerCase().trim() ||
                `${d.firstName} ${d.lastName}`.toLowerCase().trim() === result.driverName?.toLowerCase().trim() ||
                d.firstName?.toLowerCase() === result.driverName?.toLowerCase().trim() ||
                d.lastName?.toLowerCase() === result.driverName?.toLowerCase().trim() ||
                d.aliases?.some((a: string) => a.toLowerCase() === result.driverAlias?.toLowerCase().trim()) ||
                d.aliases?.some((a: string) => a.toLowerCase() === result.driverName?.toLowerCase().trim())
            );
            
            if (driver) {
              driverId = driver.id;
            } else {
              // Driver not found - throw error to prevent saving
              throw new Error(`Driver not found: ${result.driverName || result.driverAlias}. Please use an existing driver name.`);
            }
          } else {
            driver = drivers.find(d => d.id === driverId);
          }
          
          // If driver found, autofill name/alias
          if (driver) {
            if (result.driverName && !result.driverAlias && driver.name !== result.driverName) {
              // If name matches but we have aliases in driver, use first alias
              result.driverAlias = driver.aliases && driver.aliases.length > 0 ? driver.aliases[0] : driver.name;
            } else if (result.driverAlias && !result.driverName) {
              // If alias provided, use driver name
              result.driverName = driver.name;
            }
          }
          
          // Points are calculated dynamically in results tab, not stored
          // Qualification races don't have gridPosition or overallPosition
          // Only set these for heat and final races
          const isQualification = raceType === 'qualification';
          
          // For qualification races, use 0 for gridPosition and overallPosition
          // For heat/final races, use the actual values or 0 as fallback
          const gridPosition = isQualification ? 0 : (result.gridPosition || result.position || 0);
          const overallPosition = isQualification ? 0 : (result.overallPosition || result.gridPosition || result.position || 0);
          
          // For qualification races, position might be calculated from fastest lap later
          // For now, use 0 or the existing position if available
          const position = isQualification ? (result.position || 0) : (result.overallPosition || result.gridPosition || result.position || 0);
          
          // Ensure kartNumber is explicitly included (handle null/undefined)
          const kartNumber = result.kartNumber != null ? String(result.kartNumber).trim() : '';
          
          // Determine race_division (UI division clicked) and results_sheet_id
          const uiDivision = selectedUIDivision || selectedDivision || 'Division 1';
          // race_division is the UI division that was clicked (Open/Division 1/Division 2)
          const raceDivision = isOpenDivision(selectedDivision) ? 'Open' : uiDivision;
          // Include seasonId, roundId, and race_division in results_sheet_id for uniqueness
          // Remove all spaces and hyphens to make it one continuous string
          const seasonId = (selectedSeason?.id || '').replace(/\s+/g, '');
          const roundId = selectedEvent.id.replace(/\s+/g, '');
          const cleanRaceDivision = raceDivision.replace(/\s+/g, '');
          const cleanRaceType = raceType.replace(/\s+/g, '');
          const cleanFinalType = (finalType || '').replace(/\s+/g, '');
          const resultsSheetId = `${seasonId}${roundId}${cleanRaceDivision}${cleanRaceType}${cleanFinalType}`;
          
          // Use the row's division field if set, otherwise use the driver's division from the driver record
          // This allows users to override the division per row
          const rowDivision = result.division && result.division.trim() 
            ? result.division 
            : (driver?.division || selectedDivision);
          
          return {
            roundId: selectedEvent.id,
            driverId: driverId,
            driverAlias: result.driverAlias || '',
            division: rowDivision as Division, // Use row's division or driver's division, not selectedDivision
            kartNumber: kartNumber,
            position: position, // Include position for compatibility
            gridPosition: gridPosition,
            overallPosition: overallPosition,
            fastestLap: result.fastestLap || '',
            raceType: raceType,
            raceName: selectedType, // Save the full race name (e.g., "Qual Group 1", "Heat A", "Final A")
            finalType: finalType, // Save the group number (1-6) for Qualification races, or final type (A-F) for Heat and Final races
            raceDivision: raceDivision, // UI division (Open/Division 1/Division 2) - the division the race was run in
            resultsSheetId: resultsSheetId, // Format: seasonId-roundId-raceDivision-raceType-finalType
          };
        })
      );
      
      // Save each result to the API - use PUT if result already exists, POST if new
      const savePromises = resultsToSave.map(async (result) => {
        // Check if this result already exists in the saved results from the event
        // We need to check by roundId, driverId, division, and raceType
        let existingResult = null;
        if (selectedEvent?.results) {
          // Handle "Open" division - if selectedDivision is one of openDivisions, also check for "Open" race_division
          let divisionResult = selectedEvent.results.find((r: any) => r.division === selectedDivision);
          if (!divisionResult && isOpenDivision(selectedDivision)) {
            divisionResult = selectedEvent.results.find((r: any) => r.division === 'Open');
          }
          if (divisionResult && divisionResult.results) {
            existingResult = divisionResult.results.find((r: any) => 
              r.driverId === result.driverId && 
              r.raceType === result.raceType &&
              (r.finalType || '') === (result.finalType || '')
            );
          }
        }
        
        if (existingResult && result.driverId && !result.driverId.startsWith('temp-')) {
          // Update existing result - include raceType and finalType in URL for proper matching
          const url = new URL(`/api/race-results?roundId=${result.roundId}&driverId=${result.driverId}`, window.location.origin);
          if (result.raceType) url.searchParams.set('raceType', result.raceType);
          if (result.finalType) url.searchParams.set('finalType', result.finalType);
          
          return fetch(url.toString(), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result),
          });
        } else {
          // Create new result
          return fetch('/api/race-results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result),
          });
        }
      });
      
      const responses = await Promise.all(savePromises);
      const failed = responses.filter((r) => !r.ok);
      
      if (failed.length > 0) {
        alert(`Failed to save ${failed.length} result(s). Please try again.`);
      } else {
        alert(`Successfully saved ${resultsToSave.length} driver result(s)!`);
        
        // Refresh race results for the selected event using the resultsSheetId
        if (selectedEvent && selectedType && selectedDivision) {
          // Generate the same resultsSheetId that was used during save
          const uiDivision = selectedUIDivision || selectedDivision || 'Division 1';
          const raceDivision = isOpenDivision(selectedDivision) ? 'Open' : uiDivision;
          const seasonId = (selectedSeason?.id || '').replace(/\s+/g, '');
          const roundId = selectedEvent.id.replace(/\s+/g, '');
          const cleanRaceDivision = raceDivision.replace(/\s+/g, '');
          const cleanRaceType = raceType.replace(/\s+/g, '');
          const cleanFinalType = (finalType || '').replace(/\s+/g, '');
          const resultsSheetId = `${seasonId}${roundId}${cleanRaceDivision}${cleanRaceType}${cleanFinalType}`;
          
          console.log('Reloading results by resultsSheetId after save:', resultsSheetId, 'raceType:', raceType, 'finalType:', finalType, 'raceDivision:', raceDivision);
          
          // Fetch results using the resultsSheetId - this will return only results with this specific sheet ID
          const sheetResults = await fetchRaceResults(selectedEvent.id, resultsSheetId);
          
          // Also fetch all results for the event to update the full event results
          const allEventResults = await fetchRaceResults(selectedEvent.id);
          setSelectedEvent({ ...selectedEvent, results: allEventResults });
          
          // Extract race types from all event results and populate types array
          if (selectedDivision) {
            // Handle "Open" division - if selectedDivision is one of openDivisions, also check for "Open" race_division
            let divisionResult = allEventResults.find((r: any) => r.division === selectedDivision);
            if (!divisionResult && isOpenDivision(selectedDivision)) {
              divisionResult = allEventResults.find((r: any) => r.division === 'Open');
            }
            if (divisionResult && divisionResult.results) {
              // Get unique race types from results
              const uniqueRaceTypes = new Set<string>();
              
              // First, preserve existing types that are in the types array
              types.forEach(type => uniqueRaceTypes.add(type));
              
              // Then, add race types from saved results
              divisionResult.results.forEach((result: any) => {
                // Only use raceName if it exists and is not empty
                if (result.raceName && result.raceName.trim() !== '') {
                  let raceName = result.raceName;
                  // Clean up invalid race name patterns
                  const invalidPattern = /^(\w+)\s*\((\1)\)$/i;
                  if (invalidPattern.test(raceName)) {
                    return;
                  }
                  if (!uniqueRaceTypes.has(raceName)) {
                    uniqueRaceTypes.add(raceName);
                  }
                }
              });
              
              // Update types array with unique race types found in results
              const existingTypes = Array.from(uniqueRaceTypes);
              setTypes(existingTypes);
              
              // Keep the current selectedType
              if (selectedType && existingTypes.includes(selectedType)) {
                // Keep the current selection
              } else if (existingTypes.length > 0) {
                setSelectedType(existingTypes[0]);
              }
            }
            
            // Load results from the specific resultsSheetId
            // Since we fetched by resultsSheetId at the database level, all results should already match
            const allSheetResults: any[] = [];
            sheetResults.forEach((divisionResult: any) => {
              // Include all results from the sheet - they all match the resultsSheetId we queried for
              // Check if this division result matches the race_division or selected division
              const matchesRaceDivision = divisionResult.division === raceDivision;
              const matchesSelectedDivision = divisionResult.division === selectedDivision;
              const matchesOpen = isOpenDivision(selectedDivision) && (divisionResult.division === 'Open' || divisionResult.division === raceDivision);
              
              if (divisionResult.results && (matchesRaceDivision || matchesSelectedDivision || matchesOpen)) {
                allSheetResults.push(...divisionResult.results);
              }
            });
            
            // Since we fetched by resultsSheetId, all results should already match that ID
            // Just verify they have the correct resultsSheetId, raceType, finalType, and raceDivision
            let filteredResults = allSheetResults.filter((r: any) => {
              // Primary filter: must match resultsSheetId (database already filtered by this)
              if (r.resultsSheetId !== resultsSheetId) return false;
              
              // Secondary filters: verify raceType, finalType, and raceDivision match
              const matchesRaceType = r.raceType?.toLowerCase() === raceType.toLowerCase();
              const matchesFinalType = (r.finalType || '') === (finalType || '');
              const matchesRaceDivision = r.raceDivision === raceDivision || r.raceDivision === selectedDivision || 
                                         (isOpenDivision(selectedDivision) && r.raceDivision === 'Open');
              
              return matchesRaceType && matchesFinalType && matchesRaceDivision;
            });
            
            // If no results with strict matching, just use all results from the sheet (they all match resultsSheetId)
            if (filteredResults.length === 0) {
              filteredResults = allSheetResults;
            }
            
            console.log('Loaded results after save:', {
              resultsSheetId,
              raceType,
              finalType,
              raceDivision,
              selectedDivision,
              totalSheetResults: allSheetResults.length,
              filteredResults: filteredResults.length,
              sheetResultsDivisions: sheetResults.map((r: any) => r.division),
              sampleResult: filteredResults[0]
            });
            
            // Sort results based on race type before setting
            const sortedResults = sortRaceResults(filteredResults, selectedType);
            setDriverResults([...sortedResults]);
            // Prevent the useEffect from reloading results
            shouldLoadResultsRef.current = false;
          }
        }
      }
    } catch (error: any) {
      console.error('Error saving results:', error);
      alert(error.message || 'Failed to save results. Please try again.');
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
                <p className="text-slate-600 dark:text-slate-400">Loading rounds...</p>
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
        title="Races Management"
        subtitle="Manage race events and enter race results"
        icon={Flag}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Panel 1: Event */}
          <SectionCard
            title="Events"
            icon={Calendar}
            className="lg:col-span-4 max-h-[300px] flex flex-col"
            noPadding
          >
            <div className="overflow-y-auto p-2 flex-1 min-h-0">
              {races.length > 0 ? (
                <div className="space-y-1">
                  {races.map((race) => (
                    <button
                      key={race.id}
                      onClick={async () => {
                        // Fetch race results for this round
                        const results = await fetchRaceResults(race.id);
                        setSelectedEvent({ ...race, results });
                        setSelectedDivision('Division 1');
                        setSelectedUIDivision('Division 1');
                        setSelectedType(null);
                        setDriverResults([]);
                        // Reset the load flag so types will be loaded from results
                        shouldLoadResultsRef.current = true;
                        // Don't clear types here - let the useEffect populate them from results
                      }}
                      className={`w-full text-left p-2 rounded-lg transition-colors text-sm ${
                        selectedEvent?.id === race.id
                          ? 'bg-primary-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      <div className="font-medium">{race.name}</div>
                      <div className="text-sm mt-0.5 opacity-75">
                        Round {race.roundNumber || race.round}
                        {race.date && ` • ${new Date(race.date).toLocaleDateString()}`}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                  No rounds available
                </div>
              )}
            </div>
          </SectionCard>

          {/* Panel 2: Division */}
          <SectionCard
            title="Division"
            icon={Users}
            className="lg:col-span-4 flex flex-col"
            noPadding
          >
            <div className="flex flex-col flex-1 min-h-0">
              <div className="p-2">
              {selectedEvent ? (
                <div className="space-y-1">
                  {availableDivisions.map((division) => {
                    // Handle "Open" division by checking results from Division 3, 4, and New
                    let hasResults = false;
                    let racerCount = 0;
                    
                    if (division === 'Open') {
                      // Check if any open divisions have results, or if race_division is "Open"
                      hasResults = selectedEvent.results?.some((r) => 
                        openDivisions.includes(r.division as Division) || r.division === 'Open'
                      ) || false;
                      racerCount = openDivisions.reduce((sum, div) => sum + (divisionDriverCounts[div] || 0), 0);
                    } else {
                      hasResults = selectedEvent.results?.some((r) => r.division === division) || false;
                      racerCount = divisionDriverCounts[division as Division] || 0;
                    }
                    
                    // Check if this division is currently selected
                    const isSelected = division === 'Open' 
                      ? openDivisions.includes(selectedDivision as Division)
                      : selectedDivision === division;
                    
                    return (
                      <button
                        key={division}
                        onClick={() => {
                          if (division === 'Open') {
                            // For "Open", select Division 3 by default (or first available)
                            const firstOpenDiv = openDivisions[0];
                            setSelectedDivision(firstOpenDiv);
                            setSelectedUIDivision('Open'); // Track that user clicked "Open"
                            setSelectedType(null);
                            const divisionResults = selectedEvent.results?.find((r) => r.division === firstOpenDiv)?.results || [];
                            setDriverResults([...divisionResults]);
                            setTypes([]);
                          } else {
                            setSelectedDivision(division as Division);
                            setSelectedUIDivision(division as Division); // Track UI division
                            setSelectedType(null);
                            const divisionResults = selectedEvent.results?.find((r) => r.division === division)?.results || [];
                            setDriverResults([...divisionResults]);
                            setTypes([]);
                          }
                        }}
                        className={`w-full text-left p-2 rounded-lg transition-colors text-sm ${
                          isSelected
                            ? 'bg-primary-500 text-white'
                            : hasResults
                            ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="font-medium">{division}</div>
                        <div className="text-sm mt-0.5 opacity-75">
                          {racerCount} {racerCount === 1 ? 'driver' : 'drivers'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                  Select an event to view races
                </div>
              )}
              </div>
            </div>
          </SectionCard>

          {/* Panel 3: Race Name */}
          <SectionCard
            title="Race Name"
            icon={Trophy}
            actions={
              <button
                onClick={handleAddType}
                className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-md text-xs font-medium"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            }
            className="lg:col-span-4 max-h-[300px] flex flex-col"
            noPadding
          >
            <div className="flex flex-col flex-1 min-h-0">
              <div className="p-2 overflow-y-auto flex-1 min-h-0">
              {selectedEvent && selectedDivision ? (
                <div className="space-y-1">
                  {types.length > 0 ? (
                    sortRaceNames(types).map((type, index) => {
                      const currentType = getRaceType(type);
                      const prevType = index > 0 ? getRaceType(sortRaceNames(types)[index - 1]) : null;
                      const showSeparator = prevType && prevType !== currentType;
                      
                      return (
                        <div key={type}>
                          {showSeparator && (
                            <div className="my-2 border-t border-slate-300 dark:border-slate-600" />
                          )}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedType(type);
                              // Reset the load flag so results will be loaded for the new type
                              shouldLoadResultsRef.current = true;
                            }}
                            className={`group flex items-center justify-between p-2 rounded-lg transition-colors text-sm cursor-pointer ${
                              selectedType === type
                                ? 'bg-primary-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                          >
                            <span className="flex-1 font-medium px-2 py-1">
                              {type}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteType(type);
                              }}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label="Delete race name"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                      No race names created. Click Add to create one.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                  Select an event and division to create race names
                </div>
              )}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Race Results Panel */}
        <SectionCard
          title="Race Results"
          subtitle={selectedEvent && selectedDivision && selectedType ? `${selectedEvent.name} • Round ${selectedEvent.roundNumber || selectedEvent.round} • ${selectedDivision} • ${selectedType}` : undefined}
          icon={Flag}
          actions={
            selectedEvent && selectedDivision && selectedType && (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl hover-lift text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                Save Results
              </button>
            )
          }
          className="min-h-[500px] flex flex-col"
          noPadding
        >
          <div className="flex-1 min-h-[400px]">
            {selectedEvent && selectedDivision && selectedType ? (
              <div className="h-full overflow-x-auto">
              <SpreadsheetTable
                division={selectedDivision}
                type={selectedType}
                results={driverResults}
                onUpdate={handleUpdateDriverResult}
                onBatchUpdate={handleBatchUpdateDriverResult}
                onDeleteRow={handleDeleteRow}
                drivers={drivers}
              />
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                {!selectedEvent
                  ? 'Select an event and division to view results'
                  : !selectedDivision
                  ? 'Select a division to view results'
                  : 'Select a race name to view results'}
              </div>
            )}
          </div>
        </SectionCard>
      </PageLayout>

      {/* Race Name Modal */}
      {isTypeModalOpen && (
      <Modal
        isOpen={isTypeModalOpen}
        onClose={handleTypeModalCancel}
        title="Add Race Name"
        subtitle="Create a new race type for this division"
        icon={Plus}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleTypeModalCancel}
              className="px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleTypeModalSubmit}
              className="px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl hover-lift font-medium"
            >
              Add
            </button>
          </div>
        }
      >
        <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Race Type
            </label>
            <select
              value={selectedRaceType}
              onChange={(e) => setSelectedRaceType(e.target.value as 'qualification' | 'heat' | 'final')}
              className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all mb-3"
              autoFocus
            >
              <option value="qualification">Qual</option>
              <option value="heat">Heat</option>
              <option value="final">Final</option>
            </select>
            {selectedRaceType === 'qualification' && (
              <>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Group
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleTypeModalSubmit();
                    } else if (e.key === 'Escape') {
                      handleTypeModalCancel();
                    }
                  }}
                >
                  <option value="1">Group 1</option>
                  <option value="2">Group 2</option>
                  <option value="3">Group 3</option>
                  <option value="4">Group 4</option>
                  <option value="5">Group 5</option>
                  <option value="6">Group 6</option>
                </select>
              </>
            )}
            {(selectedRaceType === 'heat' || selectedRaceType === 'final') && (
              <>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {selectedRaceType === 'heat' ? 'Final Type' : 'Final Type'}
                </label>
                <select
                  value={selectedFinalType}
                  onChange={(e) => setSelectedFinalType(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleTypeModalSubmit();
                    } else if (e.key === 'Escape') {
                      handleTypeModalCancel();
                    }
                  }}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                  <option value="F">F</option>
                </select>
              </>
            )}
        </div>
      </Modal>
      )}
    </>
  );
}

function SpreadsheetTable({
  division,
  type,
  results,
  onUpdate,
  onBatchUpdate,
  onDeleteRow,
  drivers,
}: {
  division: Division;
  type: string | null;
  results: DriverRaceResult[];
  onUpdate: (index: number, field: keyof DriverRaceResult, value: string | number, forceAddRow?: boolean) => void;
  onBatchUpdate?: (index: number, updates: Partial<DriverRaceResult>, forceAddRow?: boolean) => void;
  onDeleteRow?: (index: number) => void;
  drivers: any[];
}) {
  const [suggestions, setSuggestions] = useState<Record<number, any[]>>({});
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<Record<number, number>>({});
  const [showSuggestions, setShowSuggestions] = useState<Record<number, boolean>>({});
  const [suggestionField, setSuggestionField] = useState<Record<number, 'driverName' | 'driverAlias'>>({}); // Track which field is showing suggestions
  const [dropdownPosition, setDropdownPosition] = useState<Record<number, { top: number; left: number; width: number }>>({});
  const blurTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({});
  const inputRef = useRef<Record<number, HTMLInputElement | null>>({});
  const aliasInputRef = useRef<Record<number, HTMLInputElement | null>>({});
  const portalRef = useRef<HTMLDivElement | null>(null);
  const focusedCellRef = useRef<{ row: number; field: keyof DriverRaceResult } | null>(null);

  useEffect(() => {
    // Create portal container
    const portalDiv = document.createElement('div');
    portalDiv.id = 'dropdown-portal';
    document.body.appendChild(portalDiv);
    portalRef.current = portalDiv;

    return () => {
      if (portalRef.current && document.body.contains(portalRef.current)) {
        document.body.removeChild(portalRef.current);
      }
    };
  }, []);

  // Handle paste from spreadsheet - goes down columns
  const handlePaste = (e: React.ClipboardEvent, startRow: number, startField: keyof DriverRaceResult) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    if (!pastedData) return;

    // Parse the pasted data - split by newlines and tabs
    const lines = pastedData.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return;

    // Determine max row needed
    const maxRowNeeded = startRow + lines.length - 1;
    
    // For each line, split by tab to get columns
    const updates: Array<{ row: number; field: keyof DriverRaceResult; value: string | number | Division }> = [];
    
    lines.forEach((line, lineIndex) => {
      const values = line.split('\t');
      const targetRow = startRow + lineIndex;
      
      // Only process if we have a valid row
      if (targetRow >= 0) {
        values.forEach((value, colIndex) => {
          const fieldIndex = fields.indexOf(startField) + colIndex;
          if (fieldIndex >= 0 && fieldIndex < fields.length) {
            const field = fields[fieldIndex];
            const trimmedValue = value.trim();
            
            // Skip empty values
            if (trimmedValue === '') return;
            
            // Handle different field types
            if (field === 'division') {
              // Validate division value - also handle partial matches
              const validDivisions = ['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New'];
              let divisionValue = trimmedValue;
              
              // Try to match partial division names
              if (!validDivisions.includes(trimmedValue)) {
                const match = validDivisions.find(d => 
                  d.toLowerCase().includes(trimmedValue.toLowerCase()) || 
                  trimmedValue.toLowerCase().includes(d.toLowerCase().replace('division ', ''))
                );
                if (match) divisionValue = match;
              }
              
              if (validDivisions.includes(divisionValue)) {
                updates.push({ row: targetRow, field, value: divisionValue as Division });
              }
            } else if (field === 'gridPosition' || field === 'overallPosition' || field === 'position') {
              const numValue = parseInt(trimmedValue, 10);
              if (!isNaN(numValue)) {
                updates.push({ row: targetRow, field, value: numValue });
              }
            } else {
              updates.push({ row: targetRow, field, value: trimmedValue });
            }
          }
        });
      }
    });

    // Apply all updates - ensure rows are created by using forceAddRow for rows beyond current length
    if (updates.length > 0) {
      // Group updates by row to batch them
      const updatesByRow = new Map<number, Array<{ field: keyof DriverRaceResult; value: string | number | Division }>>();
      updates.forEach(({ row, field, value }) => {
        if (!updatesByRow.has(row)) {
          updatesByRow.set(row, []);
        }
        updatesByRow.get(row)!.push({ field, value });
      });

      // Apply updates row by row, using batch update when possible
      updatesByRow.forEach((rowUpdates, row) => {
        const needsNewRow = row >= rowsToDisplay.length;
        
        if (onBatchUpdate && rowUpdates.length > 1) {
          // Use batch update for multiple fields
          const batchUpdates: Partial<DriverRaceResult> = {};
          rowUpdates.forEach(({ field, value }) => {
            (batchUpdates as any)[field] = value;
          });
          onBatchUpdate(row, batchUpdates, needsNewRow);
        } else {
          // Apply individual updates
          rowUpdates.forEach(({ field, value }) => {
            onUpdate(row, field, value as string | number, needsNewRow);
          });
        }
      });
      
      // Focus the last cell that was pasted
      const lastUpdate = updates[updates.length - 1];
      if (lastUpdate) {
        setTimeout(() => {
          const targetInput = document.querySelector(
            `input[data-row="${lastUpdate.row}"][data-field="${lastUpdate.field}"], select[data-row="${lastUpdate.row}"][data-field="${lastUpdate.field}"]`
          ) as HTMLInputElement | HTMLSelectElement;
          targetInput?.focus();
        }, 50);
      }
    }
  };
  
  // Determine if this is a qualification race
  const isQualification = type?.toLowerCase().includes('qual') || type?.toLowerCase().includes('qualification');
  
  // Default to 3 rows
  const defaultRows: DriverRaceResult[] = Array.from({ length: 3 }, (_, i) => ({
    driverId: `temp-${i}`,
    driverAlias: '',
    driverName: '',
    division: division, // Initialize with current division
    kartNumber: '',
    gridPosition: i + 1,
    position: i + 1,
    overallPosition: i + 1,
    fastestLap: '',
    points: 0,
  }));

  const fields: (keyof DriverRaceResult)[] = isQualification 
    ? ['driverName', 'driverAlias', 'division', 'kartNumber', 'fastestLap']
    : ['driverName', 'driverAlias', 'division', 'kartNumber', 'gridPosition', 'overallPosition', 'fastestLap'];

  // Merge saved results with default rows
  // Use results if available, otherwise use default rows
  const rowsToDisplay = results.length > 0 ? [...results] : [...defaultRows];
  // Ensure at least 3 rows are displayed
  while (rowsToDisplay.length < 3) {
    rowsToDisplay.push({
      driverId: `temp-${Date.now()}-${rowsToDisplay.length}`,
      driverAlias: '',
      driverName: '',
      division: division,
      kartNumber: '',
      gridPosition: rowsToDisplay.length + 1,
      position: rowsToDisplay.length + 1,
      overallPosition: rowsToDisplay.length + 1,
      fastestLap: '',
      points: 0,
    });
  }

  // Function to get matching drivers based on input (for driver name)
  const getMatchingDrivers = (input: string): any[] => {
    if (!input || input.trim().length < 1) return [];
    if (!drivers || drivers.length === 0) return [];
    
    const lowerInput = input.toLowerCase().trim();
    return drivers.filter((driver) => {
      const nameMatch = driver.name?.toLowerCase().includes(lowerInput);
      const firstNameMatch = driver.firstName?.toLowerCase().includes(lowerInput);
      const lastNameMatch = driver.lastName?.toLowerCase().includes(lowerInput);
      const fullNameMatch = `${driver.firstName || ''} ${driver.lastName || ''}`.toLowerCase().trim().includes(lowerInput);
      const aliasesMatch = driver.aliases?.some((a: string) => a.toLowerCase().includes(lowerInput));
      
      return nameMatch || firstNameMatch || lastNameMatch || fullNameMatch || aliasesMatch;
    }).slice(0, 5); // Limit to 5 suggestions
  };

  // Function to get matching drivers based on alias input
  const getMatchingDriversByAlias = (input: string): any[] => {
    if (!input || input.trim().length < 1) return [];
    if (!drivers || drivers.length === 0) return [];
    
    const lowerInput = input.toLowerCase().trim();
    return drivers.filter((driver) => {
      // Match by aliases
      const aliasesMatch = driver.aliases?.some((a: string) => a.toLowerCase().includes(lowerInput));
      // Also match by name in case user types name in alias field
      const nameMatch = driver.name?.toLowerCase().includes(lowerInput);
      const firstNameMatch = driver.firstName?.toLowerCase().includes(lowerInput);
      const lastNameMatch = driver.lastName?.toLowerCase().includes(lowerInput);
      const fullNameMatch = `${driver.firstName || ''} ${driver.lastName || ''}`.toLowerCase().trim().includes(lowerInput);
      
      return aliasesMatch || nameMatch || firstNameMatch || lastNameMatch || fullNameMatch;
    }).slice(0, 5); // Limit to 5 suggestions
  };

  // Handle driver name input change
  const handleDriverNameChange = (index: number, value: string) => {
    onUpdate(index, 'driverName', value);
    
    // Clear any pending blur timeout to prevent suggestions from hiding while typing
    if (blurTimeoutRef.current[index]) {
      clearTimeout(blurTimeoutRef.current[index]);
    }
    
    // Get matching drivers for suggestions
    const matches = getMatchingDrivers(value);
    const shouldShow = matches.length > 0 && value.trim().length > 0;
    
    // Calculate and set dropdown position FIRST, before showing suggestions
    const input = inputRef.current[index];
    if (input) {
      if (shouldShow) {
        const rect = input.getBoundingClientRect();
        // Set position immediately, not in requestAnimationFrame
        setDropdownPosition(prev => ({ 
          ...prev, 
          [index]: { 
            top: rect.bottom + 4, 
            left: rect.left,
            width: Math.max(rect.width, 300)
          } 
        }));
      } else {
        // Clear position when hiding suggestions to prevent stale positions
        setDropdownPosition(prev => {
          const newPos = { ...prev };
          delete newPos[index];
          return newPos;
        });
      }
    }
    
    // Now set suggestions and show dropdown
    setSuggestions(prev => ({ ...prev, [index]: matches }));
    setShowSuggestions(prev => ({ ...prev, [index]: shouldShow }));
    setSuggestionField(prev => ({ ...prev, [index]: 'driverName' }));
    setActiveSuggestionIndex(prev => ({ ...prev, [index]: -1 }));
    
    // Ensure input stays focused
    if (input) {
      setTimeout(() => {
        if (document.activeElement !== input) {
          input.focus();
        }
      }, 0);
    }
    
    // Don't auto-fill - let user choose from dropdown
  };

  // Handle driver alias input change
  const handleDriverAliasChange = (index: number, value: string) => {
    onUpdate(index, 'driverAlias', value);
    
    // Clear any pending blur timeout to prevent suggestions from hiding while typing
    if (blurTimeoutRef.current[index]) {
      clearTimeout(blurTimeoutRef.current[index]);
    }
    
    // Get matching drivers for suggestions based on alias
    const matches = getMatchingDriversByAlias(value);
    const shouldShow = matches.length > 0 && value.trim().length > 0;
    
    // Calculate and set dropdown position FIRST, before showing suggestions
    const input = aliasInputRef.current[index];
    if (input) {
      if (shouldShow) {
        const rect = input.getBoundingClientRect();
        // Set position immediately, not in requestAnimationFrame
        setDropdownPosition(prev => ({ 
          ...prev, 
          [index]: { 
            top: rect.bottom + 4, 
            left: rect.left,
            width: Math.max(rect.width, 300)
          } 
        }));
      } else {
        // Clear position when hiding suggestions to prevent stale positions
        setDropdownPosition(prev => {
          const newPos = { ...prev };
          delete newPos[index];
          return newPos;
        });
      }
    }
    
    // Now set suggestions and show dropdown
    setSuggestions(prev => ({ ...prev, [index]: matches }));
    setShowSuggestions(prev => ({ ...prev, [index]: shouldShow }));
    setSuggestionField(prev => ({ ...prev, [index]: 'driverAlias' }));
    setActiveSuggestionIndex(prev => ({ ...prev, [index]: -1 }));
    
    // Ensure input stays focused
    if (input) {
      setTimeout(() => {
        if (document.activeElement !== input) {
          input.focus();
        }
      }, 0);
    }
  };

  // Handle suggestion selection (driver + optional alias)
  // Always fills in driver name, alias, and division when a suggestion is selected from either field
  const handleSuggestionSelect = (index: number, driver: any, selectedAlias?: string) => {
    // Batch all updates together to ensure they're applied
    const driverName = driver.name || `${driver.firstName || ''} ${driver.lastName || ''}`.trim();
    
    // Determine alias to use - always set an alias if available
    let aliasToUse = '';
    if (selectedAlias) {
      aliasToUse = selectedAlias;
    } else if (driver.aliases && driver.aliases.length > 0) {
      aliasToUse = driver.aliases[0];
    }
    
    // Always fill in name, alias, and division when a suggestion is selected
    // Use batch update if available, otherwise fall back to individual updates
    if (onBatchUpdate) {
      const updates: Partial<DriverRaceResult> = {
        driverName: driverName,
      };
      
      // Always set alias if available
      if (aliasToUse) {
        updates.driverAlias = aliasToUse;
      }
      
      // Always set division if available
      if (driver.division) {
        updates.division = driver.division;
      }
      
      // Always set driver ID
      if (driver.id) {
        updates.driverId = driver.id;
      }
      
      onBatchUpdate(index, updates);
    } else {
      // Fallback to individual updates - always update all fields
      onUpdate(index, 'driverName', driverName);
      if (aliasToUse) {
        onUpdate(index, 'driverAlias', aliasToUse);
      }
      if (driver.division) {
        onUpdate(index, 'division', driver.division);
      }
      if (driver.id) {
        onUpdate(index, 'driverId', driver.id);
      }
    }
    
    // Hide suggestions immediately
    setShowSuggestions(prev => ({ ...prev, [index]: false }));
    setSuggestions(prev => ({ ...prev, [index]: [] }));
    
    // Move focus to next field after a short delay
    // Determine which field triggered the suggestion to move to the appropriate next field
    const currentField = suggestionField[index] || 'driverName';
    const currentFieldIndex = fields.indexOf(currentField);
    const nextFieldIndex = currentFieldIndex + 1;
    
    setTimeout(() => {
      if (nextFieldIndex < fields.length) {
        const nextInput = document.querySelector(
          `input[data-row="${index}"][data-field="${fields[nextFieldIndex]}"]`
        ) as HTMLInputElement;
        nextInput?.focus();
      }
    }, 50);
  };

  return (
    <div className="p-4">
      <div>
        <table className="w-full border-collapse border border-slate-300 dark:border-slate-600">
          <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-800 w-12">
                {/* Delete column */}
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-800">
                Driver Name
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-800">
                Driver Alias
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-800">
                Division
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-800">
                Kart Number
              </th>
              {!isQualification && (
                <>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-800">
                    Grid Position
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-800">
                    Overall Position
                  </th>
                </>
              )}
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-800">
                Best Time
              </th>
              {!isQualification && (
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-800">
                  Positions Gained/Lost
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800">
            {rowsToDisplay.map((result, index) => (
              <tr
                key={result.driverId}
                className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <td className="px-2 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-center">
                  {onDeleteRow && (
                    <button
                      onClick={() => onDeleteRow(index)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                      aria-label="Delete row"
                      title="Delete row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
                <td className="px-3 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 overflow-visible">
                  <div className="relative">
                    <input
                      type="text"
                      value={result.driverName || ''}
                      onChange={(e) => handleDriverNameChange(index, e.target.value)}
                      onPaste={(e) => {
                        focusedCellRef.current = { row: index, field: 'driverName' };
                        handlePaste(e, index, 'driverName');
                      }}
                      onFocus={(e) => {
                        focusedCellRef.current = { row: index, field: 'driverName' };
                        const value = result.driverName || '';
                        const matches = getMatchingDrivers(value);
                        const rect = e.currentTarget.getBoundingClientRect();
                        // getBoundingClientRect() already gives viewport coordinates for fixed positioning
                        setDropdownPosition(prev => ({ 
                          ...prev, 
                          [index]: { 
                            top: rect.bottom + 4, 
                            left: rect.left,
                            width: Math.max(rect.width, 300)
                          } 
                        }));
                        if (matches.length > 0 && value.trim().length > 0) {
                          setShowSuggestions(prev => ({ ...prev, [index]: true }));
                          setSuggestions(prev => ({ ...prev, [index]: matches }));
                          setSuggestionField(prev => ({ ...prev, [index]: 'driverName' }));
                        }
                      }}
                      onBlur={(e) => {
                        // Clear any existing timeout
                        if (blurTimeoutRef.current[index]) {
                          clearTimeout(blurTimeoutRef.current[index]);
                        }
                        
                        // Delay hiding suggestions to allow clicking on them
                        // Only hide if focus is not moving to the dropdown
                        blurTimeoutRef.current[index] = setTimeout(() => {
                          // Check if the newly focused element is within the dropdown
                          const activeElement = document.activeElement;
                          const dropdown = document.querySelector(`[data-dropdown-index="${index}"]`);
                          
                          if (!dropdown?.contains(activeElement)) {
                            setShowSuggestions(prev => ({ ...prev, [index]: false }));
                          }
                        }, 200);
                      }}
                      ref={(el) => {
                        inputRef.current[index] = el;
                      }}
                      onKeyDown={(e) => {
                        const currentSuggestions = suggestions[index] || [];
                        const currentIndex = activeSuggestionIndex[index] ?? -1;
                        
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          // Clear current input and hide suggestions
                          onUpdate(index, 'driverName', '');
                          onUpdate(index, 'driverAlias', '');
                          onUpdate(index, 'driverId', `temp-${index}`);
                          setShowSuggestions(prev => ({ ...prev, [index]: false }));
                          setSuggestions(prev => ({ ...prev, [index]: [] }));
                        } else if (e.key === 'ArrowDown' && currentSuggestions.length > 0) {
                          e.preventDefault();
                          const nextIndex = currentIndex < currentSuggestions.length - 1 ? currentIndex + 1 : 0;
                          setActiveSuggestionIndex(prev => ({ ...prev, [index]: nextIndex }));
                          setShowSuggestions(prev => ({ ...prev, [index]: true }));
                        } else if (e.key === 'ArrowUp' && currentSuggestions.length > 0) {
                          e.preventDefault();
                          const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentSuggestions.length - 1;
                          setActiveSuggestionIndex(prev => ({ ...prev, [index]: prevIndex }));
                          setShowSuggestions(prev => ({ ...prev, [index]: true }));
                        } else if (e.key === 'Enter' && currentSuggestions.length > 0) {
                          e.preventDefault();
                          // If there's an active suggestion, select it; otherwise select the first one
                          const suggestionToSelect = currentIndex >= 0 && currentSuggestions[currentIndex] 
                            ? currentSuggestions[currentIndex] 
                            : currentSuggestions[0];
                          if (suggestionToSelect) {
                            handleSuggestionSelect(index, suggestionToSelect);
                          }
                        } else if (e.key === 'Tab') {
                          e.preventDefault();
                          setShowSuggestions(prev => ({ ...prev, [index]: false }));
                          const nextFieldIndex = fields.indexOf('driverName') + 1;
                          if (nextFieldIndex < fields.length) {
                            const nextField = fields[nextFieldIndex];
                            const nextInput = document.querySelector(
                              `input[data-row="${index}"][data-field="${nextField}"], select[data-row="${index}"][data-field="${nextField}"]`
                            ) as HTMLInputElement | HTMLSelectElement;
                            nextInput?.focus();
                          } else if (index < rowsToDisplay.length - 1) {
                            const nextRowInput = document.querySelector(
                              `input[data-row="${index + 1}"][data-field="driverName"]`
                            ) as HTMLInputElement;
                            nextRowInput?.focus();
                          } else {
                            // Last row, create new row and move to it
                            onUpdate(index, 'driverName', result.driverName || '', true);
                            setTimeout(() => {
                              const newRowInput = document.querySelector(
                                `input[data-row="${index + 1}"][data-field="driverName"]`
                              ) as HTMLInputElement;
                              newRowInput?.focus();
                            }, 0);
                          }
                        } else if (e.key === 'Enter' && !currentSuggestions.length) {
                          e.preventDefault();
                          // Move down a row but stay in the same column (driverName)
                          const isLastRow = index >= rowsToDisplay.length - 1;
                          if (!isLastRow) {
                            const nextRowInput = document.querySelector(
                              `input[data-row="${index + 1}"][data-field="driverName"]`
                            ) as HTMLInputElement;
                            nextRowInput?.focus();
                          } else {
                            // Last row, create new row and move to it
                            onUpdate(index, 'driverName', result.driverName || '', true);
                            setTimeout(() => {
                              const newRowInput = document.querySelector(
                                `input[data-row="${index + 1}"][data-field="driverName"]`
                              ) as HTMLInputElement;
                              if (newRowInput) {
                                newRowInput.focus();
                              }
                            }, 100);
                          }
                        }
                      }}
                      data-row={index}
                      data-field="driverName"
                      className="w-full px-2 py-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:ring-1 focus:ring-blue-500"
                      placeholder="Name"
                    />
                    {showSuggestions[index] && (suggestions[index] || []).length > 0 && dropdownPosition[index] && portalRef.current && createPortal(
                      <div 
                        data-dropdown-index={index}
                        className="fixed bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl shadow-2xl overflow-y-auto z-[9999]" 
                        style={{ 
                          maxHeight: '400px',
                          minWidth: '300px',
                          width: `${dropdownPosition[index].width}px`,
                          top: `${dropdownPosition[index].top}px`,
                          left: `${dropdownPosition[index].left}px`
                        }}
                        onMouseDown={(e) => {
                          // Prevent blur when clicking on dropdown
                          e.preventDefault();
                        }}
                      >
                        {(suggestions[index] || []).map((driver, suggestionIndex) => {
                          const driverAliases = driver.aliases || [];
                          const hasMultipleAliases = driverAliases.length > 1;
                          
                          return (
                            <div
                              key={driver.id || suggestionIndex}
                              className={`${
                                activeSuggestionIndex[index] === suggestionIndex
                                  ? 'bg-blue-50 dark:bg-blue-900/20'
                                  : ''
                              }`}
                            >
                              <div
                                onClick={() => handleSuggestionSelect(index, driver)}
                                className={`px-4 py-2.5 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-slate-100 dark:border-slate-700`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                      {driver.name || `${driver.firstName || ''} ${driver.lastName || ''}`.trim()}
                                    </div>
                                    {!hasMultipleAliases && driverAliases.length > 0 && (
                                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Alias: {driverAliases[0]}
                                      </div>
                                    )}
                                  </div>
                                  <div className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getDivisionColor(driver.division)}`}>
                                    {driver.division}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Show multiple aliases as sub-options */}
                              {hasMultipleAliases && (
                                <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                  <div className="px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                                    Select alias:
                                  </div>
                                  {driverAliases.map((alias: string, aliasIdx: number) => (
                                    <div
                                      key={aliasIdx}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSuggestionSelect(index, driver, alias);
                                      }}
                                      className="px-6 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                    >
                                      <div className="text-sm text-slate-700 dark:text-slate-300">
                                        {alias}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>,
                      portalRef.current
                    )}
                  </div>
                </td>
                <td className="px-3 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 overflow-visible">
                  <div className="relative">
                    <input
                      type="text"
                      value={result.driverAlias || ''}
                      onChange={(e) => handleDriverAliasChange(index, e.target.value)}
                      onPaste={(e) => {
                        focusedCellRef.current = { row: index, field: 'driverAlias' };
                        handlePaste(e, index, 'driverAlias');
                      }}
                      onFocus={(e) => {
                        focusedCellRef.current = { row: index, field: 'driverAlias' };
                        const value = result.driverAlias || '';
                        const matches = getMatchingDriversByAlias(value);
                        const rect = e.currentTarget.getBoundingClientRect();
                        setDropdownPosition(prev => ({ 
                          ...prev, 
                          [index]: { 
                            top: rect.bottom + 4, 
                            left: rect.left,
                            width: Math.max(rect.width, 300)
                          } 
                        }));
                        if (matches.length > 0 && value.trim().length > 0) {
                          setShowSuggestions(prev => ({ ...prev, [index]: true }));
                          setSuggestions(prev => ({ ...prev, [index]: matches }));
                          setSuggestionField(prev => ({ ...prev, [index]: 'driverAlias' }));
                        }
                      }}
                      onBlur={(e) => {
                        // Clear any existing timeout
                        if (blurTimeoutRef.current[index]) {
                          clearTimeout(blurTimeoutRef.current[index]);
                        }
                        
                        // Delay hiding suggestions to allow clicking on them
                        blurTimeoutRef.current[index] = setTimeout(() => {
                          const activeElement = document.activeElement;
                          const dropdown = document.querySelector(`[data-dropdown-index="${index}"]`);
                          
                          if (!dropdown?.contains(activeElement)) {
                            setShowSuggestions(prev => ({ ...prev, [index]: false }));
                          }
                        }, 200);
                      }}
                      ref={(el) => {
                        aliasInputRef.current[index] = el;
                      }}
                      onKeyDown={(e) => {
                        const currentSuggestions = suggestions[index] || [];
                        const currentIndex = activeSuggestionIndex[index] ?? -1;
                        
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setShowSuggestions(prev => ({ ...prev, [index]: false }));
                          setSuggestions(prev => ({ ...prev, [index]: [] }));
                        } else if (e.key === 'ArrowDown' && currentSuggestions.length > 0) {
                          e.preventDefault();
                          const nextIndex = currentIndex < currentSuggestions.length - 1 ? currentIndex + 1 : 0;
                          setActiveSuggestionIndex(prev => ({ ...prev, [index]: nextIndex }));
                          setShowSuggestions(prev => ({ ...prev, [index]: true }));
                        } else if (e.key === 'ArrowUp' && currentSuggestions.length > 0) {
                          e.preventDefault();
                          const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentSuggestions.length - 1;
                          setActiveSuggestionIndex(prev => ({ ...prev, [index]: prevIndex }));
                          setShowSuggestions(prev => ({ ...prev, [index]: true }));
                        } else if (e.key === 'Enter' && currentSuggestions.length > 0) {
                          e.preventDefault();
                          // If there's an active suggestion, select it; otherwise select the first one
                          const suggestionToSelect = currentIndex >= 0 && currentSuggestions[currentIndex] 
                            ? currentSuggestions[currentIndex] 
                            : currentSuggestions[0];
                          if (suggestionToSelect) {
                            handleSuggestionSelect(index, suggestionToSelect);
                          }
                        } else if (e.key === 'Tab') {
                          e.preventDefault();
                          setShowSuggestions(prev => ({ ...prev, [index]: false }));
                          const nextFieldIndex = fields.indexOf('driverAlias') + 1;
                          if (nextFieldIndex < fields.length) {
                            const nextField = fields[nextFieldIndex];
                            const nextInput = document.querySelector(
                              `input[data-row="${index}"][data-field="${nextField}"], select[data-row="${index}"][data-field="${nextField}"]`
                            ) as HTMLInputElement | HTMLSelectElement;
                            nextInput?.focus();
                          } else if (index < rowsToDisplay.length - 1) {
                            const nextRowInput = document.querySelector(
                              `input[data-row="${index + 1}"][data-field="driverName"]`
                            ) as HTMLInputElement;
                            nextRowInput?.focus();
                          }
                        } else if (e.key === 'Enter' && !currentSuggestions.length) {
                          e.preventDefault();
                          // Move down a row but stay in the same column (driverAlias)
                          const isLastRow = index >= rowsToDisplay.length - 1;
                          if (!isLastRow) {
                            const nextRowInput = document.querySelector(
                              `input[data-row="${index + 1}"][data-field="driverAlias"]`
                            ) as HTMLInputElement;
                            nextRowInput?.focus();
                          } else {
                            // Last row, create new row and move to it
                            onUpdate(index, 'driverAlias', result.driverAlias || '', true);
                            setTimeout(() => {
                              const newRowInput = document.querySelector(
                                `input[data-row="${index + 1}"][data-field="driverAlias"]`
                              ) as HTMLInputElement;
                              if (newRowInput) {
                                newRowInput.focus();
                              }
                            }, 100);
                          }
                        }
                      }}
                      data-row={index}
                      data-field="driverAlias"
                      className="w-full px-2 py-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:ring-1 focus:ring-blue-500"
                      placeholder="Alias"
                    />
                    {showSuggestions[index] && (suggestions[index] || []).length > 0 && dropdownPosition[index] && portalRef.current && createPortal(
                      <div 
                        data-dropdown-index={index}
                        className="fixed bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl shadow-2xl overflow-y-auto z-[9999]" 
                        style={{ 
                          maxHeight: '400px',
                          minWidth: '300px',
                          width: `${dropdownPosition[index].width}px`,
                          top: `${dropdownPosition[index].top}px`,
                          left: `${dropdownPosition[index].left}px`
                        }}
                        onMouseDown={(e) => {
                          // Prevent blur when clicking on dropdown
                          e.preventDefault();
                        }}
                      >
                        {(suggestions[index] || []).map((driver, suggestionIndex) => {
                          const driverAliases = driver.aliases || [];
                          const hasMultipleAliases = driverAliases.length > 1;
                          
                          return (
                            <div
                              key={driver.id || suggestionIndex}
                              className={`${
                                activeSuggestionIndex[index] === suggestionIndex
                                  ? 'bg-blue-50 dark:bg-blue-900/20'
                                  : ''
                              }`}
                            >
                              <div
                                onClick={() => handleSuggestionSelect(index, driver)}
                                className={`px-4 py-2.5 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-slate-100 dark:border-slate-700`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                      {driver.name || `${driver.firstName || ''} ${driver.lastName || ''}`.trim()}
                                    </div>
                                    {!hasMultipleAliases && driverAliases.length > 0 && (
                                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Alias: {driverAliases[0]}
                                      </div>
                                    )}
                                  </div>
                                  <div className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getDivisionColor(driver.division)}`}>
                                    {driver.division}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Show multiple aliases as sub-options */}
                              {hasMultipleAliases && (
                                <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                  <div className="px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                                    Select alias:
                                  </div>
                                  {driverAliases.map((alias: string, aliasIdx: number) => (
                                    <div
                                      key={aliasIdx}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSuggestionSelect(index, driver, alias);
                                      }}
                                      className="px-6 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                    >
                                      <div className="text-sm text-slate-700 dark:text-slate-300">
                                        {alias}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>,
                      portalRef.current
                    )}
                  </div>
                </td>
                <td className="px-3 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                  <div className="relative">
                    {/* Datalist must be rendered before inputs for proper association */}
                    <datalist id={`division-list-${index}`}>
                      <option value="Division 1" />
                      <option value="Division 2" />
                      <option value="Division 3" />
                      <option value="Division 4" />
                      <option value="New" />
                    </datalist>
                    {result.division && result.division.trim() ? (
                      // Show as badge when filled, but make it editable
                      <input
                        type="text"
                        value={result.division || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          const validDivisions = ['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New'];
                          let divisionValue = value;
                          
                          if (value && !validDivisions.includes(value)) {
                            const match = validDivisions.find(d => 
                              d.toLowerCase().includes(value.toLowerCase()) || 
                              value.toLowerCase().includes(d.toLowerCase().replace('division ', ''))
                            );
                            if (match) divisionValue = match;
                          }
                          
                          if (validDivisions.includes(divisionValue) || !value) {
                            onUpdate(index, 'division', divisionValue as Division);
                          }
                        }}
                        onPaste={(e) => {
                          focusedCellRef.current = { row: index, field: 'division' };
                          handlePaste(e, index, 'division');
                        }}
                        onFocus={() => {
                          focusedCellRef.current = { row: index, field: 'division' };
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            e.stopPropagation();
                            const nextFieldIndex = fields.indexOf('division') + 1;
                            if (nextFieldIndex < fields.length) {
                              const nextField = fields[nextFieldIndex];
                              const row = e.currentTarget.closest('tr');
                              const nextInput = row?.querySelector(
                                `input[data-field="${nextField}"], select[data-field="${nextField}"]`
                              ) as HTMLInputElement | HTMLSelectElement;
                              if (nextInput) {
                                nextInput.focus();
                              } else {
                                const fallbackInput = document.querySelector(
                                  `input[data-row="${index}"][data-field="${nextField}"], select[data-row="${index}"][data-field="${nextField}"]`
                                ) as HTMLInputElement | HTMLSelectElement;
                                fallbackInput?.focus();
                              }
                            } else {
                              const isLastRow = index >= rowsToDisplay.length - 1;
                              if (!isLastRow) {
                                const nextRowInput = document.querySelector(
                                  `input[data-row="${index + 1}"][data-field="driverName"]`
                                ) as HTMLInputElement;
                                nextRowInput?.focus();
                              } else {
                                onUpdate(index, 'division', result.division || division, true);
                                setTimeout(() => {
                                  const newRowInput = document.querySelector(
                                    `input[data-row="${index + 1}"][data-field="driverName"]`
                                  ) as HTMLInputElement;
                                  if (newRowInput) {
                                    newRowInput.focus();
                                  }
                                }, 100);
                              }
                            }
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            const isLastRow = index >= rowsToDisplay.length - 1;
                            if (!isLastRow) {
                              const nextRowInput = document.querySelector(
                                `input[data-row="${index + 1}"][data-field="division"]`
                              ) as HTMLInputElement;
                              nextRowInput?.focus();
                            } else {
                              onUpdate(index, 'division', result.division || division, true);
                              setTimeout(() => {
                                const newRowInput = document.querySelector(
                                  `input[data-row="${index + 1}"][data-field="division"]`
                                ) as HTMLInputElement;
                                if (newRowInput) {
                                  newRowInput.focus();
                                }
                              }, 100);
                            }
                          }
                        }}
                        data-row={index}
                        data-field="division"
                        className={`w-full px-3 py-1.5 rounded-full text-xs font-semibold border-none outline-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${getDivisionColor((result.division || division) as Division)}`}
                        placeholder="Division"
                        list={`division-list-${index}`}
                      />
                    ) : (
                      // Show as input when empty
                      <input
                        type="text"
                        value={result.division || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Validate division value
                          const validDivisions = ['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New'];
                          let divisionValue = value;
                          
                          // Try to match partial division names
                          if (value && !validDivisions.includes(value)) {
                            const match = validDivisions.find(d => 
                              d.toLowerCase().includes(value.toLowerCase()) || 
                              value.toLowerCase().includes(d.toLowerCase().replace('division ', ''))
                            );
                            if (match) divisionValue = match;
                          }
                          
                          if (validDivisions.includes(divisionValue) || !value) {
                            onUpdate(index, 'division', divisionValue as Division);
                          }
                        }}
                        onPaste={(e) => {
                          focusedCellRef.current = { row: index, field: 'division' };
                          handlePaste(e, index, 'division');
                        }}
                        onFocus={() => {
                          focusedCellRef.current = { row: index, field: 'division' };
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            e.stopPropagation();
                            const nextFieldIndex = fields.indexOf('division') + 1;
                            if (nextFieldIndex < fields.length) {
                              const nextField = fields[nextFieldIndex];
                              const row = e.currentTarget.closest('tr');
                              const nextInput = row?.querySelector(
                                `input[data-field="${nextField}"], select[data-field="${nextField}"]`
                              ) as HTMLInputElement | HTMLSelectElement;
                              if (nextInput) {
                                nextInput.focus();
                              } else {
                                const fallbackInput = document.querySelector(
                                  `input[data-row="${index}"][data-field="${nextField}"], select[data-row="${index}"][data-field="${nextField}"]`
                                ) as HTMLInputElement | HTMLSelectElement;
                                fallbackInput?.focus();
                              }
                            } else {
                              const isLastRow = index >= rowsToDisplay.length - 1;
                              if (!isLastRow) {
                                const nextRowInput = document.querySelector(
                                  `input[data-row="${index + 1}"][data-field="driverName"]`
                                ) as HTMLInputElement;
                                nextRowInput?.focus();
                              } else {
                                onUpdate(index, 'division', result.division || division, true);
                                setTimeout(() => {
                                  const newRowInput = document.querySelector(
                                    `input[data-row="${index + 1}"][data-field="driverName"]`
                                  ) as HTMLInputElement;
                                  if (newRowInput) {
                                    newRowInput.focus();
                                  }
                                }, 100);
                              }
                            }
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            // Move down a row but stay in the same column (division)
                            const isLastRow = index >= rowsToDisplay.length - 1;
                            if (!isLastRow) {
                              const nextRowInput = document.querySelector(
                                `input[data-row="${index + 1}"][data-field="division"]`
                              ) as HTMLInputElement;
                              nextRowInput?.focus();
                            } else {
                              onUpdate(index, 'division', result.division || division, true);
                              setTimeout(() => {
                                const newRowInput = document.querySelector(
                                  `input[data-row="${index + 1}"][data-field="division"]`
                                ) as HTMLInputElement;
                                if (newRowInput) {
                                  newRowInput.focus();
                                }
                              }, 100);
                            }
                          }
                        }}
                        data-row={index}
                        data-field="division"
                        className="w-full px-2 py-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:ring-1 focus:ring-blue-500"
                        placeholder="Division"
                        list={`division-list-${index}`}
                      />
                    )}
                  </div>
                </td>
                <td className="px-3 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                  <input
                    type="text"
                    value={result.kartNumber || ''}
                    onChange={(e) => onUpdate(index, 'kartNumber', e.target.value)}
                    onPaste={(e) => {
                      focusedCellRef.current = { row: index, field: 'kartNumber' };
                      handlePaste(e, index, 'kartNumber');
                    }}
                    onFocus={() => {
                      focusedCellRef.current = { row: index, field: 'kartNumber' };
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const nextFieldIndex = fields.indexOf('kartNumber') + 1;
                        if (nextFieldIndex < fields.length) {
                          const nextField = fields[nextFieldIndex];
                          const row = e.currentTarget.closest('tr');
                          const nextInput = row?.querySelector(
                            `input[data-field="${nextField}"], select[data-field="${nextField}"]`
                          ) as HTMLInputElement | HTMLSelectElement;
                          if (nextInput) {
                            nextInput.focus();
                          } else {
                            const fallbackInput = document.querySelector(
                              `input[data-row="${index}"][data-field="${nextField}"], select[data-row="${index}"][data-field="${nextField}"]`
                            ) as HTMLInputElement | HTMLSelectElement;
                            fallbackInput?.focus();
                          }
                        } else {
                          const isLastRow = index >= rowsToDisplay.length - 1;
                          if (!isLastRow) {
                            const nextRowInput = document.querySelector(
                              `input[data-row="${index + 1}"][data-field="driverName"]`
                            ) as HTMLInputElement;
                            nextRowInput?.focus();
                          } else {
                            // Last row, create new row and move to it
                            onUpdate(index, 'kartNumber', result.kartNumber || '', true);
                            setTimeout(() => {
                              const newRowInput = document.querySelector(
                                `input[data-row="${index + 1}"][data-field="driverName"]`
                              ) as HTMLInputElement;
                              if (newRowInput) {
                                newRowInput.focus();
                              }
                            }, 100);
                          }
                        }
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        // Move down a row but stay in the same column (kartNumber)
                        const isLastRow = index >= rowsToDisplay.length - 1;
                        if (!isLastRow) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="kartNumber"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        } else {
                          // Last row, create new row and move to it
                          onUpdate(index, 'kartNumber', result.kartNumber || '', true);
                          setTimeout(() => {
                            const newRowInput = document.querySelector(
                              `input[data-row="${index + 1}"][data-field="kartNumber"]`
                            ) as HTMLInputElement;
                            if (newRowInput) {
                              newRowInput.focus();
                            }
                          }, 100);
                        }
                      }
                    }}
                    data-row={index}
                    data-field="kartNumber"
                    className="w-full px-2 py-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:ring-1 focus:ring-blue-500"
                    placeholder="Kart #"
                  />
                </td>
                {!isQualification && (
                  <>
                    <td className="px-3 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                      <input
                        type="number"
                        value={result.gridPosition || ''}
                        onChange={(e) => onUpdate(index, 'gridPosition', parseInt(e.target.value) || 0)}
                        onPaste={(e) => {
                          focusedCellRef.current = { row: index, field: 'gridPosition' };
                          handlePaste(e, index, 'gridPosition');
                        }}
                        onFocus={() => {
                          focusedCellRef.current = { row: index, field: 'gridPosition' };
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            const nextFieldIndex = fields.indexOf('gridPosition') + 1;
                            if (nextFieldIndex < fields.length) {
                              const nextField = fields[nextFieldIndex];
                              const row = e.currentTarget.closest('tr');
                              const nextInput = row?.querySelector(
                                `input[data-field="${nextField}"], select[data-field="${nextField}"]`
                              ) as HTMLInputElement | HTMLSelectElement;
                              if (nextInput) {
                                nextInput.focus();
                              } else {
                                const fallbackInput = document.querySelector(
                                  `input[data-row="${index}"][data-field="${nextField}"], select[data-row="${index}"][data-field="${nextField}"]`
                                ) as HTMLInputElement | HTMLSelectElement;
                                fallbackInput?.focus();
                              }
                            } else {
                              const isLastRow = index >= rowsToDisplay.length - 1;
                              if (!isLastRow) {
                                const nextRowInput = document.querySelector(
                                  `input[data-row="${index + 1}"][data-field="driverName"]`
                                ) as HTMLInputElement;
                                nextRowInput?.focus();
                              } else {
                                // Last row, create new row and move to it
                                onUpdate(index, 'gridPosition', result.gridPosition || 0, true);
                                setTimeout(() => {
                                  const newRowInput = document.querySelector(
                                    `input[data-row="${index + 1}"][data-field="driverName"]`
                                  ) as HTMLInputElement;
                                  if (newRowInput) {
                                    newRowInput.focus();
                                  }
                                }, 100);
                              }
                            }
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            // Move down a row but stay in the same column (gridPosition)
                            const isLastRow = index >= rowsToDisplay.length - 1;
                            if (!isLastRow) {
                              const nextRowInput = document.querySelector(
                                `input[data-row="${index + 1}"][data-field="gridPosition"]`
                              ) as HTMLInputElement;
                              nextRowInput?.focus();
                            } else {
                              // Last row, create new row and move to it
                              onUpdate(index, 'gridPosition', result.gridPosition || 0, true);
                              setTimeout(() => {
                                const newRowInput = document.querySelector(
                                  `input[data-row="${index + 1}"][data-field="gridPosition"]`
                                ) as HTMLInputElement;
                                if (newRowInput) {
                                  newRowInput.focus();
                                }
                              }, 100);
                            }
                          }
                        }}
                        data-row={index}
                        data-field="gridPosition"
                        className="w-full px-2 py-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:ring-1 focus:ring-blue-500"
                        placeholder="Grid"
                      />
                    </td>
                    <td className="px-3 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                      <input
                        type="number"
                        value={result.overallPosition || ''}
                        onChange={(e) => onUpdate(index, 'overallPosition', parseInt(e.target.value) || 0)}
                        onPaste={(e) => {
                          focusedCellRef.current = { row: index, field: 'overallPosition' };
                          handlePaste(e, index, 'overallPosition');
                        }}
                        onFocus={() => {
                          focusedCellRef.current = { row: index, field: 'overallPosition' };
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            const nextFieldIndex = fields.indexOf('overallPosition') + 1;
                            if (nextFieldIndex < fields.length) {
                              const nextField = fields[nextFieldIndex];
                              const row = e.currentTarget.closest('tr');
                              const nextInput = row?.querySelector(
                                `input[data-field="${nextField}"], select[data-field="${nextField}"]`
                              ) as HTMLInputElement | HTMLSelectElement;
                              if (nextInput) {
                                nextInput.focus();
                              } else {
                                const fallbackInput = document.querySelector(
                                  `input[data-row="${index}"][data-field="${nextField}"], select[data-row="${index}"][data-field="${nextField}"]`
                                ) as HTMLInputElement | HTMLSelectElement;
                                fallbackInput?.focus();
                              }
                            } else {
                              const isLastRow = index >= rowsToDisplay.length - 1;
                              if (!isLastRow) {
                                const nextRowInput = document.querySelector(
                                  `input[data-row="${index + 1}"][data-field="driverName"]`
                                ) as HTMLInputElement;
                                nextRowInput?.focus();
                              } else {
                                // Last row, create new row and move to it
                                onUpdate(index, 'overallPosition', result.overallPosition || 0, true);
                                setTimeout(() => {
                                  const newRowInput = document.querySelector(
                                    `input[data-row="${index + 1}"][data-field="driverName"]`
                                  ) as HTMLInputElement;
                                  if (newRowInput) {
                                    newRowInput.focus();
                                  }
                                }, 100);
                              }
                            }
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            // Move down a row but stay in the same column (overallPosition)
                            const isLastRow = index >= rowsToDisplay.length - 1;
                            if (!isLastRow) {
                              const nextRowInput = document.querySelector(
                                `input[data-row="${index + 1}"][data-field="overallPosition"]`
                              ) as HTMLInputElement;
                              nextRowInput?.focus();
                            } else {
                              // Last row, create new row and move to it
                              onUpdate(index, 'overallPosition', result.overallPosition || 0, true);
                              setTimeout(() => {
                                const newRowInput = document.querySelector(
                                  `input[data-row="${index + 1}"][data-field="overallPosition"]`
                                ) as HTMLInputElement;
                                if (newRowInput) {
                                  newRowInput.focus();
                                }
                              }, 100);
                            }
                          }
                        }}
                        data-row={index}
                        data-field="overallPosition"
                        className="w-full px-2 py-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:ring-1 focus:ring-blue-500"
                        placeholder="Overall"
                      />
                    </td>
                  </>
                )}
                <td className="px-3 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                  <input
                    type="text"
                    value={result.fastestLap || ''}
                    onChange={(e) => onUpdate(index, 'fastestLap', e.target.value)}
                    onPaste={(e) => {
                      focusedCellRef.current = { row: index, field: 'fastestLap' };
                      handlePaste(e, index, 'fastestLap');
                    }}
                    onFocus={() => {
                      focusedCellRef.current = { row: index, field: 'fastestLap' };
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        // Last field, move to next row first field
                        const isLastRow = index >= rowsToDisplay.length - 1;
                        if (!isLastRow) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="driverName"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        } else {
                          // Last row, create new row and move to it
                          onUpdate(index, 'fastestLap', result.fastestLap || '', true);
                          setTimeout(() => {
                            const newRowInput = document.querySelector(
                              `input[data-row="${index + 1}"][data-field="driverName"]`
                            ) as HTMLInputElement;
                            if (newRowInput) {
                              newRowInput.focus();
                            }
                          }, 100);
                        }
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        // Move down a row but stay in the same column (fastestLap)
                        const isLastRow = index >= rowsToDisplay.length - 1;
                        if (!isLastRow) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="fastestLap"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        } else {
                          // Last row, create new row and move to it
                          onUpdate(index, 'fastestLap', result.fastestLap || '', true);
                          setTimeout(() => {
                            const newRowInput = document.querySelector(
                              `input[data-row="${index + 1}"][data-field="fastestLap"]`
                            ) as HTMLInputElement;
                            if (newRowInput) {
                              newRowInput.focus();
                            }
                          }, 100);
                        }
                      }
                    }}
                    data-row={index}
                    data-field="fastestLap"
                    className="w-full px-2 py-1 bg-transparent border-none outline-none text-sm font-mono text-slate-900 dark:text-white focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:ring-1 focus:ring-blue-500"
                    placeholder=""
                  />
                </td>
                {!isQualification && (
                  <td className="px-3 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                    <div className="px-2 py-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {result.gridPosition && result.overallPosition
                        ? (() => {
                            const diff = (result.overallPosition || 0) - (result.gridPosition || 0);
                            if (diff > 0) {
                              return <span className="text-red-600 dark:text-red-400">-{diff}</span>;
                            } else if (diff < 0) {
                              return <span className="text-green-600 dark:text-green-400">+{Math.abs(diff)}</span>;
                            } else {
                              return <span className="text-slate-500 dark:text-slate-400">0</span>;
                            }
                          })()
                        : '-'}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}