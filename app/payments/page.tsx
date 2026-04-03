'use client';

import { useEffect, useMemo, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import { useSeason } from '@/components/SeasonContext';
import { Driver, Division } from '@/types';
import { CreditCard, DollarSign, Loader2, Save, Trash2, Upload, FileUp } from 'lucide-react';

type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';

interface PaymentRecord {
  id: string;
  seasonId: string;
  roundId: string;
  driverId: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod?: string;
  paymentDate?: string;
  referenceNumber?: string;
  notes?: string;
  updatedAt?: string;
}

interface PaymentDraft {
  amount: string;
  status: PaymentStatus;
  paymentMethod: string;
  notes: string;
}

const DEFAULT_DRAFT: PaymentDraft = {
  amount: '',
  status: 'pending',
  paymentMethod: '',
  notes: '',
};

const getDivisionColor = (division: Division) => {
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
    case 'Open':
      return 'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  }
};

const getStatusStyle = (status: PaymentStatus) => {
  switch (status) {
    case 'paid':
      return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'pending':
      return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'failed':
      return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
    case 'refunded':
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }
};

export default function PaymentsPage() {
  const { selectedSeason } = useSeason();
  const [rounds, setRounds] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PaymentDraft>>({});
  const [selectedRound, setSelectedRound] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [savingDriverId, setSavingDriverId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importSummary, setImportSummary] = useState<{
    totalRows: number;
    processedDrivers: number;
    skippedRows: number;
    createdDrivers: number;
    createdPayments: number;
    updatedPayments: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchBaseData = async () => {
      if (!selectedSeason) {
        setRounds([]);
        setDrivers([]);
        setPayments([]);
        setDrafts({});
        setSelectedRound('');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage(null);

        const [roundsResponse, driversResponse] = await Promise.all([
          fetch(`/api/rounds?seasonId=${selectedSeason.id}`),
          fetch(`/api/drivers?seasonId=${selectedSeason.id}`),
        ]);

        if (roundsResponse.ok) {
          const roundsData = await roundsResponse.json();
          const sortedRounds = [...roundsData].sort((a: any, b: any) => (a.roundNumber || 0) - (b.roundNumber || 0));
          setRounds(sortedRounds);

          if (sortedRounds.length > 0) {
            setSelectedRound((prev) => (prev && sortedRounds.some((round: any) => round.id === prev) ? prev : sortedRounds[0].id));
          } else {
            setSelectedRound('');
          }
        }

        if (driversResponse.ok) {
          const driversData = await driversResponse.json();
          setDrivers(driversData);
        }
      } catch (error) {
        console.error('Failed to fetch payment setup data:', error);
        setErrorMessage('Failed to load rounds and drivers for this season.');
      } finally {
        setLoading(false);
      }
    };

    fetchBaseData();
  }, [selectedSeason]);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!selectedRound) {
        setPayments([]);
        setDrafts({});
        return;
      }

      try {
        setLoadingPayments(true);
        setErrorMessage(null);

        const response = await fetch(`/api/payments?roundId=${selectedRound}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load payments for this round.');
        }

        const paymentRows = Array.isArray(data) ? data : [];
        setPayments(paymentRows);

        const nextDrafts: Record<string, PaymentDraft> = {};
        for (const driver of drivers) {
          const existingPayment = paymentRows.find((payment: PaymentRecord) => payment.driverId === driver.id);
          nextDrafts[driver.id] = existingPayment
            ? {
                amount: existingPayment.amount?.toString() ?? '',
                status: existingPayment.status,
                paymentMethod: existingPayment.paymentMethod || '',
                notes: existingPayment.notes || '',
              }
            : { ...DEFAULT_DRAFT };
        }
        setDrafts(nextDrafts);
      } catch (error) {
        console.error('Failed to fetch payments:', error);
        const message = error instanceof Error ? error.message : 'Failed to load payments.';
        setErrorMessage(message);
        setPayments([]);
      } finally {
        setLoadingPayments(false);
      }
    };

    fetchPayments();
  }, [selectedRound, drivers]);

  const paymentsByDriver = useMemo(() => {
    return payments.reduce<Record<string, PaymentRecord>>((acc, payment) => {
      acc[payment.driverId] = payment;
      return acc;
    }, {});
  }, [payments]);

  const filteredDrivers = useMemo(() => {
    return drivers
      .filter((driver) => {
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const nameMatches = driver.name.toLowerCase().includes(query);
          const aliasMatches = (driver.aliases || []).some((alias) => alias.toLowerCase().includes(query));
          if (!nameMatches && !aliasMatches) {
            return false;
          }
        }

        if (statusFilter !== 'all') {
          const currentStatus = paymentsByDriver[driver.id]?.status || 'pending';
          if (currentStatus !== statusFilter) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [drivers, searchQuery, statusFilter, paymentsByDriver]);

  const stats = useMemo(() => {
    const paidCount = Object.values(paymentsByDriver).filter((payment) => payment.status === 'paid').length;
    const pendingCount = Math.max(0, drivers.length - paidCount);
    const totalAmount = Object.values(paymentsByDriver).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return {
      paidCount,
      pendingCount,
      totalAmount,
    };
  }, [paymentsByDriver, drivers.length]);

  const updateDraft = (driverId: string, field: keyof PaymentDraft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [driverId]: {
        ...(prev[driverId] || DEFAULT_DRAFT),
        [field]: value,
      },
    }));
  };

  const handleSavePayment = async (driverId: string) => {
    if (!selectedSeason || !selectedRound) {
      return;
    }

    const draft = drafts[driverId] || DEFAULT_DRAFT;
    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage('Enter an amount greater than 0 before saving.');
      return;
    }

    const existingPayment = paymentsByDriver[driverId];

    try {
      setSavingDriverId(driverId);
      setErrorMessage(null);

      const payload = {
        id: existingPayment?.id,
        seasonId: selectedSeason.id,
        roundId: selectedRound,
        driverId,
        amount,
        status: draft.status,
        paymentMethod: draft.paymentMethod.trim() || undefined,
        notes: draft.notes.trim() || undefined,
        paymentDate: new Date().toISOString(),
      };

      const response = await fetch('/api/payments', {
        method: existingPayment ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save payment.');
      }

      const refreshResponse = await fetch(`/api/payments?roundId=${selectedRound}`);
      if (refreshResponse.ok) {
        const refreshedPayments = await refreshResponse.json();
        setPayments(Array.isArray(refreshedPayments) ? refreshedPayments : []);
      }
    } catch (error) {
      console.error('Failed to save payment:', error);
      const message = error instanceof Error ? error.message : 'Failed to save payment.';
      setErrorMessage(message);
    } finally {
      setSavingDriverId(null);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!selectedRound) {
      return;
    }

    try {
      setDeletingPaymentId(paymentId);
      setErrorMessage(null);

      const response = await fetch(`/api/payments?id=${paymentId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete payment.');
      }

      const nextPayments = payments.filter((payment) => payment.id !== paymentId);
      setPayments(nextPayments);
    } catch (error) {
      console.error('Failed to delete payment:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete payment.';
      setErrorMessage(message);
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const handleImportCsv = async () => {
    if (!selectedSeason || !selectedRound) {
      setErrorMessage('Select a season and round before importing CSV.');
      return;
    }

    if (!csvFile) {
      setErrorMessage('Choose a CSV file to import.');
      return;
    }

    try {
      setImportingCsv(true);
      setErrorMessage(null);
      setImportSummary(null);

      const formData = new FormData();
      formData.append('seasonId', selectedSeason.id);
      formData.append('roundId', selectedRound);
      formData.append('file', csvFile);

      const response = await fetch('/api/payments/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to import CSV.');
      }

      setImportSummary(data.summary || null);

      const [driversResponse, paymentsResponse] = await Promise.all([
        fetch(`/api/drivers?seasonId=${selectedSeason.id}`),
        fetch(`/api/payments?roundId=${selectedRound}`),
      ]);

      if (driversResponse.ok) {
        const updatedDrivers = await driversResponse.json();
        setDrivers(Array.isArray(updatedDrivers) ? updatedDrivers : []);
      }

      if (paymentsResponse.ok) {
        const updatedPayments = await paymentsResponse.json();
        setPayments(Array.isArray(updatedPayments) ? updatedPayments : []);
      }

      setCsvFile(null);
    } catch (error) {
      console.error('CSV import failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to import CSV.';
      setErrorMessage(message);
    } finally {
      setImportingCsv(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Payment Management" subtitle="Loading season data" icon={CreditCard}>
        <SectionCard>
          <div className="min-h-[240px] flex items-center justify-center gap-3 text-slate-600 dark:text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading payments setup...</span>
          </div>
        </SectionCard>
      </PageLayout>
    );
  }

  if (!selectedSeason) {
    return (
      <PageLayout title="Payment Management" subtitle="Select a season to manage payments" icon={CreditCard}>
        <SectionCard>
          <p className="text-slate-600 dark:text-slate-400">Choose a season from the sidebar selector to begin.</p>
        </SectionCard>
      </PageLayout>
    );
  }

  const currency = new Intl.NumberFormat('en-HK', {
    style: 'currency',
    currency: 'HKD',
    minimumFractionDigits: 2,
  });

  return (
    <PageLayout
      title="Payment Management"
      subtitle="Track and update payment status by round"
      icon={CreditCard}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <SectionCard className="py-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Paid Drivers</p>
          <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{stats.paidCount}</p>
        </SectionCard>
        <SectionCard className="py-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Pending Drivers</p>
          <p className="text-xl font-semibold text-amber-600 dark:text-amber-400 mt-1">{stats.pendingCount}</p>
        </SectionCard>
        <SectionCard className="py-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Recorded</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white mt-1">{currency.format(stats.totalAmount)}</p>
        </SectionCard>
      </div>

      <SectionCard>
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <FileUp className="w-5 h-5 text-slate-600 dark:text-slate-300 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Import Payments CSV</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Uses Guest first name, Guest last name, Email, Total ticket price/Ticket price, Payment status, Phone Number, and Date of Birth.
                  Drivers not found in this season are auto-created in New division.
                </p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => setCsvFile(event.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-700 dark:text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-200 dark:file:bg-slate-700 file:text-slate-800 dark:file:text-slate-100 hover:file:bg-slate-300 dark:hover:file:bg-slate-600"
              />
              <button
                onClick={handleImportCsv}
                disabled={importingCsv || !csvFile || !selectedRound}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60"
              >
                {importingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import CSV
              </button>
            </div>

            {importSummary && (
              <div className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                Imported {importSummary.totalRows} rows, processed {importSummary.processedDrivers} drivers, created {importSummary.createdDrivers} new drivers,
                created {importSummary.createdPayments} payments, updated {importSummary.updatedPayments} payments, skipped {importSummary.skippedRows} rows.
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Round</label>
              <select
                value={selectedRound}
                onChange={(event) => setSelectedRound(event.target.value)}
                className="h-9 w-full px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40 focus:border-slate-300 dark:focus:border-slate-600"
              >
                {rounds.length === 0 && <option value="">No rounds available</option>}
                {rounds.map((round) => (
                  <option key={round.id} value={round.id}>
                    Round {round.roundNumber}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | PaymentStatus)}
                className="h-9 w-full px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40 focus:border-slate-300 dark:focus:border-slate-600"
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Search Driver</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Name or alias"
                className="h-9 w-full px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400/40 focus:border-slate-300 dark:focus:border-slate-600"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-md border border-red-300/60 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-3 py-2 text-red-700 dark:text-red-300 text-sm">
              {errorMessage}
            </div>
          )}

          {loadingPayments ? (
            <div className="min-h-[220px] flex items-center justify-center gap-3 text-slate-600 dark:text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading payments...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70">
                    <th className="py-2 px-2 font-semibold text-[11px] uppercase tracking-wide text-slate-700 dark:text-slate-300">Driver</th>
                    <th className="py-2 px-2 font-semibold text-[11px] uppercase tracking-wide text-slate-700 dark:text-slate-300">Division</th>
                    <th className="py-2 px-2 font-semibold text-[11px] uppercase tracking-wide text-slate-700 dark:text-slate-300">Amount (HKD)</th>
                    <th className="py-2 px-2 font-semibold text-[11px] uppercase tracking-wide text-slate-700 dark:text-slate-300">Status</th>
                    <th className="py-2 px-2 font-semibold text-[11px] uppercase tracking-wide text-slate-700 dark:text-slate-300">Method</th>
                    <th className="py-2 px-2 font-semibold text-[11px] uppercase tracking-wide text-slate-700 dark:text-slate-300">Notes</th>
                    <th className="py-2 px-2 font-semibold text-[11px] uppercase tracking-wide text-slate-700 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 px-2 text-center text-slate-500 dark:text-slate-400">
                        No matching drivers found.
                      </td>
                    </tr>
                  )}

                  {filteredDrivers.map((driver) => {
                    const draft = drafts[driver.id] || DEFAULT_DRAFT;
                    const existingPayment = paymentsByDriver[driver.id];
                    const isSaving = savingDriverId === driver.id;
                    const isDeleting = existingPayment?.id === deletingPaymentId;

                    return (
                      <tr key={driver.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2.5 px-2">
                          <div className="font-medium text-sm text-slate-900 dark:text-white">{driver.name}</div>
                          {existingPayment?.updatedAt && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Updated: {new Date(existingPayment.updatedAt).toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium ${getDivisionColor(driver.division)}`}>
                            {driver.division}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={draft.amount}
                            onChange={(event) => updateDraft(driver.id, 'amount', event.target.value)}
                            className="h-8 w-24 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <select
                            value={draft.status}
                            onChange={(event) => updateDraft(driver.id, 'status', event.target.value)}
                            className={`h-8 px-2 rounded-md border text-xs font-medium bg-white dark:bg-slate-900 ${getStatusStyle(draft.status)} focus:outline-none focus:ring-1 focus:ring-slate-400/40`}
                          >
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="text"
                            value={draft.paymentMethod}
                            onChange={(event) => updateDraft(driver.id, 'paymentMethod', event.target.value)}
                            placeholder="cash / transfer"
                            className="h-8 w-32 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400/40"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="text"
                            value={draft.notes}
                            onChange={(event) => updateDraft(driver.id, 'notes', event.target.value)}
                            placeholder="Optional"
                            className="h-8 w-44 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400/40"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSavePayment(driver.id)}
                              disabled={isSaving}
                              className="h-8 inline-flex items-center gap-1 px-2.5 rounded-md text-xs bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 disabled:opacity-60 transition-colors"
                            >
                              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                              {existingPayment ? 'Update' : 'Save'}
                            </button>

                            {existingPayment && (
                              <button
                                onClick={() => handleDeletePayment(existingPayment.id)}
                                disabled={isDeleting}
                                className="h-8 inline-flex items-center gap-1 px-2.5 rounded-md text-xs border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60 transition-colors"
                              >
                                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {rounds.length === 0 && (
            <div className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3 text-sm text-slate-600 dark:text-slate-400">
              No rounds are configured for this season yet.
            </div>
          )}

          {selectedRound && filteredDrivers.length > 0 && (
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Round payments are saved to the shared payment table and used by check-in payment status filters.
            </div>
          )}
        </div>
      </SectionCard>
    </PageLayout>
  );
}

