'use client';

import { useState } from 'react';
import { Race, Division } from '@/types';
import { Trophy, Clock } from 'lucide-react';

interface RecentRaceResultsProps {
  race: Race;
}

export default function RecentRaceResults({ race }: RecentRaceResultsProps) {
  const [selectedDivision, setSelectedDivision] = useState<Division | 'all'>('all');

  if (!race.results || race.results.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-500 dark:text-slate-400">
        No race results available for this race.
      </div>
    );
  }

  const divisions = race.results.map((r) => r.division);
  const filteredResults = selectedDivision === 'all' 
    ? race.results 
    : race.results.filter((r) => r.division === selectedDivision);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{race.name}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {race.date} • {race.location}
            </p>
          </div>
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value as Division | 'all')}
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

      <div className="overflow-x-auto">
        {filteredResults.map((divisionResult) => (
          <div key={divisionResult.division} className="mb-6 last:mb-0">
            <h4 className="px-6 py-3 bg-slate-50 dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">
              {divisionResult.division}
            </h4>
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Driver Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Fastest Lap
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {divisionResult.results.map((result, index) => (
                  <tr
                    key={result.driverId}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {result.position === 1 && (
                          <Trophy className="w-5 h-5 text-amber-500" />
                        )}
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          #{result.position}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {result.driverName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm font-mono text-slate-900 dark:text-white">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {result.fastestLap}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {result.points}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

