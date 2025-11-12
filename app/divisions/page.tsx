'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import { mockDrivers } from '@/data/mockData';
import { Driver, Division } from '@/types';
import { Search, Save } from 'lucide-react';

export default function DivisionsPage() {
  const [drivers, setDrivers] = useState(mockDrivers);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [newDivision, setNewDivision] = useState<Division>('Division 1');

  const filteredDrivers = useMemo(() => {
    return drivers.filter(
      (driver) =>
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [drivers, searchQuery]);

  const handleDivisionChange = (driverId: string, newDiv: Division) => {
    setDrivers(
      drivers.map((d) =>
        d.id === driverId ? { ...d, division: newDiv, lastUpdated: new Date().toISOString().split('T')[0] } : d
      )
    );
    // Update selected driver if it's the one being changed
    if (selectedDriver?.id === driverId) {
      setSelectedDriver({ ...selectedDriver, division: newDiv });
    }
  };

  const driversByDivision = useMemo(() => {
    const grouped: Record<Division, Driver[]> = {
      'Division 1': [],
      'Division 2': [],
      'Division 3': [],
      'Division 4': [],
    };
    drivers.forEach((driver) => {
      grouped[driver.division].push(driver);
    });
    return grouped;
  }, [drivers]);

  return (
    <>
      <Header title="Divisions" />
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
            Divisions Management
          </h1>

          {/* Search */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search driver by name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  const found = filteredDrivers[0];
                  if (found) setSelectedDriver(found);
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Driver Search Results */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Search Results ({filteredDrivers.length})
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
                          Current Division
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Change To
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {filteredDrivers.map((driver) => (
                        <tr
                          key={driver.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                            {driver.name}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                              {driver.division}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <select
                              value={driver.division}
                              onChange={(e) => {
                                const newDiv = e.target.value as Division;
                                setNewDivision(newDiv);
                                handleDivisionChange(driver.id, newDiv);
                              }}
                              className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            >
                              <option value="Division 1">Division 1</option>
                              <option value="Division 2">Division 2</option>
                              <option value="Division 3">Division 3</option>
                              <option value="Division 4">Division 4</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => handleDivisionChange(driver.id, newDivision)}
                              className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors text-xs font-medium"
                            >
                              <Save className="w-3 h-3 inline mr-1" />
                              Update
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Division Overview */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                  Division Overview
                </h2>
                <div className="space-y-4">
                  {(['Division 1', 'Division 2', 'Division 3', 'Division 4'] as Division[]).map(
                    (division) => (
                      <div
                        key={division}
                        className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg"
                      >
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                          {division}
                        </h3>
                        <p className="text-2xl font-bold text-primary">
                          {driversByDivision[division].length}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          drivers
                        </p>
                      </div>
                    )
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
