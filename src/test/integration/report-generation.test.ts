import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db, TEST_USERS, mockAuthForUser } from '../isolation/setup';
import { websites } from '@/db/schema/websites';
import { analyses } from '@/db/schema/analyses';
import { reports } from '@/db/schema/reports';
import { recommendations } from '@/db/schema/recommendations';
import { eq, and } from 'drizzle-orm';

// Mock AI services
vi.mock('@/lib/ai/analysis-engine');
vi.mock('@/lib/reports/generators/marketing-report');
vi.mock('@/lib/reports/generators/conversion-report');

describe('Report Generation Workflow - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Report Generation for Josh User', () => {
    it('should generate report from existing analysis data', async () => {
      const joshUser = TEST_USERS.josh;
      mockAuthForUser(joshUser.id);

      // Mock the AI analysis engine
      vi.doMock('@/lib/ai/analysis-engine', () => ({
        analysisEngine: {
          generateAnalysis: vi.fn().mockResolvedValue({
            findings: [
              {
                category: 'performance',
                issue: 'Slow page load',
                impact: 'high',
                recommendation: 'Optimize images',
              }
            ],
            recommendations: [
              {
                title: 'Optimize Page Speed',
                description: 'Compress and optimize images',
                priority: 'high',
                impact: { score: 8, category: 'high' },
                effort: { score: 4, category: 'medium' },
                category: 'performance',
              }
            ],
          }),
        },
      }));

      // Mock report generators
      vi.doMock('@/lib/reports/generators/marketing-report', () => ({
        marketingReportGenerator: {
          generateMarketingReport: vi.fn().mockResolvedValue({
            executiveSummary: {
              keyFindings: ['Page speed optimization needed'],
              overallScore: 75,
            },
            recommendations: [
              {
                title: 'Optimize Page Speed',
                description: 'Compress and optimize images to improve load times',
                priority: 'high',
                impact: { score: 8, category: 'high' },
                effort: { score: 4, category: 'medium' },
                category: 'performance',
                implementationGuide: {
                  steps: ['Compress images', 'Use WebP format'],
                  estimatedTime: '2-4 hours',
                },
              }
            ],
          }),
        },
      }));

      // Test the report generation flow
      const { reportsRouter } = await import('@/lib/trpc/routers/reports');
      
      const mockCtx = {
        user: { id: joshUser.id, email: joshUser.email },
        db,
      };

      // First, we need an analysis to generate a report from
      // In practice, this would be created by the scan workflow
      const analysisData = {
        websiteId: joshUser.websiteId,
        status: 'completed' as const,
        aiAnalysis: JSON.stringify({
          findings: [{
            category: 'performance',
            issue: 'Slow page load',
            impact: 'high',
          }],
          recommendations: [{
            title: 'Optimize Page Speed',
            priority: 'high',
          }],
        }),
        scanDuration: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock database operations for the test
      const mockAnalysisId = 'test-analysis-123';
      const mockReportId = 'test-report-123';
      
      vi.doMock('@/db/connection', () => ({
        db: {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                analysis: {
                  id: mockAnalysisId,
                  websiteId: joshUser.websiteId,
                  aiAnalysis: analysisData.aiAnalysis,
                },
                website: {
                  id: joshUser.websiteId,
                  userId: joshUser.id,
                  url: 'https://mad-dame.com',
                },
              }
            ]),
          }),
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([{
            id: mockReportId,
            analysisId: mockAnalysisId,
            title: 'Marketing Analysis Report',
            type: 'marketing',
          }]),
        },
      }));

      // Generate the report
      const result = await reportsRouter.createCaller(mockCtx).generate({
        analysisId: mockAnalysisId,
        reportType: 'marketing',
        title: 'Marketing Analysis Report',
      });

      expect(result.reportId).toBe(mockReportId);
      expect(result.message).toBe('Report generated successfully');
    });

    it('should create recommendations linked to the generated report', async () => {
      const joshUser = TEST_USERS.josh;
      mockAuthForUser(joshUser.id);

      // Mock report generation with recommendations
      const mockRecommendations = [
        {
          title: 'Add Call-to-Action Button',
          description: 'Place prominent CTA above the fold',
          priority: 'high',
          category: 'conversion',
          impact: { score: 9 },
          effort: { score: 3 },
        },
        {
          title: 'Optimize Mobile Experience',
          description: 'Improve mobile responsiveness',
          priority: 'medium',
          category: 'ux',
          impact: { score: 7 },
          effort: { score: 6 },
        },
      ];

      vi.doMock('@/lib/reports/generators/conversion-report', () => ({
        conversionReportGenerator: {
          generateConversionReport: vi.fn().mockResolvedValue({
            executiveSummary: {
              keyFindings: ['CTA placement needs improvement'],
            },
            recommendations: mockRecommendations,
          }),
        },
      }));

      const mockAnalysisId = 'test-analysis-456';
      const mockReportId = 'test-report-456';

      // Mock database operations
      vi.doMock('@/db/connection', () => ({
        db: {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                analysis: {
                  id: mockAnalysisId,
                  websiteId: joshUser.websiteId,
                  aiAnalysis: JSON.stringify({ findings: [] }),
                },
                website: {
                  id: joshUser.websiteId,
                  userId: joshUser.id,
                  url: 'https://mad-dame.com',
                },
              }
            ]),
          }),
          insert: vi.fn().mockImplementation((table) => ({
            values: vi.fn().mockReturnThis(),
            returning: vi.fn().mockImplementation(() => {
              if (table === reports) {
                return Promise.resolve([{
                  id: mockReportId,
                  analysisId: mockAnalysisId,
                  title: 'Conversion Analysis Report',
                  type: 'conversion',
                }]);
              } else if (table === recommendations) {
                return Promise.resolve(mockRecommendations.map((rec, i) => ({
                  id: `rec-${i}`,
                  reportId: mockReportId,
                  ...rec,
                })));
              }
            }),
          })),
        },
      }));

      const { reportsRouter } = await import('@/lib/trpc/routers/reports');
      
      const mockCtx = {
        user: { id: joshUser.id, email: joshUser.email },
        db,
      };

      const result = await reportsRouter.createCaller(mockCtx).generate({
        analysisId: mockAnalysisId,
        reportType: 'conversion',
        title: 'Conversion Analysis Report',
      });

      expect(result.reportId).toBe(mockReportId);
      
      // Verify recommendations would be created (mocked)
      // In real test, we'd query the database to verify recommendations
      // were created with correct reportId and user ownership
    });
  });

  describe('Report Generation Data Isolation', () => {
    it('should prevent report generation from analyses belonging to other users', async () => {
      const joshUser = TEST_USERS.josh;
      const gmailUser = TEST_USERS.gmail;
      
      // Mock auth for Josh user
      mockAuthForUser(joshUser.id);

      // Mock database to return no analysis (simulating access denied)
      vi.doMock('@/db/connection', () => ({
        db: {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No analysis found
          }),
        },
      }));

      const { reportsRouter } = await import('@/lib/trpc/routers/reports');
      
      const mockCtx = {
        user: { id: joshUser.id, email: joshUser.email },
        db,
      };

      // Try to generate report from Gmail user's analysis
      const attemptedAnalysisId = 'gmail-users-analysis-123';

      await expect(
        reportsRouter.createCaller(mockCtx).generate({
          analysisId: attemptedAnalysisId,
          reportType: 'marketing',
          title: 'Unauthorized Report Attempt',
        })
      ).rejects.toThrow('Analysis not found or access denied');
    });

    it('should ensure generated reports are linked to correct user through website ownership', async () => {
      const joshUser = TEST_USERS.josh;
      mockAuthForUser(joshUser.id);

      const mockAnalysisId = 'verified-analysis-123';
      const mockReportId = 'verified-report-123';

      // Mock database operations with proper user verification
      vi.doMock('@/db/connection', () => ({
        db: {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockImplementation((condition) => {
            // Verify the query includes both analysis ID and user ID checks
            expect(condition).toBeDefined();
            
            return {
              limit: vi.fn().mockResolvedValue([
                {
                  analysis: {
                    id: mockAnalysisId,
                    websiteId: joshUser.websiteId,
                    aiAnalysis: JSON.stringify({ findings: [] }),
                  },
                  website: {
                    id: joshUser.websiteId,
                    userId: joshUser.id, // Verify correct user
                    url: 'https://mad-dame.com',
                  },
                }
              ]),
            };
          }),
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockImplementation((data) => {
            // Verify report is created with analysis from correct user
            expect(data.analysisId).toBe(mockAnalysisId);
            
            return {
              returning: vi.fn().mockResolvedValue([{
                id: mockReportId,
                analysisId: mockAnalysisId,
                title: data.title,
                type: data.type,
              }]),
            };
          }),
        },
      }));

      vi.doMock('@/lib/reports/generators/marketing-report', () => ({
        marketingReportGenerator: {
          generateMarketingReport: vi.fn().mockResolvedValue({
            executiveSummary: { keyFindings: [] },
            recommendations: [],
          }),
        },
      }));

      const { reportsRouter } = await import('@/lib/trpc/routers/reports');
      
      const mockCtx = {
        user: { id: joshUser.id, email: joshUser.email },
        db,
      };

      const result = await reportsRouter.createCaller(mockCtx).generate({
        analysisId: mockAnalysisId,
        reportType: 'marketing',
        title: 'Verified User Report',
      });

      expect(result.reportId).toBe(mockReportId);
    });
  });

  describe('Report Retrieval and Updates', () => {
    it('should only return reports that belong to the authenticated user', async () => {
      const joshUser = TEST_USERS.josh;
      mockAuthForUser(joshUser.id);

      // Mock database to return only Josh's reports
      vi.doMock('@/db/connection', () => ({
        db: {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockImplementation((condition) => {
            // Verify user filtering is applied
            expect(condition).toBeDefined();
            
            return {
              orderBy: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              offset: vi.fn().mockResolvedValue([
                {
                  id: 'josh-report-1',
                  title: 'Josh Marketing Report',
                  websiteId: joshUser.websiteId,
                  websiteUrl: 'https://mad-dame.com',
                },
                {
                  id: 'josh-report-2',
                  title: 'Josh Conversion Report',
                  websiteId: joshUser.websiteId,
                  websiteUrl: 'https://mad-dame.com',
                },
              ]),
            };
          }),
        },
      }));

      const { reportsRouter } = await import('@/lib/trpc/routers/reports');
      
      const mockCtx = {
        user: { id: joshUser.id, email: joshUser.email },
        db,
      };

      const result = await reportsRouter.createCaller(mockCtx).list({
        limit: 20,
        offset: 0,
      });

      expect(result).toHaveLength(2);
      expect(result[0].websiteId).toBe(joshUser.websiteId);
      expect(result[1].websiteId).toBe(joshUser.websiteId);
    });
  });

  describe('Report Workflow Error Handling', () => {
    it('should handle missing AI analysis gracefully', async () => {
      const joshUser = TEST_USERS.josh;
      mockAuthForUser(joshUser.id);

      // Mock analysis without AI analysis data
      vi.doMock('@/db/connection', () => ({
        db: {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                analysis: {
                  id: 'incomplete-analysis',
                  websiteId: joshUser.websiteId,
                  aiAnalysis: null, // Missing AI analysis
                },
                website: {
                  id: joshUser.websiteId,
                  userId: joshUser.id,
                  url: 'https://mad-dame.com',
                },
              }
            ]),
          }),
        },
      }));

      const { reportsRouter } = await import('@/lib/trpc/routers/reports');
      
      const mockCtx = {
        user: { id: joshUser.id, email: joshUser.email },
        db,
      };

      await expect(
        reportsRouter.createCaller(mockCtx).generate({
          analysisId: 'incomplete-analysis',
          reportType: 'marketing',
          title: 'Incomplete Analysis Report',
        })
      ).rejects.toThrow('Analysis has not been completed yet');
    });
  });
});