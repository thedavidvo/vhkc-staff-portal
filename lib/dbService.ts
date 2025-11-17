import { sql } from './db';
import { Season, Round, Driver, Team, Division } from '@/types';

// Location interface
export interface Location {
  id: string;
  name: string;
  address: string;
}


// ============================================================================
// SEASON OPERATIONS
// ============================================================================

export async function getSeasons(): Promise<Season[]> {
  try {
    const seasons = await sql`SELECT * FROM seasons ORDER BY start_date DESC`;
    
    const seasonsWithRounds = await Promise.all(
      (seasons as any[]).map(async (season: any) => {
        const rounds = await getRoundsBySeasonId(season.id);
        return {
          id: season.id,
          name: season.name,
          startDate: season.start_date || '',
          endDate: season.end_date || '',
          numberOfRounds: season.number_of_rounds || 0,
          rounds: rounds.sort((a, b) => a.roundNumber - b.roundNumber),
        };
      })
    );
    
    return seasonsWithRounds;
  } catch (error) {
    console.error('Error getting seasons:', error);
    return [];
  }
}

export async function getSeasonById(seasonId: string): Promise<Season | null> {
  const seasons = await getSeasons();
  return seasons.find(s => s.id === seasonId) || null;
}

export async function addSeason(season: Season): Promise<void> {
  await sql`
    INSERT INTO seasons (id, name, start_date, end_date, number_of_rounds)
    VALUES (${season.id}, ${season.name}, ${season.startDate}, ${season.endDate}, ${season.numberOfRounds})
  `;
  
  // Add rounds if any
  for (const round of season.rounds) {
    await addRound(round, season.id);
  }
}

export async function updateSeason(season: Season): Promise<void> {
  try {
    // Update season metadata
    await sql`
      UPDATE seasons
      SET name = ${season.name},
          start_date = ${season.startDate},
          end_date = ${season.endDate},
          number_of_rounds = ${season.numberOfRounds}
      WHERE id = ${season.id}
    `;
    
    // Update rounds - sync with database
    // First, get existing rounds for this season
    const existingRounds = await sql`SELECT id FROM rounds WHERE season_id = ${season.id}` as any[];
    const existingRoundIds = new Set(existingRounds.map(r => r.id));
    const seasonRoundIds = new Set((season.rounds || []).map(r => r.id));
    
    // Delete rounds that are no longer in the season
    for (const existingRound of existingRounds) {
      if (!seasonRoundIds.has(existingRound.id)) {
        await deleteRound(existingRound.id);
      }
    }
    
    // Add or update rounds
    if (season.rounds && season.rounds.length > 0) {
      for (const round of season.rounds) {
        try {
          if (existingRoundIds.has(round.id)) {
            // Update existing round
            await updateRound(round, season.id);
          } else {
            // Add new round
            await addRound(round, season.id);
          }
        } catch (roundError) {
          console.error(`Error saving round ${round.id}:`, roundError);
          // Continue with other rounds even if one fails
        }
      }
    }
  } catch (error) {
    console.error('Error updating season:', error);
    throw error;
  }
}

export async function deleteSeason(seasonId: string): Promise<void> {
  await sql`DELETE FROM seasons WHERE id = ${seasonId}`;
}

// ============================================================================
// ROUND OPERATIONS
// ============================================================================

export async function getRounds(): Promise<(Round & { seasonId: string })[]> {
  const rounds = await sql`SELECT * FROM rounds ORDER BY date DESC`;
  return (rounds as any[]).map((r: any) => ({
    id: r.id,
    seasonId: r.season_id,
    roundNumber: r.round_number || 0,
    name: r.name,
    date: r.date || '',
    location: r.location || '',
    address: r.address || '',
    status: r.status as 'upcoming' | 'completed' | 'cancelled',
  }));
}

export async function getRoundsBySeasonId(seasonId: string): Promise<Round[]> {
  const rounds = await sql`SELECT * FROM rounds WHERE season_id = ${seasonId} ORDER BY round_number`;
  return (rounds as any[]).map((r: any) => ({
    id: r.id,
    roundNumber: r.round_number || 0,
    name: r.name,
    date: r.date || '',
    location: r.location || '',
    address: r.address || '',
    status: r.status as 'upcoming' | 'completed' | 'cancelled',
  }));
}

// Alias for backwards compatibility
export const getRoundsBySeason = getRoundsBySeasonId;

export async function getRoundById(roundId: string): Promise<Round | null> {
  const rounds = await sql`SELECT * FROM rounds WHERE id = ${roundId}` as any[];
  if (rounds.length === 0) return null;
  
  const r = rounds[0];
  return {
    id: r.id,
    roundNumber: r.round_number || 0,
    name: r.name,
    date: r.date || '',
    location: r.location || '',
    address: r.address || '',
    status: r.status as 'upcoming' | 'completed' | 'cancelled',
  };
}

export async function addRound(round: Round, seasonId: string): Promise<void> {
  await sql`
    INSERT INTO rounds (id, season_id, name, round_number, date, location, address, status)
    VALUES (${round.id}, ${seasonId}, ${round.name}, ${round.roundNumber}, ${round.date}, ${round.location}, ${round.address}, ${round.status || 'upcoming'})
  `;
}

export async function updateRound(round: Round, seasonId: string): Promise<void> {
  await sql`
    UPDATE rounds
    SET name = ${round.name},
        round_number = ${round.roundNumber},
        date = ${round.date},
        location = ${round.location},
        address = ${round.address},
        status = ${round.status || 'upcoming'}
    WHERE id = ${round.id} AND season_id = ${seasonId}
  `;
}

export async function deleteRound(roundId: string): Promise<void> {
  await sql`DELETE FROM rounds WHERE id = ${roundId}`;
}

// ============================================================================
// DRIVER OPERATIONS
// ============================================================================

export async function getDrivers(seasonId?: string): Promise<Driver[]> {
  const drivers = (seasonId
    ? await sql`SELECT * FROM drivers WHERE season_id = ${seasonId} ORDER BY name`
    : await sql`SELECT * FROM drivers ORDER BY name`) as any[];
  
  return drivers.map((d: any) => ({
    id: d.id,
    name: d.name,
    email: d.email || '',
    division: d.division as Division,
    teamName: d.team_name || '',
    status: d.status || 'ACTIVE',
    lastRacePosition: d.last_race_position || undefined,
    fastestLap: d.fastest_lap || '',
    pointsTotal: parseFloat(d.points_total) || 0,
    lastUpdated: d.last_updated || '',
    firstName: d.first_name || '',
    lastName: d.last_name || '',
    dateOfBirth: d.date_of_birth || '',
    homeTrack: d.home_track || '',
    aliases: d.aliases ? d.aliases.split(',').filter((a: string) => a.trim()) : [],
  }));
}

// Alias for backwards compatibility
export const getDriversBySeason = getDrivers;

export async function getDriverById(driverId: string): Promise<Driver | null> {
  const drivers = await sql`SELECT * FROM drivers WHERE id = ${driverId}` as any[];
  if (drivers.length === 0) return null;
  
  const d = drivers[0];
  return {
    id: d.id,
    name: d.name,
    email: d.email || '',
    division: d.division as Division,
    teamName: d.team_name || '',
    status: d.status || 'ACTIVE',
    lastRacePosition: d.last_race_position || undefined,
    fastestLap: d.fastest_lap || '',
    pointsTotal: parseFloat(d.points_total) || 0,
    lastUpdated: d.last_updated || '',
    firstName: d.first_name || '',
    lastName: d.last_name || '',
    dateOfBirth: d.date_of_birth || '',
    homeTrack: d.home_track || '',
    aliases: d.aliases ? d.aliases.split(',').filter((a: string) => a.trim()) : [],
  };
}

export async function addDriver(driver: Driver, seasonId: string): Promise<void> {
  const aliases = driver.aliases ? driver.aliases.join(',') : '';
  
  await sql`
    INSERT INTO drivers (
      id, season_id, name, email, division, team_name, status,
      last_race_position, fastest_lap, points_total, last_updated,
      first_name, last_name, date_of_birth, home_track, aliases
    ) VALUES (
      ${driver.id}, ${seasonId}, ${driver.name}, ${driver.email || ''},
      ${driver.division}, ${driver.teamName || ''}, ${driver.status || 'ACTIVE'},
      ${driver.lastRacePosition || null}, ${driver.fastestLap || ''},
      ${driver.pointsTotal || 0}, ${driver.lastUpdated || ''},
      ${driver.firstName || ''}, ${driver.lastName || ''},
      ${driver.dateOfBirth || ''}, ${driver.homeTrack || ''}, ${aliases}
    )
  `;
}

export async function updateDriver(driver: Driver, seasonId?: string): Promise<void> {
  const aliases = driver.aliases ? driver.aliases.join(',') : '';
  
  await sql`
    UPDATE drivers
    SET name = ${driver.name},
        email = ${driver.email || ''},
        division = ${driver.division},
        team_name = ${driver.teamName || ''},
        status = ${driver.status || 'ACTIVE'},
        last_race_position = ${driver.lastRacePosition || null},
        fastest_lap = ${driver.fastestLap || ''},
        points_total = ${driver.pointsTotal || 0},
        last_updated = ${driver.lastUpdated || ''},
        first_name = ${driver.firstName || ''},
        last_name = ${driver.lastName || ''},
        date_of_birth = ${driver.dateOfBirth || ''},
        home_track = ${driver.homeTrack || ''},
        aliases = ${aliases}
    WHERE id = ${driver.id}
  `;
}

export async function deleteDriver(driverId: string): Promise<void> {
  await sql`DELETE FROM drivers WHERE id = ${driverId}`;
}

// ============================================================================
// RACE RESULT OPERATIONS
// ============================================================================

export interface DriverRaceResult {
  driverId: string;
  driverName?: string;
  driverAlias?: string;
  kartNumber?: string;
  division?: string;
  position: number;
  gridPosition?: number;
  overallPosition?: number;
  fastestLap?: string;
  points?: number;
  raceType?: string;
  raceName?: string;
  finalType?: string;
}

export interface RaceDivisionResult {
  division: Division;
  results: (DriverRaceResult & { raceType?: string; raceName?: string; finalType?: string; confirmed?: boolean })[];
}

export async function getRaceResultsByRound(roundId: string): Promise<RaceDivisionResult[]> {
  const results = await sql`
    SELECT * FROM race_results
    WHERE round_id = ${roundId}
    ORDER BY division, grid_position
  ` as any[];
  
  // Get driver names
  const drivers = await getDrivers();
  const driverMap = new Map(drivers.map(d => [d.id, d]));
  
  // Group by division
  const divisionMap = new Map<string, any[]>();
  
  for (const result of results) {
    const division = result.division as Division;
    if (!divisionMap.has(division)) {
      divisionMap.set(division, []);
    }
    
    const driver = driverMap.get(result.driver_id);
    
    divisionMap.get(division)!.push({
      driverId: result.driver_id,
      driverName: driver?.name || 'Unknown Driver',
      driverAlias: result.driver_alias || '',
      kartNumber: result.kart_number || '',
      division: result.division,
      position: result.grid_position || 0,
      gridPosition: result.grid_position || 0,
      overallPosition: result.overall_position || 0,
      fastestLap: result.fastest_lap || '',
      points: parseFloat(result.points) || 0,
      raceType: result.race_type || 'qualification',
      raceName: result.race_name || '',
      finalType: result.final_type || '',
      confirmed: result.confirmed || false,
    });
  }
  
  return Array.from(divisionMap.entries()).map(([division, results]) => ({
    division: division as Division,
    results,
  }));
}

export async function addRaceResult(
  result: DriverRaceResult & { roundId: string; division: string; raceType?: string; raceName?: string; finalType?: string; confirmed?: boolean }
): Promise<void> {
  await sql`
    INSERT INTO race_results (
      round_id, driver_id, driver_alias, division, kart_number,
      grid_position, overall_position, fastest_lap, points,
      race_type, race_name, final_type, confirmed
    ) VALUES (
      ${result.roundId}, ${result.driverId}, ${result.driverAlias || ''},
      ${result.division}, ${result.kartNumber || ''},
      ${result.gridPosition || result.position || 0},
      ${result.overallPosition || result.gridPosition || result.position || 0},
      ${result.fastestLap || ''}, ${result.points || 0},
      ${result.raceType || 'qualification'}, ${result.raceName || ''},
      ${result.finalType || ''}, ${result.confirmed || false}
    )
    ON CONFLICT (round_id, driver_id, race_type, final_type)
    DO UPDATE SET
      driver_alias = EXCLUDED.driver_alias,
      division = EXCLUDED.division,
      kart_number = EXCLUDED.kart_number,
      grid_position = EXCLUDED.grid_position,
      overall_position = EXCLUDED.overall_position,
      fastest_lap = EXCLUDED.fastest_lap,
      points = EXCLUDED.points,
      race_name = EXCLUDED.race_name,
      confirmed = EXCLUDED.confirmed
  `;
}

export async function updateRaceResult(
  roundId: string,
  driverId: string,
  result: DriverRaceResult & { division: string; raceType?: string; raceName?: string; finalType?: string; confirmed?: boolean }
): Promise<void> {
  const raceType = result.raceType || 'qualification';
  const finalType = result.finalType || '';
  
  await sql`
    UPDATE race_results
    SET driver_alias = ${result.driverAlias || ''},
        division = ${result.division},
        kart_number = ${result.kartNumber || ''},
        grid_position = ${result.gridPosition || result.position || 0},
        overall_position = ${result.overallPosition || result.gridPosition || result.position || 0},
        fastest_lap = ${result.fastestLap || ''},
        points = ${result.points || 0},
        race_type = ${raceType},
        race_name = ${result.raceName || ''},
        final_type = ${finalType},
        confirmed = ${result.confirmed || false}
    WHERE round_id = ${roundId}
      AND driver_id = ${driverId}
      AND race_type = ${raceType}
      AND (final_type = ${finalType} OR (final_type IS NULL AND ${finalType} = ''))
  `;
}

export async function deleteRaceResult(roundId: string, driverId: string, raceType?: string): Promise<void> {
  if (raceType) {
    await sql`DELETE FROM race_results WHERE round_id = ${roundId} AND driver_id = ${driverId} AND race_type = ${raceType}`;
  } else {
    await sql`DELETE FROM race_results WHERE round_id = ${roundId} AND driver_id = ${driverId}`;
  }
}

export async function deleteRaceResultsByRaceType(roundId: string, raceType: string): Promise<void> {
  await sql`DELETE FROM race_results WHERE round_id = ${roundId} AND race_type = ${raceType}`;
}

// ============================================================================
// LOCATION OPERATIONS
// ============================================================================

export async function getLocations(): Promise<Location[]> {
  const locations = await sql`SELECT * FROM locations ORDER BY name` as any[];
  return locations.map((l: any) => ({
    id: l.id,
    name: l.name,
    address: l.address || '',
  }));
}

export async function addLocation(location: Location): Promise<void> {
  await sql`
    INSERT INTO locations (id, name, address)
    VALUES (${location.id}, ${location.name}, ${location.address})
  `;
}

export async function updateLocation(location: Location): Promise<void> {
  await sql`
    UPDATE locations
    SET name = ${location.name}, address = ${location.address}
    WHERE id = ${location.id}
  `;
}

export async function deleteLocation(locationId: string): Promise<void> {
  await sql`DELETE FROM locations WHERE id = ${locationId}`;
}

// ============================================================================
// TEAM OPERATIONS
// ============================================================================

export async function getTeams(seasonId?: string): Promise<Team[]> {
  const teams = (seasonId
    ? await sql`SELECT * FROM teams WHERE season_id = ${seasonId} ORDER BY name`
    : await sql`SELECT * FROM teams ORDER BY name`) as any[];
  
  return teams.map((t: any) => ({
    id: t.id,
    name: t.name,
    driverIds: [], // Would need to be populated from drivers table
    division: t.division as Division | undefined,
    createdAt: t.created_at || '',
  }));
}

// Alias for backwards compatibility
export const getTeamsBySeason = getTeams;

export async function addTeam(team: Team, seasonId?: string): Promise<void> {
  const sid = seasonId || (team as any).seasonId;
  await sql`
    INSERT INTO teams (id, name, season_id, division, status)
    VALUES (${team.id}, ${team.name}, ${sid}, ${team.division || ''}, ${'active'})
  `;
}

export async function updateTeam(team: Team): Promise<void> {
  await sql`
    UPDATE teams
    SET name = ${team.name}, division = ${team.division || ''}
    WHERE id = ${team.id}
  `;
}

export async function deleteTeam(teamId: string): Promise<void> {
  await sql`DELETE FROM teams WHERE id = ${teamId}`;
}

// ============================================================================
// RACE RESULT RECORDS OPERATIONS (Snapshots)
// ============================================================================

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
  const records = await sql`SELECT * FROM race_result_records WHERE season_id = ${seasonId} ORDER BY created_at DESC` as any[];
  return records.map((r: any) => ({
    id: r.id,
    seasonId: r.season_id,
    roundId: r.round_id,
    division: r.division as Division,
    raceType: r.race_type,
    finalType: r.final_type || '',
    driverId: r.driver_id,
    driverName: r.driver_name,
    position: r.position,
    fastestLap: r.fastest_lap || '',
    points: parseFloat(r.points),
    rank: r.rank,
    createdAt: r.created_at,
  }));
}

export async function getRaceResultRecordsByRound(roundId: string): Promise<RaceResultRecord[]> {
  const records = await sql`SELECT * FROM race_result_records WHERE round_id = ${roundId} ORDER BY rank` as any[];
  return records.map((r: any) => ({
    id: r.id,
    seasonId: r.season_id,
    roundId: r.round_id,
    division: r.division as Division,
    raceType: r.race_type,
    finalType: r.final_type || '',
    driverId: r.driver_id,
    driverName: r.driver_name,
    position: r.position,
    fastestLap: r.fastest_lap || '',
    points: parseFloat(r.points),
    rank: r.rank,
    createdAt: r.created_at,
  }));
}

export async function getRaceResultRecords(
  seasonId: string,
  roundId: string,
  division: Division,
  raceType: string
): Promise<RaceResultRecord[]> {
  const records = await sql`
    SELECT * FROM race_result_records
    WHERE season_id = ${seasonId}
      AND round_id = ${roundId}
      AND division = ${division}
      AND race_type = ${raceType}
    ORDER BY rank
  ` as any[];
  return records.map((r: any) => ({
    id: r.id,
    seasonId: r.season_id,
    roundId: r.round_id,
    division: r.division as Division,
    raceType: r.race_type,
    finalType: r.final_type || '',
    driverId: r.driver_id,
    driverName: r.driver_name,
    position: r.position,
    fastestLap: r.fastest_lap || '',
    points: parseFloat(r.points),
    rank: r.rank,
    createdAt: r.created_at,
  }));
}

export async function addRaceResultRecord(record: RaceResultRecord): Promise<void> {
  await sql`
    INSERT INTO race_result_records (
      id, season_id, round_id, division, race_type, final_type,
      driver_id, driver_name, position, fastest_lap, points, rank, created_at
    ) VALUES (
      ${record.id}, ${record.seasonId}, ${record.roundId}, ${record.division},
      ${record.raceType}, ${record.finalType || ''}, ${record.driverId},
      ${record.driverName}, ${record.position}, ${record.fastestLap},
      ${record.points}, ${record.rank}, ${record.createdAt}
    )
  `;
}

export async function addRaceResultRecords(records: RaceResultRecord[]): Promise<void> {
  for (const record of records) {
    await addRaceResultRecord(record);
  }
}

export async function updateRaceResultRecord(recordId: string, updates: Partial<RaceResultRecord>): Promise<void> {
  const existing = await sql`SELECT * FROM race_result_records WHERE id = ${recordId}` as any[];
  if (existing.length === 0) {
    throw new Error(`Record with ID ${recordId} not found`);
  }
  
  const record = existing[0];
  await sql`
    UPDATE race_result_records
    SET season_id = ${updates.seasonId ?? record.season_id},
        round_id = ${updates.roundId ?? record.round_id},
        division = ${updates.division ?? record.division},
        race_type = ${updates.raceType ?? record.race_type},
        final_type = ${updates.finalType ?? record.final_type ?? ''},
        driver_id = ${updates.driverId ?? record.driver_id},
        driver_name = ${updates.driverName ?? record.driver_name},
        position = ${updates.position ?? record.position},
        fastest_lap = ${updates.fastestLap ?? record.fastest_lap},
        points = ${updates.points ?? record.points},
        rank = ${updates.rank ?? record.rank},
        created_at = ${updates.createdAt ?? record.created_at}
    WHERE id = ${recordId}
  `;
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
  await sql`DELETE FROM race_result_records WHERE id = ${recordId}`;
}

export async function deleteRaceResultRecords(
  seasonId: string,
  roundId: string,
  division: Division,
  raceType: string
): Promise<void> {
  await sql`
    DELETE FROM race_result_records
    WHERE season_id = ${seasonId}
      AND round_id = ${roundId}
      AND division = ${division}
      AND race_type = ${raceType}
  `;
}

// ============================================================================
// CHECK-IN OPERATIONS
// ============================================================================

export interface CheckIn {
  id: string;
  seasonId?: string;
  roundId: string;
  driverId: string;
  checkedIn: boolean;
  createdAt?: string;
}

export async function getCheckInsByRound(roundId: string): Promise<CheckIn[]> {
  const checkIns = await sql`SELECT * FROM check_ins WHERE round_id = ${roundId}` as any[];
  return checkIns.map((c: any) => ({
    id: c.id,
    seasonId: c.season_id || '',
    roundId: c.round_id,
    driverId: c.driver_id,
    checkedIn: c.checked_in || false,
    createdAt: c.created_at || '',
  }));
}

export async function addCheckIn(checkIn: CheckIn): Promise<void> {
  await sql`
    INSERT INTO check_ins (id, season_id, round_id, driver_id, checked_in, created_at)
    VALUES (
      ${checkIn.id}, ${checkIn.seasonId || ''}, ${checkIn.roundId},
      ${checkIn.driverId}, ${checkIn.checkedIn}, ${checkIn.createdAt || new Date().toISOString().split('T')[0]}
    )
    ON CONFLICT (round_id, driver_id)
    DO UPDATE SET
      checked_in = EXCLUDED.checked_in,
      season_id = EXCLUDED.season_id
  `;
}

export async function updateCheckIn(checkIn: CheckIn): Promise<void> {
  await sql`
    UPDATE check_ins
    SET checked_in = ${checkIn.checkedIn}, season_id = ${checkIn.seasonId || ''}
    WHERE id = ${checkIn.id}
  `;
}

export async function deleteCheckIn(checkInId: string): Promise<void> {
  await sql`DELETE FROM check_ins WHERE id = ${checkInId}`;
}

export async function deleteCheckInsByRound(roundId: string): Promise<void> {
  await sql`DELETE FROM check_ins WHERE round_id = ${roundId}`;
}

