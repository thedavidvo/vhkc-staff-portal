import { NextRequest, NextResponse } from 'next/server';
import {
  createPayment,
  getPaymentsByRound,
  getPaymentsByDriver,
  getPaymentsBySeason,
  updatePayment,
  deletePayment,
  Payment,
} from '@/lib/dbService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('roundId');
    const driverId = searchParams.get('driverId');
    const seasonId = searchParams.get('seasonId');

    if (roundId) {
      const payments = await getPaymentsByRound(roundId);
      return NextResponse.json(payments);
    } else if (driverId) {
      const payments = await getPaymentsByDriver(driverId);
      return NextResponse.json(payments);
    } else if (seasonId) {
      const payments = await getPaymentsBySeason(seasonId);
      return NextResponse.json(payments);
    } else {
      return NextResponse.json({ error: 'roundId, driverId, or seasonId required' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in GET /api/payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payment: Payment = await request.json();

    if (!payment.id) {
      payment.id = `payment-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }

    if (!payment.seasonId || !payment.roundId || !payment.driverId || !payment.amount) {
      return NextResponse.json(
        { error: 'seasonId, roundId, driverId, and amount are required' },
        { status: 400 }
      );
    }

    await createPayment(payment);
    return NextResponse.json({ success: true, payment });
  } catch (error) {
    console.error('Error in POST /api/payments:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payment: Payment = await request.json();

    if (!payment.id) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    await updatePayment(payment);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/payments:', error);
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    await deletePayment(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/payments:', error);
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
}
