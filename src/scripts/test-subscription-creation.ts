#!/usr/bin/env bun

/**
 * Test script to verify subscription creation with real Polar API
 * Run with: bun run src/scripts/test-subscription-creation.ts
 */

import { createSubscription } from '@/lib/subscription-service';

async function testSubscriptionCreation() {
  console.log('🧪 Testing Subscription Creation...\n');
  
  const testUserId = 'test-user-' + Date.now();
  const testEmail = 'test@gmail.com'; // Using valid domain
  
  console.log('Test Parameters:');
  console.log('  User ID:', testUserId);
  console.log('  Email:', testEmail);
  console.log('  Plan:', 'basic');
  console.log('  Billing:', 'monthly');
  console.log('');

  try {
    console.log('Creating subscription...');
    const result = await createSubscription(testUserId, testEmail, 'basic', 'monthly');
    
    console.log('✅ Subscription creation result:');
    console.log('  Result type:', typeof result);
    
    if ('checkoutUrl' in result) {
      console.log('  🎯 Real Polar checkout created!');
      console.log('  Checkout URL:', result.checkoutUrl);
      console.log('  Checkout ID:', result.checkoutId);
      console.log('  Message:', result.message);
    } else {
      console.log('  📋 Local subscription created:');
      console.log('  Subscription ID:', result.id);
      console.log('  User ID:', result.userId);
      console.log('  Plan:', result.plan?.name);
      console.log('  Status:', result.status);
    }
    
  } catch (error) {
    console.error('❌ Subscription creation failed:', error);
  }
}

testSubscriptionCreation().catch(console.error);