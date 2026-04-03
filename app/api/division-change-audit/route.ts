import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      changeId,
      driverId,
      oldDivision,
      newDivision,
      wasLocked,
      raceCountAtChange,
      reason,
      changedBy,
      changedAt,
    } = body;

    if (!changeId || !driverId || !oldDivision || !newDivision) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO division_change_audit (
        change_id,
        driver_id,
        old_division,
        new_division,
        was_locked,
        race_count_at_change,
        reason,
        changed_by,
        changed_at
      ) VALUES (
        ${changeId},
        ${driverId},
        ${oldDivision},
        ${newDivision},
        ${wasLocked || false},
        ${raceCountAtChange || 0},
        ${reason || ''},
        ${changedBy || 'Unknown'},
        ${changedAt || new Date().toISOString()}
      )
    `;

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Failed to create audit entry:', error);
    return NextResponse.json(
      { error: 'Failed to create audit entry' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const changeId = searchParams.get('changeId');
    const driverId = searchParams.get('driverId');

    let query;
    if (changeId) {
      query = sql`
        SELECT * FROM division_change_audit
        WHERE change_id = ${changeId}
        ORDER BY changed_at DESC
      `;
    } else if (driverId) {
      query = sql`
        SELECT * FROM division_change_audit
        WHERE driver_id = ${driverId}
        ORDER BY changed_at DESC
      `;
    } else {
      query = sql`
        SELECT * FROM division_change_audit
        ORDER BY changed_at DESC
        LIMIT 100
      `;
    }

    const result = await query as any[];
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch audit entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit entries' },
      { status: 500 }
    );
  }
}
