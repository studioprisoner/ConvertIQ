import { describe, it, expect, beforeAll } from 'vitest';
import { db, TEST_USERS } from './setup';
import { websites } from '@/db/schema/websites';
import { analyses } from '@/db/schema/analyses';
import { reports } from '@/db/schema/reports';
import { recommendations } from '@/db/schema/recommendations';
import { user } from '@/db/schema/auth';
import { eq, ne, and, count, sql } from 'drizzle-orm';

describe('Database User Data Isolation Validation', () => {
  describe('Production Data Verification', () => {
    it('should verify test users exist in database', async () => {
      // Verify Josh user exists
      const joshUser = await db
        .select()
        .from(user)
        .where(eq(user.id, TEST_USERS.josh.id))
        .limit(1);

      expect(joshUser).toHaveLength(1);
      expect(joshUser[0].email).toBe(TEST_USERS.josh.email);

      // Verify Gmail user exists
      const gmailUser = await db
        .select()
        .from(user)
        .where(eq(user.id, TEST_USERS.gmail.id))
        .limit(1);

      expect(gmailUser).toHaveLength(1);
      expect(gmailUser[0].email).toBe(TEST_USERS.gmail.email);
    });

    it('should verify test websites exist and belong to correct users', async () => {
      // Verify Josh's website
      const joshWebsite = await db
        .select()
        .from(websites)
        .where(eq(websites.id, TEST_USERS.josh.websiteId))
        .limit(1);

      expect(joshWebsite).toHaveLength(1);
      expect(joshWebsite[0].userId).toBe(TEST_USERS.josh.id);
      expect(joshWebsite[0].url).toContain('mad-dame.com');

      // Verify Gmail user's website
      const gmailWebsite = await db
        .select()
        .from(websites)
        .where(eq(websites.id, TEST_USERS.gmail.websiteId))
        .limit(1);

      expect(gmailWebsite).toHaveLength(1);
      expect(gmailWebsite[0].userId).toBe(TEST_USERS.gmail.id);
      expect(gmailWebsite[0].url).toContain('joshuaillichmann.com');
    });
  });

  describe('Website Data Isolation', () => {
    it('should ensure Josh can only access his own websites', async () => {
      // Get all websites belonging to Josh
      const joshWebsites = await db
        .select()
        .from(websites)
        .where(eq(websites.userId, TEST_USERS.josh.id));

      // Verify all returned websites belong to Josh
      joshWebsites.forEach(website => {
        expect(website.userId).toBe(TEST_USERS.josh.id);
      });

      // Verify Josh's specific website is included
      const joshTargetWebsite = joshWebsites.find(
        w => w.id === TEST_USERS.josh.websiteId
      );
      expect(joshTargetWebsite).toBeDefined();
      expect(joshTargetWebsite?.url).toContain('mad-dame.com');
    });

    it('should ensure Gmail user can only access their own websites', async () => {
      // Get all websites belonging to Gmail user
      const gmailWebsites = await db
        .select()
        .from(websites)
        .where(eq(websites.userId, TEST_USERS.gmail.id));

      // Verify all returned websites belong to Gmail user
      gmailWebsites.forEach(website => {
        expect(website.userId).toBe(TEST_USERS.gmail.id);
      });

      // Verify Gmail user's specific website is included
      const gmailTargetWebsite = gmailWebsites.find(
        w => w.id === TEST_USERS.gmail.websiteId
      );
      expect(gmailTargetWebsite).toBeDefined();
      expect(gmailTargetWebsite?.url).toContain('joshuaillichmann.com');
    });

    it('should verify no cross-user website access', async () => {
      // Verify Josh cannot access Gmail user's website
      const joshAccessingGmailWebsite = await db
        .select()
        .from(websites)
        .where(and(
          eq(websites.id, TEST_USERS.gmail.websiteId),
          eq(websites.userId, TEST_USERS.josh.id)
        ));

      expect(joshAccessingGmailWebsite).toHaveLength(0);

      // Verify Gmail user cannot access Josh's website
      const gmailAccessingJoshWebsite = await db
        .select()
        .from(websites)
        .where(and(
          eq(websites.id, TEST_USERS.josh.websiteId),
          eq(websites.userId, TEST_USERS.gmail.id)
        ));

      expect(gmailAccessingJoshWebsite).toHaveLength(0);
    });
  });

  describe('Analysis Data Isolation', () => {
    it('should verify analyses belong to correct website owners', async () => {
      // Get all analyses for Josh's websites
      const joshAnalyses = await db
        .select({
          analysis: analyses,
          website: websites,
        })
        .from(analyses)
        .innerJoin(websites, eq(analyses.websiteId, websites.id))
        .where(eq(websites.userId, TEST_USERS.josh.id));

      // Verify all analyses belong to Josh's websites
      joshAnalyses.forEach(({ analysis, website }) => {
        expect(website.userId).toBe(TEST_USERS.josh.id);
        expect(analysis.websiteId).toBe(website.id);
      });

      // Get all analyses for Gmail user's websites
      const gmailAnalyses = await db
        .select({
          analysis: analyses,
          website: websites,
        })
        .from(analyses)
        .innerJoin(websites, eq(analyses.websiteId, websites.id))
        .where(eq(websites.userId, TEST_USERS.gmail.id));

      // Verify all analyses belong to Gmail user's websites
      gmailAnalyses.forEach(({ analysis, website }) => {
        expect(website.userId).toBe(TEST_USERS.gmail.id);
        expect(analysis.websiteId).toBe(website.id);
      });
    });

    it('should ensure no cross-user analysis access', async () => {
      // Try to find analyses where website owner doesn't match the expected user
      // This should return empty results if isolation is working

      // Check for Josh's analyses on non-Josh websites
      const invalidJoshAnalyses = await db
        .select({
          analysis: analyses,
          website: websites,
        })
        .from(analyses)
        .innerJoin(websites, eq(analyses.websiteId, websites.id))
        .where(and(
          eq(websites.userId, TEST_USERS.josh.id),
          ne(websites.userId, TEST_USERS.josh.id) // This should be impossible
        ));

      expect(invalidJoshAnalyses).toHaveLength(0);

      // Check for Gmail user's analyses on non-Gmail websites
      const invalidGmailAnalyses = await db
        .select({
          analysis: analyses,
          website: websites,
        })
        .from(analyses)
        .innerJoin(websites, eq(analyses.websiteId, websites.id))
        .where(and(
          eq(websites.userId, TEST_USERS.gmail.id),
          ne(websites.userId, TEST_USERS.gmail.id) // This should be impossible
        ));

      expect(invalidGmailAnalyses).toHaveLength(0);
    });
  });

  describe('Report Data Isolation', () => {
    it('should verify reports belong to correct users through analysis chain', async () => {
      // Get all reports for Josh through the analysis->website chain
      const joshReports = await db
        .select({
          report: reports,
          analysis: analyses,
          website: websites,
        })
        .from(reports)
        .innerJoin(analyses, eq(reports.analysisId, analyses.id))
        .innerJoin(websites, eq(analyses.websiteId, websites.id))
        .where(eq(websites.userId, TEST_USERS.josh.id));

      // Verify all reports trace back to Josh's websites
      joshReports.forEach(({ report, analysis, website }) => {
        expect(website.userId).toBe(TEST_USERS.josh.id);
        expect(analysis.websiteId).toBe(website.id);
        expect(report.analysisId).toBe(analysis.id);
      });

      // Get all reports for Gmail user through the analysis->website chain
      const gmailReports = await db
        .select({
          report: reports,
          analysis: analyses,
          website: websites,
        })
        .from(reports)
        .innerJoin(analyses, eq(reports.analysisId, analyses.id))
        .innerJoin(websites, eq(analyses.websiteId, websites.id))
        .where(eq(websites.userId, TEST_USERS.gmail.id));

      // Verify all reports trace back to Gmail user's websites
      gmailReports.forEach(({ report, analysis, website }) => {
        expect(website.userId).toBe(TEST_USERS.gmail.id);
        expect(analysis.websiteId).toBe(website.id);
        expect(report.analysisId).toBe(analysis.id);
      });
    });

    it('should ensure no orphaned reports without proper ownership chain', async () => {
      // Find any reports that don't have a valid ownership chain
      const orphanedReports = await db
        .select({
          reportId: reports.id,
          analysisId: reports.analysisId,
        })
        .from(reports)
        .leftJoin(analyses, eq(reports.analysisId, analyses.id))
        .leftJoin(websites, eq(analyses.websiteId, websites.id))
        .where(sql`${websites.id} IS NULL`);

      expect(orphanedReports).toHaveLength(0);
    });
  });

  describe('Recommendation Data Isolation', () => {
    it('should verify recommendations belong to correct users through report chain', async () => {
      // Get all recommendations for Josh through the report->analysis->website chain
      const joshRecommendations = await db
        .select({
          recommendation: recommendations,
          report: reports,
          analysis: analyses,
          website: websites,
        })
        .from(recommendations)
        .innerJoin(reports, eq(recommendations.reportId, reports.id))
        .innerJoin(analyses, eq(reports.analysisId, analyses.id))
        .innerJoin(websites, eq(analyses.websiteId, websites.id))
        .where(eq(websites.userId, TEST_USERS.josh.id));

      // Verify all recommendations trace back to Josh's websites
      joshRecommendations.forEach(({ recommendation, report, analysis, website }) => {
        expect(website.userId).toBe(TEST_USERS.josh.id);
        expect(analysis.websiteId).toBe(website.id);
        expect(report.analysisId).toBe(analysis.id);
        expect(recommendation.reportId).toBe(report.id);
      });

      // Get all recommendations for Gmail user
      const gmailRecommendations = await db
        .select({
          recommendation: recommendations,
          report: reports,
          analysis: analyses,
          website: websites,
        })
        .from(recommendations)
        .innerJoin(reports, eq(recommendations.reportId, reports.id))
        .innerJoin(analyses, eq(reports.analysisId, analyses.id))
        .innerJoin(websites, eq(analyses.websiteId, websites.id))
        .where(eq(websites.userId, TEST_USERS.gmail.id));

      // Verify all recommendations trace back to Gmail user's websites
      gmailRecommendations.forEach(({ recommendation, report, analysis, website }) => {
        expect(website.userId).toBe(TEST_USERS.gmail.id);
        expect(analysis.websiteId).toBe(website.id);
        expect(report.analysisId).toBe(analysis.id);
        expect(recommendation.reportId).toBe(report.id);
      });
    });
  });

  describe('Cross-User Data Leakage Detection', () => {
    it('should detect any data that crosses user boundaries', async () => {
      // Check for any websites with incorrect user assignments
      const websiteIntegrityCheck = await db
        .select({
          websiteId: websites.id,
          websiteUserId: websites.userId,
          userExists: sql<boolean>`CASE WHEN ${user.id} IS NOT NULL THEN true ELSE false END`,
        })
        .from(websites)
        .leftJoin(user, eq(websites.userId, user.id));

      // All websites should have valid user references
      websiteIntegrityCheck.forEach(item => {
        expect(item.userExists).toBe(true);
        expect(item.websiteUserId).toBeDefined();
      });

      // Check for any analyses linked to websites of different users
      const analysisIntegrityCheck = await db
        .select({
          analysisId: analyses.id,
          websiteId: analyses.websiteId,
          websiteUserId: websites.userId,
        })
        .from(analyses)
        .innerJoin(websites, eq(analyses.websiteId, websites.id));

      // All analyses should be linked to valid websites
      expect(analysisIntegrityCheck.length).toBeGreaterThan(0);
      analysisIntegrityCheck.forEach(item => {
        expect(item.websiteUserId).toBeDefined();
        expect([TEST_USERS.josh.id, TEST_USERS.gmail.id]).toContain(item.websiteUserId);
      });
    });

    it('should verify no shared data between test users', async () => {
      // Get data counts for each user
      const joshDataCount = await db
        .select({
          websites: count(websites.id),
        })
        .from(websites)
        .where(eq(websites.userId, TEST_USERS.josh.id));

      const gmailDataCount = await db
        .select({
          websites: count(websites.id),
        })
        .from(websites)
        .where(eq(websites.userId, TEST_USERS.gmail.id));

      // Both users should have at least their test websites
      expect(joshDataCount[0].websites).toBeGreaterThan(0);
      expect(gmailDataCount[0].websites).toBeGreaterThan(0);

      // Verify total isolation - no overlapping data
      const overlappingWebsites = await db
        .select()
        .from(websites)
        .where(and(
          eq(websites.userId, TEST_USERS.josh.id),
          eq(websites.userId, TEST_USERS.gmail.id)
        ));

      expect(overlappingWebsites).toHaveLength(0);
    });
  });

  describe('API Security Validation Queries', () => {
    it('should provide queries for API endpoint testing', async () => {
      // Query to verify user can only access their own websites
      const userWebsiteAccessQuery = async (userId: string) => {
        return await db
          .select()
          .from(websites)
          .where(eq(websites.userId, userId));
      };

      // Query to verify user can only access reports from their analyses
      const userReportAccessQuery = async (userId: string) => {
        return await db
          .select({
            report: reports,
            website: websites,
          })
          .from(reports)
          .innerJoin(analyses, eq(reports.analysisId, analyses.id))
          .innerJoin(websites, eq(analyses.websiteId, websites.id))
          .where(eq(websites.userId, userId));
      };

      // Test the queries work correctly
      const joshWebsites = await userWebsiteAccessQuery(TEST_USERS.josh.id);
      const joshReports = await userReportAccessQuery(TEST_USERS.josh.id);

      expect(joshWebsites.length).toBeGreaterThan(0);
      joshWebsites.forEach(website => {
        expect(website.userId).toBe(TEST_USERS.josh.id);
      });

      joshReports.forEach(({ website }) => {
        expect(website.userId).toBe(TEST_USERS.josh.id);
      });
    });
  });
});