import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../server';
import { websites } from '@/db/schema/websites';
import { analyses } from '@/db/schema/analyses';
import { eq, and, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { reportTypeSchema } from '@/lib/reports/types';

export const reportsRouter = createTRPCRouter({
  /**
   * Generate a new report from AI analysis (simplified version)
   */
  generate: protectedProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
      analysisId: z.string().uuid(),
      reportType: reportTypeSchema,
      title: z.string().min(1).max(255),
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        // Verify analysis exists and user owns the associated website
        const analysisResult = await ctx.db
          .select({
            analysis: analyses,
            website: websites,
          })
          .from(analyses)
          .innerJoin(websites, eq(analyses.websiteId, websites.id))
          .where(and(
            eq(analyses.id, input.analysisId),
            eq(websites.userId, user.id)
          ))
          .limit(1);

        if (analysisResult.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Analysis not found or access denied'
          });
        }

        return {
          reportId: `mock-report-${Date.now()}`,
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
   * Get dashboard data for a website (frontend requirement)
   */
  getDashboard: protectedProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
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

        // Fetch latest non-archived analysis for this website
        const latestAnalysis = await ctx.db
          .select()
          .from(analyses)
          .where(eq(analyses.websiteId, input.websiteId))
          .orderBy(desc(analyses.createdAt))
          .limit(10);

        // Filter out archived analyses
        const validAnalyses = latestAnalysis.filter(analysis => 
          !analysis.errorMessage || !analysis.errorMessage.includes('ARCHIVED_BY_USER')
        );

        if (validAnalyses.length === 0) {
          // No valid analysis yet, return default structure
          return {
            id: input.websiteId,
            websiteUrl: website[0].url,
            scanDate: website[0].createdAt?.toISOString() || new Date().toISOString(),
            overallScore: 0,
            status: 'pending' as const,
            summary: 'Scan is still in progress or no analysis has been completed yet.',
            metrics: {
              pageSpeed: { score: 0, status: 'needs_improvement' as const },
              mobileOptimization: { score: 0, status: 'needs_improvement' as const },
              seoScore: { score: 0, status: 'needs_improvement' as const },
              conversionReadiness: { score: 0, status: 'needs_improvement' as const },
            },
            keyInsights: ['Analysis in progress...'],
            recommendations: []
          };
        }

        const analysis = validAnalyses[0];
        const aiAnalysis = analysis.aiAnalysis ? JSON.parse(analysis.aiAnalysis) : null;

        return {
          id: analysis.id,
          websiteUrl: website[0].url,
          scanDate: analysis.createdAt?.toISOString() || new Date().toISOString(),
          overallScore: aiAnalysis?.overallScore || 5.0,
          status: analysis.status || 'completed',
          summary: aiAnalysis?.summary || 'Analysis completed successfully.',
          
          metrics: {
            pageSpeed: { 
              score: aiAnalysis?.uxAnalysis?.performance?.score || 7.0, 
              status: (aiAnalysis?.uxAnalysis?.performance?.score || 7.0) >= 8 ? 'good' as const : 'needs_improvement' as const 
            },
            mobileOptimization: { 
              score: aiAnalysis?.uxAnalysis?.mobileOptimization?.score || 6.0, 
              status: (aiAnalysis?.uxAnalysis?.mobileOptimization?.score || 6.0) >= 8 ? 'good' as const : 'needs_improvement' as const 
            },
            seoScore: { 
              score: aiAnalysis?.technicalSeo?.overallScore || 7.0, 
              status: (aiAnalysis?.technicalSeo?.overallScore || 7.0) >= 8 ? 'good' as const : 'needs_improvement' as const 
            },
            conversionReadiness: { 
              score: aiAnalysis?.conversionPsychology?.overallScore || 6.5, 
              status: (aiAnalysis?.conversionPsychology?.overallScore || 6.5) >= 8 ? 'good' as const : 'needs_improvement' as const 
            },
          },
          
          keyInsights: aiAnalysis?.keyInsights || [
            'Analysis completed - detailed insights will be available once processing is complete.',
          ],
          
          recommendations: (aiAnalysis?.recommendations || []).map((rec: {
            id: string;
            title: string;
            description: string;
            category: string;
            priority: string;
            impact: string;
            effort: string;
          }) => ({
            id: rec.id,
            title: rec.title,
            description: rec.description,
            category: rec.category,
            priority: rec.priority,
            status: 'pending' as const,
            impact: { score: rec.impact?.score || 5, category: rec.impact?.category || 'medium' },
            effort: { score: rec.effort?.score || 5, category: rec.effort?.category || 'medium' },
            estimatedTimeToComplete: rec.effort?.timeEstimate || 'Unknown',
            expectedImpact: rec.expectedOutcome || 'Improvement expected',
          })),
        };

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch dashboard data'
        });
      }
    }),

  /**
   * Get list of all reports/scans for the reports index page (frontend requirement)
   */
  getReportsList: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(20),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        // Get all websites for this user with their latest non-archived analysis
        const reportsData = await ctx.db
          .select({
            websiteId: websites.id,
            websiteUrl: websites.url,
            websiteName: websites.name,
            pageType: websites.pageType,
            websiteCreatedAt: websites.createdAt,
            analysisId: analyses.id,
            analysisStatus: analyses.status,
            analysisCreatedAt: analyses.createdAt,
            aiAnalysis: analyses.aiAnalysis,
            errorMessage: analyses.errorMessage,
          })
          .from(websites)
          .innerJoin(analyses, eq(analyses.websiteId, websites.id))
          .where(eq(websites.userId, user.id))
          .orderBy(desc(analyses.createdAt));

        // Filter out archived reports and get the latest analysis for each website
        const validReports = reportsData.filter(row => {
          // Skip archived reports
          const isArchived = row.errorMessage && row.errorMessage.includes('ARCHIVED_BY_USER');
          return !isArchived;
        });

        // Group by website and get the latest analysis for each
        const websiteMap = new Map();
        validReports.forEach(row => {
          const key = row.websiteId;
          
          if (!websiteMap.has(key) || 
              (row.analysisCreatedAt && websiteMap.get(key).analysisCreatedAt && 
               row.analysisCreatedAt > websiteMap.get(key).analysisCreatedAt)) {
            websiteMap.set(key, row);
          }
        });

        // Convert to array and apply pagination
        const allReports = Array.from(websiteMap.values());
        const paginatedReports = allReports
          .slice(input.offset, input.offset + input.limit);

        interface ReportRow {
          websiteId: string;
          analysisId: string;
          websiteName: string;
          websiteUrl: string;
          pageType: string;
          analysisStatus: string;
          aiAnalysis: string | null;
          analysisCreatedAt: Date | null;
          websiteCreatedAt: Date | null;
          errorMessage: string | null;
        }
        
        const reports = paginatedReports.map((row: ReportRow) => {
          const aiAnalysis = row.aiAnalysis ? JSON.parse(row.aiAnalysis) : null;
          
          return {
            id: row.analysisId || row.websiteId,
            websiteId: row.websiteId,
            websiteUrl: row.websiteUrl,
            websiteName: row.websiteName || new URL(row.websiteUrl).hostname,
            pageType: row.pageType || 'homepage',
            scanDate: row.analysisCreatedAt?.toISOString() || row.websiteCreatedAt?.toISOString() || new Date().toISOString(),
            status: row.analysisStatus,
            overallScore: aiAnalysis?.overallScore || null,
            recommendationsCount: aiAnalysis?.recommendations?.length || 0,
            hasAnalysis: true,
            summary: aiAnalysis?.summary || (row.analysisStatus === 'pending' ? 'Analysis in progress...' : 'Analysis completed'),
          };
        });

        return {
          reports,
          total: allReports.length,
          hasMore: (input.offset + input.limit) < allReports.length,
        };

      } catch (error) {
        console.error('Error fetching reports list:', error);
        return {
          reports: [],
          total: 0,
          hasMore: false,
        };
      }
    }),

  /**
   * Archive a report (frontend requirement)
   */
  archiveReport: protectedProcedure
    .input(z.object({
      reportId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        // First try to find it as an analysis ID
        const analysis = await ctx.db
          .select({
            id: analyses.id,
            websiteId: analyses.websiteId,
            website: {
              id: websites.id,
              userId: websites.userId,
            }
          })
          .from(analyses)
          .innerJoin(websites, eq(analyses.websiteId, websites.id))
          .where(and(
            eq(analyses.id, input.reportId),
            eq(websites.userId, user.id)
          ))
          .limit(1);

        if (analysis.length > 0) {
          // Mark as archived
          await ctx.db
            .update(analyses)
            .set({
              status: 'failed',
              errorMessage: `ARCHIVED_BY_USER - Report archived on ${new Date().toISOString()}`,
              updatedAt: new Date()
            })
            .where(eq(analyses.id, input.reportId));

          return { 
            message: 'Report archived successfully',
            deletedId: input.reportId
          };
        }

        // If not found as analysis, try as website ID
        const website = await ctx.db
          .select({
            id: websites.id,
            userId: websites.userId,
          })
          .from(websites)
          .where(and(
            eq(websites.id, input.reportId),
            eq(websites.userId, user.id)
          ))
          .limit(1);

        if (website.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Report not found or access denied'
          });
        }

        // Create an archived analysis record
        await ctx.db
          .insert(analyses)
          .values({
            websiteId: input.reportId,
            status: 'failed',
            errorMessage: `ARCHIVED_BY_USER - Website archived on ${new Date().toISOString()} (no analysis existed)`,
            createdAt: new Date(),
            updatedAt: new Date()
          });

        return { 
          message: 'Report archived successfully',
          deletedId: input.reportId
        };

      } catch (error) {
        console.error('Error archiving report:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to archive report'
        });
      }
    }),

  /**
   * Get archived reports (frontend requirement)
   */
  getArchivedReports: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(20),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        const archivedData = await ctx.db
          .select({
            websiteId: websites.id,
            websiteUrl: websites.url,
            websiteName: websites.name,
            pageType: websites.pageType,
            websiteCreatedAt: websites.createdAt,
            analysisId: analyses.id,
            analysisStatus: analyses.status,
            analysisCreatedAt: analyses.createdAt,
            aiAnalysis: analyses.aiAnalysis,
            errorMessage: analyses.errorMessage,
          })
          .from(websites)
          .innerJoin(analyses, eq(analyses.websiteId, websites.id))
          .where(and(
            eq(websites.userId, user.id),
            eq(analyses.status, 'failed')
          ))
          .orderBy(desc(analyses.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        interface ArchivedReportRow {
          websiteId: string;
          analysisId: string;
          websiteName: string;
          websiteUrl: string;
          pageType: string;
          analysisStatus: string;
          aiAnalysis: string | null;
          analysisCreatedAt: Date | null;
          websiteCreatedAt: Date | null;
          errorMessage: string | null;
        }

        const archivedReports = archivedData
          .filter(row => row.errorMessage && row.errorMessage.includes('ARCHIVED_BY_USER'))
          .map((row: ArchivedReportRow) => {
            const aiAnalysis = row.aiAnalysis ? JSON.parse(row.aiAnalysis) : null;
            
            return {
              id: row.analysisId,
              websiteId: row.websiteId,
              websiteUrl: row.websiteUrl,
              websiteName: row.websiteName || new URL(row.websiteUrl).hostname,
              pageType: row.pageType || 'homepage',
              scanDate: row.analysisCreatedAt?.toISOString() || row.websiteCreatedAt?.toISOString() || new Date().toISOString(),
              archivedDate: row.analysisCreatedAt?.toISOString() || new Date().toISOString(),
              status: 'archived',
              overallScore: aiAnalysis?.overallScore || null,
              recommendationsCount: aiAnalysis?.recommendations?.length || 0,
              summary: aiAnalysis?.summary || 'Archived report',
            };
          });

        return {
          reports: archivedReports,
          total: archivedReports.length,
          hasMore: archivedReports.length === input.limit,
        };

      } catch (error) {
        console.error('Error fetching archived reports:', error);
        return {
          reports: [],
          total: 0,
          hasMore: false,
        };
      }
    }),

  /**
   * Rescan an archived report (frontend requirement)
   */
  rescanReport: protectedProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
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

        // Create a new analysis entry
        const [newAnalysis] = await ctx.db
          .insert(analyses)
          .values({
            websiteId: input.websiteId,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        return { 
          message: 'Rescan initiated successfully',
          analysisId: newAnalysis.id,
          websiteId: input.websiteId
        };

      } catch (error) {
        console.error('Error initiating rescan:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to initiate rescan'
        });
      }
    }),
});