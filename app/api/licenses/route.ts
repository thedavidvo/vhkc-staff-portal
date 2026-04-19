import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type HistoryRow = {
  incident_id?: string | null;
  points_added: number;
  incident_season_id?: string | null;
  incident_round_number?: number | null;
  incident_division?: string | null;
  expires_at?: string | null;
  is_expired?: boolean | null;
};

type ExpiryCandidate = {
  sortKey: number;
  label: string;
  detail: string;
};

type ExpirySummary = {
  label: string;
  detail: string;
};

type RoundOffsetMap = Map<string, number>;

let policyColumnsEnsured = false;

async function ensureLicensePolicyColumns() {
  if (policyColumnsEnsured) return;

  await sql`ALTER TABLE license_points_history ADD COLUMN IF NOT EXISTS incident_season_id TEXT`;
  await sql`ALTER TABLE license_points_history ADD COLUMN IF NOT EXISTS incident_round_id TEXT`;
  await sql`ALTER TABLE license_points_history ADD COLUMN IF NOT EXISTS incident_round_number INTEGER`;
  await sql`ALTER TABLE license_points_history ADD COLUMN IF NOT EXISTS incident_division TEXT`;

  await sql`CREATE INDEX IF NOT EXISTS idx_license_history_incident_season_id ON license_points_history(incident_season_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_license_history_incident_round_id ON license_points_history(incident_round_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_license_history_incident_round_number ON license_points_history(incident_round_number)`;

  policyColumnsEnsured = true;
}

function normalizeDivision(division?: string | null): string {
  if (!division) return 'New';
  const trimmed = division.trim();
  if (!trimmed) return 'New';
  return trimmed;
}

function getRoundWindowForDivision(division?: string | null): number | null {
  const d = normalizeDivision(division);
  if (d === 'Division 1') return 12;
  if (d === 'Division 2') return 6;
  return null;
}

async function getRoundOffsets(): Promise<RoundOffsetMap> {
  const seasonRows = await sql`
    SELECT
      s.id,
      s.start_date,
      s.name,
      COALESCE(MAX(r.round_number), 0) AS max_round
    FROM seasons s
    LEFT JOIN rounds r ON r.season_id = s.id
    GROUP BY s.id, s.start_date, s.name
    ORDER BY s.start_date NULLS LAST, s.name
  ` as any[];

  const offsets: RoundOffsetMap = new Map();
  let cumulative = 0;

  for (const season of seasonRows) {
    offsets.set(season.id, cumulative);
    cumulative += Number(season.max_round || 0);
  }

  return offsets;
}

function toGlobalRoundIndex(
  seasonId?: string | null,
  roundNumber?: number | null,
  offsets?: RoundOffsetMap
): number | null {
  if (!seasonId || roundNumber == null || !offsets) return null;
  const offset = offsets.get(seasonId);
  if (offset == null) return null;
  return offset + Number(roundNumber);
}

function isHistoryRowActive(
  row: HistoryRow,
  currentSeasonId: string,
  currentRoundNumber: number,
  offsets: RoundOffsetMap
): boolean {
  if (row.is_expired) return false;

  const division = normalizeDivision(row.incident_division);
  const incidentSeasonId = row.incident_season_id || null;
  const incidentRoundNumber = row.incident_round_number ?? null;

  // Legacy fallback for rows that pre-date round/season context.
  if (!incidentSeasonId || incidentRoundNumber == null) {
    if (!row.expires_at) return false;
    return new Date(row.expires_at).getTime() > Date.now();
  }

  // Division 3 resets each season.
  if (division === 'Division 3') {
    return incidentSeasonId === currentSeasonId;
  }

  const window = getRoundWindowForDivision(division);
  if (window == null) {
    return false;
  }

  const incidentGlobal = toGlobalRoundIndex(incidentSeasonId, incidentRoundNumber, offsets);
  const currentGlobal = toGlobalRoundIndex(currentSeasonId, currentRoundNumber, offsets);
  if (incidentGlobal == null || currentGlobal == null) {
    return false;
  }

  const roundsElapsed = currentGlobal - incidentGlobal;
  return roundsElapsed < window;
}

function formatDateLabel(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getNextExpiryForActiveRows(
  rows: HistoryRow[],
  currentSeasonId: string,
  currentRoundNumber: number,
  offsets: RoundOffsetMap
): ExpirySummary {
  const activeRows = rows.filter((row) =>
    isHistoryRowActive(row, currentSeasonId, currentRoundNumber, offsets)
  );

  if (activeRows.length === 0) {
    return { label: 'No active points', detail: 'No active incident points to expire.' };
  }

  const candidates: ExpiryCandidate[] = [];

  for (const row of activeRows) {
    const division = normalizeDivision(row.incident_division);
    const incidentSeasonId = row.incident_season_id || null;
    const incidentRoundNumber = row.incident_round_number ?? null;

    if (!incidentSeasonId || incidentRoundNumber == null) {
      if (row.expires_at) {
        const expiresMs = new Date(row.expires_at).getTime();
        const incidentLabel = row.incident_id || 'legacy incident';
        candidates.push({
          sortKey: expiresMs,
          label: formatDateLabel(row.expires_at),
          detail: `${incidentLabel}: +${Number(row.points_added || 0)} point(s), expires ${formatDateLabel(row.expires_at)}.`,
        });
      }
      continue;
    }

    if (division === 'Division 3') {
      const incidentLabel = row.incident_id || 'incident';
      candidates.push({
        sortKey: Number.MAX_SAFE_INTEGER - 1,
        label: 'Season reset',
        detail: `${incidentLabel}: +${Number(row.points_added || 0)} point(s), clears when season changes.`,
      });
      continue;
    }

    const window = getRoundWindowForDivision(division);
    if (window == null) continue;

    const incidentGlobal = toGlobalRoundIndex(incidentSeasonId, incidentRoundNumber, offsets);
    const currentGlobal = toGlobalRoundIndex(currentSeasonId, currentRoundNumber, offsets);
    if (incidentGlobal == null || currentGlobal == null) continue;

    const roundsElapsed = currentGlobal - incidentGlobal;
    const roundsRemaining = window - roundsElapsed;
    if (roundsRemaining <= 0) continue;

    candidates.push({
      sortKey: roundsRemaining,
      label: roundsRemaining === 1 ? 'In 1 round' : `In ${roundsRemaining} rounds`,
      detail: `${row.incident_id || 'incident'}: +${Number(row.points_added || 0)} point(s), ${roundsRemaining === 1 ? 'expires next round' : `expires in ${roundsRemaining} rounds`} (from round ${incidentRoundNumber}, ${division}).`,
    });
  }

  if (candidates.length === 0) {
    return { label: 'No active points', detail: 'No active incident points to expire.' };
  }

  candidates.sort((a, b) => a.sortKey - b.sortKey);
  return {
    label: candidates[0].label,
    detail: candidates[0].detail,
  };
}

async function calculateActivePoints(
  driverId: string,
  currentSeasonId: string,
  currentRoundNumber: number,
  offsets: RoundOffsetMap
): Promise<number> {
  const historyRows = await sql`
    SELECT points_added, incident_season_id, incident_round_number, incident_division, expires_at, is_expired
    FROM license_points_history
    WHERE driver_id = ${driverId}
  ` as any[];

  return (historyRows as HistoryRow[])
    .filter((row) => isHistoryRowActive(row, currentSeasonId, currentRoundNumber, offsets))
    .reduce((sum, row) => sum + Number(row.points_added || 0), 0);
}

async function getHistoryRows(driverId: string): Promise<HistoryRow[]> {
  const historyRows = await sql`
    SELECT incident_id, points_added, incident_season_id, incident_round_number, incident_division, expires_at, is_expired
    FROM license_points_history
    WHERE driver_id = ${driverId}
  ` as any[];

  return historyRows as HistoryRow[];
}

async function getCurrentSeasonRoundNumber(seasonId: string): Promise<number> {
  const completedRoundRows = await sql`
    SELECT COALESCE(MAX(r.round_number), 0) AS current_round
    FROM rounds r
    WHERE r.season_id = ${seasonId}
      AND EXISTS (
        SELECT 1
        FROM race_results rr
        WHERE rr.round_id = r.id
      )
  ` as any[];

  return Number(completedRoundRows[0]?.current_round || 0);
}

async function recomputeSeasonLicenses(seasonId: string) {
  await ensureLicensePolicyColumns();

  const offsets = await getRoundOffsets();
  const currentRoundNumber = await getCurrentSeasonRoundNumber(seasonId);

  const licenses = await sql`
    SELECT id, driver_id, total_incident_points, is_suspended
    FROM licenses
  ` as any[];

  let updatedCount = 0;

  for (const license of licenses) {
    const activePoints = await calculateActivePoints(
      license.driver_id,
      seasonId,
      currentRoundNumber,
      offsets
    );
    const shouldSuspend = activePoints >= 8;
    const currentTotal = Number(license.total_incident_points || 0);
    const currentSuspended = Boolean(license.is_suspended);

    if (currentTotal !== activePoints || currentSuspended !== shouldSuspend) {
      await sql`
        UPDATE licenses
        SET
          total_incident_points = ${activePoints},
          is_suspended = ${shouldSuspend},
          suspended_at = ${shouldSuspend ? new Date().toISOString() : null},
          updated_at = NOW()
        WHERE id = ${license.id}
      `;
      updatedCount += 1;
    }
  }

  return {
    processed: licenses.length,
    updated: updatedCount,
    currentRound: currentRoundNumber,
  };
}

// GET - Fetch licenses
export async function GET(request: Request) {
  try {
    await ensureLicensePolicyColumns();

    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const suspended = searchParams.get('suspended');
    const seasonId = searchParams.get('seasonId');

    let query = sql`
      SELECT 
        l.*,
        d.name as driver_name,
        d.email as driver_email,
        d.division as driver_division
      FROM licenses l
      LEFT JOIN drivers d ON l.driver_id = d.id
      WHERE 1=1
    `;

    if (driverId) {
      query = sql`
        SELECT 
          l.*,
          d.name as driver_name,
          d.email as driver_email,
          d.division as driver_division
        FROM licenses l
        LEFT JOIN drivers d ON l.driver_id = d.id
        WHERE l.driver_id = ${driverId}
      `;
    } else if (seasonId) {
      // Season-aware: only drivers registered in this season, using season-specific division.
      query = sql`
        SELECT 
          l.*,
          d.name as driver_name,
          d.email as driver_email,
          sd.division as driver_division
        FROM licenses l
        INNER JOIN drivers d ON l.driver_id = d.id
        INNER JOIN season_drivers sd ON sd.driver_id = l.driver_id AND sd.season_id = ${seasonId}
        WHERE 1=1
      `;
    } else if (suspended === 'true') {
      query = sql`
        SELECT 
          l.*,
          d.name as driver_name,
          d.email as driver_email,
          d.division as driver_division
        FROM licenses l
        LEFT JOIN drivers d ON l.driver_id = d.id
        WHERE l.is_suspended = true
      `;
    }

    const rows = await query as any[];

    if (!seasonId) {
      // Backward-compatible mode when no season is provided.
      const licensesWithActivePoints = await Promise.all(
        rows.map(async (license: any) => {
          const historyRows = await getHistoryRows(license.driver_id);
          const nowMs = Date.now();
          const activeLegacyRows = historyRows.filter((row) => {
            if (row.is_expired) return false;
            if (!row.expires_at) return false;
            return new Date(row.expires_at).getTime() > nowMs;
          });

          const activePoints = activeLegacyRows.reduce(
            (sum, row) => sum + Number(row.points_added || 0),
            0
          );

          let nextExpiry = 'No active points';
          let nextExpiryDetail = 'No active incident points to expire.';
          const datedRows = activeLegacyRows
            .filter((row) => Boolean(row.expires_at))
            .sort((a, b) => new Date(a.expires_at as string).getTime() - new Date(b.expires_at as string).getTime());
          if (datedRows.length > 0 && datedRows[0].expires_at) {
            nextExpiry = formatDateLabel(datedRows[0].expires_at);
            nextExpiryDetail = `${datedRows[0].incident_id || 'legacy incident'}: +${Number(datedRows[0].points_added || 0)} point(s), expires ${nextExpiry}.`;
          }

          return {
            ...license,
            activePoints,
            nextExpiry,
            nextExpiryDetail,
            isSuspended: Boolean(license.is_suspended),
          };
        })
      );

      return NextResponse.json(licensesWithActivePoints);
    }

    const offsets = await getRoundOffsets();
    const currentRoundNumber = await getCurrentSeasonRoundNumber(seasonId);

    // Calculate active points using round-based expiry rules.
    const licensesWithActivePoints = await Promise.all(
      rows.map(async (license: any) => {
        const historyRows = await getHistoryRows(license.driver_id);
        const activePoints = historyRows
          .filter((row) => isHistoryRowActive(row, seasonId, currentRoundNumber, offsets))
          .reduce((sum, row) => sum + Number(row.points_added || 0), 0);
        const nextExpiry = getNextExpiryForActiveRows(
          historyRows,
          seasonId,
          currentRoundNumber,
          offsets
        );
        const computedSuspended = activePoints >= 15;

        return {
          ...license,
          activePoints,
          nextExpiry: nextExpiry.label,
          nextExpiryDetail: nextExpiry.detail,
          isSuspended: computedSuspended,
          isRaceSuspended: Boolean(license.is_race_suspended),
        };
      })
    );

    return NextResponse.json(licensesWithActivePoints);
  } catch (error: any) {
    console.error('Error fetching licenses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create or update license
export async function POST(request: Request) {
  try {
    await ensureLicensePolicyColumns();

    const body = await request.json();
    const { driverId, incidentId, incidentPoints, incidentDate, seasonId, roundId } = body;

    if (!driverId) {
      return NextResponse.json(
        { error: 'driverId is required' },
        { status: 400 }
      );
    }

    // Get or create license
    let license;
    const existingLicense = await sql`
      SELECT * FROM licenses WHERE driver_id = ${driverId}
    ` as any[];

    if (existingLicense.length === 0) {
      // Create new license
      const licenseId = `license-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await sql`
        INSERT INTO licenses (id, driver_id, total_incident_points, is_suspended, created_at, updated_at)
        VALUES (${licenseId}, ${driverId}, 0, false, NOW(), NOW())
      `;
      license = { id: licenseId, driver_id: driverId };
    } else {
      license = existingLicense[0];
    }

    // Empty license creation path for new drivers.
    if (!incidentId && incidentPoints === undefined) {
      return NextResponse.json({
        success: true,
        licenseId: license.id,
        totalPoints: license.total_incident_points || 0,
        isSuspended: license.is_suspended || false,
      });
    }

    if (!incidentId || incidentPoints === undefined) {
      return NextResponse.json(
        { error: 'incidentId and incidentPoints are required when adding license history' },
        { status: 400 }
      );
    }

    const incidentRows = await sql`
      SELECT
        i.id,
        i.season_id,
        i.round_id,
        r.round_number,
        COALESCE(sd.division, d.division, 'New') AS incident_division
      FROM incidents i
      LEFT JOIN rounds r ON r.id = i.round_id
      LEFT JOIN season_drivers sd
        ON sd.season_id = i.season_id
       AND sd.driver_id = i.driver_id
      LEFT JOIN drivers d ON d.id = i.driver_id
      WHERE i.id = ${incidentId}
    ` as any[];

    if (incidentRows.length === 0) {
      return NextResponse.json(
        { error: 'Incident does not exist for license history update' },
        { status: 400 }
      );
    }

    const incident = incidentRows[0];
    const incidentSeasonId = incident.season_id || seasonId;
    const incidentRoundId = incident.round_id || roundId;
    const incidentRoundNumber = Number(incident.round_number || 0);
    const incidentDivision = normalizeDivision(incident.incident_division);

    if (!incidentSeasonId || !incidentRoundId) {
      return NextResponse.json(
        { error: 'Could not determine incident season/round context' },
        { status: 400 }
      );
    }

    // Keep expires_at for legacy compatibility while using round/season policy.
    const historyId = `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const incident_date = incidentDate ? new Date(incidentDate) : new Date();
    const expires_at = new Date(incident_date);
    expires_at.setFullYear(expires_at.getFullYear() + 1);

    const offsets = await getRoundOffsets();
    const activeBefore = await calculateActivePoints(
      driverId,
      incidentSeasonId,
      incidentRoundNumber,
      offsets
    );
    const pointsAtTime = activeBefore + Number(incidentPoints);

    await sql`
      INSERT INTO license_points_history (
        id, license_id, driver_id, incident_id, points_added, 
        points_at_time, incident_date, expires_at, is_expired,
        incident_season_id, incident_round_id, incident_round_number, incident_division,
        created_at
      )
      VALUES (
        ${historyId}, ${license.id}, ${driverId}, ${incidentId}, ${incidentPoints},
        ${pointsAtTime}, ${incident_date.toISOString()}, ${expires_at.toISOString()}, false,
        ${incidentSeasonId}, ${incidentRoundId}, ${incidentRoundNumber}, ${incidentDivision},
        NOW()
      )
    `;

    // Update license with new totals
    const isSuspended = pointsAtTime >= 8;
    await sql`
      UPDATE licenses
      SET 
        total_incident_points = ${pointsAtTime},
        is_suspended = ${isSuspended},
        suspended_at = ${isSuspended ? new Date().toISOString() : null},
        updated_at = NOW()
      WHERE id = ${license.id}
    `;

    return NextResponse.json({ 
      success: true, 
      licenseId: license.id,
      totalPoints: pointsAtTime,
      isSuspended 
    });
  } catch (error: any) {
    console.error('Error creating/updating license:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update license (e.g., manually override suspension)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { licenseId, isSuspended, action, seasonId } = body;

    if (action === 'recompute-season') {
      if (!seasonId) {
        return NextResponse.json(
          { error: 'seasonId is required for recompute-season' },
          { status: 400 }
        );
      }

      const result = await recomputeSeasonLicenses(seasonId);
      return NextResponse.json({ success: true, ...result });
    }

    if (!licenseId) {
      return NextResponse.json(
        { error: 'License ID is required' },
        { status: 400 }
      );
    }

    await sql`
      UPDATE licenses
      SET 
        is_suspended = ${isSuspended},
        suspended_at = ${isSuspended ? new Date().toISOString() : null},
        updated_at = NOW()
      WHERE id = ${licenseId}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating license:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
