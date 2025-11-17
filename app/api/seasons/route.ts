import { NextRequest, NextResponse } from 'next/server';
import { getSeasons, addSeason, updateSeason, deleteSeason } from '@/lib/dbService';
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
    await addSeason(season);
    
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

