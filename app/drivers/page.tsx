'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import { mockDrivers } from '@/data/mockData';
import { Driver, Division, DriverStatus } from '@/types';
import { Search, Filter, Edit, Trash2, X, Save, User } from 'lucide-react';

export default function DriversPage() {
  const [drivers, setDrivers] = useState(mockDrivers);
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<Division | 'all'>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Driver>>({});

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

  const handleEdit = (driver: Driver) => {
    setSelectedDriver(driver);
    setEditForm({ ...driver });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (selectedDriver) {
      setDrivers(
        drivers.map((d) => (d.id === selectedDriver.id ? { ...d, ...editForm } as Driver : d))
      );
      setIsEditing(false);
      setSelectedDriver(null);
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

  const handleSearchDriver = (query: string) => {
    setSearchQuery(query);
    const found = drivers.find(
      (d) =>
        d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.email.toLowerCase().includes(query.toLowerCase())
    );
    if (found) {
      setSelectedDriver(found);
      setIsEditing(false);
    }
  };

  return (
    <>
      <Header title="Drivers" />
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
            Drivers Management
          </h1>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search drivers by name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearchDriver(e.target.value);
                  }}
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
            <div className="lg:col-span-2">
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
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                              {driver.division}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {driver.teamName || 'No Team'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                driver.status === 'ACTIVE'
                                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                              }`}
                            >
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
                        onClick={() => setIsEditing(true)}
                        className="p-2 text-primary hover:bg-primary-100 dark:hover:bg-primary-900 rounded"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
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
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Division
                        </label>
                        <select
                          value={editForm.division || ''}
                          onChange={(e) => setEditForm({ ...editForm, division: e.target.value as Division })}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="Division 1">Division 1</option>
                          <option value="Division 2">Division 2</option>
                          <option value="Division 3">Division 3</option>
                          <option value="Division 4">Division 4</option>
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
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Status
                        </label>
                        <select
                          value={editForm.status || ''}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value as DriverStatus })}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
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
                          }}
                          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Name</p>
                        <p className="text-base font-medium text-slate-900 dark:text-white">
                          {selectedDriver.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Email</p>
                        <p className="text-base font-medium text-slate-900 dark:text-white">
                          {selectedDriver.email}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Division</p>
                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
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
                        <p className="text-sm text-slate-600 dark:text-slate-400">Status</p>
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                            selectedDriver.status === 'ACTIVE'
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          }`}
                        >
                          {selectedDriver.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Points Total</p>
                        <p className="text-base font-medium text-slate-900 dark:text-white">
                          {selectedDriver.pointsTotal.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Fastest Lap</p>
                        <p className="text-base font-medium text-slate-900 dark:text-white">
                          {selectedDriver.fastestLap}
                        </p>
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
          </div>
        </div>
      </div>
    </>
  );
}
