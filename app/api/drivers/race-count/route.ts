import { NextRequest, NextResponse } from 'next/server';
import { getDriverRaceCount } from '@/lib/dbService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const driverId = searchParams.get('driverId');
    const seasonId = searchParams.get('seasonId');

    if (!driverId || !seasonId) {
      return NextResponse.json(
        { error: 'driverId and seasonId are required' },
        { status: 400 }
      );
    }

    const raceCount = await getDriverRaceCount(driverId, seasonId);
    
    return NextResponse.json({ raceCount, driverId, seasonId });
  } catch (error) {
    console.error('Failed to get race count:', error);
    return NextResponse.json(
      { error: 'Failed to get race count' },
      { status: 500 }
    );
  }
}
