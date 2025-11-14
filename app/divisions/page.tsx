'use client';

import { useState, useMemo, useEffect } from 'react';
import Header from '@/components/Header';
import { useSeason } from '@/components/SeasonContext';
import { Driver, Division } from '@/types';
import { Search, Check, X, Loader2 } from 'lucide-react';

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

export default function DivisionsPage() {
  const { selectedSeason } = useSeason();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<Division | 'all'>('all');
  const [pendingChanges, setPendingChanges] = useState<PendingDivisionChange[]>([]);

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
    
    if (existingIndex >= 0) {
      // Update existing pending change
      const updated = [...pendingChanges];
      updated[existingIndex] = {
        driverId,
        driverName: driver.name,
        currentDivision: driver.division,
        newDivision: newDiv,
        type,
      };
      setPendingChanges(updated);
    } else {
      // Add new pending change
      setPendingChanges([
        ...pendingChanges,
        {
          driverId,
          driverName: driver.name,
          currentDivision: driver.division,
          newDivision: newDiv,
          type,
        },
      ]);
    }
  };

  const handleConfirmChange = async (pendingChange: PendingDivisionChange) => {
    if (!selectedSeason) return;

    try {
      // Find the driver
      const driver = drivers.find(d => d.id === pendingChange.driverId);
      if (!driver) return;

      // Update driver division via API
      const updatedDriver = {
        ...driver,
        division: pendingChange.newDivision,
        lastUpdated: new Date().toISOString().split('T')[0],
      };

      const response = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDriver),
      });

      if (response.ok) {
        // Update local state
        setDrivers(
          drivers.map((d) =>
            d.id === pendingChange.driverId ? updatedDriver : d
          )
        );
        // Remove from pending changes
        setPendingChanges(pendingChanges.filter((p) => p.driverId !== pendingChange.driverId));
      } else {
        alert('Failed to update driver division. Please try again.');
      }
    } catch (error) {
      console.error('Failed to update driver division:', error);
      alert('Failed to update driver division. Please try again.');
    }
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
        <div className="p-4 md:p-6">
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
      <Header hideSearch />
      <div className="p-4 md:p-6">
        <div className="max-w-[95%] mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
            Divisions Management
          </h1>

          {/* Search and Filter */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search driver by name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <select
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value as Division | 'all')}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Division Overview - Left Side (Thinner) */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-3">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                  Divisions
                </h2>
                <div className="space-y-2">
                  {(['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New'] as Division[]).map(
                    (division) => (
                      <div
                        key={division}
                        onClick={() => setDivisionFilter(divisionFilter === division ? 'all' : division)}
                        className={`p-2 bg-slate-50 dark:bg-slate-900 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                          divisionFilter === division ? 'ring-2 ring-primary ring-offset-1' : ''
                        }`}
                      >
                        <h3 className="font-semibold text-xs text-slate-900 dark:text-white mb-0.5">
                          {division}
                        </h3>
                        <p className="text-lg font-bold text-primary">
                          {driversByDivision[division].length}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Driver Search Results - Middle */}
            <div className="lg:col-span-8">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Search Results ({filteredDrivers.length})
                  </h2>
                </div>
                <div className="overflow-x-auto flex-1 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Current Division
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Change To
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {filteredDrivers.map((driver) => {
                        const pendingChange = pendingChanges.find((p) => p.driverId === driver.id);
                        return (
                          <tr
                            key={driver.id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                              pendingChange ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                            }`}
                          >
                            <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                              {driver.name}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getDivisionColor(driver.division)}`}>
                                {driver.division}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <select
                                value={pendingChange?.newDivision || driver.division}
                                onChange={(e) => {
                                  const newDiv = e.target.value as Division;
                                  handleDivisionChange(driver.id, newDiv);
                                }}
                                className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                              >
                                <option value="Division 1">Division 1</option>
                                <option value="Division 2">Division 2</option>
                                <option value="Division 3">Division 3</option>
                                <option value="Division 4">Division 4</option>
                                <option value="New">New</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Confirm Division Change - Right Side */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Confirm Division Changes
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {/* Promotions */}
                  {promotions.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
                        Promotions ({promotions.length})
                      </h3>
                      <div className="space-y-1.5">
                        {promotions.map((change) => (
                          <div
                            key={change.driverId}
                            className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                  {change.driverName}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  {change.currentDivision} → {change.newDivision}
                                </p>
                              </div>
                              <div className="flex gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => handleConfirmChange(change)}
                                  className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                                  aria-label="Confirm"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeclineChange(change.driverId)}
                                  className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                                  aria-label="Decline"
                                >
                                  <X className="w-3.5 h-3.5" />
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
                      <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                        Demotions ({demotions.length})
                      </h3>
                      <div className="space-y-1.5">
                        {demotions.map((change) => (
                          <div
                            key={change.driverId}
                            className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                  {change.driverName}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  {change.currentDivision} → {change.newDivision}
                                </p>
                              </div>
                              <div className="flex gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => handleConfirmChange(change)}
                                  className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                                  aria-label="Confirm"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeclineChange(change.driverId)}
                                  className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                                  aria-label="Decline"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pendingChanges.length === 0 && (
                    <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-sm">
                      No pending division changes
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
