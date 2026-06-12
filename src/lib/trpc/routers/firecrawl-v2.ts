import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../server';
import { websites } from '@/db/schema/websites';
import { analyses } from '@/db/schema/analyses';
import { eq, and, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { Firecrawl } from '@mendable/firecrawl-js';
import { extractionConfigurations } from '@/lib/firecrawl/extraction-schemas';
import {
  trackExtractionStart,
  trackExtractionSuccess,
  trackExtractionError,
  trackFirecrawlError,
  trackBatchProcessingMetrics,
  trackCrawlProcessingMetrics,
  trackRateLimitHit,
  ExtractionPerformanceMonitor,
  withExtractionTracing,
} from '@/lib/monitoring/extraction-sentry';

// Input schemas for v2 capabilities
const extractOptionsSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(10),
  prompt: z.string().min(10).max(1000),
  schema: z.record(z.string(), z.any()),
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
      customSchema: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(withExtractionTracing(async ({ ctx, input }) => {
      const { user } = ctx;
      
      const extractionContext = {
        userId: user.id,
        websiteId: input.websiteId,
        url: input.urls[0], // Primary URL for tracking
        extractionType: input.extractionType,
        firecrawlVersion: 'v2' as const,
      };

      const monitor = new ExtractionPerformanceMonitor(extractionContext);
      
      try {
        // Track extraction start
        trackExtractionStart(extractionContext);

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
          const error = new TRPCError({
            code: 'NOT_FOUND',
            message: 'Website not found or access denied'
          });
          monitor.error(error, 'initialization');
          throw error;
        }

        // Get API key
        const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
        if (!firecrawlApiKey) {
          const error = new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Firecrawl API key not configured'
          });
          monitor.error(error, 'initialization');
          throw error;
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

        // Perform extraction with error tracking
        let extractResult;
        try {
          extractResult = await firecrawl.extract(extractOptions);
        } catch (error) {
          if (error instanceof Error) {
            // Check for rate limiting
            if (error.message.includes('rate limit') || error.message.includes('429')) {
              trackRateLimitHit(extractionContext);
            }
            trackFirecrawlError(error, extractionContext, 'extract');
            monitor.error(error, 'extraction');
          }
          throw error;
        }

        if (!extractResult.success) {
          const error = new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Firecrawl extraction failed: ${extractResult.error || 'Unknown error'}`
          });
          trackFirecrawlError(error, extractionContext, 'extract');
          monitor.error(error, 'extraction');
          throw error;
        }

        // Save extraction results to database
        let savedAnalysis;
        try {
          [savedAnalysis] = await ctx.db
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
        } catch (error) {
          if (error instanceof Error) {
            monitor.error(error, 'storage');
          }
          throw error;
        }

        // Calculate metrics and track success
        const metrics = monitor.finish({
          fieldsExtracted: Object.keys(extractResult.data || {}).length,
          totalPossibleFields: Object.keys(config.schema || {}).length,
          dataQualityScore: extractResult.data ? 0.8 : 0.1,
          tokenUsage: undefined,
          costUsd: undefined,
        });

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
        
        const wrappedError = new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        
        if (error instanceof Error) {
          monitor.error(error, 'extraction');
        }
        
        throw wrappedError;
      }
    }, 'extractStructuredData')),

  /**
   * Batch scrape multiple URLs using Firecrawl v2
   */
  batchScrape: protectedProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
      options: batchScrapeOptionsSchema,
    }))
    .mutation(withExtractionTracing(async ({ ctx, input }) => {
      const { user } = ctx;
      
      const batchJobId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const extractionContext = {
        userId: user.id,
        websiteId: input.websiteId,
        url: input.options.urls[0], // Primary URL for tracking
        extractionType: 'batch-scrape',
        firecrawlVersion: 'v2' as const,
        batchJobId,
      };

      const startTime = Date.now();
      
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
          const error = new TRPCError({
            code: 'NOT_FOUND',
            message: 'Website not found or access denied'
          });
          trackExtractionError(error, extractionContext, 'initialization');
          throw error;
        }

        // Get API key
        const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
        if (!firecrawlApiKey) {
          const error = new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Firecrawl API key not configured'
          });
          trackExtractionError(error, extractionContext, 'initialization');
          throw error;
        }

        // Initialize Firecrawl v2
        const firecrawl = new Firecrawl({ apiKey: firecrawlApiKey });

        // Perform batch scrape with error tracking
        let batchResult;
        try {
          batchResult = await firecrawl.batchScrape(input.options.urls, {
            options: {
              formats: input.options.formats as any,
              onlyMainContent: input.options.pageOptions?.onlyMainContent ?? true,
            },
          });
        } catch (error) {
          if (error instanceof Error) {
            // Check for rate limiting
            if (error.message.includes('rate limit') || error.message.includes('429')) {
              trackRateLimitHit(extractionContext);
            }
            trackFirecrawlError(error, extractionContext, 'scrape');
          }
          throw error;
        }

        if (batchResult.status === 'failed') {
          const error = new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Firecrawl batch scrape failed`
          });
          trackFirecrawlError(error, extractionContext, 'scrape');
          throw error;
        }

        // Save batch results to database
        const savedAnalyses = await Promise.all(
          batchResult.data?.map(async (result, index) => {
            const [savedAnalysis] = await ctx.db
              .insert(analyses)
              .values({
                websiteId: input.websiteId,
                status: 'completed',
                rawData: JSON.stringify(result),
                firecrawlVersion: 'v2',
                batchJobId,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .returning();
            
            return savedAnalysis;
          }) || []
        );

        // Track batch processing metrics
        const processingTime = Date.now() - startTime;
        const successCount = batchResult.data?.length || 0;
        const failedCount = (batchResult.data?.length || 0) - successCount;

        trackBatchProcessingMetrics(
          { userId: user.id, websiteId: input.websiteId, batchJobId },
          {
            totalUrls: input.options.urls.length,
            successCount,
            failedCount,
            averageProcessingTime: processingTime / input.options.urls.length,
            totalCost: 0, // Would need to calculate from API response
          }
        );

        return {
          success: true,
          batchJobId,
          results: batchResult.data,
          urlsProcessed: input.options.urls.length,
          successCount,
          analysisIds: savedAnalyses.map(a => a.id),
        };

      } catch (error) {
        console.error('Firecrawl v2 batch scrape failed:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        const wrappedError = new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Batch scrape failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        
        if (error instanceof Error) {
          trackExtractionError(error, extractionContext, 'extraction');
        }
        
        throw wrappedError;
      }
    }, 'batchScrape')),

  /**
   * Crawl entire website using Firecrawl v2
   */
  crawlWebsite: protectedProcedure
    .input(z.object({
      websiteId: z.string().uuid(),
      options: crawlOptionsSchema,
    }))
    .mutation(withExtractionTracing(async ({ ctx, input }) => {
      const { user } = ctx;
      
      const crawlJobId = `crawl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const extractionContext = {
        userId: user.id,
        websiteId: input.websiteId,
        url: input.options.baseUrl,
        extractionType: 'website-crawl',
        firecrawlVersion: 'v2' as const,
        crawlJobId,
      };

      const startTime = Date.now();
      
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
          const error = new TRPCError({
            code: 'NOT_FOUND',
            message: 'Website not found or access denied'
          });
          trackExtractionError(error, extractionContext, 'initialization');
          throw error;
        }

        // Get API key
        const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
        if (!firecrawlApiKey) {
          const error = new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Firecrawl API key not configured'
          });
          trackExtractionError(error, extractionContext, 'initialization');
          throw error;
        }

        // Initialize Firecrawl v2
        const firecrawl = new Firecrawl({ apiKey: firecrawlApiKey });

        // Perform website crawl with error tracking
        let crawlResult;
        try {
          crawlResult = await firecrawl.crawl(input.options.baseUrl, {
            maxDiscoveryDepth: input.options.maxDepth,
            limit: input.options.maxLinks,
            crawlEntireDomain: input.options.onlyDomain,
            scrapeOptions: {
              formats: input.options.formats as any,
              onlyMainContent: input.options.pageOptions?.onlyMainContent ?? true,
            },
          });
        } catch (error) {
          if (error instanceof Error) {
            // Check for rate limiting
            if (error.message.includes('rate limit') || error.message.includes('429')) {
              trackRateLimitHit(extractionContext);
            }
            trackFirecrawlError(error, extractionContext, 'crawl');
          }
          throw error;
        }

        if (crawlResult.status === 'failed') {
          const error = new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Firecrawl website crawl failed`
          });
          trackFirecrawlError(error, extractionContext, 'crawl');
          throw error;
        }

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

        // Track crawl processing metrics
        const processingTime = Date.now() - startTime;
        const pagesDiscovered = crawlResult.data?.length || 0;

        trackCrawlProcessingMetrics(
          { userId: user.id, websiteId: input.websiteId, crawlJobId },
          {
            pagesDiscovered,
            successCount: pagesDiscovered, // All pages are successful if we reach here
            failedCount: 0,
            maxDepth: input.options.maxDepth,
            averageProcessingTime: pagesDiscovered > 0 ? processingTime / pagesDiscovered : 0,
            totalCost: 0, // Would need to calculate from API response
          }
        );

        return {
          success: true,
          crawlJobId,
          pagesDiscovered,
          maxDepth: input.options.maxDepth,
          maxLinks: input.options.maxLinks,
          baseUrl: input.options.baseUrl,
          pages: crawlResult.data?.map(page => ({
            url: page.metadata?.sourceURL || page.metadata?.url || '',
            title: page.metadata?.title || 'Untitled',
          })) || [],
          analysisIds: savedAnalyses.map(a => a.id),
        };

      } catch (error) {
        console.error('Firecrawl v2 website crawl failed:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        const wrappedError = new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Website crawl failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        
        if (error instanceof Error) {
          trackExtractionError(error, extractionContext, 'extraction');
        }
        
        throw wrappedError;
      }
    }, 'crawlWebsite')),

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