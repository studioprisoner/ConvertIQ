#!/usr/bin/env bun

/**
 * Cleanup script to remove test user and all associated data
 * Run with: bun run src/scripts/cleanup-test-user.ts
 */

import { db } from '@/db/connection';
import { user } from '@/db/schema/auth';
import { 
  subscriptions, 
  usageTracking, 
  subscriptionEvents 
} from '@/db/schema/subscriptions';
import { analyses } from '@/db/schema/analyses';
import { websites } from '@/db/schema/websites';
import { eq } from 'drizzle-orm';

const TEST_EMAIL = 'studioprisoner@gmail.com';

async function cleanupTestUser() {
  console.log(`🧹 Cleaning up test user: ${TEST_EMAIL}\n`);
  
  try {
    // Step 1: Find the user
    console.log('1. Finding user...');
    const [testUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, TEST_EMAIL))
      .limit(1);
    
    if (!testUser) {
      console.log('   ❌ User not found with email:', TEST_EMAIL);
      return;
    }
    
    console.log('   ✅ Found user:');
    console.log('     ID:', testUser.id);
    console.log('     Name:', testUser.name);
    console.log('     Email:', testUser.email);
    console.log('     Created:', testUser.createdAt);
    console.log('');

    // Step 2: Find and remove websites and their analyses
    console.log('2. Removing websites and analyses...');
    
    // First, find user's websites
    const userWebsites = await db
      .select()
      .from(websites)
      .where(eq(websites.userId, testUser.id));
    
    console.log(`   Found ${userWebsites.length} websites`);
    
    let totalAnalyses = 0;
    
    // For each website, find and remove analyses
    for (const website of userWebsites) {
      const websiteAnalyses = await db
        .select()
        .from(analyses)
        .where(eq(analyses.websiteId, website.id));
      
      totalAnalyses += websiteAnalyses.length;
      
      if (websiteAnalyses.length > 0) {
        await db
          .delete(analyses)
          .where(eq(analyses.websiteId, website.id));
        
        console.log(`     - Removed ${websiteAnalyses.length} analyses for website: ${website.url}`);
      }
    }
    
    // Remove the websites (this will cascade delete any remaining analyses)
    if (userWebsites.length > 0) {
      await db
        .delete(websites)
        .where(eq(websites.userId, testUser.id));
      
      console.log(`   ✅ Removed ${userWebsites.length} websites and ${totalAnalyses} analyses`);
    }
    console.log('');

    // Step 3: Find and remove subscriptions and related data
    console.log('3. Removing subscription data...');
    const userSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, testUser.id));
    
    console.log(`   Found ${userSubscriptions.length} subscriptions`);
    
    for (const subscription of userSubscriptions) {
      console.log(`   Processing subscription ${subscription.id}:`);
      
      // Remove subscription events
      const events = await db
        .delete(subscriptionEvents)
        .where(eq(subscriptionEvents.subscriptionId, subscription.id))
        .returning();
      console.log(`     - Removed ${events.length} subscription events`);
      
      // Remove usage tracking
      const usage = await db
        .delete(usageTracking)
        .where(eq(usageTracking.subscriptionId, subscription.id))
        .returning();
      console.log(`     - Removed ${usage.length} usage tracking records`);
      
      console.log(`     - Subscription details:`);
      console.log(`       Status: ${subscription.status}`);
      console.log(`       Plan ID: ${subscription.planId}`);
      console.log(`       Polar Sub ID: ${subscription.polarSubscriptionId || 'null'}`);
      console.log(`       Polar Customer ID: ${subscription.polarCustomerId || 'null'}`);
    }
    
    // Remove the subscriptions themselves
    if (userSubscriptions.length > 0) {
      await db
        .delete(subscriptions)
        .where(eq(subscriptions.userId, testUser.id));
      
      console.log(`   ✅ Removed ${userSubscriptions.length} subscriptions`);
    }
    console.log('');

    // Step 4: Remove usage tracking not tied to subscriptions
    console.log('4. Removing orphaned usage tracking...');
    const orphanedUsage = await db
      .delete(usageTracking)
      .where(eq(usageTracking.userId, testUser.id))
      .returning();
    
    if (orphanedUsage.length > 0) {
      console.log(`   ✅ Removed ${orphanedUsage.length} orphaned usage records`);
    } else {
      console.log('   No orphaned usage records found');
    }
    console.log('');

    // Step 5: Remove the user account
    console.log('5. Removing user account...');
    await db
      .delete(user)
      .where(eq(user.id, testUser.id));
    
    console.log('   ✅ User account removed');
    console.log('');

    // Step 6: Verification
    console.log('6. Verifying cleanup...');
    const verifyUser = await db
      .select()
      .from(user)
      .where(eq(user.email, TEST_EMAIL))
      .limit(1);
    
    const verifySubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, testUser.id))
      .limit(1);
    
    const verifyWebsites = await db
      .select()
      .from(websites)  
      .where(eq(websites.userId, testUser.id))
      .limit(1);
    
    if (verifyUser.length === 0 && verifySubscriptions.length === 0 && verifyWebsites.length === 0) {
      console.log('   ✅ Cleanup verified - all data removed successfully');
    } else {
      console.log('   ⚠️ Some data may still exist:');
      console.log('     User records:', verifyUser.length);
      console.log('     Subscription records:', verifySubscriptions.length);
      console.log('     Website records:', verifyWebsites.length);
    }

    console.log('\n🎉 Cleanup completed successfully!');
    console.log('\nSummary:');
    console.log('- User account: REMOVED');
    console.log(`- Subscriptions: ${userSubscriptions.length} REMOVED`);
    console.log(`- Websites: ${userWebsites.length} REMOVED`);
    console.log(`- Analyses: ${totalAnalyses} REMOVED`);
    console.log('- Usage tracking: REMOVED');
    console.log('- Subscription events: REMOVED');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Self-executing function
cleanupTestUser().catch(console.error);