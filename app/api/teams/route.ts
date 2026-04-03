import { NextRequest, NextResponse } from 'next/server';
import { getTeamsBySeason, addTeam, updateTeam, deleteTeam } from '@/lib/dbService';
import { cache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    
    if (!seasonId) {
      return NextResponse.json({ error: 'seasonId required' }, { status: 400 });
    }
    
    const cacheKey = `teams:${seasonId}`;
    
    // Try to get from cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
    
    const teams = await getTeamsBySeason(seasonId);
    
    // Cache for 3 minutes
    cache.set(cacheKey, teams, 3 * 60 * 1000);
    
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error in GET /api/teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    
    if (!seasonId) {
      return NextResponse.json({ error: 'seasonId required' }, { status: 400 });
    }
    
    const team = await request.json();
    await addTeam(team, seasonId);
    
    // Invalidate cache
    cache.invalidate(`teams:${seasonId}`);
    cache.invalidatePattern('teams:');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/teams:', error);
    return NextResponse.json({ error: 'Failed to add team' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    
    if (!seasonId) {
      return NextResponse.json({ error: 'seasonId required' }, { status: 400 });
    }
    
    const team = await request.json();
    await updateTeam(team);
    
    // Invalidate cache
    if (seasonId) {
      cache.invalidate(`teams:${seasonId}`);
    }
    cache.invalidatePattern('teams:');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/teams:', error);
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    
    if (!teamId) {
      return NextResponse.json({ error: 'teamId required' }, { status: 400 });
    }
    
    await deleteTeam(teamId);
    
    // Invalidate cache
    cache.invalidatePattern('teams:');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/teams:', error);
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
}

