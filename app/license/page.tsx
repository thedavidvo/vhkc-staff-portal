'use client';

import { useState, useEffect, useMemo } from 'react';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import { useSeason } from '@/components/SeasonContext';
import { CreditCard, AlertTriangle, CheckCircle, XCircle, Loader2, Search, Shield, RefreshCw } from 'lucide-react';
import { getDivisionColor } from '@/lib/divisions';

interface License {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_email: string;
  driver_division: string;
  total_incident_points: number;
  activePoints: number;
  nextExpiry?: string;
  nextExpiryDetail?: string;
  is_suspended: boolean;
  isSuspended: boolean;
  suspended_at?: string;
  created_at: string;
  updated_at: string;
}

type LicenseFilter = 'all' | 'active' | 'suspended' | 'atRisk';

export default function LicensePage() {
  const { selectedSeason } = useSeason();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingLicenseId, setUpdatingLicenseId] = useState<string | null>(null);
  const [recomputingSeason, setRecomputingSeason] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LicenseFilter>('all');

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
      const response = await fetch(`/api/licenses?seasonId=${selectedSeason.id}`);
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
      if (statusFilter === 'atRisk' && (license.isSuspended || license.activePoints < 5)) return false;

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

  const handleRecomputeSeason = async () => {
    if (!selectedSeason) return;

    try {
      setRecomputingSeason(true);
      const response = await fetch('/api/licenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recompute-season',
          seasonId: selectedSeason.id,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(payload?.error || 'Failed to recompute licenses');
        return;
      }

      await fetchLicenses();
      alert(`Recomputed ${payload.updated || 0} of ${payload.processed || 0} licenses (round ${payload.currentRound || 0}).`);
    } catch (error) {
      console.error('Failed to recompute season licenses:', error);
      alert('Failed to recompute licenses');
    } finally {
      setRecomputingSeason(false);
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
      {/* License Information Box */}
      <SectionCard className="mb-6">
        <div className="flex items-start gap-4">
          <div className="h-9 w-9 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
              License Point System
            </h3>
            <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
              <li>• Incident points are assigned manually during incident review</li>
              <li>• Drivers with <strong>8 or more points</strong> will have their license suspended</li>
              <li>• Division 1 points expire after <strong>12 rounds</strong></li>
              <li>• Division 2 points expire after <strong>6 rounds</strong></li>
              <li>• Division 3 points reset each season and do not carry over</li>
              <li>• Rookies points reset each season and do not carry over</li>
            </ul>
            <div className="mt-3">
              <button
                type="button"
                onClick={handleRecomputeSeason}
                disabled={!selectedSeason || recomputingSeason}
                className="h-9 inline-flex items-center gap-2 px-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {recomputingSeason ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Recompute Season Licenses
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`rounded-md border p-4 text-left transition-colors ${
            statusFilter === 'all'
              ? 'border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800/60'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Total Licenses</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="h-9 w-9 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('active')}
          className={`rounded-md border p-4 text-left transition-colors ${
            statusFilter === 'active'
              ? 'border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800/60'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Active</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.active}</p>
            </div>
            <div className="h-9 w-9 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('suspended')}
          className={`rounded-md border p-4 text-left transition-colors ${
            statusFilter === 'suspended'
              ? 'border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800/60'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Suspended</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.suspended}</p>
            </div>
            <div className="h-9 w-9 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('atRisk')}
          className={`rounded-md border p-4 text-left transition-colors ${
            statusFilter === 'atRisk'
              ? 'border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800/60'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">At Risk (5+)</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.atRisk}</p>
            </div>
            <div className="h-9 w-9 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
        </button>
      </div>

      {/* Filters */}
      <SectionCard icon={Search} title="Search & Filter" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by driver name, email, or division..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LicenseFilter)}
            className="h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 transition-colors"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="atRisk">At Risk (5+)</option>
          </select>
        </div>
      </SectionCard>

      {/* Licenses Table */}
      <SectionCard title={`All Licenses (${filteredLicenses.length})`} icon={CreditCard} noPadding>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-1.5 text-left text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase">
                  Driver
                </th>
                <th className="px-3 py-1.5 text-left text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase">
                  Division
                </th>
                <th className="px-3 py-1.5 text-left text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase">
                  Active Points
                </th>
                <th className="px-3 py-1.5 text-left text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase">
                  Next Expiry
                </th>
                <th className="px-3 py-1.5 text-left text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase">
                  Status
                </th>
                <th className="px-3 py-1.5 text-left text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLicenses.map((license) => (
                <tr
                  key={license.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-3 py-2 text-sm">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {license.driver_name}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${getDivisionColor(license.driver_division)}`}>
                      {license.driver_division}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          license.activePoints >= 8
                            ? 'text-red-600 dark:text-red-400'
                            : license.activePoints >= 5
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        {license.activePoints}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">/ 8</span>
                      {license.activePoints >= 5 && license.activePoints < 8 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        At Risk
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
                    <span
                      title={license.nextExpiryDetail || license.nextExpiry || 'N/A'}
                      className="cursor-help border-b border-dotted border-slate-300 dark:border-slate-600"
                    >
                      {license.nextExpiry || 'N/A'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <select
                      value={license.isSuspended ? 'suspended' : 'active'}
                      onChange={(e) => handleStatusChange(license.id, e.target.value as 'active' | 'suspended')}
                      disabled={updatingLicenseId === license.id}
                      className={`h-7 px-2 text-[11px] font-medium rounded-md border transition-colors disabled:opacity-60 ${
                        license.isSuspended
                          ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                          : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                      }`}
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
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
