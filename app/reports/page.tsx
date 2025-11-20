'use client';

import { useState, useEffect, useMemo } from 'react';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import { useSeason } from '@/components/SeasonContext';
import { Division } from '@/types';
import { Download, Loader2, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

interface RaceResult {
  driverId: string;
  driverName: string;
  driverAlias?: string;
  division: Division;
  kartNumber?: string;
  position: number;
  gridPosition?: number;
  overallPosition?: number;
  fastestLap?: string;
  points?: number;
  raceType?: string;
  raceName?: string;
  finalType?: string;
}

interface LapTime {
  driverId: string;
  driverName: string;
  division: Division;
  fastestLap: string;
  raceType: string;
  raceName?: string;
}

export default function ReportsPage() {
  const { selectedSeason } = useSeason();
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<Division | 'All'>('All');
  const [rounds, setRounds] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [raceResults, setRaceResults] = useState<RaceResult[]>([]);
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
          // Flatten the results from division-based structure
          const flattened: RaceResult[] = [];
          if (Array.isArray(data)) {
            data.forEach((divisionResult: any) => {
              if (divisionResult.results && Array.isArray(divisionResult.results)) {
                divisionResult.results.forEach((result: any) => {
                  flattened.push({
                    ...result,
                    division: divisionResult.division,
                  });
                });
              }
            });
          }
          setRaceResults(flattened);
        }
      } catch (error) {
        console.error('Failed to fetch race results:', error);
        setRaceResults([]);
      }
    };

    fetchRaceResults();
  }, [selectedRoundId]);

  // Organize results by type, filtered by division
  const organizedResults = useMemo(() => {
    // Filter by division if selected
    const filteredResults = selectedDivision === 'All' 
      ? raceResults 
      : raceResults.filter(r => r.division === selectedDivision);

    const qualifying: RaceResult[] = [];
    const heats: { [key: string]: RaceResult[] } = {};
    const finals: { [key: string]: RaceResult[] } = {};
    const overall: RaceResult[] = [];

    filteredResults.forEach((result) => {
      const raceType = (result.raceType || '').toLowerCase();
      const raceName = result.raceName || '';
      const finalType = result.finalType || '';

      if (raceType.includes('qual') || raceName.toLowerCase().includes('qual')) {
        qualifying.push(result);
      } else if (raceType.includes('heat') || raceName.toLowerCase().includes('heat')) {
        const key = finalType || raceName;
        if (!heats[key]) heats[key] = [];
        heats[key].push(result);
      } else if (raceType.includes('final') || raceName.toLowerCase().includes('final')) {
        const key = finalType || raceName;
        if (!finals[key]) finals[key] = [];
        finals[key].push(result);
      }

      // Overall results (use final if available, otherwise use best position)
      const existingOverall = overall.find(r => r.driverId === result.driverId);
      if (!existingOverall) {
        overall.push({ ...result });
      } else {
        // Prefer final results for overall
        if (raceType.includes('final') || raceName.toLowerCase().includes('final')) {
          const index = overall.findIndex(r => r.driverId === result.driverId);
          overall[index] = { ...result };
        } else if (existingOverall.overallPosition && result.overallPosition) {
          // Use better (lower) position
          if (result.overallPosition < existingOverall.overallPosition) {
            const index = overall.findIndex(r => r.driverId === result.driverId);
            overall[index] = { ...result };
          }
        }
      }
    });

    // Sort each category by position
    qualifying.sort((a, b) => (a.position || 0) - (b.position || 0));
    Object.keys(heats).forEach(key => {
      heats[key].sort((a, b) => (a.position || 0) - (b.position || 0));
    });
    Object.keys(finals).forEach(key => {
      finals[key].sort((a, b) => (a.position || 0) - (b.position || 0));
    });
    overall.sort((a, b) => (a.overallPosition || a.position || 999) - (b.overallPosition || b.position || 999));

    return { qualifying, heats, finals, overall };
  }, [raceResults, selectedDivision]);

  // Helper to parse lap time to seconds
  const parseLapTime = (timeStr: string): number => {
    if (!timeStr) return Infinity;
    // Handle formats like "60.123" or "1:00.123"
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      const minutes = parseFloat(parts[0]) || 0;
      const seconds = parseFloat(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    return parseFloat(timeStr) || Infinity;
  };

  // Get best lap times, filtered by division
  const bestLapTimes = useMemo(() => {
    const lapTimes: LapTime[] = [];
    const driverMap = new Map<string, LapTime>();

    // Filter by division if selected
    const filteredResults = selectedDivision === 'All' 
      ? raceResults 
      : raceResults.filter(r => r.division === selectedDivision);

    filteredResults.forEach((result) => {
      if (result.fastestLap && result.fastestLap.trim()) {
        const existing = driverMap.get(result.driverId);
        if (!existing) {
          driverMap.set(result.driverId, {
            driverId: result.driverId,
            driverName: result.driverName || '',
            division: result.division,
            fastestLap: result.fastestLap,
            raceType: result.raceType || '',
            raceName: result.raceName,
          });
        } else {
          // Compare lap times (assuming format like "60.123" or "1:00.123")
          const existingTime = parseLapTime(existing.fastestLap);
          const newTime = parseLapTime(result.fastestLap);
          if (newTime < existingTime) {
            driverMap.set(result.driverId, {
              driverId: result.driverId,
              driverName: result.driverName || '',
              division: result.division,
              fastestLap: result.fastestLap,
              raceType: result.raceType || '',
              raceName: result.raceName,
            });
          }
        }
      }
    });

    lapTimes.push(...Array.from(driverMap.values()));
    lapTimes.sort((a, b) => parseLapTime(a.fastestLap) - parseLapTime(b.fastestLap));

    return lapTimes;
  }, [raceResults, selectedDivision]);

  // Get list of participants for the selected round and division
  const participants = useMemo(() => {
    const participantSet = new Set<string>();
    const participantList: { driverId: string; driverName: string; division: Division }[] = [];

    // Filter by division if selected
    const filteredResults = selectedDivision === 'All' 
      ? raceResults 
      : raceResults.filter(r => r.division === selectedDivision);

    filteredResults.forEach((result) => {
      if (!participantSet.has(result.driverId)) {
        participantSet.add(result.driverId);
        participantList.push({
          driverId: result.driverId,
          driverName: result.driverName || '',
          division: result.division,
        });
      }
    });

    // Sort alphabetically by name
    participantList.sort((a, b) => a.driverName.localeCompare(b.driverName));

    return participantList;
  }, [raceResults, selectedDivision]);

  const selectedRound = rounds.find(r => r.id === selectedRoundId);

  const generatePDF = async () => {
    if (!selectedRound || raceResults.length === 0) {
      alert('No data to export. Please select a round with race results.');
      return;
    }

    setExporting(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Load and add logo
      const logoUrl = '/vhkc-logo.png';
      let logoAdded = false;
      
      try {
        const logoResponse = await fetch(logoUrl);
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(logoBlob);
          });
          
          // Add logo to header (40x40 size, positioned on left)
          doc.addImage(logoDataUrl, 'PNG', 20, 15, 40, 40);
          logoAdded = true;
        }
      } catch (logoError) {
        console.warn('Could not load logo:', logoError);
      }

      let yPos = 25;

      // Modern Professional Header with gradient effect
      doc.setFillColor(15, 23, 42); // Dark slate
      doc.rect(0, 0, pageWidth, 70, 'F');
      
      // Add subtle accent line
      doc.setFillColor(59, 130, 246); // Primary blue
      doc.rect(0, 68, pageWidth, 2, 'F');
      
      // Header text (right side if logo is present)
      doc.setTextColor(255, 255, 255);
      const headerX = logoAdded ? pageWidth - 20 : pageWidth / 2;
      const headerAlign = logoAdded ? 'right' : 'center';
      
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('VHKC RACE RESULTS', headerX, 35, { align: headerAlign as any });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('OFFICIAL REPORT', headerX, 45, { align: headerAlign as any });
      
      doc.setFontSize(9);
      const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.text(`Generated: ${reportDate}`, headerX, 55, { align: headerAlign as any });
      
      yPos = 80;

      // Modern Information Section with card-like design
      const infoStartX = 20;
      const infoWidth = pageWidth - 40;
      const infoBoxHeight = 50;
      
      // Card background
      doc.setFillColor(249, 250, 251); // Very light gray
      doc.setDrawColor(226, 232, 240); // Light border
      doc.setLineWidth(0.5);
      doc.roundedRect(infoStartX, yPos, infoWidth, infoBoxHeight, 2, 2, 'FD');
      
      // Section title
      doc.setFillColor(59, 130, 246); // Primary blue
      doc.roundedRect(infoStartX, yPos, infoWidth, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('EVENT INFORMATION', infoStartX + 8, yPos + 5.5);
      
      // Information items
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      let currentY = yPos + 18;
      const infoLineHeight = 7;
      const labelWidth = 50;
      
      const infoItems = [
        { label: 'Season', value: selectedSeason?.name || 'N/A' },
        { label: 'Round', value: `${selectedRound.roundNumber || ''} - ${selectedRound.location || 'TBD'}` },
      ];
      
      if (selectedRound.date) {
        const date = new Date(selectedRound.date);
        infoItems.push({ 
          label: 'Date', 
          value: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) 
        });
      }
      
      if (selectedRound.address) {
        infoItems.push({ label: 'Location', value: selectedRound.address });
      }
      
      if (selectedDivision !== 'All') {
        infoItems.push({ label: 'Division', value: selectedDivision });
      }
      
      // Two-column layout for info
      const midPoint = infoStartX + infoWidth / 2;
      infoItems.forEach((item, index) => {
        const xPos = index % 2 === 0 ? infoStartX + 8 : midPoint + 8;
        const yPosItem = currentY + Math.floor(index / 2) * infoLineHeight;
        
        doc.setFont('helvetica', 'bold');
        doc.text(`${item.label}:`, xPos, yPosItem);
        doc.setFont('helvetica', 'normal');
        const labelTextWidth = doc.getTextWidth(`${item.label}:`);
        doc.text(item.value, xPos + labelTextWidth + 4, yPosItem);
      });
      
      yPos = yPos + infoBoxHeight + 15;

      // Modern professional table helper function
      const addTable = async (title: string, data: any[], columns: string[], getRowData: (item: any) => any[]) => {
        if (data.length === 0) return;

        // Check if we need a new page
        if (yPos > pageHeight - 80) {
          doc.addPage();
          yPos = 25;
          // Re-add logo on new page if it was added before
          if (logoAdded) {
            try {
              const logoResponse = await fetch(logoUrl);
              if (logoResponse.ok) {
                const logoBlob = await logoResponse.blob();
                const logoDataUrl = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(logoBlob);
                });
                doc.addImage(logoDataUrl, 'PNG', 20, 15, 40, 40);
              }
            } catch (e) {
              // Logo load failed, continue without it
            }
          }
        }

        // Modern section title with accent
        doc.setFillColor(59, 130, 246); // Primary blue accent bar
        doc.rect(20, yPos - 2, 4, 12, 'F');
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(title.toUpperCase(), 28, yPos + 5);
        
        yPos += 12;

        // Prepare table data
        const tableData = data.map((item, index) => [
          (index + 1).toString(),
          ...getRowData(item)
        ]);

        autoTable(doc, {
          head: [['#', ...columns]],
          body: tableData,
          startY: yPos,
          theme: 'striped',
          headStyles: { 
            fillColor: [15, 23, 42], // Dark slate
            textColor: [255, 255, 255], 
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left',
            cellPadding: { top: 6, bottom: 6, left: 5, right: 5 },
            lineWidth: 0.3,
            lineColor: [255, 255, 255]
          },
          bodyStyles: {
            fontSize: 8.5,
            textColor: [30, 41, 59],
            cellPadding: { top: 5, bottom: 5, left: 5, right: 5 },
            lineWidth: 0.1,
            lineColor: [226, 232, 240]
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251] // Very light gray
          },
          columnStyles: {
            0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' }, // Rank column
          },
          margin: { left: 20, right: 20, top: yPos },
          tableWidth: 'auto',
          showHead: 'everyPage',
          styles: {
            overflow: 'linebreak',
            cellPadding: 5,
            valign: 'middle',
            minCellHeight: 7
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      };

      // Participants List (moved to first)
      if (participants.length > 0) {
        await addTable(
          'Participants',
          participants,
          ['Driver', 'Division'],
          (item) => [
            item.driverName || '',
            item.division || '',
          ]
        );
      }

      // Qualifying Results
      if (organizedResults.qualifying.length > 0) {
        await addTable(
          'Qualifying Results',
          organizedResults.qualifying,
          ['Driver', 'Division', 'Position', 'Fastest Lap'],
          (item) => [
            item.driverName || '',
            item.division || '',
            item.position?.toString() || '',
            item.fastestLap || '-',
          ]
        );
      }

      // Heat Results
      for (const heatKey of Object.keys(organizedResults.heats)) {
        const heatResults = organizedResults.heats[heatKey];
        if (heatResults.length > 0) {
          await addTable(
            `Heat ${heatKey} Results`,
            heatResults,
            ['Driver', 'Division', 'Position', 'Fastest Lap'],
            (item) => [
              item.driverName || '',
              item.division || '',
              item.position?.toString() || '',
              item.fastestLap || '-',
            ]
          );
        }
      }

      // Final Results
      for (const finalKey of Object.keys(organizedResults.finals)) {
        const finalResults = organizedResults.finals[finalKey];
        if (finalResults.length > 0) {
          await addTable(
            `Final ${finalKey} Results`,
            finalResults,
            ['Driver', 'Division', 'Position', 'Fastest Lap'],
            (item) => [
              item.driverName || '',
              item.division || '',
              item.position?.toString() || '',
              item.fastestLap || '-',
            ]
          );
        }
      }

      // Overall Results
      if (organizedResults.overall.length > 0) {
        await addTable(
          'Overall Results',
          organizedResults.overall,
          ['Driver', 'Division', 'Position', 'Fastest Lap'],
          (item) => [
            item.driverName || '',
            item.division || '',
            (item.overallPosition || item.position)?.toString() || '',
            item.fastestLap || '-',
          ]
        );
      }

      // Best Lap Times
      if (bestLapTimes.length > 0) {
        await addTable(
          'Best Lap Times (Ranked)',
          bestLapTimes,
          ['Driver', 'Division', 'Best Lap Time', 'Race Type'],
          (item) => [
            item.driverName || '',
            item.division || '',
            item.fastestLap || '-',
            item.raceType || item.raceName || '-',
          ]
        );
      }

      // Modern professional footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Footer background
        doc.setFillColor(15, 23, 42); // Dark slate
        doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
        
        // Accent line
        doc.setFillColor(59, 130, 246); // Primary blue
        doc.rect(0, pageHeight - 20, pageWidth, 2, 'F');
        
        // Footer text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const footerText = `VHKC Race Results Report | Page ${i} of ${totalPages}`;
        doc.text(footerText, pageWidth / 2, pageHeight - 12, { align: 'center' });
        
        doc.setFontSize(7);
        doc.setTextColor(200, 200, 200);
        const timestamp = new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
        doc.text(`Generated: ${timestamp}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
      }

      // Generate filename
      const roundName = selectedRound.location?.replace(/[^a-z0-9]/gi, '_') || `Round_${selectedRound.roundNumber || ''}`;
      const dateStr = selectedRound.date ? new Date(selectedRound.date).toISOString().split('T')[0] : '';
      const filename = `VHKC_${roundName}_${dateStr}.pdf`;

      // Save PDF
      doc.save(filename);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error.message || 'Please try again.'}`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <PageLayout
        title="Reports"
        subtitle="Generate PDF reports for race results"
        icon={FileText}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            <p className="text-slate-600 dark:text-slate-400">Loading reports...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Reports"
      subtitle="Generate PDF reports for race results"
      icon={FileText}
    >
      <SectionCard
        title="Generate Race Report"
        icon={FileText}
      >
        <div className="space-y-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Select a round to generate a comprehensive PDF report including qualifying results, heat results, final results, overall standings, and best lap times.
          </p>

          {/* Round and Division Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Select Round
              </label>
              <select
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              >
                {rounds.length === 0 ? (
                  <option value="">No rounds available</option>
                ) : (
                  rounds.map((round) => (
                    <option key={round.id} value={round.id}>
                      Round {round.roundNumber || ''} - {round.location || 'TBD'} {round.date ? `(${new Date(round.date).toLocaleDateString()})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Select Division
              </label>
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value as Division | 'All')}
                className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              >
                <option value="All">All Divisions</option>
                {(['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New'] as Division[]).map((division) => (
                  <option key={division} value={division}>
                    {division}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Round Details */}
          {selectedRound && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Round Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400">
                <div>
                  <span className="font-medium">Round:</span> {selectedRound.roundNumber || ''} - {selectedRound.location || 'TBD'}
                </div>
                <div>
                  <span className="font-medium">Date:</span> {selectedRound.date ? new Date(selectedRound.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                </div>
                {selectedRound.address && (
                  <div className="md:col-span-2">
                    <span className="font-medium">Location:</span> {selectedRound.address}
                  </div>
                )}
                <div>
                  <span className="font-medium">Qualifying Results:</span> {organizedResults.qualifying.length}
                </div>
                <div>
                  <span className="font-medium">Heat Results:</span> {Object.keys(organizedResults.heats).length} heat(s)
                </div>
                <div>
                  <span className="font-medium">Final Results:</span> {Object.keys(organizedResults.finals).length} final(s)
                </div>
                <div>
                  <span className="font-medium">Best Lap Times:</span> {bestLapTimes.length}
                </div>
                <div>
                  <span className="font-medium">Participants:</span> {participants.length}
                </div>
                {selectedDivision !== 'All' && (
                  <div>
                    <span className="font-medium">Filtered by:</span> {selectedDivision}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={generatePDF}
            disabled={!selectedRoundId || raceResults.length === 0 || exporting}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl hover-lift font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Generate PDF Report
              </>
            )}
          </button>
        </div>
      </SectionCard>
    </PageLayout>
  );
}
