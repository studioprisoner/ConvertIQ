#!/usr/bin/env bun

/**
 * Investigate specific report retrigger issue
 * Run with: bun run src/scripts/investigate-report-issue.ts
 */

import { db } from '@/db/connection';
import { analyses } from '@/db/schema/analyses';
import { websites } from '@/db/schema/websites';
import { eq } from 'drizzle-orm';

const REPORT_ID = 'a7de7088-bb17-4797-a460-b9ef2e2ac113';

async function investigateReportIssue() {
  console.log(`🔍 Investigating Report Issue: ${REPORT_ID}\n`);
  
  try {
    // 1. Check if this is a website ID or analysis ID
    console.log('1. Checking if ID is Website or Analysis...');
    
    // First check if it's an analysis ID
    const [analysisById] = await db
      .select()
      .from(analyses)
      .where(eq(analyses.id, REPORT_ID))
      .limit(1);
    
    if (analysisById) {
      console.log('   ✅ Found as Analysis ID');
      console.log('   Analysis Details:');
      console.log(`     ID: ${analysisById.id}`);
      console.log(`     Website ID: ${analysisById.websiteId}`);
      console.log(`     Status: ${analysisById.status}`);
      console.log(`     Actions: ${analysisById.actions}`);
      console.log(`     Error: ${analysisById.errorMessage || 'none'}`);
      console.log(`     Created: ${analysisById.createdAt}`);
      console.log(`     Updated: ${analysisById.updatedAt}`);
      
      // Get the website info
      const [website] = await db
        .select()
        .from(websites)
        .where(eq(websites.id, analysisById.websiteId))
        .limit(1);
      
      if (website) {
        console.log('   Website Details:');
        console.log(`     Name: ${website.name}`);
        console.log(`     URL: ${website.url}`);
        console.log(`     Page Type: ${website.pageType}`);
      }
      
    } else {
      // Check if it's a website ID
      const [websiteById] = await db
        .select()
        .from(websites)
        .where(eq(websites.id, REPORT_ID))
        .limit(1);
      
      if (websiteById) {
        console.log('   ✅ Found as Website ID');
        console.log('   Website Details:');
        console.log(`     ID: ${websiteById.id}`);
        console.log(`     Name: ${websiteById.name}`);
        console.log(`     URL: ${websiteById.url}`);
        console.log(`     Page Type: ${websiteById.pageType}`);
        
        // Find associated analyses
        const associatedAnalyses = await db
          .select()
          .from(analyses)
          .where(eq(analyses.websiteId, websiteById.id));
        
        console.log(`   Associated Analyses: ${associatedAnalyses.length}`);
        associatedAnalyses.forEach((analysis, index) => {
          console.log(`     Analysis ${index + 1}:`);
          console.log(`       ID: ${analysis.id}`);
          console.log(`       Status: ${analysis.status}`);
          console.log(`       Actions: ${analysis.actions}`);
          console.log(`       Created: ${analysis.createdAt}`);
        });
        
      } else {
        console.log('   ❌ ID not found as either Website or Analysis');
        return;
      }
    }
    
    // 2. Check the reports list query to see how this report appears
    console.log('\n2. Checking how this appears in reports list...');
    
    // Simulate the reports list query logic
    const reportsQuery = await db
      .select({
        websiteId: websites.id,
        websiteUrl: websites.url,
        websiteName: websites.name,
        pageType: websites.pageType,
        websiteCreatedAt: websites.createdAt,
        analysisId: analyses.id,
        analysisStatus: analyses.status,
        analysisActions: analyses.actions,
        analysisCreatedAt: analyses.createdAt,
        aiAnalysis: analyses.aiAnalysis,
        errorMessage: analyses.errorMessage,
      })
      .from(websites)
      .leftJoin(analyses, eq(websites.id, analyses.websiteId))
      .where(
        analysisById 
          ? eq(websites.id, analysisById.websiteId)
          : eq(websites.id, REPORT_ID)
      );
    
    console.log('   Reports Query Results:');
    reportsQuery.forEach((row, index) => {
      console.log(`     Row ${index + 1}:`);
      console.log(`       Website ID: ${row.websiteId}`);
      console.log(`       Analysis ID: ${row.analysisId || 'null'}`);
      console.log(`       Analysis Status: ${row.analysisStatus || 'null'}`);
      console.log(`       Has Analysis: ${!!row.analysisId}`);
      console.log(`       Report ID (used in UI): ${row.analysisId || row.websiteId}`);
      console.log('');
    });
    
    // 3. Check retrigger button conditions
    console.log('3. Checking Retrigger Button Display Conditions...');
    
    const reportData = reportsQuery[0];
    if (reportData) {
      const reportStatus = reportData.analysisStatus || (reportData.analysisId ? 'completed' : 'pending');
      const hasAnalysis = !!reportData.analysisId;
      const canShowRetrigger = (reportStatus === 'pending' || reportStatus === 'failed') && hasAnalysis;
      
      console.log('   Retrigger Logic Check:');
      console.log(`     Report Status: ${reportStatus}`);
      console.log(`     Has Analysis: ${hasAnalysis}`);
      console.log(`     Status is pending/failed: ${reportStatus === 'pending' || reportStatus === 'failed'}`);
      console.log(`     Should show retrigger button: ${canShowRetrigger}`);
      
      if (!canShowRetrigger) {
        console.log('\n   🚨 ISSUE IDENTIFIED:');
        if (!hasAnalysis) {
          console.log('     - Report has no analysis record (hasAnalysis = false)');
          console.log('     - Retrigger button requires an existing analysis to retrigger');
          console.log('     - This report might need a new scan instead of retrigger');
        } else if (reportStatus !== 'pending' && reportStatus !== 'failed') {
          console.log(`     - Report status is "${reportStatus}" but retrigger only works for "pending" or "failed"`);
        }
      }
    }
    
    // 4. Provide solution
    console.log('\n4. Recommended Actions:');
    
    if (!analysisById && reportsQuery[0]?.analysisId) {
      // The report ID is website ID, but there's an analysis
      console.log('   ✅ Try using the Analysis ID instead:');
      console.log(`     Analysis ID: ${reportsQuery[0].analysisId}`);
      console.log('   🔧 The UI might be using website ID instead of analysis ID');
    } else if (analysisById && analysisById.status === 'pending') {
      console.log('   ✅ Analysis exists and is pending - should be retriggerable');
      console.log('   🔧 Check UI logic - there might be a frontend issue');
    } else if (!reportsQuery[0]?.analysisId) {
      console.log('   ⚠️  No analysis exists for this website');
      console.log('   💡 Recommendation: Start a new scan instead of retrigger');
      console.log('   📝 This explains why retrigger button is not showing');
    }
    
    console.log('\n   Manual Test Commands:');
    if (analysisById) {
      console.log(`   Test retrigger API directly:`);
      console.log(`   curl -X POST "http://localhost:3001/api/trpc/reports.retriggerAnalysis" \\`);
      console.log(`     -H "Content-Type: application/json" \\`);
      console.log(`     -d '{"0":{"json":{"analysisId":"${analysisById.id}"}}}'`);
    }
    
  } catch (error) {
    console.error('❌ Error investigating report issue:', error);
  }
}

investigateReportIssue().catch(console.error);