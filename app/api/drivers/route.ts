import { NextRequest, NextResponse } from 'next/server';
import { getDriversBySeason, getDriverPointsBySeason, addDriver, updateDriver } from '@/lib/sheetsDataService';
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
    
    // Calculate points for each driver from race results
    const driversWithPoints = await Promise.all(
      drivers.map(async driver => ({
        ...driver,
        pointsTotal: await getDriverPointsBySeason(driver.id, seasonId),
      }))
    );
    
    // Cache the result for 3 minutes (drivers change more frequently)
    cache.set(cacheKey, driversWithPoints, 3 * 60 * 1000);
    
    return NextResponse.json(driversWithPoints);
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
    
    // Invalidate driver cache for this season
    cache.invalidate(`drivers:${seasonId}`);
    
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
    await updateDriver(driver, seasonId);
    
    // Invalidate driver cache for this season
    cache.invalidate(`drivers:${seasonId}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/drivers:', error);
    return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 });
  }
}

