// Extraction System Utilities

import type { PageType, ExtractionMetrics, TokenUsage } from './types';

export class ExtractionUtils {
  /**
   * Validates if extraction result meets quality thresholds
   */
  static validateExtractionQuality(
    result: any, 
    confidence: number, 
    minConfidence: number = 0.3
  ): boolean {
    if (confidence < minConfidence) {
      return false;
    }
    
    if (!result || typeof result !== 'object') {
      return false;
    }
    
    // Check if result has meaningful data
    const fieldCount = this.countNonEmptyFields(result);
    return fieldCount > 0;
  }

  /**
   * Recursively counts non-empty fields in an object
   */
  static countNonEmptyFields(obj: any): number {
    if (!obj || typeof obj !== 'object') {
      return 0;
    }
    
    let count = 0;
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          count += value.length > 0 ? 1 : 0;
        } else if (typeof value === 'object') {
          count += this.countNonEmptyFields(value);
        } else {
          count += 1;
        }
      }
    }
    
    return count;
  }

  /**
   * Calculates data richness score based on extraction completeness
   */
  static calculateDataRichness(
    extractedData: any, 
    pageType: PageType
  ): number {
    const fieldsExtracted = this.countNonEmptyFields(extractedData);
    const expectedFields = this.getExpectedFieldCount(pageType);
    
    return expectedFields > 0 ? Math.min(fieldsExtracted / expectedFields, 1.0) : 0;
  }

  /**
   * Returns expected field count for a given page type
   */
  static getExpectedFieldCount(pageType: PageType): number {
    const fieldCounts: Record<PageType, number> = {
      'ecommerce-product': 25,
      'ecommerce-category': 20,
      'service-landing': 30,
      'corporate-homepage': 35,
      'about-us': 20,
      'contact': 15,
      'blog-post': 20,
      'landing-page': 25,
      'pricing': 20,
      'case-study': 22,
      'product-comparison': 28,
    };
    
    return fieldCounts[pageType] || 25;
  }

  /**
   * Sanitizes and validates URL for extraction
   */
  static validateUrl(url: string): { isValid: boolean; sanitizedUrl?: string; error?: string } {
    try {
      const urlObj = new URL(url);
      
      // Check for valid protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { isValid: false, error: 'Invalid protocol. Only HTTP and HTTPS are supported.' };
      }
      
      // Check for valid hostname
      if (!urlObj.hostname || urlObj.hostname.length === 0) {
        return { isValid: false, error: 'Invalid hostname.' };
      }
      
      return { 
        isValid: true, 
        sanitizedUrl: urlObj.toString() 
      };
    } catch (error) {
      return { 
        isValid: false, 
        error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Calculates token usage cost based on provider pricing
   */
  static calculateTokenCost(tokenUsage: TokenUsage, provider: string = 'firecrawl'): number {
    // Firecrawl v2 pricing (approximate)
    const pricePerToken = 0.000001; // $1 per 1M tokens (example)
    
    return tokenUsage.totalTokens * pricePerToken;
  }

  /**
   * Creates extraction metrics object
   */
  static createExtractionMetrics(
    processingTime: number,
    tokenUsage: TokenUsage,
    extractedData: any,
    pageType: PageType,
    errors?: string[]
  ): ExtractionMetrics {
    return {
      processingTime,
      tokenUsage: {
        ...tokenUsage,
        costUsd: this.calculateTokenCost(tokenUsage)
      },
      extractionErrors: errors,
      dataQualityScore: this.calculateDataRichness(extractedData, pageType),
      fieldsExtracted: this.countNonEmptyFields(extractedData),
      totalPossibleFields: this.getExpectedFieldCount(pageType)
    };
  }

  /**
   * Formats extraction results for database storage
   */
  static formatForDatabase(
    result: StructuredPageData,
    metrics: ExtractionMetrics,
    rawResponse: any
  ) {
    return {
      pageType: result.pageType,
      extractionResults: {
        structuredData: result.data,
        rawResponse,
        confidence: result.confidence,
        processingTime: metrics.processingTime
      },
      extractionConfidence: result.confidence,
      dataRichness: metrics.dataQualityScore,
      extractionPrompts: [promptMapping[result.pageType]],
      tokenUsage: metrics.tokenUsage,
      processingMetrics: {
        fieldsExtracted: metrics.fieldsExtracted,
        totalPossibleFields: metrics.totalPossibleFields,
        extractionErrors: metrics.extractionErrors
      }
    };
  }
}