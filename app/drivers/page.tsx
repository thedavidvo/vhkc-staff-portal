'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import AddDriverModal from '@/components/AddDriverModal';
import { mockDrivers, mockRaces } from '@/data/mockData';
import { Driver, Division, DriverStatus, RaceResult } from '@/types';
import { Edit, Trash2, X, Save, User, Clock, Trophy, MapPin, Calendar, Plus } from 'lucide-react';

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
      return 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200';
  }
};

// Helper function to parse date string into day, month, year
const parseDate = (dateString: string | undefined): { day: number; month: number; year: number } => {
  if (!dateString) return { day: 0, month: 0, year: 0 };
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return { day: 0, month: 0, year: 0 };
  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
};

// Helper function to combine day, month, year into date string
const combineDate = (day: number, month: number, year: number): string => {
  if (!day || !month || !year) return '';
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
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

// Helper function to get race history for a driver
const getDriverRaceHistory = (driverId: string): RaceResult[] => {
  const history: RaceResult[] = [];
  
  mockRaces
    .filter((race) => race.status === 'completed' && race.results)
    .forEach((race) => {
      race.results?.forEach((divisionResult) => {
        const driverResult = divisionResult.results.find((r) => r.driverId === driverId);
        if (driverResult) {
          history.push({
            raceId: race.id,
            raceName: race.name,
            trackName: race.location,
            season: race.season,
            round: race.round,
            position: driverResult.position,
            qualificationTime: `1:${(Math.floor(Math.random() * 5) + 15).toString().padStart(2, '0')}.${Math.floor(Math.random() * 99).toString().padStart(2, '0')}`, // Mock qualification time
            fastestLap: driverResult.fastestLap,
            points: driverResult.points,
            date: race.date,
          });
        }
      });
    });
  
  return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState(mockDrivers);
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<Division | 'all'>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Driver>>({});
  const [dateOfBirth, setDateOfBirth] = useState<{ day: number; month: number; year: number }>({ day: 0, month: 0, year: 0 });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const teams = useMemo(() => {
    const teamSet = new Set(drivers.map((d) => d.teamName).filter(Boolean));
    return Array.from(teamSet);
  }, [drivers]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const matchesSearch =
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDivision = divisionFilter === 'all' || driver.division === divisionFilter;
      const matchesTeam = teamFilter === 'all' || driver.teamName === teamFilter;
      return matchesSearch && matchesDivision && matchesTeam;
    });
  }, [drivers, searchQuery, divisionFilter, teamFilter]);

  const selectedDriverRaceHistory = useMemo(() => {
    if (!selectedDriver) return [];
    return getDriverRaceHistory(selectedDriver.id);
  }, [selectedDriver]);

  const handleEdit = (driver: Driver) => {
    setSelectedDriver(driver);
    setEditForm({ ...driver });
    const parsedDate = parseDate(driver.dateOfBirth);
    setDateOfBirth(parsedDate);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (selectedDriver) {
      const dateString = combineDate(dateOfBirth.day, dateOfBirth.month, dateOfBirth.year);
      const finalForm = { ...editForm, dateOfBirth: dateString || editForm.dateOfBirth };
      setDrivers(
        drivers.map((d) => (d.id === selectedDriver.id ? { ...d, ...finalForm } as Driver : d))
      );
      const updatedDriver = { ...selectedDriver, ...finalForm } as Driver;
      setSelectedDriver(updatedDriver);
      setIsEditing(false);
      setDateOfBirth({ day: 0, month: 0, year: 0 });
    }
  };

  const handleDelete = (driverId: string) => {
    if (confirm('Are you sure you want to delete this driver?')) {
      setDrivers(drivers.filter((d) => d.id !== driverId));
      if (selectedDriver?.id === driverId) {
        setSelectedDriver(null);
        setIsEditing(false);
      }
    }
  };

  const handleAddDriver = (driverData: {
    firstName?: string;
    lastName?: string;
    name: string;
    email: string;
    division: Division;
    dateOfBirth?: string;
    homeTrack?: string;
    status: DriverStatus;
  }) => {
    const newDriver: Driver = {
      id: `driver-${Date.now()}`,
      name: driverData.name,
      firstName: driverData.firstName,
      lastName: driverData.lastName,
      email: driverData.email,
      division: driverData.division,
      dateOfBirth: driverData.dateOfBirth,
      homeTrack: driverData.homeTrack,
      status: driverData.status,
      lastRacePosition: 0,
      fastestLap: '0:00.00',
      pointsTotal: 0,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    setDrivers([...drivers, newDriver]);
  };

  return (
    <>
      <Header hideSearch />
      <div className="p-4 md:p-6">
        <div className="max-w-[95%] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Drivers Management
            </h1>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-md"
            >
              <Plus className="w-5 h-5" />
              Add Driver
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search drivers by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
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
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Teams</option>
                {teams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Drivers List */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    All Drivers ({filteredDrivers.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Division
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Team
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
                          className={`hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
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
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getDivisionColor(driver.division)}`}>
                              {driver.division}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {driver.teamName || 'No Team'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(driver.status)}`}>
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
              </div>
            </div>

            {/* Driver Details Panel */}
            <div className="lg:col-span-1">
              {selectedDriver ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
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
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
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
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder={selectedDriver.lastName || 'Last Name'}
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
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder={selectedDriver.email}
                        />
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
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
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
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
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
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
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
                        <div className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900">
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getDivisionColor(selectedDriver.division)}`}>
                            {selectedDriver.division}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Home Track
                        </label>
                        <input
                          type="text"
                          value={editForm.homeTrack || selectedDriver.homeTrack || ''}
                          onChange={(e) => setEditForm({ ...editForm, homeTrack: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder={selectedDriver.homeTrack || 'Home Track'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Team Name
                        </label>
                        <div className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
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
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
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
                          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
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
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Email</p>
                        <p className="text-base font-medium text-slate-900 dark:text-white">
                          {selectedDriver.email}
                        </p>
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
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getDivisionColor(selectedDriver.division)}`}>
                          {selectedDriver.division}
                        </span>
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
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedDriver.status)}`}>
                          {selectedDriver.status}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-8 text-center">
                  <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">
                    Select a driver to view details
                  </p>
                </div>
              )}
            </div>

            {/* Race History Panel */}
            <div className="lg:col-span-1">
              {selectedDriver ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                    Racing History
                  </h2>
                  {selectedDriverRaceHistory.length === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                      No race history available
                    </p>
                  ) : (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {selectedDriverRaceHistory.map((race, index) => (
                        <div
                          key={`${race.raceId}-${index}`}
                          className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <MapPin className="w-4 h-4 text-slate-400" />
                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                  {race.trackName}
                                </h3>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {race.raceName}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {race.position === 1 && (
                                <Trophy className="w-5 h-5 text-amber-500" />
                              )}
                              <span className="text-lg font-bold text-slate-900 dark:text-white">
                                {race.position}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                              <Calendar className="w-3 h-3" />
                              <span>{race.season}</span>
                            </div>
                            <div className="text-slate-600 dark:text-slate-400">
                              Round {race.round}
                            </div>
                            {race.qualificationTime && (
                              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                <Clock className="w-3 h-3" />
                                <span>Qual: {race.qualificationTime}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                              <Clock className="w-3 h-3" />
                              <span>Fastest: {race.fastestLap}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-8 text-center">
                  <p className="text-slate-500 dark:text-slate-400">
                    Select a driver to view race history
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AddDriverModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddDriver}
      />
    </>
  );
}
