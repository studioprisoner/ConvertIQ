import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../server';
import { vectorSearchService } from '@/lib/search/vector-search';

export const searchRouter = createTRPCRouter({
  // Semantic search for reports
  searchReports: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      userId: z.string().uuid(),
      limit: z.number().min(1).max(50).default(10),
      filters: z.object({
        dateRange: z.enum(['last_week', 'last_month', 'last_3_months', 'last_year']).optional(),
        websites: z.array(z.string().uuid()).optional(),
        minScore: z.number().min(0).max(1).default(0.7),
      }).default({}),
    }))
    .mutation(async ({ input }) => {
      console.log('🔍 Semantic search starting for query:', input.query);
      
      try {
        const startTime = Date.now();
        
        const results = await vectorSearchService.findSimilarReports(
          input.query,
          input.userId,
          input.limit,
          input.filters.minScore
        );
        
        const searchTime = Date.now() - startTime;
        
        console.log(`🔍 Semantic search completed: ${results.length} results in ${searchTime}ms`);
        
        return {
          results,
          totalCount: results.length,
          searchTime,
        };
      } catch (error) {
        console.error('🔍 Semantic search failed:', error);
        throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Find similar reports to a given report
  findSimilarReports: publicProcedure
    .input(z.object({
      reportId: z.string().uuid(),
      limit: z.number().min(1).max(10).default(5),
    }))
    .query(async ({ input }) => {
      console.log('🔍 Finding similar reports for:', input.reportId);
      
      try {
        const similarReports = await vectorSearchService.findSimilarRecommendations(
          input.reportId,
          input.limit
        );
        
        console.log(`🔍 Found ${similarReports.length} similar reports`);
        
        return {
          similarReports,
        };
      } catch (error) {
        console.error('🔍 Similar reports search failed:', error);
        throw new Error(`Failed to find similar reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Advanced search with custom embedding
  advancedSearch: publicProcedure
    .input(z.object({
      embedding: z.array(z.number()),
      filters: z.object({
        dateRange: z.enum(['last_week', 'last_month', 'last_3_months', 'last_year']).optional(),
        websites: z.array(z.string().uuid()).optional(),
        minScore: z.number().min(0).max(1).default(0.6),
      }).default({}),
    }))
    .mutation(async ({ input }) => {
      console.log('🔍 Advanced search starting with custom embedding');
      
      try {
        const startTime = Date.now();
        
        const results = await vectorSearchService.searchByEmbedding(
          input.embedding,
          input.filters
        );
        
        const searchTime = Date.now() - startTime;
        
        console.log(`🔍 Advanced search completed: ${results.length} results in ${searchTime}ms`);
        
        return {
          results,
          totalCount: results.length,
          searchTime,
        };
      } catch (error) {
        console.error('🔍 Advanced search failed:', error);
        throw new Error(`Advanced search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Get recommendation clusters (grouped similar recommendations)
  getRecommendationClusters: publicProcedure
    .input(z.object({
      userId: z.string().uuid(),
      minClusterSize: z.number().min(2).default(3),
    }))
    .query(async ({ input }) => {
      console.log('🎯 Getting recommendation clusters for user:', input.userId);
      
      try {
        // This is a simplified version - in production, you'd want more sophisticated clustering
        // For now, we'll group by common topics from the search results
        
        // Get all user's reports first
        const allReports = await vectorSearchService.findSimilarReports(
          'optimization recommendations performance', // Generic query to get all reports
          input.userId,
          100,
          0.1 // Very low threshold to get all reports
        );
        
        // Group by common topics (simplified clustering)
        const clusters: { [key: string]: any[] } = {};
        
        allReports.forEach(report => {
          // Extract key topics from snippets
          const topics = report.relevantSnippets
            .join(' ')
            .toLowerCase()
            .match(/\b(mobile|speed|seo|conversion|design|performance|accessibility|security)\b/g);
          
          if (topics) {
            topics.forEach(topic => {
              if (!clusters[topic]) {
                clusters[topic] = [];
              }
              clusters[topic].push(report);
            });
          }
        });
        
        // Filter clusters by minimum size and format response
        const formattedClusters = Object.entries(clusters)
          .filter(([_, reports]) => reports.length >= input.minClusterSize)
          .map(([topic, reports]) => ({
            topic: topic.charAt(0).toUpperCase() + topic.slice(1) + ' Optimization',
            count: reports.length,
            commonIssues: this.extractCommonIssues(reports),
            avgImpact: '15-20% conversion increase', // Placeholder
          }));
        
        console.log(`🎯 Found ${formattedClusters.length} recommendation clusters`);
        
        return {
          clusters: formattedClusters,
        };
      } catch (error) {
        console.error('🎯 Recommendation clustering failed:', error);
        throw new Error(`Failed to get recommendation clusters: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Search with query expansion using embeddings
  expandedSearch: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      userId: z.string().uuid(),
      expansionTerms: z.array(z.string()).default([]),
      limit: z.number().min(1).max(50).default(10),
    }))
    .mutation(async ({ input }) => {
      console.log('🔍 Expanded search starting for:', input.query);
      
      try {
        // Combine original query with expansion terms
        const expandedQuery = [input.query, ...input.expansionTerms].join(' ');
        
        const results = await vectorSearchService.findSimilarReports(
          expandedQuery,
          input.userId,
          input.limit,
          0.6 // Lower threshold for expanded search
        );
        
        console.log(`🔍 Expanded search found ${results.length} results`);
        
        return {
          results,
          originalQuery: input.query,
          expandedQuery,
          totalCount: results.length,
        };
      } catch (error) {
        console.error('🔍 Expanded search failed:', error);
        throw new Error(`Expanded search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),
});

// Helper function to extract common issues from reports
function extractCommonIssues(reports: any[]): string[] {
  const issues = new Set<string>();
  
  reports.forEach(report => {
    report.relevantSnippets.forEach((snippet: string) => {
      // Extract common patterns
      if (snippet.toLowerCase().includes('mobile')) {
        issues.add('mobile responsiveness');
      }
      if (snippet.toLowerCase().includes('speed') || snippet.toLowerCase().includes('performance')) {
        issues.add('page load speed');
      }
      if (snippet.toLowerCase().includes('seo')) {
        issues.add('SEO optimization');
      }
      if (snippet.toLowerCase().includes('conversion')) {
        issues.add('conversion optimization');
      }
    });
  });
  
  return Array.from(issues).slice(0, 5);
}