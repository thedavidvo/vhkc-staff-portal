'use client';

import { useState, useEffect, useMemo } from 'react';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import Modal from '@/components/Modal';
import { useSeason } from '@/components/SeasonContext';
import { AlertTriangle, CheckCircle, XCircle, Loader2, Search, Plus, Edit, Trash, ShieldAlert, Shield, Users } from 'lucide-react';
import { getDivisionColor } from '@/lib/divisions';

interface Incident {
  id: string;
  seasonId: string;
  roundId: string;
  driverId: string;
  division?: string;
  driverName?: string;
  incidentType: string;
  severity: 'Minor' | 'Major';
  incidentPoints: number;
  pointsToDeduct?: number;
  pointsDeducted?: boolean;
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
  total_incident_points?: number;
  isSuspended: boolean;
  isRaceSuspended?: boolean;
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
          fetch(`/api/licenses?seasonId=${selectedSeason.id}`),
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
    const registeredIds = new Set(drivers.map(d => d.id));

    // Synthesize entries for drivers who have incidents but aren't in season_drivers
    const orphanDrivers: typeof drivers = [];
    for (const incident of incidents) {
      if (!registeredIds.has(incident.driverId) && !orphanDrivers.some(d => d.id === incident.driverId)) {
        orphanDrivers.push({
          id: incident.driverId,
          name: incident.driverName || incident.driverId,
          email: '',
          mobileNumber: '',
          division: (incident.division || 'New') as any,
          teamName: '',
          status: 'ACTIVE' as any,
          lastUpdated: '',
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          homeTrack: '',
          aliases: [],
        });
      }
    }

    return [...drivers, ...orphanDrivers].map(driver => {
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
          fetch(`/api/licenses?seasonId=${selectedSeason.id}`),
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
    
    if (!confirm(`Confirm this incident?\n\nDriver: ${driver?.name}\nRound: ${round?.roundNumber}\nIncident Points: ${incident.incidentPoints}`)) {
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
          seasonId: selectedSeason?.id,
          roundId: incident.roundId,
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
        fetch(`/api/licenses?seasonId=${selectedSeason?.id}`),
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
      let msg = `Incident confirmed! ${driver?.name} now has ${licenseData.totalPoints} season point(s).`;
      if (licenseData.isRaceSuspended) msg += `\n\n⚠️ RACE SUSPENSION: ${driver?.name} is suspended for 1 round.`;
      if (licenseData.isSuspended) msg += `\n\n🚫 SEASON SUSPENSION: ${driver?.name}'s license is suspended for the season.`;
      if (licenseData.thresholdsCrossed?.length) msg += `\n\n-25 championship points applied (threshold: ${licenseData.thresholdsCrossed.join(', ')} pts).`;
      alert(msg);
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
                      : (driver.license?.total_incident_points || 0) >= 10
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
                        <p className="text-xs text-slate-500 dark:text-slate-400">Season Pts</p>
                        <p className={`text-lg font-semibold ${
                          driver.license?.isSuspended
                            ? 'text-red-600 dark:text-red-400'
                            : (driver.license?.total_incident_points || 0) >= 10
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {driver.license?.total_incident_points || 0}<span className="text-xs text-slate-500 dark:text-slate-400">/15</span>
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Active: {driver.license?.activePoints || 0}
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
                    onChange={(e) => setFormData({ ...formData, incidentPoints: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm"
                    min="1"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Points added to driver's license. At 3, 5, 7, 10, 13, 15 pts -25 championship points are applied. 7 pts = 1 round race suspension. 15 pts = season suspension.
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
        title={historyModalDriver?.name}
        size="lg"
      >
        {historyModalDriver && (
          <div className="space-y-4">
            {/* Driver Summary */}
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${getDivisionColor(historyModalDriver.division)}`}>
                {historyModalDriver.division}
              </span>
              <div className="flex items-center gap-2">
                {historyModalDriver.license?.isSuspended && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                    <ShieldAlert className="w-3.5 h-3.5" /> Suspended
                  </span>
                )}
                <span className={`text-sm font-semibold ${
                  historyModalDriver.license?.isSuspended
                    ? 'text-red-600 dark:text-red-400'
                    : (historyModalDriver.license?.total_incident_points || 0) >= 10
                    ? 'text-orange-500 dark:text-orange-400'
                    : 'text-slate-700 dark:text-slate-300'
                }`}>
                  {historyModalDriver.license?.total_incident_points || 0}<span className="text-xs font-normal text-slate-400"> season pts</span>
                  {(historyModalDriver.license?.activePoints || 0) !== (historyModalDriver.license?.total_incident_points || 0) && (
                    <span className="ml-1.5 text-xs font-normal text-slate-400">({historyModalDriver.license?.activePoints || 0} active)</span>
                  )}
                </span>
              </div>
            </div>

            {/* Incidents List */}
            {incidents.filter(i => i.driverId === historyModalDriver.id).length === 0 ? (
              <div className="py-8 text-center">
                <Shield className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No incidents recorded</p>
              </div>
            ) : (
              <div className="space-y-px max-h-[420px] overflow-y-auto -mx-1 px-1">
                {incidents.filter(i => i.driverId === historyModalDriver.id).map(incident => {
                  const round = rounds.find(r => r.id === incident.roundId);
                  return (
                    <div
                      key={incident.id}
                      className="py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${incident.confirmed ? 'bg-green-500' : 'bg-orange-400'}`} />
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Rd {round?.roundNumber || '?'} · {incident.incidentType}{incident.division ? ` · ${incident.division}` : ''}
                            </span>
                          </div>
                          <p className="text-sm text-slate-800 dark:text-slate-200 truncate">{incident.description}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {!incident.confirmed && (
                              <button
                                onClick={() => handleConfirmIncident(incident)}
                                className="text-xs text-green-600 dark:text-green-400 hover:underline"
                              >
                                Approve
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteIncident(incident.id)}
                              className="text-xs text-red-500 dark:text-red-400 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex-shrink-0">
                          +{incident.incidentPoints}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageLayout>
  );
}
