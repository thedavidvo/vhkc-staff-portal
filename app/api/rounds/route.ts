import { NextRequest, NextResponse } from 'next/server';
import { getRoundsBySeason, getRaceResultsByRound } from '@/lib/sheetsDataService';
import { cache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    const roundId = searchParams.get('roundId');
    
    if (roundId) {
      // Get race results for a specific round
      const cacheKey = `round-results:${roundId}`;
      
      // Try to get from cache first
      const cached = cache.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
      
      const results = await getRaceResultsByRound(roundId);
      
      // Cache results for 1 minute (race results change frequently)
      cache.set(cacheKey, results, 1 * 60 * 1000);
      
      return NextResponse.json(results);
    }
    
    if (!seasonId) {
      return NextResponse.json({ error: 'seasonId or roundId required' }, { status: 400 });
    }
    
    const cacheKey = `rounds:${seasonId}`;
    
    // Try to get from cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
    
    const rounds = await getRoundsBySeason(seasonId);
    
    // Cache rounds for 2 minutes
    cache.set(cacheKey, rounds, 2 * 60 * 1000);
    
    return NextResponse.json(rounds);
  } catch (error) {
    console.error('Error in GET /api/rounds:', error);
    return NextResponse.json({ error: 'Failed to fetch rounds' }, { status: 500 });
  }
}

