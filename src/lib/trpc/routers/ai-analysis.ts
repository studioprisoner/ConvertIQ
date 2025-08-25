import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../server';
import { aiAnalysisEngine } from '@/lib/ai';
import { analysisTypeSchema, aiAnalysisResultSchema } from '@/lib/ai/types';
import { crawlResultSchema } from '@/lib/crawler/types';
import { aiAnalysisDb } from '@/lib/ai/database';
import { embeddingQueue } from '@/lib/embeddings';
import type { ExtractedData } from '@/lib/extraction/types';

export const aiAnalysisRouter = createTRPCRouter({
  // Test AI connection
  testConnection: publicProcedure
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

  // Analyze crawl data with AI and save to database
  analyze: publicProcedure
    .input(z.object({
      crawlData: crawlResultSchema,
      websiteId: z.string().uuid(),
      analysisType: analysisTypeSchema.default('comprehensive'),
      saveToDb: z.boolean().default(true),
      // Enhanced v2 fields
      extractionResults: z.record(z.any()).nullable().optional(),
      firecrawlVersion: z.enum(['v1', 'v2']).default('v1'),
      useEnhancedAnalysis: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      console.log('🤖 AI analysis starting for:', input.crawlData.url, 'Type:', input.analysisType, 'Firecrawl Version:', input.firecrawlVersion);
      
      try {
        let result;
        
        // Use enhanced analysis if requested and extraction results are available
        if (input.useEnhancedAnalysis && input.extractionResults && input.firecrawlVersion === 'v2') {
          console.log('🚀 Using enhanced Firecrawl v2 analysis with structured data');
          
          // Import enhanced analysis provider
          const { anthropic } = await import('@/lib/ai/providers/anthropic');
          
          // Use enhanced analysis with structured data
          result = await anthropic.analyzeConversionPsychologyEnhanced(
            input.crawlData,
            input.extractionResults
          );
        } else {
          // Use standard analysis
          result = await aiAnalysisEngine.analyze(
            input.crawlData,
            input.websiteId,
            input.analysisType
          );
        }
        
        console.log('🤖 AI analysis completed for:', input.crawlData.url);
        console.log('🤖 Overall score:', result.overallScore);
        console.log('🤖 Analysis result structure:', {
          hasRecommendations: !!result.recommendations,
          recommendationsType: typeof result.recommendations,
          resultKeys: Object.keys(result),
        });
        console.log('🤖 Recommendations count:', result.recommendations?.length || 0);
        
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
          
          // Automatically generate reports after successful analysis
          try {
            // Import report generation services directly 
            const { marketingReportGenerator } = await import('@/lib/reports/generators/marketing-report');
            const { conversionReportGenerator } = await import('@/lib/reports/generators/conversion-report');
            const { db } = await import('@/db/connection');
            const { reports } = await import('@/db/schema/reports');
            
            // Get the analysis data for report generation
            const analysisData = await aiAnalysisDb.getAnalysisById(analysisId);
            if (!analysisData) {
              throw new Error('Analysis data not found for report generation');
            }
            
            const reportGenerationInput = {
              websiteUrl: input.crawlData.url,
              businessType: 'general',
              targetAudience: 'small business owners'
            };
            
            // Generate marketing report
            console.log('📊 Generating marketing report for analysis:', analysisId);
            const marketingReportContent = await marketingReportGenerator.generateMarketingReport(
              result,
              reportGenerationInput
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
              reportGenerationInput
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
        console.error('🤖 Error stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('🤖 Input data structure:', {
          hasCrawlData: !!input.crawlData,
          hasExtractionResults: !!input.extractionResults,
          extractionResultsType: typeof input.extractionResults,
          useEnhancedAnalysis: input.useEnhancedAnalysis,
          firecrawlVersion: input.firecrawlVersion
        });
        throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Enhanced analysis using v2 extraction data
  analyzeEnhanced: publicProcedure
    .input(z.object({
      crawlData: crawlResultSchema,
      extractedData: z.record(z.any()), // ExtractedData type
      websiteId: z.string().uuid(),
      analysisType: analysisTypeSchema.default('comprehensive'),
      saveToDb: z.boolean().default(true),
      userId: z.string().optional(),
      userEmail: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log('🚀 Enhanced AI analysis starting for:', input.crawlData.url, 'Type:', input.analysisType);
      console.log('📊 Enhanced extraction data available:', !!input.extractedData);
      
      try {
        // Create enhanced analysis engine (to be implemented)
        const { EnhancedAIAnalysisEngine } = await import('@/lib/ai/enhanced-analysis-engine');
        const enhancedEngine = new EnhancedAIAnalysisEngine();
        
        // Perform enhanced analysis with structured data
        const result = await enhancedEngine.analyzeWithEnhancedData(
          input.crawlData,
          input.extractedData as ExtractedData,
          input.websiteId,
          input.analysisType
        );
        
        console.log('🚀 Enhanced AI analysis completed for:', input.crawlData.url);
        console.log('🎯 Overall score:', result.overallScore);
        console.log('📈 Enhanced recommendations count:', result.recommendations.length);
        
        // Save to database if requested
        if (input.saveToDb) {
          const analysisId = await aiAnalysisDb.saveAnalysis(
            input.websiteId,
            input.crawlData,
            result,
            {
              extractionResults: input.extractedData,
              firecrawlVersion: 'v2',
              isEnhancedAnalysis: true,
            }
          );
          console.log('💾 Enhanced analysis saved with ID:', analysisId);
          
          // Generate enhanced reports using existing generators with enriched data
          try {
            const { marketingReportGenerator } = await import('@/lib/reports/generators/marketing-report');
            const { conversionReportGenerator } = await import('@/lib/reports/generators/conversion-report');
            const { db } = await import('@/db/connection');
            const { reports } = await import('@/db/schema/reports');
            
            // Get the analysis data for report generation
            const analysisData = await aiAnalysisDb.getAnalysisById(analysisId);
            if (!analysisData) {
              throw new Error('Analysis data not found for report generation');
            }
            
            const reportGenerationInput = {
              websiteUrl: input.crawlData.url,
              businessType: 'general',
              targetAudience: 'small business owners'
            };
            
            // Generate marketing report with enhanced context
            console.log('📊 Generating enhanced marketing report for analysis:', analysisId);
            const marketingReportContent = await marketingReportGenerator.generateMarketingReport(
              result,
              reportGenerationInput
            );
            
            const [marketingReport] = await db
              .insert(reports)
              .values({
                analysisId,
                title: `Enhanced Marketing Analysis Report - ${input.crawlData.url}`,
                type: 'marketing',
                content: marketingReportContent,
                summary: marketingReportContent.executiveSummary?.keyFindings?.join('. ') || 'Enhanced marketing report generated successfully',
                createdAt: new Date(),
                updatedAt: new Date()
              })
              .returning();
            
            console.log('📊 Enhanced marketing report generated with ID:', marketingReport.id);
            
            // Generate conversion report with enhanced context
            console.log('📊 Generating enhanced conversion report for analysis:', analysisId);
            const conversionReportContent = await conversionReportGenerator.generateConversionReport(
              result,
              reportGenerationInput
            );
            
            const [conversionReport] = await db
              .insert(reports)
              .values({
                analysisId,
                title: `Enhanced Conversion Analysis Report - ${input.crawlData.url}`,
                type: 'conversion',
                content: conversionReportContent,
                summary: conversionReportContent.executiveSummary?.keyFindings?.join('. ') || 'Enhanced conversion report generated successfully',
                createdAt: new Date(),
                updatedAt: new Date()
              })
              .returning();
            
            console.log('📊 Enhanced conversion report generated with ID:', conversionReport.id);
            console.log('✅ All enhanced reports generated successfully for analysis:', analysisId);
            
          } catch (reportError) {
            console.error('❌ Failed to generate enhanced reports after analysis:', reportError);
            // Don't throw - analysis was successful, report generation failure shouldn't fail the analysis
          }
        }
        
        return {
          ...result,
          metadata: {
            ...result.metadata,
            extractionVersion: 'v2',
            enhancedAnalysis: true,
            dataRichness: (input.extractedData as ExtractedData)?.extractionMetrics?.dataQualityScore,
          },
        };
        
      } catch (error) {
        console.error('🚀 Enhanced AI analysis failed:', error);
        
        // Fallback to standard analysis
        console.log('⚠️ Falling back to standard v1 analysis');
        const result = await aiAnalysisEngine.analyze(
          input.crawlData,
          input.websiteId,
          input.analysisType
        );
        
        return {
          ...result,
          metadata: {
            ...result.metadata,
            extractionVersion: 'v1',
            enhancedAnalysis: false,
            fallbackReason: 'Enhanced analysis failed',
          },
        };
      }
    }),

  // Quick conversion psychology analysis
  analyzeConversion: publicProcedure
    .input(z.object({
      crawlData: crawlResultSchema,
      websiteId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      console.log('🎯 Conversion analysis starting for:', input.crawlData.url);
      
      try {
        const result = await aiAnalysisEngine.analyze(
          input.crawlData,
          input.websiteId,
          'conversion_psychology'
        );
        
        console.log('🎯 Conversion analysis completed. Score:', result.overallScore);
        return result;
      } catch (error) {
        console.error('🎯 Conversion analysis failed:', error);
        throw new Error(`Conversion analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Quick UX analysis
  analyzeUX: publicProcedure
    .input(z.object({
      crawlData: crawlResultSchema,
      websiteId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      console.log('🎨 UX analysis starting for:', input.crawlData.url);
      
      try {
        const result = await aiAnalysisEngine.analyze(
          input.crawlData,
          input.websiteId,
          'ux_ui_analysis'
        );
        
        console.log('🎨 UX analysis completed. Score:', result.overallScore);
        return result;
      } catch (error) {
        console.error('🎨 UX analysis failed:', error);
        throw new Error(`UX analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Quick SEO analysis
  analyzeSEO: publicProcedure
    .input(z.object({
      crawlData: crawlResultSchema,
      websiteId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      console.log('🔍 SEO analysis starting for:', input.crawlData.url);
      
      try {
        const result = await aiAnalysisEngine.analyze(
          input.crawlData,
          input.websiteId,
          'technical_seo'
        );
        
        console.log('🔍 SEO analysis completed. Score:', result.overallScore);
        return result;
      } catch (error) {
        console.error('🔍 SEO analysis failed:', error);
        throw new Error(`SEO analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Validate analysis result
  validateResult: publicProcedure
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

  // Get latest analysis for a website
  getLatestAnalysis: publicProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      console.log('📊 Getting latest analysis for website:', input.websiteId);
      
      try {
        const analysis = await aiAnalysisDb.getLatestAnalysis(input.websiteId);
        
        if (!analysis) {
          return null;
        }
        
        console.log('📊 Latest analysis found with score:', analysis.overallScore);
        return analysis;
      } catch (error) {
        console.error('📊 Failed to get latest analysis:', error);
        throw new Error(`Failed to retrieve analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Get all analyses for a website
  getWebsiteAnalyses: publicProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      console.log('📊 Getting all analyses for website:', input.websiteId);
      
      try {
        const analyses = await aiAnalysisDb.getWebsiteAnalyses(input.websiteId);
        
        console.log('📊 Found', analyses.length, 'analyses for website');
        return analyses;
      } catch (error) {
        console.error('📊 Failed to get website analyses:', error);
        throw new Error(`Failed to retrieve analyses: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Get specific analysis by ID
  getAnalysisById: publicProcedure
    .input(z.object({
      analysisId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      console.log('📊 Getting analysis by ID:', input.analysisId);
      
      try {
        const result = await aiAnalysisDb.getAnalysisById(input.analysisId);
        
        if (!result) {
          throw new Error('Analysis not found');
        }
        
        console.log('📊 Analysis found for URL:', result.website?.url);
        return result;
      } catch (error) {
        console.error('📊 Failed to get analysis by ID:', error);
        throw new Error(`Failed to retrieve analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Get analysis statistics
  getStats: publicProcedure
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

  // Admin: Backfill embeddings for existing analyses
  backfillEmbeddings: publicProcedure
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
  getEmbeddingQueueStatus: publicProcedure
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

  // Admin: Generate embedding for specific analysis
  generateEmbedding: publicProcedure
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

  // Re-trigger individual analysis sections
  retriggerConversionAnalysis: publicProcedure
    .input(z.object({
      analysisId: z.string().uuid(),
      websiteId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      console.log('🔄 Re-triggering conversion analysis for:', input.analysisId);
      
      try {
        // Get original crawl data
        const analysisData = await aiAnalysisDb.getAnalysisById(input.analysisId);
        if (!analysisData) {
          throw new Error('Original analysis not found');
        }

        // Import provider directly to avoid circular imports
        const { AnthropicAnalysisProvider } = await import('@/lib/ai/providers/anthropic');
        const provider = new AnthropicAnalysisProvider();
        
        // Re-run only conversion psychology analysis
        const conversionResult = await provider.analyzeConversionPsychology(analysisData.crawlData);
        
        // Update the existing analysis with new conversion data
        const updatedAnalysis = {
          ...analysisData.analysis,
          conversionPsychology: conversionResult.analysis,
          metadata: {
            ...analysisData.analysis.metadata,
            lastRetriggered: new Date().toISOString(),
            retriggeredSections: ['conversion_psychology'],
          }
        };
        
        // Save updated analysis
        await aiAnalysisDb.updateAnalysisWithAI(input.analysisId, updatedAnalysis);
        
        console.log('✅ Conversion analysis re-triggered successfully');
        return {
          success: true,
          analysisId: input.analysisId,
          section: 'conversion_psychology',
          newScore: conversionResult.analysis.overallScore,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('🔄 Failed to re-trigger conversion analysis:', error);
        throw new Error(`Failed to re-trigger conversion analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  retriggerUXAnalysis: publicProcedure
    .input(z.object({
      analysisId: z.string().uuid(),
      websiteId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      console.log('🔄 Re-triggering UX analysis for:', input.analysisId);
      
      try {
        // Get original crawl data
        const analysisData = await aiAnalysisDb.getAnalysisById(input.analysisId);
        if (!analysisData) {
          throw new Error('Original analysis not found');
        }

        // Import provider directly to avoid circular imports
        const { AnthropicAnalysisProvider } = await import('@/lib/ai/providers/anthropic');
        const provider = new AnthropicAnalysisProvider();
        
        // Re-run only UX analysis
        const uxResult = await provider.analyzeUX(analysisData.crawlData);
        
        // Update the existing analysis with new UX data
        const updatedAnalysis = {
          ...analysisData.analysis,
          uxAnalysis: uxResult.analysis,
          metadata: {
            ...analysisData.analysis.metadata,
            lastRetriggered: new Date().toISOString(),
            retriggeredSections: [...(analysisData.analysis.metadata?.retriggeredSections || []), 'ux_analysis'],
          }
        };
        
        // Save updated analysis
        await aiAnalysisDb.updateAnalysisWithAI(input.analysisId, updatedAnalysis);
        
        console.log('✅ UX analysis re-triggered successfully');
        return {
          success: true,
          analysisId: input.analysisId,
          section: 'ux_analysis',
          newScore: uxResult.analysis.overallScore,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('🔄 Failed to re-trigger UX analysis:', error);
        throw new Error(`Failed to re-trigger UX analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  retriggerSEOAnalysis: publicProcedure
    .input(z.object({
      analysisId: z.string().uuid(),
      websiteId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      console.log('🔄 Re-triggering SEO analysis for:', input.analysisId);
      
      try {
        // Get original crawl data
        const analysisData = await aiAnalysisDb.getAnalysisById(input.analysisId);
        if (!analysisData) {
          throw new Error('Original analysis not found');
        }

        // Import provider directly to avoid circular imports
        const { AnthropicAnalysisProvider } = await import('@/lib/ai/providers/anthropic');
        const provider = new AnthropicAnalysisProvider();
        
        // Re-run only SEO analysis
        const seoResult = await provider.analyzeTechnicalSEO(analysisData.crawlData);
        
        // Update the existing analysis with new SEO data
        const updatedAnalysis = {
          ...analysisData.analysis,
          technicalSeo: seoResult.analysis,
          metadata: {
            ...analysisData.analysis.metadata,
            lastRetriggered: new Date().toISOString(),
            retriggeredSections: [...(analysisData.analysis.metadata?.retriggeredSections || []), 'technical_seo'],
          }
        };
        
        // Save updated analysis
        await aiAnalysisDb.updateAnalysisWithAI(input.analysisId, updatedAnalysis);
        
        console.log('✅ SEO analysis re-triggered successfully');
        return {
          success: true,
          analysisId: input.analysisId,
          section: 'technical_seo',
          newScore: seoResult.analysis.overallScore,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('🔄 Failed to re-trigger SEO analysis:', error);
        throw new Error(`Failed to re-trigger SEO analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Re-trigger all failed sections of an analysis
  retriggerFailedSections: publicProcedure
    .input(z.object({
      analysisId: z.string().uuid(),
      websiteId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      console.log('🔄 Re-triggering all failed sections for:', input.analysisId);
      
      try {
        // Get original analysis
        const analysisData = await aiAnalysisDb.getAnalysisById(input.analysisId);
        if (!analysisData) {
          throw new Error('Original analysis not found');
        }

        // Import provider directly to avoid circular imports
        const { AnthropicAnalysisProvider } = await import('@/lib/ai/providers/anthropic');
        const provider = new AnthropicAnalysisProvider();
        
        // Check which sections used fallbacks
        const failedSections = [];
        const sectionsToRetrigger = [];
        
        if (analysisData.analysis.conversionPsychology?.metadata?.isFallback) {
          failedSections.push('conversion_psychology');
          sectionsToRetrigger.push(() => provider.analyzeConversionPsychology(analysisData.crawlData));
        }
        
        if (analysisData.analysis.uxAnalysis?.metadata?.isFallback) {
          failedSections.push('ux_analysis');
          sectionsToRetrigger.push(() => provider.analyzeUX(analysisData.crawlData));
        }
        
        if (analysisData.analysis.technicalSeo?.metadata?.isFallback) {
          failedSections.push('technical_seo');
          sectionsToRetrigger.push(() => provider.analyzeTechnicalSEO(analysisData.crawlData));
        }

        if (failedSections.length === 0) {
          return {
            success: true,
            message: 'No failed sections found to re-trigger',
            analysisId: input.analysisId,
            timestamp: new Date().toISOString(),
          };
        }

        console.log(`🔄 Re-triggering ${failedSections.length} failed sections:`, failedSections.join(', '));
        
        // Run all failed sections in parallel
        const results = await Promise.allSettled(
          sectionsToRetrigger.map(fn => fn())
        );
        
        // Update analysis with successful results
        const updatedAnalysis = { ...analysisData.analysis };
        const successfulSections = [];
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const sectionName = failedSections[index];
            successfulSections.push(sectionName);
            
            switch (sectionName) {
              case 'conversion_psychology':
                updatedAnalysis.conversionPsychology = result.value.analysis;
                break;
              case 'ux_analysis':
                updatedAnalysis.uxAnalysis = result.value.analysis;
                break;
              case 'technical_seo':
                updatedAnalysis.technicalSeo = result.value.analysis;
                break;
            }
          }
        });
        
        // Update metadata
        updatedAnalysis.metadata = {
          ...updatedAnalysis.metadata,
          lastRetriggered: new Date().toISOString(),
          retriggeredSections: [...(updatedAnalysis.metadata?.retriggeredSections || []), ...successfulSections],
        };
        
        // Save updated analysis
        await aiAnalysisDb.updateAnalysisWithAI(input.analysisId, updatedAnalysis);
        
        console.log(`✅ Re-triggered ${successfulSections.length}/${failedSections.length} sections successfully`);
        return {
          success: true,
          analysisId: input.analysisId,
          attemptedSections: failedSections,
          successfulSections,
          failedSections: failedSections.filter(s => !successfulSections.includes(s)),
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('🔄 Failed to re-trigger failed sections:', error);
        throw new Error(`Failed to re-trigger failed sections: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Check analysis metadata for fallback indicators
  getAnalysisMetadata: publicProcedure
    .input(z.object({
      analysisId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      console.log('📊 Getting analysis metadata for:', input.analysisId);
      
      try {
        const analysisData = await aiAnalysisDb.getAnalysisById(input.analysisId);
        if (!analysisData) {
          throw new Error('Analysis not found');
        }

        // Extract metadata from all sections
        const metadata = {
          analysisId: input.analysisId,
          createdAt: analysisData.analysis.metadata?.createdAt,
          lastRetriggered: analysisData.analysis.metadata?.lastRetriggered,
          retriggeredSections: analysisData.analysis.metadata?.retriggeredSections || [],
          sections: {
            conversionPsychology: {
              hasFallback: analysisData.analysis.conversionPsychology?.metadata?.isFallback || false,
              fallbackReason: analysisData.analysis.conversionPsychology?.metadata?.fallbackReason,
              score: analysisData.analysis.conversionPsychology?.overallScore,
              confidence: analysisData.analysis.conversionPsychology?.metadata?.confidence,
            },
            uxAnalysis: {
              hasFallback: analysisData.analysis.uxAnalysis?.metadata?.isFallback || false,
              fallbackReason: analysisData.analysis.uxAnalysis?.metadata?.fallbackReason,
              score: analysisData.analysis.uxAnalysis?.overallScore,
              confidence: analysisData.analysis.uxAnalysis?.metadata?.confidence,
            },
            technicalSeo: {
              hasFallback: analysisData.analysis.technicalSeo?.metadata?.isFallback || false,
              fallbackReason: analysisData.analysis.technicalSeo?.metadata?.fallbackReason,
              score: analysisData.analysis.technicalSeo?.overallScore,
              confidence: analysisData.analysis.technicalSeo?.metadata?.confidence,
            }
          }
        };

        return metadata;
      } catch (error) {
        console.error('📊 Failed to get analysis metadata:', error);
        throw new Error(`Failed to retrieve metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),
});