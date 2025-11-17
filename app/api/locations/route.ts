import { NextRequest, NextResponse } from 'next/server';
import { getLocations, addLocation, updateLocation, deleteLocation } from '@/lib/dbService';
import { cache } from '@/lib/cache';

const CACHE_KEY = 'locations';

export async function GET() {
  try {
    // Try to get from cache first
    const cached = cache.get(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }
    
    const locations = await getLocations();
    
    // Cache for 5 minutes (locations don't change often)
    cache.set(CACHE_KEY, locations, 5 * 60 * 1000);
    
    return NextResponse.json(locations);
  } catch (error) {
    console.error('Error in GET /api/locations:', error);
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const location = await request.json();
    await addLocation(location);
    
    // Invalidate cache
    cache.invalidate(CACHE_KEY);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/locations:', error);
    return NextResponse.json({ error: 'Failed to add location' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const location = await request.json();
    await updateLocation(location);
    
    // Invalidate cache
    cache.invalidate(CACHE_KEY);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/locations:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    if (!locationId) {
      return NextResponse.json({ error: 'locationId required' }, { status: 400 });
    }
    await deleteLocation(locationId);
    
    // Invalidate cache
    cache.invalidate(CACHE_KEY);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/locations:', error);
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
  }
}

