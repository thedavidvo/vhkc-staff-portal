'use client';

import { useState, useMemo, useEffect } from 'react';
import Header from '@/components/Header';
import { useSeason } from '@/components/SeasonContext';
import { Division } from '@/types';
import { Team } from '@/lib/sheetsDataService';
import { Plus, X, Users, Edit, Trash2, Loader2 } from 'lucide-react';

export default function TeamsPage() {
  const { selectedSeason } = useSeason();
  const [teams, setTeams] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch teams and drivers from API
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedSeason) {
        setTeams([]);
        setDrivers([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [teamsResponse, driversResponse] = await Promise.all([
          fetch(`/api/teams?seasonId=${selectedSeason.id}`),
          fetch(`/api/drivers?seasonId=${selectedSeason.id}`),
        ]);

        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          setTeams(teamsData);
        }

        if (driversResponse.ok) {
          const driversData = await driversResponse.json();
          setDrivers(driversData);
        }
      } catch (error) {
        console.error('Failed to fetch teams/drivers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSeason]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [divisionFilter, setDivisionFilter] = useState<Division | 'all'>('all');
  const [selectedDivisionForTeam, setSelectedDivisionForTeam] = useState<Division | ''>('');
  const [driverSearchQuery, setDriverSearchQuery] = useState<{ [teamId: string]: string }>({});
  const [registrationDriverSearch, setRegistrationDriverSearch] = useState('');
  const [selectedDriversForRegistration, setSelectedDriversForRegistration] = useState<string[]>([]);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');

  const handleCreateTeam = async () => {
    if (!selectedSeason) {
      alert('Please select a season first');
      return;
    }

    const divisionToUse = divisionFilter !== 'all' ? divisionFilter : selectedDivisionForTeam;
    if (!newTeamName.trim()) {
      alert('Please enter a team name');
      return;
    }

    if (!divisionToUse) {
      alert('Please select a division');
      return;
    }

    try {
      if (isEditMode && editingTeamId) {
        // Update existing team
        const existingTeam = teams.find(t => t.id === editingTeamId);
        if (!existingTeam) return;

        const updatedTeam = {
          ...existingTeam,
          name: newTeamName,
          driverIds: selectedDriversForRegistration.slice(0, 3),
          division: divisionToUse as Division,
          seasonId: selectedSeason.id,
        };

        const response = await fetch(`/api/teams?seasonId=${selectedSeason.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTeam),
        });

        if (response.ok) {
          // Refresh teams
          const refreshResponse = await fetch(`/api/teams?seasonId=${selectedSeason.id}`);
          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            setTeams(data);
          }
          handleCancelModal();
        } else {
          alert('Failed to update team. Please try again.');
        }
      } else {
        // Create new team
        const newTeam: Team = {
          id: `team-${Date.now()}`,
          name: newTeamName,
          seasonId: selectedSeason.id,
          driverIds: selectedDriversForRegistration.slice(0, 3), // Max 3 drivers
          division: divisionToUse as Division,
          createdAt: new Date().toISOString().split('T')[0],
        };

        const response = await fetch(`/api/teams?seasonId=${selectedSeason.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTeam),
        });

        if (response.ok) {
          // Refresh teams
          const refreshResponse = await fetch(`/api/teams?seasonId=${selectedSeason.id}`);
          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            setTeams(data);
          }
          handleCancelModal();
        } else {
          alert('Failed to create team. Please try again.');
        }
      }
    } catch (error) {
      console.error('Failed to save team:', error);
      alert('Failed to save team. Please try again.');
    }
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeamId(team.id);
    setIsEditMode(true);
    setNewTeamName(team.name);
    setSelectedDivisionForTeam(team.division || '');
    setSelectedDriversForRegistration([...team.driverIds]);
    setIsModalOpen(true);
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!selectedSeason) return;
    
    if (!confirm('Are you sure you want to delete this team?')) {
      return;
    }

    try {
      const response = await fetch(`/api/teams?teamId=${teamId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh teams
        const refreshResponse = await fetch(`/api/teams?seasonId=${selectedSeason.id}`);
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setTeams(data);
        }
      } else {
        alert('Failed to delete team. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete team:', error);
      alert('Failed to delete team. Please try again.');
    }
  };

  const handleCancelModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingTeamId(null);
    setNewTeamName('');
    setSelectedDivisionForTeam('');
    setSelectedDriversForRegistration([]);
    setRegistrationDriverSearch('');
  };

  const handleAddDriver = async (teamId: string, driverId: string) => {
    if (!selectedSeason) return;

    // Check if driver is already in another team
    const driverInOtherTeam = teams.find((t) => {
      if (t.id === teamId) return false;
      const driverIds = t.driverIds && Array.isArray(t.driverIds) ? t.driverIds : [];
      return driverIds.includes(driverId);
    });
    
    if (driverInOtherTeam) {
      alert(`This driver is already registered in team "${driverInOtherTeam.name}". A driver cannot be in multiple teams.`);
      return;
    }

    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    // Check if team already has 3 drivers (max limit)
    const currentDriverIds = team.driverIds && Array.isArray(team.driverIds) ? team.driverIds : [];
    if (currentDriverIds.length >= 3) {
      alert('Team already has the maximum of 3 drivers.');
      return;
    }

    try {
      const updatedTeam = {
        ...team,
        driverIds: [...currentDriverIds, driverId],
        seasonId: selectedSeason.id,
      };

      const response = await fetch(`/api/teams?seasonId=${selectedSeason.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTeam),
      });

      if (response.ok) {
        // Refresh teams
        const refreshResponse = await fetch(`/api/teams?seasonId=${selectedSeason.id}`);
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setTeams(data);
        }
      } else {
        alert('Failed to add driver to team. Please try again.');
      }
    } catch (error) {
      console.error('Failed to add driver to team:', error);
      alert('Failed to add driver to team. Please try again.');
    }
  };

  const handleRemoveDriver = async (teamId: string, driverId: string) => {
    if (!selectedSeason) return;

    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    try {
      const currentDriverIds = team.driverIds && Array.isArray(team.driverIds) ? team.driverIds : [];
      const updatedTeam = {
        ...team,
        driverIds: currentDriverIds.filter((id) => id !== driverId),
        seasonId: selectedSeason.id,
      };

      const response = await fetch(`/api/teams?seasonId=${selectedSeason.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTeam),
      });

      if (response.ok) {
        // Refresh teams
        const refreshResponse = await fetch(`/api/teams?seasonId=${selectedSeason.id}`);
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setTeams(data);
        }
      } else {
        alert('Failed to remove driver from team. Please try again.');
      }
    } catch (error) {
      console.error('Failed to remove driver from team:', error);
      alert('Failed to remove driver from team. Please try again.');
    }
  };

  const getTeamDrivers = (team: Team) => {
    // Return all drivers in the team, regardless of division filter
    if (!team.driverIds || !Array.isArray(team.driverIds)) {
      return [];
    }
    return drivers.filter((d) => team.driverIds.includes(d.id));
  };

  const getAvailableDrivers = (team: Team) => {
    // Only show drivers from the selected division that aren't already in the team
    const teamDriverIds = team.driverIds && Array.isArray(team.driverIds) ? team.driverIds : [];
    let available = drivers.filter((d) => !teamDriverIds.includes(d.id));
    // Filter by division if filter is set
    if (divisionFilter !== 'all') {
      available = available.filter((d) => d.division === divisionFilter);
    }
    return available;
  };

  const getFilteredDriversForTeam = (team: Team, searchQuery: string) => {
    // Get drivers that are not in any team
    const available = drivers.filter((d) => {
      const isInAnyTeam = teams.some((t) => {
        const driverIds = t.driverIds && Array.isArray(t.driverIds) ? t.driverIds : [];
        return driverIds.includes(d.id);
      });
      return !isInAnyTeam;
    });
    
    // Filter by division if filter is set
    let filtered = available;
    if (divisionFilter !== 'all') {
      filtered = filtered.filter((d) => d.division === divisionFilter);
    }
    
    // Filter by search query
    if (!searchQuery.trim()) {
      return filtered;
    }
    const query = searchQuery.toLowerCase();
    return filtered.filter((d) => d.name && d.name.toLowerCase().includes(query));
  };

  const getFilteredDriversForRegistration = (searchQuery: string) => {
    // Get drivers that are not in any team (or in the current team if editing)
    let available = drivers.filter((d) => {
      if (isEditMode && editingTeamId) {
        // In edit mode, allow drivers already in this team, but exclude those in other teams
        const currentTeam = teams.find((t) => t.id === editingTeamId);
        const currentTeamDriverIds = currentTeam?.driverIds && Array.isArray(currentTeam.driverIds) ? currentTeam.driverIds : [];
        const isInCurrentTeam = currentTeamDriverIds.includes(d.id);
        const isInOtherTeam = teams.some((t) => {
          if (t.id === editingTeamId) return false;
          const driverIds = t.driverIds && Array.isArray(t.driverIds) ? t.driverIds : [];
          return driverIds.includes(d.id);
        });
        return isInCurrentTeam || !isInOtherTeam;
      } else {
        // In create mode, exclude drivers that are in any team
        const isInAnyTeam = teams.some((t) => {
          const driverIds = t.driverIds && Array.isArray(t.driverIds) ? t.driverIds : [];
          return driverIds.includes(d.id);
        });
        return !isInAnyTeam;
      }
    });
    
    // In edit mode, filter by selected division for team
    if (isEditMode && selectedDivisionForTeam) {
      available = available.filter((d) => d.division === selectedDivisionForTeam);
    } else if (divisionFilter !== 'all') {
      // Filter by division if filter is set
      available = available.filter((d) => d.division === divisionFilter);
    } else if (selectedDivisionForTeam) {
      available = available.filter((d) => d.division === selectedDivisionForTeam);
    }
    // Filter by search query
    if (!searchQuery.trim()) {
      return available;
    }
    const query = searchQuery.toLowerCase();
    return available.filter((d) => d.name && d.name.toLowerCase().includes(query));
  };

  // Filter teams by division and search query
  const filteredTeams = useMemo(() => {
    let filtered = teams;
    
    // Filter by division
    if (divisionFilter !== 'all') {
      filtered = filtered.filter((team) => team.division === divisionFilter);
    }
    
    // Filter by search query
    if (teamSearchQuery.trim()) {
      const query = teamSearchQuery.toLowerCase();
      filtered = filtered.filter((team) => team.name.toLowerCase().includes(query));
    }
    
    return filtered;
  }, [teams, divisionFilter, teamSearchQuery]);

  if (loading) {
    return (
      <>
        <Header hideSearch />
        <div className="py-4 md:py-6">
          <div className="max-w-[95%] mx-auto px-4 md:px-6">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                <p className="text-slate-600 dark:text-slate-400">Loading teams...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header hideSearch />
      <div className="py-4 md:py-6">
        <div className="max-w-[95%] mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
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

          {/* Search and Division Filter */}
          <div className="mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-4 space-y-4">
              {/* Division Filter */}
              <div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDivisionFilter('all')}
                    className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                      divisionFilter === 'all'
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    All Divisions
                  </button>
                  <button
                    onClick={() => setDivisionFilter('Division 1')}
                    className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                      divisionFilter === 'Division 1'
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Division 1
                  </button>
                  <button
                    onClick={() => setDivisionFilter('Division 2')}
                    className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                      divisionFilter === 'Division 2'
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Division 2
                  </button>
                </div>
              </div>
              
              {/* Team Search */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Search Teams
                </label>
                <input
                  type="text"
                  placeholder="Search by team name..."
                  value={teamSearchQuery}
                  onChange={(e) => setTeamSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[95%] mx-auto">
          {filteredTeams.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600 dark:text-slate-400 text-lg mb-4">
                {teams.length === 0
                  ? 'No teams found. Create your first team to get started.'
                  : 'No teams match your filters. Try adjusting your search or division filter.'}
              </p>
              {teams.length === 0 && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-md"
                >
                  Create First Team
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-1 gap-y-6 justify-items-center">
              {filteredTeams.map((team) => {
              const teamDrivers = getTeamDrivers(team);
              const availableDrivers = getAvailableDrivers(team);
              return (
                <div
                  key={team.id}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6 w-full max-w-xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {team.name}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {teamDrivers.length} drivers
                      </span>
                      <button
                        onClick={() => handleEditTeam(team)}
                        className="p-1.5 text-primary hover:bg-primary-100 dark:hover:bg-primary-900 rounded transition-colors"
                        title="Edit team"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                        title="Delete team"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

                  {teamDrivers.length < 3 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Add Driver ({teamDrivers.length}/3)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search driver name..."
                          value={driverSearchQuery[team.id] || ''}
                          onChange={(e) => {
                            setDriverSearchQuery({
                              ...driverSearchQuery,
                              [team.id]: e.target.value,
                            });
                          }}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        {(driverSearchQuery[team.id] || '').trim() && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {(() => {
                              const filtered = getFilteredDriversForTeam(team, driverSearchQuery[team.id] || '');
                              return filtered.length > 0 ? (
                                filtered.map((driver) => {
                                  const isInOtherTeam = teams.some((t) => {
                                    if (t.id === team.id) return false;
                                    const driverIds = t.driverIds && Array.isArray(t.driverIds) ? t.driverIds : [];
                                    return driverIds.includes(driver.id);
                                  });
                                  const otherTeam = teams.find((t) => {
                                    if (t.id === team.id) return false;
                                    const driverIds = t.driverIds && Array.isArray(t.driverIds) ? t.driverIds : [];
                                    return driverIds.includes(driver.id);
                                  });
                                  return (
                                    <button
                                      key={driver.id}
                                      onClick={() => {
                                        if (isInOtherTeam) {
                                          alert(`This driver is already registered in team "${otherTeam?.name}". A driver cannot be in multiple teams.`);
                                          return;
                                        }
                                        handleAddDriver(team.id, driver.id);
                                        setDriverSearchQuery({
                                          ...driverSearchQuery,
                                          [team.id]: '',
                                        });
                                      }}
                                      disabled={isInOtherTeam}
                                      className={`w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-sm ${
                                        isInOtherTeam ? 'opacity-50 cursor-not-allowed' : ''
                                      }`}
                                      title={isInOtherTeam ? `Already in team "${otherTeam?.name}"` : ''}
                                    >
                                      {driver.name}
                                      {isInOtherTeam && (
                                        <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                                          (In another team)
                                        </span>
                                      )}
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                                  No drivers found
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {teamDrivers.length >= 3 && (
                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Team is full (3/3 drivers)
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              {isEditMode ? 'Edit Team' : 'Register New Team'}
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Division
              </label>
              <select
                value={isEditMode ? selectedDivisionForTeam : (divisionFilter !== 'all' ? divisionFilter : selectedDivisionForTeam)}
                onChange={(e) => {
                  if (isEditMode || divisionFilter === 'all') {
                    // Allow selection in edit mode or when filter is 'all'
                    setSelectedDivisionForTeam(e.target.value as Division);
                  }
                }}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isEditMode && divisionFilter !== 'all'}
              >
                <option value="">Select division...</option>
                <option value="Division 1">Division 1</option>
                <option value="Division 2">Division 2</option>
              </select>
              {!isEditMode && divisionFilter !== 'all' && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Using filter: {divisionFilter}
                </p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Team Name
              </label>
              <input
                type="text"
                placeholder="Team name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {isEditMode && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Add Drivers ({selectedDriversForRegistration.length}/3)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search driver name..."
                    value={registrationDriverSearch}
                    onChange={(e) => setRegistrationDriverSearch(e.target.value)}
                    disabled={selectedDriversForRegistration.length >= 3}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {registrationDriverSearch.trim() && selectedDriversForRegistration.length < 3 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {(() => {
                        const filtered = getFilteredDriversForRegistration(registrationDriverSearch)
                          .filter((d) => !selectedDriversForRegistration.includes(d.id));
                        return filtered.length > 0 ? (
                          filtered.map((driver) => {
                            const isInOtherTeam = teams.some((t) => {
                              if (isEditMode && editingTeamId) {
                                return t.id !== editingTeamId && t.driverIds.includes(driver.id);
                              }
                              return t.driverIds.includes(driver.id);
                            });
                            const otherTeam = teams.find((t) => {
                              if (isEditMode && editingTeamId) {
                                return t.id !== editingTeamId && t.driverIds.includes(driver.id);
                              }
                              return t.driverIds.includes(driver.id);
                            });
                            
                            return (
                              <button
                                key={driver.id}
                                onClick={() => {
                                  if (isInOtherTeam) {
                                    alert(`This driver is already registered in team "${otherTeam?.name}". A driver cannot be in multiple teams.`);
                                    return;
                                  }
                                  if (selectedDriversForRegistration.length < 3) {
                                    setSelectedDriversForRegistration([...selectedDriversForRegistration, driver.id]);
                                    setRegistrationDriverSearch('');
                                  }
                                }}
                                disabled={isInOtherTeam || selectedDriversForRegistration.length >= 3}
                                className={`w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-sm ${
                                  isInOtherTeam ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                title={isInOtherTeam ? `Already in team "${otherTeam?.name}"` : ''}
                              >
                                {driver.name}
                                {isInOtherTeam && (
                                  <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                                    (In another team)
                                  </span>
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                            No drivers found
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
                {selectedDriversForRegistration.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {selectedDriversForRegistration.map((driverId) => {
                      const driver = drivers.find((d) => d.id === driverId);
                      return driver ? (
                        <div
                          key={driverId}
                          className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 rounded-lg"
                        >
                          <span className="text-sm text-slate-900 dark:text-white">{driver.name}</span>
                          <button
                            onClick={() => {
                              setSelectedDriversForRegistration(
                                selectedDriversForRegistration.filter((id) => id !== driverId)
                              );
                            }}
                            className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
                {selectedDriversForRegistration.length >= 3 && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Maximum 3 drivers reached
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleCreateTeam}
                disabled={!newTeamName.trim() || (!isEditMode && divisionFilter === 'all' && !selectedDivisionForTeam) || (isEditMode && !selectedDivisionForTeam)}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditMode ? 'Save Changes' : 'Create Team'}
              </button>
              <button
                onClick={handleCancelModal}
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

