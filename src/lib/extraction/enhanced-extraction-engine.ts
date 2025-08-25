// Enhanced Extraction Engine
// Phase 4 Implementation

import { Firecrawl } from '@mendable/firecrawl-js';
import type { 
  PageType, 
  PageTypeResult, 
  StructuredPageData, 
  ExtractionConfig,
  ExtractionMetrics,
  TokenUsage
} from './types';
import { IntelligentPageTypeDetector } from './detectors/page-type-detector';
import { schemaMapping } from './schemas';
import { promptMapping } from './prompts';
import { extractionConfig } from './config';
import { ExtractionProcessor } from './processors/extraction-processor';
import { extractionMonitor, type ExtractionEvent } from './performance/extraction-monitor';

export interface ExtractedData {
  structuredData: StructuredPageData;
  extractionMetrics: ExtractionMetrics;
  rawContent: {
    markdown: string;
    html: string;
    title: string;
    description: string;
  };
}

export class EnhancedExtractionEngine {
  private firecrawl: Firecrawl;
  private pageTypeDetector: IntelligentPageTypeDetector;
  private extractionCache: Map<string, { data: ExtractedData; timestamp: number }> = new Map();

  constructor(firecrawlApiKey: string) {
    this.firecrawl = new Firecrawl({ apiKey: firecrawlApiKey });
    this.pageTypeDetector = new IntelligentPageTypeDetector(this.firecrawl);
  }

  /**
   * Main extraction method - detects page type and extracts structured data
   */
  async extractStructuredData(url: string): Promise<ExtractedData> {
    const startTime = Date.now();
    let pageTypeResult: any;
    let success = false;
    let cacheHit = false;
    
    try {
      // Check cache first
      const cached = this.getCachedExtraction(url);
      if (cached) {
        cacheHit = true;
        // Record cache hit event
        this.recordExtractionEvent(url, cached.structuredData.pageType, startTime, true, cached.extractionMetrics.tokenUsage, cached.extractionMetrics.dataQualityScore, [], cacheHit);
        return cached;
      }

      // 1. Get initial content for page type detection
      console.log(`Starting enhanced extraction for: ${url}`);
      
      // 2. Detect page type
      pageTypeResult = await this.pageTypeDetector.detectPageType(url);
      console.log(`Detected page type: ${pageTypeResult.pageType} (confidence: ${pageTypeResult.confidence})`);

      // 3. Get extraction configuration for detected page type
      const extractionConfigLocal = this.getExtractionConfig(pageTypeResult.pageType);

      // 4. Extract structured data using page-specific schema and prompt
      const extractResult = await this.performExtraction(url, extractionConfigLocal);

      // 5. Post-process and validate results
      const processedData = await this.processExtractionResult(
        extractResult, 
        pageTypeResult, 
        startTime
      );

      // 6. Cache the results
      this.cacheExtraction(url, processedData);

      success = true;
      
      // Record successful extraction event
      this.recordExtractionEvent(
        url, 
        pageTypeResult.pageType, 
        startTime, 
        success, 
        processedData.extractionMetrics.tokenUsage, 
        processedData.extractionMetrics.dataQualityScore, 
        [], 
        cacheHit
      );

      return processedData;

    } catch (error) {
      console.error(`Enhanced extraction failed for ${url}:`, error);
      
      // Record failed extraction event
      this.recordExtractionEvent(
        url, 
        pageTypeResult?.pageType || 'corporate-homepage', 
        startTime, 
        false, 
        { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, 
        0, 
        [error instanceof Error ? error.message : 'Unknown error'], 
        cacheHit
      );
      
      // Return fallback extraction result
      return this.createFallbackExtraction(url, error, startTime);
    }
  }

  /**
   * Get extraction configuration (schema + prompt) for page type
   */
  private getExtractionConfig(pageType: PageType): ExtractionConfig {
    const schema = schemaMapping[pageType] || schemaMapping['corporate-homepage'];
    const prompt = promptMapping[pageType] || promptMapping['corporate-homepage'];

    return { schema, prompt };
  }

  /**
   * Perform the actual Firecrawl extraction
   */
  private async performExtraction(url: string, config: ExtractionConfig) {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= extractionConfig.maxRetries; attempt++) {
      try {
        console.log(`Extraction attempt ${attempt}/${extractionConfig.maxRetries} for ${url}`);
        
        const result = await this.firecrawl.extract({
          urls: [url],
          prompt: config.prompt,
          schema: config.schema,
          timeout: extractionConfig.timeoutMs,
          ...extractionConfig.firecrawlOptions
        });

        if (result.success && result.data) {
          return result;
        } else {
          throw new Error(`Extraction failed: ${result.error || 'Unknown error'}`);
        }

      } catch (error) {
        lastError = error as Error;
        console.warn(`Extraction attempt ${attempt} failed:`, error);
        
        // Wait before retry (exponential backoff)
        if (attempt < extractionConfig.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All extraction attempts failed');
  }

  /**
   * Process and validate extraction results
   */
  private async processExtractionResult(
    extractResult: any,
    pageTypeResult: PageTypeResult,
    startTime: number
  ): Promise<ExtractedData> {
    const processingTime = Date.now() - startTime;
    const data = Array.isArray(extractResult.data) ? extractResult.data[0] : extractResult.data;

    // Create structured page data
    const structuredData: StructuredPageData = {
      pageType: pageTypeResult.pageType,
      confidence: pageTypeResult.confidence,
      data: this.validateAndCleanData(data, pageTypeResult.pageType)
    };

    // Calculate data richness
    const dataRichness = this.calculateDataRichness(structuredData);

    // Extract metadata from the response
    const tokenUsage: TokenUsage = {
      promptTokens: extractResult.metadata?.promptTokens || 0,
      completionTokens: extractResult.metadata?.completionTokens || 0,
      totalTokens: extractResult.metadata?.totalTokens || 0,
      costUsd: extractResult.metadata?.costUsd || 0
    };

    const extractionMetrics: ExtractionMetrics = {
      processingTime,
      tokenUsage,
      extractionErrors: [],
      dataQualityScore: dataRichness,
      fieldsExtracted: this.countExtractedFields(data),
      totalPossibleFields: this.getTotalPossibleFields(pageTypeResult.pageType)
    };

    // Get raw content if available
    const rawContent = {
      markdown: extractResult.metadata?.markdown || '',
      html: extractResult.metadata?.html || '',
      title: data?.title || data?.name || 'Untitled',
      description: data?.description || data?.tagline || ''
    };

    return {
      structuredData,
      extractionMetrics,
      rawContent
    };
  }

  /**
   * Validate and clean extracted data based on page type
   */
  private validateAndCleanData(data: any, pageType: PageType): any {
    if (!data || typeof data !== 'object') {
      return {};
    }

    // Use ExtractionProcessor for comprehensive validation and cleaning
    const processingResult = ExtractionProcessor.processExtractionData(data, pageType, 0.8);
    
    return processingResult.cleanedData;
  }


  /**
   * Calculate data richness score
   */
  private calculateDataRichness(structuredData: StructuredPageData): number {
    const extractedFields = this.countExtractedFields(structuredData.data);
    const totalFields = this.getTotalPossibleFields(structuredData.pageType);
    
    return totalFields > 0 ? extractedFields / totalFields : 0;
  }

  /**
   * Count non-null/non-empty fields in extracted data
   */
  private countExtractedFields(data: any): number {
    if (!data || typeof data !== 'object') return 0;
    
    let count = 0;
    
    const countFields = (obj: any): void => {
      if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
          if (obj.length > 0) count++;
          obj.forEach(item => countFields(item));
        } else {
          Object.values(obj).forEach(value => {
            if (value !== null && value !== undefined && value !== '') {
              if (typeof value === 'object') {
                countFields(value);
              } else {
                count++;
              }
            }
          });
        }
      } else if (obj !== null && obj !== undefined && obj !== '') {
        count++;
      }
    };

    countFields(data);
    return count;
  }

  /**
   * Get total possible fields for a page type (for richness calculation)
   */
  private getTotalPossibleFields(pageType: PageType): number {
    const fieldCounts: Record<PageType, number> = {
      'ecommerce-product': 25,
      'ecommerce-category': 15,
      'service-landing': 30,
      'corporate-homepage': 35,
      'about-us': 20,
      'contact': 15,
      'blog-post': 25,
      'landing-page': 20,
      'pricing': 20,
      'case-study': 25,
      'product-comparison': 20
    };

    return fieldCounts[pageType] || 20;
  }

  /**
   * Create fallback extraction when main extraction fails
   */
  private async createFallbackExtraction(
    url: string, 
    error: any, 
    startTime: number
  ): Promise<ExtractedData> {
    console.log(`Creating fallback extraction for ${url}`);
    
    try {
      // Try basic scraping as fallback
      const basicScrape = await this.firecrawl.scrape(url, {
        formats: ['markdown'],
        pageOptions: { onlyMainContent: true }
      });

      const processingTime = Date.now() - startTime;
      
      // Basic page type detection using URL patterns only
      const fallbackPageType = await this.pageTypeDetector.detectPageType(url);

      const structuredData: StructuredPageData = {
        pageType: fallbackPageType.pageType,
        confidence: fallbackPageType.confidence,
        data: {
          title: basicScrape.metadata?.title || 'Unknown',
          description: basicScrape.metadata?.description || '',
          url: url
        }
      };

      const extractionMetrics: ExtractionMetrics = {
        processingTime,
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        extractionErrors: [error?.message || 'Unknown extraction error'],
        dataQualityScore: 0.1, // Low quality fallback
        fieldsExtracted: 3, // title, description, url
        totalPossibleFields: this.getTotalPossibleFields(fallbackPageType.pageType)
      };

      return {
        structuredData,
        extractionMetrics,
        rawContent: {
          markdown: basicScrape.markdown || '',
          html: basicScrape.html || '',
          title: basicScrape.metadata?.title || 'Unknown',
          description: basicScrape.metadata?.description || ''
        }
      };

    } catch (fallbackError) {
      console.error(`Fallback extraction also failed for ${url}:`, fallbackError);
      
      // Final fallback - minimal data
      return this.createMinimalFallback(url, startTime);
    }
  }

  /**
   * Create minimal fallback when all extraction methods fail
   */
  private createMinimalFallback(url: string, startTime: number): ExtractedData {
    const processingTime = Date.now() - startTime;
    
    const structuredData: StructuredPageData = {
      pageType: 'corporate-homepage',
      confidence: 0.1,
      data: { url }
    };

    const extractionMetrics: ExtractionMetrics = {
      processingTime,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      extractionErrors: ['Complete extraction failure'],
      dataQualityScore: 0.05,
      fieldsExtracted: 1,
      totalPossibleFields: 20
    };

    return {
      structuredData,
      extractionMetrics,
      rawContent: {
        markdown: '',
        html: '',
        title: 'Extraction Failed',
        description: 'Unable to extract content from this URL'
      }
    };
  }

  /**
   * Cache extraction results
   */
  private cacheExtraction(url: string, data: ExtractedData): void {
    const expirationTime = Date.now() + (extractionConfig.cacheExpirationHours * 60 * 60 * 1000);
    this.extractionCache.set(url, { data, timestamp: expirationTime });
    
    // Clean up expired cache entries
    this.cleanupExpiredCache();
  }

  /**
   * Get cached extraction if available and not expired
   */
  private getCachedExtraction(url: string): ExtractedData | null {
    const cached = this.extractionCache.get(url);
    
    if (cached && cached.timestamp > Date.now()) {
      console.log(`Using cached extraction for ${url}`);
      return cached.data;
    }
    
    if (cached) {
      this.extractionCache.delete(url); // Remove expired cache
    }
    
    return null;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    
    for (const [url, cached] of this.extractionCache.entries()) {
      if (cached.timestamp <= now) {
        this.extractionCache.delete(url);
      }
    }
  }

  /**
   * Validate extraction result quality
   */
  validateExtractionQuality(data: ExtractedData): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check confidence threshold
    if (data.structuredData.confidence < extractionConfig.minConfidenceScore) {
      issues.push(`Low page type detection confidence: ${data.structuredData.confidence}`);
      recommendations.push('Consider manual page type specification for better extraction');
    }

    // Check data richness
    if (data.extractionMetrics.dataQualityScore < extractionConfig.minDataRichness) {
      issues.push(`Low data richness: ${data.extractionMetrics.dataQualityScore}`);
      recommendations.push('Page may need content improvements for better extraction');
    }

    // Check processing time
    if (data.extractionMetrics.processingTime > extractionConfig.timeoutMs) {
      issues.push('Extraction took longer than expected');
      recommendations.push('Consider caching or pre-processing for this URL');
    }

    // Check for extraction errors
    if (data.extractionMetrics.extractionErrors && data.extractionMetrics.extractionErrors.length > 0) {
      issues.push(`Extraction errors: ${data.extractionMetrics.extractionErrors.join(', ')}`);
      recommendations.push('Review URL accessibility and content structure');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Get extraction engine statistics
   */
  getEngineStats(): {
    cacheSize: number;
    totalExtractions: number;
    cacheHitRate: number;
  } {
    return {
      cacheSize: this.extractionCache.size,
      totalExtractions: 0, // Would track this in production
      cacheHitRate: 0 // Would calculate based on hits vs misses
    };
  }

  /**
   * Clear all cached extractions
   */
  clearCache(): void {
    this.extractionCache.clear();
    console.log('Extraction cache cleared');
  }

  /**
   * Extract data from multiple URLs in batch
   */
  async extractBatch(urls: string[]): Promise<Map<string, ExtractedData>> {
    const results = new Map<string, ExtractedData>();
    const batches = this.createBatches(urls, extractionConfig.batchSize);

    for (const batch of batches) {
      const batchPromises = batch.map(async (url) => {
        try {
          const result = await this.extractStructuredData(url);
          results.set(url, result);
        } catch (error) {
          console.error(`Batch extraction failed for ${url}:`, error);
          // Store error result
          const errorResult = this.createMinimalFallback(url, Date.now());
          results.set(url, errorResult);
        }
      });

      // Process batch with concurrency limit
      await Promise.allSettled(batchPromises);
      
      // Add delay between batches to respect rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Create batches for processing URLs
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Record extraction event for performance monitoring
   */
  private recordExtractionEvent(
    url: string,
    pageType: PageType,
    startTime: number,
    success: boolean,
    tokenUsage: TokenUsage,
    dataQuality: number,
    errors: string[],
    cacheHit: boolean
  ): void {
    const event: ExtractionEvent = {
      url,
      pageType,
      timestamp: startTime,
      success,
      processingTime: Date.now() - startTime,
      tokenUsage,
      dataQuality,
      errors: errors.length > 0 ? errors : undefined,
      cacheHit
    };

    extractionMonitor.recordExtraction(event);
  }

  /**
   * Get performance metrics from monitor
   */
  getPerformanceMetrics(): ReturnType<typeof extractionMonitor.getPerformanceMetrics> {
    return extractionMonitor.getPerformanceMetrics();
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport(): ReturnType<typeof extractionMonitor.generatePerformanceReport> {
    return extractionMonitor.generatePerformanceReport();
  }
}