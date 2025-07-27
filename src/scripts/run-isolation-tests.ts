#!/usr/bin/env bun

/**
 * Comprehensive test runner for ConvertIQ user data isolation
 * Runs all automated tests and provides guidance for manual testing
 * 
 * Usage: bun run src/scripts/run-isolation-tests.ts [--full] [--unit] [--integration] [--database]
 */

import { parseArgs } from 'util';

async function runUnitTests() {
  console.log('🧪 Running Unit Tests (API Security)...\n');
  
  try {
    const { execa } = await import('execa');
    const result = await execa('bun', ['test', 'src/test/api/'], {
      stdio: 'inherit',
    });
    
    console.log('✅ Unit tests completed successfully\n');
    return true;
  } catch (error) {
    console.log('❌ Unit tests failed\n');
    console.error(error);
    return false;
  }
}

async function runIntegrationTests() {
  console.log('🔗 Running Integration Tests (Report Generation)...\n');
  
  try {
    const { execa } = await import('execa');
    const result = await execa('bun', ['test', 'src/test/integration/'], {
      stdio: 'inherit',
    });
    
    console.log('✅ Integration tests completed successfully\n');
    return true;
  } catch (error) {
    console.log('❌ Integration tests failed\n');
    console.error(error);
    return false;
  }
}

async function runDatabaseTests() {
  console.log('🗄️  Running Database Isolation Tests...\n');
  
  try {
    const { execa } = await import('execa');
    const result = await execa('bun', ['test:isolation'], {
      stdio: 'inherit',
    });
    
    console.log('✅ Database isolation tests completed successfully\n');
    return true;
  } catch (error) {
    console.log('❌ Database isolation tests failed\n');
    console.error(error);
    return false;
  }
}

async function runDatabaseValidation() {
  console.log('🔍 Running Database Validation Script...\n');
  
  try {
    const { testDataIsolation } = await import('./test-data-isolation');
    await testDataIsolation();
    console.log('✅ Database validation completed successfully\n');
    return true;
  } catch (error) {
    console.log('❌ Database validation failed\n');
    console.error(error);
    return false;
  }
}

function showManualTestGuidance() {
  console.log('📋 Manual Frontend Testing Required\n');
  console.log('Please follow the manual testing procedures:');
  console.log('📄 File: src/test/procedures/frontend-isolation-testing.md\n');
  
  console.log('🔧 Key Manual Tests:');
  console.log('  1. Login isolation with both test users');
  console.log('  2. Website access verification');
  console.log('  3. Report generation and viewing');
  console.log('  4. Dashboard data isolation');
  console.log('  5. API endpoint manual testing\n');
  
  console.log('👥 Test Users:');
  console.log('  • Josh: josh@studioprisoner.com');
  console.log('  • Gmail: studioprisoner@gmail.com\n');
  
  console.log('🌐 Test Environment: http://localhost:3000\n');
  console.log('📝 Document results in the manual test report template\n');
}

function showTestSummary(results: { [key: string]: boolean }) {
  console.log('='.repeat(60));
  console.log('🎯 TEST SUMMARY');
  console.log('='.repeat(60));
  
  let allPassed = true;
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} ${test}`);
    if (!passed) allPassed = false;
  });
  
  console.log('='.repeat(60));
  console.log(`🏁 OVERALL STATUS: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('='.repeat(60));
  
  if (!allPassed) {
    console.log('\n⚠️  Some automated tests failed. Please review the output above.');
    console.log('Do not proceed with manual testing until automated tests pass.\n');
  } else {
    console.log('\n🎉 All automated tests passed!');
    console.log('You can now proceed with manual frontend testing.\n');
  }
  
  return allPassed;
}

async function main() {
  console.log('🔐 ConvertIQ User Data Isolation Test Suite\n');
  console.log('Testing CON-55: Comprehensive User Data Isolation\n');
  
  // Parse command line arguments
  const args = parseArgs({
    args: process.argv.slice(2),
    options: {
      full: { type: 'boolean', short: 'f' },
      unit: { type: 'boolean', short: 'u' },
      integration: { type: 'boolean', short: 'i' },
      database: { type: 'boolean', short: 'd' },
      manual: { type: 'boolean', short: 'm' },
    },
    allowPositionals: false,
  });
  
  const runAll = args.values.full || Object.keys(args.values).length === 0;
  const results: { [key: string]: boolean } = {};
  
  try {
    // Run Unit Tests (API Security)
    if (runAll || args.values.unit) {
      results['Unit Tests (API Security)'] = await runUnitTests();
    }
    
    // Run Integration Tests (Report Generation)
    if (runAll || args.values.integration) {
      results['Integration Tests (Report Generation)'] = await runIntegrationTests();
    }
    
    // Run Database Tests
    if (runAll || args.values.database) {
      results['Database Isolation Tests'] = await runDatabaseTests();
      results['Database Validation'] = await runDatabaseValidation();
    }
    
    // Show manual test guidance
    if (runAll || args.values.manual) {
      showManualTestGuidance();
    }
    
    // Show summary
    const allPassed = showTestSummary(results);
    
    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Unexpected error running tests:', error);
    process.exit(1);
  }
}

// Show usage information
function showUsage() {
  console.log(`
Usage: bun run src/scripts/run-isolation-tests.ts [options]

Options:
  -f, --full         Run all automated tests (default)
  -u, --unit         Run only unit tests
  -i, --integration  Run only integration tests  
  -d, --database     Run only database tests
  -m, --manual       Show manual testing guidance only
  
Examples:
  bun run src/scripts/run-isolation-tests.ts              # Run all tests
  bun run src/scripts/run-isolation-tests.ts --unit       # Unit tests only
  bun run src/scripts/run-isolation-tests.ts --database   # Database tests only
  bun run src/scripts/run-isolation-tests.ts --manual     # Manual guidance only

Description:
  This script runs comprehensive tests to verify user data isolation
  after fixing security vulnerabilities (CON-53) and report generation
  issues (CON-54). It includes automated tests and manual procedures.
  
Test Coverage:
  • API endpoint security (websites, reports)
  • Report generation workflow integrity
  • Database user data separation
  • Frontend data isolation procedures
  
Test Users:
  • josh@studioprisoner.com (ID: BaBT5A5h67JAkNG32KhaX3ase08Xlgro)
  • studioprisoner@gmail.com (ID: Afa6IBKpDjrs9LjwgJdbH7sFw2nZxznY)
`);
}

if (import.meta.main) {
  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showUsage();
    process.exit(0);
  }
  
  main();
}

export { main as runIsolationTests };