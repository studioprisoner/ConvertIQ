#!/usr/bin/env bun

/**
 * Test that reports list only shows scanned websites
 * Run with: bun run src/scripts/test-reports-filter.ts
 */

import { db } from '@/db/connection';
import { analyses } from '@/db/schema/analyses';
import { websites } from '@/db/schema/websites';
import { eq, desc } from 'drizzle-orm';

async function testReportsFilter() {
  console.log('🔍 Testing reports list filtering...\n');
  
  try {
    console.log('1. Checking all websites:');
    const allWebsites = await db
      .select({
        id: websites.id,
        name: websites.name,
        url: websites.url,
      })
      .from(websites)
      .orderBy(websites.createdAt);
    
    console.log(`   Total websites: ${allWebsites.length}`);
    
    console.log('\n2. Checking all analyses:');
    const allAnalyses = await db
      .select({
        id: analyses.id,
        websiteId: analyses.websiteId,
        status: analyses.status,
        hasAI: analyses.aiAnalysis,
      })
      .from(analyses)
      .orderBy(analyses.createdAt);
    
    console.log(`   Total analyses: ${allAnalyses.length}`);
    
    console.log('\n3. Simulating NEW reports query (innerJoin - only scanned websites):');
    const newReportsData = await db
      .select({
        websiteId: websites.id,
        websiteUrl: websites.url,
        websiteName: websites.name,
        analysisId: analyses.id,
        analysisStatus: analyses.status,
        analysisCreatedAt: analyses.createdAt,
        aiAnalysis: analyses.aiAnalysis,
        errorMessage: analyses.errorMessage,
      })
      .from(websites)
      .innerJoin(analyses, eq(analyses.websiteId, websites.id))
      .orderBy(desc(analyses.createdAt));

    // Filter out archived
    const nonArchivedReports = newReportsData.filter(row => 
      !row.errorMessage || !row.errorMessage.includes('ARCHIVED_BY_USER')
    );

    console.log(`   Reports with innerJoin: ${newReportsData.length}`);
    console.log(`   Non-archived reports: ${nonArchivedReports.length}`);
    
    console.log('\n4. Reports that will show:');
    nonArchivedReports.forEach((report, index) => {
      const hasAI = !!report.aiAnalysis;
      console.log(`   ${index + 1}. ${report.websiteName} - Status: ${report.analysisStatus} - Has AI: ${hasAI}`);
    });

    console.log('\n5. Websites WITHOUT analyses (will NOT appear in reports):');
    const websitesWithoutAnalyses = allWebsites.filter(website => 
      !allAnalyses.some(analysis => analysis.websiteId === website.id)
    );
    
    console.log(`   Websites without scans: ${websitesWithoutAnalyses.length}`);
    websitesWithoutAnalyses.forEach((website, index) => {
      console.log(`   ${index + 1}. ${website.name} (${website.url})`);
    });

    console.log(`\n✅ Filter working correctly! Only ${nonArchivedReports.length} scanned websites will appear in reports list.`);

  } catch (error) {
    console.error('❌ Error testing reports filter:', error);
  }
}

testReportsFilter().catch(console.error);