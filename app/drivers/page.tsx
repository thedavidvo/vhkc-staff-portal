'use client';

import { useState, useMemo, useEffect } from 'react';
import Header from '@/components/Header';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import AddDriverModal from '@/components/AddDriverModal';
import { useSeason } from '@/components/SeasonContext';
import { Driver, Division, DriverStatus } from '@/types';
import { Edit, Trash2, X, Save, User, Plus, Loader2, Users, Search, Filter } from 'lucide-react';

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

// Helper function to get status color
const getStatusColor = (status: DriverStatus) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    case 'INACTIVE':
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    case 'BANNED':
      return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
  }
};

// Helper function to parse date string into day, month, year
const parseDate = (dateString: string | undefined): { day: number; month: number; year: number } => {
  if (!dateString) return { day: 0, month: 0, year: 0 };
  // Parse YYYY-MM-DD format directly to avoid timezone issues
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return { day, month, year };
    }
  }
  // Fallback to Date parsing if format is different
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return { day: 0, month: 0, year: 0 };
  // Use UTC methods to avoid timezone shifts
  return {
    day: date.getUTCDate(),
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
};

// Helper function to combine day, month, year into date string
const combineDate = (day: number, month: number, year: number): string => {
  if (!day || !month || !year) return '';
  // Use UTC to avoid timezone issues
  const date = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(date.getTime())) return '';
  // Format as YYYY-MM-DD using UTC to avoid timezone shifts
  const yearStr = date.getUTCFullYear().toString();
  const monthStr = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const dayStr = date.getUTCDate().toString().padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayStr}`;
};

// Helper function to calculate age from date of birth
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

// Helper function to format status with normal casing
const formatStatus = (status: string): string => {
  return status.charAt(0) + status.slice(1).toLowerCase();
};


export default function DriversPage() {
  const { selectedSeason } = useSeason();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<Division | 'all'>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<DriverStatus | 'all'>('all');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Driver>>({});
  const [dateOfBirth, setDateOfBirth] = useState<{ day: number; month: number; year: number }>({ day: 0, month: 0, year: 0 });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const notifyDriversUpdated = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vhkc:drivers-updated'));
    }
  };

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

  const teams = useMemo(() => {
    const teamSet = new Set(drivers.map((d) => d.teamName).filter(Boolean));
    return Array.from(teamSet);
  }, [drivers]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        driver.name.toLowerCase().includes(searchLower) ||
        driver.email.toLowerCase().includes(searchLower) ||
        (driver.mobileNumber && driver.mobileNumber.toLowerCase().includes(searchLower));
      const matchesDivision = divisionFilter === 'all' || driver.division === divisionFilter;
      const matchesTeam = teamFilter === 'all' || driver.teamName === teamFilter;
      const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
      return matchesSearch && matchesDivision && matchesTeam && matchesStatus;
    });
  }, [drivers, searchQuery, divisionFilter, teamFilter, statusFilter]);


  const handleEdit = (driver: Driver) => {
    setSelectedDriver(driver);
    // Ensure aliases array always has at least one empty field for editing
    const aliasesArray = driver.aliases && driver.aliases.length > 0 ? driver.aliases : [];
    setEditForm({ ...driver, aliases: aliasesArray.length > 0 ? [...aliasesArray, ''] : [''] });
    const parsedDate = parseDate(driver.dateOfBirth);
    setDateOfBirth(parsedDate);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selectedDriver || !selectedSeason) return;

    try {
      const dateString = combineDate(dateOfBirth.day, dateOfBirth.month, dateOfBirth.year);
      // Filter out empty aliases
      const validAliases = (editForm.aliases || []).filter(a => a.trim() !== '');
      const finalForm = { 
        ...editForm, 
        dateOfBirth: dateString || editForm.dateOfBirth,
        aliases: validAliases.length > 0 ? validAliases : undefined
      };
      const updatedDriver = { ...selectedDriver, ...finalForm } as Driver;
      
      // Update via API
      const response = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDriver),
      });

      if (response.ok) {
        // Update local state
        setDrivers(
          drivers.map((d) => (d.id === selectedDriver.id ? updatedDriver : d))
        );
        setSelectedDriver(updatedDriver);
        setIsEditing(false);
        setDateOfBirth({ day: 0, month: 0, year: 0 });
        notifyDriversUpdated();
      } else {
        alert('Failed to update driver. Please try again.');
      }
    } catch (error) {
      console.error('Failed to update driver:', error);
      alert('Failed to update driver. Please try again.');
    }
  };

  const handleDelete = async (driverId: string) => {
    if (!selectedSeason) return;
    if (!confirm('Are you sure you want to delete this driver? This will permanently delete the driver and all their race results, points, check-ins, and division changes.')) {
      return;
    }

    try {
      const response = await fetch(`/api/drivers?driverId=${driverId}&seasonId=${selectedSeason.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update local state
        setDrivers(drivers.filter((d) => d.id !== driverId));
        if (selectedDriver?.id === driverId) {
          setSelectedDriver(null);
          setIsEditing(false);
        }
        // Notify other components
        notifyDriversUpdated();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete driver. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete driver:', error);
      alert('Failed to delete driver. Please try again.');
    }
  };

  const handleAddDriver = async (driverData: {
    firstName?: string;
    lastName?: string;
    name: string;
    aliases?: string[];
    email: string;
    mobileNumber?: string;
    division: Division;
    dateOfBirth?: string;
    homeTrack?: string;
    status: DriverStatus;
  }) => {
    if (!selectedSeason) {
      alert('Please select a season first');
      return;
    }

    try {
      const newDriver: Driver = {
        id: `driver-${Date.now()}`,
        name: driverData.name,
        aliases: driverData.aliases,
        firstName: driverData.firstName,
        lastName: driverData.lastName,
        email: driverData.email,
        mobileNumber: driverData.mobileNumber,
        division: driverData.division,
        dateOfBirth: driverData.dateOfBirth,
        homeTrack: driverData.homeTrack,
        status: driverData.status,
        lastUpdated: new Date().toISOString().split('T')[0],
      };

      // Add driver via API
      const response = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDriver),
      });

      if (response.ok) {
        // Refresh drivers list
        const refreshResponse = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`);
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setDrivers(data);
        } else {
          // If refresh fails, add to local state
          setDrivers([...drivers, newDriver]);
        }
        setIsAddModalOpen(false);
        notifyDriversUpdated();
      } else {
        const errorData = await response.json();
        alert(`Failed to add driver: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to add driver:', error);
      alert('Failed to add driver. Please try again.');
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
        title="Drivers Management"
        subtitle="Manage all registered drivers and their information"
        icon={Users}
        headerActions={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg hover:shadow-xl hover-lift"
          >
            <Plus className="w-5 h-5" />
            Add Driver
          </button>
        }
      >
      {/* Filters */}
      <SectionCard
        icon={Filter}
        title="Filters & Search"
        className="mb-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search drivers by name, email, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value as Division | 'all')}
            className="px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          >
            <option value="all">All Divisions</option>
            <option value="Division 1">Division 1</option>
            <option value="Division 2">Division 2</option>
            <option value="Division 3">Division 3</option>
            <option value="Division 4">Division 4</option>
            <option value="New">New</option>
          </select>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          >
            <option value="all">All Teams</option>
            {teams.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DriverStatus | 'all')}
            className="px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BANNED">Banned</option>
          </select>
        </div>
      </SectionCard>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Drivers List */}
        <SectionCard
          title={`All Drivers (${filteredDrivers.length})`}
          icon={Users}
          noPadding
          className="lg:col-span-1"
        >
          <div className="overflow-x-auto max-h-[calc(100vh-400px)]">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Alias
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Mobile Number
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Division
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {filteredDrivers.map((driver) => (
                        <tr
                          key={driver.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                            selectedDriver?.id === driver.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                          }`}
                          onClick={() => {
                            setSelectedDriver(driver);
                            setIsEditing(false);
                          }}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                            {driver.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {driver.aliases && driver.aliases.length > 0 
                              ? driver.aliases.join(', ') 
                              : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {driver.mobileNumber || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getDivisionColor(driver.division)}`}>
                              {driver.division}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(driver.status)}`}>
                              {driver.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(driver);
                                }}
                                className="p-1 text-primary hover:bg-primary-100 dark:hover:bg-primary-900 rounded"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(driver.id);
                                }}
                                className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          </SectionCard>

          {/* Driver Details Panel */}
          <div className="lg:col-span-1">
            {selectedDriver ? (
              <SectionCard
                title="Driver Details"
                icon={User}
                actions={
                  !isEditing && (
                    <button
                      onClick={() => handleEdit(selectedDriver)}
                      className="p-2 text-primary hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-xl transition-colors"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  )
                }
              >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Driver Details
                    </h2>
                    {!isEditing && (
                      <button
                        onClick={() => handleEdit(selectedDriver)}
                        className="p-2 text-primary hover:bg-primary-100 dark:hover:bg-primary-900 rounded"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            First Name
                          </label>
                          <input
                            type="text"
                            value={editForm.firstName || selectedDriver.firstName || ''}
                            onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder={selectedDriver.firstName || 'First Name'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={editForm.lastName || selectedDriver.lastName || ''}
                            onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder={selectedDriver.lastName || 'Last Name'}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={editForm.email || ''}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder={selectedDriver.email}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Mobile Number
                          </label>
                          <input
                            type="tel"
                            value={editForm.mobileNumber || selectedDriver.mobileNumber || ''}
                            onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder={selectedDriver.mobileNumber || 'Mobile Number'}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Date of Birth
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={dateOfBirth.day || ''}
                              onChange={(e) => {
                                const day = parseInt(e.target.value) || 0;
                                setDateOfBirth({ ...dateOfBirth, day });
                                const dateString = combineDate(day, dateOfBirth.month, dateOfBirth.year);
                                if (dateString) {
                                  setEditForm({ ...editForm, dateOfBirth: dateString });
                                }
                              }}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="DD"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              min="1"
                              max="12"
                              value={dateOfBirth.month || ''}
                              onChange={(e) => {
                                const month = parseInt(e.target.value) || 0;
                                setDateOfBirth({ ...dateOfBirth, month });
                                const dateString = combineDate(dateOfBirth.day, month, dateOfBirth.year);
                                if (dateString) {
                                  setEditForm({ ...editForm, dateOfBirth: dateString });
                                }
                              }}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="MM"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              min="1900"
                              max={new Date().getFullYear()}
                              value={dateOfBirth.year || ''}
                              onChange={(e) => {
                                const year = parseInt(e.target.value) || 0;
                                setDateOfBirth({ ...dateOfBirth, year });
                                const dateString = combineDate(dateOfBirth.day, dateOfBirth.month, year);
                                if (dateString) {
                                  setEditForm({ ...editForm, dateOfBirth: dateString });
                                }
                              }}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="YYYY"
                            />
                          </div>
                        </div>
                        {(dateOfBirth.day && dateOfBirth.month && dateOfBirth.year) || selectedDriver.dateOfBirth ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Age: {calculateAge(combineDate(dateOfBirth.day, dateOfBirth.month, dateOfBirth.year) || selectedDriver.dateOfBirth) ?? 'N/A'} years old
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Division
                        </label>
                        <div className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800">
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getDivisionColor(selectedDriver.division)}`}>
                            {selectedDriver.division}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Aliases
                        </label>
                        <div className="space-y-2">
                          {(editForm.aliases || ['']).map((alias, index) => (
                            <div key={index} className="flex gap-2">
                              <input
                                type="text"
                                value={alias}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const currentAliases = editForm.aliases || [''];
                                    const trimmedValue = e.currentTarget.value.trim();
                                    
                                    // Always add new alias if current one has content and it's the last field
                                    if (trimmedValue && index === currentAliases.length - 1) {
                                      // Update the current alias value and add a new empty one
                                      const newAliases = [...currentAliases];
                                      newAliases[index] = trimmedValue;
                                      newAliases.push('');
                                      setEditForm({ ...editForm, aliases: newAliases });
                                    } else if (trimmedValue && index < currentAliases.length - 1) {
                                      // If it's not the last field, just update the current value
                                      const newAliases = [...currentAliases];
                                      newAliases[index] = trimmedValue;
                                      setEditForm({ ...editForm, aliases: newAliases });
                                    }
                                  }
                                }}
                                onChange={(e) => {
                                  const currentAliases = editForm.aliases || [''];
                                  const newAliases = [...currentAliases];
                                  newAliases[index] = e.target.value;
                                  setEditForm({ ...editForm, aliases: newAliases });
                                }}
                                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder={`Alias ${index + 1}`}
                              />
                              {index < (editForm.aliases || ['']).length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentAliases = editForm.aliases || [''];
                                    const newAliases = currentAliases.filter((_, i) => i !== index);
                                    // Ensure at least one empty field remains
                                    if (newAliases.length === 0) {
                                      newAliases.push('');
                                    }
                                    setEditForm({ ...editForm, aliases: newAliases });
                                  }}
                                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const currentAliases = editForm.aliases || [''];
                              setEditForm({ ...editForm, aliases: [...currentAliases, ''] });
                            }}
                            className="px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-800 transition-colors text-sm"
                          >
                            + Add Alias
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Press Enter on the last alias field to add another
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Home Track
                        </label>
                        <input
                          type="text"
                          value={editForm.homeTrack || selectedDriver.homeTrack || ''}
                          onChange={(e) => setEditForm({ ...editForm, homeTrack: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder={selectedDriver.homeTrack || 'Home Track'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Team Name
                        </label>
                        <div className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {selectedDriver.teamName || 'No Team'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Status
                        </label>
                        <div className="flex gap-2">
                          {(['ACTIVE', 'INACTIVE', 'BANNED'] as DriverStatus[]).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setEditForm({ ...editForm, status })}
                              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                                (editForm.status || selectedDriver.status) === status
                                  ? getStatusColor(status) + ' ring-2 ring-offset-2 ring-slate-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                              }`}
                            >
                              {formatStatus(status)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <button
                          onClick={handleSave}
                          className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
                        >
                          <Save className="w-4 h-4 inline mr-2" />
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setEditForm({});
                            setDateOfBirth({ day: 0, month: 0, year: 0 });
                          }}
                          className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">First Name</p>
                          <p className="text-base font-medium text-slate-900 dark:text-white">
                            {selectedDriver.firstName || selectedDriver.name.split(' ')[0] || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Last Name</p>
                          <p className="text-base font-medium text-slate-900 dark:text-white">
                            {selectedDriver.lastName || selectedDriver.name.split(' ').slice(1).join(' ') || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Email</p>
                          <p className="text-base font-medium text-slate-900 dark:text-white">
                            {selectedDriver.email}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Mobile Number</p>
                          <p className="text-base font-medium text-slate-900 dark:text-white">
                            {selectedDriver.mobileNumber || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Date of Birth</p>
                        <p className="text-base font-medium text-slate-900 dark:text-white">
                          {selectedDriver.dateOfBirth 
                            ? `${new Date(selectedDriver.dateOfBirth).toLocaleDateString()} (${calculateAge(selectedDriver.dateOfBirth) ?? 'N/A'} years old)`
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Division</p>
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getDivisionColor(selectedDriver.division)}`}>
                          {selectedDriver.division}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Aliases</p>
                        <p className="text-base font-medium text-slate-900 dark:text-white">
                          {selectedDriver.aliases && selectedDriver.aliases.length > 0
                            ? selectedDriver.aliases.join(', ')
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Team</p>
                        <p className="text-base font-medium text-slate-900 dark:text-white">
                          {selectedDriver.teamName || 'No Team'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Home Track</p>
                        <p className="text-base font-medium text-slate-900 dark:text-white">
                          {selectedDriver.homeTrack || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Status</p>
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(selectedDriver.status)}`}>
                          {selectedDriver.status}
                        </span>
                      </div>
                    </div>
                  )}
              </SectionCard>
            ) : (
              <SectionCard
                title="Driver Details"
                icon={User}
              >
                <div className="text-center py-12">
                  <User className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 text-lg">
                    Select a driver to view details
                  </p>
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      </PageLayout>

      <AddDriverModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddDriver}
      />
    </>
  );
}
