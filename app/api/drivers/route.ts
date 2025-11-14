import { NextRequest, NextResponse } from 'next/server';
import { getDriversBySeason, getDriverPointsBySeason, addDriver, updateDriver } from '@/lib/sheetsDataService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    
    if (!seasonId) {
      return NextResponse.json({ error: 'seasonId required' }, { status: 400 });
    }
    
    const drivers = await getDriversBySeason(seasonId);
    
    // Calculate points for each driver from race results
    const driversWithPoints = await Promise.all(
      drivers.map(async driver => ({
        ...driver,
        pointsTotal: await getDriverPointsBySeason(driver.id, seasonId),
      }))
    );
    
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
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/drivers:', error);
    return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 });
  }
}

