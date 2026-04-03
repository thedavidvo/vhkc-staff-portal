import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET - Fetch licenses
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const suspended = searchParams.get('suspended');

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

    // Calculate active points (non-expired) for each license
    const licensesWithActivePoints = await Promise.all(
      rows.map(async (license: any) => {
        const historyRows = await sql`
          SELECT SUM(points_added) as active_points
          FROM license_points_history
          WHERE driver_id = ${license.driver_id}
          AND is_expired = false
          AND expires_at > NOW()
        ` as any[];

        const activePoints = historyRows[0]?.active_points || 0;

        return {
          ...license,
          activePoints: parseInt(activePoints),
          isSuspended: Boolean(license.is_suspended),
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
    const body = await request.json();
    const { driverId, incidentId, incidentPoints, incidentDate } = body;

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

    const existingIncident = await sql`
      SELECT id FROM incidents WHERE id = ${incidentId}
    ` as any[];

    if (existingIncident.length === 0) {
      return NextResponse.json(
        { error: 'Incident does not exist for license history update' },
        { status: 400 }
      );
    }

    // Add to history with expiration date (1 year from incident date)
    const historyId = `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const incident_date = incidentDate ? new Date(incidentDate) : new Date();
    const expires_at = new Date(incident_date);
    expires_at.setFullYear(expires_at.getFullYear() + 1);

    // Get current active points
    const currentPoints = await sql`
      SELECT COALESCE(SUM(points_added), 0) as total
      FROM license_points_history
      WHERE driver_id = ${driverId}
      AND is_expired = false
      AND expires_at > NOW()
    ` as any[];

    const pointsAtTime = parseInt(currentPoints[0]?.total || '0') + incidentPoints;

    await sql`
      INSERT INTO license_points_history (
        id, license_id, driver_id, incident_id, points_added, 
        points_at_time, incident_date, expires_at, is_expired, created_at
      )
      VALUES (
        ${historyId}, ${license.id}, ${driverId}, ${incidentId}, ${incidentPoints},
        ${pointsAtTime}, ${incident_date.toISOString()}, ${expires_at.toISOString()}, false, NOW()
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
    const { licenseId, isSuspended } = body;

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
