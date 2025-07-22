#!/usr/bin/env bun

/**
 * Verification script to confirm test account cleanup
 * Usage: bun run src/scripts/verify-cleanup.ts josh@studioprisoner.com
 */

import { db } from '@/db/connection';
import { user } from '@/db/schema/auth';
import { subscriptions } from '@/db/schema/subscriptions';
import { eq } from 'drizzle-orm';

const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error('❌ Please provide an email address');
  console.log('Usage: bun run src/scripts/verify-cleanup.ts josh@studioprisoner.com');
  process.exit(1);
}

async function verifyCleanup(email: string) {
  console.log(`🔍 Verifying cleanup for: ${email}`);
  
  // Check if user exists
  const users = await db
    .select()
    .from(user)
    .where(eq(user.email, email));
    
  if (users.length === 0) {
    console.log('✅ User record: DELETED');
  } else {
    console.log('❌ User record: STILL EXISTS');
    console.log('   Found:', users[0]);
  }
  
  // Check if any subscriptions reference this email (shouldn't exist)
  const subs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, users[0]?.id || 'nonexistent'));
    
  if (subs.length === 0) {
    console.log('✅ Subscription records: DELETED');
  } else {
    console.log('❌ Subscription records: STILL EXIST');
    console.log('   Found:', subs.length, 'subscriptions');
  }
  
  console.log('\n🎉 Cleanup verification complete!');
  
  if (users.length === 0 && subs.length === 0) {
    console.log('✅ ALL DATA SUCCESSFULLY REMOVED');
  } else {
    console.log('⚠️  Some data may still exist - manual cleanup may be needed');
  }
}

// Run verification
verifyCleanup(targetEmail).catch(console.error);