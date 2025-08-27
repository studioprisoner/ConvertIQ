// Enhanced Extraction Engine Test Suite
// Phase 4 Testing

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnhancedExtractionEngine } from '../enhanced-extraction-engine';
import type { PageType } from '../types';

// Mock Firecrawl
const mockFirecrawl = {
  extract: vi.fn(),
  scrape: vi.fn(),
};

describe('EnhancedExtractionEngine', () => {
  let engine: EnhancedExtractionEngine;
  let mockPageTypeDetector: any;

  beforeEach(() => {
    // Create engine with mock API key
    engine = new EnhancedExtractionEngine('mock-api-key');
    
    // Replace firecrawl instance with mock
    (engine as any).firecrawl = mockFirecrawl;
    
    // Mock page type detector
    mockPageTypeDetector = {
      detectPageType: vi.fn().mockResolvedValue({
        pageType: 'ecommerce-product',
        confidence: 0.9,
        reasoning: 'AI-powered detection',
        keyIndicators: ['product page']
      })
    };
    (engine as any).pageTypeDetector = mockPageTypeDetector;
    
    vi.clearAllMocks();
  });

  describe('Successful extraction', () => {
    it('should extract structured data for ecommerce product', async () => {
      const mockExtractionResult = {
        success: true,
        data: {
          product: {
            name: 'Test Product',
            price: { current: '$99.99', currency: 'USD' },
            description: 'A great test product',
            features: ['Feature 1', 'Feature 2']
          },
          callsToAction: [
            { text: 'Buy Now', type: 'buy', prominence: 'primary' }
          ],
          socialProof: {
            reviews: [
              { rating: 5, text: 'Great product!', author: 'John Doe' }
            ]
          },
          conversionElements: {
            scarcityIndicators: ['Only 5 left!'],
            urgencyMessages: ['Sale ends today!']
          }
        },
        metadata: {
          totalTokens: 1500,
          promptTokens: 800,
          completionTokens: 700,
          costUsd: 0.05
        }
      };

      mockFirecrawl.extract.mockResolvedValue(mockExtractionResult);

      const result = await engine.extractStructuredData('https://example.com/product/test');

      expect(result).toBeDefined();
      expect(result.structuredData.pageType).toBe('ecommerce-product');
      expect(result.structuredData.confidence).toBe(0.9);
      expect(result.structuredData.data.product.name).toBe('Test Product');
      expect(result.extractionMetrics.tokenUsage.totalTokens).toBe(1500);
      expect(result.extractionMetrics.dataQualityScore).toBeGreaterThan(0);
    });

    it('should handle service landing page extraction', async () => {
      // Mock page type detection for service page
      mockPageTypeDetector.detectPageType.mockResolvedValue({
        pageType: 'service-landing',
        confidence: 0.8,
        reasoning: 'Service page detected',
        keyIndicators: ['service content']
      });

      const mockExtractionResult = {
        success: true,
        data: {
          service: {
            name: 'Web Design Service',
            tagline: 'Professional web design',
            valueProposition: 'We create amazing websites'
          },
          businessInfo: {
            name: 'Design Agency',
            location: 'New York, NY'
          },
          contactInfo: {
            phone: '555-0123',
            email: 'info@agency.com'
          }
        }
      };

      mockFirecrawl.extract.mockResolvedValue(mockExtractionResult);

      const result = await engine.extractStructuredData('https://agency.com/services');

      expect(result.structuredData.pageType).toBe('service-landing');
      expect(result.structuredData.data.service.name).toBe('Web Design Service');
    });
  });

  describe('Error handling and retry logic', () => {
    it('should retry failed extractions', async () => {
      mockFirecrawl.extract
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValue({
          success: true,
          data: { product: { name: 'Success after retries' } }
        });

      const result = await engine.extractStructuredData('https://example.com/product/retry-test');

      expect(mockFirecrawl.extract).toHaveBeenCalledTimes(3);
      expect(result.structuredData.data.product.name).toBe('Success after retries');
    });

    it('should fallback to basic scraping when extraction fails', async () => {
      mockFirecrawl.extract.mockRejectedValue(new Error('Extraction failed'));
      mockFirecrawl.scrape.mockResolvedValue({
        markdown: 'Basic content',
        metadata: { title: 'Fallback Title', description: 'Fallback description' }
      });

      const result = await engine.extractStructuredData('https://example.com/fallback-test');

      expect(result.extractionMetrics.extractionErrors).toHaveLength(1);
      expect(result.rawContent.title).toBe('Fallback Title');
      expect(result.extractionMetrics.dataQualityScore).toBe(0.1);
    });

    it('should create minimal fallback when all methods fail', async () => {
      mockFirecrawl.extract.mockRejectedValue(new Error('Extraction failed'));
      mockFirecrawl.scrape.mockRejectedValue(new Error('Scraping failed'));

      const result = await engine.extractStructuredData('https://example.com/total-failure');

      expect(result.rawContent.title).toBe('Extraction Failed');
      expect(result.extractionMetrics.dataQualityScore).toBe(0.05);
      expect(result.extractionMetrics.extractionErrors).toContain('Complete extraction failure');
    });
  });

  describe('Caching functionality', () => {
    it('should cache extraction results', async () => {
      const mockExtractionResult = {
        success: true,
        data: { product: { name: 'Cached Product' } }
      };

      mockFirecrawl.extract.mockResolvedValue(mockExtractionResult);

      // First call
      await engine.extractStructuredData('https://example.com/cache-test');
      
      // Second call should use cache
      const result = await engine.extractStructuredData('https://example.com/cache-test');

      expect(mockFirecrawl.extract).toHaveBeenCalledTimes(1);
      expect(result.structuredData.data.product.name).toBe('Cached Product');
    });

    it('should clear cache when requested', async () => {
      const mockExtractionResult = {
        success: true,
        data: { product: { name: 'Test Product' } }
      };

      mockFirecrawl.extract.mockResolvedValue(mockExtractionResult);

      // First call
      await engine.extractStructuredData('https://example.com/clear-cache-test');
      
      // Clear cache
      engine.clearCache();
      
      // Second call should not use cache
      await engine.extractStructuredData('https://example.com/clear-cache-test');

      expect(mockFirecrawl.extract).toHaveBeenCalledTimes(2);
    });
  });

  describe('Batch extraction', () => {
    it('should extract multiple URLs in batches', async () => {
      const mockExtractionResult = {
        success: true,
        data: { product: { name: 'Batch Product' } }
      };

      mockFirecrawl.extract.mockResolvedValue(mockExtractionResult);

      const urls = [
        'https://example.com/product/1',
        'https://example.com/product/2',
        'https://example.com/product/3'
      ];

      const results = await engine.extractBatch(urls);

      expect(results.size).toBe(3);
      expect(results.get(urls[0])?.structuredData.data.product.name).toBe('Batch Product');
      expect(mockFirecrawl.extract).toHaveBeenCalledTimes(3);
    });

    it('should handle batch extraction errors gracefully', async () => {
      mockFirecrawl.extract
        .mockResolvedValueOnce({ success: true, data: { product: { name: 'Success' } } })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ success: true, data: { product: { name: 'Success 2' } } });

      mockFirecrawl.scrape.mockResolvedValue({
        markdown: 'Fallback content',
        metadata: { title: 'Fallback' }
      });

      const urls = [
        'https://example.com/success/1',
        'https://example.com/fail/1',
        'https://example.com/success/2'
      ];

      const results = await engine.extractBatch(urls);

      expect(results.size).toBe(3);
      expect(results.get(urls[0])?.structuredData.data.product.name).toBe('Success');
      expect(results.get(urls[1])?.rawContent.title).toBe('Fallback');
      expect(results.get(urls[2])?.structuredData.data.product.name).toBe('Success 2');
    });
  });

  describe('Data validation', () => {
    it('should validate ecommerce data structure', async () => {
      const mockExtractionResult = {
        success: true,
        data: {
          product: 'Invalid - should be object',
          // Missing required fields
        }
      };

      mockFirecrawl.extract.mockResolvedValue(mockExtractionResult);

      const result = await engine.extractStructuredData('https://example.com/invalid-data');

      // Should clean up invalid data
      expect(result.structuredData.data.product).toEqual({});
      expect(result.structuredData.data.callsToAction).toEqual([]);
      expect(result.structuredData.data.socialProof).toEqual({});
      expect(result.structuredData.data.conversionElements).toEqual({});
    });

    it('should validate extraction quality', async () => {
      const mockData = {
        structuredData: {
          pageType: 'ecommerce-product' as PageType,
          confidence: 0.9,
          data: { product: { name: 'Test' } }
        },
        extractionMetrics: {
          processingTime: 5000,
          tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          extractionErrors: [],
          dataQualityScore: 0.8,
          fieldsExtracted: 15,
          totalPossibleFields: 25
        },
        rawContent: {
          markdown: 'content',
          html: '<div>content</div>',
          title: 'Test',
          description: 'Test desc'
        }
      };

      const validation = engine.validateExtractionQuality(mockData);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should identify quality issues', async () => {
      const mockData = {
        structuredData: {
          pageType: 'ecommerce-product' as PageType,
          confidence: 0.1, // Low confidence
          data: {}
        },
        extractionMetrics: {
          processingTime: 35000, // Over timeout
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          extractionErrors: ['Test error'],
          dataQualityScore: 0.1, // Low richness
          fieldsExtracted: 1,
          totalPossibleFields: 25
        },
        rawContent: {
          markdown: '',
          html: '',
          title: '',
          description: ''
        }
      };

      const validation = engine.validateExtractionQuality(mockData);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Engine statistics', () => {
    it('should provide engine statistics', () => {
      const stats = engine.getEngineStats();

      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('totalExtractions');
      expect(stats).toHaveProperty('cacheHitRate');
      expect(typeof stats.cacheSize).toBe('number');
    });
  });
});