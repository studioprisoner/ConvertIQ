import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { firecrawlV2Router } from '../firecrawl-v2';
import { createCallerFactory } from '@/lib/trpc/server';
import { db } from '@/db';
import { websites, analyses } from '@/db/schema';

// Mock Firecrawl
vi.mock('@mendable/firecrawl-js', () => ({
  Firecrawl: vi.fn().mockImplementation(() => ({
    extract: vi.fn(),
    batchScrape: vi.fn(),
    crawl: vi.fn(),
  })),
}));

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

describe('Firecrawl V2 Router', () => {
  const createCaller = createCallerFactory(firecrawlV2Router);
  let mockDb: any;
  let mockFirecrawl: any;

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockWebsite = {
    id: 'website-123',
    userId: 'user-123',
    domain: 'example.com',
    url: 'https://example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup database mocks
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      orderBy: vi.fn().mockReturnThis(),
    };
    
    (db as any).select = mockDb.select;
    (db as any).insert = mockDb.insert;

    // Setup Firecrawl mock
    const { Firecrawl } = require('@mendable/firecrawl-js');
    mockFirecrawl = {
      extract: vi.fn(),
      batchScrape: vi.fn(),
      crawl: vi.fn(),
    };
    Firecrawl.mockImplementation(() => mockFirecrawl);

    // Mock environment variable
    process.env.FIRECRAWL_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.FIRECRAWL_API_KEY;
  });

  describe('extractStructuredData', () => {
    it('should extract structured data successfully', async () => {
      // Mock database responses
      mockDb.limit.mockResolvedValueOnce([mockWebsite]);
      mockDb.returning.mockResolvedValueOnce([{ id: 'analysis-123' }]);

      // Mock Firecrawl response
      const mockExtractionResult = {
        success: true,
        data: {
          product: { name: 'Test Product', price: '$99.99' },
          callsToAction: [{ text: 'Buy Now', type: 'buy' }],
        },
      };
      mockFirecrawl.extract.mockResolvedValue(mockExtractionResult);

      const caller = createCaller({ db: db as any, user: mockUser });
      
      const result = await caller.extractStructuredData({
        websiteId: 'website-123',
        urls: ['https://example.com/product'],
        extractionType: 'ecommerceAnalysis',
      });

      expect(result.success).toBe(true);
      expect(result.analysisId).toBe('analysis-123');
      expect(result.urlsProcessed).toBe(1);
      expect(mockFirecrawl.extract).toHaveBeenCalledWith({
        urls: ['https://example.com/product'],
        prompt: expect.stringContaining('ecommerce'),
        schema: expect.any(Object),
      });
    });

    it('should fail when website not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      const caller = createCaller({ db: db as any, user: mockUser });
      
      await expect(
        caller.extractStructuredData({
          websiteId: 'nonexistent-website',
          urls: ['https://example.com'],
          extractionType: 'conversionAudit',
        })
      ).rejects.toThrow('Website not found or access denied');
    });

    it('should fail when Firecrawl API key missing', async () => {
      delete process.env.FIRECRAWL_API_KEY;
      mockDb.limit.mockResolvedValueOnce([mockWebsite]);

      const caller = createCaller({ db: db as any, user: mockUser });
      
      await expect(
        caller.extractStructuredData({
          websiteId: 'website-123',
          urls: ['https://example.com'],
          extractionType: 'conversionAudit',
        })
      ).rejects.toThrow('Firecrawl API key not configured');
    });

    it('should handle Firecrawl extraction failure', async () => {
      mockDb.limit.mockResolvedValueOnce([mockWebsite]);
      mockFirecrawl.extract.mockResolvedValue({
        success: false,
        error: 'Rate limit exceeded',
      });

      const caller = createCaller({ db: db as any, user: mockUser });
      
      await expect(
        caller.extractStructuredData({
          websiteId: 'website-123',
          urls: ['https://example.com'],
          extractionType: 'conversionAudit',
        })
      ).rejects.toThrow('Firecrawl extraction failed: Rate limit exceeded');
    });

    it('should use custom prompt and schema when provided', async () => {
      mockDb.limit.mockResolvedValueOnce([mockWebsite]);
      mockDb.returning.mockResolvedValueOnce([{ id: 'analysis-123' }]);
      mockFirecrawl.extract.mockResolvedValue({
        success: true,
        data: { custom: 'data' },
      });

      const caller = createCaller({ db: db as any, user: mockUser });
      
      const customPrompt = 'Extract custom information';
      const customSchema = { custom: { type: 'string' } };
      
      await caller.extractStructuredData({
        websiteId: 'website-123',
        urls: ['https://example.com'],
        extractionType: 'comprehensive',
        customPrompt,
        customSchema,
      });

      expect(mockFirecrawl.extract).toHaveBeenCalledWith({
        urls: ['https://example.com'],
        prompt: customPrompt,
        schema: customSchema,
      });
    });
  });

  describe('batchScrape', () => {
    it('should batch scrape multiple URLs successfully', async () => {
      mockDb.limit.mockResolvedValueOnce([mockWebsite]);
      mockDb.returning.mockResolvedValue([{ id: 'analysis-123' }]);

      const mockBatchResult = {
        success: true,
        data: [
          { success: true, url: 'https://example.com/page1', markdown: 'Content 1' },
          { success: true, url: 'https://example.com/page2', markdown: 'Content 2' },
        ],
      };
      mockFirecrawl.batchScrape.mockResolvedValue(mockBatchResult);

      const caller = createCaller({ db: db as any, user: mockUser });
      
      const result = await caller.batchScrape({
        websiteId: 'website-123',
        options: {
          urls: ['https://example.com/page1', 'https://example.com/page2'],
          formats: ['markdown', 'html'],
        },
      });

      expect(result.success).toBe(true);
      expect(result.urlsProcessed).toBe(2);
      expect(result.successCount).toBe(2);
      expect(mockFirecrawl.batchScrape).toHaveBeenCalledWith(
        ['https://example.com/page1', 'https://example.com/page2'],
        {
          formats: ['markdown', 'html'],
          pageOptions: undefined,
        }
      );
    });

    it('should handle batch scrape failures gracefully', async () => {
      mockDb.limit.mockResolvedValueOnce([mockWebsite]);
      mockFirecrawl.batchScrape.mockResolvedValue({
        success: false,
        error: 'Batch processing failed',
      });

      const caller = createCaller({ db: db as any, user: mockUser });
      
      await expect(
        caller.batchScrape({
          websiteId: 'website-123',
          options: {
            urls: ['https://example.com/page1'],
          },
        })
      ).rejects.toThrow('Firecrawl batch scrape failed: Batch processing failed');
    });
  });

  describe('crawlWebsite', () => {
    it('should crawl website successfully', async () => {
      mockDb.limit.mockResolvedValueOnce([mockWebsite]);
      mockDb.returning.mockResolvedValue([{ id: 'analysis-123' }]);

      const mockCrawlResult = {
        success: true,
        data: [
          {
            url: 'https://example.com',
            metadata: { title: 'Homepage', sourceURL: 'https://example.com', wordCount: 500 },
            markdown: 'Homepage content',
          },
          {
            url: 'https://example.com/about',
            metadata: { title: 'About Us', sourceURL: 'https://example.com/about', wordCount: 300 },
            markdown: 'About content',
          },
        ],
      };
      mockFirecrawl.crawl.mockResolvedValue(mockCrawlResult);

      const caller = createCaller({ db: db as any, user: mockUser });
      
      const result = await caller.crawlWebsite({
        websiteId: 'website-123',
        options: {
          baseUrl: 'https://example.com',
          maxDepth: 2,
          maxLinks: 10,
        },
      });

      expect(result.success).toBe(true);
      expect(result.pagesDiscovered).toBe(2);
      expect(result.baseUrl).toBe('https://example.com');
      expect(result.pages).toHaveLength(2);
      expect(result.pages[0]).toEqual({
        url: 'https://example.com',
        title: 'Homepage',
        wordCount: 500,
      });
    });

    it('should handle crawl failures', async () => {
      mockDb.limit.mockResolvedValueOnce([mockWebsite]);
      mockFirecrawl.crawl.mockResolvedValue({
        success: false,
        error: 'Website unreachable',
      });

      const caller = createCaller({ db: db as any, user: mockUser });
      
      await expect(
        caller.crawlWebsite({
          websiteId: 'website-123',
          options: {
            baseUrl: 'https://invalid-site.example',
          },
        })
      ).rejects.toThrow('Firecrawl website crawl failed: Website unreachable');
    });
  });

  describe('getExtractionResults', () => {
    it('should retrieve extraction results successfully', async () => {
      mockDb.limit.mockResolvedValueOnce([mockWebsite]);
      
      const mockResults = [
        {
          id: 'analysis-1',
          extractionResults: { product: { name: 'Product 1' } },
          extractionPrompts: ['Extract product info'],
          batchJobId: 'batch-123',
          crawlJobId: null,
          createdAt: new Date(),
        },
      ];
      mockDb.limit.mockResolvedValueOnce(mockResults);

      const caller = createCaller({ db: db as any, user: mockUser });
      
      const result = await caller.getExtractionResults({
        websiteId: 'website-123',
        limit: 10,
      });

      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.results[0].id).toBe('analysis-1');
      expect(result.results[0].hasProducts).toBe(false);
    });
  });

  describe('getBatchJobResults', () => {
    it('should get batch job results successfully', async () => {
      mockDb.limit.mockResolvedValueOnce([mockWebsite]);
      
      const mockBatchResults = [
        { id: 'analysis-1', status: 'completed', batchJobId: 'batch-123' },
        { id: 'analysis-2', status: 'failed', batchJobId: 'batch-123' },
      ];
      mockDb.orderBy.mockResolvedValueOnce(mockBatchResults);

      const caller = createCaller({ db: db as any, user: mockUser });
      
      const result = await caller.getBatchJobResults({
        websiteId: 'website-123',
        batchJobId: 'batch-123',
      });

      expect(result.batchJobId).toBe('batch-123');
      expect(result.totalUrls).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
    });
  });

  describe('getCrawlJobResults', () => {
    it('should get crawl job results successfully', async () => {
      mockDb.limit.mockResolvedValueOnce([mockWebsite]);
      
      const mockCrawlResults = [
        { id: 'analysis-1', status: 'completed', crawlJobId: 'crawl-123' },
        { id: 'analysis-2', status: 'completed', crawlJobId: 'crawl-123' },
        { id: 'analysis-3', status: 'failed', crawlJobId: 'crawl-123' },
      ];
      mockDb.orderBy.mockResolvedValueOnce(mockCrawlResults);

      const caller = createCaller({ db: db as any, user: mockUser });
      
      const result = await caller.getCrawlJobResults({
        websiteId: 'website-123',
        crawlJobId: 'crawl-123',
      });

      expect(result.crawlJobId).toBe('crawl-123');
      expect(result.pagesDiscovered).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(1);
    });
  });

  describe('Error handling', () => {
    it('should handle database connection errors', async () => {
      mockDb.limit.mockRejectedValueOnce(new Error('Database connection failed'));

      const caller = createCaller({ db: db as any, user: mockUser });
      
      await expect(
        caller.extractStructuredData({
          websiteId: 'website-123',
          urls: ['https://example.com'],
          extractionType: 'conversionAudit',
        })
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle Firecrawl API errors', async () => {
      mockDb.limit.mockResolvedValueOnce([mockWebsite]);
      mockFirecrawl.extract.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      const caller = createCaller({ db: db as any, user: mockUser });
      
      await expect(
        caller.extractStructuredData({
          websiteId: 'website-123',
          urls: ['https://example.com'],
          extractionType: 'conversionAudit',
        })
      ).rejects.toThrow('Extraction failed: API rate limit exceeded');
    });
  });

  describe('Input validation', () => {
    it('should validate URL format in extract', async () => {
      const caller = createCaller({ db: db as any, user: mockUser });
      
      await expect(
        caller.extractStructuredData({
          websiteId: 'website-123',
          urls: ['invalid-url'],
          extractionType: 'conversionAudit',
        })
      ).rejects.toThrow();
    });

    it('should limit maximum URLs in extract', async () => {
      const caller = createCaller({ db: db as any, user: mockUser });
      
      await expect(
        caller.extractStructuredData({
          websiteId: 'website-123',
          urls: Array(10).fill('https://example.com'),
          extractionType: 'conversionAudit',
        })
      ).rejects.toThrow();
    });

    it('should validate batch scrape options', async () => {
      const caller = createCaller({ db: db as any, user: mockUser });
      
      await expect(
        caller.batchScrape({
          websiteId: 'website-123',
          options: {
            urls: Array(30).fill('https://example.com'), // Exceeds max of 25
          },
        })
      ).rejects.toThrow();
    });

    it('should validate crawl options', async () => {
      const caller = createCaller({ db: db as any, user: mockUser });
      
      await expect(
        caller.crawlWebsite({
          websiteId: 'website-123',
          options: {
            baseUrl: 'invalid-url',
          },
        })
      ).rejects.toThrow();
    });
  });
});