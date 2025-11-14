import { NextRequest, NextResponse } from 'next/server';
import { getTeamsBySeason, addTeam, updateTeam, deleteTeam } from '@/lib/sheetsDataService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    
    if (!seasonId) {
      return NextResponse.json({ error: 'seasonId required' }, { status: 400 });
    }
    
    const teams = await getTeamsBySeason(seasonId);
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
    // Ensure seasonId matches
    team.seasonId = seasonId;
    await addTeam(team);
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
    // Ensure seasonId matches
    team.seasonId = seasonId;
    await updateTeam(team);
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
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/teams:', error);
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
}

