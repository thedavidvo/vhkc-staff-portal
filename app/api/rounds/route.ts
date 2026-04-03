import { NextRequest, NextResponse } from 'next/server';
import { getRoundsBySeason, getRaceResultsByRound, addRound, updateRound, deleteRound } from '@/lib/dbService';
import { cache } from '@/lib/cache';

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
    
    const cacheKey = `rounds:${seasonId}`;
    
    // Try to get from cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
    
    const rounds = await getRoundsBySeason(seasonId);
    
    // Cache for 2 minutes
    cache.set(cacheKey, rounds, 2 * 60 * 1000);
    
    return NextResponse.json(rounds);
  } catch (error) {
    console.error('Error in GET /api/rounds:', error);
    // Return empty array instead of error to prevent UI issues
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    
    if (!seasonId) {
      return NextResponse.json({ error: 'seasonId required' }, { status: 400 });
    }
    
    const round = await request.json();
    await addRound(round, seasonId);
    
    // Invalidate cache
    cache.invalidate(`rounds:${seasonId}`);
    cache.invalidate('seasons'); // Also invalidate seasons cache since they include rounds
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/rounds:', error);
    return NextResponse.json({ error: 'Failed to add round' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    
    if (!seasonId) {
      return NextResponse.json({ error: 'seasonId required' }, { status: 400 });
    }
    
    const round = await request.json();
    await updateRound(round, seasonId);
    
    // Invalidate cache
    cache.invalidate(`rounds:${seasonId}`);
    cache.invalidate('seasons');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/rounds:', error);
    return NextResponse.json({ error: 'Failed to update round' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('roundId');
    const seasonId = searchParams.get('seasonId');
    
    if (!roundId) {
      return NextResponse.json({ error: 'roundId required' }, { status: 400 });
    }
    
    await deleteRound(roundId);
    
    // Invalidate cache
    if (seasonId) {
      cache.invalidate(`rounds:${seasonId}`);
    }
    cache.invalidate('seasons');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/rounds:', error);
    return NextResponse.json({ error: 'Failed to delete round' }, { status: 500 });
  }
}

