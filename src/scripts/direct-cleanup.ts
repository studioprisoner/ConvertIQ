#!/usr/bin/env bun

import { db } from '../db/connection';

async function directCleanup() {
  try {
    console.log('🧹 Starting direct SQL cleanup...');
    
    // Check current state
    const checkResult = await db.execute('SELECT COUNT(*) as count FROM analyses');
    const analysesCount = parseInt(checkResult.rows[0].count as string);
    console.log(`📊 Found ${analysesCount} analyses to delete`);
    
    if (analysesCount === 0) {
      console.log('✅ No analyses to delete.');
      return;
    }
    
    // Delete all analyses
    console.log('🗑️  Deleting all analyses...');
    const deleteResult = await db.execute('DELETE FROM analyses');
    console.log(`✅ Successfully deleted analyses`);
    
    // Verify cleanup
    const verifyResult = await db.execute('SELECT COUNT(*) as count FROM analyses');
    const remainingCount = parseInt(verifyResult.rows[0].count as string);
    
    if (remainingCount === 0) {
      console.log('🎉 Cleanup successful! No analyses remain.');
    } else {
      console.log(`⚠️  ${remainingCount} analyses still remain.`);
    }
    
    console.log('✅ Database cleanup completed.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup if this script is executed directly
if (import.meta.main) {
  directCleanup()
    .then(() => {
      console.log('🏁 Direct cleanup script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { directCleanup };