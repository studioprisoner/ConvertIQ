#!/usr/bin/env bun

/**
 * Check what users are in the database
 * Run with: bun run src/scripts/check-users.ts
 */

import { db } from '@/db/connection';
import { user } from '@/db/schema/auth';

async function checkUsers() {
  console.log('👥 Checking users in database...\n');
  
  try {
    const allUsers = await db
      .select()
      .from(user)
      .orderBy(user.createdAt);
    
    console.log(`📊 Found ${allUsers.length} users in database:\n`);
    
    if (allUsers.length === 0) {
      console.log('❌ No users found in database');
      return;
    }
    
    allUsers.forEach((userRecord, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  ID: ${userRecord.id}`);
      console.log(`  Name: ${userRecord.name}`);
      console.log(`  Email: ${userRecord.email}`);
      console.log(`  Email Verified: ${userRecord.emailVerified}`);
      console.log(`  Onboarding Completed: ${userRecord.onboardingCompleted}`);
      console.log(`  Created: ${userRecord.createdAt}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  }
}

checkUsers().catch(console.error);