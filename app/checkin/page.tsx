'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import { useSeason } from '@/components/SeasonContext';
import { Driver, Division, DriverStatus } from '@/types';
import { Loader2, Edit, Save, X, CheckCircle2, Circle, Search, Filter, UserCheck, UserX, Users, UserRoundCheck, UserRoundX, UsersRound, ClipboardCheck } from 'lucide-react';

type DriverStatusFilter = 'all' | 'checkedIn' | 'notCheckedIn';

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

// Helper functions from drivers page
const parseDate = (dateString: string | undefined): { day: number; month: number; year: number } => {
  if (!dateString) return { day: 0, month: 0, year: 0 };
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return { day, month, year };
    }
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return { day: 0, month: 0, year: 0 };
  return {
    day: date.getUTCDate(),
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
};

const combineDate = (day: number, month: number, year: number): string => {
  if (!day || !month || !year) return '';
  const date = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(date.getTime())) return '';
  const yearStr = date.getUTCFullYear().toString();
  const monthStr = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const dayStr = date.getUTCDate().toString().padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayStr}`;
};

const calculateAge = (dateOfBirth: string | undefined): number | null => {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const formatStatus = (status: string): string => {
  return status.charAt(0) + status.slice(1).toLowerCase();
};

export default function CheckInPage() {
  const { selectedSeason } = useSeason();
  const [rounds, setRounds] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [checkIns, setCheckIns] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [saving, setSaving] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DriverStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<Division | 'all'>('all');
  
  // Edit driver states
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editForm, setEditForm] = useState<Partial<Driver>>({});
  const [dateOfBirth, setDateOfBirth] = useState<{ day: number; month: number; year: number }>({ day: 0, month: 0, year: 0 });

  // Fetch rounds and drivers
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedSeason) {
        setRounds([]);
        setDrivers([]);
        setCheckIns({});
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const roundsResponse = await fetch(`/api/rounds?seasonId=${selectedSeason.id}`);
        const driversResponse = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`);
        
        if (roundsResponse.ok) {
          const roundsData = await roundsResponse.json();
          setRounds(roundsData.sort((a: any, b: any) => a.roundNumber - b.roundNumber));
          
          // Set first round as default
          if (roundsData.length > 0 && !selectedRound) {
            setSelectedRound(roundsData[0].id);
          }
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
  }, [selectedSeason, selectedRound]);

  // Fetch check-ins when round changes
  useEffect(() => {
    const fetchCheckIns = async () => {
      if (!selectedRound) return;

      try {
        const response = await fetch(`/api/checkin?roundId=${selectedRound}`);
        if (response.ok) {
          const data = await response.json();
          const checkInsMap: Record<string, boolean> = {};
          (Array.isArray(data) ? data : []).forEach((checkIn: any) => {
            checkInsMap[checkIn.driverId] = checkIn.checkedIn;
          });
          setCheckIns(checkInsMap);
        }
      } catch (error) {
        console.error('Failed to fetch check ins:', error);
      }
    };

    fetchCheckIns();
  }, [selectedRound]);

  // Filter drivers based on status filter, search query, and division
  const filteredDrivers = useMemo(() => {
    let filtered = [...drivers];
    
    // Filter by status (checked in / not checked in)
    if (statusFilter === 'checkedIn') {
      filtered = filtered.filter(driver => checkIns[driver.id] === true);
    } else if (statusFilter === 'notCheckedIn') {
      filtered = filtered.filter(driver => checkIns[driver.id] !== true);
    }
    
    // Filter by division
    if (divisionFilter !== 'all') {
      filtered = filtered.filter(driver => driver.division === divisionFilter);
    }
    
    // Filter by search query (driver name or aliases)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(driver => {
        const nameMatch = driver.name.toLowerCase().includes(query);
        const aliasMatch = driver.aliases?.some((alias: string) => 
          alias.toLowerCase().includes(query)
        ) || false;
        return nameMatch || aliasMatch;
      });
    }
    
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [drivers, checkIns, statusFilter, searchQuery, divisionFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalCount = drivers.length;
    const checkedInCount = drivers.filter(d => checkIns[d.id] === true).length;
    const notCheckedInCount = Math.max(0, totalCount - checkedInCount);
    
    return {
      total: totalCount,
      checkedIn: checkedInCount,
      notCheckedIn: notCheckedInCount,
    };
  }, [drivers, checkIns]);

  const handleToggleCheckIn = async (driverId: string) => {
    if (!selectedRound || !selectedSeason) return;
    
    setSaving(driverId);
    const newCheckedInState = !checkIns[driverId];
    
    try {
      const response = await fetch('/api/checkin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: selectedSeason.id,
          roundId: selectedRound,
          driverId,
          checkedIn: newCheckedInState,
        }),
      });

      if (response.ok) {
        setCheckIns(prev => ({
          ...prev,
          [driverId]: newCheckedInState,
        }));
      } else {
        alert('Failed to update check-in status');
      }
    } catch (error) {
      console.error('Error updating check-in:', error);
      alert('Failed to update check-in status');
    } finally {
      setSaving(null);
    }
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    const aliasesArray = driver.aliases && driver.aliases.length > 0 ? driver.aliases : [];
    setEditForm({ ...driver, aliases: aliasesArray.length > 0 ? [...aliasesArray, ''] : [''] });
    const parsedDate = parseDate(driver.dateOfBirth);
    setDateOfBirth(parsedDate);
  };

  const handleSaveDriver = async () => {
    if (!editingDriver) return;

    try {
      const updatedDriver = {
        ...editForm,
        dateOfBirth: combineDate(dateOfBirth.day, dateOfBirth.month, dateOfBirth.year) || undefined,
        aliases: (editForm.aliases || []).filter((a: string) => a && a.trim() !== ''),
      };

      const response = await fetch(`/api/drivers?id=${editingDriver.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDriver),
      });

      if (response.ok) {
        const updated = await response.json();
        setDrivers(prev => prev.map(d => d.id === updated.id ? updated : d));
        setEditingDriver(null);
        setEditForm({});
      } else {
        alert('Failed to update driver');
      }
    } catch (error) {
      console.error('Error updating driver:', error);
      alert('Failed to update driver');
    }
  };

  const handleAliasChange = (index: number, value: string) => {
    const newAliases = [...(editForm.aliases || [''])];
    newAliases[index] = value;
    setEditForm({ ...editForm, aliases: newAliases });
  };

  const handleAliasRemove = (index: number) => {
    const newAliases = (editForm.aliases || []).filter((_: string, i: number) => i !== index);
    setEditForm({ ...editForm, aliases: newAliases.length > 0 ? newAliases : [''] });
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
                <p className="text-slate-600 dark:text-slate-400">Loading check-in data...</p>
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
        title="Check In"
        subtitle="Track driver attendance for each round"
        icon={ClipboardCheck}
      >
        {/* Stats Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div
                  onClick={() => setStatusFilter('checkedIn')}
                  className={`bg-white dark:bg-slate-800 rounded-xl shadow-md border-2 p-6 cursor-pointer transition-all ${
                    statusFilter === 'checkedIn' 
                      ? 'border-primary-500 shadow-lg' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Checked In</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                        {stats.checkedIn}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <UserRoundCheck className="w-7 h-7 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setStatusFilter('notCheckedIn')}
                  className={`bg-white dark:bg-slate-800 rounded-xl shadow-md border-2 p-6 cursor-pointer transition-all ${
                    statusFilter === 'notCheckedIn' 
                      ? 'border-primary-500 shadow-lg' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Not Checked In</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                        {stats.notCheckedIn}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center">
                      <UserRoundX className="w-7 h-7 text-slate-600 dark:text-slate-400" />
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setStatusFilter('all')}
                  className={`bg-white dark:bg-slate-800 rounded-xl shadow-md border-2 p-6 cursor-pointer transition-all ${
                    statusFilter === 'all' 
                      ? 'border-primary-500 shadow-lg' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Total Drivers</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                        {stats.total}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <UsersRound className="w-7 h-7 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                </div>
              </div>

        {/* Round Selection Section */}
        <SectionCard
          title="Select Round"
          icon={Circle}
          className="mb-8"
        >
            <div className="flex flex-wrap gap-3">
              {rounds.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No rounds available
                </p>
              ) : (
                rounds.map(round => (
                  <button
                    key={round.id}
                    onClick={() => setSelectedRound(round.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedRound === round.id
                        ? 'bg-primary text-white shadow-lg'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    Round {round.roundNumber}: {round.location || 'TBD'}
                  </button>
                ))
              )}
            </div>
        </SectionCard>

        {selectedRound && (
          <>
            {/* Search and Filters */}
            <SectionCard
              icon={Filter}
              title="Search & Filter"
              className="mb-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by driver name or alias..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  />
                </div>

                {/* Division Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    value={divisionFilter}
                    onChange={(e) => setDivisionFilter(e.target.value as Division | 'all')}
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
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
            </SectionCard>

            {/* Drivers List */}
            <SectionCard
              title={`Drivers (${filteredDrivers.length})`}
              icon={Users}
              noPadding
            >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Driver
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Division
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Check-In Status
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {filteredDrivers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                            No drivers found.
                          </td>
                        </tr>
                      ) : (
                        filteredDrivers.map((driver) => {
                          const aliases = driver.aliases && driver.aliases.length > 0 
                            ? driver.aliases.filter((a: string) => a && a.trim() !== '')
                            : [];
                          const isCheckedIn = checkIns[driver.id] === true;
                          
                          return (
                            <tr key={driver.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                                        {driver.name}
                                      </span>
                                      <button
                                        onClick={() => handleEditDriver(driver)}
                                        className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                        title="Edit Driver"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                    </div>
                                    {aliases.length > 0 && (
                                      <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        {aliases.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                {driver.email || '—'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getDivisionColor(driver.division)}`}>
                                  {driver.division}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {isCheckedIn ? (
                                    <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-medium">
                                      <CheckCircle2 className="w-4 h-4" />
                                      Checked In
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                                      <Circle className="w-4 h-4" />
                                      Not Checked In
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center">
                                  <button
                                    onClick={() => handleToggleCheckIn(driver.id)}
                                    disabled={saving === driver.id}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                                      isCheckedIn
                                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                                        : 'bg-primary text-white hover:bg-primary-600'
                                    } ${saving === driver.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    {saving === driver.id ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Updating...</span>
                                      </>
                                    ) : isCheckedIn ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Checked In</span>
                                      </>
                                    ) : (
                                      <span>Check In</span>
                                    )}
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
      </PageLayout>

      {/* Edit Driver Modal */}
      {editingDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Driver</h2>
                <button
                  onClick={() => {
                    setEditingDriver(null);
                    setEditForm({});
                  }}
                  className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editForm.firstName || ''}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editForm.lastName || ''}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Aliases
                </label>
                {(editForm.aliases || ['']).map((alias: string, index: number) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={alias}
                      onChange={(e) => handleAliasChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      placeholder="Enter alias"
                    />
                    {(editForm.aliases || []).length > 1 && (
                      <button
                        onClick={() => handleAliasRemove(index)}
                        className="px-3 py-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setEditForm({ ...editForm, aliases: [...(editForm.aliases || []), ''] })}
                  className="mt-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  Add Alias
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Date of Birth
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    placeholder="Day"
                    min="1"
                    max="31"
                    value={dateOfBirth.day || ''}
                    onChange={(e) => setDateOfBirth({ ...dateOfBirth, day: parseInt(e.target.value) || 0 })}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="Month"
                    min="1"
                    max="12"
                    value={dateOfBirth.month || ''}
                    onChange={(e) => setDateOfBirth({ ...dateOfBirth, month: parseInt(e.target.value) || 0 })}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="Year"
                    min="1900"
                    max="2100"
                    value={dateOfBirth.year || ''}
                    onChange={(e) => setDateOfBirth({ ...dateOfBirth, year: parseInt(e.target.value) || 0 })}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                {dateOfBirth.year && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Age: {calculateAge(combineDate(dateOfBirth.day, dateOfBirth.month, dateOfBirth.year)) || 'N/A'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Division
                </label>
                <select
                  value={editForm.division || 'Division 1'}
                  onChange={(e) => setEditForm({ ...editForm, division: e.target.value as Division })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Division 1">Division 1</option>
                  <option value="Division 2">Division 2</option>
                  <option value="Division 3">Division 3</option>
                  <option value="Division 4">Division 4</option>
                  <option value="New">New</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={editForm.status || 'ACTIVE'}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as DriverStatus })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="BANNED">Banned</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  value={editForm.teamName || ''}
                  onChange={(e) => setEditForm({ ...editForm, teamName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Home Track
                </label>
                <input
                  type="text"
                  value={editForm.homeTrack || ''}
                  onChange={(e) => setEditForm({ ...editForm, homeTrack: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingDriver(null);
                  setEditForm({});
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDriver}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

