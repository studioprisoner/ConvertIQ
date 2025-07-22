#!/usr/bin/env bun

import { db } from '@/db/connection';
import { user, session, account, verification } from '@/db/schema/auth';
import { 
  subscriptions, 
  usageTracking, 
  subscriptionEvents, 
  featureUsage, 
  featureAccessAttempts 
} from '@/db/schema/subscriptions';
import { recommendations } from '@/db/schema/recommendations';
import { reports } from '@/db/schema/reports';
import { analyses } from '@/db/schema/analyses';
import { websites } from '@/db/schema/websites';

async function cleanupUsers() {
  try {
    console.log('🧹 Starting comprehensive cleanup...');
    
    // Delete in order to respect foreign key constraints
    // 1. Reports and analysis data (deepest level)
    console.log('🗑️ Deleting recommendations...');
    const deletedRecommendations = await db.delete(recommendations);
    console.log(`✅ Deleted ${deletedRecommendations.rowCount || 0} recommendations`);
    
    console.log('🗑️ Deleting reports...');
    const deletedReports = await db.delete(reports);
    console.log(`✅ Deleted ${deletedReports.rowCount || 0} reports`);
    
    console.log('🗑️ Deleting analyses...');
    const deletedAnalyses = await db.delete(analyses);
    console.log(`✅ Deleted ${deletedAnalyses.rowCount || 0} analyses`);
    
    console.log('🗑️ Deleting websites...');
    const deletedWebsites = await db.delete(websites);
    console.log(`✅ Deleted ${deletedWebsites.rowCount || 0} websites`);
    
    // 2. Subscription-related data
    console.log('🗑️ Deleting feature usage records...');
    const deletedFeatureUsage = await db.delete(featureUsage);
    console.log(`✅ Deleted ${deletedFeatureUsage.rowCount || 0} feature usage records`);
    
    console.log('🗑️ Deleting feature access attempts...');
    const deletedAccessAttempts = await db.delete(featureAccessAttempts);
    console.log(`✅ Deleted ${deletedAccessAttempts.rowCount || 0} feature access attempts`);
    
    console.log('🗑️ Deleting usage tracking...');
    const deletedUsageTracking = await db.delete(usageTracking);
    console.log(`✅ Deleted ${deletedUsageTracking.rowCount || 0} usage tracking records`);
    
    console.log('🗑️ Deleting subscription events...');
    const deletedSubscriptionEvents = await db.delete(subscriptionEvents);
    console.log(`✅ Deleted ${deletedSubscriptionEvents.rowCount || 0} subscription events`);
    
    console.log('🗑️ Deleting subscriptions...');
    const deletedSubscriptions = await db.delete(subscriptions);
    console.log(`✅ Deleted ${deletedSubscriptions.rowCount || 0} subscriptions`);
    
    // 3. Auth-related data
    console.log('🗑️ Deleting sessions...');
    const deletedSessions = await db.delete(session);
    console.log(`✅ Deleted ${deletedSessions.rowCount || 0} sessions`);
    
    console.log('🗑️ Deleting accounts...');
    const deletedAccounts = await db.delete(account);
    console.log(`✅ Deleted ${deletedAccounts.rowCount || 0} accounts`);
    
    console.log('🗑️ Deleting verification records...');
    const deletedVerifications = await db.delete(verification);
    console.log(`✅ Deleted ${deletedVerifications.rowCount || 0} verification records`);
    
    // 4. Finally, delete users (top level)
    console.log('🗑️ Deleting users...');
    const deletedUsers = await db.delete(user);
    console.log(`✅ Deleted ${deletedUsers.rowCount || 0} users`);
    
    console.log('🎉 Comprehensive cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during user cleanup:', error);
    process.exit(1);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

cleanupUsers();