import { db } from '@/db/connection';
import { analyses, websites } from '@/db/schema';
import { eq, and, desc, gt } from 'drizzle-orm';
import { cosineDistance, sql } from 'drizzle-orm';
import { embeddingService, textProcessor } from '@/lib/embeddings';

export interface SimilarReport {
  analysisId: string;
  websiteUrl: string;
  title: string;
  similarity: number;
  relevantSnippets: string[];
  createdAt: string;
}

export interface SimilarRecommendation {
  analysisId: string;
  similarity: number;
  commonTopics: string[];
  websiteUrl: string;
}

export interface SearchFilters {
  dateRange?: 'last_week' | 'last_month' | 'last_3_months' | 'last_year';
  websites?: string[];
  minScore?: number;
}

export interface SearchResult {
  analysisId: string;
  websiteUrl: string;
  title: string;
  similarity: number;
  relevantSnippets: string[];
  createdAt: string;
  overallScore?: number;
}

export interface VectorSearchService {
  findSimilarReports(
    query: string,
    userId: string,
    limit: number,
    threshold: number
  ): Promise<SimilarReport[]>;

  findSimilarRecommendations(
    reportId: string,
    limit: number
  ): Promise<SimilarRecommendation[]>;

  searchByEmbedding(
    embedding: number[],
    filters: SearchFilters
  ): Promise<SearchResult[]>;
}

export class PostgresVectorSearchService implements VectorSearchService {
  /**
   * Find similar reports based on text query
   */
  async findSimilarReports(
    query: string,
    userId: string,
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<SimilarReport[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      
      // Search for similar reports using cosine similarity
      const results = await db
        .select({
          analysisId: analyses.id,
          websiteUrl: websites.url,
          websiteTitle: websites.url, // Use URL as title for now
          aiAnalysis: analyses.aiAnalysis,
          createdAt: analyses.createdAt,
          embedding: analyses.embedding,
          similarity: sql<number>`1 - (${analyses.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
        })
        .from(analyses)
        .innerJoin(websites, eq(analyses.websiteId, websites.id))
        .where(
          and(
            eq(websites.userId, userId),
            eq(analyses.status, 'completed'),
            // Filter by similarity threshold
            gt(
              sql<number>`1 - (${analyses.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
              threshold
            )
          )
        )
        .orderBy(
          desc(sql<number>`1 - (${analyses.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`)
        )
        .limit(limit);

      return results.map(result => ({
        analysisId: result.analysisId,
        websiteUrl: result.websiteUrl,
        title: this.extractTitle(result.aiAnalysis),
        similarity: Math.round(result.similarity * 100) / 100,
        relevantSnippets: this.extractRelevantSnippets(result.aiAnalysis, query),
        createdAt: result.createdAt?.toISOString() || new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Vector search failed:', error);
      throw new Error(`Failed to find similar reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find similar reports to a given report
   */
  async findSimilarRecommendations(
    reportId: string,
    limit: number = 5
  ): Promise<SimilarRecommendation[]> {
    try {
      // Get the embedding of the source report
      const sourceReport = await db
        .select({
          embedding: analyses.embedding,
          websiteId: analyses.websiteId,
        })
        .from(analyses)
        .where(eq(analyses.id, reportId))
        .limit(1);

      if (sourceReport.length === 0 || !sourceReport[0].embedding) {
        throw new Error('Source report not found or has no embedding');
      }

      const sourceEmbedding = sourceReport[0].embedding;

      // Find similar reports (excluding the source report)
      const results = await db
        .select({
          analysisId: analyses.id,
          websiteUrl: websites.url,
          aiAnalysis: analyses.aiAnalysis,
          similarity: sql<number>`1 - (${analyses.embedding} <=> ${sourceEmbedding}::vector)`,
        })
        .from(analyses)
        .innerJoin(websites, eq(analyses.websiteId, websites.id))
        .where(
          and(
            eq(analyses.status, 'completed'),
            // Exclude the source report
            sql`${analyses.id} != ${reportId}`,
            // Minimum similarity threshold
            gt(
              sql<number>`1 - (${analyses.embedding} <=> ${sourceEmbedding}::vector)`,
              0.6
            )
          )
        )
        .orderBy(
          desc(sql<number>`1 - (${analyses.embedding} <=> ${sourceEmbedding}::vector)`)
        )
        .limit(limit);

      return results.map(result => ({
        analysisId: result.analysisId,
        similarity: Math.round(result.similarity * 100) / 100,
        commonTopics: this.extractCommonTopics(result.aiAnalysis),
        websiteUrl: result.websiteUrl,
      }));
    } catch (error) {
      console.error('Similar recommendations search failed:', error);
      throw new Error(`Failed to find similar recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search by pre-computed embedding with filters
   */
  async searchByEmbedding(
    embedding: number[],
    filters: SearchFilters
  ): Promise<SearchResult[]> {
    try {
      let whereConditions = [
        eq(analyses.status, 'completed'),
      ];

      // Apply date range filter
      if (filters.dateRange) {
        const dateThreshold = this.getDateThreshold(filters.dateRange);
        whereConditions.push(
          gt(analyses.createdAt, dateThreshold)
        );
      }

      // Apply website filter
      if (filters.websites && filters.websites.length > 0) {
        whereConditions.push(
          sql`${analyses.websiteId} = ANY(${filters.websites})`
        );
      }

      // Apply minimum similarity score
      const minSimilarity = filters.minScore || 0.6;
      whereConditions.push(
        gt(
          sql<number>`1 - (${analyses.embedding} <=> ${JSON.stringify(embedding)}::vector)`,
          minSimilarity
        )
      );

      const results = await db
        .select({
          analysisId: analyses.id,
          websiteUrl: websites.url,
          aiAnalysis: analyses.aiAnalysis,
          createdAt: analyses.createdAt,
          similarity: sql<number>`1 - (${analyses.embedding} <=> ${JSON.stringify(embedding)}::vector)`,
        })
        .from(analyses)
        .innerJoin(websites, eq(analyses.websiteId, websites.id))
        .where(and(...whereConditions))
        .orderBy(
          desc(sql<number>`1 - (${analyses.embedding} <=> ${JSON.stringify(embedding)}::vector)`)
        )
        .limit(50);

      return results.map(result => ({
        analysisId: result.analysisId,
        websiteUrl: result.websiteUrl,
        title: this.extractTitle(result.aiAnalysis),
        similarity: Math.round(result.similarity * 100) / 100,
        relevantSnippets: this.extractRelevantSnippets(result.aiAnalysis, ''),
        createdAt: result.createdAt?.toISOString() || new Date().toISOString(),
        overallScore: this.extractOverallScore(result.aiAnalysis),
      }));
    } catch (error) {
      console.error('Embedding search failed:', error);
      throw new Error(`Failed to search by embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract title from AI analysis JSON
   */
  private extractTitle(aiAnalysis: string | null): string {
    if (!aiAnalysis) return 'Analysis Report';
    
    try {
      const analysis = JSON.parse(aiAnalysis);
      return analysis.summary?.split('.')[0] || 'Analysis Report';
    } catch {
      return 'Analysis Report';
    }
  }

  /**
   * Extract relevant snippets from AI analysis
   */
  private extractRelevantSnippets(aiAnalysis: string | null, query: string): string[] {
    if (!aiAnalysis) return [];
    
    try {
      const analysis = JSON.parse(aiAnalysis);
      const snippets: string[] = [];
      
      // Add summary if available
      if (analysis.summary) {
        snippets.push(analysis.summary.substring(0, 150) + '...');
      }
      
      // Add high-priority recommendations
      if (analysis.recommendations) {
        const highPriorityRecs = analysis.recommendations
          .filter((rec: any) => rec.priority === 'high')
          .slice(0, 2)
          .map((rec: any) => rec.title || rec.description?.substring(0, 100) + '...');
        
        snippets.push(...highPriorityRecs);
      }
      
      return snippets.filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Extract common topics from AI analysis
   */
  private extractCommonTopics(aiAnalysis: string | null): string[] {
    if (!aiAnalysis) return [];
    
    try {
      const analysis = JSON.parse(aiAnalysis);
      const topics: string[] = [];
      
      // Extract from recommendations
      if (analysis.recommendations) {
        const categories = analysis.recommendations
          .map((rec: any) => rec.category || rec.type)
          .filter(Boolean)
          .slice(0, 3);
        
        topics.push(...categories);
      }
      
      // Extract from key insights
      if (analysis.keyInsights) {
        topics.push(...analysis.keyInsights.slice(0, 2));
      }
      
      return [...new Set(topics)]; // Remove duplicates
    } catch {
      return [];
    }
  }

  /**
   * Extract overall score from AI analysis
   */
  private extractOverallScore(aiAnalysis: string | null): number | undefined {
    if (!aiAnalysis) return undefined;
    
    try {
      const analysis = JSON.parse(aiAnalysis);
      return analysis.overallScore;
    } catch {
      return undefined;
    }
  }

  /**
   * Get date threshold based on range
   */
  private getDateThreshold(range: SearchFilters['dateRange']): Date {
    const now = new Date();
    
    switch (range) {
      case 'last_week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'last_month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'last_3_months':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'last_year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0); // Beginning of time
    }
  }
}

// Singleton instance
export const vectorSearchService = new PostgresVectorSearchService();