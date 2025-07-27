#!/usr/bin/env bun

/**
 * Manual sync script to find and sync Polar subscriptions for users
 * Run with: bun run src/scripts/sync-polar-subscriptions.ts
 */

import { db } from '@/db/connection';
import { polar } from '@/lib/polar';
import { user } from '@/db/schema/auth';
import { subscriptions, subscriptionPlans, usageTracking, subscriptionEvents } from '@/db/schema/subscriptions';
import { eq, and } from 'drizzle-orm';

async function syncPolarSubscriptions() {
  console.log('🔄 Syncing Polar Subscriptions...\n');
  
  try {
    // Get all users without subscriptions
    console.log('1. Finding users without subscriptions...');
    const allUsers = await db.select().from(user);
    
    const usersWithoutSubs = [];
    for (const userRecord of allUsers) {
      const [existingSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userRecord.id))
        .limit(1);
      
      if (!existingSub) {
        usersWithoutSubs.push(userRecord);
      }
    }
    
    console.log(`   Found ${usersWithoutSubs.length} users without subscriptions:`);
    usersWithoutSubs.forEach(u => {
      console.log(`     - ${u.name} (${u.email}) - ID: ${u.id}`);
    });
    console.log('');
    
    // Try to find Polar customers for these users
    console.log('2. Searching for Polar customers...');
    for (const userRecord of usersWithoutSubs) {
      console.log(`   Checking user: ${userRecord.email}`);
      
      try {
        // Search for customer by email
        const customersResponse = await polar.customers.list({
          email: userRecord.email,
          limit: 10
        });
        
        if (customersResponse.items && customersResponse.items.length > 0) {
          const customer = customersResponse.items[0];
          console.log(`     ✅ Found Polar customer: ${customer.id}`);
          
          // Look for subscriptions for this customer
          try {
            const subscriptionsResponse = await polar.subscriptions.list({
              customerId: customer.id,
              limit: 10
            });
            
            if (subscriptionsResponse.items && subscriptionsResponse.items.length > 0) {
              console.log(`     ✅ Found ${subscriptionsResponse.items.length} Polar subscriptions`);
              
              for (const polarSub of subscriptionsResponse.items) {
                console.log(`       Subscription: ${polarSub.id}`);
                console.log(`         Status: ${polarSub.status}`);
                console.log(`         Product: ${polarSub.productId}`);
                console.log(`         Price: ${polarSub.priceId}`);
                
                // Try to determine plan from price ID
                const [planPrice] = await db
                  .select({
                    planId: subscriptionPlans.id,
                    planSlug: subscriptionPlans.slug,
                    billingInterval: subscriptions.billingCycle
                  })
                  .from(subscriptionPlans)
                  .where(eq(subscriptionPlans.slug, 'pro')) // Assume pro for now
                  .limit(1);
                
                if (planPrice) {
                  console.log(`         Creating local subscription for plan: ${planPrice.planSlug}`);
                  
                  // Create local subscription
                  const [newSubscription] = await db
                    .insert(subscriptions)
                    .values({
                      userId: userRecord.id,
                      planId: planPrice.planId,
                      polarSubscriptionId: polarSub.id,
                      polarCustomerId: customer.id,
                      polarProductId: polarSub.productId,
                      polarPriceId: polarSub.priceId,
                      status: polarSub.status as any,
                      billingCycle: 'monthly', // Default to monthly
                      currentPeriodStart: new Date(polarSub.currentPeriodStart),
                      currentPeriodEnd: new Date(polarSub.currentPeriodEnd),
                      metadata: {
                        syncedFromPolar: true,
                        polarSubscription: polarSub
                      }
                    })
                    .returning();
                  
                  // Initialize usage tracking
                  await db.insert(usageTracking).values({
                    userId: userRecord.id,
                    subscriptionId: newSubscription.id,
                    websiteCount: 0,
                    scansThisMonth: 0,
                    periodStart: new Date(polarSub.currentPeriodStart),
                    periodEnd: new Date(polarSub.currentPeriodEnd),
                  });
                  
                  // Log sync event
                  await db.insert(subscriptionEvents).values({
                    subscriptionId: newSubscription.id,
                    eventType: 'subscription.synced',
                    eventData: {
                      action: 'manual_sync',
                      source: 'polar_recovery',
                      originalPolarId: polarSub.id
                    }
                  });
                  
                  console.log(`         ✅ Successfully synced subscription: ${newSubscription.id}`);
                } else {
                  console.log(`         ❌ Could not determine plan for price ID: ${polarSub.priceId}`);
                }
              }
            } else {
              console.log(`     ❌ No Polar subscriptions found for customer`);
            }
          } catch (subError) {
            console.log(`     ❌ Error fetching subscriptions: ${subError}`);
          }
        } else {
          console.log(`     ❌ No Polar customer found for email: ${userRecord.email}`);
        }
      } catch (customerError) {
        console.log(`     ❌ Error searching for customer: ${customerError}`);
      }
      
      console.log('');
    }
    
    console.log('🎉 Sync completed!');
    
  } catch (error) {
    console.error('❌ Error during sync:', error);
  }
}

syncPolarSubscriptions().catch(console.error);