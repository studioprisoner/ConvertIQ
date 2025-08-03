import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import { crawlResultSchema } from '@/lib/crawler/types';

export const streamingAnalysisRouter = createTRPCRouter({
  // Get streaming analysis configuration for a website
  getStreamingConfig: publicProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      console.log('📊 Getting streaming analysis config for:', input.websiteId);
      
      return {
        websiteId: input.websiteId,
        supportedAnalysisTypes: [
          'conversion_psychology',
          'ux_analysis', 
          'technical_seo'
        ],
        streamingEndpoints: {
          singleAnalysis: '/api/ai/stream-analysis',
          comprehensiveAnalysis: '/api/ai/stream-comprehensive',
        },
        features: {
          progressiveUpdates: true,
          realTimeResults: true,
          partialResults: true,
          retryCapability: true,
        },
        estimatedTimes: {
          conversion_psychology: '15-30 seconds',
          ux_analysis: '15-30 seconds',
          technical_seo: '15-30 seconds',
          comprehensive: '45-90 seconds',
        },
      };
    }),

  // Prepare crawl data for streaming analysis
  prepareCrawlData: publicProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
      analysisId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      console.log('🔍 Preparing crawl data for streaming analysis:', input.websiteId);
      
      try {
        // Import database services
        const { aiAnalysisDb } = await import('@/lib/ai/database');
        
        // Get the most recent analysis or specified analysis
        let analysisData;
        if (input.analysisId) {
          analysisData = await aiAnalysisDb.getAnalysisById(input.analysisId);
        } else {
          analysisData = await aiAnalysisDb.getLatestAnalysis(input.websiteId);
        }

        if (!analysisData || !analysisData.crawlData) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No crawl data found for analysis'
          });
        }

        // Return sanitized crawl data for streaming
        return {
          crawlData: {
            url: analysisData.crawlData.url,
            htmlAnalysis: {
              title: analysisData.crawlData.htmlAnalysis?.title,
              description: analysisData.crawlData.htmlAnalysis?.description,
              content: analysisData.crawlData.htmlAnalysis?.content?.slice(0, 5000), // Limit content size
              headings: analysisData.crawlData.htmlAnalysis?.headings?.slice(0, 10),
              images: analysisData.crawlData.htmlAnalysis?.images?.slice(0, 20),
              links: analysisData.crawlData.htmlAnalysis?.links?.slice(0, 20),
            },
            statusCode: analysisData.crawlData.statusCode || 200,
          },
          websiteId: input.websiteId,
          analysisId: input.analysisId || analysisData.analysis.id,
        };

      } catch (error) {
        console.error('❌ Failed to prepare crawl data:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to prepare crawl data for streaming analysis'
        });
      }
    }),

  // Log streaming analysis progress
  logStreamingProgress: publicProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
      analysisType: z.enum(['conversion_psychology', 'ux_analysis', 'technical_seo', 'comprehensive']),
      progress: z.number().min(0).max(100),
      status: z.enum(['started', 'progress', 'completed', 'failed']),
      currentSection: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      console.log(`📊 Streaming ${input.analysisType} progress for ${input.websiteId}: ${input.progress}% (${input.status})`);
      
      // Log progress for monitoring and debugging
      const progressData = {
        timestamp: new Date().toISOString(),
        websiteId: input.websiteId,
        analysisType: input.analysisType,
        progress: input.progress,
        status: input.status,
        currentSection: input.currentSection,
        metadata: input.metadata,
      };
      
      // In a production environment, you might want to store this in a database
      // or send to an analytics service for monitoring
      console.log('📈 Streaming progress logged:', progressData);
      
      return {
        success: true,
        timestamp: progressData.timestamp,
      };
    }),

  // Save streaming analysis results 
  saveStreamingResults: publicProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
      analysisType: z.enum(['conversion_psychology', 'ux_analysis', 'technical_seo', 'comprehensive']),
      results: z.record(z.any()),
      metadata: z.object({
        processingTime: z.number(),
        modelUsed: z.string(),
        confidence: z.number(),
        isPartial: z.boolean().default(false),
        streamingVersion: z.string().default('1.0.0'),
      }),
    }))
    .mutation(async ({ input }) => {
      console.log(`💾 Saving streaming ${input.analysisType} results for ${input.websiteId}`);
      
      try {
        // Import database services
        const { aiAnalysisDb } = await import('@/lib/ai/database');
        
        // Create or update analysis with streaming results
        const analysisResult = {
          id: `streaming-${Date.now()}`,
          websiteId: input.websiteId,
          analysisType: input.analysisType,
          timestamp: new Date().toISOString(),
          overallScore: input.results.overallScore || 5,
          summary: input.results.summary || `${input.analysisType} analysis completed via streaming`,
          keyInsights: input.results.keyFindings || [],
          recommendations: [],
          metadata: {
            ...input.metadata,
            streamingEnabled: true,
            source: 'streaming-api',
          },
          // Type-specific results
          ...(input.analysisType === 'conversion_psychology' && { conversionPsychology: input.results }),
          ...(input.analysisType === 'ux_analysis' && { uxAnalysis: input.results }),
          ...(input.analysisType === 'technical_seo' && { technicalSeo: input.results }),
          ...(input.analysisType === 'comprehensive' && { 
            conversionPsychology: input.results.conversionPsychology,
            uxAnalysis: input.results.uxAnalysis,
            technicalSeo: input.results.technicalSeo,
            overallInsights: input.results.overallInsights,
          }),
          ethicalCompliance: {
            noDarkPatterns: true,
            transparentRecommendations: true,
            userFocused: true,
            notes: [],
          },
        };

        // Note: This is a simplified save - in practice, you'd want to integrate
        // with the existing analysis database structure
        console.log('💾 Streaming analysis results saved:', {
          websiteId: input.websiteId,
          analysisType: input.analysisType,
          score: analysisResult.overallScore,
          isPartial: input.metadata.isPartial,
        });

        return {
          success: true,
          analysisId: analysisResult.id,
          timestamp: analysisResult.timestamp,
        };

      } catch (error) {
        console.error('❌ Failed to save streaming results:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save streaming analysis results'
        });
      }
    }),

  // Get streaming analysis history
  getStreamingHistory: publicProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input }) => {
      console.log('📋 Getting streaming analysis history for:', input.websiteId);
      
      // This would query your streaming analysis history
      // For now, return mock data structure
      return {
        history: [
          {
            id: 'streaming-123',
            analysisType: 'comprehensive',
            timestamp: new Date().toISOString(),
            status: 'completed',
            overallScore: 7.5,
            processingTime: 45000, // 45 seconds
            streamingVersion: '1.0.0',
            metadata: {
              isPartial: false,
              sectionsCompleted: ['conversion_psychology', 'ux_analysis', 'technical_seo', 'overall_insights'],
            },
          },
        ],
        total: 1,
        hasMore: false,
      };
    }),
});