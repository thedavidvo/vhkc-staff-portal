import { NextRequest, NextResponse } from 'next/server';
import { getRoundsBySeason, getRaceResultsByRound } from '@/lib/sheetsDataService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    const roundId = searchParams.get('roundId');
    
    if (roundId) {
      // Get race results for a specific round
      const results = await getRaceResultsByRound(roundId);
      return NextResponse.json(results);
    }
    
    if (!seasonId) {
      return NextResponse.json({ error: 'seasonId or roundId required' }, { status: 400 });
    }
    
    const rounds = await getRoundsBySeason(seasonId);
    return NextResponse.json(rounds);
  } catch (error) {
    console.error('Error in GET /api/rounds:', error);
    return NextResponse.json({ error: 'Failed to fetch rounds' }, { status: 500 });
  }
}

