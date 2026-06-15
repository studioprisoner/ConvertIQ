import { db } from '@/db/connection';
import { analyses, websites, insertAnalysisSchema } from '@/db/schema';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import type { AIAnalysisResult } from './types';
import type { CrawlResult } from '../crawler/types';
import { embeddingService, textProcessor, embeddingQueue } from '@/lib/embeddings';
import { randomUUID } from 'crypto';

export class AIAnalysisDatabase {
  /**
   * Save AI analysis result to database
   */
  async saveAnalysis(
    websiteId: string,
    crawlData: CrawlResult,
    aiAnalysisResult: AIAnalysisResult,
    metadata?: {
      extractionResults?: any;
      firecrawlVersion?: string;
      isEnhancedAnalysis?: boolean;
    }
  ): Promise<string> {
    try {
      // Verify website exists before saving analysis
      const websiteCheck = await db
        .select({ id: websites.id })
        .from(websites)
        .where(eq(websites.id, websiteId))
        .limit(1);

      if (websiteCheck.length === 0) {
        throw new Error(`Website with ID ${websiteId} not found in database. Cannot save analysis.`);
      }
      // Aggressively compress JSON data for database storage
      const compressForDatabase = (data: any, fieldType: 'crawl' | 'analysis' | 'extraction'): string => {
        try {
          let compressedData;
          
          if (fieldType === 'crawl') {
            // Ultra-minimal crawl data - absolute essentials only
            compressedData = {
              url: data.url,
              timestamp: data.timestamp,
              statusCode: data.statusCode,
              loadTime: data.performance?.loadTime,
              htmlSize: data.performance?.htmlSize,
              title: data.htmlAnalysis?.meta?.title?.substring(0, 100),
              wordCount: data.htmlAnalysis?.structure?.wordCount,
              compressed: true,
              originalSize: JSON.stringify(data).length
            };
          } else if (fieldType === 'analysis') {
            // Ultra-minimal analysis results - just core scores and summary
            compressedData = {
              type: data.analysis?.type || data.type,
              overallScore: data.analysis?.overallScore || data.overallScore,
              businessType: data.analysis?.websiteOverview?.businessType,
              summary: data.analysis?.websiteOverview?.summary?.substring(0, 200),
              topRecommendationsCount: (data.analysis?.topRecommendations || data.topRecommendations)?.length || 0,
              compressed: true,
              originalSize: JSON.stringify(data).length
            };
          } else {
            // Ultra-minimal extraction results
            compressedData = {
              pageType: data.structuredData?.pageType,
              confidence: data.structuredData?.confidence,
              businessName: data.structuredData?.data?.product?.name,
              category: data.structuredData?.data?.product?.category,
              dataQualityScore: data.extractionMetrics?.dataQualityScore,
              fieldsExtracted: data.extractionMetrics?.fieldsExtracted,
              compressed: true,
              originalSize: JSON.stringify(data).length
            };
          }
          
          const stringified = JSON.stringify(compressedData);
          const maxSize = 10000; // 10KB limit per field - extremely aggressive
          
          if (stringified.length > maxSize) {
            console.log(`💾 Data still too large for ${fieldType}: ${stringified.length} → storing minimal summary`);
            return JSON.stringify({
              summary: `Minimal ${fieldType} summary`,
              url: fieldType === 'crawl' ? data.url : undefined,
              score: fieldType === 'analysis' ? (data.analysis?.overallScore || data.overallScore) : undefined,
              timestamp: new Date().toISOString(),
              originalSize: JSON.stringify(data).length,
              status: 'minimal_storage'
            });
          }
          
          return stringified;
        } catch (error) {
          console.error(`💾 Error compressing ${fieldType} data:`, error);
          return JSON.stringify({
            error: 'Failed to compress data',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            fieldType,
            timestamp: new Date().toISOString()
          });
        }
      };

      // Use raw SQL to avoid Drizzle's automatic column inclusion
      const analysisId = randomUUID();
      
      await db.execute(sql`
        INSERT INTO analyses (
          id,
          website_id,
          status,
          raw_data,
          ai_analysis,
          firecrawl_version,
          extraction_results,
          extraction_data_used,
          load_time,
          page_size,
          resource_count
        ) VALUES (
          ${analysisId},
          ${websiteId},
          'completed',
          ${compressForDatabase(crawlData, 'crawl')},
          ${compressForDatabase(aiAnalysisResult, 'analysis')},
          ${metadata?.firecrawlVersion || 'v2'},
          ${metadata?.extractionResults ? compressForDatabase(metadata.extractionResults, 'extraction') : null},
          ${metadata?.isEnhancedAnalysis || false},
          ${crawlData.performance?.loadTime || null},
          ${crawlData.performance?.htmlSize || null},
          ${crawlData.performance?.totalResourcesCount || null}
        )
      `);

      console.log('💾 AI analysis saved to database:', analysisId);

      // Automatically queue embedding generation (CON-23). Non-blocking by
      // contract: any failure here is swallowed so embedding problems can never
      // fail the analysis save — the backfill script recovers any misses. New
      // reports run at high priority so fresh content becomes searchable first.
      await this.queueEmbeddingGeneration(analysisId);

      return analysisId;
    } catch (error) {
      console.error('💾 Failed to save AI analysis:', error);
      throw new Error(`Failed to save analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Queue automatic embedding generation for a freshly-saved analysis (CON-23).
   * Never throws: embedding failures must not fail the analysis save.
   */
  private async queueEmbeddingGeneration(analysisId: string): Promise<void> {
    try {
      await embeddingQueue.add({ analysisId, priority: 'high' });
    } catch (error) {
      console.error('💾 Failed to queue embedding generation (non-fatal):', analysisId, error);
    }
  }

  /**
   * Update existing analysis with AI results
   */
  async updateAnalysisWithAI(
    analysisId: string,
    aiAnalysisResult: AIAnalysisResult
  ): Promise<void> {
    try {
      await db
        .update(analyses)
        .set({
          aiAnalysis: JSON.stringify(aiAnalysisResult),
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(analyses.id, analysisId));

      console.log('💾 AI analysis updated in database:', analysisId);
    } catch (error) {
      console.error('💾 Failed to update AI analysis:', error);
      throw new Error(`Failed to update analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mark analysis as failed
   */
  async markAnalysisFailed(analysisId: string, errorMessage: string): Promise<void> {
    try {
      await db
        .update(analyses)
        .set({
          status: 'failed',
          errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(analyses.id, analysisId));

      console.log('💾 Analysis marked as failed:', analysisId);
    } catch (error) {
      console.error('💾 Failed to mark analysis as failed:', error);
      throw new Error(`Failed to update analysis status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get latest AI analysis for a website
   */
  async getLatestAnalysis(websiteId: string): Promise<AIAnalysisResult | null> {
    try {
      const result = await db
        .select()
        .from(analyses)
        .where(
          and(
            eq(analyses.websiteId, websiteId),
            eq(analyses.status, 'completed')
          )
        )
        .orderBy(desc(analyses.createdAt))
        .limit(1);

      if (result.length === 0 || !result[0].aiAnalysis) {
        return null;
      }

      return JSON.parse(result[0].aiAnalysis) as AIAnalysisResult;
    } catch (error) {
      console.error('💾 Failed to get latest analysis:', error);
      throw new Error(`Failed to retrieve analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all analyses for a website
   */
  async getWebsiteAnalyses(websiteId: string): Promise<Array<{
    id: string;
    status: string;
    createdAt: Date;
    aiAnalysis?: AIAnalysisResult;
  }>> {
    try {
      const results = await db
        .select({
          id: analyses.id,
          status: analyses.status,
          createdAt: analyses.createdAt,
          aiAnalysis: analyses.aiAnalysis,
        })
        .from(analyses)
        .where(eq(analyses.websiteId, websiteId))
        .orderBy(desc(analyses.createdAt));

      return results.map(result => ({
        id: result.id,
        status: result.status || 'unknown',
        createdAt: result.createdAt || new Date(),
        aiAnalysis: result.aiAnalysis ? JSON.parse(result.aiAnalysis) : undefined,
      }));
    } catch (error) {
      console.error('💾 Failed to get website analyses:', error);
      throw new Error(`Failed to retrieve analyses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get specific analysis by ID
   */
  async getAnalysisById(analysisId: string): Promise<{
    analysis: AIAnalysisResult;
    crawlData: CrawlResult;
    website: any;
  } | null> {
    try {
      const result = await db
        .select({
          analysis: analyses.aiAnalysis,
          rawData: analyses.rawData,
          website: websites,
        })
        .from(analyses)
        .leftJoin(websites, eq(analyses.websiteId, websites.id))
        .where(eq(analyses.id, analysisId))
        .limit(1);

      if (result.length === 0 || !result[0].analysis || !result[0].rawData) {
        return null;
      }

      return {
        analysis: JSON.parse(result[0].analysis) as AIAnalysisResult,
        crawlData: JSON.parse(result[0].rawData) as CrawlResult,
        website: result[0].website,
      };
    } catch (error) {
      console.error('💾 Failed to get analysis by ID:', error);
      throw new Error(`Failed to retrieve analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get analysis statistics
   */
  async getAnalysisStats(): Promise<{
    totalAnalyses: number;
    completedAnalyses: number;
    failedAnalyses: number;
    averageScore: number;
  }> {
    try {
      const results = await db
        .select({
          status: analyses.status,
          aiAnalysis: analyses.aiAnalysis,
        })
        .from(analyses);

      const totalAnalyses = results.length;
      const completedAnalyses = results.filter(r => r.status === 'completed').length;
      const failedAnalyses = results.filter(r => r.status === 'failed').length;

      // Calculate average score from completed analyses
      const scores = results
        .filter(r => r.status === 'completed' && r.aiAnalysis)
        .map(r => {
          try {
            const analysis = JSON.parse(r.aiAnalysis!) as AIAnalysisResult;
            return analysis.overallScore;
          } catch {
            return null;
          }
        })
        .filter(score => score !== null) as number[];

      const averageScore = scores.length > 0 
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
        : 0;

      return {
        totalAnalyses,
        completedAnalyses,
        failedAnalyses,
        averageScore: Math.round(averageScore * 10) / 10, // Round to 1 decimal
      };
    } catch (error) {
      console.error('💾 Failed to get analysis stats:', error);
      throw new Error(`Failed to retrieve stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update analysis with embedding
   */
  async updateAnalysisWithEmbedding(
    analysisId: string,
    embedding: number[],
    model: string = 'voyage-3.5'
  ): Promise<void> {
    try {
      await db
        .update(analyses)
        .set({
          embedding: embedding, // pgvector handles arrays directly
          embeddingModel: model,
          embeddingCreatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(analyses.id, analysisId));

      console.log('💾 Analysis embedding updated:', analysisId);
    } catch (error) {
      console.error('💾 Failed to update analysis embedding:', error);
      throw new Error(`Failed to update embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get analyses without embeddings for backfill
   */
  async getAnalysesWithoutEmbeddings(): Promise<Array<{
    id: string;
    aiAnalysis: string;
    websiteId: string;
  }>> {
    try {
      const results = await db
        .select({
          id: analyses.id,
          aiAnalysis: analyses.aiAnalysis,
          websiteId: analyses.websiteId,
        })
        .from(analyses)
        .where(
          and(
            eq(analyses.status, 'completed'),
            // embedding IS NULL — `eq(col, null)` compiles to `= NULL`, which is
            // never true in SQL, so backfill must use isNull to find un-embedded
            // rows. (Previously this always returned zero rows.)
            isNull(analyses.embedding)
          )
        )
        .orderBy(desc(analyses.createdAt));

      return results
        .filter(result => result.aiAnalysis) // Only return analyses with AI analysis
        .map(result => ({
          id: result.id,
          aiAnalysis: result.aiAnalysis!,
          websiteId: result.websiteId,
        }));
    } catch (error) {
      console.error('💾 Failed to get analyses without embeddings:', error);
      throw new Error(`Failed to retrieve analyses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate and save embedding for an analysis
   */
  async generateEmbeddingForAnalysis(analysisId: string): Promise<void> {
    try {
      // Get the analysis
      const result = await db
        .select({
          aiAnalysis: analyses.aiAnalysis,
        })
        .from(analyses)
        .where(eq(analyses.id, analysisId))
        .limit(1);

      if (result.length === 0 || !result[0].aiAnalysis) {
        throw new Error('Analysis not found or has no AI analysis');
      }

      // Extract key content for embedding
      const keyContent = textProcessor.extractKeyContent(result[0].aiAnalysis);
      
      // Generate embedding
      const embedding = await embeddingService.generateEmbedding(keyContent);
      
      // Save embedding
      await this.updateAnalysisWithEmbedding(analysisId, embedding);
      
      console.log('💾 Embedding generated and saved for analysis:', analysisId);
    } catch (error) {
      console.error('💾 Failed to generate embedding for analysis:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up old analyses (older than specified days)
   */
  async cleanupOldAnalyses(olderThanDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await db
        .delete(analyses)
        .where(
          and(
            eq(analyses.status, 'failed'),
            // Add date comparison here when the library supports it
          )
        );

      console.log(`💾 Cleaned up old analyses`);
      return 0; // Return count when deletion result provides it
    } catch (error) {
      console.error('💾 Failed to cleanup old analyses:', error);
      throw new Error(`Failed to cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const aiAnalysisDb = new AIAnalysisDatabase();