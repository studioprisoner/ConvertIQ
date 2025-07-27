#!/usr/bin/env bun

/**
 * Test scan directly through tRPC to isolate the issue
 * Run with: bun run src/scripts/test-scan-directly.ts
 */

import { validateUrl } from '@/lib/url-validation';
import { db } from '@/db/connection';
import { websites } from '@/db/schema/websites';
import { user } from '@/db/schema/auth';
import { eq, and } from 'drizzle-orm';
import { checkFeatureAccess } from '@/lib/feature-gate';

async function testScanDirectly() {
  console.log('🧪 Testing scan directly...\n');
  
  try {
    // Get the current user
    const users = await db
      .select()
      .from(user)
      .orderBy(user.createdAt);
    
    const currentUser = users[users.length - 1];
    const userId = currentUser.id;
    const testUrl = 'https://google.com/search?q=test';
    
    console.log(`👤 User: ${currentUser.name}`);
    console.log(`🌐 Test URL: ${testUrl}`);
    
    // Step 1: Check feature access
    console.log('\n🔐 Step 1: Checking feature access...');
    const featureAccess = await checkFeatureAccess(userId, 'multiple_websites');
    console.log(`   Multiple websites access: ${featureAccess.hasAccess ? '✅' : '❌'}`);
    if (!featureAccess.hasAccess) {
      console.log(`   Error: ${featureAccess.reason}`);
      return;
    }
    
    // Step 2: Validate URL
    console.log('\n✅ Step 2: Validating URL...');
    const validation = await validateUrl(testUrl);
    console.log(`   Valid: ${validation.isValid ? '✅' : '❌'}`);
    if (!validation.isValid) {
      console.log(`   Error: ${validation.error}`);
      return;
    }
    console.log(`   Page type: ${validation.pageType}`);
    
    // Step 3: Check domain validation
    console.log('\n🌐 Step 3: Domain validation...');
    const urlObj = new URL(testUrl);
    const scanDomain = urlObj.hostname.toLowerCase();
    console.log(`   Scan domain: ${scanDomain}`);
    
    // Get user's existing domains
    const userDomains = await db
      .select()
      .from(websites)
      .where(eq(websites.userId, userId));
    
    console.log(`   User has ${userDomains.length}/10 domains`);
    
    // Check if domain is allowed
    const isDomainAllowed = userDomains.some(domain => {
      const domainHost = new URL(domain.url).hostname.toLowerCase();
      return domainHost === scanDomain;
    });
    
    console.log(`   Domain allowed: ${isDomainAllowed ? '✅' : '❌'}`);
    
    if (!isDomainAllowed) {
      const DOMAIN_LIMIT = 10;
      if (userDomains.length >= DOMAIN_LIMIT) {
        console.log(`   ❌ Domain limit reached (${userDomains.length}/${DOMAIN_LIMIT})`);
        return;
      } else {
        console.log(`   ⚠️ Domain not allowed but user has space (${userDomains.length}/${DOMAIN_LIMIT})`);
        console.log(`   Expected: Show domain addition dialog`);
        return;
      }
    }
    
    // Step 4: Check if website exists
    console.log('\n📝 Step 4: Checking existing website...');
    const parentDomainUrl = `${urlObj.protocol}//${urlObj.hostname}`;
    console.log(`   Parent domain URL: ${parentDomainUrl}`);
    
    const existing = await db
      .select()
      .from(websites)
      .where(and(
        eq(websites.url, parentDomainUrl),
        eq(websites.userId, userId)
      ))
      .limit(1);
    
    console.log(`   Existing website: ${existing.length > 0 ? '✅ Found' : '❌ Not found'}`);
    
    if (existing.length > 0) {
      console.log(`   Would update existing website: ${existing[0].id}`);
      console.log(`   Scan URL would be: ${testUrl}`);
    } else {
      console.log(`   Would create new website with parent domain URL`);
      console.log(`   Scan URL would be: ${testUrl}`);
    }
    
    console.log('\n✅ All validation steps passed! Scan should work.');
    
  } catch (error) {
    console.error('❌ Error during direct scan test:', error);
  }
}

testScanDirectly().catch(console.error);