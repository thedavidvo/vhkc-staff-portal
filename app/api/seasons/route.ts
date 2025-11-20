import { NextRequest, NextResponse } from 'next/server';
import { getSeasons, addSeason, updateSeason, deleteSeason, getDriversBySeason, addDriver } from '@/lib/dbService';
import { cache } from '@/lib/cache';

const CACHE_KEY = 'seasons';

export async function GET() {
  try {
    // Try to get from cache first
    const cached = cache.get(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    // If not cached, fetch from database
    const seasons = await getSeasons();
    
    // Cache the result for 5 minutes
    cache.set(CACHE_KEY, seasons, 5 * 60 * 1000);
    
    return NextResponse.json(seasons);
  } catch (error: any) {
    console.error('Error in GET /api/seasons:', error);
    // Return empty array instead of error to allow app to start
    // This is important when database is not yet configured
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const season = await request.json();
    
    // Get all existing seasons BEFORE creating the new one to find the previous season
    const existingSeasons = await getSeasons();
    
    // Sort seasons by start_date (most recent first), then by name as fallback
    const sortedSeasons = existingSeasons.sort((a, b) => {
      if (a.startDate && b.startDate) {
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      }
      if (a.startDate) return -1;
      if (b.startDate) return 1;
      return b.name.localeCompare(a.name);
    });
    
    // Get the most recent season (this will be the "previous" season)
    const previousSeason = sortedSeasons.length > 0 ? sortedSeasons[0] : null;
    
    // Create the new season
    await addSeason(season);
    
    // If there's a previous season, copy all drivers from it to the new season
    if (previousSeason) {
      try {
        const previousDrivers = await getDriversBySeason(previousSeason.id);
        
        // Copy each driver to the new season with a new ID but preserving their state
        for (let i = 0; i < previousDrivers.length; i++) {
          const driver = previousDrivers[i];
          
          // Generate a unique ID for the driver in the new season
          const timestamp = Date.now();
          const random = Math.random().toString(36).substr(2, 9);
          const index = i.toString().padStart(4, '0');
          const newDriverId = `driver-${timestamp}-${random}-${index}`;
          
          // Create a new driver object with the same properties but new ID and season
          const newDriver = {
            ...driver,
            id: newDriverId,
            lastUpdated: new Date().toISOString(),
          };
          
          // Add the driver to the new season
          await addDriver(newDriver, season.id);
        }
        
        // Invalidate drivers cache for the new season
        cache.invalidate(`drivers:${season.id}`);
        cache.invalidatePattern('drivers:');
      } catch (driverError) {
        console.error('Error copying drivers from previous season:', driverError);
        // Don't fail the season creation if driver copying fails
      }
    }
    
    // Invalidate cache
    cache.invalidate(CACHE_KEY);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/seasons:', error);
    return NextResponse.json({ error: 'Failed to add season' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const season = await request.json();
    await updateSeason(season);
    
    // Invalidate cache
    cache.invalidate(CACHE_KEY);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/seasons:', error);
    return NextResponse.json({ error: 'Failed to update season' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    if (!seasonId) {
      return NextResponse.json({ error: 'seasonId required' }, { status: 400 });
    }
    await deleteSeason(seasonId);
    
    // Invalidate cache
    cache.invalidate(CACHE_KEY);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/seasons:', error);
    return NextResponse.json({ error: 'Failed to delete season' }, { status: 500 });
  }
}

