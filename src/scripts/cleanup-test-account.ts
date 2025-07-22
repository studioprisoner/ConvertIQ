#!/usr/bin/env bun

/**
 * Cleanup script for test account
 * Usage: bun run src/scripts/cleanup-test-account.ts josh@studioprisoner.com
 */

import { db } from '@/db/connection';
import { 
  user, 
  session, 
  account, 
  verification 
} from '@/db/schema/auth';
import { 
  subscriptions, 
  usageTracking, 
  subscriptionEvents, 
  featureUsage, 
  featureAccessAttempts 
} from '@/db/schema/subscriptions';
import { eq, and } from 'drizzle-orm';

const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error('❌ Please provide an email address');
  console.log('Usage: bun run src/scripts/cleanup-test-account.ts josh@studioprisoner.com');
  process.exit(1);
}

async function findUser(email: string) {
  console.log(`🔍 Looking for user with email: ${email}`);
  
  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      primaryDomain: user.primaryDomain
    })
    .from(user)
    .where(eq(user.email, email));

  return users[0] || null;
}

async function cleanupUserData(userId: string, email: string) {
  console.log(`🧹 Starting cleanup for user ${userId} (${email})`);
  
  try {
    // 1. Clean up feature usage and access attempts
    console.log('  🔄 Cleaning feature usage data...');
    const deletedFeatureUsage = await db
      .delete(featureUsage)
      .where(eq(featureUsage.userId, userId))
      .returning({ id: featureUsage.id });
    console.log(`    ✅ Deleted ${deletedFeatureUsage.length} feature usage records`);

    const deletedAccessAttempts = await db
      .delete(featureAccessAttempts)
      .where(eq(featureAccessAttempts.userId, userId))
      .returning({ id: featureAccessAttempts.id });
    console.log(`    ✅ Deleted ${deletedAccessAttempts.length} feature access attempts`);

    // 2. Clean up usage tracking
    console.log('  🔄 Cleaning usage tracking data...');
    const deletedUsageTracking = await db
      .delete(usageTracking)
      .where(eq(usageTracking.userId, userId))
      .returning({ id: usageTracking.id });
    console.log(`    ✅ Deleted ${deletedUsageTracking.length} usage tracking records`);

    // 3. Find and clean up subscriptions (and related events)
    console.log('  🔄 Cleaning subscription data...');
    const userSubscriptions = await db
      .select({ id: subscriptions.id, polarSubscriptionId: subscriptions.polarSubscriptionId })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));

    if (userSubscriptions.length > 0) {
      // Delete subscription events first (foreign key constraint)
      for (const sub of userSubscriptions) {
        const deletedEvents = await db
          .delete(subscriptionEvents)
          .where(eq(subscriptionEvents.subscriptionId, sub.id))
          .returning({ id: subscriptionEvents.id });
        console.log(`    ✅ Deleted ${deletedEvents.length} subscription events for subscription ${sub.id}`);
      }

      // Delete subscriptions
      const deletedSubscriptions = await db
        .delete(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .returning({ id: subscriptions.id, polarSubscriptionId: subscriptions.polarSubscriptionId });
      
      console.log(`    ✅ Deleted ${deletedSubscriptions.length} subscriptions`);
      deletedSubscriptions.forEach(sub => {
        if (sub.polarSubscriptionId) {
          console.log(`    ⚠️  WARNING: Subscription had Polar ID ${sub.polarSubscriptionId} - you may need to manually cancel/clean in Polar`);
        }
      });
    }

    // 4. Clean up auth-related data
    console.log('  🔄 Cleaning authentication data...');
    
    // Delete accounts
    const deletedAccounts = await db
      .delete(account)
      .where(eq(account.userId, userId))
      .returning({ id: account.id });
    console.log(`    ✅ Deleted ${deletedAccounts.length} linked accounts`);

    // Delete sessions  
    const deletedSessions = await db
      .delete(session)
      .where(eq(session.userId, userId))
      .returning({ id: session.id });
    console.log(`    ✅ Deleted ${deletedSessions.length} active sessions`);

    // Delete verification records (OTP codes, etc.)
    const deletedVerifications = await db
      .delete(verification)
      .where(eq(verification.identifier, email))
      .returning({ id: verification.id });
    console.log(`    ✅ Deleted ${deletedVerifications.length} verification records`);

    // 5. Finally, delete the user record
    console.log('  🔄 Deleting user record...');
    const deletedUsers = await db
      .delete(user)
      .where(eq(user.id, userId))
      .returning({ id: user.id, email: user.email });
    
    if (deletedUsers.length > 0) {
      console.log(`    ✅ Deleted user record: ${deletedUsers[0].email}`);
    }

    console.log('🎉 Cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting test account cleanup...');
    
    // Find the user
    const foundUser = await findUser(targetEmail);
    
    if (!foundUser) {
      console.log(`ℹ️  No user found with email: ${targetEmail}`);
      console.log('✅ Nothing to clean up');
      return;
    }

    console.log(`✅ Found user:`, {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      createdAt: foundUser.createdAt,
      primaryDomain: foundUser.primaryDomain
    });

    // Confirm cleanup
    console.log(`\n⚠️  About to delete ALL data for user: ${foundUser.email}`);
    console.log('   This includes:');
    console.log('   - User profile and authentication data');  
    console.log('   - All subscriptions and billing history');
    console.log('   - Feature usage and analytics data');
    console.log('   - Active sessions and verification codes');
    console.log('\n   This action cannot be undone!');
    
    // In a script environment, we'll proceed automatically
    // In production, you might want to add a confirmation prompt
    
    await cleanupUserData(foundUser.id, foundUser.email);
    
    console.log('\n🎉 Test account cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);