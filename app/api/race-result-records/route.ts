import { NextRequest, NextResponse } from 'next/server';
import { addRaceResultRecords, getRaceResultRecordsByRound, updateRaceResultRecordByFields, RaceResultRecord } from '@/lib/sheetsDataService';
import { cache } from '@/lib/cache';
import { Division } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('roundId');
    const seasonId = searchParams.get('seasonId');
    
    // If seasonId is provided, fetch all records for that season
    if (seasonId) {
      const { getRaceResultRecordsBySeason } = await import('@/lib/sheetsDataService');
      const cacheKey = `race-result-records:season:${seasonId}`;
      
      // Try to get from cache first
      const cached = cache.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
      
      const records = await getRaceResultRecordsBySeason(seasonId);
      
      // Cache results for 1 minute
      cache.set(cacheKey, records, 1 * 60 * 1000);
      
      return NextResponse.json(records);
    }
    
    // Otherwise, require roundId
    if (!roundId) {
      return NextResponse.json({ error: 'roundId or seasonId required' }, { status: 400 });
    }
    
    const cacheKey = `race-result-records:${roundId}`;
    
    // Try to get from cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
    
    const records = await getRaceResultRecordsByRound(roundId);
    
    // Cache results for 1 minute
    cache.set(cacheKey, records, 1 * 60 * 1000);
    
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error in GET /api/race-result-records:', error);
    return NextResponse.json({ error: 'Failed to fetch race result records' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('roundId');
    const driverId = searchParams.get('driverId');
    const division = searchParams.get('division') as Division;
    const raceType = searchParams.get('raceType');
    const finalType = searchParams.get('finalType') || '';
    
    if (!roundId || !driverId || !division || !raceType) {
      return NextResponse.json({ error: 'roundId, driverId, division, and raceType are required' }, { status: 400 });
    }
    
    const updates = await request.json();
    
    await updateRaceResultRecordByFields(roundId, driverId, division, raceType, finalType, updates);
    
    // Invalidate cache for race result records
    cache.invalidate(`race-result-records:${roundId}`);
    cache.invalidatePattern('race-result-records:');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/race-result-records:', error);
    return NextResponse.json({ error: 'Failed to update race result record' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const records = await request.json();
    
    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'Records array is required' }, { status: 400 });
    }
    
    // Validate records structure
    for (const record of records) {
      if (!record.seasonId || !record.roundId || !record.division || !record.raceType || !record.driverId) {
        return NextResponse.json({ error: 'Missing required fields in record' }, { status: 400 });
      }
    }
    
    await addRaceResultRecords(records);
    
    // Invalidate cache for race result records
    if (records[0]?.seasonId) {
      cache.invalidatePattern('race-result-records:');
    }
    
    return NextResponse.json({ success: true, count: records.length });
  } catch (error) {
    console.error('Error in POST /api/race-result-records:', error);
    return NextResponse.json({ error: 'Failed to add race result records' }, { status: 500 });
  }
}
