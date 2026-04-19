import { NextRequest, NextResponse } from 'next/server';
import {
  createIncident,
  getIncidentsBySeason,
  getIncidentsByDriver,
  getIncidentsByRound,
  updateIncident,
  confirmIncidentAndDeductPoints,
  deleteIncident,
  Incident,
} from '@/lib/dbService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    const driverId = searchParams.get('driverId');
    const roundId = searchParams.get('roundId');

    if (seasonId) {
      const incidents = await getIncidentsBySeason(seasonId);
      return NextResponse.json(incidents);
    } else if (driverId) {
      const incidents = await getIncidentsByDriver(driverId);
      return NextResponse.json(incidents);
    } else if (roundId) {
      const incidents = await getIncidentsByRound(roundId);
      return NextResponse.json(incidents);
    } else {
      return NextResponse.json(
        { error: 'seasonId, driverId, or roundId required' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error in GET /api/incidents:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch incidents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    // Handle confirmation action
    if (action === 'confirm') {
      const { incidentId, confirmedBy, seasonId } = data;
      
      if (!incidentId || !confirmedBy || !seasonId) {
        return NextResponse.json(
          { error: 'incidentId, confirmedBy, and seasonId are required for confirmation' },
          { status: 400 }
        );
      }

      await confirmIncidentAndDeductPoints(incidentId, confirmedBy, seasonId);
      return NextResponse.json({ success: true, message: 'Incident confirmed and points deducted' });
    }

    // Regular incident creation
    const incident: Incident = data;

    if (!incident.id) {
      incident.id = `incident-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }

    if (!incident.seasonId || !incident.roundId || !incident.driverId || !incident.incidentType || !incident.description) {
      return NextResponse.json(
        { error: 'seasonId, roundId, driverId, incidentType, and description are required' },
        { status: 400 }
      );
    }

    if (incident.pointsToDeduct == null || incident.pointsToDeduct < 0) {
      return NextResponse.json(
        { error: 'pointsToDeduct must be 0 or a positive number' },
        { status: 400 }
      );
    }

    await createIncident(incident);
    return NextResponse.json({ success: true, incident });
  } catch (error: any) {
    console.error('Error in POST /api/incidents:', error);
    return NextResponse.json({ error: error.message || 'Failed to create incident' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const incident: Incident = await request.json();

    if (!incident.id) {
      return NextResponse.json({ error: 'Incident ID is required' }, { status: 400 });
    }

    await updateIncident(incident);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in PUT /api/incidents:', error);
    return NextResponse.json({ error: error.message || 'Failed to update incident' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Incident ID is required' }, { status: 400 });
    }

    await deleteIncident(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/incidents:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete incident' }, { status: 500 });
  }
}
