import * as Sentry from "@sentry/nextjs";
import { captureErrorWithContext, addBreadcrumb, withSentryTracing } from '@/lib/sentry-utils';
import type { PageType } from '@/lib/extraction/types';

export interface ExtractionContext {
  userId: string;
  websiteId: string;
  url: string;
  extractionType: string;
  firecrawlVersion: 'v1' | 'v2';
  batchJobId?: string;
  crawlJobId?: string;
}

export interface ExtractionMetrics {
  processingTime: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  costUsd?: number;
  fieldsExtracted: number;
  totalPossibleFields: number;
  dataQualityScore: number;
}

/**
 * Track extraction pipeline start
 */
export function trackExtractionStart(context: ExtractionContext) {
  addBreadcrumb(
    `Starting extraction for ${context.url}`,
    'extraction',
    {
      extractionType: context.extractionType,
      firecrawlVersion: context.firecrawlVersion,
      userId: context.userId,
      websiteId: context.websiteId,
    }
  );

  return Sentry.startSpan({
    name: 'extraction_pipeline',
    op: 'extraction',
    attributes: {
      'extraction.type': context.extractionType,
      'extraction.version': context.firecrawlVersion,
      'extraction.url': context.url,
      'extraction.website_id': context.websiteId,
      'extraction.user_id': context.userId,
    },
  });
}

/**
 * Track extraction success with metrics
 */
export function trackExtractionSuccess(
  context: ExtractionContext,
  metrics: ExtractionMetrics,
  pageType?: PageType
) {
  addBreadcrumb(
    `Extraction completed successfully for ${context.url}`,
    'extraction',
    {
      processingTime: metrics.processingTime,
      dataQualityScore: metrics.dataQualityScore,
      fieldsExtracted: metrics.fieldsExtracted,
      pageType,
    }
  );

  // Send metrics to Sentry
  Sentry.setMeasurement('extraction.processing_time', metrics.processingTime);
  Sentry.setMeasurement('extraction.data_quality_score', metrics.dataQualityScore);
  Sentry.setMeasurement('extraction.fields_extracted', metrics.fieldsExtracted);
  Sentry.setMeasurement('extraction.total_tokens', metrics.tokenUsage?.totalTokens || 0);
  Sentry.setMeasurement('extraction.cost_usd', metrics.costUsd || 0);

  Sentry.setTag('extraction.page_type', pageType || 'unknown');
  Sentry.setTag('extraction.version', context.firecrawlVersion);
  Sentry.setTag('extraction.type', context.extractionType);
}

/**
 * Track extraction errors with detailed context
 */
export function trackExtractionError(
  error: Error,
  context: ExtractionContext,
  stage: 'initialization' | 'extraction' | 'parsing' | 'validation' | 'storage'
) {
  captureErrorWithContext(error, {
    userId: context.userId,
    component: 'extraction-pipeline',
    action: `extraction-${stage}`,
    additionalData: {
      url: context.url,
      extractionType: context.extractionType,
      firecrawlVersion: context.firecrawlVersion,
      websiteId: context.websiteId,
      batchJobId: context.batchJobId,
      crawlJobId: context.crawlJobId,
      stage,
    },
  });

  // Add error breadcrumb
  addBreadcrumb(
    `Extraction failed at ${stage} for ${context.url}`,
    'extraction.error',
    {
      errorMessage: error.message,
      stage,
      extractionType: context.extractionType,
    }
  );
}

/**
 * Track Firecrawl API specific errors
 */
export function trackFirecrawlError(
  error: Error,
  context: ExtractionContext,
  operation: 'extract' | 'scrape' | 'crawl'
) {
  captureErrorWithContext(error, {
    userId: context.userId,
    component: 'firecrawl-api',
    action: `firecrawl-${operation}`,
    additionalData: {
      url: context.url,
      operation,
      firecrawlVersion: context.firecrawlVersion,
      websiteId: context.websiteId,
    },
  });

  // Track API error metrics
  Sentry.setTag('firecrawl.operation', operation);
  Sentry.setTag('firecrawl.version', context.firecrawlVersion);
  Sentry.setTag('firecrawl.error_type', error.name);
}

/**
 * Track data quality issues
 */
export function trackDataQualityIssue(
  context: ExtractionContext,
  qualityScore: number,
  issues: string[],
  pageType?: PageType
) {
  Sentry.captureMessage('Low data quality detected', {
    level: 'warning',
    tags: {
      component: 'data-quality',
      action: 'quality-validation',
      page_type: pageType || 'unknown',
      extraction_version: context.firecrawlVersion,
    },
    extra: {
      qualityScore,
      issues,
      url: context.url,
      extractionType: context.extractionType,
      websiteId: context.websiteId,
    },
  });

  // Set quality metrics
  Sentry.setMeasurement('data_quality.score', qualityScore);
  Sentry.setMeasurement('data_quality.issues_count', issues.length);
}

/**
 * Track batch processing metrics
 */
export function trackBatchProcessingMetrics(
  context: Pick<ExtractionContext, 'userId' | 'websiteId' | 'batchJobId'>,
  metrics: {
    totalUrls: number;
    successCount: number;
    failedCount: number;
    averageProcessingTime: number;
    totalCost: number;
  }
) {
  addBreadcrumb(
    `Batch processing completed: ${metrics.successCount}/${metrics.totalUrls} URLs successful`,
    'batch-processing',
    {
      batchJobId: context.batchJobId,
      successRate: (metrics.successCount / metrics.totalUrls) * 100,
      totalCost: metrics.totalCost,
    }
  );

  // Set batch metrics
  Sentry.setMeasurement('batch.total_urls', metrics.totalUrls);
  Sentry.setMeasurement('batch.success_count', metrics.successCount);
  Sentry.setMeasurement('batch.failed_count', metrics.failedCount);
  Sentry.setMeasurement('batch.success_rate', (metrics.successCount / metrics.totalUrls) * 100);
  Sentry.setMeasurement('batch.average_processing_time', metrics.averageProcessingTime);
  Sentry.setMeasurement('batch.total_cost', metrics.totalCost);

  Sentry.setTag('batch.job_id', context.batchJobId);
}

/**
 * Track crawl processing metrics
 */
export function trackCrawlProcessingMetrics(
  context: Pick<ExtractionContext, 'userId' | 'websiteId' | 'crawlJobId'>,
  metrics: {
    pagesDiscovered: number;
    successCount: number;
    failedCount: number;
    maxDepth: number;
    averageProcessingTime: number;
    totalCost: number;
  }
) {
  addBreadcrumb(
    `Website crawl completed: ${metrics.successCount}/${metrics.pagesDiscovered} pages successful`,
    'crawl-processing',
    {
      crawlJobId: context.crawlJobId,
      maxDepth: metrics.maxDepth,
      successRate: (metrics.successCount / metrics.pagesDiscovered) * 100,
    }
  );

  // Set crawl metrics
  Sentry.setMeasurement('crawl.pages_discovered', metrics.pagesDiscovered);
  Sentry.setMeasurement('crawl.success_count', metrics.successCount);
  Sentry.setMeasurement('crawl.failed_count', metrics.failedCount);
  Sentry.setMeasurement('crawl.max_depth', metrics.maxDepth);
  Sentry.setMeasurement('crawl.success_rate', (metrics.successCount / metrics.pagesDiscovered) * 100);
  Sentry.setMeasurement('crawl.average_processing_time', metrics.averageProcessingTime);
  Sentry.setMeasurement('crawl.total_cost', metrics.totalCost);

  Sentry.setTag('crawl.job_id', context.crawlJobId);
}

/**
 * Wrapper for extraction operations with Sentry tracing
 */
export const withExtractionTracing = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string
): T => {
  return withSentryTracing(fn, `extraction.${operationName}`, `Extraction pipeline: ${operationName}`) as T;
};

/**
 * Track extraction rate limiting events
 */
export function trackRateLimitHit(context: ExtractionContext, resetTime?: number) {
  Sentry.captureMessage('Firecrawl rate limit hit', {
    level: 'warning',
    tags: {
      component: 'firecrawl-api',
      action: 'rate-limit',
      extraction_version: context.firecrawlVersion,
    },
    extra: {
      url: context.url,
      extractionType: context.extractionType,
      resetTime,
      websiteId: context.websiteId,
    },
  });
}

/**
 * Track extraction cost alerts
 */
export function trackHighCostAlert(
  context: ExtractionContext,
  cost: number,
  threshold: number
) {
  if (cost > threshold) {
    Sentry.captureMessage('High extraction cost detected', {
      level: 'warning',
      tags: {
        component: 'cost-monitoring',
        action: 'high-cost-alert',
      },
      extra: {
        cost,
        threshold,
        url: context.url,
        extractionType: context.extractionType,
        websiteId: context.websiteId,
      },
    });
  }
}

/**
 * Performance monitoring for extraction operations
 */
export class ExtractionPerformanceMonitor {
  private startTime: number;
  private context: ExtractionContext;

  constructor(context: ExtractionContext) {
    this.context = context;
    this.startTime = Date.now();
  }

  finish(metrics: Partial<ExtractionMetrics> = {}) {
    const processingTime = Date.now() - this.startTime;
    
    const fullMetrics: ExtractionMetrics = {
      processingTime,
      fieldsExtracted: metrics.fieldsExtracted || 0,
      totalPossibleFields: metrics.totalPossibleFields || 1,
      dataQualityScore: metrics.dataQualityScore || 0,
      tokenUsage: metrics.tokenUsage,
      costUsd: metrics.costUsd,
    };

    trackExtractionSuccess(this.context, fullMetrics);
    
    return fullMetrics;
  }

  error(error: Error, stage: 'initialization' | 'extraction' | 'parsing' | 'validation' | 'storage') {
    trackExtractionError(error, this.context, stage);
  }
}