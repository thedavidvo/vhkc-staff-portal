import { NextRequest, NextResponse } from 'next/server';
import { getPointsByRound, getPointsByDriver, getPointsBySeason, addPoints, updatePoints, deletePoints } from '@/lib/dbService';
import { cache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('roundId');
    const driverId = searchParams.get('driverId');
    const seasonId = searchParams.get('seasonId');
    
    if (roundId) {
      const cacheKey = `points:round:${roundId}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
      
      const points = await getPointsByRound(roundId);
      cache.set(cacheKey, points, 2 * 60 * 1000);
      return NextResponse.json(points);
    }
    
    if (driverId) {
      const cacheKey = `points:driver:${driverId}${seasonId ? `:${seasonId}` : ''}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
      
      const points = await getPointsByDriver(driverId, seasonId || undefined);
      cache.set(cacheKey, points, 2 * 60 * 1000);
      return NextResponse.json(points);
    }
    
    if (seasonId) {
      const cacheKey = `points:season:${seasonId}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
      
      const points = await getPointsBySeason(seasonId);
      cache.set(cacheKey, points, 2 * 60 * 1000);
      return NextResponse.json(points);
    }
    
    return NextResponse.json({ error: 'roundId, driverId, or seasonId required' }, { status: 400 });
  } catch (error) {
    console.error('Error in GET /api/points:', error);
    return NextResponse.json({ error: 'Failed to fetch points' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const points = await request.json();
    
    if (!points.id || !points.seasonId || !points.roundId || !points.driverId || !points.division || points.points === undefined) {
      return NextResponse.json({ error: 'id, seasonId, roundId, driverId, division, and points are required' }, { status: 400 });
    }
    
    await addPoints(points);
    
    // Invalidate cache
    cache.invalidate(`points:round:${points.roundId}`);
    cache.invalidate(`points:driver:${points.driverId}`);
    cache.invalidate(`points:season:${points.seasonId}`);
    cache.invalidatePattern('points:');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/points:', error);
    return NextResponse.json({ error: 'Failed to save points' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const points = await request.json();
    
    if (!points.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    
    await updatePoints(points);
    
    // Invalidate cache
    if (points.roundId) cache.invalidate(`points:round:${points.roundId}`);
    if (points.driverId) cache.invalidate(`points:driver:${points.driverId}`);
    if (points.seasonId) cache.invalidate(`points:season:${points.seasonId}`);
    cache.invalidatePattern('points:');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/points:', error);
    return NextResponse.json({ error: 'Failed to update points' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pointsId = searchParams.get('id');
    
    if (!pointsId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    
    await deletePoints(pointsId);
    
    // Invalidate cache
    cache.invalidatePattern('points:');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/points:', error);
    return NextResponse.json({ error: 'Failed to delete points' }, { status: 500 });
  }
}

