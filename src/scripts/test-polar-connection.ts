#!/usr/bin/env bun

/**
 * Diagnostic script to test Polar API connection and customer creation
 * Run with: bun run src/scripts/test-polar-connection.ts
 */

import { polar } from '@/lib/polar';
import { db } from '@/db/connection';
import { subscriptions, planPrices } from '@/db/schema/subscriptions';

async function testPolarConnection() {
  console.log('🔍 Testing Polar API Connection...\n');
  
  // Test 1: Check environment configuration
  console.log('1. Environment Configuration:');
  console.log('   POLAR_ENVIRONMENT:', process.env.POLAR_ENVIRONMENT || 'not set');
  console.log('   POLAR_ACCESS_TOKEN:', process.env.POLAR_ACCESS_TOKEN ? 'set' : 'missing');
  console.log('   POLAR_WEBHOOK_SECRET:', process.env.POLAR_WEBHOOK_SECRET ? 'set' : 'missing');
  console.log('');

  // Test 2: Try to list customers (basic API test)
  try {
    console.log('2. Testing API Connection...');
    const customersResponse = await polar.customers.list({ limit: 1 });
    console.log('   ✅ API connection successful');
    console.log('   Found customers:', customersResponse.items?.length || 0);
    console.log('');
  } catch (error) {
    console.log('   ❌ API connection failed:', error);
    return;
  }

  // Test 3: Check current price IDs in database
  console.log('3. Database Price IDs:');
  try {
    const prices = await db.select().from(planPrices);
    prices.forEach(price => {
      console.log(`   ${price.planId} (${price.billingInterval}): ${price.polarPriceId}`);
    });
    console.log('');
  } catch (error) {
    console.log('   ❌ Failed to fetch prices from database:', error);
    return;
  }

  // Test 4: Try to create a test customer
  console.log('4. Testing Customer Creation...');
  const testEmail = `test-${Date.now()}@convertiq-test.com`;
  try {
    const customer = await polar.customers.create({
      email: testEmail,
      metadata: {
        source: 'diagnostic-test',
        userId: 'test-user-id'
      }
    });
    console.log('   ✅ Customer creation successful');
    console.log('   Customer ID:', customer.id);
    console.log('   Email:', customer.email);
    console.log('');
  } catch (error: any) {
    console.log('   ❌ Customer creation failed:', error.message);
    if (error.message?.includes('already exists')) {
      console.log('   ℹ️  This might be normal if testing multiple times');
    }
    console.log('');
  }

  // Test 5: Check recent subscriptions created
  console.log('5. Recent Subscriptions in Database:');
  try {
    const recentSubs = await db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        status: subscriptions.status,
        polarSubscriptionId: subscriptions.polarSubscriptionId,
        polarCustomerId: subscriptions.polarCustomerId,
        createdAt: subscriptions.createdAt
      })
      .from(subscriptions)
      .orderBy(subscriptions.createdAt)
      .limit(5);

    if (recentSubs.length === 0) {
      console.log('   No subscriptions found in database');
    } else {
      recentSubs.forEach(sub => {
        console.log(`   Subscription ${sub.id}:`);
        console.log(`     User ID: ${sub.userId}`);
        console.log(`     Status: ${sub.status}`);
        console.log(`     Polar Sub ID: ${sub.polarSubscriptionId || 'null'}`);
        console.log(`     Polar Customer ID: ${sub.polarCustomerId || 'null'}`);
        console.log(`     Created: ${sub.createdAt}`);
        console.log('');
      });
    }
  } catch (error) {
    console.log('   ❌ Failed to fetch subscriptions:', error);
  }

  console.log('✅ Diagnostic complete!');
}

// Self-executing function
testPolarConnection().catch(console.error);