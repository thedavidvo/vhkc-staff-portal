'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import { useSeason } from '@/components/SeasonContext';
import { Driver, Division, DriverStatus } from '@/types';
import { Loader2, Edit, Save, X, CheckCircle2, Circle, Search, Filter, UserCheck, Users, UserRoundCheck, UserRoundX, UsersRound, ClipboardCheck, DollarSign, Download } from 'lucide-react';
import { exportDriverListToCSV, downloadCSV } from '@/lib/csvExport';

type DriverStatusFilter = 'all' | 'checkedIn' | 'notCheckedIn';
type PaymentStatusFilter = 'all' | 'paid' | 'pending' | 'not_paid';

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

const getPaymentColor = (status: 'paid' | 'pending' | 'not_paid') => {
  switch (status) {
    case 'paid':
      return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/70';
    case 'pending':
      return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/70';
    default:
      return 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/70';
  }
};

const getCheckInStatusColor = (checkedIn: boolean) => {
  return checkedIn
    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
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
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [saving, setSaving] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DriverStatusFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatusFilter>('all');
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

  // Fetch check-ins and payments when round changes
  useEffect(() => {
    const fetchCheckInsAndPayments = async () => {
      if (!selectedRound) return;

      try {
        const [checkInResponse, paymentsResponse] = await Promise.all([
          fetch(`/api/checkin?roundId=${selectedRound}`),
          fetch(`/api/payments?roundId=${selectedRound}`),
        ]);
        
        if (checkInResponse.ok) {
          const data = await checkInResponse.json();
          const checkInsMap: Record<string, boolean> = {};
          (Array.isArray(data) ? data : []).forEach((checkIn: any) => {
            checkInsMap[checkIn.driverId] = checkIn.checkedIn;
          });
          setCheckIns(checkInsMap);
        }

        if (paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json();
          setPayments(paymentsData);
        }
      } catch (error) {
        console.error('Failed to fetch check ins and payments:', error);
      }
    };

    fetchCheckInsAndPayments();
  }, [selectedRound]);

  // Helper to get payment status for a driver
  const getPaymentStatus = (driverId: string) => {
    const payment = payments.find(p => p.driverId === driverId);
    if (!payment) return 'pending';
    if (payment.status === 'paid' || payment.status === 'pending' || payment.status === 'not_paid') {
      return payment.status;
    }
    return 'pending';
  };

  // Filter drivers based on status filter, search query, division, and payment
  const filteredDrivers = useMemo(() => {
    let filtered = [...drivers];
    
    // Filter by status (checked in / not checked in)
    if (statusFilter === 'checkedIn') {
      filtered = filtered.filter(driver => checkIns[driver.id] === true);
    } else if (statusFilter === 'notCheckedIn') {
      filtered = filtered.filter(driver => checkIns[driver.id] !== true);
    }
    
    // Filter by payment status
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(driver => {
        const status = getPaymentStatus(driver.id);
        return status === paymentFilter;
      });
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
  }, [drivers, checkIns, statusFilter, paymentFilter, searchQuery, divisionFilter, payments]);

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

  const handleExportForVenue = async () => {
    if (!selectedRound || !selectedSeason) {
      alert('Please select a round');
      return;
    }

    const round = rounds.find(r => r.id === selectedRound);
    if (!round) return;

    // Apply current filters to export
    const filters = {
      division: divisionFilter !== 'all' ? divisionFilter : undefined,
      paymentStatus: paymentFilter !== 'all' ? paymentFilter : undefined,
      checkInStatus: statusFilter !== 'all' ? statusFilter : undefined,
    };

    const csvContent = exportDriverListToCSV(filteredDrivers, payments, checkIns, round, filters);
    const filename = `venue_driver_list_round${round.roundNumber}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename);
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
        headerActions={
          selectedRound && (
            <button
              onClick={handleExportForVenue}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export for Venue
            </button>
          )
        }
      >
        {/* Stats Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <div
                  onClick={() => setStatusFilter('checkedIn')}
                  className={`bg-white dark:bg-slate-900 rounded-md border p-3 cursor-pointer transition-colors ${
                    statusFilter === 'checkedIn' 
                      ? 'border-slate-900 dark:border-slate-100' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Checked In</p>
                      <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">
                        {stats.checkedIn}
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <UserRoundCheck className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setStatusFilter('notCheckedIn')}
                  className={`bg-white dark:bg-slate-900 rounded-md border p-3 cursor-pointer transition-colors ${
                    statusFilter === 'notCheckedIn' 
                      ? 'border-slate-900 dark:border-slate-100' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Not Checked In</p>
                      <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">
                        {stats.notCheckedIn}
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <UserRoundX className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setStatusFilter('all')}
                  className={`bg-white dark:bg-slate-900 rounded-md border p-3 cursor-pointer transition-colors ${
                    statusFilter === 'all' 
                      ? 'border-slate-900 dark:border-slate-100' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Total Drivers</p>
                      <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">
                        {stats.total}
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <UsersRound className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </div>
                  </div>
                </div>
              </div>

        {/* Round Selection Section */}
        <SectionCard
          title="Select Round"
          icon={Circle}
          className="mb-6"
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
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors border ${
                      selectedRound === round.id
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
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
              className="mb-6"
            >
              <div className="grid grid-cols-1 gap-3">
                {/* Search - Full Width */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by driver name or alias..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-full pl-9 pr-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400/40 focus:border-slate-300 dark:focus:border-slate-600 transition-colors"
                  />
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Division Filter */}
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={divisionFilter}
                      onChange={(e) => setDivisionFilter(e.target.value as Division | 'all')}
                      className="h-9 w-full pl-9 pr-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40 focus:border-slate-300 dark:focus:border-slate-600 transition-colors"
                    >
                      <option value="all">All Divisions</option>
                      <option value="Division 1">Division 1</option>
                      <option value="Division 2">Division 2</option>
                      <option value="Division 3">Division 3</option>
                      <option value="Division 4">Division 4</option>
                      <option value="New">New</option>
                    </select>
                  </div>

                  {/* Check-In Status Filter */}
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as DriverStatusFilter)}
                      className="h-9 w-full pl-9 pr-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40 focus:border-slate-300 dark:focus:border-slate-600 transition-colors"
                    >
                      <option value="all">All Check-In Status</option>
                      <option value="checkedIn">Checked In</option>
                      <option value="notCheckedIn">Not Checked In</option>
                    </select>
                  </div>

                  {/* Payment Status Filter */}
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value as PaymentStatusFilter)}
                      className="h-9 w-full pl-9 pr-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40 focus:border-slate-300 dark:focus:border-slate-600 transition-colors"
                    >
                      <option value="all">All Payment Status</option>
                      <option value="paid">Paid</option>
                      <option value="pending">No Ticket</option>
                      <option value="not_paid">Not Paid</option>
                    </select>
                  </div>
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
                    <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400 uppercase">
                          Driver
                        </th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400 uppercase">
                          Email
                        </th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400 uppercase">
                          Division
                        </th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400 uppercase">
                          Payment
                        </th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400 uppercase">
                          Check-In Status
                        </th>
                        <th className="px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {filteredDrivers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            No drivers found.
                          </td>
                        </tr>
                      ) : (
                        filteredDrivers.map((driver) => {
                          const aliases = driver.aliases && driver.aliases.length > 0 
                            ? driver.aliases.filter((a: string) => a && a.trim() !== '')
                            : [];
                          const isCheckedIn = checkIns[driver.id] === true;
                          const paymentStatus = getPaymentStatus(driver.id);
                          
                          return (
                            <tr key={driver.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-slate-900 dark:text-white leading-tight">
                                        {driver.name}
                                      </span>
                                      <button
                                        onClick={() => handleEditDriver(driver)}
                                        className="p-1 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        title="Edit Driver"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    {aliases.length > 0 && (
                                      <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {aliases.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">
                                {driver.email || '—'}
                              </td>
                              <td className="px-3 py-2.5">
                                <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md whitespace-nowrap ${getDivisionColor(driver.division)}`}>
                                  {driver.division}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                {paymentStatus === 'paid' ? (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md ${getPaymentColor('paid')}`}>
                                    <DollarSign className="w-3 h-3" />
                                    Paid
                                  </span>
                                ) : paymentStatus === 'pending' ? (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md ${getPaymentColor('pending')}`}>
                                    <DollarSign className="w-3 h-3" />
                                    No Ticket
                                  </span>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md ${getPaymentColor('not_paid')}`}>
                                    <DollarSign className="w-3 h-3" />
                                    Not Paid
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  {isCheckedIn ? (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${getCheckInStatusColor(true)}`}>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Checked In
                                    </span>
                                  ) : (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${getCheckInStatusColor(false)}`}>
                                      <Circle className="w-3.5 h-3.5" />
                                      Not Checked In
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center justify-center">
                                  <button
                                    onClick={() => handleToggleCheckIn(driver.id)}
                                    disabled={saving === driver.id}
                                    className={`h-8 px-2.5 rounded-md text-xs transition-colors inline-flex items-center gap-1.5 border ${
                                      isCheckedIn
                                        ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 hover:bg-slate-700 dark:hover:bg-slate-200'
                                    } ${saving === driver.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    {saving === driver.id ? (
                                      <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>Updating...</span>
                                      </>
                                    ) : isCheckedIn ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3" />
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
        <div className="fixed inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Edit Driver</h2>
                <button
                  onClick={() => {
                    setEditingDriver(null);
                    setEditForm({});
                  }}
                  className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="h-9 w-full px-3 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editForm.firstName || ''}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="h-9 w-full px-3 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editForm.lastName || ''}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="h-9 w-full px-3 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="h-9 w-full px-3 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Aliases
                </label>
                {(editForm.aliases || ['']).map((alias: string, index: number) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={alias}
                      onChange={(e) => handleAliasChange(index, e.target.value)}
                      className="h-9 flex-1 px-3 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40"
                      placeholder="Enter alias"
                    />
                    {(editForm.aliases || []).length > 1 && (
                      <button
                        onClick={() => handleAliasRemove(index)}
                        className="h-9 px-3 border border-slate-300 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setEditForm({ ...editForm, aliases: [...(editForm.aliases || []), ''] })}
                  className="mt-1 h-8 px-3 text-xs border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Add Alias
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
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
                    className="h-9 px-3 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40"
                  />
                  <input
                    type="number"
                    placeholder="Month"
                    min="1"
                    max="12"
                    value={dateOfBirth.month || ''}
                    onChange={(e) => setDateOfBirth({ ...dateOfBirth, month: parseInt(e.target.value) || 0 })}
                    className="h-9 px-3 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40"
                  />
                  <input
                    type="number"
                    placeholder="Year"
                    min="1900"
                    max="2100"
                    value={dateOfBirth.year || ''}
                    onChange={(e) => setDateOfBirth({ ...dateOfBirth, year: parseInt(e.target.value) || 0 })}
                    className="h-9 px-3 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40"
                  />
                </div>
                {dateOfBirth.year && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Age: {calculateAge(combineDate(dateOfBirth.day, dateOfBirth.month, dateOfBirth.year)) || 'N/A'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Division
                </label>
                <select
                  value={editForm.division || 'Division 1'}
                  onChange={(e) => setEditForm({ ...editForm, division: e.target.value as Division })}
                  className="h-9 w-full px-3 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40"
                >
                  <option value="Division 1">Division 1</option>
                  <option value="Division 2">Division 2</option>
                  <option value="Division 3">Division 3</option>
                  <option value="Division 4">Division 4</option>
                  <option value="New">New</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Status
                </label>
                <select
                  value={editForm.status || 'ACTIVE'}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as DriverStatus })}
                  className="h-9 w-full px-3 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="BANNED">Banned</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  value={editForm.teamName || ''}
                  onChange={(e) => setEditForm({ ...editForm, teamName: e.target.value })}
                  className="h-9 w-full px-3 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Home Track
                </label>
                <input
                  type="text"
                  value={editForm.homeTrack || ''}
                  onChange={(e) => setEditForm({ ...editForm, homeTrack: e.target.value })}
                  className="h-9 w-full px-3 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditingDriver(null);
                  setEditForm({});
                }}
                className="h-9 px-3 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDriver}
                className="h-9 px-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 text-sm inline-flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

