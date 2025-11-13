'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import { mockDrivers } from '@/data/mockData';
import { Driver, Division } from '@/types';
import { Search, Check, X } from 'lucide-react';

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
  const [drivers, setDrivers] = useState(mockDrivers);
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<Division | 'all'>('all');
  const [pendingChanges, setPendingChanges] = useState<PendingDivisionChange[]>([]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const matchesSearch = driver.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDivision = divisionFilter === 'all' || driver.division === divisionFilter;
      return matchesSearch && matchesDivision;
    });
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

  const handleConfirmChange = (pendingChange: PendingDivisionChange) => {
    // Update the driver's division
    setDrivers(
      drivers.map((d) =>
        d.id === pendingChange.driverId
          ? { ...d, division: pendingChange.newDivision, lastUpdated: new Date().toISOString().split('T')[0] }
          : d
      )
    );
    
    // Remove from pending changes
    setPendingChanges(pendingChanges.filter((p) => p.driverId !== pendingChange.driverId));
  };

  const handleDeclineChange = (driverId: string) => {
    // Remove from pending changes without updating
    setPendingChanges(pendingChanges.filter((p) => p.driverId !== driverId));
  };

  const driversByDivision = useMemo(() => {
    const grouped: Record<Division, Driver[]> = {
      'Division 1': [],
      'Division 2': [],
      'Division 3': [],
      'Division 4': [],
      'New': [],
    };
    drivers.forEach((driver) => {
      grouped[driver.division].push(driver);
    });
    return grouped;
  }, [drivers]);

  const promotions = useMemo(() => {
    return pendingChanges.filter((p) => p.type === 'promotion');
  }, [pendingChanges]);

  const demotions = useMemo(() => {
    return pendingChanges.filter((p) => p.type === 'demotion');
  }, [pendingChanges]);

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
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                  Division Overview
                </h2>
                <div className="space-y-3">
                  {(['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New'] as Division[]).map(
                    (division) => (
                      <div
                        key={division}
                        onClick={() => setDivisionFilter(divisionFilter === division ? 'all' : division)}
                        className={`p-3 bg-slate-50 dark:bg-slate-900 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                          divisionFilter === division ? 'ring-2 ring-primary ring-offset-2' : ''
                        }`}
                      >
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">
                          {division}
                        </h3>
                        <p className="text-xl font-bold text-primary">
                          {driversByDivision[division].length}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          drivers
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Driver Search Results - Middle */}
            <div className="lg:col-span-7">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Search Results ({filteredDrivers.length})
                  </h2>
                </div>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
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
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                  Confirm Division Changes
                </h2>
                
                {/* Promotions */}
                {promotions.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-3">
                      Promotions ({promotions.length})
                    </h3>
                    <div className="space-y-2">
                      {promotions.map((change) => (
                        <div
                          key={change.driverId}
                          className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-slate-900 dark:text-white">
                                {change.driverName}
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {change.currentDivision} → {change.newDivision}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleConfirmChange(change)}
                                className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                aria-label="Confirm"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeclineChange(change.driverId)}
                                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                aria-label="Decline"
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
                    <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-3">
                      Demotions ({demotions.length})
                    </h3>
                    <div className="space-y-2">
                      {demotions.map((change) => (
                        <div
                          key={change.driverId}
                          className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-slate-900 dark:text-white">
                                {change.driverName}
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {change.currentDivision} → {change.newDivision}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleConfirmChange(change)}
                                className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                aria-label="Confirm"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeclineChange(change.driverId)}
                                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                aria-label="Decline"
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
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No pending division changes
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
