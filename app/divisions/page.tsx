'use client';

import { useState, useMemo, useEffect } from 'react';
import Header from '@/components/Header';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import { useSeason } from '@/components/SeasonContext';
import { Driver, Division } from '@/types';
import { Search, Check, X, Loader2, ChevronDown, ShieldCheck, Users, Sparkles } from 'lucide-react';
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
      return 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200';
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
        bg: 'bg-white dark:bg-slate-700',
        text: 'text-slate-900 dark:text-white',
        border: 'border-slate-300 dark:border-slate-600'
      };
  }
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

  const handleDivisionChange = (driverId: string, newDiv: Division) => {
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) return;

    // Don't add if the division is the same
    if (driver.division === newDiv) {
      // Remove from pending changes if it exists
      setPendingChanges(pendingChanges.filter((p) => p.driverId !== driverId));
      return;
    }

    // Determine if it's a promotion or demotion
    const divisionOrder: Division[] = ['New', 'Division 4', 'Division 3', 'Division 2', 'Division 1'];
    const currentIndex = divisionOrder.indexOf(driver.division);
    const newIndex = divisionOrder.indexOf(newDiv);
    const type = newIndex > currentIndex ? 'promotion' : 'demotion';

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
    const grouped: Record<Division, any[]> = {
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
                    {driversByDivision[division].length}
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
              noPadding
            >
              <div className="overflow-x-auto max-h-[calc(100vh-400px)]">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-900 z-20 min-w-[200px]">
                          Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider sticky left-[200px] bg-slate-50 dark:bg-slate-900 z-20 w-48">
                          Current Division
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Change To
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                      {filteredDrivers.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center">
                            <p className="text-slate-500 dark:text-slate-400">
                              No drivers found matching your search criteria.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredDrivers.map((driver) => {
                          const pendingChange = pendingChanges.find((p) => p.driverId === driver.id);
                          return (
                            <tr
                              key={driver.id}
                              className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                                pendingChange ? 'bg-amber-50 dark:bg-amber-900/10' : ''
                              }`}
                            >
                              <td className={`px-6 py-4 text-sm font-medium text-slate-900 dark:text-white sticky left-0 z-10 ${
                                pendingChange 
                                  ? 'bg-amber-50 dark:bg-amber-900/10 border-l-4 border-l-amber-400' 
                                  : 'bg-white dark:bg-slate-800'
                              }`}>
                                {driver.name}
                              </td>
                              <td className={`px-6 py-4 text-sm sticky left-[200px] z-10 w-48 ${
                                pendingChange 
                                  ? 'bg-amber-50 dark:bg-amber-900/10' 
                                  : 'bg-white dark:bg-slate-800'
                              }`}>
                                <span className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap inline-block ${getDivisionColor(driver.division)}`}>
                                  {driver.division}
                                </span>
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
                            className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
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
                                  className="p-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
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
                            className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
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
                                  className="p-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
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
                      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mb-4">
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
    </>
  );
}
