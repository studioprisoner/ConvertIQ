#!/usr/bin/env bun

import { db } from '../db/connection';

async function cleanupWebsites() {
  try {
    console.log('🧹 Starting websites cleanup...');
    
    // Check current state
    const checkResult = await db.execute('SELECT COUNT(*) as count FROM websites');
    const websitesCount = parseInt(checkResult.rows[0].count as string);
    console.log(`📊 Found ${websitesCount} websites to delete`);
    
    if (websitesCount === 0) {
      console.log('✅ No websites to delete.');
      return;
    }
    
    // Show which websites will be deleted
    const websitesResult = await db.execute('SELECT id, url, name FROM websites');
    console.log('🗑️  Websites to be deleted:');
    websitesResult.rows.forEach((website, index) => {
      console.log(`   ${index + 1}. ${website.name} (${website.url})`);
    });
    
    // Delete all websites
    console.log('🗑️  Deleting all websites...');
    const deleteResult = await db.execute('DELETE FROM websites');
    console.log(`✅ Successfully deleted websites`);
    
    // Verify cleanup
    const verifyResult = await db.execute('SELECT COUNT(*) as count FROM websites');
    const remainingCount = parseInt(verifyResult.rows[0].count as string);
    
    if (remainingCount === 0) {
      console.log('🎉 Cleanup successful! No websites remain.');
      console.log('📋 The reports page should now show completely empty.');
    } else {
      console.log(`⚠️  ${remainingCount} websites still remain.`);
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup if this script is executed directly
if (import.meta.main) {
  cleanupWebsites()
    .then(() => {
      console.log('🏁 Website cleanup script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { cleanupWebsites };