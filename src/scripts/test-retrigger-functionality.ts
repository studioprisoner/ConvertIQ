#!/usr/bin/env bun

/**
 * Test script to verify retrigger functionality
 * Run with: bun run src/scripts/test-retrigger-functionality.ts
 */

import { db } from '@/db/connection';
import { analyses } from '@/db/schema/analyses';
import { websites } from '@/db/schema/websites';
import { eq, desc } from 'drizzle-orm';

async function testRetriggerFunctionality() {
  console.log('🔍 Testing Retrigger Functionality...\n');
  
  try {
    // 1. Find all analyses and their current status
    console.log('1. Current Analyses in Database:');
    const allAnalyses = await db
      .select({
        id: analyses.id,
        websiteId: analyses.websiteId,
        status: analyses.status,
        actions: analyses.actions,
        errorMessage: analyses.errorMessage,
        createdAt: analyses.createdAt,
        updatedAt: analyses.updatedAt,
      })
      .from(analyses)
      .orderBy(desc(analyses.createdAt))
      .limit(10);
    
    if (allAnalyses.length === 0) {
      console.log('   ❌ No analyses found in database');
      return;
    }
    
    console.log(`   Found ${allAnalyses.length} analyses:`);
    allAnalyses.forEach((analysis, index) => {
      console.log(`   Analysis ${index + 1}:`);
      console.log(`     ID: ${analysis.id}`);
      console.log(`     Website ID: ${analysis.websiteId}`);
      console.log(`     Status: ${analysis.status}`);
      console.log(`     Actions: ${analysis.actions}`);
      console.log(`     Error: ${analysis.errorMessage || 'none'}`);
      console.log(`     Created: ${analysis.createdAt}`);
      console.log(`     Updated: ${analysis.updatedAt}`);
      console.log('');
    });
    
    // 2. Check for retriggerable analyses (pending or failed)
    console.log('2. Analyses Available for Retrigger:');
    const retriggerableAnalyses = allAnalyses.filter(a => 
      a.status === 'pending' || a.status === 'failed'
    );
    
    if (retriggerableAnalyses.length === 0) {
      console.log('   ❌ No pending or failed analyses found');
      console.log('   💡 You can create a test pending analysis by running a scan and interrupting it');
    } else {
      console.log(`   ✅ Found ${retriggerableAnalyses.length} retriggerable analyses:`);
      retriggerableAnalyses.forEach((analysis, index) => {
        console.log(`     ${index + 1}. ${analysis.id} - Status: ${analysis.status}`);
      });
    }
    
    // 3. Simulate retrigger operation on first retriggerable analysis
    if (retriggerableAnalyses.length > 0) {
      const testAnalysis = retriggerableAnalyses[0];
      
      console.log(`\n3. Testing Retrigger Operation on Analysis: ${testAnalysis.id}`);
      console.log(`   Original status: ${testAnalysis.status}`);
      
      // Update the analysis to simulate retrigger
      const [updatedAnalysis] = await db
        .update(analyses)
        .set({
          status: 'pending',
          actions: 'retry',
          errorMessage: null,
          updatedAt: new Date()
        })
        .where(eq(analyses.id, testAnalysis.id))
        .returning();
      
      console.log('   ✅ Retrigger simulation successful:');
      console.log(`     New status: ${updatedAnalysis.status}`);
      console.log(`     New actions: ${updatedAnalysis.actions}`);
      console.log(`     Error message cleared: ${updatedAnalysis.errorMessage === null ? 'Yes' : 'No'}`);
      console.log(`     Updated at: ${updatedAnalysis.updatedAt}`);
      
      // Restore original status for safety
      await db
        .update(analyses)
        .set({
          status: testAnalysis.status,
          actions: testAnalysis.actions,
          errorMessage: testAnalysis.errorMessage,
          updatedAt: testAnalysis.updatedAt
        })
        .where(eq(analyses.id, testAnalysis.id));
      
      console.log('   ✅ Original status restored for safety');
    }
    
    console.log('\n4. API Testing Instructions:');
    console.log('   To test the tRPC endpoint in the browser:');
    console.log('   1. Go to /dashboard/reports');
    console.log('   2. Look for reports with "pending" or "failed" status');
    console.log('   3. Click the blue refresh icon (⟲) next to such reports');
    console.log('   4. Confirm the retrigger operation');
    console.log('   5. Check that the status updates to "pending" and processing begins');
    
    console.log('\n   Or test via browser console:');
    console.log('   ```javascript');
    console.log('   // Replace ANALYSIS_ID with actual analysis ID');
    console.log('   fetch("/api/trpc/reports.retriggerAnalysis", {');
    console.log('     method: "POST",');
    console.log('     headers: { "Content-Type": "application/json" },');
    console.log('     body: JSON.stringify({');
    console.log('       "0": { "json": { "analysisId": "ANALYSIS_ID" } }');
    console.log('     }),');
    console.log('     credentials: "include"');
    console.log('   })');
    console.log('   .then(r => r.json())');
    console.log('   .then(console.log);');
    console.log('   ```');
    
    console.log('\n💡 To create test data for retrigger:');
    console.log('   1. Start a new scan from the scan page');
    console.log('   2. Let it create the website and analysis entries');
    console.log('   3. Stop the process before completion (analysis will remain "pending")');
    console.log('   4. Go to reports page and test the retrigger functionality');
    
  } catch (error) {
    console.error('❌ Error testing retrigger functionality:', error);
  }
}

testRetriggerFunctionality().catch(console.error);