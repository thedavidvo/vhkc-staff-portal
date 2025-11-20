import { NextRequest, NextResponse } from 'next/server';
import { 
  getDivisionChangesByRound, 
  getDivisionChangesBySeason, 
  addDivisionChange,
  deleteDivisionChange 
} from '@/lib/dbService';
import { cache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('roundId');
    const seasonId = searchParams.get('seasonId');
    
    if (roundId) {
      const cacheKey = `division-changes:round:${roundId}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
      
      const changes = await getDivisionChangesByRound(roundId);
      cache.set(cacheKey, changes, 2 * 60 * 1000);
      return NextResponse.json(changes);
    }
    
    if (seasonId) {
      const cacheKey = `division-changes:season:${seasonId}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
      
      const changes = await getDivisionChangesBySeason(seasonId);
      cache.set(cacheKey, changes, 2 * 60 * 1000);
      return NextResponse.json(changes);
    }
    
    return NextResponse.json({ error: 'roundId or seasonId required' }, { status: 400 });
  } catch (error) {
    console.error('Error in GET /api/division-changes:', error);
    return NextResponse.json({ error: 'Failed to fetch division changes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const change = await request.json();
    
    if (!change.id || !change.seasonId || !change.roundId || !change.driverId || 
        !change.driverName || !change.fromDivision || !change.toDivision || !change.changeType) {
      return NextResponse.json({ 
        error: 'id, seasonId, roundId, driverId, driverName, fromDivision, toDivision, and changeType are required' 
      }, { status: 400 });
    }
    
    await addDivisionChange(change);
    
    // Invalidate cache
    cache.invalidate(`division-changes:round:${change.roundId}`);
    cache.invalidate(`division-changes:season:${change.seasonId}`);
    cache.invalidatePattern('division-changes:');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/division-changes:', error);
    return NextResponse.json({ error: 'Failed to save division change' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    
    await deleteDivisionChange(id);
    
    // Invalidate cache
    cache.invalidatePattern('division-changes:');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/division-changes:', error);
    return NextResponse.json({ error: 'Failed to delete division change' }, { status: 500 });
  }
}


