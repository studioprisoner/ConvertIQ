#!/usr/bin/env bun

/**
 * Temporary script to manually create subscription for a user
 * Until Polar is properly set up
 * Run with: bun run src/scripts/create-manual-subscription.ts
 */

import { db } from '@/db/connection';
import { user } from '@/db/schema/auth';
import { subscriptions, subscriptionPlans, usageTracking, subscriptionEvents } from '@/db/schema/subscriptions';
import { eq } from 'drizzle-orm';

const USER_EMAIL = 'studioprisoner@gmail.com';
const PLAN_SLUG = 'pro'; // or 'basic'

async function createManualSubscription() {
  console.log(`🔧 Creating manual subscription for: ${USER_EMAIL}\n`);
  
  try {
    // Find the user
    console.log('1. Finding user...');
    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.email, USER_EMAIL))
      .limit(1);
    
    if (!userRecord) {
      console.log(`   ❌ User not found: ${USER_EMAIL}`);
      return;
    }
    
    console.log(`   ✅ Found user: ${userRecord.name} (${userRecord.id})`);
    
    // Check if user already has subscription
    const [existingSub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userRecord.id))
      .limit(1);
    
    if (existingSub) {
      console.log('   ⚠️ User already has a subscription:');
      console.log(`     ID: ${existingSub.id}`);
      console.log(`     Status: ${existingSub.status}`);
      console.log(`     Plan ID: ${existingSub.planId}`);
      return;
    }
    
    // Find the plan
    console.log(`2. Finding plan: ${PLAN_SLUG}...`);
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, PLAN_SLUG))
      .limit(1);
    
    if (!plan) {
      console.log(`   ❌ Plan not found: ${PLAN_SLUG}`);
      return;
    }
    
    console.log(`   ✅ Found plan: ${plan.name} (${plan.id})`);
    
    // Create subscription
    console.log('3. Creating subscription...');
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    
    const [newSubscription] = await db
      .insert(subscriptions)
      .values({
        userId: userRecord.id,
        planId: plan.id,
        polarSubscriptionId: `manual_sub_${Date.now()}`,
        polarCustomerId: `manual_customer_${userRecord.id}`,
        polarProductId: `manual_product_${PLAN_SLUG}`,
        polarPriceId: `manual_price_${PLAN_SLUG}_monthly`,
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        metadata: {
          manuallyCreated: true,
          reason: 'polar_sandbox_not_configured',
          createdBy: 'create-manual-subscription.ts'
        }
      })
      .returning();
    
    console.log(`   ✅ Created subscription: ${newSubscription.id}`);
    
    // Initialize usage tracking
    console.log('4. Initializing usage tracking...');
    await db.insert(usageTracking).values({
      userId: userRecord.id,
      subscriptionId: newSubscription.id,
      websiteCount: 0,
      scansThisMonth: 0,
      periodStart: now,
      periodEnd: periodEnd,
    });
    
    console.log('   ✅ Usage tracking initialized');
    
    // Log event
    await db.insert(subscriptionEvents).values({
      subscriptionId: newSubscription.id,
      eventType: 'subscription.created',
      eventData: {
        action: 'manual_creation',
        reason: 'polar_sandbox_not_configured',
        planSlug: PLAN_SLUG,
        billingCycle: 'monthly'
      }
    });
    
    console.log('   ✅ Event logged');
    
    console.log('\n🎉 Manual subscription created successfully!');
    console.log('\nDetails:');
    console.log(`- User: ${userRecord.name} (${userRecord.email})`);
    console.log(`- Plan: ${plan.name} (${PLAN_SLUG})`);
    console.log(`- Subscription ID: ${newSubscription.id}`);
    console.log(`- Status: ${newSubscription.status}`);
    console.log(`- Period: ${now.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}`);
    console.log(`- Max Websites: ${plan.maxWebsites === -1 ? 'Unlimited' : plan.maxWebsites}`);
    console.log(`- Max Scans/Month: ${plan.maxScansPerMonth === -1 ? 'Unlimited' : plan.maxScansPerMonth}`);
    
    console.log('\n⚠️ NOTE: This is a temporary solution. Please set up Polar properly with real products and webhooks.');
    
  } catch (error) {
    console.error('❌ Error creating manual subscription:', error);
  }
}

createManualSubscription().catch(console.error);