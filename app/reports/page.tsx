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
      return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
  }
};

// Helper function to get division colors for PDF (RGB values)
const getDivisionPDFColors = (division: Division): { bg: [number, number, number]; text: [number, number, number] } => {
  switch (division) {
    case 'Division 1':
      return { bg: [219, 234, 254], text: [30, 64, 175] }; // Blue-100 bg, Blue-800 text
    case 'Division 2':
      return { bg: [252, 231, 243], text: [157, 23, 77] }; // Pink-100 bg, Pink-800 text
    case 'Division 3':
      return { bg: [255, 237, 213], text: [154, 52, 18] }; // Orange-100 bg, Orange-800 text
    case 'Division 4':
      return { bg: [254, 249, 195], text: [133, 77, 14] }; // Yellow-100 bg, Yellow-800 text
    case 'New':
      return { bg: [243, 232, 255], text: [107, 33, 168] }; // Purple-100 bg, Purple-800 text
    default:
      return { bg: [241, 245, 249], text: [30, 41, 59] }; // Slate-100 bg, Slate-800 text
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
  const [points, setPoints] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
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
        const [roundsResponse, driversResponse, teamsResponse] = await Promise.all([
          fetch(`/api/rounds?seasonId=${selectedSeason.id}`),
          fetch(`/api/drivers?seasonId=${selectedSeason.id}`),
          fetch(`/api/teams?seasonId=${selectedSeason.id}`),
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

        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          setTeams(teamsData || []);
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
        setPoints([]);
        return;
      }

      try {
        const [resultsResponse, pointsResponse] = await Promise.all([
          fetch(`/api/race-results?roundId=${selectedRoundId}`),
          fetch(`/api/points?roundId=${selectedRoundId}`),
        ]);

        if (resultsResponse.ok) {
          const data = await resultsResponse.json();
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

        if (pointsResponse.ok) {
          const pointsData = await pointsResponse.json();
          setPoints(pointsData || []);
        }
      } catch (error) {
        console.error('Failed to fetch race results:', error);
        setRaceResults([]);
        setPoints([]);
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
    if (!selectedRound) {
      alert('Please select a round to generate a report.');
      return;
    }

    console.log('Generating PDF with:', {
      round: selectedRound,
      raceResultsCount: raceResults.length,
      driversCount: drivers.length,
      pointsCount: points.length,
      participantsCount: participants.length,
    });

    setExporting(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Helper function to load logo with dimensions
      const loadLogo = async (): Promise<{ dataUrl: string; width: number; height: number } | null> => {
        try {
          const logoUrl = '/vhkc-logo.png';
          const logoResponse = await fetch(logoUrl);
          if (logoResponse.ok) {
            const logoBlob = await logoResponse.blob();
            return new Promise<{ dataUrl: string; width: number; height: number }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const dataUrl = reader.result as string;
                // Create an image to get actual dimensions
                const img = new Image();
                img.onload = () => {
                  resolve({
                    dataUrl,
                    width: img.width,
                    height: img.height,
                  });
                };
                img.onerror = reject;
                img.src = dataUrl;
              };
              reader.onerror = reject;
              reader.readAsDataURL(logoBlob);
            });
          }
        } catch (error) {
          console.warn('Could not load logo:', error);
        }
        return null;
      };

      const logoInfo = await loadLogo();
      const logoDataUrl = logoInfo?.dataUrl || null;

      // ============================================
      // COVER PAGE
      // ============================================
      
      // Background gradient effect (dark to lighter)
      doc.setFillColor(15, 23, 42); // Dark slate
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Calculate dimensions for logo and text elements
      let logoWidth = 0;
      let logoHeight = 0;
      
      if (logoInfo) {
        try {
          const maxWidth = 120;
          const maxHeight = 120;
          const aspectRatio = logoInfo.width / logoInfo.height;
          
          logoWidth = maxWidth;
          logoHeight = maxWidth / aspectRatio;
          
          // If height exceeds max, scale by height instead
          if (logoHeight > maxHeight) {
            logoHeight = maxHeight;
            logoWidth = maxHeight * aspectRatio;
          }
        } catch (e) {
          console.warn('Error calculating logo dimensions:', e);
        }
      }
      
      // Calculate total height of all content elements
      const logoSpace = logoInfo ? logoHeight : 0;
      const spacingAfterLogo = logoInfo ? 20 : 0;
      const mainTitleHeight = 32; // Font size for main title
      const subtitleSpacing = 20; // Space between main title and subtitle
      const subtitleHeight = 18; // Font size for subtitle
      const infoSpacing = 25; // Space between subtitle and info paragraph
      const infoParagraphHeight = 20; // Font size for info paragraph
      
      const totalContentHeight = logoSpace + spacingAfterLogo + mainTitleHeight + subtitleSpacing + 
                                 subtitleHeight + infoSpacing + infoParagraphHeight;
      
      // Calculate starting Y position to center all content vertically
      const startY = (pageHeight / 2) - (totalContentHeight / 2);
      let currentY = startY;
      
      // Add logo centered on page (maintain aspect ratio)
      if (logoInfo) {
        try {
          const logoY = currentY;
          doc.addImage(logoInfo.dataUrl, 'PNG', pageWidth / 2 - logoWidth / 2, logoY, logoWidth, logoHeight);
          currentY += logoHeight + spacingAfterLogo;
        } catch (e) {
          console.warn('Error adding logo to cover:', e);
        }
      }
      
      // Main title - Using 62 DRagz font (helvetica bold as fallback)
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      // Note: If 62 DRagz font file is available, load it here using doc.addFont()
      // For now using helvetica bold as fallback
      doc.setFont('helvetica', 'bold');
      const mainTitle = `VHKC RACE RESULTS`;
      doc.text(mainTitle, pageWidth / 2, currentY, { align: 'center' });
      currentY += mainTitleHeight + subtitleSpacing;
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'normal');
      doc.text('OFFICIAL REPORT', pageWidth / 2, currentY, { align: 'center' });
      currentY += subtitleHeight + infoSpacing;
      
      // Build paragraph-style text with reduced spacing
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      
      const seasonText = selectedSeason?.name || 'Season';
      const roundText = `Round ${selectedRound.roundNumber || ''}`;
      const divisionText = selectedDivision !== 'All' ? selectedDivision : '';
      const locationText = selectedRound.address || selectedRound.location || 'TBD';
      
      // Combine into paragraph format with minimal spacing - Order: Season, Round, Division, Location
      const infoParts: string[] = [seasonText, roundText];
      if (divisionText) infoParts.push(divisionText);
      if (locationText && locationText !== 'TBD') infoParts.push(locationText);
      
      const infoParagraph = infoParts.join(' • ');
      doc.text(infoParagraph, pageWidth / 2, currentY, { align: 'center' });
      
      // Add new page for thank you message
      doc.addPage();
      
      // Professional Header
      doc.setFillColor(15, 23, 42); // Dark slate
      doc.rect(0, 0, pageWidth, 50, 'F');
      
      // Add logo to header (maintain aspect ratio and align with text)
      let headerLogoWidth = 0;
      let headerLogoHeight = 0;
      
      if (logoInfo) {
        try {
          const maxWidth = 35;
          const maxHeight = 35;
          const aspectRatio = logoInfo.width / logoInfo.height;
          
          headerLogoWidth = maxWidth;
          headerLogoHeight = maxWidth / aspectRatio;
          
          // If height exceeds max, scale by height instead
          if (headerLogoHeight > maxHeight) {
            headerLogoHeight = maxHeight;
            headerLogoWidth = maxHeight * aspectRatio;
          }
          
          // Center logo vertically with text (header is 50px tall, text is at y=25, so center logo at y=25-height/2)
          const logoY = 25 - (headerLogoHeight / 2);
          doc.addImage(logoInfo.dataUrl, 'PNG', 20, logoY, headerLogoWidth, headerLogoHeight);
        } catch (e) {
          console.warn('Error adding logo to header:', e);
        }
      }
      
      // Header text - Using Futura font (helvetica as fallback)
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold'); // Using helvetica as closest to Futura
      const headerText = `${selectedSeason?.name || 'Season'} - Round ${selectedRound.roundNumber || ''}`;
      const headerTextX = logoInfo ? (20 + headerLogoWidth + 10) : pageWidth / 2;
      const headerAlign = logoInfo ? 'left' : 'center';
      
      doc.text(headerText, headerTextX, 25, { align: headerAlign as any });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const locationHeader = selectedRound.location || selectedRound.address || 'TBD';
      doc.text(locationHeader, headerTextX, 35, { align: headerAlign as any });
      
      // Accent line
      doc.setFillColor(59, 130, 246); // Primary blue
      doc.rect(0, 48, pageWidth, 2, 'F');
      
      let yPos = 70;

      // Thank You Message
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal'); // Using helvetica as closest to Futura
      doc.setTextColor(30, 41, 59);
      
      const thankYouMessage = `G'day racers,

Thank you for racing with VHKC. We appreciate your continued participation and the effort each driver brings to every event. Your involvement is what allows the series to maintain a strong racing community built on clean competition, steady improvement, and mutual respect on and off the track.

Each round provides valuable opportunities for drivers to refine their skills, build consistency, and gain experience in a structured racing environment. We are grateful for the positive attitude and cooperation shown throughout the session, which helped ensure the event ran smoothly from start to finish. Your commitment to adhering to race procedures, safety expectations, and overall track etiquette contributes directly to the success of our program.

Below, you will find the recorded results from the previous round, including timing data, final placements, and additional session details.

Thank you once again for your involvement with VHKC. We look forward to continuing the momentum and sharing many more successful race events with you.`;

      const splitText = doc.splitTextToSize(thankYouMessage, pageWidth - 40);
      doc.text(splitText, 20, yPos, { align: 'left' });
      yPos += splitText.length * 5 + 20;

      // Helper function to add header to a page
      const addPageHeader = () => {
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 50, 'F');
        
        let headerLogoWidth = 0;
        let headerLogoHeight = 0;
        
        if (logoInfo) {
          try {
            const maxWidth = 35;
            const maxHeight = 35;
            const aspectRatio = logoInfo.width / logoInfo.height;
            
            headerLogoWidth = maxWidth;
            headerLogoHeight = maxWidth / aspectRatio;
            
            // If height exceeds max, scale by height instead
            if (headerLogoHeight > maxHeight) {
              headerLogoHeight = maxHeight;
              headerLogoWidth = maxHeight * aspectRatio;
            }
            
            // Center logo vertically with text (header is 50px tall, text is at y=25, so center logo at y=25-height/2)
            const logoY = 25 - (headerLogoHeight / 2);
            doc.addImage(logoInfo.dataUrl, 'PNG', 20, logoY, headerLogoWidth, headerLogoHeight);
          } catch (e) {
            // Logo load failed, continue without it
          }
        }
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const headerText = `${selectedSeason?.name || 'Season'} - Round ${selectedRound.roundNumber || ''}`;
        const headerTextX = logoInfo ? (20 + headerLogoWidth + 10) : pageWidth / 2;
        const headerAlign = logoInfo ? 'left' : 'center';
        
        doc.text(headerText, headerTextX, 25, { align: headerAlign as any });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const locationHeader = selectedRound.location || selectedRound.address || 'TBD';
        doc.text(locationHeader, headerTextX, 35, { align: headerAlign as any });
        
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 48, pageWidth, 2, 'F');
      };


      // Modern professional table helper function - Each table on new page
      const addTable = async (title: string, data: any[], columns: string[], getRowData: (item: any) => any[], useRank: boolean = true, divisionColumnIndex?: number, groupColumnIndex?: number) => {
        if (data.length === 0) return;

        // Always start on a new page for each table
        doc.addPage();
        addPageHeader();
        
        let tableYPos = 60;

        // Modern section title with accent - Using Super Brigade font
        doc.setFillColor(59, 130, 246); // Primary blue accent bar
        doc.rect(20, tableYPos - 2, 4, 10, 'F');
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(title.toUpperCase(), 28, tableYPos + 4);
        
        // Subtle divider line
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(28, tableYPos + 6, pageWidth - 20, tableYPos + 6);
        
        tableYPos += 8;

        // Prepare table data
        const tableData = data.map((item, index) => {
          if (useRank) {
            return [(index + 1).toString(), ...getRowData(item)];
          }
          return getRowData(item);
        });

        const headColumns = useRank ? ['#', ...columns] : columns;

        // Calculate column widths to prevent wrapping
        const availableWidth = pageWidth - 40; // Margins (20 left + 20 right)
        const numColumns = headColumns.length;
        
        // Build column styles with appropriate widths
        const columnStyles: any = {};
        if (useRank) {
          columnStyles[0] = { cellWidth: 15, halign: 'center', fontStyle: 'bold', textColor: [59, 130, 246], font: 'helvetica' };
        }
        
        // Distribute remaining width among other columns
        const remainingColumns = numColumns - (useRank ? 1 : 0);
        const columnWidth = remainingColumns > 0 ? (availableWidth - (useRank ? 15 : 0)) / remainingColumns : availableWidth;
        let colIndex = useRank ? 1 : 0;
        for (let i = 0; i < remainingColumns; i++) {
          columnStyles[colIndex] = { 
            cellWidth: columnWidth, 
            font: 'helvetica',
            halign: 'left', // Explicitly set left alignment for all columns
            overflow: 'ellipsize', // Prevent wrapping by using ellipsize
          };
          colIndex++;
        }

        autoTable(doc, {
          head: [headColumns],
          body: tableData,
          startY: tableYPos,
          theme: 'striped',
          headStyles: { 
            fillColor: [15, 23, 42], // Dark slate
            textColor: [255, 255, 255], 
            fontStyle: 'bold',
            fontSize: 7,
            halign: 'left',
            cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
            lineWidth: 0.5,
            lineColor: [255, 255, 255],
            font: 'helvetica' // Using helvetica as closest to Futura
          },
          bodyStyles: {
            fontSize: 6.5,
            textColor: [30, 41, 59],
            cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
            lineWidth: 0.2,
            lineColor: [226, 232, 240],
            fontStyle: 'normal',
            font: 'helvetica' // Using helvetica as closest to Futura
          },
          // Custom styles for badge cells will override these
          alternateRowStyles: {
            fillColor: [249, 250, 251] // Very light gray for alternate rows
          },
          columnStyles: columnStyles,
          margin: { left: 20, right: 20, top: tableYPos },
          tableWidth: availableWidth, // Use fixed width to prevent wrapping
          showHead: 'everyPage',
          styles: {
            overflow: 'ellipsize', // Use ellipsize to prevent wrapping
            cellPadding: 2,
            valign: 'middle',
            minCellHeight: 5,
            fontSize: 6.5,
            font: 'helvetica' // Using helvetica as closest to Futura
          },
          didParseCell: (data: any) => {
            // Ensure all body cells have left alignment unless they're special columns (rank, division, group)
            if (data.section === 'body') {
              const isRankColumn = useRank && data.column.index === 0;
              const isDivisionColumn = divisionColumnIndex !== undefined && data.column.index === divisionColumnIndex;
              const columnName = headColumns[data.column.index] || '';
              const isDivisionColumnByName = typeof columnName === 'string' && columnName.toLowerCase().includes('division');
              const isGroupColumn = groupColumnIndex !== undefined && data.column.index === groupColumnIndex;
              
              // Set left alignment for regular columns (not rank, division, or group columns)
              if (!isRankColumn && !isDivisionColumn && !isDivisionColumnByName && !isGroupColumn) {
                data.cell.styles.halign = 'left';
              }
            }
            
            // Ensure division and group header columns have blue color like other headers
            if (data.section === 'head') {
              const isDivisionColumn = divisionColumnIndex !== undefined && data.column.index === divisionColumnIndex;
              const columnName = headColumns[data.column.index] || '';
              const isDivisionColumnByName = typeof columnName === 'string' && columnName.toLowerCase().includes('division');
              
              if (isDivisionColumn || isDivisionColumnByName ||
                  (groupColumnIndex !== undefined && data.column.index === groupColumnIndex)) {
                // Keep the same header styling as other columns (dark slate background, white text)
                data.cell.styles.fillColor = [15, 23, 42]; // Dark slate (same as other headers)
                data.cell.styles.textColor = [255, 255, 255]; // White text
              }
            }
            
            // Apply division color badging if this is a division column (body cells only)
            // Check if it's the specified division column, or if it's a "Division" column in promotions/demotions tables
            const isDivisionColumn = divisionColumnIndex !== undefined && data.column.index === divisionColumnIndex;
            const columnName = headColumns[data.column.index] || '';
            const isDivisionColumnByName = typeof columnName === 'string' && columnName.toLowerCase().includes('division');
            
            if (data.section === 'body' && (isDivisionColumn || (isDivisionColumnByName && data.table.body.length > 0))) {
              // Get division value from cell text
              const divisionValue = Array.isArray(data.cell.text) ? data.cell.text[0] : data.cell.text;
              if (divisionValue && typeof divisionValue === 'string' && divisionValue.trim()) {
                const division = divisionValue.trim() as Division;
                const colors = getDivisionPDFColors(division);
                // Scale badge with table size
                const baseFontSize = data.cell.styles.fontSize || 6.5;
                const badgePadding = baseFontSize * 0.2;
                data.cell.styles.fillColor = colors.bg;
                data.cell.styles.textColor = colors.text;
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = baseFontSize * 0.95;
                data.cell.styles.cellPadding = { top: badgePadding, bottom: badgePadding, left: badgePadding, right: badgePadding };
                data.cell.styles.halign = 'left';
                data.cell.styles.valign = 'middle';
                data.cell.styles.lineWidth = 0;
                (data.cell as any).isBadge = true;
                (data.cell as any).badgeColors = colors;
                (data.cell as any).badgeText = divisionValue.trim();
              }
            }
            
            // Apply group color badging if this is a group column (body cells only)
            if (data.section === 'body' && groupColumnIndex !== undefined && data.column.index === groupColumnIndex) {
              // Get group value from cell text
              const groupValue = Array.isArray(data.cell.text) ? data.cell.text[0] : data.cell.text;
              if (groupValue && typeof groupValue === 'string' && groupValue.trim()) {
                const colors = getGroupPDFColors(groupValue.trim());
                if (colors) {
                  const baseFontSize = data.cell.styles.fontSize || 6.5;
                  const badgePadding = baseFontSize * 0.2;
                  data.cell.styles.fillColor = colors.bg;
                  data.cell.styles.textColor = colors.text;
                  data.cell.styles.fontStyle = 'bold';
                  data.cell.styles.fontSize = baseFontSize * 0.95;
                  data.cell.styles.cellPadding = { top: badgePadding, bottom: badgePadding, left: badgePadding, right: badgePadding };
                  data.cell.styles.halign = 'left';
                  data.cell.styles.valign = 'middle';
                  data.cell.styles.lineWidth = 0;
                  (data.cell as any).isBadge = true;
                  (data.cell as any).badgeColors = colors;
                  (data.cell as any).badgeText = (Array.isArray(data.cell.text) ? data.cell.text[0] : data.cell.text) || '';
                }
              }
            }
          },
          willDrawCell: (data: any) => {
            // Draw pill-shaped badges (division and group columns) - draw before text
            if (data.section === 'body' && (data.cell as any).isBadge) {
              const cellValue = Array.isArray(data.cell.text) ? data.cell.text[0] : data.cell.text;
              if (cellValue && typeof cellValue === 'string' && cellValue.trim()) {
                // Get cell dimensions
                const cellX = data.cell.x;
                const cellY = data.cell.y;
                const cellW = data.cell.width;
                const cellH = data.cell.height;
                
                // Get padding from cell styles
                const padding = data.cell.styles.cellPadding || { top: 2, bottom: 2, left: 2, right: 2 };
                const paddingTop = typeof padding === 'object' ? padding.top : padding;
                const paddingBottom = typeof padding === 'object' ? padding.bottom : padding;
                const paddingLeft = typeof padding === 'object' ? padding.left : padding;
                const paddingRight = typeof padding === 'object' ? padding.right : padding;
                const text = (data.cell as any).badgeText || cellValue;
                doc.setFontSize(data.cell.styles.fontSize || 6.5);
                const textWidth = doc.getTextWidth(text);
                const textPaddingX = (data.cell.styles.fontSize || 6.5) * 0.7;
                const textPaddingY = (data.cell.styles.fontSize || 6.5) * 0.35;
                const badgeW = Math.min(textWidth + textPaddingX * 2, cellW - (paddingLeft + paddingRight) - 0.5);
                const badgeH = Math.min((data.cell.styles.fontSize || 6.5) + textPaddingY * 2, cellH - (paddingTop + paddingBottom) - 0.5);
                const badgeX = cellX + paddingLeft;
                const badgeY = cellY + (cellH - badgeH) / 2;
                
                // For true pill shape (rounded-full), radius must be exactly half the height
                // This creates the fully rounded pill shape with curved ends
                const radius = badgeH / 2;
                
                // Only draw if dimensions are valid and radius is reasonable
                if (badgeH > 0 && badgeW > 0 && radius > 0 && radius <= badgeW / 2) {
                  // Get fill color from stored badge colors
                  const badgeColors = (data.cell as any).badgeColors;
                  const fillColor = badgeColors?.bg || data.cell.styles.fillColor || [255, 255, 255];
                  doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
                  
                  // Draw pill-shaped badge using roundedRect
                  // Radius = half height creates the pill shape (rounded-full)
                  (doc as any).roundedRect(badgeX, badgeY, badgeW, badgeH, radius, radius, 'F');
                }
              }
            }
          },
          didDrawCell: (data: any) => {},
        });
      };

      // Helper to get driver info
      const getDriverInfo = (driverId: string) => {
        const driver = drivers.find(d => d.id === driverId);
        if (!driver) return null;
        
        // Ensure aliases is an array
        let aliasesArray: string[] = [];
        if (driver.aliases) {
          if (Array.isArray(driver.aliases)) {
            aliasesArray = driver.aliases;
          } else if (typeof driver.aliases === 'string') {
            aliasesArray = driver.aliases.split(',').map((a: string) => a.trim()).filter((a: string) => a);
          }
        }
        
        return {
          ...driver,
          aliases: aliasesArray,
        };
      };

      // Helper to get driver alias (first alias or empty)
      const getDriverAlias = (driverId: string) => {
        const driver = getDriverInfo(driverId);
        if (driver?.aliases && Array.isArray(driver.aliases) && driver.aliases.length > 0) {
          return driver.aliases[0];
        }
        return '';
      };

      // Main Driver Table (Driver Name, Alias, Home Track, Division)
      const mainDriverData = participants.map(p => {
        const driver = getDriverInfo(p.driverId);
        return {
          driverId: p.driverId,
          driverName: p.driverName || '',
          alias: getDriverAlias(p.driverId),
          homeTrack: driver?.homeTrack || '',
          division: p.division || '',
        };
      }).sort((a: any, b: any) => a.driverName.localeCompare(b.driverName));

      if (mainDriverData.length > 0) {
        await addTable(
          'Main Driver Table',
          mainDriverData,
          ['Driver Name', 'Alias', 'Home Track', 'Division'],
          (item) => [
            item.driverName,
            item.alias,
            item.homeTrack,
            item.division,
          ],
          true, // useRank
          4 // Division column index (after #, Driver Name, Alias, Home Track)
        );
      }

      // Helper function to get group color for PDF (for Qual Group 1, Heat A, etc.)
      const getGroupPDFColors = (groupName: string): { bg: [number, number, number]; text: [number, number, number] } | null => {
        if (!groupName) return null;
        const groupLower = groupName.toLowerCase();
        
        // Extract number or letter from group name (e.g., "Qual Group 1" -> "1", "Heat A" -> "A")
        const match = groupLower.match(/(\d+|[a-z])/);
        if (!match) return null;
        
        const identifier = match[1];
        
        // Color scheme for groups - using a rotating color palette
        const groupColors: { bg: [number, number, number]; text: [number, number, number] }[] = [
          { bg: [219, 234, 254], text: [30, 64, 175] }, // Blue
          { bg: [252, 231, 243], text: [157, 23, 77] }, // Pink
          { bg: [255, 237, 213], text: [154, 52, 18] }, // Orange
          { bg: [254, 249, 195], text: [133, 77, 14] }, // Yellow
          { bg: [243, 232, 255], text: [107, 33, 168] }, // Purple
          { bg: [220, 252, 231], text: [20, 83, 45] }, // Green
          { bg: [254, 226, 226], text: [153, 27, 27] }, // Red
        ];
        
        // If it's a number, use modulo
        if (!isNaN(Number(identifier))) {
          const num = parseInt(identifier, 10);
          const index = (num - 1) % groupColors.length;
          return groupColors[index >= 0 ? index : 0];
        }
        
        // If it's a letter, use char code
        const letterIndex = identifier.charCodeAt(0) - 97; // 'a' = 0, 'b' = 1, etc.
        const index = letterIndex >= 0 ? (letterIndex % groupColors.length) : 0;
        return groupColors[index];
      };

      // Times Tables - Separate into Qualifying, Heat, and Final times
      const hasHeat = Object.keys(organizedResults.heats).length > 0;
      
      // 1. Qualifying Times Table
      if (organizedResults.qualifying.length > 0) {
        const qualTimesData = organizedResults.qualifying.map(q => ({
          driverId: q.driverId,
          driverName: q.driverName || '',
          alias: getDriverAlias(q.driverId),
          division: q.division || '',
          qualRank: q.position || 0,
          qualTime: q.fastestLap || '',
          qualKartNumber: q.kartNumber || '',
          group: q.raceName || q.finalType || '',
        })).sort((a, b) => {
          const rankA = typeof a.qualRank === 'number' ? a.qualRank : (typeof a.qualRank === 'string' ? parseInt(a.qualRank, 10) : 999);
          const rankB = typeof b.qualRank === 'number' ? b.qualRank : (typeof b.qualRank === 'string' ? parseInt(b.qualRank, 10) : 999);
          return (isNaN(rankA) ? 999 : rankA) - (isNaN(rankB) ? 999 : rankB);
        });

        await addTable(
          'Qualifying Times',
          qualTimesData,
          ['Driver Name', 'Alias', 'Division', 'Rank', 'Time', 'Kart Number', 'Group'],
          (item) => [
            item.driverName,
            item.alias || '',
            item.division,
            item.qualRank?.toString() || '',
            item.qualTime || '-',
            item.qualKartNumber || '',
            item.group || '',
          ],
          true, // useRank
          3, // Division column index (after #, Driver Name, Alias)
          7 // Group column index (after #, Driver Name, Alias, Division, Rank, Time, Kart Number)
        );
      }

      // 2. Qualifying Results (Driver Name, Alias, Kart Number, Division, Best Time, Group, Rank)
      if (organizedResults.qualifying.length > 0) {
        const qualData = organizedResults.qualifying.map(q => {
          const driver = getDriverInfo(q.driverId);
          return {
            ...q,
            alias: getDriverAlias(q.driverId),
            group: q.raceName || q.finalType || '',
          };
        }).sort((a, b) => (a.position || 999) - (b.position || 999));

        await addTable(
          'Qualifying Results',
          qualData,
          ['Driver Name', 'Alias', 'Kart Number', 'Division', 'Best Time', 'Group', 'Rank'],
          (item) => [
            item.driverName || '',
            item.alias || '',
            item.kartNumber || '',
            item.division || '',
            item.fastestLap || '-',
            item.group || '',
            item.position?.toString() || '',
          ],
          true, // useRank
          4, // Division column index (after #, Driver Name, Alias, Kart Number)
          6 // Group column index (after #, Driver Name, Alias, Kart Number, Division, Best Time)
        );
      }

      // 3. Heat Times Table (if exists)
      if (hasHeat) {
        const heatTimesData: any[] = [];
        Object.keys(organizedResults.heats).forEach(heatKey => {
          organizedResults.heats[heatKey].forEach(h => {
            heatTimesData.push({
              driverId: h.driverId,
              driverName: h.driverName || '',
              alias: getDriverAlias(h.driverId),
              division: h.division || '',
              heatRank: h.position || '',
              heatTime: h.fastestLap || '',
              heatKartNumber: h.kartNumber || '',
              group: heatKey,
            });
          });
        });
        
        heatTimesData.sort((a, b) => {
          if (a.group !== b.group) {
            return a.group.localeCompare(b.group);
          }
          return (a.heatRank || 999) - (b.heatRank || 999);
        });

        await addTable(
          'Heat Times',
          heatTimesData,
          ['Driver Name', 'Alias', 'Division', 'Rank', 'Time', 'Kart Number', 'Group'],
          (item) => [
            item.driverName || '',
            item.alias || '',
            item.division || '',
            item.heatRank?.toString() || '',
            item.heatTime || '-',
            item.heatKartNumber || '',
            item.group || '',
          ],
          true, // useRank
          3, // Division column index (after #, Driver Name, Alias)
          7 // Group column index (after #, Driver Name, Alias, Division, Rank, Time, Kart Number)
        );
      }

      // 4. Heat Results (if exists)
      if (hasHeat) {
        for (const heatKey of Object.keys(organizedResults.heats)) {
          const heatResults = organizedResults.heats[heatKey];
          if (heatResults.length > 0) {
            const heatData = heatResults.map(h => {
              const driver = getDriverInfo(h.driverId);
              const driverPoint = points.find(p => p.driverId === h.driverId && p.raceType === 'heat' && (p.finalType === heatKey || !p.finalType));
              return {
                ...h,
                alias: getDriverAlias(h.driverId),
                points: driverPoint?.points || 0,
                group: heatKey,
              };
            }).sort((a, b) => (a.position || 999) - (b.position || 999));

            await addTable(
              `Heat Results - ${heatKey}`,
              heatData,
              ['Driver Name', 'Alias', 'Kart Number', 'Best Time', 'Division', 'Position', 'Points'],
              (item) => [
                item.driverName || '',
                item.alias || '',
                item.kartNumber || '',
                item.fastestLap || '-',
                item.division || '',
                item.position?.toString() || '',
                item.points?.toString() || '0',
              ],
              true, // useRank
              5 // Division column index (after #, Driver Name, Alias, Kart Number, Best Time)
            );
          }
        }
      }

      // 5. Final Times Table
      const finalTimesData: any[] = [];
      Object.keys(organizedResults.finals).forEach(finalKey => {
        organizedResults.finals[finalKey].forEach(f => {
          finalTimesData.push({
            driverId: f.driverId,
            driverName: f.driverName || '',
            alias: getDriverAlias(f.driverId),
            division: f.division || '',
            finalRank: f.position || '',
            finalTime: f.fastestLap || '',
            finalKartNumber: f.kartNumber || '',
            group: finalKey,
          });
        });
      });
      
      finalTimesData.sort((a, b) => {
        if (a.group !== b.group) {
          return a.group.localeCompare(b.group);
        }
        return (a.finalRank || 999) - (b.finalRank || 999);
      });

      if (finalTimesData.length > 0) {
        await addTable(
          'Final Times',
          finalTimesData,
          ['Driver Name', 'Alias', 'Division', 'Rank', 'Time', 'Kart Number', 'Group'],
          (item) => [
            item.driverName || '',
            item.alias || '',
            item.division || '',
            item.finalRank?.toString() || '',
            item.finalTime || '-',
            item.finalKartNumber || '',
            item.group || '',
          ],
          true, // useRank
          3, // Division column index (after #, Driver Name, Alias)
          7 // Group column index (after #, Driver Name, Alias, Division, Rank, Time, Kart Number)
        );
      }

      // Final Results (Driver Name, Alias, Kart Number, Best Time, Division, Division Placing, Points, Grid Position, Overall Position, movement)
      const finalData: any[] = [];
      for (const finalKey of Object.keys(organizedResults.finals)) {
        const finalResults = organizedResults.finals[finalKey];
        finalResults.forEach(result => {
          const driver = getDriverInfo(result.driverId);
          const driverPoint = points.find(p => p.driverId === result.driverId && p.raceType === 'final' && (p.finalType === finalKey || !p.finalType));
          finalData.push({
            ...result,
            alias: getDriverAlias(result.driverId),
            divisionPlacing: result.position || '',
            points: driverPoint?.points || 0,
            gridPosition: result.gridPosition || '',
            overallPosition: result.overallPosition || result.position || '',
            movement: '', // Movement would need to be calculated from previous round
            finalType: finalKey,
          });
        });
      }

      if (finalData.length > 0) {
        finalData.sort((a, b) => {
          // Sort by final type first, then by position
          if (a.finalType !== b.finalType) {
            return a.finalType.localeCompare(b.finalType);
          }
          return (a.position || 999) - (b.position || 999);
        });

        await addTable(
          'Final Results',
          finalData,
          ['Driver Name', 'Alias', 'Kart Number', 'Best Time', 'Division', 'Division Placing'],
          (item) => [
            item.driverName || '',
            item.alias || '',
            item.kartNumber || '',
            item.fastestLap || '-',
            item.division || '',
            item.divisionPlacing?.toString() || '',
          ],
          true, // useRank
          5 // Division column index (after #, Driver Name, Alias, Kart Number, Best Time)
        );
      }

      // Heat Points (if exists) - Add before Final Points
      if (hasHeat) {
        const heatPointsData = points
          .filter(p => p.raceType === 'heat')
          .map(p => {
            const driver = getDriverInfo(p.driverId);
            return {
              driverId: p.driverId,
              driverName: driver?.name || '',
              alias: getDriverAlias(p.driverId),
              division: p.division || '',
              points: p.points || 0,
            };
          })
          .sort((a, b) => b.points - a.points);

        if (heatPointsData.length > 0) {
          await addTable(
            'Heat Points',
            heatPointsData,
            ['Driver Name', 'Alias', 'Division', 'Race Points'],
            (item) => [
              item.driverName,
              item.alias || '',
              item.division,
              item.points.toString(),
            ],
            true, // useRank
            3 // Division column index (after #, Driver Name, Alias)
          );
        }
      }

      // Final Points (Driver Name, Alias, Division, Race Points)
      const finalPointsData = points
        .filter(p => p.raceType === 'final')
        .map(p => {
          const driver = getDriverInfo(p.driverId);
          return {
            driverId: p.driverId,
            driverName: driver?.name || '',
            alias: getDriverAlias(p.driverId),
            division: p.division || '',
            points: p.points || 0,
          };
        })
        .sort((a, b) => b.points - a.points);

      if (finalPointsData.length > 0) {
        await addTable(
          'Final Points',
          finalPointsData,
          ['Driver Name', 'Alias', 'Division', 'Race Points'],
          (item) => [
            item.driverName,
            item.alias || '',
            item.division,
            item.points.toString(),
          ],
          true, // useRank
          3 // Division column index (after #, Driver Name, Alias)
        );
      }

      // Driver Standings - Fetch season-wide standings
      let seasonPoints: any[] = [];
      try {
        if (selectedSeason?.id) {
          const seasonPointsResponse = await fetch(`/api/points?seasonId=${selectedSeason.id}`);
          if (seasonPointsResponse.ok) {
            seasonPoints = await seasonPointsResponse.json();
          }
        }
      } catch (error) {
        console.warn('Failed to fetch season points for standings:', error);
      }

      const driverStandingsMap = new Map<string, { driverId: string; driverName: string; alias: string; division: Division; totalPoints: number }>();
      
      seasonPoints.forEach(p => {
        const existing = driverStandingsMap.get(p.driverId);
        if (existing) {
          existing.totalPoints += p.points || 0;
        } else {
          const driver = getDriverInfo(p.driverId);
          driverStandingsMap.set(p.driverId, {
            driverId: p.driverId,
            driverName: driver?.name || '',
            alias: getDriverAlias(p.driverId),
            division: p.division,
            totalPoints: p.points || 0,
          });
        }
      });

      const driverStandings = Array.from(driverStandingsMap.values())
        .sort((a, b) => b.totalPoints - a.totalPoints);

      if (driverStandings.length > 0) {
        await addTable(
          'Driver Standings',
          driverStandings,
          ['Driver Name', 'Alias', 'Division', 'Total Points'],
          (item) => [
            item.driverName,
            item.alias || '',
            item.division,
            item.totalPoints.toString(),
          ],
          true, // useRank
          3 // Division column index (after #, Driver Name, Alias)
        );
      }

      // Promotions and Demotions Section
      if (selectedRoundId && selectedSeason?.id) {
        try {
          const changesResponse = await fetch(`/api/division-changes?roundId=${selectedRoundId}`);
          if (changesResponse.ok) {
            const changes = await changesResponse.json();
            
            // Filter by selected division - only show drivers that were initially in the selected division
            // Only show promotions and demotions in reports, not division_start or mid_season_join
            let filteredChanges = changes.filter((c: any) => 
              c.changeType === 'promotion' || c.changeType === 'demotion'
            );
            if (selectedDivision !== 'All') {
              filteredChanges = filteredChanges.filter((c: any) => c.fromDivision === selectedDivision);
            }
            
            const promotions = filteredChanges.filter((c: any) => c.changeType === 'promotion');
            const demotions = filteredChanges.filter((c: any) => c.changeType === 'demotion');
            
            if (promotions.length > 0) {
              await addTable(
                'Promotions',
                promotions,
                ['Driver Name', 'From Division', 'To Division'],
                (item: any) => [
                  item.driverName,
                  item.fromDivision,
                  item.toDivision,
                ],
                true, // useRank
                2 // From Division column index (0: #, 1: Driver Name, 2: From Division)
                // To Division will be detected automatically by column name
              );
            }
            
            if (demotions.length > 0) {
              await addTable(
                'Demotions',
                demotions,
                ['Driver Name', 'From Division', 'To Division'],
                (item: any) => [
                  item.driverName,
                  item.fromDivision,
                  item.toDivision,
                ],
                true, // useRank
                2 // From Division column index (0: #, 1: Driver Name, 2: From Division)
                // To Division will be detected automatically by column name
              );
            }
          }
        } catch (error) {
          console.warn('Failed to fetch division changes:', error);
        }
      }

      // Team Standings - Aggregate points by team
      const teamStandingsMap = new Map<string, { teamName: string; totalPoints: number; driverCount: number }>();
      
      driverStandings.forEach(driver => {
        const driverInfo = getDriverInfo(driver.driverId);
        const teamName = driverInfo?.teamName || '';
        if (teamName) {
          const existing = teamStandingsMap.get(teamName);
          if (existing) {
            existing.totalPoints += driver.totalPoints;
            existing.driverCount += 1;
          } else {
            teamStandingsMap.set(teamName, {
              teamName,
              totalPoints: driver.totalPoints,
              driverCount: 1,
            });
          }
        }
      });

      const teamStandings = Array.from(teamStandingsMap.values())
        .sort((a, b) => b.totalPoints - a.totalPoints);

      if (teamStandings.length > 0) {
        await addTable(
          'Team Standings',
          teamStandings,
          ['Team Name', 'Total Points', 'Drivers'],
          (item) => [
            item.teamName,
            item.totalPoints.toString(),
            item.driverCount.toString(),
          ],
          false // No rank column for team standings
        );
      }

      // Modern professional footer
      const totalPages = (doc as any).internal.getNumberOfPages();
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
        doc.setFont('helvetica', 'normal'); // Using helvetica as closest to Futura
        const footerText = `VHKC Race Results Report | Page ${i} of ${totalPages}`;
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
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
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
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
            disabled={!selectedRoundId || exporting}
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
