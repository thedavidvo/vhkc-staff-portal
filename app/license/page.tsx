'use client';

import { useState, useEffect, useMemo } from 'react';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import { useSeason } from '@/components/SeasonContext';
import { CreditCard, AlertTriangle, CheckCircle, XCircle, Loader2, Search, Shield, ShieldAlert } from 'lucide-react';

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

interface License {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_email: string;
  driver_division: string;
  total_incident_points: number;
  activePoints: number;
  is_suspended: boolean;
  isSuspended: boolean;
  suspended_at?: string;
  created_at: string;
  updated_at: string;
}

interface PointsHistory {
  id: string;
  incident_id: string;
  points_added: number;
  points_at_time: number;
  incident_date: string;
  expires_at: string;
  is_expired: boolean;
}

export default function LicensePage() {
  const { selectedSeason } = useSeason();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingLicenseId, setUpdatingLicenseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [pointsHistory, setPointsHistory] = useState<PointsHistory[]>([]);

  useEffect(() => {
    fetchLicenses();
  }, [selectedSeason]);

  const fetchLicenses = async () => {
    if (!selectedSeason) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/licenses');
      if (response.ok) {
        const data = await response.json();
        setLicenses(data);
      }
    } catch (error) {
      console.error('Failed to fetch licenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLicenses = useMemo(() => {
    return licenses.filter((license) => {
      if (statusFilter === 'suspended' && !license.isSuspended) return false;
      if (statusFilter === 'active' && license.isSuspended) return false;

      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        return (
          license.driver_name?.toLowerCase().includes(searchLower) ||
          license.driver_email?.toLowerCase().includes(searchLower) ||
          license.driver_division?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [licenses, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = licenses.length;
    const active = licenses.filter((l) => !l.isSuspended).length;
    const suspended = licenses.filter((l) => l.isSuspended).length;
    const atRisk = licenses.filter((l) => !l.isSuspended && l.activePoints >= 5).length;

    return { total, active, suspended, atRisk };
  }, [licenses]);

  const handleStatusChange = async (licenseId: string, nextStatus: 'active' | 'suspended') => {
    try {
      setUpdatingLicenseId(licenseId);
      const response = await fetch('/api/licenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseId,
          isSuspended: nextStatus === 'suspended',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error?.error || 'Failed to update license status');
        return;
      }

      await fetchLicenses();
    } catch (error) {
      console.error('Failed to update license status:', error);
      alert('Failed to update license status');
    } finally {
      setUpdatingLicenseId(null);
    }
  };

  if (loading) {
    return (
      <>
        <PageLayout
          title="License Management"
          subtitle="Track driver license points and suspensions"
          icon={CreditCard}
        >
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              <p className="text-slate-600 dark:text-slate-400">Loading licenses...</p>
            </div>
          </div>
        </PageLayout>
      </>
    );
  }

  return (
    <PageLayout
      title="License Management"
      subtitle="Track driver license points and suspensions based on incidents"
      icon={CreditCard}
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <SectionCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Licenses</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Active</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.active}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-300" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Suspended</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.suspended}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-300" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">At Risk (5+ pts)</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.atRisk}</p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* License Information Box */}
      <SectionCard className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              License Point System
            </h3>
            <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
              <li>• Incident points are assigned manually during incident review</li>
              <li>• Drivers with <strong>8 or more points</strong> will have their license suspended</li>
              <li>• Points expire after <strong>1 year</strong> from the incident date</li>
              <li>• Licenses carry over between seasons, but points expire based on time</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Filters */}
      <SectionCard icon={Search} title="Filters & Search" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by driver name, email, or division..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </SectionCard>

      {/* Licenses Table */}
      <SectionCard title={`All Licenses (${filteredLicenses.length})`} icon={CreditCard} noPadding>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Driver
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Division
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Active Points
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredLicenses.map((license) => (
                <tr
                  key={license.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <td className="px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {license.driver_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {license.driver_email}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getDivisionColor(license.driver_division)}`}>
                      {license.driver_division}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-lg font-bold ${
                          license.activePoints >= 8
                            ? 'text-red-600 dark:text-red-400'
                            : license.activePoints >= 5
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        {license.activePoints}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">/ 8</span>
                    </div>
                    {license.activePoints >= 5 && license.activePoints < 8 && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        At Risk
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="space-y-1">
                      <select
                        value={license.isSuspended ? 'suspended' : 'active'}
                        onChange={(e) => handleStatusChange(license.id, e.target.value as 'active' | 'suspended')}
                        disabled={updatingLicenseId === license.id}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-60 ${
                          license.isSuspended
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                            : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                        }`}
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                      </select>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Points remain unchanged
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {license.updated_at
                      ? new Date(license.updated_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </PageLayout>
  );
}
