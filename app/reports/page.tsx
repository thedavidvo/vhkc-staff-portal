'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import { useSeason } from '@/components/SeasonContext';
import { Division } from '@/types';
import { Download, Loader2 } from 'lucide-react';

// Helper function to get division color
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
    default:
      return 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200';
  }
};

interface ReportRow {
  driverId: string;
  driverName: string;
  bestTime: string;
  finalPosition: number | string;
  preRaceDivision: Division;
  movement: 'Promotion' | 'Neutral' | 'Demotion';
  postRaceDivision: Division;
  lockedIn: 'Yes' | 'No' | '';
  notes: string;
}

export default function ReportsPage() {
  const { selectedSeason } = useSeason();
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [rounds, setRounds] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [raceResults, setRaceResults] = useState<any[]>([]);
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedSeason) {
        setRounds([]);
        setDrivers([]);
        setRaceResults([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [roundsResponse, driversResponse] = await Promise.all([
          fetch(`/api/rounds?seasonId=${selectedSeason.id}`),
          fetch(`/api/drivers?seasonId=${selectedSeason.id}`),
        ]);
        
        if (roundsResponse.ok) {
          const roundsData = await roundsResponse.json();
          const sortedRounds = roundsData.sort((a: any, b: any) => {
            const roundA = a.roundNumber || 0;
            const roundB = b.roundNumber || 0;
            return roundA - roundB;
          });
          setRounds(sortedRounds);
          
          if (sortedRounds.length > 0 && !selectedRoundId) {
            setSelectedRoundId(sortedRounds[0].id);
          }
        }

        if (driversResponse.ok) {
          const driversData = await driversResponse.json();
          setDrivers(driversData.filter((d: any) => d.status === 'ACTIVE'));
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSeason, selectedRoundId]);

  useEffect(() => {
    const fetchRaceResults = async () => {
      if (!selectedRoundId) {
        setRaceResults([]);
        return;
      }

      try {
        const response = await fetch(`/api/race-results?roundId=${selectedRoundId}`);
        if (response.ok) {
          const data = await response.json();
          setRaceResults(data || []);
        }
      } catch (error) {
        console.error('Failed to fetch race results:', error);
        setRaceResults([]);
      }
    };

    fetchRaceResults();
  }, [selectedRoundId]);

  // Build report data from all drivers and match with race results
  useEffect(() => {
    if (!drivers.length || !selectedRoundId) {
      setReportData([]);
      return;
    }

    // Get all race results flattened
    const allRaceResults: any[] = [];
    raceResults.forEach((divisionResult: any) => {
      if (divisionResult.results) {
        divisionResult.results.forEach((result: any) => {
          allRaceResults.push({
            ...result,
            division: divisionResult.division,
          });
        });
      }
    });

    // Create report rows for all drivers
    const rows: ReportRow[] = drivers.map((driver) => {
      // Find race result for this driver
      const raceResult = allRaceResults.find((r: any) => r.driverId === driver.id);
      
      // Determine movement (compare pre-race division with current division)
      // For now, we'll default to Neutral and let user set it
      let movement: 'Promotion' | 'Neutral' | 'Demotion' = 'Neutral';
      const preRaceDivision = driver.division;
      const postRaceDivision = driver.division; // Default to current division
      
      return {
        driverId: driver.id,
        driverName: driver.name,
        bestTime: raceResult?.fastestLap || '',
        finalPosition: raceResult?.overallPosition || raceResult?.position || '',
        preRaceDivision: preRaceDivision,
        movement: movement,
        postRaceDivision: postRaceDivision,
        lockedIn: '',
        notes: '',
      };
    });

    // Sort by final position (those who raced first, then alphabetically)
    rows.sort((a, b) => {
      const aPos = typeof a.finalPosition === 'number' ? a.finalPosition : 999;
      const bPos = typeof b.finalPosition === 'number' ? b.finalPosition : 999;
      if (aPos !== 999 || bPos !== 999) {
        return aPos - bPos;
      }
      return a.driverName.localeCompare(b.driverName);
    });

    setReportData(rows);
  }, [drivers, raceResults, selectedRoundId]);

  const updateReportRow = (index: number, field: keyof ReportRow, value: any) => {
    const updated = [...reportData];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setReportData(updated);
  };

  const selectedRound = rounds.find(r => r.id === selectedRoundId);

  const exportToGoogleSheet = async () => {
    if (!selectedRound || reportData.length === 0) {
      alert('No data to export. Please select a round.');
      return;
    }

    setExporting(true);

    try {
      // Prepare data for Google Sheet
      const values: any[][] = [];
      
      // Header section
      values.push(['VHKC RACE RESULTS REPORT']);
      values.push([]);
      values.push(['Season:', selectedSeason?.name || 'N/A']);
      values.push(['Round:', `${selectedRound.roundNumber || ''} - ${selectedRound.name || ''}`]);
      values.push(['Date:', selectedRound.date ? new Date(selectedRound.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A']);
      values.push(['Location:', selectedRound.location || 'N/A']);
      if (selectedRound.address) {
        values.push(['Address:', selectedRound.address]);
      }
      values.push([]);
      
      // Table header
      values.push(['Rank', 'Driver', 'Best Time', 'Final Position', 'Pre-Race Division', 'Movement', 'Post Race Division', 'Locked In?', 'Notes']);
      
      // Data rows
      reportData.forEach((row, index) => {
        values.push([
          index + 1,
          row.driverName,
          row.bestTime || '',
          row.finalPosition || '',
          row.preRaceDivision,
          row.movement,
          row.postRaceDivision,
          row.lockedIn || '',
          row.notes || '',
        ]);
      });
      
      values.push([]);
      values.push(['Generated on:', new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })]);
      
      // Create filename
      const roundName = selectedRound.name?.replace(/[^a-z0-9]/gi, '_') || `Round_${selectedRound.roundNumber || ''}`;
      const dateStr = selectedRound.date ? new Date(selectedRound.date).toISOString().split('T')[0] : '';
      const title = `VHKC ${roundName} ${dateStr}`;
      
      // Call API to create Google Sheet
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, data: values, drivers }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create Google Sheet');
      }

      const { url } = await response.json();
      
      // Open in new tab
      window.open(url, '_blank');
    } catch (error: any) {
      console.error('Error creating Google Sheet:', error);
      alert(`Failed to create Google Sheet: ${error.message || 'Please try again.'}`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header hideSearch />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                <p className="text-slate-600 dark:text-slate-400">Loading reports...</p>
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
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
            Reports & Export
          </h1>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Race Report
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Select a round to view and edit race results. All drivers are included regardless of participation or division.
            </p>

            {/* Round Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Round
              </label>
              <select
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                className="w-full md:w-96 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {rounds.length === 0 ? (
                  <option value="">No rounds available</option>
                ) : (
                  rounds.map((round) => (
                    <option key={round.id} value={round.id}>
                      Round {round.roundNumber || ''} - {round.name || ''} ({round.date ? new Date(round.date).toLocaleDateString() : 'N/A'})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Preview Section */}
            {selectedRound && (
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  Selected Round Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="font-medium">Round:</span> {selectedRound.roundNumber || ''} - {selectedRound.name || ''}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span> {selectedRound.date ? new Date(selectedRound.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Location:</span> {selectedRound.location || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Total Drivers:</span> {reportData.length}
                  </div>
                </div>
              </div>
            )}

            {/* Export Button */}
            <button
              onClick={exportToGoogleSheet}
              disabled={!selectedRoundId || reportData.length === 0 || exporting}
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Google Sheet...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Create Google Sheet
                </>
              )}
            </button>
          </div>

          {/* Report Table */}
          {reportData.length > 0 && selectedRoundId && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Race Report - {selectedRound?.name || 'Round'}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Rank
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Driver
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Best Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Final Position
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Pre-Race Division
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Movement
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Post Race Division
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Locked In?
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {reportData.map((row, index) => (
                      <tr
                        key={row.driverId}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-white">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={row.driverId}
                            onChange={(e) => {
                              const selectedDriver = drivers.find(d => d.id === e.target.value);
                              if (selectedDriver) {
                                updateReportRow(index, 'driverId', selectedDriver.id);
                                updateReportRow(index, 'driverName', selectedDriver.name);
                              }
                            }}
                            className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          >
                            {drivers.map((driver) => (
                              <option key={driver.id} value={driver.id}>
                                {driver.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={row.bestTime}
                            onChange={(e) => updateReportRow(index, 'bestTime', e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                            placeholder="00:00.000"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={row.finalPosition}
                            onChange={(e) => updateReportRow(index, 'finalPosition', e.target.value ? parseInt(e.target.value) : '')}
                            className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            placeholder="-"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={row.preRaceDivision}
                            onChange={(e) => updateReportRow(index, 'preRaceDivision', e.target.value as Division)}
                            className={`w-full px-3 py-1.5 border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary ${getDivisionColor(row.preRaceDivision)}`}
                          >
                            {(['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New'] as Division[]).map((div) => (
                              <option key={div} value={div}>
                                {div}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={row.movement}
                            onChange={(e) => updateReportRow(index, 'movement', e.target.value as 'Promotion' | 'Neutral' | 'Demotion')}
                            className={`w-full px-3 py-1.5 border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary ${
                              row.movement === 'Promotion' 
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                : row.movement === 'Demotion'
                                ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
                            }`}
                          >
                            <option value="Neutral">Neutral</option>
                            <option value="Promotion">Promotion</option>
                            <option value="Demotion">Demotion</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={row.postRaceDivision}
                            onChange={(e) => updateReportRow(index, 'postRaceDivision', e.target.value as Division)}
                            className={`w-full px-3 py-1.5 border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary ${getDivisionColor(row.postRaceDivision)}`}
                          >
                            {(['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New'] as Division[]).map((div) => (
                              <option key={div} value={div}>
                                {div}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={row.lockedIn}
                            onChange={(e) => updateReportRow(index, 'lockedIn', e.target.value as 'Yes' | 'No' | '')}
                            className={`w-full px-3 py-1.5 border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary ${
                              row.lockedIn === 'Yes'
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                : row.lockedIn === 'No'
                                ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <option value="">-</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={row.notes}
                            onChange={(e) => updateReportRow(index, 'notes', e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            placeholder="Add notes..."
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
