import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../server';
import { websites } from '@/db/schema/websites';
import { analyses } from '@/db/schema/analyses';
import { eq, and, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { Firecrawl } from '@mendable/firecrawl-js';
import { extractionConfigurations } from '@/lib/firecrawl/extraction-schemas';

// Input schemas for v2 capabilities
const extractOptionsSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(10),
  prompt: z.string().min(10).max(1000),
  schema: z.record(z.any()),
});

const batchScrapeOptionsSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(25),
  formats: z.array(z.enum(['markdown', 'html', 'text'])).default(['markdown', 'html']),
  pageOptions: z.object({
    onlyMainContent: z.boolean().default(true),
    includeLinks: z.boolean().default(true),
    includeImages: z.boolean().default(true),
    timeout: z.number().default(30000),
  }).optional(),
});

const crawlOptionsSchema = z.object({
  baseUrl: z.string().url(),
  maxDepth: z.number().min(1).max(5).default(2),
  maxLinks: z.number().min(1).max(100).default(50),
  onlyDomain: z.boolean().default(true),
  formats: z.array(z.enum(['markdown', 'html', 'text'])).default(['markdown']),
  pageOptions: z.object({
    onlyMainContent: z.boolean().default(true),
  }).optional(),
});

export const firecrawlV2Router = createTRPCRouter({
  /**
   * Extract structured data using Firecrawl v2 extract feature
   */
  extractStructuredData: protectedProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
      urls: z.array(z.string().url()).min(1).max(5),
      extractionType: z.enum(['conversionAudit', 'ecommerceAnalysis', 'technicalSeoAudit', 'leadGenAudit', 'comprehensive']).default('conversionAudit'),
      customPrompt: z.string().optional(),
      customSchema: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        // Verify website ownership
        const website = await ctx.db
          .select()
          .from(websites)
          .where(and(
            eq(websites.id, input.websiteId),
            eq(websites.userId, user.id)
          ))
          .limit(1);

        if (website.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Website not found or access denied'
          });
        }

        // Get API key
        const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
        if (!firecrawlApiKey) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Firecrawl API key not configured'
          });
        }

        // Initialize Firecrawl v2
        const firecrawl = new Firecrawl({ apiKey: firecrawlApiKey });

        // Get extraction configuration
        const config = extractionConfigurations[input.extractionType];
        
        const extractOptions = {
          urls: input.urls,
          prompt: input.customPrompt || config.prompt,
          schema: input.customSchema || config.schema,
        };

        // Perform extraction
        const extractResult = await firecrawl.extract(extractOptions);

        if (!extractResult.success) {
          throw new TRPCError({
            code: 'EXTERNAL_SERVICE_ERROR',
            message: `Firecrawl extraction failed: ${extractResult.error || 'Unknown error'}`
          });
        }

        // Save extraction results to database
        const [savedAnalysis] = await ctx.db
          .insert(analyses)
          .values({
            websiteId: input.websiteId,
            status: 'completed',
            extractionResults: extractResult.data,
            firecrawlVersion: 'v2',
            extractionPrompts: [extractOptions.prompt],
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        return {
          success: true,
          analysisId: savedAnalysis.id,
          data: extractResult.data,
          extractionType: input.extractionType,
          urlsProcessed: input.urls.length,
        };

      } catch (error) {
        console.error('Firecrawl v2 extraction failed:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }),

  /**
   * Batch scrape multiple URLs using Firecrawl v2
   */
  batchScrape: protectedProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
      options: batchScrapeOptionsSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        // Verify website ownership
        const website = await ctx.db
          .select()
          .from(websites)
          .where(and(
            eq(websites.id, input.websiteId),
            eq(websites.userId, user.id)
          ))
          .limit(1);

        if (website.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Website not found or access denied'
          });
        }

        // Get API key
        const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
        if (!firecrawlApiKey) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Firecrawl API key not configured'
          });
        }

        // Initialize Firecrawl v2
        const firecrawl = new Firecrawl({ apiKey: firecrawlApiKey });

        // Perform batch scrape
        const batchResult = await firecrawl.batchScrape(input.options.urls, {
          formats: input.options.formats,
          pageOptions: input.options.pageOptions,
        });

        if (!batchResult.success) {
          throw new TRPCError({
            code: 'EXTERNAL_SERVICE_ERROR',
            message: `Firecrawl batch scrape failed: ${batchResult.error || 'Unknown error'}`
          });
        }

        // Generate a batch job ID for tracking
        const batchJobId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Save batch results to database
        const savedAnalyses = await Promise.all(
          batchResult.data?.map(async (result, index) => {
            const [savedAnalysis] = await ctx.db
              .insert(analyses)
              .values({
                websiteId: input.websiteId,
                status: result.success ? 'completed' : 'failed',
                rawData: result.success ? JSON.stringify(result) : undefined,
                errorMessage: result.success ? undefined : 'Batch scrape failed for this URL',
                firecrawlVersion: 'v2',
                batchJobId,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .returning();
            
            return savedAnalysis;
          }) || []
        );

        return {
          success: true,
          batchJobId,
          results: batchResult.data,
          urlsProcessed: input.options.urls.length,
          successCount: batchResult.data?.filter(r => r.success).length || 0,
          analysisIds: savedAnalyses.map(a => a.id),
        };

      } catch (error) {
        console.error('Firecrawl v2 batch scrape failed:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Batch scrape failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }),

  /**
   * Crawl entire website using Firecrawl v2
   */
  crawlWebsite: protectedProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
      options: crawlOptionsSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        // Verify website ownership
        const website = await ctx.db
          .select()
          .from(websites)
          .where(and(
            eq(websites.id, input.websiteId),
            eq(websites.userId, user.id)
          ))
          .limit(1);

        if (website.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Website not found or access denied'
          });
        }

        // Get API key
        const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
        if (!firecrawlApiKey) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Firecrawl API key not configured'
          });
        }

        // Initialize Firecrawl v2
        const firecrawl = new Firecrawl({ apiKey: firecrawlApiKey });

        // Perform website crawl
        const crawlResult = await firecrawl.crawl(input.options.baseUrl, {
          maxDepth: input.options.maxDepth,
          maxLinks: input.options.maxLinks,
          onlyDomain: input.options.onlyDomain,
          formats: input.options.formats,
          pageOptions: input.options.pageOptions,
        });

        if (!crawlResult.success) {
          throw new TRPCError({
            code: 'EXTERNAL_SERVICE_ERROR',
            message: `Firecrawl website crawl failed: ${crawlResult.error || 'Unknown error'}`
          });
        }

        // Generate a crawl job ID for tracking
        const crawlJobId = `crawl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Save crawl results to database
        const savedAnalyses = await Promise.all(
          crawlResult.data?.map(async (page) => {
            const [savedAnalysis] = await ctx.db
              .insert(analyses)
              .values({
                websiteId: input.websiteId,
                status: 'completed',
                rawData: JSON.stringify(page),
                firecrawlVersion: 'v2',
                crawlJobId,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .returning();
            
            return savedAnalysis;
          }) || []
        );

        return {
          success: true,
          crawlJobId,
          pagesDiscovered: crawlResult.data?.length || 0,
          maxDepth: input.options.maxDepth,
          maxLinks: input.options.maxLinks,
          baseUrl: input.options.baseUrl,
          pages: crawlResult.data?.map(page => ({
            url: page.metadata?.sourceURL || page.url,
            title: page.metadata?.title || 'Untitled',
            wordCount: page.metadata?.wordCount || 0,
          })) || [],
          analysisIds: savedAnalyses.map(a => a.id),
        };

      } catch (error) {
        console.error('Firecrawl v2 website crawl failed:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Website crawl failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }),

  /**
   * Get extraction results for a website
   */
  getExtractionResults: protectedProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        // Verify website ownership
        const website = await ctx.db
          .select()
          .from(websites)
          .where(and(
            eq(websites.id, input.websiteId),
            eq(websites.userId, user.id)
          ))
          .limit(1);

        if (website.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Website not found or access denied'
          });
        }

        // Get analyses with extraction results
        const extractionResults = await ctx.db
          .select({
            id: analyses.id,
            extractionResults: analyses.extractionResults,
            extractionPrompts: analyses.extractionPrompts,
            batchJobId: analyses.batchJobId,
            crawlJobId: analyses.crawlJobId,
            createdAt: analyses.createdAt,
          })
          .from(analyses)
          .where(and(
            eq(analyses.websiteId, input.websiteId),
            eq(analyses.firecrawlVersion, 'v2')
          ))
          .orderBy(desc(analyses.createdAt))
          .limit(input.limit);

        return {
          results: extractionResults.map(result => ({
            id: result.id,
            extractionResults: result.extractionResults,
            extractionPrompts: result.extractionPrompts,
            batchJobId: result.batchJobId,
            crawlJobId: result.crawlJobId,
            createdAt: result.createdAt?.toISOString(),
            hasBusinessInfo: !!(result.extractionResults as any)?.businessInfo,
            hasCTAs: !!((result.extractionResults as any)?.callsToAction?.length > 0),
            hasSocialProof: !!(result.extractionResults as any)?.socialProof,
            hasProducts: !!((result.extractionResults as any)?.products?.length > 0),
          })),
          total: extractionResults.length,
        };

      } catch (error) {
        console.error('Failed to get extraction results:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to retrieve extraction results: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }),

  /**
   * Get batch job status and results
   */
  getBatchJobResults: protectedProcedure
    .input(z.object({
      batchJobId: z.string(),
      websiteId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        // Verify website ownership
        const website = await ctx.db
          .select()
          .from(websites)
          .where(and(
            eq(websites.id, input.websiteId),
            eq(websites.userId, user.id)
          ))
          .limit(1);

        if (website.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Website not found or access denied'
          });
        }

        // Get batch job results
        const batchResults = await ctx.db
          .select()
          .from(analyses)
          .where(and(
            eq(analyses.websiteId, input.websiteId),
            eq(analyses.batchJobId, input.batchJobId)
          ))
          .orderBy(desc(analyses.createdAt));

        return {
          batchJobId: input.batchJobId,
          results: batchResults,
          totalUrls: batchResults.length,
          successCount: batchResults.filter(r => r.status === 'completed').length,
          failedCount: batchResults.filter(r => r.status === 'failed').length,
        };

      } catch (error) {
        console.error('Failed to get batch job results:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to retrieve batch job results: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }),

  /**
   * Get crawl job status and results
   */
  getCrawlJobResults: protectedProcedure
    .input(z.object({
      crawlJobId: z.string(),
      websiteId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx;
      
      try {
        // Verify website ownership
        const website = await ctx.db
          .select()
          .from(websites)
          .where(and(
            eq(websites.id, input.websiteId),
            eq(websites.userId, user.id)
          ))
          .limit(1);

        if (website.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Website not found or access denied'
          });
        }

        // Get crawl job results
        const crawlResults = await ctx.db
          .select()
          .from(analyses)
          .where(and(
            eq(analyses.websiteId, input.websiteId),
            eq(analyses.crawlJobId, input.crawlJobId)
          ))
          .orderBy(desc(analyses.createdAt));

        return {
          crawlJobId: input.crawlJobId,
          results: crawlResults,
          pagesDiscovered: crawlResults.length,
          successCount: crawlResults.filter(r => r.status === 'completed').length,
          failedCount: crawlResults.filter(r => r.status === 'failed').length,
        };

      } catch (error) {
        console.error('Failed to get crawl job results:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to retrieve crawl job results: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }),
});