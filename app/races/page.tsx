'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Header from '@/components/Header';
import { useSeason } from '@/components/SeasonContext';
import { Race, Division, DriverRaceResult } from '@/types';
import { Plus, Save, Trash2, Loader2 } from 'lucide-react';
import { getPointsForPosition } from '@/lib/pointsSystem';

// Helper function to get division color (lighter shades)
const getDivisionColor = (division: Division) => {
  switch (division) {
    case 'Division 1':
      return 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300';
    case 'Division 2':
      return 'bg-pink-50 dark:bg-pink-950 text-pink-700 dark:text-pink-300';
    case 'Division 3':
      return 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300';
    case 'Division 4':
      return 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300';
    case 'New':
      return 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300';
    default:
      return 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300';
  }
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
      name: round.name,
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
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [types, setTypes] = useState<string[]>([]);
  const [driverResults, setDriverResults] = useState<DriverRaceResult[]>([]);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [selectedRaceType, setSelectedRaceType] = useState<'qualification' | 'heat' | 'final'>('qualification');
  const shouldLoadResultsRef = useRef(true); // Track if we should load results from saved data

  // Fetch race results for a specific round
  const fetchRaceResults = async (roundId: string) => {
    try {
      const response = await fetch(`/api/race-results?roundId=${roundId}`);
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
      } else if (races.length === 0) {
        setSelectedEvent(null);
        setSelectedDivision(null);
      } else if (selectedEvent && !races.find((r) => r.id === selectedEvent.id)) {
        // If current selected event is not in filtered races, select first one
        const firstRace = races[0];
        const results = await fetchRaceResults(firstRace.id);
        setSelectedEvent({ ...firstRace, results });
        setSelectedDivision('Division 1');
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
      const divisionResult = selectedEvent.results.find((r: any) => r.division === selectedDivision);
      if (divisionResult && divisionResult.results) {
        const divisionResults = divisionResult.results || [];
        
        // Extract unique race types from saved results and populate types array
        // Use functional update to ensure we work with the latest types value
        setTypes((prevTypes) => {
          const uniqueRaceTypes = new Set<string>();
          
          // First, collect all race types from saved results
          const savedRaceTypes = new Set<string>();
          divisionResults.forEach((result: any) => {
            if (result.raceName) {
              // Use the saved raceName directly
              // Handle both old format "(qualification)" and new format "- qualification"
              let raceName = result.raceName;
              
              // Convert old format to new format if needed
              const oldFormatMatch = raceName.match(/^(.+)\s*\((\w+)\)$/);
              if (oldFormatMatch) {
                raceName = `${oldFormatMatch[1]} - ${oldFormatMatch[2]}`;
              }
              
              savedRaceTypes.add(raceName);
              uniqueRaceTypes.add(raceName);
            } else if (result.raceType) {
              // Fallback: construct from raceType if raceName not available
              const raceTypeName = result.raceType.charAt(0).toUpperCase() + result.raceType.slice(1);
              const raceName = `${raceTypeName} - ${result.raceType}`;
              
              savedRaceTypes.add(raceName);
              uniqueRaceTypes.add(raceName);
            }
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
          if (result.raceType) {
            let raceName = result.raceName;
            if (!raceName || raceName.trim() === '') {
              const raceTypeName = result.raceType.charAt(0).toUpperCase() + result.raceType.slice(1);
              raceName = `${raceTypeName} (${result.raceType})`;
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
          // Extract race type from selectedType (e.g., "Race Name (qualification)" -> "qualification")
          const match = typeToUse.match(/\((\w+)\)$/);
          const typeRaceType = match ? match[1] : null;
          if (typeRaceType) {
            const filteredResults = divisionResults.filter((r: any) => r.raceType === typeRaceType);
            setDriverResults([...filteredResults]);
          } else {
            // If no race type match, show empty (will display default 20 rows)
            setDriverResults([]);
          }
          shouldLoadResultsRef.current = false; // Don't auto-load again until type/division changes
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

  // Get driver counts per division for selected event
  const divisionDriverCounts = useMemo<Record<Division, number>>(() => {
    if (!selectedEvent) return {
      'Division 1': 0,
      'Division 2': 0,
      'Division 3': 0,
      'Division 4': 0,
      'New': 0,
    };
    const counts: Record<Division, number> = {
      'Division 1': 0,
      'Division 2': 0,
      'Division 3': 0,
      'Division 4': 0,
      'New': 0,
    };
    selectedEvent.results?.forEach((divisionResult) => {
      const division = divisionResult.division;
      if (division in counts) {
        counts[division as Division] += divisionResult.results?.length || 0;
      }
    });
    return counts;
  }, [selectedEvent]);

  const handleAddDivision = () => {
    if (!selectedEvent) return;
    const newDivision: Division = 'New';
    setSelectedDivision(newDivision);
    setSelectedType(null);
    setDriverResults([]);
  };

  const handleAddType = () => {
    setIsTypeModalOpen(true);
  };

  const handleTypeModalSubmit = () => {
    if (newTypeName && newTypeName.trim() && selectedRaceType) {
      const raceName = `${newTypeName.trim()} - ${selectedRaceType}`;
      // Use functional update to ensure we're working with the latest types value
      setTypes((prevTypes) => {
        // Check if this race name already exists
        if (prevTypes.includes(raceName)) {
          return prevTypes; // Don't add duplicates
        }
        return [...prevTypes, raceName];
      });
      setSelectedType(raceName);
      setNewTypeName('');
      setSelectedRaceType('qualification');
      setIsTypeModalOpen(false);
      // Reset the load flag so empty spreadsheet will be shown
      shouldLoadResultsRef.current = true;
    }
  };

  const handleTypeModalCancel = () => {
    setNewTypeName('');
    setIsTypeModalOpen(false);
  };

  const handleDeleteType = async (typeName: string) => {
    if (!confirm(`Are you sure you want to delete the race name "${typeName}"? This will also delete all race results for this race type.`)) {
      return;
    }
    
    if (!selectedEvent) return;
    
    // Extract race type from typeName (e.g., "Race Name - qualification" -> "qualification")
    const match = typeName.match(/- (\w+)$/);
    const raceType = match ? match[1] : null;
    
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
    
    setTypes(types.filter((t) => t !== typeName));
    if (selectedType === typeName) {
      setSelectedType(null);
      setDriverResults([]);
    }
    
    // Refresh race results for the selected event
    if (selectedEvent) {
      const refreshedResults = await fetchRaceResults(selectedEvent.id);
      setSelectedEvent({ ...selectedEvent, results: refreshedResults });
    }
  };

  const handleUpdateDriverResult = (index: number, field: keyof DriverRaceResult, value: string | number, forceAddRow = false) => {
    setDriverResults((prev) => {
      let updated = [...prev];
      
      // Ensure the array is large enough
      while (updated.length <= index) {
        updated.push({
          driverId: `temp-${Date.now()}-${updated.length}`,
          driverAlias: '',
          driverName: '',
          kartNumber: '',
          gridPosition: updated.length + 1,
          position: updated.length + 1,
          overallPosition: updated.length + 1,
          fastestLap: '',
          points: 0,
        });
      }
      
      // Update the specific field
      updated[index] = { ...updated[index], [field]: value };
      
      // Auto-add new row if editing the last row and it has data, or if forceAddRow is true
      const isLastRow = index === updated.length - 1;
      const hasData = value && (value.toString().trim().length > 0);
      
      if (isLastRow && (hasData || forceAddRow)) {
        const newResult: DriverRaceResult = {
          driverId: `temp-${Date.now()}-${updated.length}`,
          driverAlias: '',
          driverName: '',
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
  
  // Batch update function for multiple fields at once
  const handleBatchUpdateDriverResult = (index: number, updates: Partial<DriverRaceResult>, forceAddRow = false) => {
    setDriverResults((prev) => {
      let updated = [...prev];
      
      // Ensure the array is large enough
      while (updated.length <= index) {
        updated.push({
          driverId: `temp-${Date.now()}-${updated.length}`,
          driverAlias: '',
          driverName: '',
          kartNumber: '',
          gridPosition: updated.length + 1,
          position: updated.length + 1,
          overallPosition: updated.length + 1,
          fastestLap: '',
          points: 0,
        });
      }
      
      // Update all fields at once
      updated[index] = { ...updated[index], ...updates };
      
      // Auto-add new row if editing the last row and it has data, or if forceAddRow is true
      const isLastRow = index === updated.length - 1;
      const hasData = Object.values(updates).some(v => v && v.toString().trim().length > 0);
      
      if (isLastRow && (hasData || forceAddRow)) {
        const newResult: DriverRaceResult = {
          driverId: `temp-${Date.now()}-${updated.length}`,
          driverAlias: '',
          driverName: '',
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
    return selectedEvent.results?.find((r) => r.division === selectedDivision)?.results || [];
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
      // Extract raceType from selectedType (e.g., "Race 1 (qualification)" -> "qualification")
      if (!selectedType) {
        alert('Please select a race type before saving.');
        return;
      }
      
      const match = selectedType.match(/- (\w+)$/);
      const raceType = match ? match[1] : 'qualification';
      
      // Determine if there's a heat race (check if there are multiple race types for this round)
      const hasHeatRace = types.length > 1 || raceType === 'heat';
      
      // VALIDATION: Check for duplicate drivers in the same race
      const driverIds = new Set<string>();
      const duplicateDrivers: string[] = [];
      
      for (const result of validResults) {
        // Try to find driver by name or alias
        const driver = drivers.find(
          (d) =>
            d.name?.toLowerCase() === result.driverName?.toLowerCase().trim() ||
            d.name?.toLowerCase() === result.driverAlias?.toLowerCase().trim() ||
            `${d.firstName} ${d.lastName}`.toLowerCase().trim() === result.driverName?.toLowerCase().trim() ||
            d.firstName?.toLowerCase() === result.driverName?.toLowerCase().trim() ||
            d.lastName?.toLowerCase() === result.driverName?.toLowerCase().trim() ||
            d.alias?.toLowerCase() === result.driverAlias?.toLowerCase().trim() ||
            d.alias?.toLowerCase() === result.driverName?.toLowerCase().trim()
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
          // Try to find driver by name or alias - VALIDATION: must exist
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
                d.alias?.toLowerCase() === result.driverAlias?.toLowerCase().trim() ||
                d.alias?.toLowerCase() === result.driverName?.toLowerCase().trim()
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
              // If name matches but we have alias in driver, use it
              result.driverAlias = driver.name;
            } else if (result.driverAlias && !result.driverName) {
              // If alias provided, use driver name
              result.driverName = driver.name;
            }
          }
          
          // Calculate points based on position and race type
          const position = result.position || 0;
          const calculatedPoints = position > 0
            ? getPointsForPosition(position, raceType as 'qualification' | 'heat' | 'final', hasHeatRace || false)
            : (result.points || 0);
          
          return {
            roundId: selectedEvent.id,
            driverId: driverId,
            division: selectedDivision,
            position: position,
            fastestLap: result.fastestLap || '',
            points: calculatedPoints,
            raceType: raceType,
            raceName: selectedType, // Save the full race name (e.g., "Race 1 (qualification)")
          };
        })
      );
      
      // Save each result to the API - use PUT if result already exists, POST if new
      const savePromises = resultsToSave.map(async (result) => {
        // Check if this result already exists in the saved results from the event
        // We need to check by roundId, driverId, division, and raceType
        let existingResult = null;
        if (selectedEvent?.results) {
          const divisionResult = selectedEvent.results.find((r: any) => r.division === selectedDivision);
          if (divisionResult && divisionResult.results) {
            existingResult = divisionResult.results.find((r: any) => 
              r.driverId === result.driverId && 
              r.raceType === result.raceType
            );
          }
        }
        
        if (existingResult && result.driverId && !result.driverId.startsWith('temp-')) {
          // Update existing result
          return fetch(`/api/race-results?roundId=${result.roundId}&driverId=${result.driverId}`, {
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
        
        // Refresh race results for the selected event
        if (selectedEvent) {
          const refreshedResults = await fetchRaceResults(selectedEvent.id);
          setSelectedEvent({ ...selectedEvent, results: refreshedResults });
          
          // Extract race types from refreshed results and populate types array
          if (selectedDivision) {
            const divisionResult = refreshedResults.find((r: any) => r.division === selectedDivision);
            if (divisionResult && divisionResult.results) {
              // Get unique race types from results
              const uniqueRaceTypes = new Set<string>();
              
              // First, preserve existing types that are in the types array
              types.forEach(type => uniqueRaceTypes.add(type));
              
              // Then, add race types from saved results
              divisionResult.results.forEach((result: any) => {
                if (result.raceType) {
                  // Check if we already have a type with this raceType
                  const hasMatchingType = Array.from(uniqueRaceTypes).some(type => 
                    type.includes(`(${result.raceType})`)
                  );
                  
                  if (!hasMatchingType) {
                    // Create race name format: "Race Type (raceType)"
                    const raceTypeName = result.raceType.charAt(0).toUpperCase() + result.raceType.slice(1);
                    const raceName = `${raceTypeName} (${result.raceType})`;
                    uniqueRaceTypes.add(raceName);
                  }
                }
              });
              
              // Update types array with unique race types found in results
              const existingTypes = Array.from(uniqueRaceTypes);
              setTypes(existingTypes);
              
              // If we have a selectedType, keep it; otherwise select the first one
              if (selectedType && existingTypes.includes(selectedType)) {
                // Keep the current selection
              } else if (existingTypes.length > 0) {
                setSelectedType(existingTypes[0]);
              }
            }
            
            // Reload driver results for the current division and selected type
            const divisionResults = refreshedResults.find((r: any) => r.division === selectedDivision)?.results || [];
            
            // Filter by selected type if one is selected
            let filteredResults = divisionResults;
            if (selectedType) {
              // Extract race type from selectedType (e.g., "Race Name (qualification)" -> "qualification")
              const match = selectedType.match(/\((\w+)\)$/);
              const typeRaceType = match ? match[1] : null;
              if (typeRaceType) {
                filteredResults = divisionResults.filter((r: any) => r.raceType === typeRaceType);
              }
            }
            
            setDriverResults([...filteredResults]);
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
    <Header hideSearch />
      <div className="p-4 md:p-6">
      <div className="max-w-[95%] mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-6">
          Races Management
        </h1>
        <div className="grid grid-cols-12 gap-6 mb-6">
          {/* Panel 1: Event */}
          <div className="col-span-4 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-2 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Event</h2>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
              {races.length > 0 ? (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {races.map((race) => (
                    <div
                      key={race.id}
                    onClick={async () => {
                      // Fetch race results for this round
                      const results = await fetchRaceResults(race.id);
                      setSelectedEvent({ ...race, results });
                      setSelectedDivision('Division 1');
                      setSelectedType(null);
                      setDriverResults([]);
                      // Reset the load flag so types will be loaded from results
                      shouldLoadResultsRef.current = true;
                      // Don't clear types here - let the useEffect populate them from results
                    }}
                      className={`p-2 cursor-pointer transition-colors ${
                        selectedEvent?.id === race.id
                          ? 'bg-primary-50 dark:bg-primary-900/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                        {race.name}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                        Round {race.roundNumber || race.round}
                      </p>
                      {race.date && (
                        <p className="text-sm text-slate-500 dark:text-slate-500 mt-0.5">
                          {new Date(race.date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                  No rounds available
                </div>
              )}
            </div>
          </div>

          {/* Panel 2: Division */}
          <div className="col-span-4 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-2 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Division</h2>
            </div>
            <div className="p-2">
              {selectedEvent ? (
                <div className="space-y-1">
                  {availableDivisions.map((division) => {
                    // Handle "Open" division by checking results from Division 3, 4, and New
                    let hasResults = false;
                    let racerCount = 0;
                    
                    if (division === 'Open') {
                      hasResults = selectedEvent.results?.some((r) => openDivisions.includes(r.division)) || false;
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
                            setSelectedType(null);
                            const divisionResults = selectedEvent.results?.find((r) => r.division === firstOpenDiv)?.results || [];
                            setDriverResults([...divisionResults]);
                            setTypes([]);
                          } else {
                            setSelectedDivision(division as Division);
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
                          {racerCount} racers
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

          {/* Panel 3: Race Name */}
          <div className="col-span-4 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Race Name</h2>
              <button
                onClick={handleAddType}
                className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-md text-xs font-medium"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            <div className="p-2">
              {selectedEvent && selectedDivision ? (
                <div className="space-y-1">
                  {types.length > 0 ? (
                    types.map((type) => (
                      <div
                        key={type}
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
                        <span className="flex-1 font-medium">
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
                    ))
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

        </div>

        {/* Race Results Panel - Moved to Bottom */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Race Results</h2>
              {selectedEvent && selectedDivision && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {selectedEvent.name} • Round {selectedEvent.roundNumber || selectedEvent.round} • {selectedDivision}
                </p>
              )}
            </div>
            {selectedEvent && selectedDivision && selectedType && (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-md text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
            {selectedEvent && selectedDivision && selectedType ? (
              <SpreadsheetTable
                division={selectedDivision}
                type={selectedType}
                results={driverResults}
                onUpdate={handleUpdateDriverResult}
                onBatchUpdate={handleBatchUpdateDriverResult}
                drivers={drivers}
              />
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
        </div>
      </div>
    </div>

    {/* Race Name Modal */}
    {isTypeModalOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            Add Race Name
          </h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Race Name
            </label>
            <input
              type="text"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleTypeModalSubmit();
                } else if (e.key === 'Escape') {
                  handleTypeModalCancel();
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary mb-3"
              placeholder="Enter race name"
              autoFocus
            />
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Race Type
            </label>
            <select
              value={selectedRaceType}
              onChange={(e) => setSelectedRaceType(e.target.value as 'qualification' | 'heat' | 'final')}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="qualification">Qual</option>
              <option value="heat">Heat</option>
              <option value="final">Final</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleTypeModalCancel}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleTypeModalSubmit}
              className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-md"
            >
              Add
            </button>
          </div>
        </div>
      </div>
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
  drivers,
}: {
  division: Division;
  type: string | null;
  results: DriverRaceResult[];
  onUpdate: (index: number, field: keyof DriverRaceResult, value: string | number, forceAddRow?: boolean) => void;
  onBatchUpdate?: (index: number, updates: Partial<DriverRaceResult>, forceAddRow?: boolean) => void;
  drivers: any[];
}) {
  const [suggestions, setSuggestions] = useState<Record<number, any[]>>({});
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<Record<number, number>>({});
  const [showSuggestions, setShowSuggestions] = useState<Record<number, boolean>>({});
  
  // Determine if this is a qualification race
  const isQualification = type?.toLowerCase().includes('qual') || type?.toLowerCase().includes('qualification');
  
  // Default to 20 rows
  const defaultRows: DriverRaceResult[] = Array.from({ length: 20 }, (_, i) => ({
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
  const rowsToDisplay = [...defaultRows];
  results.forEach((result, index) => {
    if (index < 20) {
      rowsToDisplay[index] = result;
    }
  });

  // Function to get matching drivers based on input
  const getMatchingDrivers = (input: string): any[] => {
    if (!input || input.trim().length < 1) return [];
    
    const lowerInput = input.toLowerCase().trim();
    return drivers.filter((driver) => {
      const nameMatch = driver.name?.toLowerCase().includes(lowerInput);
      const firstNameMatch = driver.firstName?.toLowerCase().includes(lowerInput);
      const lastNameMatch = driver.lastName?.toLowerCase().includes(lowerInput);
      const fullNameMatch = `${driver.firstName || ''} ${driver.lastName || ''}`.toLowerCase().trim().includes(lowerInput);
      const aliasMatch = driver.alias?.toLowerCase().includes(lowerInput);
      const aliasesMatch = driver.aliases?.some((a: string) => a.toLowerCase().includes(lowerInput));
      
      return nameMatch || firstNameMatch || lastNameMatch || fullNameMatch || aliasMatch || aliasesMatch;
    }).slice(0, 10); // Limit to 10 suggestions
  };

  // Handle driver name input change
  const handleDriverNameChange = (index: number, value: string) => {
    onUpdate(index, 'driverName', value);
    
    // Get matching drivers for suggestions
    const matches = getMatchingDrivers(value);
    setSuggestions(prev => ({ ...prev, [index]: matches }));
    setShowSuggestions(prev => ({ ...prev, [index]: matches.length > 0 && value.trim().length > 0 }));
    setActiveSuggestionIndex(prev => ({ ...prev, [index]: -1 }));
    
    // Don't auto-fill - let user choose from dropdown
  };

  // Handle suggestion selection (driver + optional alias)
  const handleSuggestionSelect = (index: number, driver: any, selectedAlias?: string) => {
    // Batch all updates together to ensure they're applied
    const driverName = driver.name || `${driver.firstName || ''} ${driver.lastName || ''}`.trim();
    
    // Determine alias to use
    let aliasToUse = '';
    if (selectedAlias) {
      aliasToUse = selectedAlias;
    } else if (driver.alias) {
      aliasToUse = driver.alias;
    } else if (driver.aliases && driver.aliases.length > 0) {
      aliasToUse = driver.aliases[0];
    }
    
    // Use batch update if available, otherwise fall back to individual updates
    if (onBatchUpdate) {
      const updates: Partial<DriverRaceResult> = {
        driverName: driverName,
      };
      
      if (aliasToUse) {
        updates.driverAlias = aliasToUse;
      }
      
      if (driver.division) {
        updates.division = driver.division;
      }
      
      if (driver.id) {
        updates.driverId = driver.id;
      }
      
      onBatchUpdate(index, updates);
    } else {
      // Fallback to individual updates
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
    setTimeout(() => {
      const nextFieldIndex = fields.indexOf('driverName') + 1;
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
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Race Results - {division}{type ? ` - ${type}` : ''}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-slate-300 dark:border-slate-600">
          <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0">
            <tr>
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
                <td className="px-3 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                  <div className="relative">
                    <input
                      type="text"
                      value={result.driverName || ''}
                      onChange={(e) => handleDriverNameChange(index, e.target.value)}
                      onFocus={() => {
                        const matches = getMatchingDrivers(result.driverName || '');
                        if (matches.length > 0) {
                          setShowSuggestions(prev => ({ ...prev, [index]: true }));
                          setSuggestions(prev => ({ ...prev, [index]: matches }));
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding suggestions to allow clicking on them
                        setTimeout(() => {
                          setShowSuggestions(prev => ({ ...prev, [index]: false }));
                        }, 200);
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
                        } else if (e.key === 'Enter' && currentIndex >= 0 && currentSuggestions[currentIndex]) {
                          e.preventDefault();
                          handleSuggestionSelect(index, currentSuggestions[currentIndex]);
                        } else if (e.key === 'Tab') {
                          e.preventDefault();
                          setShowSuggestions(prev => ({ ...prev, [index]: false }));
                          const nextFieldIndex = fields.indexOf('driverName') + 1;
                          if (nextFieldIndex < fields.length) {
                            const nextInput = document.querySelector(
                              `input[data-row="${index}"][data-field="${fields[nextFieldIndex]}"]`
                            ) as HTMLInputElement;
                            nextInput?.focus();
                          } else if (index < rowsToDisplay.length - 1) {
                            const nextRowInput = document.querySelector(
                              `input[data-row="${index + 1}"][data-field="driverName"]`
                            ) as HTMLInputElement;
                            nextRowInput?.focus();
                          }
                        } else if (e.key === 'Enter' && !currentSuggestions.length) {
                          e.preventDefault();
                          if (index < rowsToDisplay.length - 1) {
                            const nextRowInput = document.querySelector(
                              `input[data-row="${index + 1}"][data-field="driverName"]`
                            ) as HTMLInputElement;
                            nextRowInput?.focus();
                          }
                        }
                      }}
                      data-row={index}
                      data-field="driverName"
                      className="w-full px-2 py-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:ring-1 focus:ring-blue-500"
                      placeholder="Name"
                    />
                    {showSuggestions[index] && (suggestions[index] || []).length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl shadow-lg max-h-80 overflow-y-auto">
                        {(suggestions[index] || []).map((driver, suggestionIndex) => {
                          const driverAliases = driver.aliases || (driver.alias ? [driver.alias] : []);
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
                                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getDivisionColor(driver.division)}`}>
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
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                  <input
                    type="text"
                    value={result.driverAlias || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      onUpdate(index, 'driverAlias', value);
                      // Auto-fill driver name if alias matches a driver
                      const matchingDriver = drivers.find(d => 
                        d.alias?.toLowerCase() === value.toLowerCase().trim() || 
                        d.name?.toLowerCase() === value.toLowerCase().trim()
                      );
                      if (matchingDriver && !result.driverName) {
                        onUpdate(index, 'driverName', matchingDriver.name);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const nextFieldIndex = fields.indexOf('driverAlias') + 1;
                        if (nextFieldIndex < fields.length) {
                          const nextInput = document.querySelector(
                            `input[data-row="${index}"][data-field="${fields[nextFieldIndex]}"]`
                          ) as HTMLInputElement;
                          nextInput?.focus();
                        } else if (index < rowsToDisplay.length - 1) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="driverName"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        }
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (index < rowsToDisplay.length - 1) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="driverAlias"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        }
                      }
                    }}
                    data-row={index}
                    data-field="driverAlias"
                    className="w-full px-2 py-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:ring-1 focus:ring-blue-500"
                    placeholder="Alias"
                  />
                </td>
                <td className="px-3 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                  <div className="relative">
                    <select
                      value={result.division || division}
                      onChange={(e) => onUpdate(index, 'division', e.target.value as Division)}
                      data-row={index}
                      data-field="division"
                      className={`w-full px-3 py-1.5 rounded-full border-none outline-none text-xs font-semibold transition-all duration-200 cursor-pointer appearance-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${getDivisionColor((result.division || division) as Division)} bg-slate-200/50 dark:bg-slate-700/50 backdrop-blur-sm [&>option]:bg-white [&>option]:dark:bg-slate-800 [&>option]:text-slate-900 [&>option]:dark:text-white [&>option]:font-normal`}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.5em 1.5em',
                        paddingRight: '2.5rem'
                      }}
                    >
                      <option value="Division 1" style={{ backgroundColor: 'inherit' }}>Division 1</option>
                      <option value="Division 2" style={{ backgroundColor: 'inherit' }}>Division 2</option>
                      <option value="Division 3" style={{ backgroundColor: 'inherit' }}>Division 3</option>
                      <option value="Division 4" style={{ backgroundColor: 'inherit' }}>Division 4</option>
                      <option value="New" style={{ backgroundColor: 'inherit' }}>New</option>
                    </select>
                  </div>
                </td>
                <td className="px-3 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                  <input
                    type="text"
                    value={result.kartNumber || ''}
                    onChange={(e) => onUpdate(index, 'kartNumber', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        if (index === rowsToDisplay.length - 1) {
                          onUpdate(index, 'kartNumber', result.kartNumber || '', true);
                        }
                        const nextFieldIndex = fields.indexOf('kartNumber') + 1;
                        if (nextFieldIndex < fields.length) {
                          const nextInput = e.currentTarget.parentElement?.parentElement?.querySelector(
                            `input[data-field="${fields[nextFieldIndex]}"]`
                          ) as HTMLInputElement;
                          nextInput?.focus();
                        } else if (index < rowsToDisplay.length - 1) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="driverAlias"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        }
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (index < rowsToDisplay.length - 1) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="kartNumber"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        } else {
                          onUpdate(index, 'kartNumber', result.kartNumber || '', true);
                          setTimeout(() => {
                            const newRowInput = document.querySelector(
                              `input[data-row="${index + 1}"][data-field="kartNumber"]`
                            ) as HTMLInputElement;
                            newRowInput?.focus();
                          }, 0);
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
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            if (index === rowsToDisplay.length - 1) {
                              onUpdate(index, 'gridPosition', result.gridPosition || 0, true);
                            }
                            const nextFieldIndex = fields.indexOf('gridPosition') + 1;
                            if (nextFieldIndex < fields.length) {
                              const nextInput = e.currentTarget.parentElement?.parentElement?.querySelector(
                                `input[data-field="${fields[nextFieldIndex]}"]`
                              ) as HTMLInputElement;
                              nextInput?.focus();
                            } else if (index < rowsToDisplay.length - 1) {
                              const nextRowInput = document.querySelector(
                                `input[data-row="${index + 1}"][data-field="driverAlias"]`
                              ) as HTMLInputElement;
                              nextRowInput?.focus();
                            }
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (index < rowsToDisplay.length - 1) {
                              const nextRowInput = document.querySelector(
                                `input[data-row="${index + 1}"][data-field="gridPosition"]`
                              ) as HTMLInputElement;
                              nextRowInput?.focus();
                            } else {
                              onUpdate(index, 'gridPosition', result.gridPosition || 0, true);
                              setTimeout(() => {
                                const newRowInput = document.querySelector(
                                  `input[data-row="${index + 1}"][data-field="gridPosition"]`
                                ) as HTMLInputElement;
                                newRowInput?.focus();
                              }, 0);
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
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            if (index === rowsToDisplay.length - 1) {
                              onUpdate(index, 'overallPosition', result.overallPosition || 0, true);
                            }
                            const nextFieldIndex = fields.indexOf('overallPosition') + 1;
                            if (nextFieldIndex < fields.length) {
                              const nextInput = e.currentTarget.parentElement?.parentElement?.querySelector(
                                `input[data-field="${fields[nextFieldIndex]}"]`
                              ) as HTMLInputElement;
                              nextInput?.focus();
                            } else if (index < rowsToDisplay.length - 1) {
                              const nextRowInput = document.querySelector(
                                `input[data-row="${index + 1}"][data-field="driverAlias"]`
                              ) as HTMLInputElement;
                              nextRowInput?.focus();
                            }
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (index < rowsToDisplay.length - 1) {
                              const nextRowInput = document.querySelector(
                                `input[data-row="${index + 1}"][data-field="overallPosition"]`
                              ) as HTMLInputElement;
                              nextRowInput?.focus();
                            } else {
                              onUpdate(index, 'overallPosition', result.overallPosition || 0, true);
                              setTimeout(() => {
                                const newRowInput = document.querySelector(
                                  `input[data-row="${index + 1}"][data-field="overallPosition"]`
                                ) as HTMLInputElement;
                                newRowInput?.focus();
                              }, 0);
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
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        if (index === rowsToDisplay.length - 1) {
                          onUpdate(index, 'fastestLap', result.fastestLap || '', true);
                        }
                        // Last field, move to next row first field
                        if (index < rowsToDisplay.length - 1) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="driverAlias"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        }
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (index < rowsToDisplay.length - 1) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="fastestLap"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        } else {
                          onUpdate(index, 'fastestLap', result.fastestLap || '', true);
                          setTimeout(() => {
                            const newRowInput = document.querySelector(
                              `input[data-row="${index + 1}"][data-field="fastestLap"]`
                            ) as HTMLInputElement;
                            newRowInput?.focus();
                          }, 0);
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