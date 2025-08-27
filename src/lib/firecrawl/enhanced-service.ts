/**
 * Enhanced Firecrawl Service - Phase 2 Implementation
 * 
 * This service provides advanced Firecrawl v2 integration with enhanced features:
 * - Structured data extraction with custom schemas
 * - Batch processing capabilities
 * - Intelligent retry mechanisms
 * - Cost optimization
 * - Rate limiting and error handling
 */

import { Firecrawl } from '@mendable/firecrawl-js';
import { z } from 'zod';
import { extractionConfigurations } from './extraction-schemas';
import type { ExtractConfig } from './extraction-schemas';
// Temporarily commented out to avoid build issues
// import { validateExtractionResults, transformExtractionResults } from './analysis-helpers';
import { config } from '@/config';
import { FIRECRAWL_CONSTANTS } from '@/constants';

// Enhanced types for Firecrawl operations
export interface CrawlOptions {
  maxDepth?: number;
  maxLinks?: number;
  formats?: ('markdown' | 'html' | 'text' | 'extract')[];
  onlyDomain?: boolean;
  timeout?: number;
  includePaths?: string[];
  excludePaths?: string[];
}

export interface ExtractOptions {
  extractionType: 'conversion' | 'seo' | 'technical' | 'ecommerce' | 'leadgen' | 'comprehensive';
  customPrompt?: string;
  customSchema?: any;
  showSources?: boolean;
  timeout?: number;
}

export interface BatchProcessOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  maxRetries?: number;
  onProgress?: (progress: number, current: number, total: number) => void;
  onError?: (error: Error, url: string) => void;
}

export interface FirecrawlMetrics {
  requestCount: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  errorRate: number;
  rateLimitHits: number;
}

export interface EnhancedFirecrawlResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    url?: string;
    tokensUsed?: number;
    cost?: number;
    processingTime: number;
    requestId: string;
    retryCount: number;
    cacheHit?: boolean;
  };
  sources?: Array<{
    url: string;
    title: string;
    excerpt: string;
  }>;
}

/**
 * Enhanced Firecrawl Service with advanced v2 API features
 */
export class EnhancedFirecrawlService {
  private firecrawl: Firecrawl;
  private requestQueue: Map<string, Promise<any>> = new Map();
  private metrics: FirecrawlMetrics = {
    requestCount: 0,
    totalTokens: 0,
    totalCost: 0,
    averageResponseTime: 0,
    errorRate: 0,
    rateLimitHits: 0
  };

  constructor(apiKey?: string) {
    this.firecrawl = new Firecrawl({ 
      apiKey: apiKey || config.firecrawl.apiKey 
    });
  }

  /**
   * Enhanced structured data extraction with custom schemas and intelligent retry
   */
  async extractStructuredData(
    urls: string[], 
    options: ExtractOptions
  ): Promise<EnhancedFirecrawlResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Validate input
    if (!urls.length || urls.length > FIRECRAWL_CONSTANTS.MAX_URLS.EXTRACT) {
      return this.createErrorResult(
        `Invalid URL count: ${urls.length}. Must be 1-${FIRECRAWL_CONSTANTS.MAX_URLS.EXTRACT}`,
        { requestId, processingTime: Date.now() - startTime, retryCount: 0 }
      );
    }

    try {
      // Get extraction configuration
      const extractConfig = this.getExtractionConfig(options);
      
      // Perform extraction with retry logic
      const result = await this.executeWithRetry(async () => {
        return await this.firecrawl.extract({
          urls,
          prompt: extractConfig.prompt + (options.customPrompt ? `\n\nAdditional instructions: ${options.customPrompt}` : ''),
          schema: options.customSchema || extractConfig.schema,
          showSources: options.showSources ?? true,
          timeout: options.timeout || FIRECRAWL_CONSTANTS.TIMEOUTS.EXTRACT
        });
      }, 3);

      // Update metrics
      this.updateMetrics(startTime, result);

      // Validate and transform results
      // TODO: Re-enable validation once schema issues are resolved
      // const validation = validateExtractionResults(result.data);
      // if (!validation.isValid) {
      //   console.warn('Extraction validation warnings:', validation.errors);
      // }

      return {
        success: true,
        data: result.data, // Direct return for now
        metadata: {
          tokensUsed: result.tokensUsed,
          cost: result.cost,
          processingTime: Date.now() - startTime,
          requestId,
          retryCount: 0
        },
        sources: result.sources
      };

    } catch (error) {
      this.metrics.errorRate = (this.metrics.errorRate * this.metrics.requestCount + 1) / (this.metrics.requestCount + 1);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown extraction error',
        { requestId, processingTime: Date.now() - startTime, retryCount: 0 }
      );
    }
  }

  /**
   * Enhanced batch scraping with intelligent batching and progress tracking
   */
  async batchScrapeWithAnalysis(
    urls: string[], 
    options: BatchProcessOptions = {}
  ): Promise<EnhancedFirecrawlResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    const {
      batchSize = FIRECRAWL_CONSTANTS.BATCH_SIZE.OPTIMAL,
      delayBetweenBatches = 1000,
      maxRetries = 3,
      onProgress,
      onError
    } = options;

    if (urls.length > FIRECRAWL_CONSTANTS.MAX_URLS.BATCH_SCRAPE) {
      return this.createErrorResult(
        `Too many URLs: ${urls.length}. Maximum allowed: ${FIRECRAWL_CONSTANTS.MAX_URLS.BATCH_SCRAPE}`,
        { requestId, processingTime: Date.now() - startTime, retryCount: 0 }
      );
    }

    try {
      const results: any[] = [];
      const batches = this.createBatches(urls, batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        try {
          const batchResult = await this.executeWithRetry(async () => {
            return await this.firecrawl.batchScrape(batch, {
              formats: ['markdown', 'extract'],
              pageOptions: {
                onlyMainContent: true,
                includeLinks: true,
                includeImages: true
              }
            });
          }, maxRetries);

          results.push(...batchResult.data);
          
          // Progress callback
          const progress = ((i + 1) / batches.length) * 100;
          onProgress?.(progress, i + 1, batches.length);

        } catch (error) {
          batch.forEach(url => onError?.(error as Error, url));
        }

        // Delay between batches to respect rate limits
        if (i < batches.length - 1) {
          await this.delay(delayBetweenBatches);
        }
      }

      this.updateMetrics(startTime, { data: results });

      return {
        success: true,
        data: results,
        metadata: {
          processingTime: Date.now() - startTime,
          requestId,
          retryCount: 0
        }
      };

    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Batch scraping failed',
        { requestId, processingTime: Date.now() - startTime, retryCount: 0 }
      );
    }
  }

  /**
   * Enhanced website crawling with comprehensive mapping and discovery
   */
  async crawlWebsiteComplete(
    baseUrl: string, 
    options: CrawlOptions = {}
  ): Promise<EnhancedFirecrawlResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const crawlResult = await this.executeWithRetry(async () => {
        return await this.firecrawl.crawl(baseUrl, {
          maxDepth: options.maxDepth || 3,
          maxLinks: options.maxLinks || 100,
          onlyDomain: options.onlyDomain ?? true,
          formats: options.formats || ['markdown', 'extract'],
          pageOptions: {
            onlyMainContent: true
          },
          includePaths: options.includePaths,
          excludePaths: options.excludePaths || [
            '/admin/*',
            '/wp-admin/*',
            '/wp-login.php',
            '*.pdf',
            '*.doc',
            '*.docx'
          ],
          timeout: options.timeout || FIRECRAWL_CONSTANTS.TIMEOUTS.CRAWL
        });
      }, 3);

      this.updateMetrics(startTime, crawlResult);

      // Enhanced crawl data with analysis
      const enhancedData = {
        ...crawlResult.data,
        summary: {
          totalPages: crawlResult.data.length,
          uniqueDomains: [...new Set(crawlResult.data.map((page: any) => new URL(page.url).hostname))],
          pageTypes: this.analyzePageTypes(crawlResult.data),
          depthDistribution: this.analyzeDepthDistribution(crawlResult.data),
          contentTypes: this.analyzeContentTypes(crawlResult.data)
        }
      };

      return {
        success: true,
        data: enhancedData,
        metadata: {
          tokensUsed: crawlResult.tokensUsed,
          cost: crawlResult.cost,
          processingTime: Date.now() - startTime,
          requestId,
          retryCount: 0
        }
      };

    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Website crawling failed',
        { requestId, processingTime: Date.now() - startTime, retryCount: 0 }
      );
    }
  }

  /**
   * Get current service metrics
   */
  getMetrics(): FirecrawlMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset service metrics
   */
  resetMetrics(): void {
    this.metrics = {
      requestCount: 0,
      totalTokens: 0,
      totalCost: 0,
      averageResponseTime: 0,
      errorRate: 0,
      rateLimitHits: 0
    };
  }

  // Private helper methods

  private getExtractionConfig(options: ExtractOptions): ExtractConfig {
    if (options.customSchema && options.customPrompt) {
      return {
        schema: options.customSchema,
        prompt: options.customPrompt
      };
    }

    switch (options.extractionType) {
      case 'conversion':
        return extractionConfigurations.conversionAudit;
      case 'seo':
        return extractionConfigurations.technicalSeoAudit;
      case 'ecommerce':
        return extractionConfigurations.ecommerceAnalysis;
      case 'leadgen':
        return extractionConfigurations.leadGenAudit;
      case 'comprehensive':
      default:
        return extractionConfigurations.comprehensive;
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if it's a rate limit error
        if (this.isRateLimitError(lastError)) {
          this.metrics.rateLimitHits++;
          const delay = backoffMs * Math.pow(2, attempt);
          await this.delay(delay);
          continue;
        }

        // If not a retryable error, throw immediately
        if (!this.isRetryableError(lastError)) {
          throw lastError;
        }

        // Wait before retry with exponential backoff
        if (attempt < maxRetries) {
          await this.delay(backoffMs * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private generateRequestId(): string {
    return `fc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createErrorResult(error: string, metadata: Partial<EnhancedFirecrawlResult['metadata']>): EnhancedFirecrawlResult {
    return {
      success: false,
      error,
      metadata: {
        processingTime: 0,
        requestId: '',
        retryCount: 0,
        ...metadata
      }
    };
  }

  private updateMetrics(startTime: number, result: any): void {
    this.metrics.requestCount++;
    this.metrics.totalTokens += result.tokensUsed || 0;
    this.metrics.totalCost += result.cost || 0;
    
    const processingTime = Date.now() - startTime;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.requestCount - 1) + processingTime) / this.metrics.requestCount;
  }

  private isRateLimitError(error: Error): boolean {
    return error.message.includes('rate limit') || error.message.includes('429');
  }

  private isRetryableError(error: Error): boolean {
    const retryableStatusCodes = ['429', '500', '502', '503', '504'];
    return retryableStatusCodes.some(code => error.message.includes(code));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private analyzePageTypes(pages: any[]): Record<string, number> {
    const types: Record<string, number> = {};
    
    pages.forEach(page => {
      const url = new URL(page.url);
      const path = url.pathname.toLowerCase();
      
      let type = 'other';
      if (path === '/' || path === '') type = 'homepage';
      else if (path.includes('/about')) type = 'about';
      else if (path.includes('/product') || path.includes('/shop')) type = 'product';
      else if (path.includes('/contact')) type = 'contact';
      else if (path.includes('/blog') || path.includes('/news')) type = 'blog';
      else if (path.includes('/service')) type = 'service';
      
      types[type] = (types[type] || 0) + 1;
    });

    return types;
  }

  private analyzeDepthDistribution(pages: any[]): Record<number, number> {
    const distribution: Record<number, number> = {};
    
    pages.forEach(page => {
      const depth = (page.url.split('/').length - 3); // Subtract protocol and domain parts
      distribution[depth] = (distribution[depth] || 0) + 1;
    });

    return distribution;
  }

  private analyzeContentTypes(pages: any[]): Record<string, number> {
    const types: Record<string, number> = {};
    
    pages.forEach(page => {
      if (page.markdown && page.markdown.length > 500) {
        types['long-form'] = (types['long-form'] || 0) + 1;
      } else if (page.markdown && page.markdown.length > 100) {
        types['medium-form'] = (types['medium-form'] || 0) + 1;
      } else {
        types['short-form'] = (types['short-form'] || 0) + 1;
      }
      
      if (page.metadata?.images?.length > 5) {
        types['image-heavy'] = (types['image-heavy'] || 0) + 1;
      }
      
      if (page.metadata?.title?.toLowerCase().includes('product')) {
        types['product-page'] = (types['product-page'] || 0) + 1;
      }
    });

    return types;
  }
}

// Singleton instance for application-wide use
export const firecrawlService = new EnhancedFirecrawlService();