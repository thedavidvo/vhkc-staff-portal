import { NextRequest, NextResponse } from 'next/server';
import { getRaceResultsByRound, addRaceResult, updateRaceResult } from '@/lib/sheetsDataService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('roundId');
    
    if (!roundId) {
      return NextResponse.json({ error: 'roundId required' }, { status: 400 });
    }
    
    const results = await getRaceResultsByRound(roundId);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in GET /api/race-results:', error);
    return NextResponse.json({ error: 'Failed to fetch race results' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await request.json();
    await addRaceResult(result);
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
    
    if (!roundId || !driverId) {
      return NextResponse.json({ error: 'roundId and driverId required' }, { status: 400 });
    }
    
    const result = await request.json();
    await updateRaceResult(roundId, driverId, result);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/race-results:', error);
    return NextResponse.json({ error: 'Failed to update race result' }, { status: 500 });
  }
}

