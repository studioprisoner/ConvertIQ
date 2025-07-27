#!/usr/bin/env bun

/**
 * Standalone script to test user data isolation in production database
 * Run with: bun run src/scripts/test-data-isolation.ts
 */

import { generateIsolationReport, quickHealthCheck, runFullIsolationTest } from '../test/isolation/database-utils';

async function main() {
  console.log('🔍 ConvertIQ Data Isolation Test\n');

  try {
    // Quick health check first
    console.log('⚡ Running quick health check...');
    const health = await quickHealthCheck();
    
    if (!health.overallHealth) {
      console.log('❌ Health check failed:');
      console.log(`  Josh user exists: ${health.joshExists}`);
      console.log(`  Gmail user exists: ${health.gmailExists}`);
      console.log(`  Josh website exists: ${health.joshWebsiteExists}`);
      console.log(`  Gmail website exists: ${health.gmailWebsiteExists}`);
      console.log('\n⚠️  Cannot proceed with isolation tests - test data missing');
      process.exit(1);
    }
    
    console.log('✅ Health check passed - all test data present\n');

    // Run full isolation tests
    console.log('🔬 Running comprehensive isolation tests...');
    const testResults = await runFullIsolationTest();
    
    if (testResults.overall) {
      console.log('✅ All isolation tests passed!\n');
    } else {
      console.log('❌ Some isolation tests failed!\n');
    }

    // Generate detailed report
    console.log('📊 Generating detailed report...\n');
    const report = await generateIsolationReport();
    console.log(report);

    // Summary
    console.log('=== Summary ===');
    testResults.results.forEach(({ test, result }) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${test}`);
    });

    console.log(`\n🎯 Overall Status: ${testResults.overall ? '✅ PASSED' : '❌ FAILED'}`);

    if (!testResults.overall) {
      console.log('\n⚠️  Data isolation issues detected. Review the report above for details.');
      process.exit(1);
    } else {
      console.log('\n🎉 All user data isolation checks passed successfully!');
    }

  } catch (error) {
    console.error('💥 Error running isolation tests:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { main as testDataIsolation };