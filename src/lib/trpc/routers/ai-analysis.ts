import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../server';
import { aiAnalysisEngine } from '@/lib/ai';
import { analysisTypeSchema, aiAnalysisResultSchema } from '@/lib/ai/types';
import { crawlResultSchema } from '@/lib/crawler/types';
import { aiAnalysisDb } from '@/lib/ai/database';

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
    }))
    .mutation(async ({ input }) => {
      console.log('🤖 AI analysis starting for:', input.crawlData.url, 'Type:', input.analysisType);
      
      try {
        const result = await aiAnalysisEngine.analyze(
          input.crawlData,
          input.websiteId,
          input.analysisType
        );
        
        console.log('🤖 AI analysis completed for:', input.crawlData.url);
        console.log('🤖 Overall score:', result.overallScore);
        console.log('🤖 Recommendations count:', result.recommendations.length);
        
        // Save to database if requested
        if (input.saveToDb) {
          const analysisId = await aiAnalysisDb.saveAnalysis(
            input.websiteId,
            input.crawlData,
            result
          );
          console.log('💾 Analysis saved with ID:', analysisId);
        }
        
        return result;
      } catch (error) {
        console.error('🤖 AI analysis failed:', error);
        throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
});