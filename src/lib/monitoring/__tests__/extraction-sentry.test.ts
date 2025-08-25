import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  startSpan: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  setMeasurement: vi.fn(),
  setTag: vi.fn(),
  setUser: vi.fn(),
}));

// Mock sentry-utils
vi.mock('@/lib/sentry-utils', () => ({
  captureErrorWithContext: vi.fn(),
  addBreadcrumb: vi.fn(),
  withSentryTracing: vi.fn((fn) => fn),
}));

import * as Sentry from '@sentry/nextjs';
import {
  trackExtractionStart,
  trackExtractionSuccess,
  trackExtractionError,
  trackFirecrawlError,
  trackBatchProcessingMetrics,
  trackCrawlProcessingMetrics,
  trackRateLimitHit,
  trackHighCostAlert,
  ExtractionPerformanceMonitor,
  withExtractionTracing,
} from '../extraction-sentry';

describe('Extraction Sentry Tracking', () => {
  const mockContext = {
    userId: 'user-123',
    websiteId: 'website-456',
    url: 'https://example.com',
    extractionType: 'ecommerceAnalysis',
    firecrawlVersion: 'v2' as const,
  };

  const mockMetrics = {
    processingTime: 5000,
    tokenUsage: {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    },
    costUsd: 0.05,
    fieldsExtracted: 15,
    totalPossibleFields: 25,
    dataQualityScore: 0.8,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackExtractionStart', () => {
    it('should track extraction start with correct context', () => {
      const { addBreadcrumb } = require('@/lib/sentry-utils');
      
      trackExtractionStart(mockContext);

      expect(addBreadcrumb).toHaveBeenCalledWith(
        'Starting extraction for https://example.com',
        'extraction',
        {
          extractionType: 'ecommerceAnalysis',
          firecrawlVersion: 'v2',
          userId: 'user-123',
          websiteId: 'website-456',
        }
      );

      expect(Sentry.startSpan).toHaveBeenCalledWith({
        name: 'extraction_pipeline',
        op: 'extraction',
        attributes: {
          'extraction.type': 'ecommerceAnalysis',
          'extraction.version': 'v2',
          'extraction.url': 'https://example.com',
          'extraction.website_id': 'website-456',
          'extraction.user_id': 'user-123',
        },
      });
    });
  });

  describe('trackExtractionSuccess', () => {
    it('should track extraction success with metrics', () => {
      const { addBreadcrumb } = require('@/lib/sentry-utils');
      
      trackExtractionSuccess(mockContext, mockMetrics, 'ecommerce-product');

      expect(addBreadcrumb).toHaveBeenCalledWith(
        'Extraction completed successfully for https://example.com',
        'extraction',
        {
          processingTime: 5000,
          dataQualityScore: 0.8,
          fieldsExtracted: 15,
          pageType: 'ecommerce-product',
        }
      );

      expect(Sentry.setMeasurement).toHaveBeenCalledWith('extraction.processing_time', 5000);
      expect(Sentry.setMeasurement).toHaveBeenCalledWith('extraction.data_quality_score', 0.8);
      expect(Sentry.setMeasurement).toHaveBeenCalledWith('extraction.fields_extracted', 15);
      expect(Sentry.setMeasurement).toHaveBeenCalledWith('extraction.total_tokens', 150);
      expect(Sentry.setMeasurement).toHaveBeenCalledWith('extraction.cost_usd', 0.05);

      expect(Sentry.setTag).toHaveBeenCalledWith('extraction.page_type', 'ecommerce-product');
      expect(Sentry.setTag).toHaveBeenCalledWith('extraction.version', 'v2');
      expect(Sentry.setTag).toHaveBeenCalledWith('extraction.type', 'ecommerceAnalysis');
    });
  });

  describe('trackExtractionError', () => {
    it('should track extraction errors with stage context', () => {
      const error = new Error('Extraction failed');
      const { captureErrorWithContext, addBreadcrumb } = require('@/lib/sentry-utils');
      
      trackExtractionError(error, mockContext, 'parsing');

      expect(captureErrorWithContext).toHaveBeenCalledWith(error, {
        userId: 'user-123',
        component: 'extraction-pipeline',
        action: 'extraction-parsing',
        additionalData: {
          url: 'https://example.com',
          extractionType: 'ecommerceAnalysis',
          firecrawlVersion: 'v2',
          websiteId: 'website-456',
          batchJobId: undefined,
          crawlJobId: undefined,
          stage: 'parsing',
        },
      });

      expect(addBreadcrumb).toHaveBeenCalledWith(
        'Extraction failed at parsing for https://example.com',
        'extraction.error',
        {
          errorMessage: 'Extraction failed',
          stage: 'parsing',
          extractionType: 'ecommerceAnalysis',
        }
      );
    });
  });

  describe('trackFirecrawlError', () => {
    it('should track Firecrawl API errors', () => {
      const error = new Error('Rate limit exceeded');
      const { captureErrorWithContext } = require('@/lib/sentry-utils');
      
      trackFirecrawlError(error, mockContext, 'extract');

      expect(captureErrorWithContext).toHaveBeenCalledWith(error, {
        userId: 'user-123',
        component: 'firecrawl-api',
        action: 'firecrawl-extract',
        additionalData: {
          url: 'https://example.com',
          operation: 'extract',
          firecrawlVersion: 'v2',
          websiteId: 'website-456',
        },
      });

      expect(Sentry.setTag).toHaveBeenCalledWith('firecrawl.operation', 'extract');
      expect(Sentry.setTag).toHaveBeenCalledWith('firecrawl.version', 'v2');
      expect(Sentry.setTag).toHaveBeenCalledWith('firecrawl.error_type', 'Error');
    });
  });

  describe('trackBatchProcessingMetrics', () => {
    it('should track batch processing metrics', () => {
      const batchContext = {
        userId: 'user-123',
        websiteId: 'website-456',
        batchJobId: 'batch-789',
      };

      const batchMetrics = {
        totalUrls: 10,
        successCount: 8,
        failedCount: 2,
        averageProcessingTime: 3000,
        totalCost: 0.25,
      };

      const { addBreadcrumb } = require('@/lib/sentry-utils');
      
      trackBatchProcessingMetrics(batchContext, batchMetrics);

      expect(addBreadcrumb).toHaveBeenCalledWith(
        'Batch processing completed: 8/10 URLs successful',
        'batch-processing',
        {
          batchJobId: 'batch-789',
          successRate: 80,
          totalCost: 0.25,
        }
      );

      expect(Sentry.setMeasurement).toHaveBeenCalledWith('batch.total_urls', 10);
      expect(Sentry.setMeasurement).toHaveBeenCalledWith('batch.success_count', 8);
      expect(Sentry.setMeasurement).toHaveBeenCalledWith('batch.failed_count', 2);
      expect(Sentry.setMeasurement).toHaveBeenCalledWith('batch.success_rate', 80);
      expect(Sentry.setTag).toHaveBeenCalledWith('batch.job_id', 'batch-789');
    });
  });

  describe('trackCrawlProcessingMetrics', () => {
    it('should track crawl processing metrics', () => {
      const crawlContext = {
        userId: 'user-123',
        websiteId: 'website-456',
        crawlJobId: 'crawl-789',
      };

      const crawlMetrics = {
        pagesDiscovered: 25,
        successCount: 23,
        failedCount: 2,
        maxDepth: 3,
        averageProcessingTime: 2000,
        totalCost: 0.5,
      };

      const { addBreadcrumb } = require('@/lib/sentry-utils');
      
      trackCrawlProcessingMetrics(crawlContext, crawlMetrics);

      expect(addBreadcrumb).toHaveBeenCalledWith(
        'Website crawl completed: 23/25 pages successful',
        'crawl-processing',
        {
          crawlJobId: 'crawl-789',
          maxDepth: 3,
          successRate: 92,
        }
      );

      expect(Sentry.setMeasurement).toHaveBeenCalledWith('crawl.pages_discovered', 25);
      expect(Sentry.setMeasurement).toHaveBeenCalledWith('crawl.success_count', 23);
      expect(Sentry.setMeasurement).toHaveBeenCalledWith('crawl.max_depth', 3);
      expect(Sentry.setTag).toHaveBeenCalledWith('crawl.job_id', 'crawl-789');
    });
  });

  describe('trackRateLimitHit', () => {
    it('should track rate limit events', () => {
      trackRateLimitHit(mockContext, 1640995200);

      expect(Sentry.captureMessage).toHaveBeenCalledWith('Firecrawl rate limit hit', {
        level: 'warning',
        tags: {
          component: 'firecrawl-api',
          action: 'rate-limit',
          extraction_version: 'v2',
        },
        extra: {
          url: 'https://example.com',
          extractionType: 'ecommerceAnalysis',
          resetTime: 1640995200,
          websiteId: 'website-456',
        },
      });
    });
  });

  describe('trackHighCostAlert', () => {
    it('should track high cost alerts when threshold exceeded', () => {
      trackHighCostAlert(mockContext, 5.0, 2.0);

      expect(Sentry.captureMessage).toHaveBeenCalledWith('High extraction cost detected', {
        level: 'warning',
        tags: {
          component: 'cost-monitoring',
          action: 'high-cost-alert',
        },
        extra: {
          cost: 5.0,
          threshold: 2.0,
          url: 'https://example.com',
          extractionType: 'ecommerceAnalysis',
          websiteId: 'website-456',
        },
      });
    });

    it('should not track when cost is below threshold', () => {
      trackHighCostAlert(mockContext, 1.0, 2.0);

      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });
  });

  describe('ExtractionPerformanceMonitor', () => {
    it('should track performance metrics when finished', () => {
      const monitor = new ExtractionPerformanceMonitor(mockContext);
      
      // Simulate some processing time
      vi.useFakeTimers();
      vi.advanceTimersByTime(3000);
      
      const result = monitor.finish({
        fieldsExtracted: 10,
        totalPossibleFields: 15,
        dataQualityScore: 0.7,
      });

      expect(result.processingTime).toBe(3000);
      expect(result.fieldsExtracted).toBe(10);
      expect(result.dataQualityScore).toBe(0.7);
      
      vi.useRealTimers();
    });

    it('should track errors with stage information', () => {
      const monitor = new ExtractionPerformanceMonitor(mockContext);
      const error = new Error('Validation failed');
      const { captureErrorWithContext } = require('@/lib/sentry-utils');
      
      monitor.error(error, 'validation');

      expect(captureErrorWithContext).toHaveBeenCalledWith(error, {
        userId: 'user-123',
        component: 'extraction-pipeline',
        action: 'extraction-validation',
        additionalData: {
          url: 'https://example.com',
          extractionType: 'ecommerceAnalysis',
          firecrawlVersion: 'v2',
          websiteId: 'website-456',
          batchJobId: undefined,
          crawlJobId: undefined,
          stage: 'validation',
        },
      });
    });
  });

  describe('withExtractionTracing', () => {
    it('should wrap function with Sentry tracing', async () => {
      const { withSentryTracing } = require('@/lib/sentry-utils');
      const mockFn = vi.fn().mockResolvedValue('test result');
      
      const wrappedFn = withExtractionTracing(mockFn, 'testOperation');
      const result = await wrappedFn('arg1', 'arg2');

      expect(withSentryTracing).toHaveBeenCalledWith(
        mockFn,
        'extraction.testOperation',
        'Extraction pipeline: testOperation'
      );
      expect(result).toBe('test result');
    });
  });
});