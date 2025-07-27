#!/usr/bin/env bun

/**
 * Debug scan issue - check what might be preventing scan from starting
 * Run with: bun run src/scripts/debug-scan-issue.ts
 */

import { db } from '@/db/connection';
import { websites } from '@/db/schema/websites';
import { user } from '@/db/schema/auth';
import { eq } from 'drizzle-orm';
import { checkFeatureAccess } from '@/lib/feature-gate';

async function debugScanIssue() {
  console.log('🔍 Debugging scan issue...\n');
  
  try {
    // Get the current user
    const users = await db
      .select()
      .from(user)
      .orderBy(user.createdAt);
    
    const currentUser = users[users.length - 1];
    if (!currentUser) {
      console.log('❌ No user found');
      return;
    }
    
    console.log(`👤 User: ${currentUser.name} (${currentUser.id})`);
    
    // Check feature access
    const scanFeatureAccess = await checkFeatureAccess(currentUser.id, 'unlimited_scans');
    console.log(`🔐 Scan feature access: ${scanFeatureAccess.hasAccess ? '✅ Allowed' : '❌ Denied'}`);
    if (!scanFeatureAccess.hasAccess) {
      console.log(`   Reason: ${scanFeatureAccess.reason}`);
    }
    
    const multipleWebsitesAccess = await checkFeatureAccess(currentUser.id, 'multiple_websites');
    console.log(`🌐 Multiple websites access: ${multipleWebsitesAccess.hasAccess ? '✅ Allowed' : '❌ Denied'}`);
    if (!multipleWebsitesAccess.hasAccess) {
      console.log(`   Reason: ${multipleWebsitesAccess.reason}`);
    }
    
    // Get user's existing domains
    const userDomains = await db
      .select()
      .from(websites)
      .where(eq(websites.userId, currentUser.id));

    console.log(`\n📊 Current domains: ${userDomains.length}/10`);
    userDomains.forEach((domain, index) => {
      try {
        const hostname = new URL(domain.url).hostname;
        console.log(`   ${index + 1}. ${hostname} (${domain.url})`);
      } catch (e) {
        console.log(`   ${index + 1}. ${domain.url} (invalid URL format)`);
      }
    });

    console.log('\n🧪 Manual Test Steps:');
    console.log('1. Go to http://localhost:3000/dashboard/scan');
    console.log('2. Enter a URL (e.g., https://example.com/test)');
    console.log('3. Check browser console for errors');
    console.log('4. Check network tab for failed requests');
    
    console.log('\n🔍 Common Issues to Check:');
    console.log('- Browser console errors');
    console.log('- Network requests failing (check Network tab)');
    console.log('- Feature access denied (check above)');
    console.log('- URL validation failing');
    console.log('- tRPC mutation errors');
    
    console.log('\n💡 Debug Tips:');
    console.log('- Open browser dev tools');
    console.log('- Watch console logs during scan attempt');
    console.log('- Check Network tab for HTTP request/response');
    console.log('- Look for "📝 Website created/found:" log message');

  } catch (error) {
    console.error('❌ Error debugging scan issue:', error);
  }
}

debugScanIssue().catch(console.error);