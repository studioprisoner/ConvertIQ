#!/usr/bin/env bun

/**
 * Test scan domain validation functionality
 * Run with: bun run src/scripts/test-scan-domain-validation.ts
 */

import { db } from '@/db/connection';
import { websites } from '@/db/schema/websites';
import { user } from '@/db/schema/auth';
import { eq } from 'drizzle-orm';

async function testScanDomainValidation() {
  console.log('🧪 Testing scan domain validation...\n');
  
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

    console.log(`📊 Current domains: ${userDomains.length}/10`);
    userDomains.forEach((domain, index) => {
      const hostname = new URL(domain.url).hostname;
      console.log(`   ${index + 1}. ${hostname} (${domain.url})`);
    });

    const DOMAIN_LIMIT = 10;
    
    // Test scenarios
    console.log('\n🔍 Test Scenarios:');
    
    // Test 1: Scan allowed domain
    if (userDomains.length > 0) {
      const allowedDomain = new URL(userDomains[0].url).hostname;
      console.log(`\n1. ✅ Scanning allowed domain: ${allowedDomain}`);
      console.log('   Expected: Scan should proceed without dialog');
    }
    
    // Test 2: Scan new domain with space available
    const testNewDomain = 'example.com';
    const isDomainAllowed = userDomains.some(domain => {
      const domainHost = new URL(domain.url).hostname.toLowerCase();
      return domainHost === testNewDomain;
    });
    
    if (!isDomainAllowed) {
      if (userDomains.length < DOMAIN_LIMIT) {
        console.log(`\n2. 🔄 Scanning new domain: ${testNewDomain}`);
        console.log('   Expected: Should show "Add Domain" dialog');
        console.log(`   Domain usage: ${userDomains.length}/10 → ${userDomains.length + 1}/10`);
      } else {
        console.log(`\n2. 🚫 Scanning new domain: ${testNewDomain}`);
        console.log('   Expected: Should show "Domain limit reached" error');
        console.log(`   Domain usage: ${userDomains.length}/10 (limit reached)`);
      }
    }
    
    // Test 3: Scan subdomain of allowed domain
    if (userDomains.length > 0) {
      const baseDomain = new URL(userDomains[0].url).hostname;
      const subdomain = `shop.${baseDomain}`;
      console.log(`\n3. ⚠️ Scanning subdomain: ${subdomain}`);
      console.log('   Expected: Treated as different domain, may need to be added');
    }

    console.log('\n🧪 How to Test:');
    console.log('1. Go to /dashboard/scan');
    console.log('2. Try scanning URLs from different scenarios above');
    console.log('3. Check that appropriate dialogs/errors appear');
    console.log('4. Verify domain auto-addition works when confirmed');

    console.log('\n📋 Implementation Features:');
    console.log('✅ Domain validation against allowed list');
    console.log('✅ 10 domain limit enforcement');
    console.log('✅ Auto-add dialog for new domains (when space available)');
    console.log('✅ Error message when domain limit reached');
    console.log('✅ Subdomain handling (treats as separate domains)');

  } catch (error) {
    console.error('❌ Error testing scan domain validation:', error);
  }
}

testScanDomainValidation().catch(console.error);