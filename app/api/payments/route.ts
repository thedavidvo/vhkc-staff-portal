import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db';
import {
  createPayment,
  getPaymentsByRound,
  getPaymentsByDriver,
  getPaymentsBySeason,
  updatePayment,
  deletePayment,
  Payment,
} from '@/lib/dbService';

function isMissingPaymentsTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return (
    message.includes('relation "payments" does not exist') ||
    message.includes("relation 'payments' does not exist")
  );
}

export async function GET(request: NextRequest) {
  const runQuery = async () => {
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
    }

    return NextResponse.json({ error: 'roundId, driverId, or seasonId required' }, { status: 400 });
  };

  try {
    return await runQuery();
  } catch (error) {
    if (isMissingPaymentsTableError(error)) {
      try {
        await initializeDatabase();
        return await runQuery();
      } catch (bootstrapError) {
        console.error('Failed to bootstrap payments table in GET /api/payments:', bootstrapError);
      }
    }

    console.error('Error in GET /api/payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

  try {
    await createPayment(payment);
    return NextResponse.json({ success: true, payment });
  } catch (error) {
    if (isMissingPaymentsTableError(error)) {
      try {
        await initializeDatabase();
        await createPayment(payment);
        return NextResponse.json({ success: true, payment });
      } catch (bootstrapError) {
        console.error('Failed to bootstrap payments table in POST /api/payments:', bootstrapError);
      }
    }

    console.error('Error in POST /api/payments:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const payment: Payment = await request.json();

  if (!payment.id) {
    return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
  }

  try {
    await updatePayment(payment);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isMissingPaymentsTableError(error)) {
      try {
        await initializeDatabase();
        await updatePayment(payment);
        return NextResponse.json({ success: true });
      } catch (bootstrapError) {
        console.error('Failed to bootstrap payments table in PUT /api/payments:', bootstrapError);
      }
    }

    console.error('Error in PUT /api/payments:', error);
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
  }

  try {
    await deletePayment(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isMissingPaymentsTableError(error)) {
      try {
        await initializeDatabase();
        await deletePayment(id);
        return NextResponse.json({ success: true });
      } catch (bootstrapError) {
        console.error('Failed to bootstrap payments table in DELETE /api/payments:', bootstrapError);
      }
    }

    console.error('Error in DELETE /api/payments:', error);
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
}
