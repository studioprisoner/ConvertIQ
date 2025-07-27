#!/usr/bin/env bun

/**
 * Check what domains/websites are in the database
 * Run with: bun run src/scripts/check-domains.ts
 */

import { db } from '@/db/connection';
import { websites } from '@/db/schema/websites';

async function checkDomains() {
  console.log('🔍 Checking domains in database...\n');
  
  try {
    const allWebsites = await db
      .select()
      .from(websites)
      .orderBy(websites.createdAt);
    
    console.log(`📊 Found ${allWebsites.length} websites in database:\n`);
    
    if (allWebsites.length === 0) {
      console.log('❌ No websites found in database');
      return;
    }
    
    allWebsites.forEach((website, index) => {
      console.log(`Website ${index + 1}:`);
      console.log(`  ID: ${website.id}`);
      console.log(`  Name: ${website.name}`);
      console.log(`  URL: ${website.url}`);
      console.log(`  User ID: ${website.userId}`);
      console.log(`  Page Type: ${website.pageType}`);
      console.log(`  Validated: ${website.isValidated}`);
      console.log(`  Description: ${website.description || 'none'}`);
      console.log(`  Created: ${website.createdAt}`);
      console.log(`  Updated: ${website.updatedAt}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error checking domains:', error);
  }
}

checkDomains().catch(console.error);