#!/usr/bin/env bun

/**
 * Debug what the archived page is showing
 * Run with: bun run src/scripts/debug-archived-page.ts
 */

import { db } from '@/db/connection';
import { analyses } from '@/db/schema/analyses';
import { websites } from '@/db/schema/websites';
import { eq, desc } from 'drizzle-orm';

async function debugArchivedPage() {
  console.log('🔍 Debugging archived page data...\n');
  
  try {
    // Simulate the exact query from getArchivedReports
    const archivedData = await db
      .select({
        websiteId: websites.id,
        websiteUrl: websites.url,
        websiteName: websites.name,
        pageType: websites.pageType,
        websiteCreatedAt: websites.createdAt,
        analysisId: analyses.id,
        analysisStatus: analyses.status,
        analysisCreatedAt: analyses.createdAt,
        aiAnalysis: analyses.aiAnalysis,
        errorMessage: analyses.errorMessage,
      })
      .from(websites)
      .innerJoin(analyses, eq(analyses.websiteId, websites.id))
      .where(eq(analyses.status, 'failed')) // Using 'failed' temporarily until migration
      .orderBy(desc(analyses.createdAt))
      .limit(20);

    console.log(`📊 Raw query results: ${archivedData.length} records\n`);

    archivedData.forEach((row, index) => {
      console.log(`Record ${index + 1}:`);
      console.log(`  Website: ${row.websiteName} (${row.websiteUrl})`);
      console.log(`  Analysis ID: ${row.analysisId}`);
      console.log(`  Status: ${row.analysisStatus}`);
      console.log(`  Has AI Analysis: ${!!row.aiAnalysis}`);
      console.log(`  Error Message: ${row.errorMessage || 'none'}`);
      console.log(`  Has ARCHIVED_BY_USER: ${row.errorMessage?.includes('ARCHIVED_BY_USER') || false}`);
      console.log('');
    });

    // Filter to only show archived reports (like the actual function does)
    const archivedReports = archivedData
      .filter(row => row.errorMessage && row.errorMessage.includes('ARCHIVED_BY_USER'));

    console.log(`\n🎯 After filtering for ARCHIVED_BY_USER: ${archivedReports.length} reports`);

    if (archivedReports.length === 0) {
      console.log('✅ No archived reports - this explains why the page is empty');
      
      // Let's check what analyses exist in general
      console.log('\n📋 Checking all analyses:');
      const allAnalyses = await db
        .select({
          id: analyses.id,
          websiteId: analyses.websiteId,
          status: analyses.status,
          aiAnalysis: analyses.aiAnalysis,
          errorMessage: analyses.errorMessage,
        })
        .from(analyses)
        .orderBy(desc(analyses.createdAt))
        .limit(10);

      console.log(`Found ${allAnalyses.length} total analyses:`);
      allAnalyses.forEach((analysis, index) => {
        console.log(`  ${index + 1}. ${analysis.id} - Status: ${analysis.status} - Has AI: ${!!analysis.aiAnalysis}`);
      });
    }

  } catch (error) {
    console.error('❌ Error debugging archived page:', error);
  }
}

debugArchivedPage().catch(console.error);