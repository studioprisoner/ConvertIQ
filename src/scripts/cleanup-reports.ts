#!/usr/bin/env bun

import { db } from '../db/connection';
import { reports, recommendations, analyses, websites } from '../db/schema';

async function cleanupReports() {
  try {
    console.log('🧹 Starting comprehensive reports cleanup...');
    
    // First, let's see how many records we have before cleanup
    const reportCount = await db.select().from(reports);
    const recommendationCount = await db.select().from(recommendations);
    const websitesCount = await db.select().from(websites);
    
    // Try to get analyses count, handling potential schema mismatch
    let analysesCount: any[] = [];
    let rawAnalysesCount = 0;
    try {
      analysesCount = await db.select().from(analyses);
    } catch (error) {
      console.log('⚠️  Schema mismatch detected in analyses table, trying direct query...');
      // Fall back to raw query to see what's actually in the table
      const result = await db.execute('SELECT COUNT(*) as count FROM analyses');
      rawAnalysesCount = parseInt(result.rows[0].count as string);
      console.log(`📊 Found ${rawAnalysesCount} analyses via raw query`);
    }
    
    console.log(`📊 Database status before cleanup:`);
    console.log(`   - Reports: ${reportCount.length}`);
    console.log(`   - Recommendations: ${recommendationCount.length}`);
    console.log(`   - Analyses: ${analysesCount.length || rawAnalysesCount}`);
    console.log(`   - Websites: ${websitesCount.length}`);
    
    // Delete recommendations first (they reference reports)
    if (recommendationCount.length > 0) {
      console.log('🗑️  Deleting recommendations...');
      await db.delete(recommendations);
      console.log(`✅ Deleted ${recommendationCount.length} recommendations`);
    }
    
    // Delete reports
    if (reportCount.length > 0) {
      console.log('🗑️  Deleting reports...');
      await db.delete(reports);
      console.log(`✅ Deleted ${reportCount.length} reports`);
    }
    
    // Delete analyses (this is what shows up as "reports" in the UI)
    const totalAnalyses = analysesCount.length || rawAnalysesCount;
    if (totalAnalyses > 0) {
      console.log('🗑️  Deleting analyses (which appear as reports in UI)...');
      try {
        await db.delete(analyses);
        console.log(`✅ Deleted ${analysesCount.length} analyses`);
      } catch (error) {
        console.log('⚠️  Schema mismatch in delete, using raw query...');
        const result = await db.execute('DELETE FROM analyses');
        console.log(`✅ Deleted analyses using raw query (affected ${totalAnalyses} rows)`);
      }
    }
    
    // Keep users and websites intact as requested
    console.log('🎉 Cleanup completed successfully!');
    console.log(`👤 Users and ${websitesCount.length} websites remain intact.`);
    console.log('📋 All reports/analyses data has been removed from the database.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup if this script is executed directly
if (import.meta.main) {
  cleanupReports()
    .then(() => {
      console.log('🏁 Cleanup script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { cleanupReports };