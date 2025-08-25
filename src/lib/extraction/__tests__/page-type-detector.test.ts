// Page Type Detector Test Suite
// Phase 2 Testing & Validation

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntelligentPageTypeDetector } from '../detectors/page-type-detector';
import type { PageType, PageTypeResult } from '../types';

// Mock Firecrawl
const mockFirecrawl = {
  extract: vi.fn(),
};

describe('IntelligentPageTypeDetector', () => {
  let detector: IntelligentPageTypeDetector;

  beforeEach(() => {
    detector = new IntelligentPageTypeDetector(mockFirecrawl as any);
    vi.clearAllMocks();
  });

  describe('AI-powered detection', () => {
    it('should detect ecommerce product page', async () => {
      mockFirecrawl.extract.mockResolvedValue({
        success: true,
        data: {
          pageType: 'ecommerce-product',
          confidence: 0.9,
          reasoning: 'Page contains product information, pricing, and buy buttons',
          keyIndicators: ['product name', 'price display', 'add to cart button']
        }
      });

      const result = await detector.detectPageType('https://example.com/product/shoes');
      
      expect(result.pageType).toBe('ecommerce-product');
      expect(result.confidence).toBe(0.9);
      expect(result.reasoning).toContain('product information');
      expect(mockFirecrawl.extract).toHaveBeenCalledWith({
        urls: ['https://example.com/product/shoes'],
        prompt: expect.stringContaining('Analyze this webpage'),
        schema: expect.objectContaining({
          type: 'object',
          properties: expect.objectContaining({
            pageType: expect.objectContaining({
              enum: expect.arrayContaining(['ecommerce-product'])
            })
          })
        }),
        timeout: expect.any(Number)
      });
    });

    it('should detect service landing page', async () => {
      mockFirecrawl.extract.mockResolvedValue({
        success: true,
        data: {
          pageType: 'service-landing',
          confidence: 0.85,
          reasoning: 'Page focuses on service offerings with lead generation forms',
          keyIndicators: ['service description', 'contact form', 'testimonials']
        }
      });

      const result = await detector.detectPageType('https://example.com/services/plumbing');
      
      expect(result.pageType).toBe('service-landing');
      expect(result.confidence).toBe(0.85);
    });

    it('should handle extraction failures gracefully', async () => {
      mockFirecrawl.extract.mockResolvedValue({
        success: false,
        error: 'API rate limit exceeded'
      });

      const result = await detector.detectPageType('https://example.com/unknown');
      
      // Should fallback to URL-based detection
      expect(result.pageType).toBe('corporate-homepage');
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.reasoning).toContain('fallback');
    });

    it('should handle extraction errors gracefully', async () => {
      mockFirecrawl.extract.mockRejectedValue(new Error('Network error'));

      const result = await detector.detectPageType('https://example.com/contact');
      
      // Should fallback to URL-based detection
      expect(result.pageType).toBe('contact');
      expect(result.confidence).toBe(0.8);
      expect(result.reasoning).toContain('contact path indicators');
    });
  });

  describe('Fallback URL-based detection', () => {
    const testCases: Array<{
      url: string;
      expectedType: PageType;
      expectedConfidence: number;
      description: string;
    }> = [
      // E-commerce URLs
      {
        url: 'https://shop.example.com/product/wireless-headphones',
        expectedType: 'ecommerce-product',
        expectedConfidence: 0.7,
        description: 'Product page with clear product path'
      },
      {
        url: 'https://store.example.com/category/electronics',
        expectedType: 'ecommerce-category',
        expectedConfidence: 0.6,
        description: 'Category page with category path'
      },
      {
        url: 'https://example.com/shop/clothing',
        expectedType: 'ecommerce-category',
        expectedConfidence: 0.6,
        description: 'Shop category page'
      },
      
      // Service business URLs
      {
        url: 'https://example.com/services/web-design',
        expectedType: 'service-landing',
        expectedConfidence: 0.7,
        description: 'Service landing page'
      },
      {
        url: 'https://plumber.com/solutions/emergency-repair',
        expectedType: 'service-landing',
        expectedConfidence: 0.7,
        description: 'Solutions page'
      },
      
      // Corporate pages
      {
        url: 'https://example.com/about-us',
        expectedType: 'about-us',
        expectedConfidence: 0.8,
        description: 'About us page'
      },
      {
        url: 'https://company.com/team',
        expectedType: 'about-us',
        expectedConfidence: 0.8,
        description: 'Team page'
      },
      {
        url: 'https://example.com/contact-us',
        expectedType: 'contact',
        expectedConfidence: 0.8,
        description: 'Contact page'
      },
      
      // Content pages
      {
        url: 'https://blog.example.com/article/how-to-optimize-conversions',
        expectedType: 'blog-post',
        expectedConfidence: 0.7,
        description: 'Blog article'
      },
      {
        url: 'https://example.com/news/company-announcement',
        expectedType: 'blog-post',
        expectedConfidence: 0.7,
        description: 'News article'
      },
      
      // Pricing pages
      {
        url: 'https://saas.com/pricing',
        expectedType: 'pricing',
        expectedConfidence: 0.8,
        description: 'Pricing page'
      },
      {
        url: 'https://service.com/plans-and-packages',
        expectedType: 'pricing',
        expectedConfidence: 0.8,
        description: 'Plans page'
      },
      
      // Case studies
      {
        url: 'https://agency.com/case-studies/client-success',
        expectedType: 'case-study',
        expectedConfidence: 0.7,
        description: 'Case study page'
      },
      {
        url: 'https://example.com/portfolio/project-showcase',
        expectedType: 'case-study',
        expectedConfidence: 0.7,
        description: 'Portfolio page'
      },
      
      // Comparison pages
      {
        url: 'https://software.com/compare/plan-a-vs-plan-b',
        expectedType: 'product-comparison',
        expectedConfidence: 0.6,
        description: 'Comparison page'
      },
      
      // Landing pages
      {
        url: 'https://example.com/landing/summer-sale',
        expectedType: 'landing-page',
        expectedConfidence: 0.6,
        description: 'Campaign landing page'
      },
      {
        url: 'https://promo.example.com/special-offer',
        expectedType: 'landing-page',
        expectedConfidence: 0.6,
        description: 'Promotional page'
      },
      
      // Homepage patterns
      {
        url: 'https://example.com/',
        expectedType: 'corporate-homepage',
        expectedConfidence: 0.6,
        description: 'Root domain homepage'
      },
      {
        url: 'https://company.com/home',
        expectedType: 'corporate-homepage',
        expectedConfidence: 0.6,
        description: 'Home page'
      },
      
      // Unknown patterns
      {
        url: 'https://example.com/some-random-page',
        expectedType: 'corporate-homepage',
        expectedConfidence: 0.3,
        description: 'Unknown pattern defaults to homepage'
      },
    ];

    testCases.forEach(({ url, expectedType, expectedConfidence, description }) => {
      it(`should detect ${expectedType} for ${description}`, async () => {
        // Mock extraction to fail so it uses fallback
        mockFirecrawl.extract.mockRejectedValue(new Error('Mock fallback test'));

        const result = await detector.detectPageType(url);
        
        expect(result.pageType).toBe(expectedType);
        expect(result.confidence).toBe(expectedConfidence);
        expect(result.reasoning).toBeDefined();
        expect(result.keyIndicators).toBeDefined();
        expect(Array.isArray(result.keyIndicators)).toBe(true);
      });
    });
  });

  describe('Result validation', () => {
    it('should validate correct detection results', () => {
      const validResult: PageTypeResult = {
        pageType: 'ecommerce-product',
        confidence: 0.8,
        reasoning: 'Valid reasoning',
        keyIndicators: ['product info']
      };

      expect(detector.validateDetectionResult(validResult)).toBe(true);
    });

    it('should reject invalid page types', () => {
      const invalidResult: PageTypeResult = {
        pageType: 'invalid-type' as PageType,
        confidence: 0.8,
        reasoning: 'Valid reasoning'
      };

      expect(detector.validateDetectionResult(invalidResult)).toBe(false);
    });

    it('should reject invalid confidence scores', () => {
      const invalidConfidenceHigh: PageTypeResult = {
        pageType: 'ecommerce-product',
        confidence: 1.5, // Invalid: > 1
        reasoning: 'Valid reasoning'
      };

      const invalidConfidenceLow: PageTypeResult = {
        pageType: 'ecommerce-product', 
        confidence: -0.1, // Invalid: < 0
        reasoning: 'Valid reasoning'
      };

      expect(detector.validateDetectionResult(invalidConfidenceHigh)).toBe(false);
      expect(detector.validateDetectionResult(invalidConfidenceLow)).toBe(false);
    });

    it('should reject empty reasoning', () => {
      const emptyReasoning: PageTypeResult = {
        pageType: 'ecommerce-product',
        confidence: 0.8,
        reasoning: '' // Invalid: empty
      };

      expect(detector.validateDetectionResult(emptyReasoning)).toBe(false);
    });
  });

  describe('Confidence threshold', () => {
    it('should return configured confidence threshold', () => {
      const threshold = detector.getConfidenceThreshold();
      expect(typeof threshold).toBe('number');
      expect(threshold).toBeGreaterThanOrEqual(0);
      expect(threshold).toBeLessThanOrEqual(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle malformed URLs gracefully', async () => {
      mockFirecrawl.extract.mockRejectedValue(new Error('Invalid URL'));

      // This will throw in the fallback method when creating URL object
      await expect(detector.detectPageType('not-a-valid-url')).rejects.toThrow();
    });

    it('should handle empty URLs', async () => {
      mockFirecrawl.extract.mockRejectedValue(new Error('Empty URL'));

      await expect(detector.detectPageType('')).rejects.toThrow();
    });

    it('should handle network timeouts', async () => {
      mockFirecrawl.extract.mockRejectedValue(new Error('Timeout'));

      const result = await detector.detectPageType('https://example.com/services');
      
      // Should fallback to URL-based detection
      expect(result.pageType).toBe('service-landing');
      expect(result.confidence).toBe(0.7);
    });

    it('should clamp confidence scores to valid range', async () => {
      mockFirecrawl.extract.mockResolvedValue({
        success: true,
        data: {
          pageType: 'ecommerce-product',
          confidence: 1.5, // Invalid: will be clamped to 1.0
          reasoning: 'High confidence detection'
        }
      });

      const result = await detector.detectPageType('https://example.com/product/test');
      
      expect(result.confidence).toBe(1.0); // Clamped to max value
    });
  });
});