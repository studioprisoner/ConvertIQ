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

  keywordSearch(
    query: string,
    userId: string,
    limit: number
  ): Promise<SimilarReport[]>;

  getStatsWithoutEmbeddings(
    userId: string
  ): Promise<{
    totalReports: number;
    averageScore: number;
    topPatterns: string[];
    commonIssues: string[];
  }>;
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
        overallScore: this.extractOverallScore(result.aiAnalysis),
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
      const whereConditions = [
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
   * Extract overall score from AI analysis
   */
  private extractOverallScore(aiAnalysis: string | null): number | undefined {
    if (!aiAnalysis) return undefined;
    
    try {
      const analysis = JSON.parse(aiAnalysis);
      return analysis.overallScore || undefined;
    } catch {
      return undefined;
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

  /**
   * Keyword-based search fallback when embeddings are unavailable
   */
  async keywordSearch(
    query: string,
    userId: string,
    limit: number = 10
  ): Promise<SimilarReport[]> {
    try {
      console.log('🔤 Starting keyword search for:', query);
      
      // Extract keywords from the query
      const keywords = this.extractKeywords(query);
      
      // Search in AI analysis JSON for keyword matches
      const results = await db
        .select({
          analysisId: analyses.id,
          websiteUrl: websites.url,
          aiAnalysis: analyses.aiAnalysis,
          createdAt: analyses.createdAt,
        })
        .from(analyses)
        .innerJoin(websites, eq(analyses.websiteId, websites.id))
        .where(
          and(
            eq(websites.userId, userId),
            eq(analyses.status, 'completed'),
            // Use ILIKE for case-insensitive keyword matching
            sql`${analyses.aiAnalysis} ILIKE ANY(${keywords.map(k => `%${k}%`)})`
          )
        )
        .orderBy(desc(analyses.createdAt))
        .limit(limit);

      // Calculate simple relevance score based on keyword matches
      const scoredResults = results.map(result => {
        const analysisText = result.aiAnalysis?.toLowerCase() || '';
        const matchCount = keywords.reduce((count, keyword) => {
          const keywordMatches = (analysisText.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
          return count + keywordMatches;
        }, 0);
        
        // Simple relevance score based on match frequency
        const relevanceScore = Math.min(matchCount / keywords.length, 1);
        
        return {
          analysisId: result.analysisId,
          websiteUrl: result.websiteUrl,
          title: this.extractTitle(result.aiAnalysis),
          similarity: relevanceScore,
          relevantSnippets: this.extractKeywordSnippets(result.aiAnalysis, keywords),
          createdAt: result.createdAt?.toISOString() || new Date().toISOString(),
        };
      });

      // Sort by relevance score
      scoredResults.sort((a, b) => b.similarity - a.similarity);
      
      console.log(`🔤 Keyword search found ${scoredResults.length} results`);
      return scoredResults;
    } catch (error) {
      console.error('Keyword search failed:', error);
      throw new Error(`Failed to perform keyword search: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract keywords from search query
   */
  private extractKeywords(query: string): string[] {
    // Remove common stop words and extract meaningful terms
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must']);
    
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 5); // Limit to 5 keywords
  }

  /**
   * Extract relevant snippets based on keyword matches
   */
  private extractKeywordSnippets(aiAnalysis: string | null, keywords: string[]): string[] {
    if (!aiAnalysis) return [];
    
    try {
      const analysis = JSON.parse(aiAnalysis);
      const snippets: string[] = [];
      
      // Check summary for keyword matches
      if (analysis.summary) {
        const summaryLower = analysis.summary.toLowerCase();
        const hasKeywordMatch = keywords.some(keyword => 
          summaryLower.includes(keyword.toLowerCase())
        );
        
        if (hasKeywordMatch) {
          snippets.push(analysis.summary.substring(0, 150) + '...');
        }
      }
      
      // Check recommendations for keyword matches
      if (analysis.recommendations && Array.isArray(analysis.recommendations)) {
        analysis.recommendations
          .filter((rec: any) => {
            const recText = (rec.title + ' ' + rec.description).toLowerCase();
            return keywords.some(keyword => recText.includes(keyword.toLowerCase()));
          })
          .slice(0, 2)
          .forEach((rec: any) => {
            snippets.push(rec.title || rec.description?.substring(0, 100) + '...');
          });
      }
      
      return snippets.slice(0, 3);
    } catch {
      // If parsing fails, do simple text search
      const analysisLower = aiAnalysis.toLowerCase();
      const matchingKeywords = keywords.filter(keyword => 
        analysisLower.includes(keyword.toLowerCase())
      );
      
      return matchingKeywords.length > 0 
        ? [`Contains: ${matchingKeywords.join(', ')}`]
        : [];
    }
  }

  /**
   * Get statistics without requiring embeddings
   */
  async getStatsWithoutEmbeddings(userId: string): Promise<{
    totalReports: number;
    averageScore: number;
    topPatterns: string[];
    commonIssues: string[];
  }> {
    try {
      console.log('📊 Getting stats without embeddings for user:', userId);
      
      // Get all completed analyses for the user
      const results = await db
        .select({
          aiAnalysis: analyses.aiAnalysis,
        })
        .from(analyses)
        .innerJoin(websites, eq(analyses.websiteId, websites.id))
        .where(
          and(
            eq(websites.userId, userId),
            eq(analyses.status, 'completed')
          )
        );

      const patterns = new Set<string>();
      const issues = new Set<string>();
      const scores: number[] = [];

      results.forEach(result => {
        if (!result.aiAnalysis) return;

        try {
          const analysis = JSON.parse(result.aiAnalysis);
          
          // Extract score
          if (analysis.overallScore && typeof analysis.overallScore === 'number') {
            scores.push(analysis.overallScore);
          }

          // Extract patterns and issues from the analysis text
          const analysisText = JSON.stringify(analysis).toLowerCase();
          
          // Common patterns
          if (analysisText.includes('mobile') && analysisText.includes('responsive')) {
            patterns.add('Mobile responsiveness optimization');
          }
          if (analysisText.includes('speed') || analysisText.includes('performance')) {
            patterns.add('Page speed optimization');
          }
          if (analysisText.includes('seo') && (analysisText.includes('meta') || analysisText.includes('search'))) {
            patterns.add('SEO optimization');
          }
          if (analysisText.includes('conversion') && (analysisText.includes('cta') || analysisText.includes('call-to-action'))) {
            patterns.add('Call-to-action optimization');
          }
          if (analysisText.includes('accessibility') || analysisText.includes('a11y')) {
            patterns.add('Accessibility improvements');
          }
          if (analysisText.includes('load') && analysisText.includes('time')) {
            patterns.add('Page load optimization');
          }
          if (analysisText.includes('user') && analysisText.includes('experience')) {
            patterns.add('User experience enhancement');
          }
          
          // Common issues
          if (analysisText.includes('missing') || analysisText.includes('lacking')) {
            issues.add('Missing essential elements');
          }
          if (analysisText.includes('slow') || analysisText.includes('loading')) {
            issues.add('Performance issues');
          }
          if (analysisText.includes('unclear') || analysisText.includes('confusing')) {
            issues.add('Unclear messaging');
          }
          if (analysisText.includes('broken') || analysisText.includes('error')) {
            issues.add('Technical issues');
          }
          if (analysisText.includes('poor') && analysisText.includes('contrast')) {
            issues.add('Visual accessibility issues');
          }
          if (analysisText.includes('navigation') && analysisText.includes('difficult')) {
            issues.add('Navigation problems');
          }
          
        } catch (parseError) {
          console.warn('Failed to parse analysis JSON:', parseError);
        }
      });

      const averageScore = scores.length > 0 
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
        : 0;

      const stats = {
        totalReports: results.length,
        averageScore: Math.round(averageScore * 10) / 10,
        topPatterns: Array.from(patterns).slice(0, 5),
        commonIssues: Array.from(issues).slice(0, 5),
      };

      console.log(`📊 Generated stats without embeddings: ${stats.totalReports} reports, avg score ${stats.averageScore}`);
      
      return stats;
    } catch (error) {
      console.error('Failed to get stats without embeddings:', error);
      throw new Error(`Failed to get statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Singleton instance
export const vectorSearchService = new PostgresVectorSearchService();