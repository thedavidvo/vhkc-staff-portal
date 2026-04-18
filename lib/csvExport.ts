// CSV Export Utilities

/**
 * Helper function to escape CSV values
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Helper function to format mobile number as "XXXX XXX XXX"
 */
function formatMobileNumber(mobileNumber: string | undefined): string {
  if (!mobileNumber) return 'N/A';
  
  const digitsOnly = mobileNumber.replace(/\D/g, '');
  
  if (digitsOnly.length === 0) return 'N/A';
  
  if (digitsOnly.length <= 4) {
    return digitsOnly;
  } else if (digitsOnly.length <= 7) {
    return `${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4)}`;
  } else {
    return `${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4, 7)} ${digitsOnly.slice(7, 10)}`;
  }
}

/**
 * Helper function to parse lap time from decimal seconds to MM:SS.mmm format
 */
export function parseLapTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return 'N/A';
  
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return `${mins}:${secs.padStart(6, '0')}`;
}

/**
 * Export driver list to CSV for venue onboarding
 */
export function exportDriverListToCSV(
  drivers: any[],
  payments: any[],
  checkIns: any[] | Record<string, boolean>,
  round: any,
  filters?: {
    paidOnly?: boolean;
    checkedInOnly?: boolean;
    activeOnly?: boolean;
    division?: string;
    paymentStatus?: 'paid' | 'pending' | 'not_paid' | 'notPaid';
    checkInStatus?: 'checkedIn' | 'notCheckedIn';
  }
): string {
  const checkInRows = Array.isArray(checkIns)
    ? checkIns
    : Object.entries(checkIns || {}).map(([driverId, checkedIn]) => ({
        driverId,
        checkedIn,
        roundId: round.id,
      }));

  // Filter drivers based on options
  let filteredDrivers = [...drivers];
  
  if (filters?.activeOnly) {
    filteredDrivers = filteredDrivers.filter(d => d.status === 'ACTIVE');
  }
  
  if (filters?.paidOnly) {
    const paidDriverIds = payments
      .filter(p => p.status === 'paid' && p.roundId === round.id)
      .map(p => p.driverId);
    filteredDrivers = filteredDrivers.filter(d => paidDriverIds.includes(d.id));
  }

  if (filters?.paymentStatus) {
    const selectedStatus = filters.paymentStatus === 'notPaid' ? 'not_paid' : filters.paymentStatus;
    filteredDrivers = filteredDrivers.filter(d => {
      const payment = payments.find(p => p.driverId === d.id && p.roundId === round.id);
      if (!payment) return selectedStatus === 'pending';
      const normalized = payment.status === 'paid' || payment.status === 'pending' || payment.status === 'not_paid'
        ? payment.status
        : 'pending';
      return normalized === selectedStatus;
    });
  }
  
  if (filters?.checkedInOnly) {
    const checkedInDriverIds = checkInRows
      .filter(c => c.checkedIn && c.roundId === round.id)
      .map(c => c.driverId);
    filteredDrivers = filteredDrivers.filter(d => checkedInDriverIds.includes(d.id));
  }

  if (filters?.checkInStatus === 'checkedIn') {
    const checkedInDriverIds = checkInRows
      .filter(c => c.checkedIn && c.roundId === round.id)
      .map(c => c.driverId);
    filteredDrivers = filteredDrivers.filter(d => checkedInDriverIds.includes(d.id));
  } else if (filters?.checkInStatus === 'notCheckedIn') {
    const checkedInDriverIds = checkInRows
      .filter(c => c.checkedIn && c.roundId === round.id)
      .map(c => c.driverId);
    filteredDrivers = filteredDrivers.filter(d => !checkedInDriverIds.includes(d.id));
  }

  if (filters?.division) {
    filteredDrivers = filteredDrivers.filter(d => d.division === filters.division);
  }
  
  // Build CSV
  const headers = [
    'Name',
    'Email',
    'Phone Number',
    'Aliases',
    'Division',
    'Team Name',
    'Payment Status',
    'Payment Date',
    'Check-in Status'
  ];
  
  const rows = filteredDrivers.map(driver => {
    const payment = payments.find(p => p.driverId === driver.id && p.roundId === round.id);
    const checkIn = checkInRows.find(c => c.driverId === driver.id && c.roundId === round.id);
    
    return [
      escapeCSV(driver.name),
      escapeCSV(driver.email || 'N/A'),
      escapeCSV(formatMobileNumber(driver.mobileNumber)),
      escapeCSV(driver.aliases?.join(', ') || 'N/A'),
      escapeCSV(driver.division),
      escapeCSV(driver.teamName || 'N/A'),
      escapeCSV(payment?.status || 'unpaid'),
      escapeCSV(payment?.paymentDate || 'N/A'),
      escapeCSV(checkIn?.checkedIn ? 'Checked In' : 'Not Checked In')
    ];
  });
  
  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Export lap times to CSV (distinct drivers only)
 */
export function exportLapTimesToCSV(
  results: any[],
  drivers: any[],
  rounds: any[],
  locations: any[],
  seasons: any[]
): string {
  // Build CSV
  const headers = [
    'Driver Name',
    'Division',
    'Location',
    'Best Lap Time',
    'Season Name',
    'Round Number',
    'Round Date'
  ];
  
  const rows = results.map(result => {
    const driver = drivers.find(d => d.id === result.driverId);
    const round = rounds.find(r => r.id === result.roundId);
    const season = seasons.find(s => s.id === result.seasonId || s.id === round?.seasonId);
    const location = locations.find(l => l.name === result.location || l.id === round?.locationId);
    
    return [
      escapeCSV(driver?.name || result.driverName || 'Unknown'),
      escapeCSV(result.division),
      escapeCSV(location?.name || result.location || 'Unknown'),
      escapeCSV(parseLapTime(parseFloat(result.bestLap))),
      escapeCSV(season?.name || 'Unknown'),
      escapeCSV(round?.roundNumber || result.roundNumber || 'N/A'),
      escapeCSV(round?.date || 'N/A')
    ];
  });
  
  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  return csvContent;
}
