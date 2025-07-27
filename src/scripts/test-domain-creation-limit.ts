#!/usr/bin/env bun

/**
 * Test domain creation limit by simulating API call
 * Run with: bun run src/scripts/test-domain-creation-limit.ts
 */

import { db } from '@/db/connection';
import { websites } from '@/db/schema/websites';
import { user } from '@/db/schema/auth';
import { eq, and } from 'drizzle-orm';

async function testDomainCreationLimit() {
  console.log('🧪 Testing domain creation limit...\n');
  
  try {
    // Get the current user
    const users = await db
      .select()
      .from(user)
      .orderBy(user.createdAt);
    
    const currentUser = users[users.length - 1];
    const userId = currentUser.id;
    
    console.log(`👤 Testing with user: ${currentUser.name}`);
    
    // Simulate the same logic as in the create endpoint
    const userWebsites = await db
      .select()
      .from(websites)
      .where(eq(websites.userId, userId));

    const DOMAIN_LIMIT = 10;
    console.log(`📊 Current domains: ${userWebsites.length}`);
    console.log(`🎯 Domain limit: ${DOMAIN_LIMIT}`);
    
    if (userWebsites.length >= DOMAIN_LIMIT) {
      const errorMessage = `Pro plan allows up to ${DOMAIN_LIMIT} domains. You currently have ${userWebsites.length} domains. Please remove some domains or upgrade your plan.`;
      console.log('🚫 LIMIT ENFORCEMENT TEST:');
      console.log(`   Error message: "${errorMessage}"`);
      console.log('   ✅ Domain creation would be blocked');
    } else {
      console.log(`✅ Can add ${DOMAIN_LIMIT - userWebsites.length} more domains`);
    }
    
    // Also test duplicate URL check with existing logic
    const testUrl = 'https://www.example.com';
    const existing = userWebsites.find(website => website.url === testUrl);
    
    console.log(`\n🔍 Testing duplicate URL check for: ${testUrl}`);
    if (existing) {
      console.log('   🚫 URL already exists - would be blocked');
    } else {
      console.log('   ✅ URL is unique - would pass duplicate check');
    }
    
  } catch (error) {
    console.error('❌ Error testing domain creation limit:', error);
  }
}

testDomainCreationLimit().catch(console.error);