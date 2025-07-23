#!/usr/bin/env bun

import { db } from '../db/connection';
import { analyses, websites, reports, recommendations } from '../db/schema';

async function checkDatabaseData() {
  try {
    console.log('🔍 Checking database data...');
    
    // Check analyses
    const analysesData = await db.select().from(analyses);
    console.log(`📊 Analyses table: ${analysesData.length} records`);
    if (analysesData.length > 0) {
      console.log('First analysis:', JSON.stringify(analysesData[0], null, 2));
    }
    
    // Check websites
    const websitesData = await db.select().from(websites);
    console.log(`🌐 Websites table: ${websitesData.length} records`);
    if (websitesData.length > 0) {
      console.log('First website:', JSON.stringify(websitesData[0], null, 2));
    }
    
    // Check reports
    const reportsData = await db.select().from(reports);
    console.log(`📋 Reports table: ${reportsData.length} records`);
    
    // Check recommendations
    const recommendationsData = await db.select().from(recommendations);
    console.log(`💡 Recommendations table: ${recommendationsData.length} records`);
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
    process.exit(1);
  }
}

// Run the check if this script is executed directly
if (import.meta.main) {
  checkDatabaseData()
    .then(() => {
      console.log('🏁 Database check finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { checkDatabaseData };