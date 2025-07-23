#!/usr/bin/env bun

/**
 * Fix domain ownership by associating anonymous websites with actual user
 * Run with: bun run src/scripts/fix-domain-ownership.ts
 */

import { db } from '@/db/connection';
import { websites } from '@/db/schema/websites';
import { user } from '@/db/schema/auth';
import { eq } from 'drizzle-orm';

async function fixDomainOwnership() {
  console.log('🔧 Fixing domain ownership...\n');
  
  try {
    // Get the current user (assuming the most recent user is the current one)
    const users = await db
      .select()
      .from(user)
      .orderBy(user.createdAt);
    
    if (users.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    // Use the most recent user (you can change this logic if needed)
    const currentUser = users[users.length - 1];
    console.log(`🎯 Using user: ${currentUser.name} (${currentUser.email})`);
    console.log(`   User ID: ${currentUser.id}\n`);
    
    // Find all anonymous websites
    const anonymousWebsites = await db
      .select()
      .from(websites)
      .where(eq(websites.userId, 'anonymous'));
    
    console.log(`📊 Found ${anonymousWebsites.length} anonymous websites\n`);
    
    if (anonymousWebsites.length === 0) {
      console.log('✅ No anonymous websites to fix');
      return;
    }
    
    // Update all anonymous websites to belong to the current user
    const updateResult = await db
      .update(websites)
      .set({
        userId: currentUser.id,
        updatedAt: new Date()
      })
      .where(eq(websites.userId, 'anonymous'))
      .returning();
    
    console.log(`✅ Successfully updated ${updateResult.length} websites:`);
    updateResult.forEach((website, index) => {
      console.log(`   ${index + 1}. ${website.name} (${website.url})`);
    });
    
    console.log('\n🎉 Domain ownership fixed! You should now be able to see domains in /dashboard/domains');
    
  } catch (error) {
    console.error('❌ Error fixing domain ownership:', error);
  }
}

fixDomainOwnership().catch(console.error);