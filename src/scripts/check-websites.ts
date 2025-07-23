#!/usr/bin/env bun

import { db } from '../db/connection';

async function checkWebsites() {
  try {
    console.log('🔍 Checking websites table...');
    
    // Get all websites
    const websitesResult = await db.execute('SELECT * FROM websites');
    console.log(`📊 Found ${websitesResult.rows.length} websites:`);
    
    websitesResult.rows.forEach((website, index) => {
      console.log(`${index + 1}. ID: ${website.id}, URL: ${website.url}, Name: ${website.name}`);
    });
    
    // Check for any remaining analyses
    const analysesResult = await db.execute('SELECT COUNT(*) as count FROM analyses');
    const analysesCount = parseInt(analysesResult.rows[0].count as string);
    console.log(`📊 Analyses count: ${analysesCount}`);
    
  } catch (error) {
    console.error('❌ Error checking websites:', error);
    process.exit(1);
  }
}

// Run the check if this script is executed directly
if (import.meta.main) {
  checkWebsites()
    .then(() => {
      console.log('🏁 Website check finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { checkWebsites };