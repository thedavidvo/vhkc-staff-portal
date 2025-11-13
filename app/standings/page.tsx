'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import { mockDrivers, mockRaces } from '@/data/mockData';
import { Division } from '@/types';
import { Trophy, Medal, Award } from 'lucide-react';

export default function StandingsPage() {
  const [selectedDivision, setSelectedDivision] = useState<Division>('Division 1');

  const divisions: Division[] = ['Division 1', 'Division 2', 'Division 3', 'Division 4'];

  const standings = useMemo(() => {
    const driversInDivision = mockDrivers
      .filter((d) => d.division === selectedDivision && d.status === 'ACTIVE')
      .sort((a, b) => b.pointsTotal - a.pointsTotal);

    return driversInDivision.map((driver, index) => ({
      ...driver,
      rank: index + 1,
    }));
  }, [selectedDivision]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-amber-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return null;
  };

  return (
    <>
      <Header title="Standings" />
      <div className="p-4 md:p-6">
        <div className="max-w-[95%] mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Driver Standings
            </h1>
            <div className="flex flex-wrap gap-2">
              {divisions.map((div) => (
                <button
                  key={div}
                  onClick={() => setSelectedDivision(div)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedDivision === div
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Driver
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Team
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Points
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Fastest Lap
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Last Race Position
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {standings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                        No drivers found in {selectedDivision}
                      </td>
                    </tr>
                  ) : (
                    standings.map((driver) => (
                      <tr
                        key={driver.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getRankIcon(driver.rank)}
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {driver.rank}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {driver.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {driver.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 dark:text-white">
                            {driver.teamName || '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {driver.pointsTotal.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-slate-900 dark:text-white">
                            {driver.fastestLap}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 dark:text-white">
                            {driver.lastRacePosition}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

