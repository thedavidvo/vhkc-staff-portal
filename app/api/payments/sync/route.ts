import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createPayment, getPaymentsBySeason, updatePayment, Payment, getDrivers } from '@/lib/dbService';

export async function POST(request: NextRequest) {
  try {
    const { seasonId, roundId, startDate, endDate } = await request.json();

    if (!seasonId || !roundId) {
      return NextResponse.json(
        { error: 'seasonId and roundId are required' },
        { status: 400 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Stripe API key not configured' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-11-17.clover',
    });

    // Fetch existing payments to avoid duplicates
    const existingPayments = await getPaymentsBySeason(seasonId);
    const existingStripeIds = new Set(
      existingPayments
        .filter(p => p.stripePaymentIntentId)
        .map(p => p.stripePaymentIntentId)
    );

    // Fetch drivers to match emails
    const drivers = await getDrivers(seasonId);
    const driversByEmail = new Map(
      drivers.map((d: any) => [d.email?.toLowerCase(), d])
    );

    // Prepare query parameters
    const queryParams: any = {
      limit: 100,
    };

    if (startDate) {
      queryParams.created = { gte: Math.floor(new Date(startDate).getTime() / 1000) };
    }
    if (endDate) {
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
      if (queryParams.created) {
        queryParams.created.lte = endTimestamp;
      } else {
        queryParams.created = { lte: endTimestamp };
      }
    }

    const results = {
      synced: 0,
      skipped: 0,
      unmatched: 0,
      conflicts: [] as any[],
    };

    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const params: any = { ...queryParams };
      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const paymentIntents = await stripe.paymentIntents.list(params);

      for (const pi of paymentIntents.data) {
        // Skip if already imported
        if (existingStripeIds.has(pi.id)) {
          results.skipped++;
          continue;
        }

        // Only import succeeded payments
        if (pi.status !== 'succeeded') {
          continue;
        }

        // Try to match driver by email
        const customerEmail = pi.receipt_email?.toLowerCase();
        
        if (!customerEmail) {
          results.unmatched++;
          continue;
        }

        const driver: any = driversByEmail.get(customerEmail);
        if (!driver) {
          results.unmatched++;
          results.conflicts.push({
            email: customerEmail,
            amount: pi.amount / 100,
            date: new Date(pi.created * 1000).toISOString(),
            reason: 'Driver not found',
          });
          continue;
        }

        // Check if payment already exists for this driver+round
        const existingPayment = existingPayments.find(
          p => p.driverId === driver.id && p.roundId === roundId
        );

        if (existingPayment) {
          // Conflict: payment exists but different Stripe ID
          results.conflicts.push({
            email: customerEmail,
            driverName: driver.name,
            existingAmount: existingPayment.amount,
            newAmount: pi.amount / 100,
            action: 'skip',
          });
          results.skipped++;
          continue;
        }

        // Create payment record
        const payment: Payment = {
          id: `payment-stripe-${pi.id}`,
          seasonId,
          roundId,
          driverId: driver.id,
          amount: pi.amount / 100,
          status: 'paid',
          paymentMethod: 'Stripe',
          stripePaymentIntentId: pi.id,
          paymentDate: new Date(pi.created * 1000).toISOString().split('T')[0],
          referenceNumber: pi.id,
          notes: `Imported from Stripe`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await createPayment(payment);
        results.synced++;
      }

      hasMore = paymentIntents.has_more;
      if (hasMore && paymentIntents.data.length > 0) {
        startingAfter = paymentIntents.data[paymentIntents.data.length - 1].id;
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('Error in POST /api/payments/sync:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync payments from Stripe' },
      { status: 500 }
    );
  }
}
