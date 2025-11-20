'use client';

import { useState, useMemo, useEffect } from 'react';
import { Driver } from '@/types';
import { ChevronUp, ChevronDown } from 'lucide-react';

type SortField = 'name' | 'division' | 'lastUpdated';
type SortDirection = 'asc' | 'desc';

interface PerformanceTableProps {
  drivers: Driver[];
}

export default function PerformanceTable({ drivers }: PerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const divisions = useMemo(() => {
    const uniqueDivisions = Array.from(new Set(drivers.map((d) => d.division)));
    return uniqueDivisions.sort();
  }, [drivers]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedDrivers = useMemo(() => {
    let filtered = drivers.filter((driver) => {
      const matchesDivision = divisionFilter === 'all' || driver.division === divisionFilter;
      const matchesSearch =
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.division.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDivision && matchesSearch;
    });

    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'division':
          aValue = a.division.toLowerCase();
          bValue = b.division.toLowerCase();
          break;
        case 'lastUpdated':
          aValue = new Date(a.lastUpdated).getTime();
          bValue = new Date(b.lastUpdated).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [drivers, sortField, sortDirection, divisionFilter, searchQuery]);

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 hover:text-primary dark:hover:text-primary-400 transition-colors"
      >
        {children}
        {isActive && (
          <span className="text-primary dark:text-primary-400">
            {sortDirection === 'asc' ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search drivers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={divisionFilter}
          onChange={(e) => setDivisionFilter(e.target.value)}
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <SortButton field="name">Driver Name</SortButton>
              </th>
              <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <SortButton field="division">Division</SortButton>
              </th>
              <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <SortButton field="lastUpdated">Last Updated</SortButton>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {filteredAndSortedDrivers.map((driver) => (
              <tr
                key={driver.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {driver.name}
                  </div>
                </td>
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                    {driver.division}
                  </span>
                </td>
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {mounted
                      ? new Date(driver.lastUpdated).toLocaleDateString()
                      : driver.lastUpdated}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedDrivers.length === 0 && (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
          No drivers found matching your criteria.
        </div>
      )}
    </div>
  );
}

