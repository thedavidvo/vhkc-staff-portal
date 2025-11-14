import { NextRequest, NextResponse } from 'next/server';
import { getLocations, addLocation, updateLocation, deleteLocation } from '@/lib/sheetsDataService';

export async function GET() {
  try {
    const locations = await getLocations();
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
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/locations:', error);
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
  }
}

