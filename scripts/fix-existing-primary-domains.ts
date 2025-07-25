#!/usr/bin/env bun
/**
 * Fix existing users who have primaryDomain set but no corresponding websites entry
 * This addresses the onboarding bug where domains weren't added to websites table
 */

import { db } from '@/db/connection';
import { user as userTable } from '@/db/schema/auth';
import { websites } from '@/db/schema/websites';
import { eq, isNotNull, and } from 'drizzle-orm';

async function fixExistingPrimaryDomains() {
  console.log('🔧 Fixing existing users with primary domains...');
  
  try {
    // Find users who have a primaryDomain but no websites
    console.log('🔍 Finding users with primary domains but no websites...');
    
    const usersWithPrimaryDomain = await db
      .select({
        id: userTable.id,
        email: userTable.email,
        name: userTable.name,
        primaryDomain: userTable.primaryDomain,
      })
      .from(userTable)
      .where(
        and(
          isNotNull(userTable.primaryDomain),
          isNotNull(userTable.email) // Ensure it's a valid user
        )
      );

    console.log(`📊 Found ${usersWithPrimaryDomain.length} users with primary domains`);

    let fixedCount = 0;
    let alreadyFixedCount = 0;

    for (const user of usersWithPrimaryDomain) {
      // Check if user already has websites
      const existingWebsites = await db
        .select()
        .from(websites)
        .where(eq(websites.userId, user.id))
        .limit(1);

      if (existingWebsites.length === 0) {
        // User has no websites, add their primary domain
        console.log(`🆕 Adding primary domain for user ${user.email}: ${user.primaryDomain}`);
        
        try {
          // Extract domain name for the website name
          const domainName = user.primaryDomain!.replace(/^https?:\/\//, '').replace(/^www\./, '');
          const websiteName = domainName.split('.')[0] || 'Primary Website';
          
          await db.insert(websites).values({
            userId: user.id,
            url: user.primaryDomain!,
            name: websiteName.charAt(0).toUpperCase() + websiteName.slice(1),
            description: 'Primary domain from onboarding (migrated)',
            isValidated: true,
            validationStatus: 'valid',
            lastValidatedAt: new Date(),
          });
          
          fixedCount++;
          console.log(`✅ Fixed user ${user.email}`);
        } catch (error) {
          console.error(`❌ Error fixing user ${user.email}:`, error);
        }
      } else {
        alreadyFixedCount++;
        console.log(`ℹ️ User ${user.email} already has websites, skipping`);
      }
    }

    console.log('\n📋 Summary:');
    console.log(`  Users processed: ${usersWithPrimaryDomain.length}`);
    console.log(`  Users fixed: ${fixedCount}`);
    console.log(`  Users already fixed: ${alreadyFixedCount}`);
    
    console.log('\n✅ Migration completed!');

  } catch (error) {
    console.error('❌ Error fixing existing primary domains:', error);
    throw error;
  }
}

// Run the fix
if (require.main === module) {
  fixExistingPrimaryDomains()
    .then(() => {
      console.log('✅ Fix completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fix failed:', error);
      process.exit(1);
    });
}