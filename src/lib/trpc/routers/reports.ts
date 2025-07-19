import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../server';
import { reports } from '@/db/schema/reports';
import { recommendations } from '@/db/schema/recommendations';
import { websites } from '@/db/schema/websites';
import { eq, and, desc, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// Import report services
import { marketingReportGenerator } from '@/lib/reports/generators/marketing-report';
import { conversionReportGenerator } from '@/lib/reports/generators/conversion-report';
import { pdfExportService } from '@/lib/reports/pdf-export';
import { progressDashboardService } from '@/lib/reports/progress-dashboard';
import { databaseTrackingService } from '@/lib/reports/database-tracking';
import { recommendationTracker } from '@/lib/reports/recommendation-tracker';

// Import types
import type { AIAnalysisResult } from '@/lib/ai/types';
import { reportTypeSchema, recommendationStatusSchema } from '@/lib/reports/types';

export const reportsRouter = createTRPCRouter({
  /**
   * Generate a new report from AI analysis
   */
  generate: publicProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
      analysisId: z.string().uuid(),
      reportType: reportTypeSchema,
      title: z.string().min(1).max(255),
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        // Verify website ownership
        const website = await ctx.db
          .select()
          .from(websites)
          .where(and(
            eq(websites.id, input.websiteId),
            eq(websites.userId, user.id)
          ))
          .limit(1);

        if (website.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Website not found or access denied'
          });
        }

        // Get AI analysis (mock for now - would fetch from database)
        const mockAnalysisResult: AIAnalysisResult = {
          websiteId: input.websiteId,
          summary: 'Comprehensive analysis completed',
          overallScore: 6.8,
          keyInsights: [
            'Mobile optimization needs improvement',
            'SEO meta tags are missing or incomplete',
            'Trust signals could be enhanced'
          ],
          conversionPsychology: {
            overallScore: 6.5,
            trustIndicators: {
              securityBadges: false,
              contactInformation: true,
              aboutSection: true,
              professionalDesign: 7
            },
            psychologicalTriggers: {
              scarcity: { present: false, effectiveness: 0 },
              socialProof: { present: true, effectiveness: 6 },
              authority: { present: true, effectiveness: 7 },
              reciprocity: { present: false, effectiveness: 0 },
              commitment: { present: true, effectiveness: 5 }
            },
            keyFindings: [
              'Missing security trust badges',
              'Limited social proof elements',
              'Good authority signals present'
            ],
            priorityRecommendations: [
              'Add SSL and payment security badges',
              'Implement customer testimonials section'
            ]
          },
          uxAnalysis: {
            overallScore: 6.2,
            mobileOptimization: { score: 5 },
            navigation: { score: 7 },
            performance: { score: 6 },
            keyFindings: [
              'Mobile touch targets too small',
              'Navigation is clear and intuitive',
              'Page loading speed needs optimization'
            ]
          },
          seoAnalysis: {
            overallScore: 5.8,
            titleTags: { score: 4, issues: ['Missing title tags on key pages'] },
            metaDescriptions: { score: 3, issues: ['Most pages lack meta descriptions'] },
            headingStructure: { score: 7, issues: [] },
            keyFindings: [
              'Title tags need optimization',
              'Meta descriptions are missing',
              'Heading structure is well-organized'
            ]
          },
          createdAt: new Date(),
          confidence: 0.92
        };

        // Generate report content based on type
        let reportContent;
        const reportGenerationInput = {
          websiteUrl: website[0].url,
          businessType: 'general', // Could be extracted from website data
          targetAudience: 'small business owners' // Could be customizable
        };

        switch (input.reportType) {
          case 'marketing':
            reportContent = await marketingReportGenerator.generateMarketingReport(
              mockAnalysisResult,
              reportGenerationInput
            );
            break;
          case 'conversion':
            reportContent = await conversionReportGenerator.generateConversionReport(
              mockAnalysisResult,
              reportGenerationInput
            );
            break;
          default:
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Unsupported report type'
            });
        }

        // Create report in database
        const [newReport] = await ctx.db
          .insert(reports)
          .values({
            userId: user.id,
            websiteId: input.websiteId,
            title: input.title,
            type: input.reportType,
            content: reportContent,
            summary: reportContent.executiveSummary?.keyFindings?.join('. ') || 'Report generated successfully',
            overallScore: mockAnalysisResult.overallScore,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        // Create recommendations in database
        if (reportContent.recommendations) {
          const recommendationRecords = reportContent.recommendations.map(rec => ({
            reportId: newReport.id,
            title: rec.title,
            description: rec.description,
            priority: rec.priority as 'low' | 'medium' | 'high' | 'critical',
            estimatedImpact: rec.impact.score,
            estimatedEffort: rec.effort.score,
            category: rec.category,
            implementationGuide: JSON.stringify(rec.implementationGuide),
            createdAt: new Date(),
            updatedAt: new Date()
          }));

          await ctx.db
            .insert(recommendations)
            .values(recommendationRecords);
        }

        return {
          reportId: newReport.id,
          message: 'Report generated successfully'
        };

      } catch (error) {
        console.error('Report generation failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate report'
        });
      }
    }),

  /**
   * Get all reports for the authenticated user
   */
  list: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      websiteId: z.string().uuid().optional(),
      type: reportTypeSchema.optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx;
      
      const whereConditions = [eq(reports.userId, user.id)];
      
      if (input.websiteId) {
        whereConditions.push(eq(reports.websiteId, input.websiteId));
      }
      
      if (input.type) {
        whereConditions.push(eq(reports.type, input.type));
      }

      const userReports = await ctx.db
        .select({
          id: reports.id,
          title: reports.title,
          type: reports.type,
          summary: reports.summary,
          overallScore: reports.overallScore,
          websiteId: reports.websiteId,
          createdAt: reports.createdAt,
          updatedAt: reports.updatedAt,
          websiteUrl: websites.url,
          websiteName: websites.name,
        })
        .from(reports)
        .innerJoin(websites, eq(reports.websiteId, websites.id))
        .where(and(...whereConditions))
        .orderBy(desc(reports.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return userReports;
    }),

  /**
   * Get a specific report by ID
   */
  getById: publicProcedure
    .input(z.object({
      reportId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx;
      
      const report = await ctx.db
        .select({
          id: reports.id,
          title: reports.title,
          type: reports.type,
          content: reports.content,
          summary: reports.summary,
          overallScore: reports.overallScore,
          websiteId: reports.websiteId,
          createdAt: reports.createdAt,
          updatedAt: reports.updatedAt,
          websiteUrl: websites.url,
          websiteName: websites.name,
        })
        .from(reports)
        .innerJoin(websites, eq(reports.websiteId, websites.id))
        .where(and(
          eq(reports.id, input.reportId),
          eq(reports.userId, user.id)
        ))
        .limit(1);

      if (report.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Report not found'
        });
      }

      // Get recommendations for this report
      const reportRecommendations = await ctx.db
        .select()
        .from(recommendations)
        .where(eq(recommendations.reportId, input.reportId))
        .orderBy(asc(recommendations.createdAt));

      return {
        ...report[0],
        recommendations: reportRecommendations
      };
    }),

  /**
   * Delete a report
   */
  delete: publicProcedure
    .input(z.object({
      reportId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      
      // Verify ownership
      const report = await ctx.db
        .select({ id: reports.id })
        .from(reports)
        .where(and(
          eq(reports.id, input.reportId),
          eq(reports.userId, user.id)
        ))
        .limit(1);

      if (report.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Report not found'
        });
      }

      // Delete report (recommendations will be cascade deleted)
      await ctx.db
        .delete(reports)
        .where(eq(reports.id, input.reportId));

      return { message: 'Report deleted successfully' };
    }),

  /**
   * Export report as PDF
   */
  exportPDF: publicProcedure
    .input(z.object({
      reportId: z.string().uuid(),
      includeImplementationGuide: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      
      // Get report data
      const report = await ctx.db
        .select()
        .from(reports)
        .where(and(
          eq(reports.id, input.reportId),
          eq(reports.userId, user.id)
        ))
        .limit(1);

      if (report.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Report not found'
        });
      }

      // Get recommendations
      const reportRecommendations = await ctx.db
        .select()
        .from(recommendations)
        .where(eq(recommendations.reportId, input.reportId));

      // Mock report data structure for PDF generation
      const reportData = {
        id: report[0].id,
        title: report[0].title,
        type: report[0].type as 'marketing' | 'conversion',
        summary: report[0].summary,
        content: report[0].content,
        recommendations: reportRecommendations.map(rec => ({
          ...rec,
          impact: {
            score: rec.estimatedImpact || 5,
            category: 'medium' as const,
            reasoning: 'Impact analysis',
            businessImpact: 'Business improvement expected'
          },
          effort: {
            score: rec.estimatedEffort || 5,
            category: 'medium' as const,
            reasoning: 'Effort estimation',
            timeEstimate: '1-2 weeks',
            skillLevel: 'intermediate' as const
          },
          implementationGuide: rec.implementationGuide ? JSON.parse(rec.implementationGuide) : null,
          whyItMatters: 'Important for business improvement',
          expectedOutcome: 'Positive impact expected',
          measurementStrategy: 'Track relevant metrics'
        })),
        metadata: {
          websiteUrl: 'https://example.com', // Would get from websites table
          generatedAt: report[0].createdAt,
          reportType: report[0].type
        },
        createdAt: report[0].createdAt
      };

      try {
        // Generate PDF
        const pdfBlob = await pdfExportService.generatePDFFromData(reportData as any);
        
        // Convert blob to base64 for transmission
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        return {
          filename: pdfExportService.generateFilename(reportData as any),
          content: base64,
          mimeType: 'application/pdf'
        };

      } catch (error) {
        console.error('PDF export failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to export PDF'
        });
      }
    }),

  /**
   * Get progress dashboard data
   */
  getProgressDashboard: publicProcedure
    .query(async ({ ctx }) => {
      const { user } = ctx;
      
      try {
        const dashboardData = await progressDashboardService.getDashboardData(user.id);
        return dashboardData;
      } catch (error) {
        console.error('Failed to get dashboard data:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load dashboard data'
        });
      }
    }),

  /**
   * Get recommendations with filters
   */
  getRecommendations: publicProcedure
    .input(z.object({
      status: recommendationStatusSchema.optional(),
      category: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        const filteredRecommendations = await progressDashboardService.getFilteredRecommendations(
          user.id,
          {
            status: input.status,
            category: input.category,
            priority: input.priority,
            search: input.search
          }
        );

        // Apply pagination
        const paginatedResults = filteredRecommendations.slice(
          input.offset,
          input.offset + input.limit
        );

        return {
          recommendations: paginatedResults,
          total: filteredRecommendations.length,
          hasMore: input.offset + input.limit < filteredRecommendations.length
        };
      } catch (error) {
        console.error('Failed to get recommendations:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load recommendations'
        });
      }
    }),

  /**
   * Update recommendation status and progress
   */
  updateRecommendation: publicProcedure
    .input(z.object({
      recommendationId: z.string().uuid(),
      status: recommendationStatusSchema.optional(),
      notes: z.string().optional(),
      actualEffort: z.number().optional(),
      measurements: z.array(z.object({
        metric: z.string(),
        value: z.number(),
        notes: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        // Verify recommendation ownership through reports
        const recommendation = await ctx.db
          .select({ reportId: recommendations.reportId })
          .from(recommendations)
          .innerJoin(reports, eq(recommendations.reportId, reports.id))
          .where(and(
            eq(recommendations.id, input.recommendationId),
            eq(reports.userId, user.id)
          ))
          .limit(1);

        if (recommendation.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Recommendation not found'
          });
        }

        // Update recommendation progress
        const progress = await progressDashboardService.updateRecommendationProgress(
          input.recommendationId,
          user.id,
          {
            status: input.status,
            notes: input.notes,
            actualEffort: input.actualEffort,
            measurements: input.measurements
          }
        );

        return {
          message: 'Recommendation updated successfully',
          progress
        };
      } catch (error) {
        console.error('Failed to update recommendation:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update recommendation'
        });
      }
    }),

  /**
   * Get analytics and statistics
   */
  getAnalytics: publicProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        const startDate = input.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const endDate = input.endDate || new Date();

        const analytics = await progressDashboardService.getAnalytics(
          user.id,
          startDate,
          endDate
        );

        return analytics;
      } catch (error) {
        console.error('Failed to get analytics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load analytics'
        });
      }
    }),
});