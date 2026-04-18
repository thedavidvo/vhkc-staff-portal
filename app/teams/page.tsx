'use client';

import { useState, useMemo, useEffect } from 'react';
import Header from '@/components/Header';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import { useSeason } from '@/components/SeasonContext';
import { Division } from '@/types';
import { Team } from '@/lib/sheetsDataService';
import { Plus, X, Users, Edit, Trash2, Loader2, UsersRound, Filter } from 'lucide-react';

// Helper function to get division color
const getDivisionColor = (division: Division) => {
  switch (division) {
    case 'Division 1':
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    case 'Division 2':
      return 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
  }
};

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
        // Update driver's teamName in the Drivers sheet
        const driverToUpdate = drivers.find(d => d.id === driverId);
        if (driverToUpdate) {
          try {
            const driverUpdateResponse = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...driverToUpdate,
                teamName: team.name,
              }),
            });
            if (!driverUpdateResponse.ok) {
              console.error('Failed to update driver teamName');
            }
          } catch (error) {
            console.error('Error updating driver teamName:', error);
          }
        }
        
        // Refresh teams and drivers
        const refreshResponse = await fetch(`/api/teams?seasonId=${selectedSeason.id}`);
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setTeams(data);
        }
        
        // Refresh drivers to get updated teamName
        const driversResponse = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`);
        if (driversResponse.ok) {
          const driversData = await driversResponse.json();
          setDrivers(driversData);
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
        driverIds: currentDriverIds.filter((id: string) => id !== driverId),
        seasonId: selectedSeason.id,
      };

      const response = await fetch(`/api/teams?seasonId=${selectedSeason.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTeam),
      });

      if (response.ok) {
        // Update driver's teamName to empty in the Drivers sheet
        const driverToUpdate = drivers.find(d => d.id === driverId);
        if (driverToUpdate) {
          try {
            const driverUpdateResponse = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...driverToUpdate,
                teamName: undefined,
              }),
            });
            if (!driverUpdateResponse.ok) {
              console.error('Failed to update driver teamName');
            }
          } catch (error) {
            console.error('Error updating driver teamName:', error);
          }
        }
        
        // Refresh teams and drivers
        const refreshResponse = await fetch(`/api/teams?seasonId=${selectedSeason.id}`);
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setTeams(data);
        }
        
        // Refresh drivers to get updated teamName
        const driversResponse = await fetch(`/api/drivers?seasonId=${selectedSeason.id}`);
        if (driversResponse.ok) {
          const driversData = await driversResponse.json();
          setDrivers(driversData);
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
      <PageLayout
        title="Teams Management"
        subtitle="Manage teams and their members"
        icon={UsersRound}
        headerActions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Team
          </button>
        }
      >
        {/* Search and Division Filter */}
        <SectionCard
          icon={Filter}
          title="Browse Teams"
          className="mb-6"
        >
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by team name"
                value={teamSearchQuery}
                onChange={(e) => setTeamSearchQuery(e.target.value)}
                className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setDivisionFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors font-medium border ${
                  divisionFilter === 'all'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setDivisionFilter('Division 1')}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors font-medium border ${
                  divisionFilter === 'Division 1'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Division 1
              </button>
              <button
                onClick={() => setDivisionFilter('Division 2')}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors font-medium border ${
                  divisionFilter === 'Division 2'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Division 2
              </button>
            </div>
          </div>
        </SectionCard>

        {/* Teams List */}
        {filteredTeams.length === 0 ? (
          <SectionCard>
            <div className="text-center py-10">
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                {teams.length === 0
                  ? 'No teams found. Create your first team to get started.'
                  : 'No teams match your filters. Try adjusting your search or division filter.'}
              </p>
              {teams.length === 0 && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-3 py-1.5 text-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
                >
                  Create First Team
                </button>
              )}
            </div>
          </SectionCard>
        ) : (
          <SectionCard title={`Teams (${filteredTeams.length})`} icon={UsersRound} noPadding>
          <div className="p-3 space-y-2.5">
              {filteredTeams.map((team) => {
              const teamDrivers = getTeamDrivers(team);
              return (
                <div
                  key={team.id}
                  className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-3"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {team.name}
                        </h2>
                        {team.division && (
                          <span className={`px-2 py-0.5 text-[11px] font-medium rounded-md whitespace-nowrap ${getDivisionColor(team.division)}`}>
                            {team.division}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Members</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{teamDrivers.length}/3</span>
                      </div>

                      {teamDrivers.length > 0 ? (
                        <div className="space-y-1.5">
                          {teamDrivers.map((driver) => (
                            <div
                              key={driver.id}
                              className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-800"
                            >
                              <span className="text-sm text-slate-900 dark:text-white">
                                {driver.name}
                              </span>
                              <button
                                onClick={() => handleRemoveDriver(team.id, driver.id)}
                                className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                                title="Remove driver"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-800">
                          <p className="text-xs text-slate-500 dark:text-slate-400">No drivers in team</p>
                        </div>
                      )}
                    </div>

                    <div className="w-full lg:w-[280px] lg:pl-3 lg:border-l lg:border-slate-100 lg:dark:border-slate-800">
                      <div className="flex items-center justify-end gap-1 mb-2.5">
                        <button
                          onClick={() => handleEditTeam(team)}
                          className="p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                          title="Edit team"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className="p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                          title="Delete team"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {teamDrivers.length < 3 && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                            Add Driver
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
                              className="w-full h-8 px-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600"
                            />
                            {(driverSearchQuery[team.id] || '').trim() && (
                              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md max-h-48 overflow-y-auto">
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
                                          className={`w-full text-left px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white text-sm ${
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
                        <div>
                          <div className="p-2 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800/40">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 text-center">
                              Team is full (3/3)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </SectionCard>
          )}
      </PageLayout>

      {/* Create Team Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xl max-w-md w-full p-5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {isEditMode ? 'Edit Team' : 'Register New Team'}
            </h2>
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
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
                className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                Team Name
              </label>
              <input
                type="text"
                placeholder="Team name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600"
              />
            </div>
            {isEditMode && (
              <div className="mb-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                  Add Drivers ({selectedDriversForRegistration.length}/3)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search driver name..."
                    value={registrationDriverSearch}
                    onChange={(e) => setRegistrationDriverSearch(e.target.value)}
                    disabled={selectedDriversForRegistration.length >= 3}
                    className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {registrationDriverSearch.trim() && selectedDriversForRegistration.length < 3 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md max-h-48 overflow-y-auto">
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
                                className={`w-full text-left px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white text-sm ${
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
                          className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-md"
                        >
                          <span className="text-sm text-slate-900 dark:text-white">{driver.name}</span>
                          <button
                            onClick={() => {
                              setSelectedDriversForRegistration(
                                selectedDriversForRegistration.filter((id) => id !== driverId)
                              );
                            }}
                            className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
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
                className="flex-1 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditMode ? 'Save Changes' : 'Create Team'}
              </button>
              <button
                onClick={handleCancelModal}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
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

