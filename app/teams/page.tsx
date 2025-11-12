'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import { mockTeams, mockDrivers } from '@/data/mockData';
import { Team } from '@/types';
import { Plus, X, Users } from 'lucide-react';

export default function TeamsPage() {
  const [teams, setTeams] = useState(mockTeams);
  const [drivers] = useState(mockDrivers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const handleCreateTeam = () => {
    if (newTeamName.trim()) {
      const newTeam: Team = {
        id: String(teams.length + 1),
        name: newTeamName,
        driverIds: [],
        createdAt: new Date().toISOString().split('T')[0],
      };
      setTeams([...teams, newTeam]);
      setNewTeamName('');
      setIsModalOpen(false);
    }
  };

  const handleAddDriver = (teamId: string, driverId: string) => {
    setTeams(
      teams.map((t) =>
        t.id === teamId
          ? { ...t, driverIds: [...t.driverIds, driverId] }
          : t
      )
    );
  };

  const handleRemoveDriver = (teamId: string, driverId: string) => {
    setTeams(
      teams.map((t) =>
        t.id === teamId
          ? { ...t, driverIds: t.driverIds.filter((id) => id !== driverId) }
          : t
      )
    );
  };

  const getTeamDrivers = (team: Team) => {
    return drivers.filter((d) => team.driverIds.includes(d.id));
  };

  const getAvailableDrivers = (team: Team) => {
    return drivers.filter((d) => !team.driverIds.includes(d.id));
  };

  return (
    <>
      <Header title="Teams" />
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Teams Management
            </h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-md font-medium"
            >
              <Plus className="w-5 h-5" />
              Register Team
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => {
              const teamDrivers = getTeamDrivers(team);
              const availableDrivers = getAvailableDrivers(team);
              return (
                <div
                  key={team.id}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {team.name}
                    </h2>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {teamDrivers.length} drivers
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Team Members
                    </h3>
                    {teamDrivers.length > 0 ? (
                      <div className="space-y-2">
                        {teamDrivers.map((driver) => (
                          <div
                            key={driver.id}
                            className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 rounded-lg"
                          >
                            <span className="text-sm text-slate-900 dark:text-white">
                              {driver.name}
                            </span>
                            <button
                              onClick={() => handleRemoveDriver(team.id, driver.id)}
                              className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        No drivers in team
                      </p>
                    )}
                  </div>

                  {availableDrivers.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Add Driver
                      </label>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddDriver(team.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select driver...</option>
                        {availableDrivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Create Team Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Register New Team
            </h2>
            <input
              type="text"
              placeholder="Team name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleCreateTeam}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
              >
                Create Team
              </button>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setNewTeamName('');
                }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

