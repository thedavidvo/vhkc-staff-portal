import { NextRequest, NextResponse } from 'next/server';
import { getRaceResultsByRound, addRaceResult, updateRaceResult, deleteRaceResultsByRaceType } from '@/lib/sheetsDataService';
import { cache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('roundId');
    
    if (!roundId) {
      return NextResponse.json({ error: 'roundId required' }, { status: 400 });
    }
    
    const cacheKey = `race-results:${roundId}`;
    
    // Try to get from cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
    
    const results = await getRaceResultsByRound(roundId);
    
    // Cache results for 1 minute (race results change frequently)
    cache.set(cacheKey, results, 1 * 60 * 1000);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in GET /api/race-results:', error);
    return NextResponse.json({ error: 'Failed to fetch race results' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { roundId, driverId, division, raceType, finalType, points } = body;
    
    if (!roundId || !driverId || !division || !raceType) {
      return NextResponse.json({ error: 'roundId, driverId, division, and raceType required' }, { status: 400 });
    }
    
    // Get the existing result first to preserve other fields
    const existingResults = await getRaceResultsByRound(roundId);
    let existingResult: any = null;
    
    if (existingResults) {
      for (const divisionResult of existingResults) {
      if (divisionResult.division === division) {
        const found = divisionResult.results?.find((r: any) => 
          r.driverId === driverId && 
          r.raceType === raceType && 
          (r.finalType || '') === (finalType || '')
        );
        if (found) {
          existingResult = found;
          break;
        }
      }
      }
    }
    
    if (!existingResult) {
      return NextResponse.json({ error: 'Race result not found' }, { status: 404 });
    }
    
    // Update with new points while preserving other fields
    await updateRaceResult(roundId, driverId, {
      ...existingResult,
      division,
      raceType,
      finalType,
      points,
    });
    
    // Invalidate cache for this round and related caches
    cache.invalidate(`race-results:${roundId}`);
    cache.invalidate(`round-results:${roundId}`);
    cache.invalidatePattern('drivers:');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/race-results:', error);
    return NextResponse.json({ error: 'Failed to update race result points' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await request.json();
    await addRaceResult(result);
    
    // Invalidate cache for this round and related caches
    if (result.roundId) {
      cache.invalidate(`race-results:${result.roundId}`);
      cache.invalidate(`round-results:${result.roundId}`);
      // Invalidate drivers cache if we have the season
      cache.invalidatePattern('drivers:');
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/race-results:', error);
    return NextResponse.json({ error: 'Failed to add race result' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('roundId');
    const driverId = searchParams.get('driverId');
    const raceType = searchParams.get('raceType');
    const finalType = searchParams.get('finalType');
    
    if (!roundId || !driverId) {
      return NextResponse.json({ error: 'roundId and driverId required' }, { status: 400 });
    }
    
    const result = await request.json();
    // Use raceType from URL params if provided, otherwise from body
    if (!result.raceType && !raceType) {
      return NextResponse.json({ error: 'raceType is required' }, { status: 400 });
    }
    // Ensure the body has raceType and finalType for proper matching
    if (raceType) result.raceType = raceType;
    if (finalType) result.finalType = finalType;
    
    await updateRaceResult(roundId, driverId, result);
    
    // Invalidate cache for this round and related caches
    cache.invalidate(`race-results:${roundId}`);
    cache.invalidate(`round-results:${roundId}`);
    cache.invalidatePattern('drivers:');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/race-results:', error);
    return NextResponse.json({ error: 'Failed to update race result' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('roundId');
    const raceType = searchParams.get('raceType');
    
    if (!roundId || !raceType) {
      return NextResponse.json({ error: 'roundId and raceType required' }, { status: 400 });
    }
    
    await deleteRaceResultsByRaceType(roundId, raceType);
    
    // Invalidate cache for this round and related caches
    cache.invalidate(`race-results:${roundId}`);
    cache.invalidate(`round-results:${roundId}`);
    cache.invalidatePattern('drivers:');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/race-results:', error);
    return NextResponse.json({ error: 'Failed to delete race results' }, { status: 500 });
  }
}

