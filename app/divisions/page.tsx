'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import { mockDrivers } from '@/data/mockData';
import { Driver, Division } from '@/types';
import { Search, Check, X, Plus, Edit2, Trash2 } from 'lucide-react';

interface PendingDivisionChange {
  driverId: string;
  driverName: string;
  currentDivision: Division;
  newDivision: Division;
  type: 'promotion' | 'demotion';
}

// Helper function to get division color
const getDivisionColor = (division: string) => {
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
  const [divisions, setDivisions] = useState<Division[]>(['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New']);
  const [isAddDivisionModalOpen, setIsAddDivisionModalOpen] = useState(false);
  const [isEditDivisionModalOpen, setIsEditDivisionModalOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);
  const [newDivisionName, setNewDivisionName] = useState('');

  const filteredDrivers = useMemo(() => {
    const filtered = drivers.filter((driver) => {
      const matchesSearch = driver.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDivision = divisionFilter === 'all' || driver.division === divisionFilter;
      return matchesSearch && matchesDivision;
    });
    
    // Sort by division when "all" is selected
    if (divisionFilter === 'all') {
      return filtered.sort((a, b) => {
        const aIndex = divisions.indexOf(a.division);
        const bIndex = divisions.indexOf(b.division);
        // If division not found in list, put it at the end
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
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
    // Use the divisions list order, assuming lower index = lower division
    const currentIndex = divisions.indexOf(driver.division);
    const newIndex = divisions.indexOf(newDiv);
    // If indices are valid, compare them; otherwise default to demotion
    const type = (currentIndex !== -1 && newIndex !== -1 && newIndex > currentIndex) ? 'promotion' : 'demotion';

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
    const grouped: Record<string, Driver[]> = {};
    divisions.forEach((div) => {
      grouped[div] = [];
    });
    drivers.forEach((driver) => {
      if (!grouped[driver.division]) {
        grouped[driver.division] = [];
      }
      grouped[driver.division].push(driver);
    });
    return grouped;
  }, [drivers, divisions]);

  const promotions = useMemo(() => {
    return pendingChanges.filter((p) => p.type === 'promotion');
  }, [pendingChanges]);

  const demotions = useMemo(() => {
    return pendingChanges.filter((p) => p.type === 'demotion');
  }, [pendingChanges]);

  const handleAddDivision = () => {
    setIsAddDivisionModalOpen(true);
    setNewDivisionName('');
  };

  const handleSaveNewDivision = () => {
    if (newDivisionName.trim() && !divisions.includes(newDivisionName.trim() as Division)) {
      setDivisions([...divisions, newDivisionName.trim() as Division]);
      setIsAddDivisionModalOpen(false);
      setNewDivisionName('');
    }
  };

  const handleEditDivision = (division: Division) => {
    setEditingDivision(division);
    setNewDivisionName(division);
    setIsEditDivisionModalOpen(true);
  };

  const handleSaveEditDivision = () => {
    if (editingDivision && newDivisionName.trim() && newDivisionName.trim() !== editingDivision) {
      // Update division name in all drivers
      setDrivers(drivers.map((d) => 
        d.division === editingDivision 
          ? { ...d, division: newDivisionName.trim() as Division }
          : d
      ));
      
      // Update divisions list
      setDivisions(divisions.map((d) => d === editingDivision ? newDivisionName.trim() as Division : d));
      
      // Update pending changes
      setPendingChanges(pendingChanges.map((p) => ({
        ...p,
        currentDivision: p.currentDivision === editingDivision ? newDivisionName.trim() as Division : p.currentDivision,
        newDivision: p.newDivision === editingDivision ? newDivisionName.trim() as Division : p.newDivision,
      })));
      
      setIsEditDivisionModalOpen(false);
      setEditingDivision(null);
      setNewDivisionName('');
    }
  };

  const handleDeleteDivision = (division: Division) => {
    const driverCount = driversByDivision[division]?.length || 0;
    if (driverCount > 0) {
      alert(`Cannot delete ${division}. There are ${driverCount} driver(s) registered to this division.`);
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${division}? This action cannot be undone.`)) {
      setDivisions(divisions.filter((d) => d !== division));
      if (divisionFilter === division) {
        setDivisionFilter('all');
      }
    }
  };

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
                {divisions.map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Division Overview - Left Side (Thinner) */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-3">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Divisions
                  </h2>
                  <button
                    onClick={handleAddDivision}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Add division"
                  >
                    <Plus className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
                <div className="space-y-2">
                  {divisions.map((division) => (
                    <div
                      key={division}
                      className={`p-2 bg-slate-50 dark:bg-slate-900 rounded-lg transition-all hover:shadow-md ${
                        divisionFilter === division ? 'ring-2 ring-primary ring-offset-1' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div
                          onClick={() => setDivisionFilter(divisionFilter === division ? 'all' : division)}
                          className="flex-1 cursor-pointer"
                        >
                          <h3 className="font-semibold text-xs text-slate-900 dark:text-white mb-0.5">
                            {division}
                          </h3>
                          <p className="text-lg font-bold text-primary">
                            {driversByDivision[division]?.length || 0}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditDivision(division)}
                            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            aria-label="Edit division"
                          >
                            <Edit2 className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteDivision(division)}
                            className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            aria-label="Delete division"
                            disabled={(driversByDivision[division]?.length || 0) > 0}
                          >
                            <Trash2 className={`w-3 h-3 ${
                              (driversByDivision[division]?.length || 0) > 0
                                ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                                : 'text-red-600 dark:text-red-400'
                            }`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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
                                {divisions.map((div) => (
                                  <option key={div} value={div}>
                                    {div}
                                  </option>
                                ))}
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

      {/* Add Division Modal */}
      {isAddDivisionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Add New Division
              </h2>
              <button
                onClick={() => {
                  setIsAddDivisionModalOpen(false);
                  setNewDivisionName('');
                }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Division Name
                </label>
                <input
                  type="text"
                  value={newDivisionName}
                  onChange={(e) => setNewDivisionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveNewDivision();
                    } else if (e.key === 'Escape') {
                      setIsAddDivisionModalOpen(false);
                      setNewDivisionName('');
                    }
                  }}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter division name"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setIsAddDivisionModalOpen(false);
                  setNewDivisionName('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewDivision}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-md"
              >
                Add Division
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Division Modal */}
      {isEditDivisionModalOpen && editingDivision && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Edit Division
              </h2>
              <button
                onClick={() => {
                  setIsEditDivisionModalOpen(false);
                  setEditingDivision(null);
                  setNewDivisionName('');
                }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Division Name
                </label>
                <input
                  type="text"
                  value={newDivisionName}
                  onChange={(e) => setNewDivisionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveEditDivision();
                    } else if (e.key === 'Escape') {
                      setIsEditDivisionModalOpen(false);
                      setEditingDivision(null);
                      setNewDivisionName('');
                    }
                  }}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter division name"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setIsEditDivisionModalOpen(false);
                  setEditingDivision(null);
                  setNewDivisionName('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditDivision}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
