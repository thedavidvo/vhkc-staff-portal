import { NextRequest, NextResponse } from 'next/server';
import { getSeasons, addSeason, updateSeason, deleteSeason, getDriversBySeason, upsertSeasonDriverMembership } from '@/lib/dbService';
import { cache } from '@/lib/cache';
import { getSeasonNumber, isNewDivisionStructure } from '@/lib/divisions';

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
    
    // If there's a previous season, carry over roster memberships with reset season fields
    if (previousSeason) {
      try {
        const previousDrivers = await getDriversBySeason(previousSeason.id);
        const newSeasonNumber = getSeasonNumber(season.name);
        const defaultDivision = isNewDivisionStructure(newSeasonNumber) ? 'Rookies' : 'New';

        // Reset per-season values while keeping canonical driver identity.
        for (const driver of previousDrivers) {
          // Carry the driver's existing division if it still exists in the new structure;
          // otherwise fall back to the default for the new season.
          const carriedDivision = driver.division || defaultDivision;
          await upsertSeasonDriverMembership(season.id, driver.id, {
            division: carriedDivision,
            teamName: '',
            status: 'ACTIVE',
          });
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
    console.log('PUT /api/seasons - updating season:', season.id, 'with rounds:', season.rounds?.length);
    await updateSeason(season);
    
    // Invalidate cache
    cache.invalidate(CACHE_KEY);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/seasons:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update season';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
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

