'use client';

import { useState, useEffect } from 'react';
import { Race, Division } from '@/types';
import { Calendar, MapPin, Trophy, Clock } from 'lucide-react';

interface RaceHistoryProps {
  races: Race[];
}

export default function RaceHistory({ races }: RaceHistoryProps) {
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<Division>('Division 1');

  const completedRaces = races.filter((r) => r.status === 'completed').sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Set default race to most recent if available
  useEffect(() => {
    if (!selectedRace && completedRaces.length > 0) {
      setSelectedRace(completedRaces[0]);
    }
  }, [selectedRace, completedRaces]);

  // Get available divisions from selected race
  const availableDivisions = selectedRace?.results
    ? selectedRace.results.map((r) => r.division)
    : [];

  // Update selected division if current selection is not available
  useEffect(() => {
    if (selectedRace && availableDivisions.length > 0) {
      if (availableDivisions.includes('Division 1')) {
        setSelectedDivision('Division 1');
      } else if (!availableDivisions.includes(selectedDivision)) {
        setSelectedDivision(availableDivisions[0]);
      }
    }
  }, [selectedRace, availableDivisions, selectedDivision]);

  const filteredResults = selectedRace?.results
    ? selectedRace.results.filter((r) => r.division === selectedDivision)
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Panel 1: Race List */}
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Races
            </h3>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {completedRaces.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                No completed races available.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {completedRaces.map((race) => (
                  <div
                    key={race.id}
                    onClick={() => {
                      setSelectedRace(race);
                      // Set default division to Division 1 if available, otherwise first available
                      const divisions = race.results?.map((r) => r.division) || [];
                      if (divisions.includes('Division 1')) {
                        setSelectedDivision('Division 1');
                      } else if (divisions.length > 0) {
                        setSelectedDivision(divisions[0]);
                      }
                    }}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedRace?.id === race.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                      {race.name}
                    </h4>
                    <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{race.season} • Round {race.round}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{race.location}</span>
                      </div>
                      <div className="text-xs">
                        {new Date(race.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel 2: Standings with Division Filter */}
      <div className="lg:col-span-1">
        {selectedRace ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Standings
                </h3>
                {availableDivisions.length > 0 && (
                  <select
                    value={selectedDivision}
                    onChange={(e) => setSelectedDivision(e.target.value as Division)}
                    className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    {availableDivisions.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredResults.length > 0 ? (
                filteredResults.map((divisionResult) => (
                  <div key={divisionResult.division}>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-900">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                              Pos
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                              Driver
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                              Lap Time
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                              Pts
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                          {divisionResult.results.map((result) => (
                            <tr
                              key={result.driverId}
                              className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  {result.position === 1 && (
                                    <Trophy className="w-4 h-4 text-amber-500" />
                                  )}
                                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {result.position}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900 dark:text-white">
                                  {result.driverName}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-1 text-sm font-mono text-slate-900 dark:text-white">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {result.fastestLap}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {result.points}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  No results available for {selectedDivision} in this race.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-8 text-center h-full flex items-center justify-center">
            <p className="text-slate-500 dark:text-slate-400">
              Select a race to view standings
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

