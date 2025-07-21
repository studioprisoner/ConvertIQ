import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/connection';
import { user } from '@/db/schema/auth';
import { subscriptions, subscriptionPlans } from '@/db/schema/subscriptions';
import { eq } from 'drizzle-orm';

// GET /api/debug-user-subscription - Debug user subscription details
export async function GET(request: NextRequest) {
  try {
    // Get the user josh@studioprisoner.com
    const userData = await db
      .select()
      .from(user)
      .where(eq(user.email, 'josh@studioprisoner.com'))
      .limit(1);

    if (userData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      });
    }

    const userRecord = userData[0];

    // Get all subscriptions for this user
    const userSubscriptions = await db
      .select({
        subscription: subscriptions,
        plan: subscriptionPlans
      })
      .from(subscriptions)
      .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.userId, userRecord.id));

    return NextResponse.json({
      success: true,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        createdAt: userRecord.createdAt
      },
      subscriptions: userSubscriptions.map(sub => ({
        id: sub.subscription.id,
        status: sub.subscription.status,
        polarSubscriptionId: sub.subscription.polarSubscriptionId,
        polarCustomerId: sub.subscription.polarCustomerId,
        polarProductId: sub.subscription.polarProductId,
        polarPriceId: sub.subscription.polarPriceId,
        billingCycle: sub.subscription.billingCycle,
        createdAt: sub.subscription.createdAt,
        plan: sub.plan ? {
          name: sub.plan.name,
          slug: sub.plan.slug
        } : null
      }))
    });

  } catch (error) {
    console.error('❌ Debug failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      },
      { status: 500 }
    );
  }
}