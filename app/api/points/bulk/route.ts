import { NextRequest, NextResponse } from 'next/server';
import { addPointsBulk } from '@/lib/dbService';
import { cache } from '@/lib/cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pointsList = Array.isArray(body?.points) ? body.points : [];

    if (pointsList.length === 0) {
      return NextResponse.json({ error: 'points array is required' }, { status: 400 });
    }

    for (const points of pointsList) {
      if (!points.id || !points.seasonId || !points.roundId || !points.driverId || !points.division || points.points === undefined) {
        return NextResponse.json(
          { error: 'Each point must include id, seasonId, roundId, driverId, division, and points' },
          { status: 400 }
        );
      }
    }

    await addPointsBulk(pointsList);

    // Invalidate all points caches touched by bulk save
    cache.invalidatePattern('points:');

    return NextResponse.json({ success: true, count: pointsList.length });
  } catch (error) {
    console.error('Error in POST /api/points/bulk:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to save points';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
