import { Season, Round, Driver, DriverRaceResult, Race, Division } from '@/types';
import { readSheet, appendRow, updateRowById, deleteRowById, getSheetsClient, SPREADSHEET_ID } from './googleSheets';

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
      .map((driver: any) => {
        // Parse aliases from string (comma-separated) or array
        let aliases: string[] | undefined = undefined;
        if (driver.aliases) {
          if (typeof driver.aliases === 'string') {
            aliases = driver.aliases.split(',').map((a: string) => a.trim()).filter((a: string) => a);
          } else if (Array.isArray(driver.aliases)) {
            aliases = driver.aliases.filter((a: string) => a && a.trim());
          }
        }
        
        return {
          id: driver.id || '',
          name: driver.name || '',
          aliases: aliases && aliases.length > 0 ? aliases : undefined,
          firstName: driver.firstName || undefined,
          lastName: driver.lastName || undefined,
          dateOfBirth: driver.dateOfBirth || undefined,
          homeTrack: driver.homeTrack || undefined,
          division: (driver.division || 'New') as Division,
          email: driver.email || '',
          teamName: driver.teamName || undefined,
          status: (driver.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE' | 'BANNED',
          lastRacePosition: 0, // Not used, kept for backward compatibility
          fastestLap: '', // Not used, kept for backward compatibility
          pointsTotal: 0, // Not used, kept for backward compatibility
          lastUpdated: driver.lastUpdated || new Date().toISOString().split('T')[0],
        };
      });
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
    '', // lastRacePosition - not used
    '', // fastestLap - not used
    '', // pointsTotal - not used
    driver.lastUpdated || new Date().toISOString().split('T')[0],
    driver.firstName || '',
    driver.lastName || '',
    driver.dateOfBirth || '',
    driver.homeTrack || '',
    driver.aliases ? driver.aliases.join(',') : '',
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
    else if (headerLower === 'lastraceposition') driverRow[index] = ''; // Not used
    else if (headerLower === 'fastestlap') driverRow[index] = ''; // Not used
    else if (headerLower === 'pointstotal') driverRow[index] = ''; // Not used
    else if (headerLower === 'lastupdated') driverRow[index] = driver.lastUpdated || new Date().toISOString().split('T')[0];
    else if (headerLower === 'firstname') driverRow[index] = driver.firstName || '';
    else if (headerLower === 'lastname') driverRow[index] = driver.lastName || '';
    else if (headerLower === 'dateofbirth') driverRow[index] = driver.dateOfBirth || '';
    else if (headerLower === 'hometrack') driverRow[index] = driver.homeTrack || '';
    else if (headerLower === 'aliases') driverRow[index] = driver.aliases ? driver.aliases.join(',') : '';
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
async function getRaceResults(): Promise<(DriverRaceResult & { roundId: string; division: string; raceType?: string; raceName?: string; finalType?: string; confirmed?: boolean })[]> {
  try {
    const rows = await readSheet('Race Results');
    const results = rowsToObjects<any>(rows);
    
    return results.map((result: any) => ({
      roundId: result.roundId || '',
      driverId: result.driverId || '',
      driverAlias: result.driverAlias || '',
      driverName: '', // Will be populated when needed from Drivers sheet
      division: result.division || '',
      kartNumber: result.kartNumber || '',
      gridPosition: parseInt(result.gridPosition?.toString() || result.position?.toString() || '0'),
      position: parseInt(result.position?.toString() || result.gridPosition?.toString() || '0'), // Keep for backward compatibility
      overallPosition: parseInt(result.overallPosition?.toString() || result.gridPosition?.toString() || result.position?.toString() || '0'),
      fastestLap: result.fastestLap || '',
      points: 0, // Points are calculated dynamically, not stored
      raceType: result.raceType || 'qualification',
      raceName: result.raceName || '',
      finalType: result.finalType || '',
      confirmed: result.confirmed === 'true' || result.confirmed === true,
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
        driverAlias: r.driverAlias || '',
        driverName: driversMap.get(r.driverId) || '',
        gridPosition: r.gridPosition || r.position || 0,
        position: r.position || r.gridPosition || 0, // Keep for backward compatibility
        overallPosition: r.overallPosition || r.gridPosition || r.position || 0,
        fastestLap: r.fastestLap,
        points: 0, // Points are calculated dynamically, not stored
        raceType: r.raceType,
        raceName: r.raceName || '',
        finalType: r.finalType || '',
        confirmed: r.confirmed,
      }))
      .sort((a, b) => (a.position || a.gridPosition || 0) - (b.position || b.gridPosition || 0));
    
    if (divisionResults.length > 0) {
      grouped.push({
        division: division as Division,
        results: divisionResults,
      });
    }
  });
  
  return grouped;
}

export async function addRaceResult(result: DriverRaceResult & { roundId: string; division: string; raceType?: string; raceName?: string; finalType?: string; confirmed?: boolean }): Promise<void> {
  // Use header-based mapping to ensure data is saved to correct columns regardless of sheet structure
  const rows = await readSheet('Race Results');
  if (rows.length === 0) {
    // If sheet is empty, we need to create headers first, but this shouldn't happen
    // For now, fallback to hardcoded order
    await appendRow('Race Results', [
      result.roundId,
      result.driverId,
      result.driverAlias || '',
      result.division,
      result.kartNumber || '',
      (result.gridPosition || result.position || 0).toString(),
      (result.overallPosition || result.gridPosition || result.position || 0).toString(),
      result.fastestLap || '',
      result.raceType || 'qualification',
      result.raceName || '',
      result.finalType || '',
      result.confirmed ? 'true' : 'false',
    ]);
    return;
  }
  
  const headers = rows[0];
  const raceType = result.raceType || 'qualification';
  
  // Create a row array that matches the header order
  const newRow = new Array(headers.length).fill('');
  
  headers.forEach((header, index) => {
    const headerLower = header?.toLowerCase() || '';
    if (headerLower === 'roundid') newRow[index] = result.roundId;
    else if (headerLower === 'driverid') newRow[index] = result.driverId;
    else if (headerLower === 'driveralias') newRow[index] = result.driverAlias || '';
    else if (headerLower === 'division') newRow[index] = result.division;
    else if (headerLower === 'kartnumber') newRow[index] = result.kartNumber || '';
    else if (headerLower === 'gridposition' || headerLower === 'position') newRow[index] = (result.gridPosition || result.position || 0).toString();
    else if (headerLower === 'overallposition') newRow[index] = (result.overallPosition || result.gridPosition || result.position || 0).toString();
    else if (headerLower === 'fastestlap') newRow[index] = result.fastestLap || '';
    else if (headerLower === 'racetype') newRow[index] = raceType;
    else if (headerLower === 'racename') newRow[index] = result.raceName || '';
    else if (headerLower === 'finaltype') newRow[index] = result.finalType || '';
    else if (headerLower === 'confirmed') newRow[index] = result.confirmed ? 'true' : 'false';
    // Leave other columns empty
  });
  
  await appendRow('Race Results', newRow);
}

export async function updateRaceResult(
  roundId: string,
  driverId: string,
  result: DriverRaceResult & { division: string; raceType?: string; raceName?: string; finalType?: string; confirmed?: boolean }
): Promise<void> {
  // For race results, we need to find the row by roundId + driverId + raceType combination
  // This is important because a driver can have multiple results for the same round (different race types)
  const rows = await readSheet('Race Results');
  if (rows.length < 2) return;
  
  const headers = rows[0];
  const roundIdIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'roundid');
  const driverIdIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'driverid');
  const raceTypeIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'racetype');
  
  const raceType = result.raceType || 'qualification';
  
  // Find row by roundId, driverId, AND raceType
  const rowIndex = rows.findIndex((row, index) => {
    if (index === 0) return false; // Skip header
    const rowRoundId = row[roundIdIndex];
    const rowDriverId = row[driverIdIndex];
    const rowRaceType = raceTypeIndex >= 0 ? row[raceTypeIndex] : '';
    return rowRoundId === roundId && rowDriverId === driverId && rowRaceType === raceType;
  });
  
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
    else if (headerLower === 'driveralias') resultRow[index] = result.driverAlias || '';
    else if (headerLower === 'division') resultRow[index] = result.division;
    else if (headerLower === 'kartnumber') resultRow[index] = result.kartNumber || '';
    else if (headerLower === 'gridposition' || headerLower === 'position') resultRow[index] = (result.gridPosition || result.position || 0).toString();
    else if (headerLower === 'overallposition') resultRow[index] = (result.overallPosition || result.gridPosition || result.position || 0).toString();
    else if (headerLower === 'fastestlap') resultRow[index] = result.fastestLap || '';
    else if (headerLower === 'racetype') resultRow[index] = raceType;
    else if (headerLower === 'racename') resultRow[index] = result.raceName || '';
    else if (headerLower === 'finaltype') resultRow[index] = result.finalType || '';
    else if (headerLower === 'confirmed') resultRow[index] = result.confirmed ? 'true' : 'false';
    else resultRow[index] = rows[rowIndex][index] || '';
  });
  
  // Delete and re-add to ensure correct update
  await deleteRaceResult(roundId, driverId, raceType);
  await addRaceResult({ ...result, roundId });
}

async function deleteRaceResult(roundId: string, driverId: string, raceType?: string): Promise<void> {
  const rows = await readSheet('Race Results');
  if (rows.length < 2) return;
  
  const headers = rows[0];
  const roundIdIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'roundid');
  const driverIdIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'driverid');
  const raceTypeIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'racetype');
  
  // Find row by roundId, driverId, and optionally raceType
  const rowIndex = rows.findIndex((row, index) => {
    if (index === 0) return false; // Skip header
    const rowRoundId = row[roundIdIndex];
    const rowDriverId = row[driverIdIndex];
    const rowRaceType = raceTypeIndex >= 0 ? row[raceTypeIndex] : '';
    if (raceType) {
      return rowRoundId === roundId && rowDriverId === driverId && rowRaceType === raceType;
    } else {
      return rowRoundId === roundId && rowDriverId === driverId;
    }
  });
  
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

export async function deleteRaceResultsByRaceType(roundId: string, raceType: string): Promise<void> {
  const results = await getRaceResults();
  const raceTypeResults = results.filter(r => r.roundId === roundId && r.raceType === raceType);
  
  for (const result of raceTypeResults) {
    await deleteRaceResult(roundId, result.driverId, raceType);
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

// Race Results Records operations (for saving standings snapshots)
export interface RaceResultRecord {
  id: string;
  seasonId: string;
  roundId: string;
  division: Division;
  raceType: string;
  finalType?: string;
  driverId: string;
  driverName: string;
  position: number;
  fastestLap: string;
  points: number;
  rank: number;
  createdAt: string;
}

export async function getRaceResultRecordsBySeason(seasonId: string): Promise<RaceResultRecord[]> {
  try {
    const rows = await readSheet('Race Results Records');
    const records = rowsToObjects<any>(rows);
    
    return records
      .filter((r: any) => r.seasonId === seasonId)
      .map((record: any) => ({
        id: record.id || '',
        seasonId: record.seasonId || '',
        roundId: record.roundId || '',
        division: (record.division || 'Division 1') as Division,
        raceType: record.raceType || 'final',
        driverId: record.driverId || '',
        driverName: record.driverName || '',
        position: parseInt(record.position?.toString() || '0'),
        fastestLap: record.fastestLap || '',
        points: parseInt(record.points?.toString() || '0'),
        rank: parseInt(record.rank?.toString() || '0'),
        createdAt: record.createdAt || new Date().toISOString().split('T')[0],
      }));
  } catch (error) {
    console.error('Error getting race result records:', error);
    return [];
  }
}

export async function getRaceResultRecords(
  seasonId: string,
  roundId: string,
  division: Division,
  raceType: string
): Promise<RaceResultRecord[]> {
  const allRecords = await getRaceResultRecordsBySeason(seasonId);
  return allRecords.filter(
    r => r.roundId === roundId && r.division === division && r.raceType === raceType
  );
}

export async function getRaceResultRecordsByRound(roundId: string): Promise<RaceResultRecord[]> {
  try {
    const rows = await readSheet('Race Results Records');
    const records = rowsToObjects<any>(rows);
    
    return records
      .filter((r: any) => r.roundId === roundId)
      .map((record: any) => ({
        id: record.id || '',
        seasonId: record.seasonId || '',
        roundId: record.roundId || '',
        division: (record.division || 'Division 1') as Division,
        raceType: record.raceType || 'final',
        finalType: (record.finalType || '') as string,
        driverId: record.driverId || '',
        driverName: record.driverName || '',
        position: parseInt(record.position?.toString() || '0'),
        fastestLap: record.fastestLap || '',
        points: parseInt(record.points?.toString() || '0'),
        rank: parseInt(record.rank?.toString() || '0'),
        createdAt: record.createdAt || new Date().toISOString().split('T')[0],
      }));
  } catch (error) {
    console.error('Error getting race result records by round:', error);
    return [];
  }
}

export async function addRaceResultRecord(record: RaceResultRecord): Promise<void> {
  await appendRow('Race Results Records', [
    record.id,
    record.seasonId,
    record.roundId,
    record.division || 'Division 1',
    record.raceType || 'final',
    record.driverId,
    record.driverName,
    record.position.toString(),
    record.fastestLap || '',
    record.points.toString(),
    record.rank.toString(),
    record.createdAt || new Date().toISOString().split('T')[0],
  ]);
}

export async function addRaceResultRecords(records: RaceResultRecord[]): Promise<void> {
  // Add all records in a batch
  for (const record of records) {
    await addRaceResultRecord(record);
  }
}

export async function updateRaceResultRecord(recordId: string, updates: Partial<RaceResultRecord>): Promise<void> {
  const rows = await readSheet('Race Results Records');
  if (rows.length < 2) return;
  
  const headers = rows[0];
  const idIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'id');
  
  if (idIndex === -1) {
    throw new Error('ID column not found in Race Results Records sheet');
  }
  
  const rowIndex = rows.findIndex((row, index) => index > 0 && row[idIndex] === recordId);
  
  if (rowIndex === -1) {
    throw new Error(`Record with ID ${recordId} not found`);
  }
  
  // Build updated row based on current headers
  const existingRow = rows[rowIndex];
  const updatedRow = new Array(headers.length).fill('');
  
  headers.forEach((header, index) => {
    const h = (header || '').toLowerCase();
    if (h === 'id') updatedRow[index] = recordId;
    else if (h === 'seasonid') updatedRow[index] = updates.seasonId ?? existingRow[index] ?? '';
    else if (h === 'roundid') updatedRow[index] = updates.roundId ?? existingRow[index] ?? '';
    else if (h === 'division') updatedRow[index] = updates.division ?? existingRow[index] ?? '';
    else if (h === 'racetype') updatedRow[index] = updates.raceType ?? existingRow[index] ?? '';
    else if (h === 'finaltype') updatedRow[index] = updates.finalType ?? existingRow[index] ?? '';
    else if (h === 'driverid') updatedRow[index] = updates.driverId ?? existingRow[index] ?? '';
    else if (h === 'drivername') updatedRow[index] = updates.driverName ?? existingRow[index] ?? '';
    else if (h === 'position') updatedRow[index] = updates.position !== undefined ? updates.position.toString() : (existingRow[index] ?? '');
    else if (h === 'fastestlap') updatedRow[index] = updates.fastestLap ?? existingRow[index] ?? '';
    else if (h === 'points') updatedRow[index] = updates.points !== undefined ? updates.points.toString() : (existingRow[index] ?? '');
    else if (h === 'rank') updatedRow[index] = updates.rank !== undefined ? updates.rank.toString() : (existingRow[index] ?? '');
    else if (h === 'createdat') updatedRow[index] = updates.createdAt ?? existingRow[index] ?? '';
    else updatedRow[index] = existingRow[index] ?? '';
  });
  
  await updateRowById('Race Results Records', recordId, updatedRow);
}

export async function updateRaceResultRecordByFields(
  roundId: string,
  driverId: string,
  division: Division,
  raceType: string,
  finalType: string,
  updates: Partial<RaceResultRecord>
): Promise<void> {
  const records = await getRaceResultRecordsByRound(roundId);
  const matchingRecord = records.find(r => 
    r.driverId === driverId && 
    r.division === division && 
    r.raceType === raceType &&
    (r.finalType || '') === (finalType || '')
  );
  
  if (!matchingRecord) {
    throw new Error('Record not found');
  }
  
  await updateRaceResultRecord(matchingRecord.id, updates);
}

export async function deleteRaceResultRecord(recordId: string): Promise<void> {
  await deleteRowById('Race Results Records', recordId);
}

export async function deleteRaceResultRecords(
  seasonId: string,
  roundId: string,
  division: Division,
  raceType: string
): Promise<void> {
  const records = await getRaceResultRecords(seasonId, roundId, division, raceType);
  for (const record of records) {
    await deleteRaceResultRecord(record.id);
  }
}

// CheckIn operations
export interface CheckIn {
  id: string;
  seasonId?: string;
  roundId: string;
  driverId: string;
  checkedIn: boolean;
  createdAt?: string;
}

export async function getCheckInsByRound(roundId: string): Promise<CheckIn[]> {
  try {
    const rows = await readSheet('Check Ins');
    if (rows.length < 2) return [];
    
    const records = rowsToObjects<any>(rows);
    
    // Normalize roundId for comparison (trim and compare as string)
    const normalizedRoundId = String(roundId || '').trim();
    
    return records
      .filter((r: any) => {
        const recordRoundId = String(r.roundId || '').trim();
        return recordRoundId === normalizedRoundId;
      })
      .map((record: any) => {
        // Handle checkedIn field - it might be string "true"/"TRUE", boolean true, or number 1
        let checkedInValue = false;
        const checkedInField = record.checkedIn;
        if (checkedInField === true || checkedInField === 'true' || checkedInField === 'TRUE' || checkedInField === 1 || checkedInField === '1') {
          checkedInValue = true;
        }
        
        return {
          id: record.id || '',
          seasonId: record.seasonId || '',
          roundId: String(record.roundId || '').trim(),
          driverId: String(record.driverId || '').trim(),
          checkedIn: checkedInValue,
          createdAt: record.createdAt || '',
        };
      });
  } catch (error) {
    console.error('Error getting check ins:', error);
    return [];
  }
}

export async function getCheckIn(roundId: string, driverId: string): Promise<CheckIn | null> {
  const checkIns = await getCheckInsByRound(roundId);
  return checkIns.find(c => c.driverId === driverId) || null;
}

export async function upsertCheckIn(checkIn: CheckIn): Promise<void> {
  const rows = await readSheet('Check Ins');
  
  // Check if headers exist - look for header row that contains expected column names
  const hasHeaders = rows.length > 0 && rows[0] && (
    rows[0].some((h: string) => h && h.toLowerCase() === 'id') ||
    rows[0].some((h: string) => h && h.toLowerCase() === 'roundid') ||
    rows[0].some((h: string) => h && h.toLowerCase() === 'driverid')
  );
  
  if (!hasHeaders) {
    // No headers exist, create them using updateRowById on row 1, or append if sheet is completely empty
    if (rows.length === 0) {
      // Sheet is completely empty, append headers as first row
      await appendRow('Check Ins', ['id', 'seasonId', 'roundId', 'driverId', 'checkedIn', 'createdAt']);
    } else {
      // Sheet exists but no proper headers, update first row
      const sheets = await getSheetsClient();
      if (!SPREADSHEET_ID) throw new Error('GOOGLE_SPREADSHEET_ID not set');
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Check Ins!A1:F1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['id', 'seasonId', 'roundId', 'driverId', 'checkedIn', 'createdAt']],
        },
      });
    }
    // Re-read the sheet after creating headers
    const updatedRows = await readSheet('Check Ins');
    rows.length = 0;
    rows.push(...updatedRows);
  }
  
  // Normalize roundId and driverId for consistent comparison and storage
  const normalizedRoundId = String(checkIn.roundId || '').trim();
  const normalizedDriverId = String(checkIn.driverId || '').trim();
  const normalizedSeasonId = String(checkIn.seasonId || '').trim();
  
  const headers = rows[0];
  const idIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'id');
  const roundIdIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'roundid');
  const driverIdIndex = headers.findIndex((h: string) => h && h.toLowerCase() === 'driverid');
  
  // Find existing check-in - normalize comparison values
  const existingIndex = rows.findIndex((row, index) => {
    if (index === 0) return false;
    const rowRoundId = roundIdIndex >= 0 ? String(row[roundIdIndex] || '').trim() : '';
    const rowDriverId = driverIdIndex >= 0 ? String(row[driverIdIndex] || '').trim() : '';
    return rowRoundId === normalizedRoundId && rowDriverId === normalizedDriverId;
  });
  
  const newRow: string[] = new Array(headers.length).fill('');
  headers.forEach((header, index) => {
    const h = (header || '').toLowerCase();
    if (h === 'id') newRow[index] = checkIn.id || `checkin-${normalizedRoundId}-${normalizedDriverId}`;
    else if (h === 'seasonid') newRow[index] = normalizedSeasonId;
    else if (h === 'roundid') newRow[index] = normalizedRoundId;
    else if (h === 'driverid') newRow[index] = normalizedDriverId;
    else if (h === 'checkedin') newRow[index] = checkIn.checkedIn ? 'true' : 'false';
    else if (h === 'createdat') {
      // Preserve existing createdAt or set new one
      if (existingIndex > 0 && rows[existingIndex][index]) {
        newRow[index] = rows[existingIndex][index];
      } else {
        newRow[index] = checkIn.createdAt || new Date().toISOString().split('T')[0];
      }
    }
    // Preserve any existing values for unknown columns
    else if (existingIndex > 0 && rows[existingIndex][index]) {
      newRow[index] = rows[existingIndex][index];
    }
  });
  
  if (existingIndex > 0) {
    // Update existing
    const existingId = idIndex >= 0 ? rows[existingIndex][idIndex] : '';
    if (existingId) {
      await updateRowById('Check Ins', existingId, newRow);
    } else {
      // No ID, need to append and delete old
      await appendRow('Check Ins', newRow);
      // Note: We can't easily delete without ID, so we'll leave duplicates
    }
  } else {
    // Create new
    await appendRow('Check Ins', newRow);
  }
}

export async function deleteCheckIn(checkInId: string): Promise<void> {
  await deleteRowById('Check Ins', checkInId);
}

