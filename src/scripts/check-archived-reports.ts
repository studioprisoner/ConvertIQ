#!/usr/bin/env bun

/**
 * Check what's in archived reports
 * Run with: bun run src/scripts/check-archived-reports.ts
 */

import { db } from '@/db/connection';
import { analyses } from '@/db/schema/analyses';
import { websites } from '@/db/schema/websites';
import { eq, desc } from 'drizzle-orm';

async function checkArchivedReports() {
  console.log('🔍 Checking archived reports...\n');
  
  try {
    // Get all analyses marked as archived
    const archivedAnalyses = await db
      .select({
        analysisId: analyses.id,
        websiteId: analyses.websiteId,
        status: analyses.status,
        errorMessage: analyses.errorMessage,
        aiAnalysis: analyses.aiAnalysis,
        createdAt: analyses.createdAt,
      })
      .from(analyses)
      .where(eq(analyses.status, 'failed'))
      .orderBy(desc(analyses.createdAt));

    // Filter to only archived ones
    const archived = archivedAnalyses.filter(row => 
      row.errorMessage && row.errorMessage.includes('ARCHIVED_BY_USER')
    );

    console.log(`📊 Found ${archived.length} archived analyses:\n`);

    for (const analysis of archived) {
      // Get website info
      const [website] = await db
        .select()
        .from(websites)
        .where(eq(websites.id, analysis.websiteId))
        .limit(1);

      console.log(`Archive ${archived.indexOf(analysis) + 1}:`);
      console.log(`  Analysis ID: ${analysis.analysisId}`);
      console.log(`  Website: ${website?.name || 'Unknown'} (${website?.url || 'Unknown URL'})`);
      console.log(`  Has AI Analysis: ${!!analysis.aiAnalysis}`);
      console.log(`  Error Message: ${analysis.errorMessage}`);
      console.log(`  Created: ${analysis.createdAt}`);
      
      // Check if this was a real scan or just a domain entry
      if (analysis.aiAnalysis) {
        console.log(`  ✅ Real scan - has analysis data`);
      } else {
        console.log(`  ❌ Just a domain entry - no actual scan performed`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error checking archived reports:', error);
  }
}

checkArchivedReports().catch(console.error);