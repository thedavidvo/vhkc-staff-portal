import { NextRequest, NextResponse } from 'next/server';
import { addRaceResultRecords } from '@/lib/sheetsDataService';
import { cache } from '@/lib/cache';

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
