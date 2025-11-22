'use client';

import { useState, useMemo, useEffect } from 'react';
import Header from '@/components/Header';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import { useSeason } from '@/components/SeasonContext';
import { Driver, Division } from '@/types';
import { Search, Check, X, Loader2, ChevronDown, ShieldCheck, Users, Sparkles, Calendar, History, Plus, Trash2, Edit2, Square, CheckSquare } from 'lucide-react';
import RoundPointsEditModal from '@/components/RoundPointsEditModal';

interface PendingDivisionChange {
  driverId: string;
  driverName: string;
  currentDivision: Division;
  newDivision: Division;
  type: 'promotion' | 'demotion';
}

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
      return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
  }
};

// Helper function to get division gradient
const getDivisionGradient = (division: Division) => {
  switch (division) {
    case 'Division 1':
      return 'from-blue-500 via-blue-600 to-blue-700';
    case 'Division 2':
      return 'from-pink-500 via-pink-600 to-rose-600';
    case 'Division 3':
      return 'from-orange-500 via-orange-600 to-amber-600';
    case 'Division 4':
      return 'from-yellow-500 via-yellow-600 to-amber-600';
    case 'New':
      return 'from-purple-500 via-purple-600 to-indigo-600';
    default:
      return 'from-slate-500 to-slate-600';
  }
};

// Helper function to get division colors for select dropdown
const getDivisionSelectColors = (division: Division) => {
  switch (division) {
    case 'Division 1':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900',
        text: 'text-blue-800 dark:text-blue-200',
        border: 'border-blue-300 dark:border-blue-700'
      };
    case 'Division 2':
      return {
        bg: 'bg-pink-100 dark:bg-pink-900',
        text: 'text-pink-800 dark:text-pink-200',
        border: 'border-pink-300 dark:border-pink-700'
      };
    case 'Division 3':
      return {
        bg: 'bg-orange-100 dark:bg-orange-900',
        text: 'text-orange-800 dark:text-orange-200',
        border: 'border-orange-300 dark:border-orange-700'
      };
    case 'Division 4':
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-900',
        text: 'text-yellow-800 dark:text-yellow-200',
        border: 'border-yellow-300 dark:border-yellow-700'
      };
    case 'New':
      return {
        bg: 'bg-purple-100 dark:bg-purple-900',
        text: 'text-purple-800 dark:text-purple-200',
        border: 'border-purple-300 dark:border-purple-700'
      };
    default:
      return {
        bg: 'bg-white dark:bg-slate-800',
        text: 'text-slate-900 dark:text-white',
        border: 'border-slate-300 dark:border-slate-700'
      };
  }
};

// Helper function to get round display name, handling pre-season
const getRoundDisplayName = (roundId: string, rounds: any[]): string => {
  if (roundId.startsWith('pre-season-')) {
    return 'Pre-Season';
  }
  const round = rounds.find(r => r.id === roundId);
  if (round) {
    return `Round ${round.roundNumber}${round.location ? ` - ${round.location}` : ''}`;
  }
  return 'Unknown Round';
};

export default function DivisionsPage() {
  const { selectedSeason } = useSeason();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<Division | 'all'>('all');
  const [pendingChanges, setPendingChanges] = useState<PendingDivisionChange[]>([]);
  const [pointsModalOpen, setPointsModalOpen] = useState(false);
  const [selectedChange, setSelectedChange] = useState<PendingDivisionChange | null>(null);
  const [divisionChanges, setDivisionChanges] = useState<any[]>([]);
  const [updatingDriverId, setUpdatingDriverId] = useState<string | null>(null);
  const [showRoundSelectModal, setShowRoundSelectModal] = useState(false);
  const [pendingDivisionUpdate, setPendingDivisionUpdate] = useState<{driverId: string, driverName: string, oldDivision: Division, newDivision: Division} | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [showDivisionChangeModal, setShowDivisionChangeModal] = useState(false);
  const [selectedDriverForChange, setSelectedDriverForChange] = useState<{id: string, name: string, currentDivision: Division} | null>(null);
  const [editingDivisionChange, setEditingDivisionChange] = useState<any | null>(null);
  const [showDivisionHistoryModal, setShowDivisionHistoryModal] = useState(false);
  const [selectedDriverHistory, setSelectedDriverHistory] = useState<{id: string, name: string} | null>(null);
  const [selectedDriverIds, setSelectedDriverIds] = useState<Set<string>>(new Set());
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditRoundId, setBulkEditRoundId] = useState<string>('');
  const [bulkEditFromDivision, setBulkEditFromDivision] = useState<Division | ''>('');
  const [bulkEditToDivision, setBulkEditToDivision] = useState<Division | ''>('');
  const [bulkEditChangeType, setBulkEditChangeType] = useState<'promotion' | 'demotion' | 'division_start' | 'mid_season_join'>('promotion');
  const [bulkEditDivisionStart, setBulkEditDivisionStart] = useState<Division | ''>('');
  const [bulkSaving, setBulkSaving] = useState(false);

  // Fetch drivers from API
  useEffect(() => {
    const fetchDrivers = async () => {
      if (!selectedSeason) {
        setDrivers([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`);
        if (response.ok) {
          const data = await response.json();
          setDrivers(data);
        }
      } catch (error) {
        console.error('Failed to fetch drivers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, [selectedSeason]);

  // Listen for driver updates (e.g., when a driver is deleted)
  useEffect(() => {
    const handleDriversUpdated = async () => {
      if (!selectedSeason) return;
      
      try {
        const response = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`);
        if (response.ok) {
          const data = await response.json();
          setDrivers(data);
        }
      } catch (error) {
        console.error('Failed to refresh drivers:', error);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('vhkc:drivers-updated', handleDriversUpdated);
      return () => {
        window.removeEventListener('vhkc:drivers-updated', handleDriversUpdated);
      };
    }
  }, [selectedSeason]);

  // Fetch rounds from API
  useEffect(() => {
    const fetchRounds = async () => {
      if (!selectedSeason) {
        setRounds([]);
        return;
      }

      try {
        const response = await fetch(`/api/rounds?seasonId=${selectedSeason.id}`);
        if (response.ok) {
          const data = await response.json();
          setRounds(data);
        }
      } catch (error) {
        console.error('Failed to fetch rounds:', error);
      }
    };

    fetchRounds();
  }, [selectedSeason]);

  // Fetch division changes from API
  useEffect(() => {
    const fetchDivisionChanges = async () => {
      if (!selectedSeason) {
        setDivisionChanges([]);
        return;
      }

      try {
        const response = await fetch(`/api/division-changes?seasonId=${selectedSeason.id}`);
        if (response.ok) {
          const data = await response.json();
          setDivisionChanges(data);
        }
      } catch (error) {
        console.error('Failed to fetch division changes:', error);
      }
    };

    fetchDivisionChanges();
  }, [selectedSeason]);

  const filteredDrivers = useMemo(() => {
    const filtered = drivers.filter((driver) => {
      const matchesSearch = driver.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDivision = divisionFilter === 'all' || driver.division === divisionFilter;
      return matchesSearch && matchesDivision;
    });
    
    // Sort by division when "all" is selected
    if (divisionFilter === 'all') {
      const divisionOrder: Division[] = ['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New'];
      return filtered.sort((a, b) => {
        const aIndex = divisionOrder.indexOf(a.division);
        const bIndex = divisionOrder.indexOf(b.division);
        return aIndex - bIndex;
      });
    }
    
    return filtered;
  }, [drivers, searchQuery, divisionFilter]);

  const handleDivisionChange = (driverId: string, newDiv: Division, isCurrentDivision: boolean = false) => {
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) return;

    // Don't add if the division is the same
    if (driver.division === newDiv) {
      // Remove from pending changes if it exists
      setPendingChanges(pendingChanges.filter((p) => p.driverId !== driverId));
      return;
    }

    // If changing current division directly, show round selection modal
    if (isCurrentDivision) {
      setPendingDivisionUpdate({
        driverId,
        driverName: driver.name,
        oldDivision: driver.division,
        newDivision: newDiv
      });
      // Set default based on division - if "New", default to pre-season; otherwise latest round
      if (selectedSeason) {
        const preSeasonRoundId = `pre-season-${selectedSeason.id}`;
        const sortedRounds = [...rounds].sort((a, b) => (b.roundNumber || 0) - (a.roundNumber || 0));
        const defaultRoundId = driver.division === 'New' && preSeasonRoundId 
          ? preSeasonRoundId 
          : (sortedRounds.length > 0 ? sortedRounds[0].id : preSeasonRoundId);
        setSelectedRoundId(defaultRoundId);
      } else {
        const sortedRounds = [...rounds].sort((a, b) => (b.roundNumber || 0) - (a.roundNumber || 0));
        setSelectedRoundId(sortedRounds.length > 0 ? sortedRounds[0].id : '');
      }
      setShowRoundSelectModal(true);
      return;
    }

    // Determine if it's a promotion or demotion
    // Use numeric order for consistency: New=5 (lowest), Division 1=1 (highest)
    const divisionOrder: Partial<Record<Division, number>> = {
      'Division 1': 1,  // Highest division
      'Division 2': 2,
      'Division 3': 3,
      'Division 4': 4,
      'New': 5,         // Lowest division (newest drivers)
    };
    const currentDivision = driver.division as Division;
    const newDivision = newDiv as Division;
    const currentOrder = divisionOrder[currentDivision] ?? 5;
    const newOrder = divisionOrder[newDivision] ?? 5;
    // Promotion: moving to a lower number (better division)
    const type = newOrder < currentOrder ? 'promotion' : 'demotion';

    // Check if this driver already has a pending change
    const existingIndex = pendingChanges.findIndex((p) => p.driverId === driverId);
    
    const change: PendingDivisionChange = {
      driverId,
      driverName: driver.name,
      currentDivision: driver.division,
      newDivision: newDiv,
      type,
    };
    
    if (existingIndex >= 0) {
      // Update existing pending change
      const updated = [...pendingChanges];
      updated[existingIndex] = change;
      setPendingChanges(updated);
    } else {
      // Add new pending change
      setPendingChanges([...pendingChanges, change]);
    }
  };

  const handleCurrentDivisionChange = async () => {
    if (!pendingDivisionUpdate || !selectedSeason || !selectedRoundId) {
      if (!selectedRoundId) {
        alert('Please select a round');
      }
      return;
    }
    
    const roundId = selectedRoundId;

    const { driverId, driverName, oldDivision, newDivision } = pendingDivisionUpdate;

    try {
      setUpdatingDriverId(driverId);

      // Determine change type
      // New is the lowest division (5), Division 1 is the highest (1)
      // Moving from higher number to lower number = promotion
      const divisionOrder: Partial<Record<Division, number>> = {
        'Division 1': 1,  // Highest division
        'Division 2': 2,
        'Division 3': 3,
        'Division 4': 4,
        'New': 5,         // Lowest division (newest drivers)
      };
      const fromOrder = divisionOrder[oldDivision] ?? 5;
      const toOrder = divisionOrder[newDivision] ?? 5;
      // Promotion: moving to a lower number (better division)
      // Demotion: moving to a higher number (worse division)
      const changeType = toOrder < fromOrder ? 'promotion' : 'demotion';

      // Fetch the driver
      const driverResponse = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`);
      if (!driverResponse.ok) throw new Error('Failed to fetch driver');
      const driversData = await driverResponse.json();
      const driver = driversData.find((d: any) => d.id === driverId);
      if (!driver) throw new Error('Driver not found');

      // Update driver division
      const updatedDriver = {
        ...driver,
        division: newDivision,
        lastUpdated: new Date().toISOString().split('T')[0],
      };

      const updateResponse = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDriver),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update driver division');
      }

      // Create division change record
      const changeId = `division-change-${driverId}-${Date.now()}`;
      const divisionChange = {
        id: changeId,
        seasonId: selectedSeason.id,
        roundId: roundId,
        driverId: driverId,
        driverName: driverName,
        fromDivision: oldDivision,
        toDivision: newDivision,
        changeType: changeType,
        createdAt: new Date().toISOString(),
      };

      const changeResponse = await fetch('/api/division-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(divisionChange),
      });

      if (!changeResponse.ok) {
        console.warn('Failed to save division change record');
      }

      // Refresh drivers and division changes
      const refreshedDriversResponse = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`);
      if (refreshedDriversResponse.ok) {
        const refreshedDrivers = await refreshedDriversResponse.json();
        setDrivers(refreshedDrivers);
      }

      // Refresh division changes
      const refreshedChangesResponse = await fetch(`/api/division-changes?seasonId=${selectedSeason.id}`);
      if (refreshedChangesResponse.ok) {
        const refreshedChanges = await refreshedChangesResponse.json();
        setDivisionChanges(refreshedChanges);
      }

      // Dispatch event to notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('vhkc:drivers-updated'));
      }

      // Remove from pending changes if exists
      setPendingChanges(pendingChanges.filter((p) => p.driverId !== driverId));

      setShowRoundSelectModal(false);
      setPendingDivisionUpdate(null);
      setSelectedRoundId('');
    } catch (error) {
      console.error('Failed to update current division:', error);
      alert('Failed to update current division. Please try again.');
    } finally {
      setUpdatingDriverId(null);
    }
  };

  const handleConfirmChange = (pendingChange: PendingDivisionChange) => {
    if (!selectedSeason) return;
    
    // Open the modal to edit round points
    setSelectedChange(pendingChange);
    setPointsModalOpen(true);
  };

  const handleModalSave = async () => {
    if (!selectedChange || !selectedSeason) return;

    // Refresh drivers list
    try {
      const response = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`);
      if (response.ok) {
        const data = await response.json();
        setDrivers(data);
      }
    } catch (error) {
      console.error('Failed to refresh drivers:', error);
    }

    // Remove from pending changes
    setPendingChanges(pendingChanges.filter((p) => p.driverId !== selectedChange.driverId));
    setSelectedChange(null);
  };

  const handleDeclineChange = (driverId: string) => {
    // Remove from pending changes without updating
    setPendingChanges(pendingChanges.filter((p) => p.driverId !== driverId));
  };

  const driversByDivision = useMemo(() => {
    const grouped: Partial<Record<Division, any[]>> = {
      'Division 1': [],
      'Division 2': [],
      'Division 3': [],
      'Division 4': [],
      'New': [],
    };
    drivers.forEach((driver: any) => {
      const division = driver.division as Division;
      if (grouped[division]) {
        grouped[division].push(driver);
      }
    });
    return grouped;
  }, [drivers]);

  const promotions = useMemo(() => {
    return pendingChanges.filter((p) => p.type === 'promotion');
  }, [pendingChanges]);

  const demotions = useMemo(() => {
    return pendingChanges.filter((p) => p.type === 'demotion');
  }, [pendingChanges]);

  // Bulk selection handlers
  const handleSelectDriver = (driverId: string) => {
    setSelectedDriverIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(driverId)) {
        newSet.delete(driverId);
      } else {
        newSet.add(driverId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedDriverIds.size === filteredDrivers.length) {
      setSelectedDriverIds(new Set());
    } else {
      setSelectedDriverIds(new Set(filteredDrivers.map(d => d.id)));
    }
  };

  // Helper to convert Set to Array for iteration
  const getSelectedDrivers = useMemo(() => {
    return drivers.filter(d => selectedDriverIds.has(d.id));
  }, [drivers, selectedDriverIds]);

  const handleBulkEdit = () => {
    if (selectedDriverIds.size === 0) {
      alert('Please select at least one driver');
      return;
    }
    
    // Set default values based on selected drivers
    const selectedDrivers = getSelectedDrivers;
    const divisions = Array.from(new Set(selectedDrivers.map(d => d.division as Division)));
    
    // Auto-select first round if available
    if (rounds.length > 0 && selectedSeason) {
      const sortedRounds = [...rounds].sort((a, b) => (b.roundNumber || 0) - (a.roundNumber || 0));
      setBulkEditRoundId(sortedRounds[0]?.id || `pre-season-${selectedSeason.id}`);
    } else if (selectedSeason) {
      setBulkEditRoundId(`pre-season-${selectedSeason.id}`);
    }
    
    // If all selected drivers are in the same division, pre-fill from division
    if (divisions.length === 1) {
      setBulkEditFromDivision(divisions[0]);
    } else {
      setBulkEditFromDivision('');
    }
    
    setBulkEditToDivision('');
    setBulkEditChangeType('promotion');
    setBulkEditDivisionStart('');
    setShowBulkEditModal(true);
  };

  const handleBulkSave = async () => {
    if (!selectedSeason || selectedDriverIds.size === 0) return;
    
    if (!bulkEditRoundId) {
      alert('Please select a round');
      return;
    }

    // Validate based on change type
    if (bulkEditChangeType === 'division_start' || bulkEditChangeType === 'mid_season_join') {
      if (!bulkEditDivisionStart) {
        alert('Please select division start');
        return;
      }
    } else {
      if (!bulkEditFromDivision || !bulkEditToDivision) {
        alert('Please select both from and to divisions');
        return;
      }
      if (bulkEditFromDivision === bulkEditToDivision) {
        alert('From division and to division must be different');
        return;
      }
    }

    try {
      setBulkSaving(true);
      const selectedDrivers = getSelectedDrivers;
      
      // Create division changes for each selected driver
      const promises = selectedDrivers.map(async (driver) => {
        const changeId = `div-change-${driver.id}-${Date.now()}-${Math.random()}`;
        const now = new Date().toISOString();
        
        let fromDivision: Division | null = bulkEditFromDivision || null;
        let toDivision: Division | null = bulkEditToDivision || null;
        let divisionStart: Division | null = bulkEditDivisionStart || null;
        let changeType = bulkEditChangeType;

        // If from/to not specified, determine from driver's current division
        if (bulkEditChangeType === 'promotion' || bulkEditChangeType === 'demotion') {
          if (!fromDivision) {
            fromDivision = driver.division;
          }
          if (!toDivision) {
            // Skip if no target division specified
            return null;
          }
          
          // Determine change type based on division order
          const divisionOrder: Partial<Record<Division, number>> = {
            'Division 1': 1,
            'Division 2': 2,
            'Division 3': 3,
            'Division 4': 4,
            'New': 5,
          };
          const fromOrder = fromDivision ? (divisionOrder[fromDivision] ?? 5) : 5;
          const toOrder = toDivision ? (divisionOrder[toDivision] ?? 5) : 5;
          changeType = toOrder < fromOrder ? 'promotion' : 'demotion';
        } else {
          // For division_start and mid_season_join, use divisionStart
          if (!divisionStart) {
            divisionStart = driver.division;
          }
        }

        const changeData = {
          id: changeId,
          seasonId: selectedSeason.id,
          roundId: bulkEditRoundId,
          driverId: driver.id,
          driverName: driver.name,
          fromDivision: (bulkEditChangeType === 'promotion' || bulkEditChangeType === 'demotion') ? (fromDivision || undefined) : undefined,
          toDivision: (bulkEditChangeType === 'promotion' || bulkEditChangeType === 'demotion') ? (toDivision || undefined) : undefined,
          divisionStart: (bulkEditChangeType === 'division_start' || bulkEditChangeType === 'mid_season_join') ? (divisionStart || undefined) : undefined,
          changeType: changeType,
          createdAt: now,
        };

        const response = await fetch('/api/division-changes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changeData),
        });

        if (!response.ok) {
          throw new Error(`Failed to save division change for ${driver.name}`);
        }

        // Update driver's current division if this is a promotion/demotion
        if (bulkEditChangeType === 'promotion' || bulkEditChangeType === 'demotion' && toDivision) {
          const updatedDriver = {
            ...driver,
            division: toDivision,
          };

          const driverResponse = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedDriver),
          });

          if (!driverResponse.ok) {
            console.error(`Failed to update driver ${driver.name}`);
          }
        }

        return changeData;
      });

      await Promise.all(promises.filter(p => p !== null));

      // Refresh data
      const divisionChangesResponse = await fetch(`/api/division-changes?seasonId=${selectedSeason.id}`);
      if (divisionChangesResponse.ok) {
        const data = await divisionChangesResponse.json();
        setDivisionChanges(data);
      }

      const driversResponse = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`);
      if (driversResponse.ok) {
        const driversData = await driversResponse.json();
        setDrivers(driversData);
      }

      // Notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('vhkc:drivers-updated'));
      }

      // Clear selection and close modal
      setSelectedDriverIds(new Set());
      setShowBulkEditModal(false);
      alert(`Successfully updated division changes for ${selectedDrivers.length} driver(s)`);
    } catch (error) {
      console.error('Failed to save bulk division changes:', error);
      alert('Failed to save division changes. Please try again.');
    } finally {
      setBulkSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header hideSearch />
        <div className="p-6">
          <div className="max-w-[95%] mx-auto">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                <p className="text-slate-600 dark:text-slate-400">Loading drivers...</p>
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
        title="Divisions Management"
        subtitle="Manage driver divisions and track performance changes"
        icon={ShieldCheck}
      >
        {/* Division Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {(['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New'] as Division[]).map(
            (division) => {
              const isSelected = divisionFilter === division;
              return (
                <button
                  key={division}
                  onClick={() => setDivisionFilter(isSelected ? 'all' : division)}
                  className={`p-6 rounded-2xl transition-all duration-300 hover:scale-105 ${
                    isSelected
                      ? `bg-gradient-to-br ${getDivisionGradient(division)} text-white shadow-lg ring-4 ring-white dark:ring-slate-800`
                      : 'glass shadow-modern hover:shadow-modern-lg'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-sm font-bold uppercase tracking-wider ${isSelected ? 'text-white/90' : 'text-slate-600 dark:text-slate-400'}`}>
                      {division}
                    </h3>
                    <Users className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                  <p className={`text-3xl font-black ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                    {driversByDivision[division]?.length || 0}
                  </p>
                </button>
              );
            }
          )}
        </div>

        {/* Search and Filter */}
        <SectionCard
          icon={Search}
          title="Search & Filter"
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search driver by name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value as Division | 'all')}
              className="px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all min-w-[180px]"
            >
              <option value="all">All Divisions</option>
              <option value="Division 1">Division 1</option>
              <option value="Division 2">Division 2</option>
              <option value="Division 3">Division 3</option>
              <option value="Division 4">Division 4</option>
              <option value="New">New</option>
            </select>
          </div>
        </SectionCard>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Drivers Table - Middle */}
          <div className="lg:col-span-2">
            <SectionCard
              title={`Search Results (${filteredDrivers.length})`}
              icon={Users}
              actions={
                <div className="flex items-center gap-2">
                  {selectedDriverIds.size > 0 && (
                    <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-semibold rounded-full">
                      {selectedDriverIds.size} selected
                    </span>
                  )}
                  {selectedDriverIds.size > 0 && (
                    <button
                      onClick={handleBulkEdit}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Bulk Edit
                    </button>
                  )}
                </div>
              }
              noPadding
            >
              <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)]">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-30 shadow-sm">
                      <tr>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-12">
                          <button
                            onClick={handleSelectAll}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                            title={selectedDriverIds.size === filteredDrivers.length ? 'Deselect all' : 'Select all'}
                          >
                            {selectedDriverIds.size === filteredDrivers.length && filteredDrivers.length > 0 ? (
                              <CheckSquare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider sticky left-12 bg-slate-50 dark:bg-slate-800 z-50 min-w-[200px]">
                          Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider sticky left-[248px] bg-slate-50 dark:bg-slate-800 z-50 w-48">
                          Current Division
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Change To
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-40">
                          History / Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                      {filteredDrivers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <p className="text-slate-500 dark:text-slate-400">
                              No drivers found matching your search criteria.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredDrivers.map((driver) => {
                          const pendingChange = pendingChanges.find((p) => p.driverId === driver.id);
                          const driverChanges = divisionChanges.filter((c) => c.driverId === driver.id).sort((a, b) => {
                            const dateA = new Date(a.createdAt || '').getTime();
                            const dateB = new Date(b.createdAt || '').getTime();
                            return dateB - dateA;
                          });
                          const lastChange = driverChanges[0];
                          
                          const isSelected = selectedDriverIds.has(driver.id);
                          
                          return (
                            <tr
                              key={driver.id}
                              className={`group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                                pendingChange ? 'bg-amber-50 dark:bg-amber-900/10' : ''
                              } ${isSelected ? 'bg-primary-50 dark:bg-primary-900/10' : ''}`}
                            >
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() => handleSelectDriver(driver.id)}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                                  title={isSelected ? 'Deselect' : 'Select'}
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                  ) : (
                                    <Square className="w-5 h-5 text-slate-400" />
                                  )}
                                </button>
                              </td>
                              <td className={`px-6 py-4 text-sm font-medium text-slate-900 dark:text-white sticky left-12 z-20 ${
                                pendingChange 
                                  ? 'bg-amber-50 dark:bg-amber-900/10 border-l-4 border-l-amber-400 group-hover:bg-amber-50 dark:group-hover:bg-amber-900/10' 
                                  : isSelected
                                  ? 'bg-primary-50 dark:bg-primary-900/10 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/10'
                                  : 'bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800'
                              }`}>
                                {driver.name}
                              </td>
                              <td className={`px-6 py-4 text-sm sticky left-[248px] z-20 w-48 ${
                                pendingChange 
                                  ? 'bg-amber-50 dark:bg-amber-900/10 group-hover:bg-amber-50 dark:group-hover:bg-amber-900/10' 
                                  : isSelected
                                  ? 'bg-primary-50 dark:bg-primary-900/10 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/10'
                                  : 'bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800'
                              }`}>
                                <div className="relative inline-block">
                                  <select
                                    value={driver.division}
                                    onChange={(e) => {
                                      const newDiv = e.target.value as Division;
                                      handleDivisionChange(driver.id, newDiv, true);
                                    }}
                                    disabled={updatingDriverId === driver.id}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                                  >
                                    <option value="Division 1">Division 1</option>
                                    <option value="Division 2">Division 2</option>
                                    <option value="Division 3">Division 3</option>
                                    <option value="Division 4">Division 4</option>
                                    <option value="New">New</option>
                                  </select>
                                  <div className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap inline-flex items-center gap-1 ${getDivisionColor(driver.division)} ${updatingDriverId === driver.id ? 'opacity-50' : ''}`}>
                                    <span>{driver.division}</span>
                                    {updatingDriverId !== driver.id && <ChevronDown className="w-3 h-3" style={{ color: 'inherit' }} />}
                                    {updatingDriverId === driver.id && <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'inherit' }} />}
                                  </div>
                                </div>
                              </td>
                              <td className={`px-6 py-4 text-sm text-center ${
                                pendingChange ? 'bg-amber-50 dark:bg-amber-900/10' : ''
                              }`}>
                                {(() => {
                                  const selectedDivision = pendingChange?.newDivision || driver.division;
                                  return (
                                    <div className="relative inline-block">
                                      <select
                                        value={selectedDivision}
                                        onChange={(e) => {
                                          const newDiv = e.target.value as Division;
                                          handleDivisionChange(driver.id, newDiv);
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                      >
                                        <option value="Division 1">Division 1</option>
                                        <option value="Division 2">Division 2</option>
                                        <option value="Division 3">Division 3</option>
                                        <option value="Division 4">Division 4</option>
                                        <option value="New">New</option>
                                      </select>
                                      <div className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap inline-flex items-center gap-1 ${getDivisionColor(selectedDivision)} pointer-events-none`}>
                                        <span>{selectedDivision}</span>
                                        <ChevronDown className="w-3 h-3" style={{ color: 'inherit' }} />
                                      </div>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className={`px-6 py-4 text-sm text-center ${
                                pendingChange ? 'bg-amber-50 dark:bg-amber-900/10' : ''
                              }`}>
                                <div className="flex flex-col items-center gap-2">
                                {lastChange ? (
                                  <div className="flex flex-col items-center gap-1" title={`Last change at ${getRoundDisplayName(lastChange.roundId, rounds)}`}>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                      {getRoundDisplayName(lastChange.roundId, rounds)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 dark:text-slate-500">No changes</span>
                                )}
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => {
                                        setSelectedDriverHistory({ id: driver.id, name: driver.name });
                                        setShowDivisionHistoryModal(true);
                                      }}
                                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                      title="View division history"
                                    >
                                      <History className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedDriverForChange({ 
                                          id: driver.id, 
                                          name: driver.name, 
                                          currentDivision: driver.division 
                                        });
                                        setEditingDivisionChange(null);
                                        setShowDivisionChangeModal(true);
                                      }}
                                      className="p-1.5 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                                      title="Add division change"
                                    >
                                      <Plus className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                    </button>
                                  </div>
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
          </div>

          {/* Confirm Division Changes - Right Side */}
          <div className="lg:col-span-1">
            <SectionCard
              title="Confirm Division Changes"
              icon={Sparkles}
              actions={
                pendingChanges.length > 0 && (
                  <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-semibold rounded-full">
                    {pendingChanges.length}
                  </span>
                )
              }
              className="h-[calc(100vh-400px)] flex flex-col"
              noPadding
            >
              <div className="flex-1 overflow-y-auto p-6">
                  {/* Promotions */}
                  {promotions.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                        Promotions ({promotions.length})
                      </h3>
                      <div className="space-y-3">
                        {promotions.map((change) => (
                          <div
                            key={change.driverId}
                            className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate mb-3">
                                  {change.driverName}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getDivisionColor(change.currentDivision)}`}>
                                    {change.currentDivision}
                                  </span>
                                  <span className="text-slate-300 dark:text-slate-600 text-sm">→</span>
                                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getDivisionColor(change.newDivision)}`}>
                                    {change.newDivision}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  onClick={() => handleConfirmChange(change)}
                                  className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                                  aria-label="Confirm"
                                  title="Confirm"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeclineChange(change.driverId)}
                                  className="p-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
                                  aria-label="Decline"
                                  title="Decline"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Demotions */}
                  {demotions.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                        Demotions ({demotions.length})
                      </h3>
                      <div className="space-y-3">
                        {demotions.map((change) => (
                          <div
                            key={change.driverId}
                            className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate mb-3">
                                  {change.driverName}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getDivisionColor(change.currentDivision)}`}>
                                    {change.currentDivision}
                                  </span>
                                  <span className="text-slate-300 dark:text-slate-600 text-sm">→</span>
                                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getDivisionColor(change.newDivision)}`}>
                                    {change.newDivision}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  onClick={() => handleConfirmChange(change)}
                                  className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                                  aria-label="Confirm"
                                  title="Confirm"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeclineChange(change.driverId)}
                                  className="p-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
                                  aria-label="Decline"
                                  title="Decline"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pendingChanges.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mb-4">
                        <Check className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                      </div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        No pending changes
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Select a division change to see it here
                      </p>
                    </div>
                  )}
              </div>
            </SectionCard>
          </div>
        </div>
      </PageLayout>

      {/* Round Points Edit Modal */}
      {selectedChange && selectedSeason && (
        <RoundPointsEditModal
          isOpen={pointsModalOpen}
          onClose={() => {
            setPointsModalOpen(false);
            setSelectedChange(null);
          }}
          driverId={selectedChange.driverId}
          driverName={selectedChange.driverName}
          currentDivision={selectedChange.currentDivision}
          newDivision={selectedChange.newDivision}
          seasonId={selectedSeason.id}
          onSave={handleModalSave}
          type={selectedChange.type}
          rounds={rounds}
        />
      )}

      {/* Round Selection Modal for Current Division Change */}
      {showRoundSelectModal && pendingDivisionUpdate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Select Round for Division Change
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {pendingDivisionUpdate.driverName}: {pendingDivisionUpdate.oldDivision} → {pendingDivisionUpdate.newDivision}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowRoundSelectModal(false);
                  setPendingDivisionUpdate(null);
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
            
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Select when this division change occurred:
              </label>
              <select
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              >
                <option value="">Select when change occurred</option>
                {selectedSeason && (
                  <option value={`pre-season-${selectedSeason.id}`}>Pre-Season (Before Season Start)</option>
                )}
                {[...rounds].sort((a, b) => (b.roundNumber || 0) - (a.roundNumber || 0)).map((round) => (
                  <option key={round.id} value={round.id}>
                    Round {round.roundNumber} - {round.location || 'TBD'} {round.date ? `(${round.date})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Use <span className="font-semibold">"Pre-Season"</span> for drivers who joined as "New" before the season started
              </p>
              {selectedRoundId.startsWith('pre-season-') && (
                <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                    📅 Pre-Season: Recording division change before season start
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRoundSelectModal(false);
                  setPendingDivisionUpdate(null);
                  setSelectedRoundId('');
                }}
                className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCurrentDivisionChange}
                disabled={updatingDriverId !== null || !selectedRoundId}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg hover:shadow-xl hover-lift flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingDriverId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Change
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Division Change Modal - Create/Edit division change for specific round */}
      {showDivisionChangeModal && selectedDriverForChange && selectedSeason && (
        <DivisionChangeModal
          isOpen={showDivisionChangeModal}
          onClose={() => {
            setShowDivisionChangeModal(false);
            setSelectedDriverForChange(null);
            setEditingDivisionChange(null);
          }}
          driverId={selectedDriverForChange.id}
          driverName={selectedDriverForChange.name}
          currentDivision={selectedDriverForChange.currentDivision}
          seasonId={selectedSeason.id}
          rounds={rounds}
          existingChange={editingDivisionChange}
          onSave={async () => {
            // Refresh division changes
            const response = await fetch(`/api/division-changes?seasonId=${selectedSeason.id}`);
            if (response.ok) {
              const data = await response.json();
              setDivisionChanges(data);
            }
            // Refresh drivers in case current division was updated
            const driversResponse = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`);
            if (driversResponse.ok) {
              const driversData = await driversResponse.json();
              setDrivers(driversData);
            }
            // Dispatch event to notify other components
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('vhkc:drivers-updated'));
            }
            setShowDivisionChangeModal(false);
            setSelectedDriverForChange(null);
            setEditingDivisionChange(null);
          }}
        />
      )}

      {/* Bulk Edit Modal */}
      {showBulkEditModal && selectedSeason && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Bulk Edit Division Changes
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {selectedDriverIds.size} driver{selectedDriverIds.size !== 1 ? 's' : ''} selected
                </p>
              </div>
              <button
                onClick={() => {
                  setShowBulkEditModal(false);
                  setBulkEditRoundId('');
                  setBulkEditFromDivision('');
                  setBulkEditToDivision('');
                  setBulkEditChangeType('promotion');
                  setBulkEditDivisionStart('');
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Change Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Change Type
                </label>
                <select
                  value={bulkEditChangeType}
                  onChange={(e) => {
                    const newType = e.target.value as 'promotion' | 'demotion' | 'division_start' | 'mid_season_join';
                    setBulkEditChangeType(newType);
                    if (newType === 'division_start' || newType === 'mid_season_join') {
                      setBulkEditFromDivision('');
                      setBulkEditToDivision('');
                    } else {
                      setBulkEditDivisionStart('');
                    }
                  }}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                >
                  <option value="promotion">Promotion / Demotion (Within Season)</option>
                  <option value="division_start">Pre-Season Division Start</option>
                  <option value="mid_season_join">Mid-Season Join</option>
                </select>
              </div>

              {/* Round Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {bulkEditChangeType === 'mid_season_join' ? 'Round Joined' : 'Round'}
                </label>
                <select
                  value={bulkEditRoundId}
                  onChange={(e) => setBulkEditRoundId(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                >
                  <option value="">Select a round</option>
                  <option value={`pre-season-${selectedSeason.id}`}>Pre-Season (Before Season Start)</option>
                  {[...rounds].sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0)).map((round) => (
                    <option key={round.id} value={round.id}>
                      Round {round.roundNumber} - {round.location || 'TBD'} {round.date ? `(${round.date})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* From/To Division or Division Start */}
              {(bulkEditChangeType === 'promotion' || bulkEditChangeType === 'demotion') ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      From Division (optional - will use driver's current division if not specified)
                    </label>
                    <select
                      value={bulkEditFromDivision}
                      onChange={(e) => setBulkEditFromDivision(e.target.value as Division)}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                    >
                      <option value="">Use driver's current division</option>
                      <option value="Division 1">Division 1</option>
                      <option value="Division 2">Division 2</option>
                      <option value="Division 3">Division 3</option>
                      <option value="Division 4">Division 4</option>
                      <option value="New">New</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      To Division
                    </label>
                    <select
                      value={bulkEditToDivision}
                      onChange={(e) => setBulkEditToDivision(e.target.value as Division)}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                    >
                      <option value="">Select target division</option>
                      <option value="Division 1">Division 1</option>
                      <option value="Division 2">Division 2</option>
                      <option value="Division 3">Division 3</option>
                      <option value="Division 4">Division 4</option>
                      <option value="New">New</option>
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Division Start
                  </label>
                  <select
                    value={bulkEditDivisionStart}
                    onChange={(e) => setBulkEditDivisionStart(e.target.value as Division)}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  >
                    <option value="">Select division start</option>
                    <option value="Division 1">Division 1</option>
                    <option value="Division 2">Division 2</option>
                    <option value="Division 3">Division 3</option>
                    <option value="Division 4">Division 4</option>
                    <option value="New">New</option>
                  </select>
                </div>
              )}

              {/* Selected Drivers List */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Selected Drivers
                </label>
                <div className="max-h-40 overflow-y-auto border-2 border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-900">
                  <div className="flex flex-wrap gap-2">
                    {getSelectedDrivers.map(driver => (
                      <span
                        key={driver.id}
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${getDivisionColor(driver.division)}`}
                      >
                        {driver.name} ({driver.division})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowBulkEditModal(false);
                  setBulkEditRoundId('');
                  setBulkEditFromDivision('');
                  setBulkEditToDivision('');
                  setBulkEditChangeType('promotion');
                  setBulkEditDivisionStart('');
                }}
                className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSave}
                disabled={bulkSaving || !bulkEditRoundId || 
                  ((bulkEditChangeType === 'promotion' || bulkEditChangeType === 'demotion') && !bulkEditToDivision) ||
                  ((bulkEditChangeType === 'division_start' || bulkEditChangeType === 'mid_season_join') && !bulkEditDivisionStart)}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Division History Modal */}
      {showDivisionHistoryModal && selectedDriverHistory && selectedSeason && (
        <DivisionHistoryModal
          isOpen={showDivisionHistoryModal}
          onClose={() => {
            setShowDivisionHistoryModal(false);
            setSelectedDriverHistory(null);
          }}
          driverId={selectedDriverHistory.id}
          driverName={selectedDriverHistory.name}
          seasonId={selectedSeason.id}
          rounds={rounds}
          divisionChanges={divisionChanges.filter(c => c.driverId === selectedDriverHistory.id)}
          drivers={drivers}
          onEdit={(change) => {
            setShowDivisionHistoryModal(false);
            setSelectedDriverForChange({ 
              id: selectedDriverHistory.id, 
              name: selectedDriverHistory.name,
              currentDivision: drivers.find(d => d.id === selectedDriverHistory.id)?.division || 'Division 3'
            });
            setEditingDivisionChange(change);
            setShowDivisionChangeModal(true);
          }}
          onDelete={async (changeId) => {
            try {
              const response = await fetch(`/api/division-changes?id=${changeId}&seasonId=${selectedSeason.id}`, {
                method: 'DELETE'
              });
              if (response.ok) {
                // Refresh division changes
                const refreshResponse = await fetch(`/api/division-changes?seasonId=${selectedSeason.id}`);
                if (refreshResponse.ok) {
                  const data = await refreshResponse.json();
                  setDivisionChanges(data);
                }
                // Also refresh drivers to update current division if needed
                const driversResponse = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`);
                if (driversResponse.ok) {
                  const driversData = await driversResponse.json();
                  setDrivers(driversData);
                }
              } else {
                throw new Error('Failed to delete division change');
              }
            } catch (error) {
              console.error('Failed to delete division change:', error);
              alert('Failed to delete division change');
            }
          }}
        />
      )}
    </>
  );
}

// Division Change Modal Component
interface DivisionChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
  driverName: string;
  currentDivision: Division;
  seasonId: string;
  rounds: any[];
  existingChange?: any | null;
  onSave: () => void;
}

function DivisionChangeModal({
  isOpen,
  onClose,
  driverId,
  driverName,
  currentDivision,
  seasonId,
  rounds,
  existingChange,
  onSave
}: DivisionChangeModalProps) {
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [fromDivision, setFromDivision] = useState<Division>(existingChange?.fromDivision || currentDivision);
  const [toDivision, setToDivision] = useState<Division>(existingChange?.toDivision || currentDivision);
  const [divisionStart, setDivisionStart] = useState<Division>(existingChange?.divisionStart || currentDivision);
  const [changeType, setChangeType] = useState<'promotion' | 'demotion' | 'division_start' | 'mid_season_join'>(
    existingChange?.changeType || 'promotion'
  );
  const [updateCurrentDivision, setUpdateCurrentDivision] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPointsEditor, setShowPointsEditor] = useState(false);
  const [pointsAdjustments, setPointsAdjustments] = useState<Record<string, number>>({});
  const [roundPoints, setRoundPoints] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    
    if (existingChange) {
      setSelectedRoundId(existingChange.roundId);
      setFromDivision(existingChange.fromDivision || currentDivision);
      setToDivision(existingChange.toDivision || currentDivision);
      setDivisionStart(existingChange.divisionStart || currentDivision);
      setChangeType(existingChange.changeType);
      setUpdateCurrentDivision(false);
    } else {
      // Default to pre-season for new drivers, otherwise first round
      const preSeasonRoundId = `pre-season-${seasonId}`;
      const sortedRounds = [...rounds].sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0));
      // If driver is "New", default to pre-season; otherwise default to first round
      const defaultRoundId = currentDivision === 'New' ? preSeasonRoundId : (sortedRounds.length > 0 ? sortedRounds[0].id : preSeasonRoundId);
      setSelectedRoundId(defaultRoundId);
      setFromDivision(currentDivision);
      setToDivision(currentDivision);
      // If pre-season is selected, default division start to "New"
      const defaultDivisionStart = defaultRoundId === preSeasonRoundId ? 'New' : currentDivision;
      setDivisionStart(defaultDivisionStart);
      setChangeType(currentDivision === 'New' ? 'division_start' : 'promotion');
      setUpdateCurrentDivision(false);
    }
  }, [existingChange, rounds, currentDivision, isOpen, seasonId]);

  // Fetch points for the selected round when it's a regular division change within an existing round
  useEffect(() => {
    const fetchPoints = async () => {
      // Only fetch points for regular promotion/demotion changes in existing rounds
      if (!selectedRoundId || !driverId || selectedRoundId.startsWith('pre-season-') || 
          (changeType !== 'promotion' && changeType !== 'demotion')) {
        setRoundPoints([]);
        setPointsAdjustments({});
        setShowPointsEditor(false);
        return;
      }
      
      // Check if this is an existing round (not pre-season)
      const isExistingRound = rounds.some(r => r.id === selectedRoundId);
      if (!isExistingRound) {
        setRoundPoints([]);
        setPointsAdjustments({});
        setShowPointsEditor(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/points?driverId=${driverId}&seasonId=${seasonId}`);
        if (response.ok) {
          const points = await response.json();
          const roundPoints = points.filter((p: any) => p.roundId === selectedRoundId);
          setRoundPoints(roundPoints);
          
          // Initialize points adjustments with current values
          const adjustments: Record<string, number> = {};
          roundPoints.forEach((p: any) => {
            adjustments[p.id] = p.points || 0;
          });
          setPointsAdjustments(adjustments);
          
          // Auto-show points editor if there are points to adjust
          if (roundPoints.length > 0 && !existingChange) {
            setShowPointsEditor(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch points:', error);
        setRoundPoints([]);
      }
    };
    
    fetchPoints();
  }, [selectedRoundId, driverId, seasonId, changeType, rounds, existingChange]);

  // Determine the current change type based on selected round
  const isPreSeason = selectedRoundId.startsWith('pre-season-');
  const isMidSeasonJoin = changeType === 'mid_season_join';
  const isRegularChange = changeType === 'promotion' || changeType === 'demotion';
  const isExistingRound = !isPreSeason && !isMidSeasonJoin && selectedRoundId && rounds.some(r => r.id === selectedRoundId);

  // Update change type and division start when round selection changes (only for new changes)
  useEffect(() => {
    if (existingChange) return; // Don't change type when editing
    
    if (selectedRoundId.startsWith('pre-season-')) {
      setChangeType('division_start');
      // Automatically set division start to "New" for pre-season
      setDivisionStart('New');
    } else if (selectedRoundId && changeType !== 'mid_season_join') {
      // Default to promotion/demotion for existing rounds
      const selectedRound = rounds.find(r => r.id === selectedRoundId);
      if (selectedRound && fromDivision && toDivision && fromDivision !== toDivision) {
        const divisionOrder: Partial<Record<Division, number>> = {
          'Division 1': 1,
          'Division 2': 2,
          'Division 3': 3,
          'Division 4': 4,
          'New': 5,
        };
        const fromOrder = divisionOrder[fromDivision] ?? 5;
        const toOrder = divisionOrder[toDivision] ?? 5;
        setChangeType(toOrder < fromOrder ? 'promotion' : 'demotion');
      }
    }
  }, [selectedRoundId, rounds, fromDivision, toDivision, existingChange, changeType]);

  const handleSave = async () => {
    if (!selectedRoundId) {
      alert('Please select a round');
      return;
    }

    // Validate based on change type
    if (isPreSeason || isMidSeasonJoin) {
      if (!divisionStart) {
        alert('Please select division start');
        return;
      }
    } else if (isRegularChange) {
      if (!fromDivision || !toDivision) {
        alert('Please fill in all fields');
        return;
      }
      if (fromDivision === toDivision) {
        alert('From division and to division must be different');
        return;
      }
    }

    try {
      setSaving(true);

      let finalChangeType = changeType;
      let finalFromDivision = fromDivision;
      let finalToDivision = toDivision;
      let finalDivisionStart = divisionStart;

      // Determine change type for regular changes
      if (isRegularChange && fromDivision && toDivision) {
        const divisionOrder: Partial<Record<Division, number>> = {
          'Division 1': 1,
          'Division 2': 2,
          'Division 3': 3,
          'Division 4': 4,
          'New': 5,
        };
        const fromOrder = divisionOrder[fromDivision] ?? 5;
        const toOrder = divisionOrder[toDivision] ?? 5;
        finalChangeType = toOrder < fromOrder ? 'promotion' : 'demotion';
      }

      const changeId = existingChange?.id || `division-change-${driverId}-${Date.now()}`;
      const divisionChange: any = {
        id: changeId,
        seasonId: seasonId,
        roundId: selectedRoundId,
        driverId: driverId,
        driverName: driverName,
        changeType: finalChangeType,
        createdAt: existingChange?.createdAt || new Date().toISOString(),
      };

      // Set appropriate fields based on change type
      if (isPreSeason || isMidSeasonJoin) {
        divisionChange.divisionStart = finalDivisionStart;
        divisionChange.fromDivision = undefined;
        divisionChange.toDivision = undefined;
      } else {
        divisionChange.fromDivision = finalFromDivision;
        divisionChange.toDivision = finalToDivision;
        divisionChange.divisionStart = undefined;
        
        // Add points adjustments if provided
        if (Object.keys(pointsAdjustments).length > 0) {
          divisionChange.pointsAdjustments = pointsAdjustments;
        }
      }

      // Create/update division change
      // The API will automatically update if a division change exists for this driver and round
      const response = await fetch('/api/division-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(divisionChange),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save division change');
      }

      // Points adjustments are handled by the API when pointsAdjustments is included in divisionChange

      // Optionally update driver's current division
      const divisionToUpdate = isPreSeason || isMidSeasonJoin ? finalDivisionStart : finalToDivision;
      if (updateCurrentDivision && divisionToUpdate) {
        const driverResponse = await fetch(`/api/drivers?seasonId=${seasonId}`);
        if (driverResponse.ok) {
          const driversData = await driverResponse.json();
          const driver = driversData.find((d: any) => d.id === driverId);
          if (driver) {
            const updatedDriver = {
              ...driver,
              division: divisionToUpdate,
              lastUpdated: new Date().toISOString().split('T')[0],
            };
            await fetch(`/api/drivers?seasonId=${seasonId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedDriver),
            });
          }
        }
      }

      onSave();
    } catch (error: any) {
      console.error('Failed to save division change:', error);
      alert(error.message || 'Failed to save division change. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const divisionOptions: Division[] = ['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {existingChange ? 'Edit' : 'Create'} Division Change
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {driverName}
              </p>
              {currentDivision === 'New' && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                  New Driver
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
        
        <div className="space-y-4 mb-6">
          {/* Change Type Selection - only show when creating new */}
          {!existingChange && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Change Type
              </label>
              <select
                value={changeType}
                onChange={(e) => {
                  const newType = e.target.value as 'promotion' | 'demotion' | 'division_start' | 'mid_season_join';
                  setChangeType(newType);
                  // Reset round selection based on type
                  if (newType === 'mid_season_join') {
                    // Clear round selection - user will select the round they joined
                    setSelectedRoundId('');
                  } else if (newType === 'division_start') {
                    // Auto-select pre-season
                    setSelectedRoundId(`pre-season-${seasonId}`);
                    // Automatically set division start to "New" for pre-season
                    setDivisionStart('New');
                  } else if (newType === 'promotion' || newType === 'demotion') {
                    // For regular changes, select first round if none selected
                    if (!selectedRoundId || selectedRoundId.startsWith('pre-season-')) {
                      const sortedRounds = [...rounds].sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0));
                      setSelectedRoundId(sortedRounds.length > 0 ? sortedRounds[0].id : '');
                    }
                  }
                }}
                className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              >
                <option value="promotion">Promotion / Demotion (Within Season)</option>
                <option value="division_start">Pre-Season Division Start</option>
                <option value="mid_season_join">Mid-Season Join</option>
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {changeType === 'division_start' 
                  ? 'Pre-Season: Record the division the driver started in before the season (no promotions/demotions)'
                  : changeType === 'mid_season_join'
                  ? 'Mid-Season Join: Record when a driver joined during the season and their starting division'
                  : 'Promotion/Demotion: Record division changes that occurred during the season'}
              </p>
            </div>
          )}

          {/* Round Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {isMidSeasonJoin ? 'Round Joined' : 'Round'}
            </label>
            <select
              value={selectedRoundId}
              onChange={(e) => {
                const newRoundId = e.target.value;
                setSelectedRoundId(newRoundId);
                // Auto-update change type based on round selection
                if (newRoundId.startsWith('pre-season-')) {
                  setChangeType('division_start');
                  // Automatically set division start to "New" for pre-season
                  setDivisionStart('New');
                } else if (newRoundId && changeType === 'division_start') {
                  // If switching from pre-season to a real round, default to promotion/demotion
                  setChangeType('promotion');
                }
              }}
              className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            >
              <option value="">Select a round</option>
              <option value={`pre-season-${seasonId}`}>Pre-Season (Before Season Start)</option>
              {[...rounds].sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0)).map((round) => (
                <option key={round.id} value={round.id}>
                  Round {round.roundNumber} - {round.location || 'TBD'} {round.date ? `(${round.date})` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isPreSeason 
                ? 'Pre-Season: Driver joined before the season started'
                : isMidSeasonJoin
                ? 'Select the round when the driver joined mid-season'
                : 'Select when this division change occurred'}
            </p>
            {isPreSeason && (
              <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                  📅 Pre-Season: No promotions/demotions - this is their starting division
                </p>
              </div>
            )}
            {isMidSeasonJoin && selectedRoundId && !selectedRoundId.startsWith('pre-season-') && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                  📅 Mid-Season Join: Driver joined during the season
                </p>
              </div>
            )}
          </div>

          {/* Division Start - for pre-season and mid-season join */}
          {(isPreSeason || isMidSeasonJoin) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Division Start
              </label>
              <select
                value={divisionStart}
                onChange={(e) => setDivisionStart(e.target.value as Division)}
                className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              >
                {divisionOptions.map((div) => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isPreSeason 
                  ? 'The division the driver started in before the season began'
                  : 'The division the driver joined in when they entered mid-season'}
              </p>
            </div>
          )}

          {/* From/To Division - for regular promotion/demotion */}
          {isRegularChange && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  From Division <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">(division before change)</span>
                </label>
                <select
                  value={fromDivision}
                  onChange={(e) => setFromDivision(e.target.value as Division)}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                >
                  {divisionOptions.map((div) => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  To Division <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">(division after change)</span>
                </label>
                <select
                  value={toDivision}
                  onChange={(e) => setToDivision(e.target.value as Division)}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                >
                  {divisionOptions.map((div) => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
                {fromDivision === 'New' && toDivision !== 'New' && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                    ✓ Promotion from New division
                  </p>
                )}
                {fromDivision !== 'New' && toDivision === 'New' && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                    ⚠ Demotion to New division
                  </p>
                )}
              </div>

              {/* Points Modification - for regular changes within existing rounds */}
              {isExistingRound && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Modify Points for This Round
                    </label>
                    {roundPoints.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowPointsEditor(!showPointsEditor)}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {showPointsEditor ? 'Hide' : 'Show'} Points Editor
                      </button>
                    )}
                  </div>
                  {roundPoints.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No points recorded for this round yet. Points will be calculated automatically after the division change.
                    </p>
                  ) : showPointsEditor && (
                    <div className="space-y-2 mt-2">
                      {roundPoints.map((point) => (
                        <div key={point.id} className="flex items-center gap-2">
                          <span className="text-xs text-slate-600 dark:text-slate-400 flex-1">
                            {point.raceType || 'Final'} {point.finalType || ''} - Current: {point.points || 0} pts
                          </span>
                          <input
                            type="number"
                            value={pointsAdjustments[point.id] ?? point.points ?? 0}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              setPointsAdjustments(prev => ({
                                ...prev,
                                [point.id]: value
                              }));
                            }}
                            className="w-24 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary-500"
                            min="0"
                            placeholder="Points"
                          />
                        </div>
                      ))}
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        Adjust points for this round after the division change (e.g., if promoted from New to Division 3 after Round 1)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Update Current Division Checkbox */}
          {!existingChange && (
            <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <input
                type="checkbox"
                id="update-current"
                checked={updateCurrentDivision}
                onChange={(e) => setUpdateCurrentDivision(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 mt-0.5"
              />
              <div className="flex-1">
                <label htmlFor="update-current" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer block">
                  Also update driver's current division to "{isPreSeason || isMidSeasonJoin ? divisionStart : toDivision}"
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isPreSeason || isMidSeasonJoin
                    ? 'Check this to update the driver\'s current division to their starting division'
                    : 'Leave unchecked to only record the historical division change without updating the current division'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedRoundId || 
              (isPreSeason || isMidSeasonJoin ? !divisionStart : (!fromDivision || !toDivision || fromDivision === toDivision))}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg hover:shadow-xl hover-lift flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {existingChange ? 'Update' : 'Create'} Change
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Division History Modal Component
interface DivisionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
  driverName: string;
  seasonId: string;
  rounds: any[];
  divisionChanges: any[];
  drivers: any[]; // Add drivers prop to get current division
  onEdit: (change: any) => void;
  onDelete: (changeId: string) => void;
}

function DivisionHistoryModal({
  isOpen,
  onClose,
  driverId,
  driverName,
  rounds,
  divisionChanges,
  drivers,
  onEdit,
  onDelete
}: DivisionHistoryModalProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Helper function to get driver's division at a specific round
  const getDriverDivisionAtRound = (roundId: string, roundNumber: number): Division | undefined => {
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

  // Helper to get round number for sorting (pre-season = 0, so it appears first)
  const getRoundNumberForSort = (roundId: string, rounds: any[]): number => {
    if (roundId.startsWith('pre-season-')) {
      return 0; // Pre-season appears before Round 1
    }
    const round = rounds.find(r => r.id === roundId);
    return round?.roundNumber || 999;
  };

  const sortedChanges = [...divisionChanges].sort((a, b) => {
    const roundNumA = getRoundNumberForSort(a.roundId, rounds);
    const roundNumB = getRoundNumberForSort(b.roundId, rounds);
    // Sort by round number descending, but show pre-season first
    if (a.roundId.startsWith('pre-season-') && !b.roundId.startsWith('pre-season-')) return -1;
    if (!a.roundId.startsWith('pre-season-') && b.roundId.startsWith('pre-season-')) return 1;
    return roundNumB - roundNumA;
  });

  const handleDelete = async (changeId: string) => {
    if (!confirm('Are you sure you want to delete this division change?')) {
      return;
    }
    setDeletingId(changeId);
    await onDelete(changeId);
    setDeletingId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Division Change History
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {driverName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {sortedChanges.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">
                No division changes recorded
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedChanges.map((change) => {
                const getDivisionColor = (div: Division) => {
                  switch (div) {
                    case 'Division 1': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
                    case 'Division 2': return 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200';
                    case 'Division 3': return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
                    case 'Division 4': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
                    case 'New': return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
                    default: return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
                  }
                };
                
                const roundDisplayName = getRoundDisplayName(change.roundId, rounds);
                const isPreSeason = change.roundId.startsWith('pre-season-');
                
                // Get the driver's division at this round
                // The division shown should be the division the driver was in FOR that round
                // For promotion/demotion: show the "from" division (what they were before the change)
                // For division_start/mid_season_join: show the divisionStart (what they started in)
                const round = rounds.find((r: any) => r.id === change.roundId);
                let driverDivisionAtRound: Division | undefined;
                
                if (change.changeType === 'promotion' || change.changeType === 'demotion') {
                  // For promotions/demotions, the driver was in the "from" division at this round
                  driverDivisionAtRound = change.fromDivision;
                } else if (change.changeType === 'division_start' || change.changeType === 'mid_season_join') {
                  // For division start/join, they started in the divisionStart
                  driverDivisionAtRound = change.divisionStart;
                } else {
                  // Fallback: use the helper function
                  driverDivisionAtRound = getDriverDivisionAtRound(change.roundId, round?.roundNumber || 0);
                }
                
                // Determine the division after this change
                let divisionAfterChange: Division | undefined;
                if (change.changeType === 'promotion' || change.changeType === 'demotion') {
                  divisionAfterChange = change.toDivision;
                } else if (change.changeType === 'division_start' || change.changeType === 'mid_season_join') {
                  divisionAfterChange = change.divisionStart;
                }
                
                return (
                  <div
                    key={change.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {isPreSeason ? (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Pre-Season
                              </span>
                            ) : (
                              roundDisplayName
                            )}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                            change.changeType === 'promotion' 
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              : change.changeType === 'demotion'
                              ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                              : change.changeType === 'division_start'
                              ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                              : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          }`}>
                            {change.changeType === 'promotion' ? 'Promotion' : 
                             change.changeType === 'demotion' ? 'Demotion' :
                             change.changeType === 'division_start' ? 'Division Start' :
                             'Mid-Season Join'}
                          </span>
                        </div>
                        {/* Show division change details for promotion/demotion */}
                        {(change.changeType === 'promotion' || change.changeType === 'demotion') && change.fromDivision && change.toDivision && (
                          <div className="flex items-center gap-2 mt-2 text-sm">
                            <span className="text-slate-600 dark:text-slate-400">From:</span>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getDivisionColor(change.fromDivision)}`}>
                              {change.fromDivision}
                            </span>
                            <span className="text-slate-400 dark:text-slate-500">→</span>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getDivisionColor(change.toDivision)}`}>
                              {change.toDivision}
                            </span>
                          </div>
                        )}
                        {/* Show division start for division_start and mid_season_join */}
                        {(change.changeType === 'division_start' || change.changeType === 'mid_season_join') && change.divisionStart && (
                          <div className="flex items-center gap-2 mt-2 text-sm">
                            <span className="text-slate-600 dark:text-slate-400">Started in:</span>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getDivisionColor(change.divisionStart)}`}>
                              {change.divisionStart}
                            </span>
                          </div>
                        )}
                        {change.createdAt && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            {new Date(change.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => onEdit(change)}
                          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(change.id)}
                          disabled={deletingId === change.id}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === change.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-600 dark:text-red-400" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
