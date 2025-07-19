import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../server';
import { TRPCError } from '@trpc/server';

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