'use client';

import { useState, useMemo, useEffect } from 'react';
import Header from '@/components/Header';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import AddDriverModal from '@/components/AddDriverModal';
import EditDriverModal from '@/components/EditDriverModal';
import { useSeason } from '@/components/SeasonContext';
import { Driver, Division, DriverStatus } from '@/types';
import { Edit, Trash2, Plus, Loader2, Users, Search, Filter, ChevronUp, ChevronDown } from 'lucide-react';

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


// Helper function to format status with normal casing
const formatStatus = (status: string): string => {
  return status.charAt(0) + status.slice(1).toLowerCase();
};

// Helper function to format mobile number as "XXXX XXX XXX"
const formatMobileNumber = (mobileNumber: string | undefined): string => {
  if (!mobileNumber) return 'N/A';
  
  // Remove all non-digit characters
  const digitsOnly = mobileNumber.replace(/\D/g, '');
  
  if (digitsOnly.length === 0) return 'N/A';
  
  // Format as "XXXX XXX XXX" (first 4, then 3, then 3)
  if (digitsOnly.length <= 4) {
    return digitsOnly;
  } else if (digitsOnly.length <= 7) {
    return `${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4)}`;
  } else {
    return `${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4, 7)} ${digitsOnly.slice(7, 10)}`;
  }
};


export default function DriversPage() {
  const { selectedSeason } = useSeason();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<Division | 'all'>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<DriverStatus | 'all'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState<Driver | null>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
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

  const filteredAndSortedDrivers = useMemo(() => {
    let filtered = drivers.filter((driver) => {
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

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: string | number | undefined;
        let bValue: string | number | undefined;

        switch (sortField) {
          case 'name':
            aValue = a.name?.toLowerCase() || '';
            bValue = b.name?.toLowerCase() || '';
            break;
          case 'firstName':
            aValue = a.firstName?.toLowerCase() || '';
            bValue = b.firstName?.toLowerCase() || '';
            break;
          case 'lastName':
            aValue = a.lastName?.toLowerCase() || '';
            bValue = b.lastName?.toLowerCase() || '';
            break;
          case 'email':
            aValue = a.email?.toLowerCase() || '';
            bValue = b.email?.toLowerCase() || '';
            break;
          case 'aliases':
            aValue = a.aliases?.join(', ').toLowerCase() || '';
            bValue = b.aliases?.join(', ').toLowerCase() || '';
            break;
          case 'mobileNumber':
            aValue = a.mobileNumber?.toLowerCase() || '';
            bValue = b.mobileNumber?.toLowerCase() || '';
            break;
          case 'division':
            aValue = a.division?.toLowerCase() || '';
            bValue = b.division?.toLowerCase() || '';
            break;
          case 'teamName':
            aValue = a.teamName?.toLowerCase() || '';
            bValue = b.teamName?.toLowerCase() || '';
            break;
          case 'dateOfBirth':
            aValue = a.dateOfBirth ? new Date(a.dateOfBirth).getTime() : 0;
            bValue = b.dateOfBirth ? new Date(b.dateOfBirth).getTime() : 0;
            break;
          case 'homeTrack':
            aValue = a.homeTrack?.toLowerCase() || '';
            bValue = b.homeTrack?.toLowerCase() || '';
            break;
          case 'status':
            aValue = a.status?.toLowerCase() || '';
            bValue = b.status?.toLowerCase() || '';
            break;
          case 'lastUpdated':
            aValue = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
            bValue = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
            break;
          default:
            return 0;
        }

        // Handle undefined values
        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return sortDirection === 'asc' ? 1 : -1;
        if (bValue === undefined) return sortDirection === 'asc' ? -1 : 1;
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [drivers, searchQuery, divisionFilter, teamFilter, statusFilter, sortField, sortDirection]);


  const handleEdit = (driver: Driver) => {
    setDriverToEdit(driver);
    setIsEditModalOpen(true);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSaveEdit = async (updatedDriver: Driver) => {
    if (!selectedSeason) return;

    try {
      // Update via API
      const response = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDriver),
      });

      if (response.ok) {
        // Update local state
        setDrivers(
          drivers.map((d) => (d.id === updatedDriver.id ? updatedDriver : d))
        );
        
        
        notifyDriversUpdated();
      } else {
        throw new Error('Failed to update driver');
      }
    } catch (error) {
      console.error('Failed to save driver:', error);
      throw error;
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

      {/* Main Content */}
      <SectionCard
        title={`All Drivers (${filteredAndSortedDrivers.length})`}
        icon={Users}
        noPadding
        className="lg:col-span-2"
      >
        <div className="overflow-x-auto max-h-[calc(100vh-400px)]">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-30 shadow-sm">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase sticky left-0 bg-slate-50 dark:bg-slate-800 z-50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-r border-slate-200 dark:border-slate-700"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Name
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => handleSort('firstName')}
                >
                  <div className="flex items-center gap-1">
                    First Name
                    {sortField === 'firstName' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => handleSort('lastName')}
                >
                  <div className="flex items-center gap-1">
                    Last Name
                    {sortField === 'lastName' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-1">
                    Email
                    {sortField === 'email' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => handleSort('aliases')}
                >
                  <div className="flex items-center gap-1">
                    Alias
                    {sortField === 'aliases' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => handleSort('mobileNumber')}
                >
                  <div className="flex items-center gap-1">
                    Mobile Number
                    {sortField === 'mobileNumber' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => handleSort('division')}
                >
                  <div className="flex items-center gap-1">
                    Division
                    {sortField === 'division' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => handleSort('teamName')}
                >
                  <div className="flex items-center gap-1">
                    Team Name
                    {sortField === 'teamName' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => handleSort('dateOfBirth')}
                >
                  <div className="flex items-center gap-1">
                    Date of Birth
                    {sortField === 'dateOfBirth' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => handleSort('homeTrack')}
                >
                  <div className="flex items-center gap-1">
                    Home Track
                    {sortField === 'homeTrack' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortField === 'status' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => handleSort('lastUpdated')}
                >
                  <div className="flex items-center gap-1">
                    Last Updated
                    {sortField === 'lastUpdated' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase sticky right-0 bg-slate-50 dark:bg-slate-800 z-50 border-l border-slate-200 dark:border-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredAndSortedDrivers.map((driver) => (
                <tr
                  key={driver.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-800 z-0 border-r border-slate-200 dark:border-slate-700">
                    {driver.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {driver.firstName || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {driver.lastName || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {driver.email || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {driver.aliases && driver.aliases.length > 0 
                      ? driver.aliases.join(', ') 
                      : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {formatMobileNumber(driver.mobileNumber)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getDivisionColor(driver.division)}`}>
                      {driver.division}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {driver.teamName || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {driver.dateOfBirth 
                      ? new Date(driver.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                      : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {driver.homeTrack || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(driver.status)}`}>
                      {driver.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {driver.lastUpdated 
                      ? new Date(driver.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                      : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm sticky right-0 bg-white dark:bg-slate-800 z-0 border-l border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(driver);
                        }}
                        className="p-1 text-primary hover:bg-primary-100 dark:hover:bg-primary-900 rounded"
                        title="Edit driver"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(driver.id);
                        }}
                        className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                        title="Delete driver"
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
      </PageLayout>

      <AddDriverModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddDriver}
      />
      <EditDriverModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setDriverToEdit(null);
        }}
        driver={driverToEdit}
        onSave={handleSaveEdit}
      />
    </>
  );
}
