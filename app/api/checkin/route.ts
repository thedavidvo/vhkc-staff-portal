import { NextRequest, NextResponse } from 'next/server';
import { getCheckInsByRound, addCheckIn, deleteCheckIn } from '@/lib/dbService';
import { cache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('roundId');
    const driverId = searchParams.get('driverId');
    
    if (roundId && driverId) {
      const checkIns = await getCheckInsByRound(roundId);
      const checkIn = checkIns.find(c => c.driverId === driverId);
      return NextResponse.json(checkIn || null);
    } else if (roundId) {
      const cacheKey = `checkins:${roundId}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
      
      const checkIns = await getCheckInsByRound(roundId);
      cache.set(cacheKey, checkIns, 1 * 60 * 1000); // Cache for 1 minute
      return NextResponse.json(checkIns);
    } else {
      return NextResponse.json({ error: 'roundId required' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in GET /api/checkin:', error);
    return NextResponse.json({ error: 'Failed to fetch check ins' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const checkIn = await request.json();
    
    if (!checkIn.roundId || !checkIn.driverId || checkIn.checkedIn === undefined) {
      return NextResponse.json({ error: 'roundId, driverId, and checkedIn are required' }, { status: 400 });
    }
    
    if (!checkIn.id) {
      checkIn.id = `checkin-${checkIn.roundId}-${checkIn.driverId}`;
    }
    
    await addCheckIn(checkIn);
    
    // Invalidate cache
    cache.invalidate(`checkins:${checkIn.roundId}`);
    cache.invalidatePattern('checkins:');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/checkin:', error);
    return NextResponse.json({ error: 'Failed to save check in' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const checkIn = await request.json();
    
    if (!checkIn.roundId || !checkIn.driverId || checkIn.checkedIn === undefined) {
      return NextResponse.json({ error: 'roundId, driverId, and checkedIn are required' }, { status: 400 });
    }
    
    if (!checkIn.id) {
      checkIn.id = `checkin-${checkIn.roundId}-${checkIn.driverId}`;
    }
    
    // Use addCheckIn which handles both insert and update via ON CONFLICT
    await addCheckIn(checkIn);
    
    // Invalidate cache
    cache.invalidate(`checkins:${checkIn.roundId}`);
    cache.invalidatePattern('checkins:');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/checkin:', error);
    return NextResponse.json({ error: 'Failed to update check in' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkInId = searchParams.get('id');
    
    if (!checkInId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    
    await deleteCheckIn(checkInId);
    
    // Invalidate cache
    cache.invalidatePattern('checkins:');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/checkin:', error);
    return NextResponse.json({ error: 'Failed to delete check in' }, { status: 500 });
  }
}
