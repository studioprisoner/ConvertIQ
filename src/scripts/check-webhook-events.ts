#!/usr/bin/env bun

/**
 * Check recent webhook events and subscription status
 * Run with: bun run src/scripts/check-webhook-events.ts
 */

import { db } from '@/db/connection';
import { subscriptionEvents, subscriptions } from '@/db/schema/subscriptions';
import { user } from '@/db/schema/auth';
import { desc, eq } from 'drizzle-orm';

async function checkWebhookEvents() {
  console.log('🔍 Checking Webhook Events and Subscriptions...\n');
  
  try {
    // Check recent webhook events
    console.log('1. Recent Webhook Events (last 10):');
    const recentEvents = await db
      .select({
        id: subscriptionEvents.id,
        eventType: subscriptionEvents.eventType,
        subscriptionId: subscriptionEvents.subscriptionId,
        polarEventId: subscriptionEvents.polarEventId,
        processed: subscriptionEvents.processed,
        eventData: subscriptionEvents.eventData,
        createdAt: subscriptionEvents.createdAt,
      })
      .from(subscriptionEvents)
      .orderBy(desc(subscriptionEvents.createdAt))
      .limit(10);
    
    if (recentEvents.length === 0) {
      console.log('   ❌ No webhook events found');
    } else {
      recentEvents.forEach((event, index) => {
        console.log(`   Event ${index + 1}:`);
        console.log(`     Type: ${event.eventType}`);
        console.log(`     Polar Event ID: ${event.polarEventId || 'null'}`);
        console.log(`     Processed: ${event.processed}`);
        console.log(`     Created: ${event.createdAt}`);
        if (event.eventData) {
          console.log(`     Data:`, JSON.stringify(event.eventData, null, 2));
        }
        console.log('');
      });
    }
    
    // Check all subscriptions
    console.log('2. All Subscriptions in Database:');
    const allSubscriptions = await db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        status: subscriptions.status,
        polarSubscriptionId: subscriptions.polarSubscriptionId,
        polarCustomerId: subscriptions.polarCustomerId,
        planId: subscriptions.planId,
        metadata: subscriptions.metadata,
        createdAt: subscriptions.createdAt,
      })
      .from(subscriptions)
      .orderBy(desc(subscriptions.createdAt))
      .limit(10);
    
    if (allSubscriptions.length === 0) {
      console.log('   ❌ No subscriptions found');
    } else {
      for (const sub of allSubscriptions) {
        console.log(`   Subscription ${sub.id}:`);
        console.log(`     User ID: ${sub.userId}`);
        console.log(`     Status: ${sub.status}`);
        console.log(`     Plan ID: ${sub.planId || 'null'}`);
        console.log(`     Polar Sub ID: ${sub.polarSubscriptionId || 'null'}`);
        console.log(`     Polar Customer ID: ${sub.polarCustomerId || 'null'}`);
        console.log(`     Created: ${sub.createdAt}`);
        
        // Try to find the user for this subscription
        if (sub.userId) {
          const [userRecord] = await db
            .select({ email: user.email, name: user.name })
            .from(user)
            .where(eq(user.id, sub.userId))
            .limit(1);
          
          if (userRecord) {
            console.log(`     User: ${userRecord.name} (${userRecord.email})`);
          } else {
            console.log(`     User: Not found (orphaned subscription)`);
          }
        }
        
        if (sub.metadata) {
          console.log(`     Metadata:`, JSON.stringify(sub.metadata, null, 2));
        }
        console.log('');
      }
    }
    
    // Check for users without subscriptions
    console.log('3. Recent Users Without Subscriptions:');
    const recentUsers = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt))
      .limit(5);
    
    for (const userRecord of recentUsers) {
      const [userSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userRecord.id))
        .limit(1);
      
      if (!userSub) {
        console.log(`   User without subscription:`);
        console.log(`     ID: ${userRecord.id}`);
        console.log(`     Email: ${userRecord.email}`);
        console.log(`     Name: ${userRecord.name || 'null'}`);
        console.log(`     Created: ${userRecord.createdAt}`);
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking webhook events:', error);
  }
}

checkWebhookEvents().catch(console.error);