import { db } from '@/db/connection';
import { analyses, websites } from '@/db/schema';
import { eq, and, desc, gt } from 'drizzle-orm';
import { cosineDistance, sql } from 'drizzle-orm';
import { embeddingService, textProcessor } from '@/lib/embeddings';
import type { ExtractionResults } from '@/db/schema/analyses';

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

export interface StructuredSearchFilters extends SearchFilters {
  businessType?: string[];
  ctaTypes?: string[];
  socialProofTypes?: string[];
  psychologyTriggers?: string[];
  extractionScore?: { min?: number; max?: number; };
}

export interface StructuredSearchResult extends SearchResult {
  extractionResults?: ExtractionResults;
  extractionScore?: number;
  businessInfo?: {
    name?: string;
    industry?: string;
    description?: string;
  };
  ctaCount?: number;
  socialProofElements?: number;
  psychologyTriggersFound?: string[];
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
    userId: string,
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

  // New methods for Firecrawl v2 structured data
  searchByStructuredData(
    filters: StructuredSearchFilters,
    userId: string,
    limit?: number
  ): Promise<StructuredSearchResult[]>;

  findSimilarBusinessTypes(
    businessType: string,
    userId: string,
    limit?: number
  ): Promise<StructuredSearchResult[]>;

  findByCTAPatterns(
    ctaPattern: string,
    userId: string,
    limit?: number
  ): Promise<StructuredSearchResult[]>;

  getStructuredStats(
    userId: string
  ): Promise<{
    totalAnalyses: number;
    businessTypes: { [key: string]: number };
    ctaPatterns: { [key: string]: number };
    psychologyTriggers: { [key: string]: number };
    averageExtractionScore: number;
    topPerformingIndustries: Array<{ industry: string; avgScore: number; count: number }>;
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
    userId: string,
    limit: number = 5
  ): Promise<SimilarRecommendation[]> {
    try {
      // Get the embedding of the source report, scoped to the requesting user.
      // The join to websites + userId filter prevents reading another user's report.
      const sourceReport = await db
        .select({
          embedding: analyses.embedding,
          websiteId: analyses.websiteId,
        })
        .from(analyses)
        .innerJoin(websites, eq(analyses.websiteId, websites.id))
        .where(and(eq(analyses.id, reportId), eq(websites.userId, userId)))
        .limit(1);

      if (sourceReport.length === 0 || !sourceReport[0].embedding) {
        throw new Error('Source report not found or has no embedding');
      }

      const sourceEmbedding = sourceReport[0].embedding;

      // Find similar reports (excluding the source report), restricted to the
      // requesting user's own analyses so results never leak across tenants.
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
            eq(websites.userId, userId),
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
   * Search by structured extraction data with filters
   */
  async searchByStructuredData(
    filters: StructuredSearchFilters,
    userId: string,
    limit: number = 20
  ): Promise<StructuredSearchResult[]> {
    try {
      const whereConditions = [
        eq(analyses.status, 'completed'),
        eq(websites.userId, userId),
        sql`${analyses.extractionResults} IS NOT NULL`
      ];

      // Apply date range filter
      if (filters.dateRange) {
        const dateThreshold = this.getDateThreshold(filters.dateRange);
        whereConditions.push(gt(analyses.createdAt, dateThreshold));
      }

      // Apply extraction score filter
      if (filters.extractionScore) {
        if (filters.extractionScore.min !== undefined) {
          whereConditions.push(
            sql`(${analyses.extractionResults}->>'extractionScore')::int >= ${filters.extractionScore.min}`
          );
        }
        if (filters.extractionScore.max !== undefined) {
          whereConditions.push(
            sql`(${analyses.extractionResults}->>'extractionScore')::int <= ${filters.extractionScore.max}`
          );
        }
      }

      // Apply business type filter
      if (filters.businessType && filters.businessType.length > 0) {
        whereConditions.push(
          sql`${analyses.extractionResults}->>'businessInfo'->>'industry' = ANY(${filters.businessType})`
        );
      }

      // Apply psychology triggers filter
      if (filters.psychologyTriggers && filters.psychologyTriggers.length > 0) {
        const triggerConditions = filters.psychologyTriggers.map(trigger =>
          sql`${analyses.extractionResults}->>'psychologyTriggers'->>${trigger} IS NOT NULL`
        );
        whereConditions.push(sql`(${sql.join(triggerConditions, sql` OR `)})`);
      }

      const results = await db
        .select({
          analysisId: analyses.id,
          websiteUrl: websites.url,
          aiAnalysis: analyses.aiAnalysis,
          extractionResults: analyses.extractionResults,
          createdAt: analyses.createdAt,
        })
        .from(analyses)
        .innerJoin(websites, eq(analyses.websiteId, websites.id))
        .where(and(...whereConditions))
        .orderBy(desc(analyses.createdAt))
        .limit(limit);

      return results.map(result => this.mapToStructuredSearchResult(result));
    } catch (error) {
      console.error('Structured data search failed:', error);
      throw new Error(`Failed to search structured data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find analyses with similar business types
   */
  async findSimilarBusinessTypes(
    businessType: string,
    userId: string,
    limit: number = 10
  ): Promise<StructuredSearchResult[]> {
    try {
      const results = await db
        .select({
          analysisId: analyses.id,
          websiteUrl: websites.url,
          aiAnalysis: analyses.aiAnalysis,
          extractionResults: analyses.extractionResults,
          createdAt: analyses.createdAt,
        })
        .from(analyses)
        .innerJoin(websites, eq(analyses.websiteId, websites.id))
        .where(
          and(
            eq(analyses.status, 'completed'),
            eq(websites.userId, userId),
            sql`${analyses.extractionResults}->>'businessInfo'->>'industry' ILIKE ${`%${businessType}%`}`,
            sql`${analyses.extractionResults} IS NOT NULL`
          )
        )
        .orderBy(desc(analyses.createdAt))
        .limit(limit);

      return results.map(result => this.mapToStructuredSearchResult(result));
    } catch (error) {
      console.error('Similar business types search failed:', error);
      throw new Error(`Failed to find similar business types: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find analyses by CTA patterns
   */
  async findByCTAPatterns(
    ctaPattern: string,
    userId: string,
    limit: number = 10
  ): Promise<StructuredSearchResult[]> {
    try {
      const results = await db
        .select({
          analysisId: analyses.id,
          websiteUrl: websites.url,
          aiAnalysis: analyses.aiAnalysis,
          extractionResults: analyses.extractionResults,
          createdAt: analyses.createdAt,
        })
        .from(analyses)
        .innerJoin(websites, eq(analyses.websiteId, websites.id))
        .where(
          and(
            eq(analyses.status, 'completed'),
            eq(websites.userId, userId),
            sql`${analyses.extractionResults}->>'callsToAction'::text ILIKE ${`%${ctaPattern}%`}`,
            sql`${analyses.extractionResults} IS NOT NULL`
          )
        )
        .orderBy(desc(analyses.createdAt))
        .limit(limit);

      return results.map(result => this.mapToStructuredSearchResult(result));
    } catch (error) {
      console.error('CTA patterns search failed:', error);
      throw new Error(`Failed to find CTA patterns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get comprehensive structured data statistics
   */
  async getStructuredStats(userId: string): Promise<{
    totalAnalyses: number;
    businessTypes: { [key: string]: number };
    ctaPatterns: { [key: string]: number };
    psychologyTriggers: { [key: string]: number };
    averageExtractionScore: number;
    topPerformingIndustries: Array<{ industry: string; avgScore: number; count: number }>;
  }> {
    try {
      const results = await db
        .select({
          aiAnalysis: analyses.aiAnalysis,
          extractionResults: analyses.extractionResults,
        })
        .from(analyses)
        .innerJoin(websites, eq(analyses.websiteId, websites.id))
        .where(
          and(
            eq(websites.userId, userId),
            eq(analyses.status, 'completed'),
            sql`${analyses.extractionResults} IS NOT NULL`
          )
        );

      const stats = {
        totalAnalyses: results.length,
        businessTypes: {} as { [key: string]: number },
        ctaPatterns: {} as { [key: string]: number },
        psychologyTriggers: {} as { [key: string]: number },
        averageExtractionScore: 0,
        topPerformingIndustries: [] as Array<{ industry: string; avgScore: number; count: number }>
      };

      const extractionScores: number[] = [];
      const industryScores: { [key: string]: { scores: number[]; count: number } } = {};

      results.forEach(result => {
        if (!result.extractionResults) return;

        try {
          const extraction = result.extractionResults as ExtractionResults;
          
          // Count business types/industries
          if (extraction.businessInfo?.industry) {
            const industry = extraction.businessInfo.industry;
            stats.businessTypes[industry] = (stats.businessTypes[industry] || 0) + 1;
            
            // Track industry scores
            if (!industryScores[industry]) {
              industryScores[industry] = { scores: [], count: 0 };
            }
            industryScores[industry].count++;
            
            // Extract overall score from AI analysis
            if (result.aiAnalysis) {
              try {
                const analysis = JSON.parse(result.aiAnalysis);
                if (analysis.overallScore) {
                  industryScores[industry].scores.push(analysis.overallScore);
                }
              } catch (e) {
                // Ignore parse errors for individual analyses
              }
            }
          }

          // Count CTA patterns
          if (extraction.callsToAction) {
            extraction.callsToAction.forEach(cta => {
              if (cta.prominence) {
                const pattern = `${cta.prominence} CTA`;
                stats.ctaPatterns[pattern] = (stats.ctaPatterns[pattern] || 0) + 1;
              }
            });
          }

          // Count psychology triggers
          if (extraction.psychologyTriggers) {
            Object.entries(extraction.psychologyTriggers).forEach(([trigger, values]) => {
              if (values && Array.isArray(values) && values.length > 0) {
                stats.psychologyTriggers[trigger] = (stats.psychologyTriggers[trigger] || 0) + values.length;
              }
            });
          }

          // Track extraction scores (if available)
          const extractionScore = this.calculateExtractionScore(extraction);
          if (extractionScore > 0) {
            extractionScores.push(extractionScore);
          }

        } catch (parseError) {
          console.warn('Failed to parse extraction results:', parseError);
        }
      });

      // Calculate average extraction score
      stats.averageExtractionScore = extractionScores.length > 0
        ? Math.round((extractionScores.reduce((sum, score) => sum + score, 0) / extractionScores.length) * 10) / 10
        : 0;

      // Calculate top performing industries
      stats.topPerformingIndustries = Object.entries(industryScores)
        .map(([industry, data]) => ({
          industry,
          avgScore: data.scores.length > 0 
            ? Math.round((data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length) * 10) / 10
            : 0,
          count: data.count
        }))
        .filter(item => item.avgScore > 0)
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 5);

      return stats;
    } catch (error) {
      console.error('Failed to get structured stats:', error);
      throw new Error(`Failed to get structured statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map database result to StructuredSearchResult
   */
  private mapToStructuredSearchResult(result: any): StructuredSearchResult {
    const baseResult: SearchResult = {
      analysisId: result.analysisId,
      websiteUrl: result.websiteUrl,
      title: this.extractTitle(result.aiAnalysis),
      similarity: 1, // For structured search, we don't have semantic similarity
      relevantSnippets: this.extractRelevantSnippets(result.aiAnalysis, ''),
      createdAt: result.createdAt?.toISOString() || new Date().toISOString(),
      overallScore: this.extractOverallScore(result.aiAnalysis),
    };

    const structuredResult: StructuredSearchResult = {
      ...baseResult,
      extractionResults: result.extractionResults as ExtractionResults,
    };

    // Add structured data fields
    if (result.extractionResults) {
      try {
        const extraction = result.extractionResults as ExtractionResults;
        
        structuredResult.extractionScore = this.calculateExtractionScore(extraction);
        
        if (extraction.businessInfo) {
          structuredResult.businessInfo = {
            name: extraction.businessInfo.name,
            industry: extraction.businessInfo.industry,
            description: extraction.businessInfo.description,
          };
        }

        structuredResult.ctaCount = extraction.callsToAction?.length || 0;
        
        // Count social proof elements
        if (extraction.socialProof) {
          structuredResult.socialProofElements = [
            ...(extraction.socialProof.testimonials || []),
            ...(extraction.socialProof.reviews || []),
            ...(extraction.socialProof.certifications || []),
            ...(extraction.socialProof.statistics || [])
          ].length;
        }

        // Extract active psychology triggers
        if (extraction.psychologyTriggers) {
          structuredResult.psychologyTriggersFound = Object.entries(extraction.psychologyTriggers)
            .filter(([_, values]) => values && Array.isArray(values) && values.length > 0)
            .map(([trigger]) => trigger);
        }

      } catch (parseError) {
        console.warn('Failed to parse extraction results for mapping:', parseError);
      }
    }

    return structuredResult;
  }

  /**
   * Calculate extraction completeness score
   */
  private calculateExtractionScore(extractionResults: ExtractionResults): number {
    let score = 0;
    let maxScore = 100;

    // Business info scoring (20 points)
    if (extractionResults.businessInfo) {
      const businessFields = ['name', 'description', 'industry', 'contactEmail'];
      const completedFields = businessFields.filter(field => 
        extractionResults.businessInfo?.[field as keyof typeof extractionResults.businessInfo]
      ).length;
      score += (completedFields / businessFields.length) * 20;
    }

    // CTAs scoring (15 points)
    if (extractionResults.callsToAction?.length) {
      score += Math.min(extractionResults.callsToAction.length * 3, 15);
    }

    // Social proof scoring (15 points)
    if (extractionResults.socialProof) {
      const proofTypes = ['testimonials', 'reviews', 'certifications', 'statistics'];
      const foundTypes = proofTypes.filter(type => 
        extractionResults.socialProof?.[type as keyof typeof extractionResults.socialProof]?.length
      ).length;
      score += (foundTypes / proofTypes.length) * 15;
    }

    // Psychology triggers scoring (15 points)
    if (extractionResults.psychologyTriggers) {
      const triggerTypes = ['scarcity', 'urgency', 'authority', 'reciprocity'];
      const foundTriggers = triggerTypes.filter(type => 
        extractionResults.psychologyTriggers?.[type as keyof typeof extractionResults.psychologyTriggers]?.length
      ).length;
      score += (foundTriggers / triggerTypes.length) * 15;
    }

    // Products scoring (10 points)
    if (extractionResults.products?.length) {
      score += Math.min(extractionResults.products.length * 2, 10);
    }

    // Technical SEO scoring (15 points)
    if (extractionResults.technicalSeo) {
      const seoFields = ['pageTitle', 'metaDescription', 'headings', 'keywords'];
      const completedSeoFields = seoFields.filter(field =>
        extractionResults.technicalSeo?.[field as keyof typeof extractionResults.technicalSeo]
      ).length;
      score += (completedSeoFields / seoFields.length) * 15;
    }

    // UX scoring (10 points)
    if (extractionResults.userExperience) {
      const uxFields = ['navigationClarity', 'contentStructure', 'mobileOptimization', 'loadingSpeed'];
      const completedUxFields = uxFields.filter(field => 
        extractionResults.userExperience?.[field as keyof typeof extractionResults.userExperience] != null
      ).length;
      score += (completedUxFields / uxFields.length) * 10;
    }

    return Math.round(score);
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