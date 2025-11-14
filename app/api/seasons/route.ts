import { NextRequest, NextResponse } from 'next/server';
import { getSeasons, addSeason, updateSeason, deleteSeason } from '@/lib/sheetsDataService';

export async function GET() {
  try {
    const seasons = await getSeasons();
    return NextResponse.json(seasons);
  } catch (error: any) {
    console.error('Error in GET /api/seasons:', error);
    // Return empty array instead of error to allow app to start
    // This is important when Google Sheets is not yet configured
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const season = await request.json();
    await addSeason(season);
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
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/seasons:', error);
    return NextResponse.json({ error: 'Failed to delete season' }, { status: 500 });
  }
}

