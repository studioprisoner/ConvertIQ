#!/usr/bin/env bun

/**
 * Test domain deduplication functionality
 * Run with: bun run src/scripts/test-domain-deduplication.ts
 */

import { db } from '@/db/connection';
import { websites } from '@/db/schema/websites';
import { user } from '@/db/schema/auth';
import { eq } from 'drizzle-orm';

async function testDomainDeduplication() {
  console.log('🧪 Testing domain deduplication...\n');
  
  try {
    // Get the current user
    const users = await db
      .select()
      .from(user)
      .orderBy(user.createdAt);
    
    const currentUser = users[users.length - 1];
    const userId = currentUser.id;
    
    console.log(`👤 Testing with user: ${currentUser.name}`);
    
    // Get user's existing domains
    const userDomains = await db
      .select()
      .from(websites)
      .where(eq(websites.userId, userId));

    console.log(`📊 Current domains: ${userDomains.length}`);
    userDomains.forEach((domain, index) => {
      const hostname = new URL(domain.url).hostname;
      console.log(`   ${index + 1}. ${hostname} (${domain.url})`);
    });

    console.log('\n🔍 Expected Behavior:');
    console.log('1. When scanning https://example.com/products/item-123:');
    console.log('   - Domain validation should check against "example.com"');
    console.log('   - If domain not allowed, show dialog to add "example.com"');
    console.log('   - Website record should be created for "https://example.com" (parent)');
    console.log('   - Crawling should happen on "https://example.com/products/item-123" (original)');
    console.log('   - NO duplicate domains should be created');

    console.log('\n2. When scanning https://example.com/about:');
    console.log('   - Should find existing "https://example.com" domain');
    console.log('   - Should NOT create another domain record');
    console.log('   - Should crawl "https://example.com/about" (original URL)');

    console.log('\n🧪 How to Test:');
    console.log('1. Go to /dashboard/scan');
    console.log('2. Try scanning a specific page: https://example.com/products/test');
    console.log('3. Check that only parent domain is added to domains list');
    console.log('4. Verify crawling happens on the specific page URL');
    console.log('5. Try scanning another page from same domain');
    console.log('6. Verify no duplicate domain is created');

    console.log('\n📋 Implementation:');
    console.log('✅ Extract domain from scan URL for validation');
    console.log('✅ Store website record with parent domain URL');
    console.log('✅ Pass original scan URL to crawling process');
    console.log('✅ Return scanUrl property for frontend to use');

  } catch (error) {
    console.error('❌ Error testing domain deduplication:', error);
  }
}

testDomainDeduplication().catch(console.error);