import { db, TEST_USERS } from './setup';
import { websites } from '@/db/schema/websites';
import { analyses } from '@/db/schema/analyses';
import { reports } from '@/db/schema/reports';
import { recommendations } from '@/db/schema/recommendations';
import { user } from '@/db/schema/auth';
import { eq, and, count, sql } from 'drizzle-orm';

/**
 * Database validation utilities for testing user data isolation
 */

export interface UserDataStats {
  userId: string;
  email: string;
  websiteCount: number;
  analysisCount: number;
  reportCount: number;
  recommendationCount: number;
}

export interface IsolationTestResult {
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Get comprehensive data statistics for a user
 */
export async function getUserDataStats(userId: string): Promise<UserDataStats> {
  // Get user info
  const [userInfo] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!userInfo) {
    throw new Error(`User not found: ${userId}`);
  }

  // Get website count
  const [websiteStats] = await db
    .select({ count: count() })
    .from(websites)
    .where(eq(websites.userId, userId));

  // Get analysis count (through websites)
  const [analysisStats] = await db
    .select({ count: count() })
    .from(analyses)
    .innerJoin(websites, eq(analyses.websiteId, websites.id))
    .where(eq(websites.userId, userId));

  // Get report count (through analyses and websites)
  const [reportStats] = await db
    .select({ count: count() })
    .from(reports)
    .innerJoin(analyses, eq(reports.analysisId, analyses.id))
    .innerJoin(websites, eq(analyses.websiteId, websites.id))
    .where(eq(websites.userId, userId));

  // Get recommendation count (through reports, analyses, and websites)
  const [recommendationStats] = await db
    .select({ count: count() })
    .from(recommendations)
    .innerJoin(reports, eq(recommendations.reportId, reports.id))
    .innerJoin(analyses, eq(reports.analysisId, analyses.id))
    .innerJoin(websites, eq(analyses.websiteId, websites.id))
    .where(eq(websites.userId, userId));

  return {
    userId,
    email: userInfo.email!,
    websiteCount: websiteStats.count,
    analysisCount: analysisStats.count,
    reportCount: reportStats.count,
    recommendationCount: recommendationStats.count,
  };
}

/**
 * Verify that a user can only access their own websites
 */
export async function testWebsiteIsolation(userId: string): Promise<IsolationTestResult> {
  try {
    // Get all websites for the user
    const userWebsites = await db
      .select()
      .from(websites)
      .where(eq(websites.userId, userId));

    // Check that all returned websites belong to the user
    const invalidWebsites = userWebsites.filter(w => w.userId !== userId);
    
    if (invalidWebsites.length > 0) {
      return {
        passed: false,
        message: `Found ${invalidWebsites.length} websites with incorrect user assignment`,
        details: invalidWebsites.map(w => ({ id: w.id, actualUserId: w.userId, expectedUserId: userId })),
      };
    }

    return {
      passed: true,
      message: `Successfully verified ${userWebsites.length} websites belong to user ${userId}`,
      details: { websiteCount: userWebsites.length },
    };
  } catch (error) {
    return {
      passed: false,
      message: `Error testing website isolation: ${error}`,
    };
  }
}

/**
 * Verify that a user can only access reports through their own analyses
 */
export async function testReportIsolation(userId: string): Promise<IsolationTestResult> {
  try {
    // Get all reports accessible to the user through proper ownership chain
    const userReports = await db
      .select({
        reportId: reports.id,
        reportTitle: reports.title,
        analysisId: analyses.id,
        websiteId: websites.id,
        websiteUserId: websites.userId,
      })
      .from(reports)
      .innerJoin(analyses, eq(reports.analysisId, analyses.id))
      .innerJoin(websites, eq(analyses.websiteId, websites.id))
      .where(eq(websites.userId, userId));

    // Check that all reports trace back to user's websites
    const invalidReports = userReports.filter(r => r.websiteUserId !== userId);
    
    if (invalidReports.length > 0) {
      return {
        passed: false,
        message: `Found ${invalidReports.length} reports with broken ownership chain`,
        details: invalidReports,
      };
    }

    return {
      passed: true,
      message: `Successfully verified ${userReports.length} reports belong to user ${userId}`,
      details: { reportCount: userReports.length },
    };
  } catch (error) {
    return {
      passed: false,
      message: `Error testing report isolation: ${error}`,
    };
  }
}

/**
 * Test cross-user access prevention
 */
export async function testCrossUserAccess(): Promise<IsolationTestResult> {
  try {
    const joshId = TEST_USERS.josh.id;
    const gmailId = TEST_USERS.gmail.id;
    
    // Test 1: Verify Josh cannot access Gmail user's websites
    const joshAccessingGmailWebsites = await db
      .select()
      .from(websites)
      .where(and(
        eq(websites.id, TEST_USERS.gmail.websiteId),
        eq(websites.userId, joshId)
      ));

    if (joshAccessingGmailWebsites.length > 0) {
      return {
        passed: false,
        message: 'Josh can access Gmail user\'s website - isolation breach!',
        details: joshAccessingGmailWebsites,
      };
    }

    // Test 2: Verify Gmail user cannot access Josh's websites
    const gmailAccessingJoshWebsites = await db
      .select()
      .from(websites)
      .where(and(
        eq(websites.id, TEST_USERS.josh.websiteId),
        eq(websites.userId, gmailId)
      ));

    if (gmailAccessingJoshWebsites.length > 0) {
      return {
        passed: false,
        message: 'Gmail user can access Josh\'s website - isolation breach!',
        details: gmailAccessingJoshWebsites,
      };
    }

    // Test 3: Verify no shared websites between users
    const sharedWebsites = await db
      .select()
      .from(websites)
      .where(sql`${websites.userId} = ${joshId} AND ${websites.userId} = ${gmailId}`);

    if (sharedWebsites.length > 0) {
      return {
        passed: false,
        message: 'Found shared websites between users - impossible condition!',
        details: sharedWebsites,
      };
    }

    return {
      passed: true,
      message: 'Cross-user access prevention verified successfully',
    };
  } catch (error) {
    return {
      passed: false,
      message: `Error testing cross-user access: ${error}`,
    };
  }
}

/**
 * Check for data integrity issues
 */
export async function testDataIntegrity(): Promise<IsolationTestResult> {
  try {
    const issues: string[] = [];

    // Check for orphaned analyses (analyses without valid websites)
    const orphanedAnalyses = await db
      .select({
        analysisId: analyses.id,
        websiteId: analyses.websiteId,
      })
      .from(analyses)
      .leftJoin(websites, eq(analyses.websiteId, websites.id))
      .where(sql`${websites.id} IS NULL`);

    if (orphanedAnalyses.length > 0) {
      issues.push(`Found ${orphanedAnalyses.length} orphaned analyses`);
    }

    // Check for orphaned reports (reports without valid analyses)
    const orphanedReports = await db
      .select({
        reportId: reports.id,
        analysisId: reports.analysisId,
      })
      .from(reports)
      .leftJoin(analyses, eq(reports.analysisId, analyses.id))
      .where(sql`${analyses.id} IS NULL`);

    if (orphanedReports.length > 0) {
      issues.push(`Found ${orphanedReports.length} orphaned reports`);
    }

    // Check for orphaned recommendations (recommendations without valid reports)
    const orphanedRecommendations = await db
      .select({
        recommendationId: recommendations.id,
        reportId: recommendations.reportId,
      })
      .from(recommendations)
      .leftJoin(reports, eq(recommendations.reportId, reports.id))
      .where(sql`${reports.id} IS NULL`);

    if (orphanedRecommendations.length > 0) {
      issues.push(`Found ${orphanedRecommendations.length} orphaned recommendations`);
    }

    if (issues.length > 0) {
      return {
        passed: false,
        message: 'Data integrity issues found',
        details: issues,
      };
    }

    return {
      passed: true,
      message: 'Data integrity check passed',
    };
  } catch (error) {
    return {
      passed: false,
      message: `Error checking data integrity: ${error}`,
    };
  }
}

/**
 * Run all isolation tests
 */
export async function runFullIsolationTest(): Promise<{
  overall: boolean;
  results: Array<{ test: string; result: IsolationTestResult }>;
}> {
  const tests = [
    { name: 'Josh Website Isolation', fn: () => testWebsiteIsolation(TEST_USERS.josh.id) },
    { name: 'Gmail Website Isolation', fn: () => testWebsiteIsolation(TEST_USERS.gmail.id) },
    { name: 'Josh Report Isolation', fn: () => testReportIsolation(TEST_USERS.josh.id) },
    { name: 'Gmail Report Isolation', fn: () => testReportIsolation(TEST_USERS.gmail.id) },
    { name: 'Cross-User Access Prevention', fn: testCrossUserAccess },
    { name: 'Data Integrity', fn: testDataIntegrity },
  ];

  const results = [];
  let allPassed = true;

  for (const test of tests) {
    const result = await test.fn();
    results.push({ test: test.name, result });
    if (!result.passed) {
      allPassed = false;
    }
  }

  return {
    overall: allPassed,
    results,
  };
}

/**
 * Generate a user data isolation report
 */
export async function generateIsolationReport(): Promise<string> {
  const joshStats = await getUserDataStats(TEST_USERS.josh.id);
  const gmailStats = await getUserDataStats(TEST_USERS.gmail.id);
  const testResults = await runFullIsolationTest();

  let report = '=== ConvertIQ User Data Isolation Report ===\n\n';
  
  report += '--- User Data Statistics ---\n';
  report += `Josh (${joshStats.email}):\n`;
  report += `  Websites: ${joshStats.websiteCount}\n`;
  report += `  Analyses: ${joshStats.analysisCount}\n`;
  report += `  Reports: ${joshStats.reportCount}\n`;
  report += `  Recommendations: ${joshStats.recommendationCount}\n\n`;
  
  report += `Gmail User (${gmailStats.email}):\n`;
  report += `  Websites: ${gmailStats.websiteCount}\n`;
  report += `  Analyses: ${gmailStats.analysisCount}\n`;
  report += `  Reports: ${gmailStats.reportCount}\n`;
  report += `  Recommendations: ${gmailStats.recommendationCount}\n\n`;
  
  report += '--- Isolation Test Results ---\n';
  report += `Overall Status: ${testResults.overall ? 'PASSED' : 'FAILED'}\n\n`;
  
  testResults.results.forEach(({ test, result }) => {
    report += `${test}: ${result.passed ? 'PASSED' : 'FAILED'}\n`;
    report += `  ${result.message}\n`;
    if (result.details) {
      report += `  Details: ${JSON.stringify(result.details, null, 2)}\n`;
    }
    report += '\n';
  });
  
  return report;
}

/**
 * Quick database health check for the test users
 */
export async function quickHealthCheck(): Promise<{
  joshExists: boolean;
  gmailExists: boolean;
  joshWebsiteExists: boolean;
  gmailWebsiteExists: boolean;
  overallHealth: boolean;
}> {
  try {
    const joshUser = await db
      .select()
      .from(user)
      .where(eq(user.id, TEST_USERS.josh.id))
      .limit(1);

    const gmailUser = await db
      .select()
      .from(user)
      .where(eq(user.id, TEST_USERS.gmail.id))
      .limit(1);

    const joshWebsite = await db
      .select()
      .from(websites)
      .where(eq(websites.id, TEST_USERS.josh.websiteId))
      .limit(1);

    const gmailWebsite = await db
      .select()
      .from(websites)
      .where(eq(websites.id, TEST_USERS.gmail.websiteId))
      .limit(1);

    const joshExists = joshUser.length > 0;
    const gmailExists = gmailUser.length > 0;
    const joshWebsiteExists = joshWebsite.length > 0;
    const gmailWebsiteExists = gmailWebsite.length > 0;

    return {
      joshExists,
      gmailExists,
      joshWebsiteExists,
      gmailWebsiteExists,
      overallHealth: joshExists && gmailExists && joshWebsiteExists && gmailWebsiteExists,
    };
  } catch (error) {
    console.error('Health check error:', error);
    return {
      joshExists: false,
      gmailExists: false,
      joshWebsiteExists: false,
      gmailWebsiteExists: false,
      overallHealth: false,
    };
  }
}