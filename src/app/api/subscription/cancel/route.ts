import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/db/connection';
import { subscriptions } from '@/db/schema/subscriptions';
import { eq } from 'drizzle-orm';

const POLAR_API_BASE = process.env.POLAR_API_URL || 'https://api.polar.sh';

export async function POST(request: NextRequest) {
  try {
    // Get the session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the user's current subscription
    const [userSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, session.user.id))
      .limit(1);

    if (!userSubscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    if (!userSubscription.polarSubscriptionId) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // Cancel the subscription via Polar API
    const cancelResponse = await fetch(`${POLAR_API_BASE}/v1/subscriptions/${userSubscription.polarSubscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancel_at_period_end: true, // Cancel at the end of current billing period
      }),
    });

    if (!cancelResponse.ok) {
      const errorData = await cancelResponse.text();
      console.error('Polar cancellation failed:', errorData);
      return NextResponse.json(
        { error: 'Failed to cancel subscription' },
        { status: 500 }
      );
    }

    const canceledSubscription = await cancelResponse.json();

    // Update our local database
    await db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, userSubscription.id));

    console.log('Subscription canceled successfully:', {
      subscriptionId: userSubscription.polarSubscriptionId,
      userId: session.user.id,
      cancelAtPeriodEnd: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of your current billing period',
      subscription: {
        ...userSubscription,
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      },
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}