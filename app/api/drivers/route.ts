import { NextRequest, NextResponse } from 'next/server';
import { getDriversBySeason, addDriver, updateDriver, deleteDriver } from '@/lib/dbService';
import { cache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    
    if (!seasonId) {
      return NextResponse.json({ error: 'seasonId required' }, { status: 400 });
    }
    
    const cacheKey = `drivers:${seasonId}`;
    
    // Try to get from cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
    
    const drivers = await getDriversBySeason(seasonId);
    
    // Cache the result for 3 minutes (drivers change more frequently)
    cache.set(cacheKey, drivers, 3 * 60 * 1000);
    
    return NextResponse.json(drivers);
  } catch (error) {
    console.error('Error in GET /api/drivers:', error);
    return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    
    if (!seasonId) {
      return NextResponse.json({ error: 'seasonId required' }, { status: 400 });
    }
    
    const driver = await request.json();
    await addDriver(driver, seasonId);
    
    // Invalidate cache
    cache.invalidate(`drivers:${seasonId}`);
    cache.invalidatePattern('drivers:');
    cache.invalidatePattern('division-changes:');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/drivers:', error);
    return NextResponse.json({ error: 'Failed to add driver' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    
    if (!seasonId) {
      return NextResponse.json({ error: 'seasonId required' }, { status: 400 });
    }
    
    const driver = await request.json();
    await updateDriver(driver);
    
    // Invalidate cache
    cache.invalidate(`drivers:${seasonId}`);
    cache.invalidatePattern('drivers:');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/drivers:', error);
    return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const seasonId = searchParams.get('seasonId');
    
    if (!driverId) {
      return NextResponse.json({ error: 'driverId required' }, { status: 400 });
    }
    
    // Delete the driver and all related data
    await deleteDriver(driverId);
    
    // Invalidate all relevant caches
    if (seasonId) {
      cache.invalidate(`drivers:${seasonId}`);
    }
    cache.invalidatePattern('drivers:');
    cache.invalidatePattern('race-results:');
    cache.invalidatePattern('points:');
    cache.invalidatePattern('checkins:');
    cache.invalidatePattern('division-changes:');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/drivers:', error);
    return NextResponse.json({ error: 'Failed to delete driver' }, { status: 500 });
  }
}

