#!/usr/bin/env bun

/**
 * Create a test failed analysis to test the retrigger functionality
 * Run with: bun run src/scripts/create-test-failed-analysis.ts
 */

import { db } from '@/db/connection';
import { analyses } from '@/db/schema/analyses';
import { eq, desc } from 'drizzle-orm';

async function createTestFailedAnalysis() {
  console.log('🧪 Creating Test Failed Analysis for Retrigger Testing...\n');
  
  try {
    // Get the most recent analysis
    const [latestAnalysis] = await db
      .select()
      .from(analyses)
      .orderBy(desc(analyses.createdAt))
      .limit(1);
    
    if (!latestAnalysis) {
      console.log('❌ No analyses found in database');
      return;
    }
    
    console.log('📋 Latest analysis found:');
    console.log(`   ID: ${latestAnalysis.id}`);
    console.log(`   Current Status: ${latestAnalysis.status}`);
    console.log(`   Website ID: ${latestAnalysis.websiteId}`);
    
    // Update it to failed status for testing
    const [updatedAnalysis] = await db
      .update(analyses)
      .set({
        status: 'failed',
        actions: 'none',
        errorMessage: 'Test error - Analysis failed during processing (created for retrigger testing)',
        updatedAt: new Date()
      })
      .where(eq(analyses.id, latestAnalysis.id))
      .returning();
    
    console.log('\n✅ Analysis updated for testing:');
    console.log(`   ID: ${updatedAnalysis.id}`);
    console.log(`   New Status: ${updatedAnalysis.status}`);
    console.log(`   Error Message: ${updatedAnalysis.errorMessage}`);
    console.log(`   Updated At: ${updatedAnalysis.updatedAt}`);
    
    console.log('\n🎯 Ready for Testing!');
    console.log('   1. Go to /dashboard/reports');
    console.log('   2. Look for the failed report (red/zinc badge)');
    console.log('   3. You should see a blue retrigger button (⟲)');
    console.log('   4. Click it to test the retrigger functionality');
    
    console.log('\n🔄 To restore the analysis to completed status later:');
    console.log(`   bun run -e "
import { db } from './src/db/connection';
import { analyses } from './src/db/schema/analyses';
import { eq } from 'drizzle-orm';

await db.update(analyses)
  .set({
    status: 'completed',
    actions: 'none',
    errorMessage: null,
    updatedAt: new Date()
  })
  .where(eq(analyses.id, '${updatedAnalysis.id}'));

console.log('✅ Analysis restored to completed status');
"`);
    
  } catch (error) {
    console.error('❌ Error creating test failed analysis:', error);
  }
}

createTestFailedAnalysis().catch(console.error);