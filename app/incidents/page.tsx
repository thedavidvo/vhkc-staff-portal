'use client';

import { useState, useEffect, useMemo } from 'react';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import Modal from '@/components/Modal';
import { useSeason } from '@/components/SeasonContext';
import { AlertTriangle, CheckCircle, XCircle, Loader2, Search, Plus, Edit, Trash, ShieldAlert, Shield, Users } from 'lucide-react';

const getDivisionColor = (division: string) => {
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
      return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
  }
};

interface Incident {
  id: string;
  seasonId: string;
  roundId: string;
  driverId: string;
  driverName?: string;
  incidentType: string;
  severity: 'Minor' | 'Major';
  incidentPoints: number;
  pointsToDeduct: number;
  pointsDeducted: boolean;
  description: string;
  reportedBy: string;
  confirmed: boolean;
  confirmedAt?: string;
  confirmedBy?: string;
  createdAt?: string;
}

interface DriverLicense {
  driver_id: string;
  driver_name: string;
  driver_division: string;
  activePoints: number;
  isSuspended: boolean;
}

export default function IncidentsPage() {
  const { selectedSeason } = useSeason();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<DriverLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyModalDriver, setHistoryModalDriver] = useState<any | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    driverId: '',
    roundId: '',
    incidentType: 'On-Track Incident',
    incidentPoints: 1,
    pointsToDeduct: 7,
    description: '',
    reportedBy: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedSeason) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [incidentsRes, roundsRes, driversRes, licensesRes] = await Promise.all([
          fetch(`/api/incidents?seasonId=${selectedSeason.id}`),
          fetch(`/api/rounds?seasonId=${selectedSeason.id}`),
          fetch(`/api/drivers?seasonId=${selectedSeason.id}`),
          fetch('/api/licenses'),
        ]);

        if (incidentsRes.ok) {
          const incidentsData = await incidentsRes.json();
          setIncidents(incidentsData);
        }

        if (roundsRes.ok) {
          const roundsData = await roundsRes.json();
          setRounds(roundsData.sort((a: any, b: any) => a.roundNumber - b.roundNumber));
        }

        if (driversRes.ok) {
          const driversData = await driversRes.json();
          setDrivers(driversData);
        }

        if (licensesRes.ok) {
          const licensesData = await licensesRes.json();
          setLicenses(licensesData);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSeason]);

  const filteredIncidents = useMemo(() => {
    let filtered = incidents;

    if (selectedDriverId) {
      filtered = filtered.filter(incident => incident.driverId === selectedDriverId);
    }

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(incident => {
        const driver = drivers.find(d => d.id === incident.driverId);
        return (
          driver?.name?.toLowerCase().includes(searchLower) ||
          incident.incidentType.toLowerCase().includes(searchLower) ||
          incident.description.toLowerCase().includes(searchLower)
        );
      });
    }

    return filtered;
  }, [incidents, searchQuery, drivers, selectedDriverId]);

  // Create driver-license map with incidents
  const driversWithLicenses = useMemo(() => {
    return drivers.map(driver => {
      const license = licenses.find(l => l.driver_id === driver.id);
      const driverIncidents = incidents.filter(i => i.driverId === driver.id);
      const confirmedIncidents = driverIncidents.filter(i => i.confirmed);
      const pendingIncidents = driverIncidents.filter(i => !i.confirmed);

      return {
        ...driver,
        license,
        incidentCount: driverIncidents.length,
        confirmedCount: confirmedIncidents.length,
        pendingCount: pendingIncidents.length,
      };
    }).sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
  }, [drivers, licenses, incidents]);

  const filteredDrivers = useMemo(() => {
    if (!searchQuery) return driversWithLicenses;
    
    const searchLower = searchQuery.toLowerCase();
    return driversWithLicenses.filter(driver =>
      driver.name.toLowerCase().includes(searchLower) ||
      driver.email?.toLowerCase().includes(searchLower) ||
      driver.division?.toLowerCase().includes(searchLower)
    );
  }, [driversWithLicenses, searchQuery]);

  const handleOpenHistoryModal = (driver: any) => {
    setHistoryModalDriver(driver);
    setShowHistoryModal(true);
  };

  const handleSaveIncident = async () => {
    if (!selectedSeason || !formData.driverId || !formData.roundId || !formData.description) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const incident = {
        id: editingIncident?.id || `incident-${Date.now()}`,
        seasonId: selectedSeason.id,
        roundId: formData.roundId,
        driverId: formData.driverId,
        incidentType: formData.incidentType,
        incidentPoints: formData.incidentPoints,
        pointsToDeduct: formData.pointsToDeduct,
        description: formData.description,
        reportedBy: formData.reportedBy,
      };

      const method = editingIncident ? 'PUT' : 'POST';
      const response = await fetch('/api/incidents', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incident),
      });

      if (response.ok) {
        // Refresh incidents and licenses
        const refreshPromises = [
          fetch('/api/licenses'),
        ];
        
        if (selectedSeason) {
          refreshPromises.push(fetch(`/api/incidents?seasonId=${selectedSeason.id}`));
        }
        
        const [licensesRes, incidentsRes] = await Promise.all(refreshPromises);
        
        if (licensesRes.ok) {
          const licensesData = await licensesRes.json();
          setLicenses(licensesData);
        }
        
        if (incidentsRes?.ok) {
          const incidentsData = await incidentsRes.json();
          setIncidents(incidentsData);
        }

        setShowForm(false);
        setEditingIncident(null);
        setFormData({
          driverId: '',
          roundId: '',
          incidentType: 'On-Track Incident',
          incidentPoints: 1,
          pointsToDeduct: 7,
          description: '',
          reportedBy: '',
        });
      } else {
        const error = await response.json().catch(() => ({ error: 'Failed to save incident' }));
        alert(error.error || 'Failed to save incident');
      }
    } catch (error) {
      console.error('Failed to save incident:', error);
      alert('Failed to save incident');
    }
  };

  const handleConfirmIncident = async (incident: Incident) => {
    const driver = drivers.find(d => d.id === incident.driverId);
    const round = rounds.find(r => r.id === incident.roundId);
    
    if (!confirm(`Confirm this incident?\n\nDriver: ${driver?.name}\nRound: ${round?.roundNumber}\nIncident Points: ${incident.incidentPoints}\nRace Points Deducted: ${incident.pointsToDeduct}`)) {
      return;
    }

    try {
      // First, confirm the incident and deduct race points
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          incidentId: incident.id,
          confirmedBy: 'Admin',
          seasonId: selectedSeason?.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to confirm incident: ${error.error}`);
        return;
      }

      // Then, add incident points to the driver's license
      const licenseResponse = await fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: incident.driverId,
          incidentId: incident.id,
          incidentPoints: incident.incidentPoints,
          incidentDate: incident.createdAt || new Date().toISOString(),
        }),
      });

      if (!licenseResponse.ok) {
        const error = await licenseResponse.json();
        console.error('Failed to update license:', error);
        alert('Incident confirmed but failed to update license points');
      }

      // Refresh incidents and licenses
      const refreshPromises = [
        fetch('/api/licenses'),
      ];
      
      if (selectedSeason) {
        refreshPromises.push(fetch(`/api/incidents?seasonId=${selectedSeason.id}`));
      }
      
      const [licensesRes, incidentsRes] = await Promise.all(refreshPromises);
      
      if (licensesRes.ok) {
        const licensesData = await licensesRes.json();
        setLicenses(licensesData);
      }
      
      if (incidentsRes?.ok) {
        const incidentsData = await incidentsRes.json();
        setIncidents(incidentsData);
      }

      const licenseData = await licenseResponse.json();
      if (licenseData.isSuspended) {
        alert(`Incident confirmed!\n\n⚠️ WARNING: ${driver?.name}'s license is now SUSPENDED with ${licenseData.totalPoints} points!`);
      } else {
        alert(`Incident confirmed! ${driver?.name} now has ${licenseData.totalPoints} license points.`);
      }
    } catch (error) {
      console.error('Failed to confirm incident:', error);
      alert('Failed to confirm incident');
    }
  };

  const handleEditIncident = (incident: Incident) => {
    setEditingIncident(incident);
    setFormData({
      driverId: incident.driverId,
      roundId: incident.roundId,
      incidentType: incident.incidentType,
      incidentPoints: incident.incidentPoints || 1,
      pointsToDeduct: incident.pointsToDeduct,
      description: incident.description,
      reportedBy: incident.reportedBy,
    });
    setShowForm(true);
  };

  const handleDeleteIncident = async (id: string) => {
    if (!confirm('Are you sure you want to delete this incident?')) return;

    try {
      const response = await fetch(`/api/incidents?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setIncidents(incidents.filter(i => i.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete incident:', error);
      alert('Failed to delete incident');
    }
  };

  if (loading) {
    return (
      <PageLayout title="Incident Management" subtitle="Track and manage driver incidents" icon={AlertTriangle}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Incident Management"
      subtitle="Track driver incidents and license points"
      icon={AlertTriangle}
      headerActions={
        <button
          onClick={() => {
            setShowForm(true);
            setEditingIncident(null);
            setFormData({
              driverId: '',
              roundId: '',
              incidentType: 'On-Track Incident',
              incidentPoints: 1,
              pointsToDeduct: 7,
              description: '',
              reportedBy: '',
            });
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Incident
        </button>
      }
    >
      <div>
        <SectionCard title="Drivers & License Points" icon={Users}>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search drivers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 transition-colors"
                />
              </div>
            </div>

            {/* Drivers List */}
            <ul className="space-y-2">
              {filteredDrivers.map(driver => (
                <li
                  key={driver.id}
                  onClick={() => handleOpenHistoryModal(driver)}
                  className={`p-2.5 rounded-md border cursor-pointer transition-colors ${
                    driver.license?.isSuspended
                      ? 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      : driver.license?.activePoints >= 5
                      ? 'bg-white dark:bg-slate-900 border-orange-200 dark:border-orange-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{driver.name}</h4>
                      {driver.license?.isSuspended && (
                        <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${getDivisionColor(driver.division)}`}>
                      {driver.division}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">License Points</p>
                        <p className={`text-lg font-semibold ${
                          driver.license?.isSuspended
                            ? 'text-red-600 dark:text-red-400'
                            : driver.license?.activePoints >= 5
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {driver.license?.activePoints || 0}<span className="text-xs text-slate-500 dark:text-slate-400">/8</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Incidents</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                            {driver.confirmedCount} ✓
                          </span>
                          {driver.pendingCount > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                              {driver.pendingCount} ⏳
                            </span>
                          )}
                          {driver.incidentCount === 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                              0 incidents
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {driver.license?.isSuspended && (
                      <div className="text-xs font-semibold text-red-600 dark:text-red-400">
                        SUSPENDED
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Selected Driver's Incidents */}
            {selectedDriverId && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  Incidents for {drivers.find(d => d.id === selectedDriverId)?.name}
                </h3>
                {filteredIncidents.length === 0 ? (
                  <div className="p-5 text-center bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-800">
                    <Shield className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">No incidents recorded</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredIncidents.map(incident => {
                      const round = rounds.find(r => r.id === incident.roundId);
                      
                      return (
                        <div
                          key={incident.id}
                          className={`p-2.5 rounded-md border ${
                            incident.confirmed
                              ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                              : 'bg-white dark:bg-slate-900 border-orange-200 dark:border-orange-800'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${
                                  incident.severity === 'Major'
                                    ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                    : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                                }`}>
                                  {incident.severity}
                                </span>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${
                                  incident.confirmed
                                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                    : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
                                }`}>
                                  {incident.confirmed ? 'Confirmed' : 'Pending'}
                                </span>
                                <span className="text-xs text-slate-600 dark:text-slate-400">
                                  Round {round?.roundNumber} • {incident.incidentType}
                                </span>
                              </div>
                              <p className="text-sm text-slate-700 dark:text-slate-300 mb-1.5">
                                {incident.description}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                <span className="font-semibold text-orange-600 dark:text-orange-400">
                                  +{incident.incidentPoints} License Pts
                                </span>
                                <span>-{incident.pointsToDeduct} Race Pts</span>
                                <span>by {incident.reportedBy}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              {!incident.confirmed && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleConfirmIncident(incident);
                                    }}
                                    className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                                    title="Confirm"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditIncident(incident);
                                    }}
                                    className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteIncident(incident.id);
                                }}
                                className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                                title="Delete"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
        </SectionCard>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingIncident(null);
        }}
        title={editingIncident ? 'Edit Incident' : 'Add Incident'}
        subtitle="Create or update an incident record"
        icon={Plus}
        size="lg"
      >
        <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Driver *
                  </label>
                  <select
                    value={formData.driverId}
                    onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                    className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="">Select Driver</option>
                    {driversWithLicenses.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Round *
                  </label>
                  <select
                    value={formData.roundId}
                    onChange={(e) => setFormData({ ...formData, roundId: e.target.value })}
                    className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="">Select Round</option>
                    {rounds.map(round => (
                      <option key={round.id} value={round.id}>
                        Round {round.roundNumber} - {round.location}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Incident Type
                  </label>
                  <select
                    value={formData.incidentType}
                    onChange={(e) => setFormData({ ...formData, incidentType: e.target.value })}
                    className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="On-Track Incident">On-Track Incident</option>
                    <option value="Behavioral">Behavioral</option>
                    <option value="Safety Violation">Safety Violation</option>
                    <option value="Equipment Violation">Equipment Violation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    License Incident Points *
                  </label>
                  <input
                    type="number"
                    value={formData.incidentPoints}
                    onChange={(e) => setFormData({ ...formData, incidentPoints: parseInt(e.target.value) || 0 })}
                    className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm"
                    min="0"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Points added to driver's license (8+ = suspension). Expires after 1 year.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Race Points to Deduct *
                  </label>
                  <input
                    type="number"
                    value={formData.pointsToDeduct}
                    onChange={(e) => setFormData({ ...formData, pointsToDeduct: parseInt(e.target.value) || 0 })}
                    className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm"
                    min="1"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Championship points deducted for this incident (7 = Minor, {'>'}7 = Major)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm"
                    rows={4}
                    placeholder="Describe the incident..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Reported By
                  </label>
                  <input
                    type="text"
                    value={formData.reportedBy}
                    onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
                    className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm"
                    placeholder="Your name"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSaveIncident}
                    className="flex-1 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors text-sm font-medium"
                  >
                    {editingIncident ? 'Update' : 'Add'} Incident
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingIncident(null);
                    }}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
      </Modal>

      {/* Incident History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setHistoryModalDriver(null);
        }}
        title={`Incident History - ${historyModalDriver?.name}`}
        size="lg"
      >
        {historyModalDriver && (
          <div className="space-y-4">
            {/* Driver Summary */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Division</p>
                  <p className={`text-sm font-semibold px-2 py-1 rounded mt-1 inline-block ${getDivisionColor(historyModalDriver.division)}`}>
                    {historyModalDriver.division}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">License Points</p>
                  <p className={`text-lg font-bold mt-1 ${
                    historyModalDriver.license?.isSuspended
                      ? 'text-red-600 dark:text-red-400'
                      : historyModalDriver.license?.activePoints >= 5
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {historyModalDriver.license?.activePoints || 0}/8
                  </p>
                </div>
              </div>
              {historyModalDriver.license?.isSuspended && (
                <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200 font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  License Suspended
                </div>
              )}
            </div>

            {/* Incidents List */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
                Incidents ({incidents.filter(i => i.driverId === historyModalDriver.id).length})
              </h4>
              {incidents.filter(i => i.driverId === historyModalDriver.id).length === 0 ? (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
                  <Shield className="w-8 h-8 mx-auto text-green-500 mb-2" />
                  <p className="text-slate-600 dark:text-slate-400">No incidents recorded</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {incidents.filter(i => i.driverId === historyModalDriver.id).map(incident => {
                    const round = rounds.find(r => r.id === incident.roundId);
                    return (
                      <div
                        key={incident.id}
                        className={`p-3 rounded-lg border ${
                          incident.confirmed
                            ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                            : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                {incident.incidentType}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                                incident.confirmed
                                  ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-100'
                                  : 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-100'
                              }`}>
                                {incident.confirmed ? 'Confirmed' : 'Pending'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                              Round {round?.roundNumber || 'N/A'} - {round?.location || 'Unknown Location'}
                            </p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{incident.description}</p>
                            {incident.reportedBy && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Reported by: {incident.reportedBy}
                              </p>
                            )}
                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 mt-2">
                              {!incident.confirmed && (
                                <>
                                  <button
                                    onClick={() => handleConfirmIncident(incident)}
                                    className="text-xs font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors underline"
                                  >
                                    Approve
                                  </button>
                                  <span className="text-slate-300 dark:text-slate-600">•</span>
                                </>
                              )}
                              <button
                                onClick={() => handleDeleteIncident(incident.id)}
                                className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors underline"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                              {incident.incidentPoints}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">points</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </PageLayout>
  );
}
