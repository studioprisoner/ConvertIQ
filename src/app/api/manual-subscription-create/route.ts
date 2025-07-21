import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/connection';
import { user } from '@/db/schema/auth';
import { subscriptions, subscriptionPlans, usageTracking, planPrices } from '@/db/schema/subscriptions';
import { eq } from 'drizzle-orm';

// POST /api/manual-subscription-create - Manually create a subscription for testing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail = 'josh@studioprisoner.com', planSlug = 'basic', billingCycle = 'monthly' } = body;

    // Get the user
    const userData = await db
      .select()
      .from(user)
      .where(eq(user.email, userEmail))
      .limit(1);

    if (userData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      });
    }

    const userRecord = userData[0];
    
    // Check if user already has an active subscription
    const existingSub = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userRecord.id))
      .limit(1);
      
    if (existingSub.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'User already has an active subscription'
      });
    }

    // Get the plan
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, planSlug))
      .limit(1);

    if (!plan) {
      return NextResponse.json({
        success: false,
        error: `Plan ${planSlug} not found`
      });
    }

    // Get the price ID
    const [price] = await db
      .select()
      .from(planPrices)
      .where(eq(planPrices.planId, plan.id))
      .where(eq(planPrices.billingInterval, billingCycle))
      .limit(1);

    if (!price) {
      return NextResponse.json({
        success: false,
        error: `Price for ${planSlug} ${billingCycle} not found`
      });
    }

    console.log(`🆕 Creating manual subscription for ${userEmail}: ${planSlug} (${billingCycle})`);

    // Create the subscription
    const now = new Date();
    const nextPeriod = new Date(now);
    nextPeriod.setMonth(nextPeriod.getMonth() + (billingCycle === 'annual' ? 12 : 1));

    const [subscription] = await db.insert(subscriptions).values({
      userId: userRecord.id,
      planId: plan.id,
      polarSubscriptionId: `manual_sub_${Date.now()}`,
      polarCustomerId: `manual_customer_${userRecord.id}`,
      polarProductId: `manual_product_${planSlug}`,
      polarPriceId: price.polarPriceId,
      status: 'active',
      billingCycle: billingCycle,
      currentPeriodStart: now,
      currentPeriodEnd: nextPeriod,
      trialStart: null,
      trialEnd: null,
      cancelAtPeriodEnd: false,
      metadata: {
        createdBy: 'manual',
        reason: 'Testing after successful Polar payment',
        planSlug,
        billingCycle
      }
    }).returning();

    // Initialize usage tracking
    await db.insert(usageTracking).values({
      userId: userRecord.id,
      subscriptionId: subscription.id,
      websiteCount: 0,
      scansThisMonth: 0,
      periodStart: now,
      periodEnd: nextPeriod,
    });

    console.log(`✅ Created manual subscription: ${subscription.id}`);

    return NextResponse.json({
      success: true,
      message: 'Manual subscription created successfully',
      subscription: {
        id: subscription.id,
        planName: plan.name,
        planSlug: plan.slug,
        billingCycle: subscription.billingCycle,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd
      }
    });

  } catch (error) {
    console.error('❌ Manual subscription creation failed:', error);
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