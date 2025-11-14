import { Season, Round, Driver, DriverRaceResult, Race, Division } from '@/types';
import { readSheet, appendRow, updateRowById, deleteRowById } from './googleSheets';

// Location interface
export interface Location {
  id: string;
  name: string;
  address: string;
}

// Round with seasonId helper type
interface RoundWithSeasonId extends Round {
  seasonId: string;
}

// Convert sheet rows to objects
function rowsToObjects<T>(rows: any[][]): T[] {
  if (rows.length < 2) return [];
  
  const headerRow = rows[0];
  return rows.slice(1).map(row => {
    const obj: any = {};
    headerRow.forEach((header, index) => {
      if (header) {
        obj[header] = row[index] || '';
      }
    });
    return obj as T;
  });
}

// Season operations
export async function getSeasons(): Promise<Season[]> {
  try {
    const rows = await readSheet('Seasons');
    
    // If no data or headers missing, return empty array
    if (!rows || rows.length < 2) {
      return [];
    }
    
    const seasons = rowsToObjects<any>(rows);
    
    // Load rounds for each season (handle errors gracefully)
    let allRounds: RoundWithSeasonId[] = [];
    try {
      allRounds = await getRounds();
    } catch (error) {
      console.warn('Error loading rounds, continuing with empty rounds:', error);
    }
    
    return seasons.map((season: any) => ({
      id: season.id || '',
      name: season.name || '',
      startDate: season.startDate || '',
      endDate: season.endDate || '',
      numberOfRounds: parseInt(season.numberOfRounds?.toString() || '0'),
      rounds: allRounds
        .filter(r => r.seasonId === season.id)
        .map(({ seasonId, ...round }) => round)
        .sort((a, b) => a.roundNumber - b.roundNumber),
    }));
  } catch (error) {
    console.error('Error getting seasons:', error);
    // Return empty array instead of throwing to allow app to start
    return [];
  }
}

export async function getSeasonById(seasonId: string): Promise<Season | null> {
  const seasons = await getSeasons();
  return seasons.find(s => s.id === seasonId) || null;
}

export async function addSeason(season: Season): Promise<void> {
  await appendRow('Seasons', [
    season.id,
    season.name,
    season.startDate,
    season.endDate,
    season.numberOfRounds.toString(),
  ]);
  
  // Add rounds if any
  for (const round of season.rounds) {
    await addRound(round, season.id);
  }
}

export async function updateSeason(season: Season): Promise<void> {
  const rows = await readSheet('Seasons');
  const headers = rows[0];
  const seasonIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'id');
  
  // Find which columns to update
  const idIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'id');
  const nameIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'name');
  const startDateIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'startdate');
  const endDateIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'enddate');
  const numberOfRoundsIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'numberofrounds');
  
  const seasonRow = new Array(headers.length).fill('');
  seasonRow[idIndex] = season.id;
  if (nameIndex >= 0) seasonRow[nameIndex] = season.name;
  if (startDateIndex >= 0) seasonRow[startDateIndex] = season.startDate;
  if (endDateIndex >= 0) seasonRow[endDateIndex] = season.endDate;
  if (numberOfRoundsIndex >= 0) seasonRow[numberOfRoundsIndex] = season.numberOfRounds.toString();
  
  await updateRowById('Seasons', season.id, seasonRow);
  
  // Update rounds separately
  const existingRounds = await getRounds();
  const existingRoundIds = existingRounds
    .filter(r => r.seasonId === season.id)
    .map(r => r.id);
  const newRoundIds = season.rounds.map(r => r.id);
  
  // Delete removed rounds
  for (const roundId of existingRoundIds) {
    if (!newRoundIds.includes(roundId)) {
      await deleteRound(roundId);
    }
  }
  
  // Add or update rounds
  for (const round of season.rounds) {
    if (existingRoundIds.includes(round.id)) {
      await updateRound(round, season.id);
    } else {
      await addRound(round, season.id);
    }
  }
}

export async function deleteSeason(seasonId: string): Promise<void> {
  await deleteRowById('Seasons', seasonId);
  
  // Delete associated rounds
  const rounds = await getRounds();
  const seasonRounds = rounds.filter(r => r.seasonId === seasonId);
  for (const round of seasonRounds) {
    await deleteRound(round.id);
  }
  
  // Optionally delete associated race results
  await deleteRaceResultsBySeason(seasonId);
}

// Round operations
async function getRounds(): Promise<RoundWithSeasonId[]> {
  try {
    const rows = await readSheet('Rounds');
    const rounds = rowsToObjects<any>(rows);
    
    return rounds.map((round: any) => ({
      id: round.id || '',
      seasonId: round.seasonId || '',
      roundNumber: parseInt(round.roundNumber?.toString() || '0'),
      name: round.name || '',
      date: round.date || '',
      location: round.location || '',
      address: round.address || '',
      status: (round.status || 'upcoming') as 'upcoming' | 'completed' | 'cancelled',
    }));
  } catch (error) {
    console.error('Error getting rounds:', error);
    return [];
  }
}

export async function getRoundsBySeason(seasonId: string): Promise<Round[]> {
  const rounds = await getRounds();
  return rounds
    .filter(r => r.seasonId === seasonId)
    .map(({ seasonId, ...round }) => round)
    .sort((a, b) => a.roundNumber - b.roundNumber);
}

async function addRound(round: Round, seasonId: string): Promise<void> {
  await appendRow('Rounds', [
    round.id,
    seasonId,
    round.roundNumber.toString(),
    round.name,
    round.date || '',
    round.location || '',
    round.address || '',
    round.status || 'upcoming',
  ]);
}

async function updateRound(round: Round, seasonId: string): Promise<void> {
  const rows = await readSheet('Rounds');
  const headers = rows[0];
  
  const idIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'id');
  const seasonIdIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'seasonid');
  const roundNumberIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'roundnumber');
  const nameIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'name');
  const dateIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'date');
  const locationIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'location');
  const addressIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'address');
  const statusIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'status');
  
  const roundRow = new Array(headers.length).fill('');
  if (idIndex >= 0) roundRow[idIndex] = round.id;
  if (seasonIdIndex >= 0) roundRow[seasonIdIndex] = seasonId;
  if (roundNumberIndex >= 0) roundRow[roundNumberIndex] = round.roundNumber.toString();
  if (nameIndex >= 0) roundRow[nameIndex] = round.name;
  if (dateIndex >= 0) roundRow[dateIndex] = round.date || '';
  if (locationIndex >= 0) roundRow[locationIndex] = round.location || '';
  if (addressIndex >= 0) roundRow[addressIndex] = round.address || '';
  if (statusIndex >= 0) roundRow[statusIndex] = round.status || 'upcoming';
  
  await updateRowById('Rounds', round.id, roundRow);
}

async function deleteRound(roundId: string): Promise<void> {
  await deleteRowById('Rounds', roundId);
  // Delete associated race results
  await deleteRaceResultsByRound(roundId);
}

// Driver operations (season-specific)
export async function getDriversBySeason(seasonId: string): Promise<Driver[]> {
  try {
    const rows = await readSheet('Drivers');
    const drivers = rowsToObjects<any>(rows);
    
    return drivers
      .filter((d: any) => d.seasonId === seasonId)
      .map((driver: any) => ({
        id: driver.id || '',
        name: driver.name || '',
        firstName: driver.firstName || undefined,
        lastName: driver.lastName || undefined,
        dateOfBirth: driver.dateOfBirth || undefined,
        homeTrack: driver.homeTrack || undefined,
        division: (driver.division || 'New') as Division,
        email: driver.email || '',
        teamName: driver.teamName || undefined,
        status: (driver.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE' | 'BANNED',
        lastRacePosition: parseInt(driver.lastRacePosition?.toString() || '0'),
        fastestLap: driver.fastestLap || '',
        pointsTotal: parseInt(driver.pointsTotal?.toString() || '0'),
        lastUpdated: driver.lastUpdated || new Date().toISOString().split('T')[0],
      }));
  } catch (error) {
    console.error('Error getting drivers:', error);
    return [];
  }
}

export async function addDriver(driver: Driver, seasonId: string): Promise<void> {
  await appendRow('Drivers', [
    driver.id,
    seasonId,
    driver.name,
    driver.email,
    driver.division || 'New',
    driver.teamName || '',
    driver.status || 'ACTIVE',
    driver.lastRacePosition?.toString() || '0',
    driver.fastestLap || '',
    driver.pointsTotal?.toString() || '0',
    driver.lastUpdated || new Date().toISOString().split('T')[0],
    driver.firstName || '',
    driver.lastName || '',
    driver.dateOfBirth || '',
    driver.homeTrack || '',
  ]);
}

export async function updateDriver(driver: Driver, seasonId: string): Promise<void> {
  const rows = await readSheet('Drivers');
  if (rows.length < 2) {
    throw new Error('Drivers sheet has no data rows');
  }
  
  const headers = rows[0];
  const idColumnIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'id');
  const seasonIdColumnIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'seasonid');
  
  if (idColumnIndex === -1) {
    throw new Error('ID column not found in Drivers sheet');
  }
  
  // Find the row by both ID and seasonId to ensure we update the correct row
  const rowIndex = rows.findIndex((row, index) => {
    if (index === 0) return false; // Skip header
    const rowId = row[idColumnIndex];
    const rowSeasonId = seasonIdColumnIndex !== -1 ? row[seasonIdColumnIndex] : '';
    return rowId === driver.id && (seasonIdColumnIndex === -1 || rowSeasonId === seasonId);
  });
  
  if (rowIndex === -1) {
    throw new Error(`Driver with ID ${driver.id} and seasonId ${seasonId} not found`);
  }
  
  // Build the updated row
  const driverRow = new Array(headers.length).fill('');
  headers.forEach((header, index) => {
    const headerLower = header?.toLowerCase() || '';
    if (headerLower === 'id') driverRow[index] = driver.id;
    else if (headerLower === 'seasonid') driverRow[index] = seasonId;
    else if (headerLower === 'name') driverRow[index] = driver.name;
    else if (headerLower === 'email') driverRow[index] = driver.email;
    else if (headerLower === 'division') driverRow[index] = driver.division || 'New';
    else if (headerLower === 'teamname') driverRow[index] = driver.teamName || '';
    else if (headerLower === 'status') driverRow[index] = driver.status || 'ACTIVE';
    else if (headerLower === 'lastraceposition') driverRow[index] = driver.lastRacePosition?.toString() || '0';
    else if (headerLower === 'fastestlap') driverRow[index] = driver.fastestLap || '';
    else if (headerLower === 'pointstotal') driverRow[index] = driver.pointsTotal?.toString() || '0';
    else if (headerLower === 'lastupdated') driverRow[index] = driver.lastUpdated || new Date().toISOString().split('T')[0];
    else if (headerLower === 'firstname') driverRow[index] = driver.firstName || '';
    else if (headerLower === 'lastname') driverRow[index] = driver.lastName || '';
    else if (headerLower === 'dateofbirth') driverRow[index] = driver.dateOfBirth || '';
    else if (headerLower === 'hometrack') driverRow[index] = driver.homeTrack || '';
    else {
      // Preserve existing values for columns we don't update
      driverRow[index] = rows[rowIndex][index] || '';
    }
  });
  
  // Update the row directly
  const googleSheets = await import('./googleSheets');
  const sheets = await googleSheets.getSheetsClient();
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: googleSheets.SPREADSHEET_ID,
    range: `Drivers!A${rowIndex + 1}:Z${rowIndex + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: [driverRow] },
  });
}

export async function getDriverPointsBySeason(driverId: string, seasonId: string): Promise<number> {
  const rounds = await getRoundsBySeason(seasonId);
  const raceResults = await getRaceResults();
  
  let total = 0;
  rounds.forEach(round => {
    const results = raceResults.filter(r => r.roundId === round.id && r.driverId === driverId);
    results.forEach(result => {
      total += parseInt(result.points?.toString() || '0');
    });
  });
  
  return total;
}

// Race Results operations
async function getRaceResults(): Promise<(DriverRaceResult & { roundId: string; division: string })[]> {
  try {
    const rows = await readSheet('Race Results');
    const results = rowsToObjects<any>(rows);
    
    return results.map((result: any) => ({
      roundId: result.roundId || '',
      driverId: result.driverId || '',
      driverName: '', // Will be populated when needed from Drivers sheet
      division: result.division || '',
      position: parseInt(result.position?.toString() || '0'),
      fastestLap: result.fastestLap || '',
      points: parseInt(result.points?.toString() || '0'),
    }));
  } catch (error) {
    console.error('Error getting race results:', error);
    return [];
  }
}

export async function getRaceResultsByRound(roundId: string): Promise<Race['results']> {
  const results = await getRaceResults();
  const roundResults = results.filter(r => r.roundId === roundId);
  
  // Get drivers for driver names
  const driversMap = new Map<string, string>();
  try {
    const driversRows = await readSheet('Drivers');
    const drivers = rowsToObjects<any>(driversRows);
    drivers.forEach((driver: any) => {
      driversMap.set(driver.id, driver.name || '');
    });
  } catch (error) {
    console.error('Error getting drivers for race results:', error);
  }
  
  // Group by division
  const divisions = new Set(roundResults.map(r => r.division));
  const grouped: Race['results'] = [];
  
  divisions.forEach(division => {
    const divisionResults = roundResults
      .filter(r => r.division === division)
      .map(r => ({
        driverId: r.driverId,
        driverName: driversMap.get(r.driverId) || '',
        position: r.position,
        fastestLap: r.fastestLap,
        points: r.points,
      }))
      .sort((a, b) => a.position - b.position);
    
    if (divisionResults.length > 0) {
      grouped.push({
        division: division as Division,
        results: divisionResults,
      });
    }
  });
  
  return grouped;
}

export async function addRaceResult(result: DriverRaceResult & { roundId: string; division: string }): Promise<void> {
  await appendRow('Race Results', [
    result.roundId,
    result.driverId,
    result.division,
    result.position.toString(),
    result.fastestLap || '',
    result.points.toString(),
  ]);
}

export async function updateRaceResult(
  roundId: string,
  driverId: string,
  result: DriverRaceResult & { division: string }
): Promise<void> {
  // For race results, we need to find the row by roundId + driverId combination
  const rows = await readSheet('Race Results');
  if (rows.length < 2) return;
  
  const headers = rows[0];
  const roundIdIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'roundid');
  const driverIdIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'driverid');
  
  const rowIndex = rows.findIndex((row, index) => 
    index > 0 && row[roundIdIndex] === roundId && row[driverIdIndex] === driverId
  );
  
  if (rowIndex === -1) {
    // If not found, add new
    await addRaceResult({ ...result, roundId });
    return;
  }
  
  // Update existing row
  const resultRow = new Array(headers.length).fill('');
  headers.forEach((header, index) => {
    const headerLower = header?.toLowerCase() || '';
    if (headerLower === 'roundid') resultRow[index] = roundId;
    else if (headerLower === 'driverid') resultRow[index] = driverId;
    else if (headerLower === 'division') resultRow[index] = result.division;
    else if (headerLower === 'position') resultRow[index] = result.position.toString();
    else if (headerLower === 'fastestlap') resultRow[index] = result.fastestLap || '';
    else if (headerLower === 'points') resultRow[index] = result.points.toString();
    else resultRow[index] = rows[rowIndex][index] || '';
  });
  
  // Use updateRowById pattern but we need to create a unique ID for race results
  // For now, let's delete and re-add
  await deleteRaceResult(roundId, driverId);
  await addRaceResult({ ...result, roundId });
}

async function deleteRaceResult(roundId: string, driverId: string): Promise<void> {
  const rows = await readSheet('Race Results');
  if (rows.length < 2) return;
  
  const headers = rows[0];
  const roundIdIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'roundid');
  const driverIdIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'driverid');
  
  const rowIndex = rows.findIndex((row, index) => 
    index > 0 && row[roundIdIndex] === roundId && row[driverIdIndex] === driverId
  );
  
  if (rowIndex === -1) return;
  
  // Delete the row using the existing deleteRowById pattern but for Race Results
  // Since Race Results doesn't have a simple ID column, we'll use a different approach
  const { getSheetsClient, SPREADSHEET_ID, getSheetId } = await import('./googleSheets');
  
  const sheetId = await getSheetId('Race Results');
  const sheets = await getSheetsClient();
  
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          },
        },
      }],
    },
  });
}

async function deleteRaceResultsByRound(roundId: string): Promise<void> {
  const results = await getRaceResults();
  const roundResults = results.filter(r => r.roundId === roundId);
  
  for (const result of roundResults) {
    await deleteRaceResult(roundId, result.driverId);
  }
}

async function deleteRaceResultsBySeason(seasonId: string): Promise<void> {
  const rounds = await getRoundsBySeason(seasonId);
  for (const round of rounds) {
    await deleteRaceResultsByRound(round.id);
  }
}

// Location operations
export async function getLocations(): Promise<Location[]> {
  try {
    const rows = await readSheet('Locations');
    const locations = rowsToObjects<any>(rows);
    
    return locations.map((loc: any) => ({
      id: loc.id || '',
      name: loc.name || '',
      address: loc.address || '',
    }));
  } catch (error) {
    console.error('Error getting locations:', error);
    return [];
  }
}

export async function getLocationById(locationId: string): Promise<Location | null> {
  const locations = await getLocations();
  return locations.find(l => l.id === locationId) || null;
}

export async function addLocation(location: Location): Promise<void> {
  await appendRow('Locations', [
    location.id,
    location.name,
    location.address,
  ]);
}

export async function updateLocation(location: Location): Promise<void> {
  const rows = await readSheet('Locations');
  const headers = rows[0];
  
  const locationRow = new Array(headers.length).fill('');
  headers.forEach((header, index) => {
    const headerLower = header?.toLowerCase() || '';
    if (headerLower === 'id') locationRow[index] = location.id;
    else if (headerLower === 'name') locationRow[index] = location.name;
    else if (headerLower === 'address') locationRow[index] = location.address;
  });
  
  await updateRowById('Locations', location.id, locationRow);
}

export async function deleteLocation(locationId: string): Promise<void> {
  await deleteRowById('Locations', locationId);
}

// Team operations
export interface Team {
  id: string;
  name: string;
  seasonId: string;
  division?: Division;
  driverIds: string[];
  createdAt: string;
}

export async function getTeamsBySeason(seasonId: string): Promise<Team[]> {
  try {
    const rows = await readSheet('Teams');
    const teams = rowsToObjects<any>(rows);
    
    return teams
      .filter((t: any) => t.seasonId === seasonId)
      .map((team: any) => ({
        id: team.id || '',
        name: team.name || '',
        seasonId: team.seasonId || '',
        division: team.division ? (team.division as Division) : undefined,
        driverIds: team.driverIds ? (typeof team.driverIds === 'string' ? team.driverIds.split(',').filter((id: string) => id.trim()) : team.driverIds) : [],
        createdAt: team.createdAt || new Date().toISOString().split('T')[0],
      }));
  } catch (error) {
    console.error('Error getting teams:', error);
    return [];
  }
}

export async function addTeam(team: Team): Promise<void> {
  const driverIds = team.driverIds && Array.isArray(team.driverIds) ? team.driverIds : [];
  await appendRow('Teams', [
    team.id,
    team.seasonId,
    team.name,
    team.division || '',
    driverIds.join(','),
    team.createdAt,
  ]);
}

export async function updateTeam(team: Team): Promise<void> {
  const rows = await readSheet('Teams');
  if (rows.length < 2) {
    throw new Error('Teams sheet has no data rows');
  }
  
  const headers = rows[0];
  const idColumnIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'id');
  
  if (idColumnIndex === -1) {
    throw new Error('ID column not found in Teams sheet');
  }
  
  // Find the row index
  const rowIndex = rows.findIndex((row, idx) => idx > 0 && row[idColumnIndex] === team.id);
  
  if (rowIndex === -1) {
    throw new Error(`Team with ID ${team.id} not found`);
  }
  
  const driverIds = team.driverIds && Array.isArray(team.driverIds) ? team.driverIds : [];
  const existingRow = rows[rowIndex];
  
  // Build the updated row
  const teamRow = new Array(headers.length).fill('');
  headers.forEach((header, index) => {
    const headerLower = header?.toLowerCase() || '';
    if (headerLower === 'id') teamRow[index] = team.id;
    else if (headerLower === 'seasonid') teamRow[index] = team.seasonId;
    else if (headerLower === 'name') teamRow[index] = team.name;
    else if (headerLower === 'division') teamRow[index] = team.division || '';
    else if (headerLower === 'driverids') teamRow[index] = driverIds.join(',');
    else if (headerLower === 'createdat') teamRow[index] = team.createdAt || existingRow[index] || new Date().toISOString().split('T')[0];
    else {
      // Preserve existing values for columns we don't update
      teamRow[index] = existingRow[index] || '';
    }
  });
  
  // Update the row directly
  const googleSheets = await import('./googleSheets');
  const sheets = await googleSheets.getSheetsClient();
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: googleSheets.SPREADSHEET_ID,
    range: `Teams!A${rowIndex + 1}:Z${rowIndex + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: [teamRow] },
  });
}

export async function deleteTeam(teamId: string): Promise<void> {
  await deleteRowById('Teams', teamId);
}

