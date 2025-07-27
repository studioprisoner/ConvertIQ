import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/connection';
import { user } from '@/db/schema/auth';
import { subscriptions, subscriptionPlans, usageTracking, planPrices } from '@/db/schema/subscriptions';
import { polar } from '@/lib/polar';
import { eq } from 'drizzle-orm';

// POST /api/sync-polar-subscription - Manually sync user's Polar subscription to local DB
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail = 'josh@studioprisoner.com' } = body;

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
    console.log(`🔄 Syncing Polar subscriptions for user: ${userEmail}`);

    // Find customer in Polar first
    let polarCustomer;
    try {
      // Try to find customer by email
      const customers = await polar.customers.list({
        email: userEmail,
        limit: 1
      });
      
      // Convert iterator to array
      const customersArray = [];
      for await (const customer of customers) {
        customersArray.push(customer);
      }
      
      if (customersArray.length > 0) {
        polarCustomer = customersArray[0];
        console.log(`👤 Found Polar customer:`, polarCustomer);
      } else {
        return NextResponse.json({
          success: false,
          error: 'No Polar customer found for this email'
        });
      }
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: `Failed to find Polar customer: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // Get customer's subscriptions from Polar
    try {
      const polarSubscriptions = await polar.subscriptions.list({
        customerId: (polarCustomer as any).id,
        limit: 10
      });

      // Convert iterator to array
      const subscriptionsArray = [];
      for await (const subscription of polarSubscriptions) {
        subscriptionsArray.push(subscription);
      }

      console.log(`📋 Found ${subscriptionsArray.length} Polar subscriptions`);

      if (subscriptionsArray.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No active subscriptions found in Polar'
        });
      }

      const results = [];

      for (const polarSubRaw of subscriptionsArray) {
        const polarSub = polarSubRaw as any;
        console.log(`🔍 Processing subscription:`, polarSub);

        // Check if we already have this subscription locally
        const existingLocal = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.polarSubscriptionId, polarSub.id))
          .limit(1);

        if (existingLocal.length > 0) {
          console.log(`⏭️ Subscription ${polarSub.id} already exists locally`);
          results.push({
            polarSubscriptionId: polarSub.id,
            status: 'already_exists',
            localSubscriptionId: existingLocal[0].id
          });
          continue;
        }

        // Find matching plan based on price ID
        const planQuery = await db
          .select({
            plan: subscriptionPlans,
          })
          .from(subscriptionPlans)
          .innerJoin(
            planPrices,
            eq(subscriptionPlans.id, planPrices.planId)
          )
          .where(eq(planPrices.polarPriceId, polarSub.priceId))
          .limit(1);

        let planId = null;
        if (planQuery.length > 0) {
          planId = planQuery[0].plan.id;
        } else {
          console.log(`⚠️ No local plan found for price ID: ${polarSub.priceId}`);
          // Try to find plan by slug in metadata
          if (polarSub.metadata?.planSlug) {
            const planBySlug = await db
              .select()
              .from(subscriptionPlans)
              .where(eq(subscriptionPlans.slug, polarSub.metadata.planSlug))
              .limit(1);
            
            if (planBySlug.length > 0) {
              planId = planBySlug[0].id;
              console.log(`✅ Found plan by slug: ${planBySlug[0].slug}`);
            }
          }
        }

        if (!planId) {
          console.log(`❌ Cannot create subscription without valid plan ID`);
          results.push({
            polarSubscriptionId: polarSub.id,
            status: 'error',
            error: 'No matching local plan found'
          });
          continue;
        }

        // Create local subscription
        const [localSub] = await db.insert(subscriptions).values({
          userId: userRecord.id,
          planId: planId,
          polarSubscriptionId: polarSub.id,
          polarCustomerId: (polarCustomer as any).id,
          polarProductId: polarSub.productId,
          polarPriceId: polarSub.priceId,
          status: polarSub.status as any,
          billingCycle: polarSub.metadata?.billingCycle || 'monthly',
          currentPeriodStart: new Date(polarSub.currentPeriodStart),
          currentPeriodEnd: new Date(polarSub.currentPeriodEnd),
          trialStart: polarSub.trialStart ? new Date(polarSub.trialStart) : null,
          trialEnd: polarSub.trialEnd ? new Date(polarSub.trialEnd) : null,
          cancelAtPeriodEnd: polarSub.cancelAtPeriodEnd || false,
          metadata: {
            polarData: polarSub,
            syncedAt: new Date().toISOString()
          }
        }).returning();

        // Initialize usage tracking
        await db.insert(usageTracking).values({
          userId: userRecord.id,
          subscriptionId: localSub.id,
          websiteCount: 0,
          scansThisMonth: 0,
          periodStart: new Date(polarSub.currentPeriodStart),
          periodEnd: new Date(polarSub.currentPeriodEnd),
        });

        console.log(`✅ Created local subscription: ${localSub.id}`);
        
        results.push({
          polarSubscriptionId: polarSub.id,
          status: 'created',
          localSubscriptionId: localSub.id,
          planId: planId
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Polar subscription sync completed',
        user: {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.name
        },
        polarCustomer: polarCustomer,
        results,
        summary: {
          total: results.length,
          created: results.filter(r => r.status === 'created').length,
          existing: results.filter(r => r.status === 'already_exists').length,
          errors: results.filter(r => r.status === 'error').length
        }
      });

    } catch (error) {
      console.error('❌ Error syncing subscriptions:', error);
      return NextResponse.json({
        success: false,
        error: `Failed to sync subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Sync failed:', error);
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