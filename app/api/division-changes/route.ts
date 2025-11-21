import { NextRequest, NextResponse } from 'next/server';
import { 
  getDivisionChangesByRound, 
  getDivisionChangesBySeason, 
  addDivisionChange,
  deleteDivisionChange,
  updatePoints
} from '@/lib/dbService';
import { cache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('roundId');
    const seasonId = searchParams.get('seasonId');
    const driverId = searchParams.get('driverId');
    
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
      const cacheKey = `division-changes:season:${seasonId}${driverId ? `:${driverId}` : ''}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
      
      const changes = await getDivisionChangesBySeason(seasonId);
      // Filter by driverId if provided
      const filteredChanges = driverId 
        ? changes.filter((c: any) => c.driverId === driverId)
        : changes;
      
      cache.set(cacheKey, filteredChanges, 2 * 60 * 1000);
      return NextResponse.json(filteredChanges);
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
        !change.driverName || !change.changeType) {
      return NextResponse.json({ 
        error: 'id, seasonId, roundId, driverId, driverName, and changeType are required' 
      }, { status: 400 });
    }
    
    // Validate based on change type
    if ((change.changeType === 'promotion' || change.changeType === 'demotion') && 
        (!change.fromDivision || !change.toDivision)) {
      return NextResponse.json({ 
        error: 'fromDivision and toDivision are required for promotion/demotion' 
      }, { status: 400 });
    }
    
    if ((change.changeType === 'division_start' || change.changeType === 'mid_season_join') && 
        !change.divisionStart) {
      return NextResponse.json({ 
        error: 'divisionStart is required for division_start and mid_season_join' 
      }, { status: 400 });
    }
    
    await addDivisionChange(change);
    
    // Handle points adjustments if provided
    if (change.pointsAdjustments && Object.keys(change.pointsAdjustments).length > 0) {
      const { getPointsByDriver } = await import('@/lib/dbService');
      try {
        const allPoints = await getPointsByDriver(change.driverId, change.seasonId);
        for (const [pointId, points] of Object.entries(change.pointsAdjustments)) {
          const pointToUpdate = allPoints.find((p: any) => p.id === pointId);
          if (pointToUpdate) {
            await updatePoints({
              ...pointToUpdate,
              points: points as number,
            });
          }
        }
        // Invalidate points cache
        cache.invalidatePattern('points:');
      } catch (error) {
        console.error('Failed to update points adjustments:', error);
        // Don't fail the entire request if points update fails
      }
    }
    
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
    const seasonId = searchParams.get('seasonId');
    
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    
    // Get the change before deleting to invalidate specific caches
    let changeToDelete = null;
    if (seasonId) {
      const changes = await getDivisionChangesBySeason(seasonId);
      changeToDelete = changes.find((c: any) => c.id === id);
    }
    
    await deleteDivisionChange(id);
    
    // Invalidate cache
    if (changeToDelete) {
      cache.invalidate(`division-changes:round:${changeToDelete.roundId}`);
      cache.invalidate(`division-changes:season:${changeToDelete.seasonId}`);
    }
    cache.invalidatePattern('division-changes:');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/division-changes:', error);
    return NextResponse.json({ error: 'Failed to delete division change' }, { status: 500 });
  }
}


