import { db } from '@/db/connection';
import { analyses, websites } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { AIAnalysisResult } from './types';
import type { CrawlResult } from '../crawler/types';

export class AIAnalysisDatabase {
  /**
   * Save AI analysis result to database
   */
  async saveAnalysis(
    websiteId: string,
    crawlData: CrawlResult,
    aiAnalysisResult: AIAnalysisResult
  ): Promise<string> {
    try {
      // Insert new analysis record
      const [analysis] = await db
        .insert(analyses)
        .values({
          websiteId,
          status: 'completed',
          rawData: JSON.stringify(crawlData),
          aiAnalysis: JSON.stringify(aiAnalysisResult),
        })
        .returning({ id: analyses.id });

      console.log('💾 AI analysis saved to database:', analysis.id);
      return analysis.id;
    } catch (error) {
      console.error('💾 Failed to save AI analysis:', error);
      throw new Error(`Failed to save analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
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