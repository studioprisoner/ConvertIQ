import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import { db } from '@/db/connection';
import { websites } from '@/db/schema/websites';
import { analyses } from '@/db/schema/analyses';
import { eq, desc } from 'drizzle-orm';

// Import report services
import { marketingReportGenerator } from '@/lib/reports/generators/marketing-report';
import { conversionReportGenerator } from '@/lib/reports/generators/conversion-report';
import { pdfExportService } from '@/lib/reports/pdf-export';
import { progressDashboardService } from '@/lib/reports/progress-dashboard';

// Import types
import type { AIAnalysisResult } from '@/lib/ai/types';
import { reportTypeSchema, recommendationStatusSchema } from '@/lib/reports/types';

export const reportsRouter = createTRPCRouter({
  /**
   * Get dashboard data for a website
   */
  getDashboard: publicProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      try {
        // Fetch website info
        const website = await db
          .select()
          .from(websites)
          .where(eq(websites.id, input.websiteId))
          .limit(1);

        if (website.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Website not found'
          });
        }

        // Fetch latest non-deleted analysis for this website
        const latestAnalysis = await db
          .select()
          .from(analyses)
          .where(eq(analyses.websiteId, input.websiteId))
          .orderBy(desc(analyses.createdAt))
          .limit(10); // Get more to filter out deleted ones

        // Filter out archived analyses
        const validAnalyses = latestAnalysis.filter(analysis => 
          !analysis.errorMessage || !analysis.errorMessage.includes('ARCHIVED_BY_USER')
        );

        if (validAnalyses.length === 0) {
          // No valid analysis yet, return mock data structure with website info
          return {
            ...getMockDashboard(),
            id: input.websiteId,
            websiteUrl: website[0].url,
            scanDate: website[0].createdAt?.toISOString() || new Date().toISOString(),
            summary: 'Scan is still in progress or no analysis has been completed yet.',
          };
        }

        const analysis = validAnalyses[0];
        const aiAnalysis = analysis.aiAnalysis ? JSON.parse(analysis.aiAnalysis) : null;

        console.log('📊 Dashboard data fetch:', {
          websiteId: input.websiteId,
          analysisId: analysis.id,
          hasAiAnalysis: !!aiAnalysis,
          aiAnalysisKeys: aiAnalysis ? Object.keys(aiAnalysis) : [],
        });

        // Convert real analysis data to dashboard format
        return {
          id: analysis.id,
          websiteUrl: website[0].url,
          scanDate: analysis.createdAt?.toISOString() || new Date().toISOString(),
          overallScore: aiAnalysis?.overallScore || 5.0,
          status: analysis.status || 'completed',
          summary: aiAnalysis?.summary || 'Analysis completed successfully.',
          
          // Convert AI analysis to dashboard metrics format
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
          
          // Extract key insights from AI analysis
          keyInsights: aiAnalysis?.keyInsights || [
            'Analysis completed - detailed insights will be available once processing is complete.',
          ],
          
          // Convert AI recommendations to dashboard format
          recommendations: (aiAnalysis?.recommendations || []).map((rec: any) => ({
            id: rec.id,
            title: rec.title,
            description: rec.description,
            category: rec.category,
            priority: rec.priority,
            status: 'pending' as const, // Default status for new recommendations
            impact: { score: rec.impact?.score || 5, category: rec.impact?.category || 'medium' },
            effort: { score: rec.effort?.score || 5, category: rec.effort?.category || 'medium' },
            estimatedTimeToComplete: rec.effort?.timeEstimate || 'Unknown',
            expectedImpact: rec.expectedOutcome || 'Improvement expected',
          })),
        };

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Fallback to mock data if there's an error
        return getMockDashboard();
      }
    }),

  /**
   * Get list of all reports/scans for the reports index page
   */
  getReportsList: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(20),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ input }) => {
      try {
        // Fetch websites with their latest analysis (excluding soft-deleted reports)
        // Only show websites that have actually been scanned (have analyses)
        const reportsData = await db
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
          .orderBy(desc(analyses.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        // Group by website and get the latest analysis for each (excluding soft-deleted)
        const websiteMap = new Map();
        reportsData.forEach(row => {
          const key = row.websiteId;
          
          // Skip archived reports
          const isArchived = row.errorMessage && row.errorMessage.includes('ARCHIVED_BY_USER');
          if (isArchived) {
            return;
          }
          
          if (!websiteMap.has(key) || 
              (row.analysisCreatedAt && websiteMap.get(key).analysisCreatedAt && 
               row.analysisCreatedAt > websiteMap.get(key).analysisCreatedAt)) {
            websiteMap.set(key, row);
          }
        });

        // Convert to reports list format
        const reports = Array.from(websiteMap.values()).map((row: any) => {
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
            hasAnalysis: true, // Always true since we use innerJoin
            summary: aiAnalysis?.summary || (row.analysisStatus === 'pending' ? 'Analysis in progress...' : 'Analysis completed'),
          };
        });

        return {
          reports,
          total: reports.length,
          hasMore: reports.length === input.limit,
        };

      } catch (error) {
        console.error('Error fetching reports list:', error);
        // Return empty list on error
        return {
          reports: [],
          total: 0,
          hasMore: false,
        };
      }
    }),

  /**
   * Generate a new report from AI analysis (mock implementation)
   */
  generate: publicProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
      analysisId: z.string().uuid(),
      reportType: reportTypeSchema,
      title: z.string().min(1).max(255),
    }))
    .mutation(async ({ input }) => {
      try {
        // Mock AI analysis result for testing
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
          websiteUrl: 'https://example.com', // Would come from websites table
          businessType: 'general',
          targetAudience: 'small business owners'
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

        return {
          reportId: `mock-report-${Date.now()}`,
          message: 'Report generated successfully',
          content: reportContent,
          recommendations: reportContent.recommendations
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
   * Test PDF generation
   */
  testPDF: publicProcedure
    .input(z.object({
      reportType: reportTypeSchema.default('marketing'),
    }))
    .mutation(async ({ input }) => {
      try {
        // Create a mock report for PDF testing
        const mockReport = {
          id: 'test-report-123',
          title: `Test ${input.reportType.charAt(0).toUpperCase() + input.reportType.slice(1)} Report`,
          type: input.reportType as 'marketing' | 'conversion',
          summary: 'This is a test report generated for PDF testing purposes.',
          content: {
            type: input.reportType,
            executiveSummary: {
              overallScore: 7.5,
              keyFindings: [
                'Website has good foundation but needs optimization',
                'Mobile experience could be improved',
                'SEO opportunities identified'
              ],
              topPriorities: [
                'Optimize for mobile users',
                'Improve page loading speed',
                'Add trust signals'
              ]
            },
            quickWins: [
              {
                title: 'Add SSL Certificate Badge',
                description: 'Display security badges to build trust',
                timeToComplete: '1 hour',
                expectedImpact: '5-10% increase in conversions'
              },
              {
                title: 'Optimize Page Titles',
                description: 'Update title tags for better SEO',
                timeToComplete: '2-3 hours',
                expectedImpact: '10-20% increase in organic traffic'
              }
            ]
          },
          recommendations: [
            {
              id: 'rec-1',
              title: 'Optimize Page Loading Speed',
              description: 'Improve website performance by optimizing images and reducing file sizes',
              category: 'performance',
              priority: 'high' as const,
              impact: {
                score: 8,
                category: 'high' as const,
                reasoning: 'Page speed directly affects user experience and SEO rankings',
                businessImpact: 'Faster loading times lead to lower bounce rates and higher conversions'
              },
              effort: {
                score: 6,
                category: 'medium' as const,
                reasoning: 'Requires technical optimization but is well documented',
                timeEstimate: '1-2 weeks',
                skillLevel: 'intermediate' as const
              },
              implementationGuide: {
                overview: 'Optimize website performance for better user experience',
                prerequisites: ['Access to website files', 'Basic understanding of web performance'],
                steps: [
                  {
                    step: 1,
                    title: 'Audit Current Performance',
                    description: 'Use PageSpeed Insights to identify issues',
                    details: ['Run tests on key pages', 'Identify largest performance bottlenecks']
                  },
                  {
                    step: 2,
                    title: 'Optimize Images',
                    description: 'Compress and resize images appropriately',
                    details: ['Convert to WebP format', 'Implement responsive images', 'Add lazy loading']
                  }
                ],
                successMetrics: ['Improved PageSpeed scores', 'Reduced bounce rate', 'Better Core Web Vitals'],
                timeline: '1-2 weeks',
                difficulty: 'intermediate' as const
              },
              whyItMatters: 'Page speed is a critical ranking factor and user experience element',
              expectedOutcome: 'Improved user experience and better search rankings',
              measurementStrategy: 'Monitor PageSpeed Insights scores and user engagement metrics'
            }
          ],
          metadata: {
            websiteUrl: 'https://example.com',
            generatedAt: new Date(),
            reportType: input.reportType
          },
          createdAt: new Date()
        };

        // Type assertion for mock data - in production this would be properly typed
        const reportForPdf = mockReport as {
          id: string;
          title: string; 
          type: 'marketing' | 'conversion';
          summary: string;
          recommendations: Array<{ 
            title: string; 
            impact: { score: number }; 
            effort: { score: number } 
          }>;
          metadata: { websiteUrl: string };
          createdAt: Date;
        };

        // Generate PDF
        const pdfBlob = await pdfExportService.generatePDFFromData(reportForPdf);
        
        // Convert blob to base64 for transmission
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        return {
          filename: pdfExportService.generateFilename(reportForPdf),
          content: base64,
          mimeType: 'application/pdf',
          size: arrayBuffer.byteLength
        };

      } catch (error) {
        console.error('PDF generation failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate test PDF'
        });
      }
    }),

  /**
   * Get mock dashboard data for testing
   */
  getMockDashboard: publicProcedure
    .query(async () => {
      return {
        overview: {
          totalRecommendations: 15,
          completedRecommendations: 6,
          inProgressRecommendations: 4,
          pendingRecommendations: 5,
          completionRate: 40,
          averageCompletionTime: 12
        },
        recentActivity: [
          {
            id: 'rec-1',
            title: 'Add SSL Certificate',
            action: 'Completed',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
            reportTitle: 'Marketing Report'
          },
          {
            id: 'rec-2',
            title: 'Optimize Page Speed',
            action: 'Started working on',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            reportTitle: 'Conversion Report'
          }
        ],
        priorityQueue: [
          {
            id: 'rec-3',
            title: 'Mobile Optimization',
            priority: 'high',
            category: 'UX',
            estimatedImpact: 9,
            estimatedEffort: 7,
            status: 'pending',
            reportTitle: 'UX Report'
          },
          {
            id: 'rec-4',
            title: 'Add Trust Badges',
            priority: 'medium',
            category: 'Conversion',
            estimatedImpact: 7,
            estimatedEffort: 2,
            status: 'pending',
            reportTitle: 'Conversion Report'
          }
        ],
        needsAttention: [
          {
            id: 'rec-5',
            title: 'Content Strategy Review',
            reason: 'stalled' as const,
            daysSinceUpdate: 10,
            priority: 'medium',
            reportTitle: 'Content Report'
          }
        ],
        categoryPerformance: [
          {
            category: 'SEO',
            totalRecommendations: 8,
            completedRecommendations: 4,
            completionRate: 50,
            averageImpact: 7
          },
          {
            category: 'UX',
            totalRecommendations: 5,
            completedRecommendations: 2,
            completionRate: 40,
            averageImpact: 8
          },
          {
            category: 'Conversion',
            totalRecommendations: 2,
            completedRecommendations: 0,
            completionRate: 0,
            averageImpact: 9
          }
        ],
        completionTrends: [
          { month: '2024-01', completedCount: 2, totalCount: 5, completionRate: 40 },
          { month: '2024-02', completedCount: 3, totalCount: 7, completionRate: 43 },
          { month: '2024-03', completedCount: 1, totalCount: 3, completionRate: 33 }
        ]
      };
    }),

  /**
   * Test recommendation tracking functionality
   */
  testTracking: publicProcedure
    .input(z.object({
      action: z.enum(['start', 'update', 'complete']),
      recommendationId: z.string().default('test-rec-123'),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const mockUserId = 'test-user-123';

        switch (input.action) {
          case 'start':
            const progress = await progressDashboardService.startRecommendation(
              input.recommendationId,
              mockUserId
            );
            return { message: 'Started tracking', progress };

          case 'update':
            const updated = await progressDashboardService.updateRecommendationProgress(
              input.recommendationId,
              mockUserId,
              {
                status: 'in_progress',
                notes: input.notes || 'Progress update',
                actualEffort: 2
              }
            );
            return { message: 'Progress updated', progress: updated };

          case 'complete':
            const completed = await progressDashboardService.completeRecommendation(
              input.recommendationId,
              mockUserId,
              input.notes || 'Recommendation completed successfully'
            );
            return { message: 'Recommendation completed', progress: completed };

          default:
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid action'
            });
        }
      } catch (error) {
        console.error('Tracking test failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to test tracking functionality'
        });
      }
    }),

  /**
   * Delete a report/scan permanently from the database
   */
  archiveReport: publicProcedure
    .input(z.object({
      reportId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        console.log('🗑️ Delete request received for report:', input.reportId);
        
        // The reportId can be either an analysis ID or a website ID (for reports without analysis)
        
        // First try to find it as an analysis ID
        const analysis = await db
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
          .where(eq(analyses.id, input.reportId))
          .limit(1);

        if (analysis.length > 0) {
          // Found as analysis ID - mark as archived instead of deleting
          await db
            .update(analyses)
            .set({
              status: 'failed', // Using 'failed' status temporarily until migration
              errorMessage: `ARCHIVED_BY_USER - Report archived on ${new Date().toISOString()}`,
              updatedAt: new Date()
            })
            .where(eq(analyses.id, input.reportId));

          console.log('🗑️ Successfully archived analysis:', input.reportId);
          
          return { 
            message: 'Report archived successfully',
            deletedId: input.reportId
          };
        }

        // If not found as analysis, try as website ID
        const website = await db
          .select({
            id: websites.id,
            userId: websites.userId,
          })
          .from(websites)
          .where(eq(websites.id, input.reportId))
          .limit(1);

        if (website.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Report not found'
          });
        }

        // Found as website ID but no analysis - create an archived analysis record
        const [archivedAnalysis] = await db
          .insert(analyses)
          .values({
            websiteId: input.reportId,
            status: 'failed', // Using 'failed' status temporarily until migration
            errorMessage: `ARCHIVED_BY_USER - Website archived on ${new Date().toISOString()} (no analysis existed)`,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        console.log('🗑️ Successfully archived website by creating archived analysis:', archivedAnalysis.id);
        
        return { 
          message: 'Report deleted successfully',
          deletedId: input.reportId
        };

      } catch (error) {
        console.error('❌ Error deleting report:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete report'
        });
      }
    }),

  /**
   * Rescan an archived report by creating a new analysis
   */
  rescanReport: publicProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      try {
        console.log('🔄 Rescan request received for website:', input.websiteId);
        
        // Verify website exists
        const website = await db
          .select()
          .from(websites)
          .where(eq(websites.id, input.websiteId))
          .limit(1);

        if (website.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Website not found'
          });
        }

        // Create a new analysis entry for this website
        const [newAnalysis] = await db
          .insert(analyses)
          .values({
            websiteId: input.websiteId,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        console.log('🔄 Created new analysis for rescan:', newAnalysis.id);
        
        return { 
          message: 'Rescan initiated successfully',
          analysisId: newAnalysis.id,
          websiteId: input.websiteId
        };

      } catch (error) {
        console.error('❌ Error initiating rescan:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to initiate rescan'
        });
      }
    }),

  /**
   * Retrigger a pending or failed analysis
   */
  retriggerAnalysis: publicProcedure
    .input(z.object({
      analysisId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      try {
        console.log('🔄 Retrigger request received for analysis:', input.analysisId);
        
        // Get the analysis and verify it exists
        const [analysis] = await db
          .select({
            id: analyses.id,
            websiteId: analyses.websiteId,
            status: analyses.status,
            errorMessage: analyses.errorMessage,
          })
          .from(analyses)
          .where(eq(analyses.id, input.analysisId))
          .limit(1);

        if (!analysis) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Analysis not found'
          });
        }

        // Check if analysis can be retriggered (pending, failed, or processing for too long)
        const canRetrigger = ['pending', 'failed'].includes(analysis.status);
        if (!canRetrigger) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Cannot retrigger analysis with status: ${analysis.status}. Only pending or failed analyses can be retriggered.`
          });
        }

        // Reset the analysis to pending state and clear error message
        const [updatedAnalysis] = await db
          .update(analyses)
          .set({
            status: 'pending',
            actions: 'retry',
            errorMessage: null,
            updatedAt: new Date()
          })
          .where(eq(analyses.id, input.analysisId))
          .returning();

        console.log('✅ Analysis retriggered successfully:', updatedAnalysis.id);
        
        return { 
          message: 'Analysis retriggered successfully',
          analysisId: updatedAnalysis.id,
          websiteId: analysis.websiteId,
          status: updatedAnalysis.status
        };

      } catch (error) {
        console.error('❌ Error retriggering analysis:', error);
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrigger analysis'
        });
      }
    }),

  /**
   * Get archived reports for history view
   */
  getArchivedReports: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(20),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ input }) => {
      try {
        // Fetch archived reports only
        const archivedData = await db
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
          .where(eq(analyses.status, 'failed')) // Using 'failed' temporarily until migration
          .orderBy(desc(analyses.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        // Filter to only show archived reports
        const archivedReports = archivedData
          .filter(row => row.errorMessage && row.errorMessage.includes('ARCHIVED_BY_USER'))
          .map((row: any) => {
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
        // Return empty list on error
        return {
          reports: [],
          total: 0,
          hasMore: false,
        };
      }
    }),

  /**
   * Get filtered recommendations (mock)
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
    .query(async ({ input }) => {
      // Mock recommendations data
      const mockRecommendations = [
        {
          id: 'rec-1',
          title: 'Optimize Page Loading Speed',
          description: 'Improve website performance by optimizing images and reducing file sizes',
          priority: 'high',
          status: 'pending',
          category: 'Performance',
          estimatedImpact: 8,
          estimatedEffort: 6,
          progress: null,
          reportTitle: 'Performance Report',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'rec-2',
          title: 'Add SSL Certificate Badge',
          description: 'Display security badges to build user trust',
          priority: 'medium',
          status: 'completed',
          category: 'Trust',
          estimatedImpact: 6,
          estimatedEffort: 2,
          progress: null,
          reportTitle: 'Trust Report',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Apply filters
      let filtered = mockRecommendations;

      if (input.status) {
        filtered = filtered.filter(rec => rec.status === input.status);
      }
      
      if (input.category) {
        filtered = filtered.filter(rec => rec.category.toLowerCase().includes(input.category!.toLowerCase()));
      }
      
      if (input.priority) {
        filtered = filtered.filter(rec => rec.priority === input.priority);
      }
      
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        filtered = filtered.filter(rec => 
          rec.title.toLowerCase().includes(searchLower) ||
          rec.description.toLowerCase().includes(searchLower)
        );
      }

      // Apply pagination
      const paginatedResults = filtered.slice(input.offset, input.offset + input.limit);

      return {
        recommendations: paginatedResults,
        total: filtered.length,
        hasMore: input.offset + input.limit < filtered.length
      };
    }),
});

// Helper function to get mock dashboard data matching our UI structure
function getMockDashboard() {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    websiteUrl: 'https://example.com',
    scanDate: new Date().toISOString(),
    overallScore: 7.2,
    status: 'completed' as const,
    summary: 'Your website shows strong foundation with key opportunities for conversion optimization, particularly in mobile experience and trust signals.',
    
    // Performance metrics
    metrics: {
      pageSpeed: { score: 8.5, status: 'good' as const },
      mobileOptimization: { score: 6.2, status: 'needs_improvement' as const },
      seoScore: { score: 7.8, status: 'good' as const },
      conversionReadiness: { score: 6.8, status: 'needs_improvement' as const },
    },
    
    // Key insights
    keyInsights: [
      'Mobile experience needs significant improvement - 40% of visitors use mobile devices',
      'Strong technical SEO foundation with optimized meta tags and heading structure',
      'Trust signals are present but could be more prominent',
      'Call-to-action buttons need better contrast and positioning',
    ],
    
    // Recommendations with different statuses
    recommendations: [
      {
        id: 'rec-001',
        title: 'Improve Mobile Responsiveness',
        description: 'Optimize layout and touch targets for mobile devices to improve user experience and reduce bounce rate.',
        category: 'ux' as const,
        priority: 'high' as const,
        status: 'pending' as const,
        impact: { score: 9, category: 'high' as const },
        effort: { score: 6, category: 'medium' as const },
        estimatedTimeToComplete: '2-3 weeks',
        expectedImpact: '+25% mobile conversion rate',
      },
      {
        id: 'rec-002', 
        title: 'Add Trust Badges Below CTA',
        description: 'Display security badges and guarantees near primary call-to-action buttons to increase visitor confidence.',
        category: 'conversion' as const,
        priority: 'medium' as const,
        status: 'in_progress' as const,
        impact: { score: 7, category: 'medium' as const },
        effort: { score: 3, category: 'low' as const },
        estimatedTimeToComplete: '2-3 days',
        expectedImpact: '+15% click-through rate',
      },
      {
        id: 'rec-003',
        title: 'Optimize Image Alt Text',
        description: 'Add descriptive alt text to all images for better accessibility and SEO performance.',
        category: 'seo' as const,
        priority: 'low' as const,
        status: 'completed' as const,
        impact: { score: 5, category: 'low' as const },
        effort: { score: 2, category: 'low' as const },
        estimatedTimeToComplete: '1 day',
        expectedImpact: '+5% search visibility',
      },
      {
        id: 'rec-004',
        title: 'Implement Social Proof Section',
        description: 'Add customer testimonials and review highlights to build credibility and trust with potential customers.',
        category: 'conversion' as const,
        priority: 'high' as const,
        status: 'pending' as const,
        impact: { score: 8, category: 'high' as const },
        effort: { score: 4, category: 'medium' as const },
        estimatedTimeToComplete: '1 week',
        expectedImpact: '+20% trust metrics',
      },
    ]
  };
}