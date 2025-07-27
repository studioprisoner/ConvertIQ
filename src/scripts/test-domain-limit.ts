#!/usr/bin/env bun

/**
 * Test domain limit functionality
 * Run with: bun run src/scripts/test-domain-limit.ts
 */

import { db } from '@/db/connection';
import { websites } from '@/db/schema/websites';
import { user } from '@/db/schema/auth';
import { eq } from 'drizzle-orm';

async function testDomainLimit() {
  console.log('🧪 Testing domain limit functionality...\n');
  
  try {
    // Get the current user
    const users = await db
      .select()
      .from(user)
      .orderBy(user.createdAt);
    
    if (users.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    const currentUser = users[users.length - 1];
    console.log(`👤 Testing with user: ${currentUser.name} (${currentUser.email})`);
    
    // Check current domain count
    const userWebsites = await db
      .select()
      .from(websites)
      .where(eq(websites.userId, currentUser.id));
    
    console.log(`📊 Current domains: ${userWebsites.length}`);
    
    userWebsites.forEach((website, index) => {
      console.log(`   ${index + 1}. ${website.name} - ${website.url}`);
    });
    
    const DOMAIN_LIMIT = 10;
    console.log(`\n🎯 Domain limit: ${DOMAIN_LIMIT}`);
    console.log(`📈 Usage: ${userWebsites.length}/${DOMAIN_LIMIT}`);
    
    if (userWebsites.length >= DOMAIN_LIMIT) {
      console.log('🚫 LIMIT REACHED - Cannot add more domains');
      console.log('   Expected behavior: Create domain should fail with error message');
    } else {
      console.log(`✅ Can add ${DOMAIN_LIMIT - userWebsites.length} more domains`);
    }
    
    console.log('\n🔧 To test the limit:');
    console.log('1. Go to /dashboard/domains');
    console.log('2. Try to add a new domain when at 10 domains');
    console.log('3. Should see error: "Pro plan allows up to 10 domains..."');
    console.log('4. Add Domain button should be disabled when at limit');
    
  } catch (error) {
    console.error('❌ Error testing domain limit:', error);
  }
}

testDomainLimit().catch(console.error);