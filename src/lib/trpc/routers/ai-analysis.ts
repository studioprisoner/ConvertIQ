import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../server';
import { aiAnalysisEngine } from '@/lib/ai';
import { analysisTypeSchema, aiAnalysisResultSchema } from '@/lib/ai/types';
import { crawlResultSchema } from '@/lib/crawler/types';
// Canonical, non-lossy analysis persistence layer (CON-117). The router used to
// shadow this with a local stub; that stub is gone and saveAnalysis now stores
// the full AIAnalysisResult (incl. recommendations).
import { aiAnalysisDb } from '@/lib/ai/database';
import { embeddingQueue } from '@/lib/embeddings';

// Static imports to fix schema synchronization issues
import { db } from '@/db/connection';
import { analyses } from '@/db/schema/analyses';
import { websites } from '@/db/schema/websites';
import { reports } from '@/db/schema/reports';
import { eq, and, desc } from 'drizzle-orm';



/**
 * Throws unless the website exists AND belongs to the given user. Unowned and
 * missing IDs produce the identical error so website IDs cannot be probed.
 */
async function assertWebsiteOwnership(websiteId: string, userId: string): Promise<void> {
  const owned = await db
    .select({ id: websites.id })
    .from(websites)
    .where(and(eq(websites.id, websiteId), eq(websites.userId, userId)))
    .limit(1);

  if (owned.length === 0) {
    throw new Error('Website not found');
  }
}

export const aiAnalysisRouter = createTRPCRouter({
  // Test AI connection
  testConnection: protectedProcedure
    .query(async () => {
      console.log('🤖 Testing AI connection...');
      
      try {
        const isConnected = await aiAnalysisEngine.testConnection();
        console.log('🤖 AI connection test result:', isConnected);
        
        return {
          connected: isConnected,
          timestamp: new Date().toISOString(),
          provider: 'anthropic',
        };
      } catch (error) {
        console.error('🤖 AI connection test failed:', error);
        throw new Error(`AI connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Analyze crawl data with AI and save to database - TEMPORARILY SIMPLIFIED
  analyze: protectedProcedure
    .input(z.object({
      crawlData: crawlResultSchema,
      websiteId: z.string().uuid(),
      analysisType: analysisTypeSchema.default('comprehensive'),
      saveToDb: z.boolean().default(true),
      firecrawlVersion: z.enum(['v1', 'v2']).default('v1'),
      useEnhancedAnalysis: z.boolean().default(false),
      extractionResults: z.any().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      console.log('🤖 AI analysis starting for:', input.crawlData?.url || 'unknown URL', 'Type:', input.analysisType, 'Firecrawl Version:', input.firecrawlVersion);

      try {
        await assertWebsiteOwnership(input.websiteId, ctx.user!.id);
        // Run the real AI analysis. Returns a full AIAnalysisResult with genuine
        // scores and recommendations (replaces the previous mock). When enhanced
        // analysis is requested, the v2 extraction data is passed through so the
        // engine can use structured data; otherwise standard v1 analysis runs.
        const result = await aiAnalysisEngine.analyze(
          input.crawlData,
          input.websiteId,
          input.analysisType,
          input.useEnhancedAnalysis ? (input.extractionResults ?? undefined) : undefined,
        );

        console.log(
          '🤖 AI analysis completed for:',
          input.crawlData.url,
          '| score:',
          result.overallScore,
          '| recommendations:',
          result.recommendations?.length ?? 0,
        );

        // Save to database if requested
        if (input.saveToDb) {
          const analysisId = await aiAnalysisDb.saveAnalysis(
            input.websiteId,
            input.crawlData,
            result,
            {
              extractionResults: input.extractionResults,
              firecrawlVersion: input.firecrawlVersion,
              isEnhancedAnalysis: input.useEnhancedAnalysis,
            }
          );
          console.log('💾 Analysis saved with ID:', analysisId, 'Version:', input.firecrawlVersion);
          
          // Now generate reports using the existing report generators
          try {
            console.log('📊 Generating reports for analysis:', analysisId);
            const { marketingReportGenerator } = await import('@/lib/reports/generators/marketing-report');
            const { conversionReportGenerator } = await import('@/lib/reports/generators/conversion-report');
            // Use static imports from top of file
            
            const reportGenerationInput = {
              analysisId,
              websiteUrl: input.crawlData.url,
              businessType: 'general',
              targetAudience: 'small business owners',
            };
            
            // Generate marketing report
            console.log('📊 Generating marketing report for analysis:', analysisId);
            const marketingReportContent = await marketingReportGenerator.generateMarketingReport(
              result,
              { ...reportGenerationInput, reportType: 'marketing' as const }
            );
            
            const [marketingReport] = await db
              .insert(reports)
              .values({
                analysisId,
                title: `Marketing Analysis Report - ${input.crawlData.url}`,
                type: 'marketing',
                content: marketingReportContent,
                summary: marketingReportContent.executiveSummary?.keyFindings?.join('. ') || 'Marketing report generated successfully',
                createdAt: new Date(),
                updatedAt: new Date()
              })
              .returning();
            
            console.log('📊 Marketing report generated with ID:', marketingReport.id);
            
            // Generate conversion report
            console.log('📊 Generating conversion report for analysis:', analysisId);
            const conversionReportContent = await conversionReportGenerator.generateConversionReport(
              result,
              { ...reportGenerationInput, reportType: 'conversion' as const }
            );
            
            const [conversionReport] = await db
              .insert(reports)
              .values({
                analysisId,
                title: `Conversion Analysis Report - ${input.crawlData.url}`,
                type: 'conversion',
                content: conversionReportContent,
                summary: conversionReportContent.executiveSummary?.keyFindings?.join('. ') || 'Conversion report generated successfully',
                createdAt: new Date(),
                updatedAt: new Date()
              })
              .returning();
            
            console.log('📊 Conversion report generated with ID:', conversionReport.id);
            console.log('✅ All reports generated successfully for analysis:', analysisId);
          } catch (reportError) {
            console.error('❌ Failed to generate reports after analysis:', reportError);
            // Don't throw - analysis was successful, report generation failure shouldn't fail the analysis
          }
        }

        return result;

      } catch (error) {
        console.error('🤖 AI analysis failed:', error);
        throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Validate analysis result
  validateResult: protectedProcedure
    .input(aiAnalysisResultSchema)
    .mutation(async ({ input }) => {
      console.log('✅ Validating AI analysis result for website:', input.websiteId);
      
      try {
        // The input is already validated by the schema
        // Additional custom validation can be added here
        
        const isValid = input.recommendations.length > 0 && 
                       input.overallScore >= 1 && 
                       input.overallScore <= 10;
        
        return {
          isValid,
          resultId: input.id,
          validatedAt: new Date().toISOString(),
          issues: isValid ? [] : ['Missing recommendations or invalid score'],
        };
      } catch (error) {
        console.error('✅ Analysis result validation failed:', error);
        throw new Error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Get latest analysis for a website - TEMPORARILY SIMPLIFIED
  getLatestAnalysis: protectedProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      console.log('📊 Getting latest analysis for website:', input.websiteId);

      try {
        // Ownership check: the website must belong to the caller
        const ownedWebsite = await db
          .select({ id: websites.id })
          .from(websites)
          .where(and(eq(websites.id, input.websiteId), eq(websites.userId, ctx.user!.id)))
          .limit(1);

        if (ownedWebsite.length === 0) {
          return null;
        }

        const analysis = await aiAnalysisDb.getLatestAnalysis(input.websiteId);
        
        if (!analysis) {
          return null;
        }
        
        console.log('📊 Latest analysis found with score:', analysis?.overallScore || 'N/A');
        return analysis;
      } catch (error) {
        console.error('📊 Failed to get latest analysis:', error);
        throw new Error(`Failed to retrieve analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Get all analyses for a website - TEMPORARILY SIMPLIFIED
  getWebsiteAnalyses: protectedProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      console.log('📊 Getting all analyses for website:', input.websiteId);

      try {
        // Ownership check: the website must belong to the caller
        const ownedWebsite = await db
          .select({ id: websites.id })
          .from(websites)
          .where(and(eq(websites.id, input.websiteId), eq(websites.userId, ctx.user!.id)))
          .limit(1);

        if (ownedWebsite.length === 0) {
          return [];
        }

        const analyses = await aiAnalysisDb.getWebsiteAnalyses(input.websiteId);
        
        console.log('📊 Found', analyses.length, 'analyses for website');
        return analyses;
      } catch (error) {
        console.error('📊 Failed to get website analyses:', error);
        throw new Error(`Failed to retrieve analyses: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Get specific analysis by ID - TEMPORARILY SIMPLIFIED
  getAnalysisById: protectedProcedure
    .input(z.object({
      analysisId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      console.log('📊 Getting analysis by ID:', input.analysisId);

      try {
        const result = await aiAnalysisDb.getAnalysisById(input.analysisId);

        // Ownership check: the joined website must belong to the caller.
        // Returns the same "not found" as a missing row so IDs can't be probed.
        if (!result || result.website?.userId !== ctx.user!.id) {
          throw new Error('Analysis not found');
        }
        
        console.log('📊 Analysis found for URL:', result?.website?.url || 'N/A');
        return result;
      } catch (error) {
        console.error('📊 Failed to get analysis by ID:', error);
        throw new Error(`Failed to retrieve analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Get analysis statistics - TEMPORARILY SIMPLIFIED
  getStats: protectedProcedure
    .query(async () => {
      console.log('📈 Getting analysis statistics');
      
      try {
        const stats = await aiAnalysisDb.getAnalysisStats();
        
        console.log('📈 Stats retrieved:', stats);
        return stats;
      } catch (error) {
        console.error('📈 Failed to get analysis stats:', error);
        throw new Error(`Failed to retrieve stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Admin: Backfill embeddings for existing analyses without one
  backfillEmbeddings: protectedProcedure
    .mutation(async () => {
      console.log('🔮 Starting embedding backfill process');

      try {
        await embeddingQueue.backfillEmbeddings();

        return {
          success: true,
          message: 'Embedding backfill process started',
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('🔮 Embedding backfill failed:', error);
        throw new Error(`Backfill failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Admin: Get embedding queue status
  getEmbeddingQueueStatus: protectedProcedure
    .query(async () => {
      console.log('🔮 Getting embedding queue status');

      try {
        const status = embeddingQueue.getStatus();

        console.log('🔮 Queue status:', status);
        return status;
      } catch (error) {
        console.error('🔮 Failed to get queue status:', error);
        throw new Error(`Failed to get queue status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Admin: Generate embedding for a specific analysis
  generateEmbedding: protectedProcedure
    .input(z.object({
      analysisId: z.string().uuid(),
      priority: z.enum(['normal', 'high']).default('high'),
    }))
    .mutation(async ({ input }) => {
      console.log('🔮 Queuing embedding generation for analysis:', input.analysisId);

      try {
        await embeddingQueue.add({
          analysisId: input.analysisId,
          priority: input.priority,
        });
        
        return {
          success: true,
          analysisId: input.analysisId,
          priority: input.priority,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('🔮 Failed to queue embedding generation:', error);
        throw new Error(`Failed to queue embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

});