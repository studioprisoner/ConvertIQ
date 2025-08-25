import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCallerFactory } from '@/lib/trpc/server';
import { appRouter } from '@/lib/trpc/root';
import { db } from '@/db';
import { websites, analyses, reports } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Mock external dependencies
vi.mock('@mendable/firecrawl-js');
vi.mock('@/lib/ai/analysis-engine');
vi.mock('@/lib/reports/generators/marketing-report');
vi.mock('@/lib/reports/generators/conversion-report');

describe('Analysis Workflow E2E', () => {
  const createCaller = createCallerFactory(appRouter);
  let caller: ReturnType<typeof createCaller>;
  
  const mockUser = {
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockWebsite = {
    id: 'test-website-123',
    userId: 'test-user-123',
    domain: 'example.com',
    url: 'https://example.com',
    isVerified: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FIRECRAWL_API_KEY = 'test-api-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    
    caller = createCaller({
      db: db as any,
      user: mockUser,
    });

    // Mock successful database operations
    const mockDbChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      orderBy: vi.fn().mockReturnThis(),
    };

    (db as any).select = mockDbChain.select;
    (db as any).insert = mockDbChain.insert;
  });

  describe('Complete Website Analysis Workflow', () => {
    it('should complete full analysis from URL input to final report', async () => {
      // Mock database responses for website verification
      const mockDbSelect = (db as any).select();
      mockDbSelect.limit.mockResolvedValueOnce([mockWebsite]);

      // Mock Firecrawl extraction
      const { Firecrawl } = require('@mendable/firecrawl-js');
      const mockFirecrawl = {
        extract: vi.fn().mockResolvedValue({
          success: true,
          data: {
            product: {
              name: 'Test Product',
              price: { current: '$99.99', currency: 'USD' },
              description: 'Premium quality product',
              features: ['Feature 1', 'Feature 2'],
            },
            callsToAction: [
              { text: 'Buy Now', type: 'buy', prominence: 'primary' },
            ],
            socialProof: {
              reviews: [
                { rating: 5, text: 'Excellent!', author: 'Customer' },
              ],
            },
            conversionElements: {
              scarcityIndicators: ['Limited stock'],
              urgencyMessages: ['Sale ends soon'],
            },
          },
        }),
        scrape: vi.fn().mockResolvedValue({
          success: true,
          markdown: 'Page content',
          metadata: { title: 'Product Page', description: 'Great product' },
        }),
      };
      Firecrawl.mockImplementation(() => mockFirecrawl);

      // Mock analysis engine
      const { analysisEngine } = require('@/lib/ai/analysis-engine');
      analysisEngine.generateAnalysis.mockResolvedValue({
        insights: ['Product images could be improved'],
        recommendations: [
          {
            id: 'rec-1',
            title: 'Improve Product Images',
            description: 'Add high-quality product images',
            category: 'Visual Design',
            impact: 'high',
            effort: 'medium',
            estimatedImpact: 15,
          },
        ],
        score: 75,
      });

      // Mock report generators
      const { marketingReportGenerator } = require('@/lib/reports/generators/marketing-report');
      const { conversionReportGenerator } = require('@/lib/reports/generators/conversion-report');
      
      marketingReportGenerator.generateMarketingReport.mockResolvedValue({
        title: 'Marketing Analysis Report',
        sections: [],
        recommendations: [],
        score: 80,
      });

      conversionReportGenerator.generateConversionReport.mockResolvedValue({
        title: 'Conversion Optimization Report',
        sections: [],
        recommendations: [],
        score: 75,
      });

      // Mock database insertions
      const mockInsert = (db as any).insert();
      mockInsert.returning
        .mockResolvedValueOnce([{ id: 'analysis-123' }]) // For analysis
        .mockResolvedValueOnce([{ id: 'report-123' }]); // For report

      // Step 1: Extract structured data
      const extractionResult = await caller.firecrawlV2.extractStructuredData({
        websiteId: mockWebsite.id,
        urls: ['https://example.com/product'],
        extractionType: 'ecommerceAnalysis',
      });

      expect(extractionResult.success).toBe(true);
      expect(extractionResult.analysisId).toBe('analysis-123');

      // Step 2: Verify analysis was created
      expect(mockFirecrawl.extract).toHaveBeenCalledWith({
        urls: ['https://example.com/product'],
        prompt: expect.stringContaining('ecommerce'),
        schema: expect.any(Object),
      });

      // Step 3: Verify insights generation would be triggered
      expect(analysisEngine.generateAnalysis).toHaveBeenCalled();

      // Step 4: Verify report generation
      expect(marketingReportGenerator.generateMarketingReport).toHaveBeenCalled();
      expect(conversionReportGenerator.generateConversionReport).toHaveBeenCalled();
    });

    it('should handle extraction failures with fallback', async () => {
      const mockDbSelect = (db as any).select();
      mockDbSelect.limit.mockResolvedValueOnce([mockWebsite]);

      const { Firecrawl } = require('@mendable/firecrawl-js');
      const mockFirecrawl = {
        extract: vi.fn().mockResolvedValue({
          success: false,
          error: 'Rate limit exceeded',
        }),
        scrape: vi.fn().mockResolvedValue({
          success: true,
          markdown: 'Fallback content',
          metadata: { title: 'Page Title', description: 'Page description' },
        }),
      };
      Firecrawl.mockImplementation(() => mockFirecrawl);

      const mockInsert = (db as any).insert();
      mockInsert.returning.mockResolvedValueOnce([{ id: 'analysis-fallback-123' }]);

      await expect(
        caller.firecrawlV2.extractStructuredData({
          websiteId: mockWebsite.id,
          urls: ['https://example.com/test'],
          extractionType: 'conversionAudit',
        })
      ).rejects.toThrow('Firecrawl extraction failed: Rate limit exceeded');

      // Should attempt extraction first
      expect(mockFirecrawl.extract).toHaveBeenCalled();
    });

    it('should process batch analysis workflow', async () => {
      const mockDbSelect = (db as any).select();
      mockDbSelect.limit.mockResolvedValueOnce([mockWebsite]);

      const { Firecrawl } = require('@mendable/firecrawl-js');
      const mockFirecrawl = {
        batchScrape: vi.fn().mockResolvedValue({
          success: true,
          data: [
            { success: true, url: 'https://example.com/page1', markdown: 'Content 1' },
            { success: true, url: 'https://example.com/page2', markdown: 'Content 2' },
            { success: false, url: 'https://example.com/page3', error: 'Page not found' },
          ],
        }),
      };
      Firecrawl.mockImplementation(() => mockFirecrawl);

      const mockInsert = (db as any).insert();
      mockInsert.returning.mockResolvedValue([{ id: 'batch-analysis-123' }]);

      const result = await caller.firecrawlV2.batchScrape({
        websiteId: mockWebsite.id,
        options: {
          urls: [
            'https://example.com/page1',
            'https://example.com/page2',
            'https://example.com/page3',
          ],
          formats: ['markdown'],
        },
      });

      expect(result.success).toBe(true);
      expect(result.urlsProcessed).toBe(3);
      expect(result.successCount).toBe(2);
      expect(mockFirecrawl.batchScrape).toHaveBeenCalledWith(
        expect.arrayContaining([
          'https://example.com/page1',
          'https://example.com/page2',
          'https://example.com/page3',
        ]),
        {
          formats: ['markdown'],
          pageOptions: undefined,
        }
      );
    });

    it('should handle website crawl workflow', async () => {
      const mockDbSelect = (db as any).select();
      mockDbSelect.limit.mockResolvedValueOnce([mockWebsite]);

      const { Firecrawl } = require('@mendable/firecrawl-js');
      const mockFirecrawl = {
        crawl: vi.fn().mockResolvedValue({
          success: true,
          data: [
            {
              url: 'https://example.com',
              metadata: { title: 'Homepage', sourceURL: 'https://example.com', wordCount: 500 },
              markdown: 'Homepage content',
            },
            {
              url: 'https://example.com/about',
              metadata: { title: 'About', sourceURL: 'https://example.com/about', wordCount: 300 },
              markdown: 'About content',
            },
          ],
        }),
      };
      Firecrawl.mockImplementation(() => mockFirecrawl);

      const mockInsert = (db as any).insert();
      mockInsert.returning.mockResolvedValue([{ id: 'crawl-analysis-123' }]);

      const result = await caller.firecrawlV2.crawlWebsite({
        websiteId: mockWebsite.id,
        options: {
          baseUrl: 'https://example.com',
          maxDepth: 2,
          maxLinks: 10,
          onlyDomain: true,
        },
      });

      expect(result.success).toBe(true);
      expect(result.pagesDiscovered).toBe(2);
      expect(result.pages).toHaveLength(2);
      expect(result.pages[0]).toEqual({
        url: 'https://example.com',
        title: 'Homepage',
        wordCount: 500,
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle network failures gracefully', async () => {
      const mockDbSelect = (db as any).select();
      mockDbSelect.limit.mockResolvedValueOnce([mockWebsite]);

      const { Firecrawl } = require('@mendable/firecrawl-js');
      const mockFirecrawl = {
        extract: vi.fn().mockRejectedValue(new Error('Network timeout')),
      };
      Firecrawl.mockImplementation(() => mockFirecrawl);

      await expect(
        caller.firecrawlV2.extractStructuredData({
          websiteId: mockWebsite.id,
          urls: ['https://example.com'],
          extractionType: 'conversionAudit',
        })
      ).rejects.toThrow('Extraction failed: Network timeout');
    });

    it('should validate user permissions throughout workflow', async () => {
      // Mock unauthorized access attempt
      const mockDbSelect = (db as any).select();
      mockDbSelect.limit.mockResolvedValueOnce([]); // No website found

      await expect(
        caller.firecrawlV2.extractStructuredData({
          websiteId: 'unauthorized-website',
          urls: ['https://example.com'],
          extractionType: 'conversionAudit',
        })
      ).rejects.toThrow('Website not found or access denied');
    });

    it('should handle missing API configuration', async () => {
      delete process.env.FIRECRAWL_API_KEY;
      
      const mockDbSelect = (db as any).select();
      mockDbSelect.limit.mockResolvedValueOnce([mockWebsite]);

      await expect(
        caller.firecrawlV2.extractStructuredData({
          websiteId: mockWebsite.id,
          urls: ['https://example.com'],
          extractionType: 'conversionAudit',
        })
      ).rejects.toThrow('Firecrawl API key not configured');
    });
  });

  describe('Data Flow Integration', () => {
    it('should maintain data consistency across extraction and analysis', async () => {
      const mockDbSelect = (db as any).select();
      mockDbSelect.limit
        .mockResolvedValueOnce([mockWebsite]) // For extraction
        .mockResolvedValueOnce([{ // For getting results
          id: 'analysis-123',
          extractionResults: {
            product: { name: 'Test Product' },
            callsToAction: [{ text: 'Buy Now' }],
          },
          extractionPrompts: ['Extract ecommerce data'],
          batchJobId: null,
          crawlJobId: null,
          createdAt: new Date(),
        }]);

      const { Firecrawl } = require('@mendable/firecrawl-js');
      const mockFirecrawl = {
        extract: vi.fn().mockResolvedValue({
          success: true,
          data: {
            product: { name: 'Test Product' },
            callsToAction: [{ text: 'Buy Now' }],
          },
        }),
      };
      Firecrawl.mockImplementation(() => mockFirecrawl);

      const mockInsert = (db as any).insert();
      mockInsert.returning.mockResolvedValueOnce([{ id: 'analysis-123' }]);

      // Step 1: Extract data
      const extractionResult = await caller.firecrawlV2.extractStructuredData({
        websiteId: mockWebsite.id,
        urls: ['https://example.com/product'],
        extractionType: 'ecommerceAnalysis',
      });

      expect(extractionResult.success).toBe(true);
      expect(extractionResult.data.product.name).toBe('Test Product');

      // Step 2: Retrieve results
      const results = await caller.firecrawlV2.getExtractionResults({
        websiteId: mockWebsite.id,
        limit: 10,
      });

      expect(results.results).toHaveLength(1);
      expect(results.results[0].id).toBe('analysis-123');
      expect(results.results[0].hasCTAs).toBe(true);
    });

    it('should handle batch job lifecycle', async () => {
      const mockDbSelect = (db as any).select();
      mockDbSelect.limit
        .mockResolvedValueOnce([mockWebsite]) // For batch scrape
        .mockResolvedValueOnce([mockWebsite]); // For getting batch results

      const mockDbOrderBy = vi.fn().mockResolvedValue([
        { id: 'batch-1', status: 'completed', batchJobId: 'batch-123' },
        { id: 'batch-2', status: 'completed', batchJobId: 'batch-123' },
        { id: 'batch-3', status: 'failed', batchJobId: 'batch-123' },
      ]);
      mockDbSelect.orderBy = mockDbOrderBy;

      const { Firecrawl } = require('@mendable/firecrawl-js');
      const mockFirecrawl = {
        batchScrape: vi.fn().mockResolvedValue({
          success: true,
          data: [
            { success: true, url: 'https://example.com/page1' },
            { success: true, url: 'https://example.com/page2' },
            { success: false, url: 'https://example.com/page3', error: 'Not found' },
          ],
        }),
      };
      Firecrawl.mockImplementation(() => mockFirecrawl);

      const mockInsert = (db as any).insert();
      mockInsert.returning.mockResolvedValue([{ id: 'batch-analysis' }]);

      // Step 1: Start batch scrape
      const batchResult = await caller.firecrawlV2.batchScrape({
        websiteId: mockWebsite.id,
        options: {
          urls: [
            'https://example.com/page1',
            'https://example.com/page2',
            'https://example.com/page3',
          ],
        },
      });

      expect(batchResult.success).toBe(true);
      expect(batchResult.urlsProcessed).toBe(3);
      expect(batchResult.successCount).toBe(2);

      // Step 2: Check batch job results
      const jobResults = await caller.firecrawlV2.getBatchJobResults({
        websiteId: mockWebsite.id,
        batchJobId: batchResult.batchJobId,
      });

      expect(jobResults.totalUrls).toBe(3);
      expect(jobResults.successCount).toBe(2);
      expect(jobResults.failedCount).toBe(1);
    });

    it('should complete crawl job lifecycle', async () => {
      const mockDbSelect = (db as any).select();
      mockDbSelect.limit
        .mockResolvedValueOnce([mockWebsite]) // For crawl
        .mockResolvedValueOnce([mockWebsite]); // For getting crawl results

      const mockDbOrderBy = vi.fn().mockResolvedValue([
        { id: 'crawl-1', status: 'completed', crawlJobId: 'crawl-456' },
        { id: 'crawl-2', status: 'completed', crawlJobId: 'crawl-456' },
      ]);
      mockDbSelect.orderBy = mockDbOrderBy;

      const { Firecrawl } = require('@mendable/firecrawl-js');
      const mockFirecrawl = {
        crawl: vi.fn().mockResolvedValue({
          success: true,
          data: [
            {
              url: 'https://example.com',
              metadata: { title: 'Homepage', sourceURL: 'https://example.com', wordCount: 500 },
            },
            {
              url: 'https://example.com/about',
              metadata: { title: 'About', sourceURL: 'https://example.com/about', wordCount: 300 },
            },
          ],
        }),
      };
      Firecrawl.mockImplementation(() => mockFirecrawl);

      const mockInsert = (db as any).insert();
      mockInsert.returning.mockResolvedValue([{ id: 'crawl-analysis' }]);

      // Step 1: Start website crawl
      const crawlResult = await caller.firecrawlV2.crawlWebsite({
        websiteId: mockWebsite.id,
        options: {
          baseUrl: 'https://example.com',
          maxDepth: 2,
          maxLinks: 50,
        },
      });

      expect(crawlResult.success).toBe(true);
      expect(crawlResult.pagesDiscovered).toBe(2);

      // Step 2: Check crawl job results
      const jobResults = await caller.firecrawlV2.getCrawlJobResults({
        websiteId: mockWebsite.id,
        crawlJobId: crawlResult.crawlJobId,
      });

      expect(jobResults.pagesDiscovered).toBe(2);
      expect(jobResults.successCount).toBe(2);
      expect(jobResults.failedCount).toBe(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large batch operations efficiently', async () => {
      const mockDbSelect = (db as any).select();
      mockDbSelect.limit.mockResolvedValueOnce([mockWebsite]);

      const { Firecrawl } = require('@mendable/firecrawl-js');
      const mockFirecrawl = {
        batchScrape: vi.fn().mockResolvedValue({
          success: true,
          data: Array.from({ length: 25 }, (_, i) => ({
            success: true,
            url: `https://example.com/page${i + 1}`,
            markdown: `Content ${i + 1}`,
          })),
        }),
      };
      Firecrawl.mockImplementation(() => mockFirecrawl);

      const mockInsert = (db as any).insert();
      mockInsert.returning.mockResolvedValue([{ id: 'large-batch' }]);

      const urls = Array.from({ length: 25 }, (_, i) => `https://example.com/page${i + 1}`);
      
      const result = await caller.firecrawlV2.batchScrape({
        websiteId: mockWebsite.id,
        options: { urls },
      });

      expect(result.success).toBe(true);
      expect(result.urlsProcessed).toBe(25);
      expect(result.successCount).toBe(25);
    });

    it('should validate input limits', async () => {
      // Test URL limits for extraction
      await expect(
        caller.firecrawlV2.extractStructuredData({
          websiteId: mockWebsite.id,
          urls: Array(10).fill('https://example.com'), // Exceeds limit of 5
          extractionType: 'conversionAudit',
        })
      ).rejects.toThrow();

      // Test URL limits for batch scrape
      await expect(
        caller.firecrawlV2.batchScrape({
          websiteId: mockWebsite.id,
          options: {
            urls: Array(30).fill('https://example.com'), // Exceeds limit of 25
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Security and Authorization', () => {
    it('should prevent cross-user data access', async () => {
      const unauthorizedWebsite = {
        ...mockWebsite,
        userId: 'different-user-456',
      };

      const mockDbSelect = (db as any).select();
      mockDbSelect.limit.mockResolvedValueOnce([unauthorizedWebsite]);

      await expect(
        caller.firecrawlV2.extractStructuredData({
          websiteId: mockWebsite.id,
          urls: ['https://example.com'],
          extractionType: 'conversionAudit',
        })
      ).rejects.toThrow('Website not found or access denied');
    });

    it('should validate URL ownership in analysis', async () => {
      const mockDbSelect = (db as any).select();
      mockDbSelect.limit.mockResolvedValueOnce([mockWebsite]);

      const { Firecrawl } = require('@mendable/firecrawl-js');
      const mockFirecrawl = {
        extract: vi.fn().mockResolvedValue({
          success: true,
          data: { test: 'data' },
        }),
      };
      Firecrawl.mockImplementation(() => mockFirecrawl);

      const mockInsert = (db as any).insert();
      mockInsert.returning.mockResolvedValueOnce([{ id: 'secure-analysis' }]);

      // Should allow analysis of domain-matching URLs
      const result = await caller.firecrawlV2.extractStructuredData({
        websiteId: mockWebsite.id,
        urls: ['https://example.com/product'], // Matches website domain
        extractionType: 'conversionAudit',
      });

      expect(result.success).toBe(true);
    });
  });
});