import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/connection';
import { subscriptions, subscriptionPlans } from '@/db/schema/subscriptions';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all subscriptions for this user (any status)
    const userSubscriptions = await db
      .select({
        subscription: subscriptions,
        plan: subscriptionPlans,
      })
      .from(subscriptions)
      .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.userId, session.user.id));

    // Get all plans available
    const allPlans = await db.select().from(subscriptionPlans);

    return NextResponse.json({
      userId: session.user.id,
      userEmail: session.user.email,
      subscriptions: userSubscriptions,
      availablePlans: allPlans,
      subscriptionCount: userSubscriptions.length,
    });
  } catch (error) {
    console.error('Debug subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to debug subscription' },
      { status: 500 }
    );
  }
}