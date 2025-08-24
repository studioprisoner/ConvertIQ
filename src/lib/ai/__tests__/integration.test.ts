import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicAnalysisProvider } from '../providers/anthropic';
import type { CrawlResult } from '../../crawler/types';
import type { ExtractionResults } from '../../../db/schema/analyses';

// AI SDK and Anthropic SDK are mocked in test setup

describe('AI SDK v5 Integration Tests', () => {
  let provider: AnthropicAnalysisProvider;
  
  // Test URLs for regression testing
  const testUrls: CrawlResult[] = [
    {
      url: 'https://example-ecommerce.com',
      statusCode: 200,
      htmlAnalysis: {
        title: 'Premium E-commerce Store - Best Products Online',
        description: 'Shop the latest products with fast shipping and great customer service.',
        content: 'Welcome to our store! We offer premium products with free shipping on orders over $50. Customer reviews: 4.9/5 stars from 1000+ customers. Limited time offer: 20% off everything!',
        headings: ['Premium Products', 'Customer Reviews', 'Special Offers', 'Free Shipping'],
        images: ['product1.jpg', 'customer-testimonial.jpg', 'shipping-icon.jpg'],
        links: ['https://example-ecommerce.com/products', 'https://example-ecommerce.com/reviews'],
      },
    },
    {
      url: 'https://example-service.com',
      statusCode: 200,
      htmlAnalysis: {
        title: 'Professional Consulting Services | Expert Solutions',
        description: 'Get expert consulting services from industry professionals with 10+ years experience.',
        content: 'Our team of certified consultants helps businesses grow. Contact us today for a free consultation. Case studies show 300% ROI improvement. Trusted by Fortune 500 companies.',
        headings: ['Expert Consultants', 'Proven Results', 'Free Consultation', 'Case Studies'],
        images: ['team-photo.jpg', 'case-study-results.jpg', 'certifications.jpg'],
        links: ['https://example-service.com/services', 'https://example-service.com/contact'],
      },
    },
    {
      url: 'https://example-startup.com',
      statusCode: 200,
      htmlAnalysis: {
        title: 'Innovation Startup | Disrupting Industries',
        description: 'Revolutionary new product that changes everything. Join the waitlist today.',
        content: 'Be part of the future. Our innovative solution is launching soon. Join 10,000+ people on our waitlist. Early birds get 50% off. Limited spots available.',
        headings: ['Revolutionary Product', 'Join Waitlist', 'Early Bird Pricing', 'Limited Availability'],
        images: ['product-mockup.jpg', 'innovation-graphic.jpg'],
        links: ['https://example-startup.com/waitlist', 'https://example-startup.com/about'],
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new AnthropicAnalysisProvider();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Full Analysis Pipeline Integration', () => {
    it('should complete comprehensive analysis workflow for e-commerce site', async () => {
      const { generateObject, generateText } = await import('ai');
      
      // Mock realistic analysis responses
      const mockConversionAnalysis = {
        object: {
          type: 'conversion_psychology',
          overallScore: 8,
          keyFindings: [
            'Strong social proof with customer reviews',
            'Clear value proposition with free shipping threshold',
            'Effective urgency with limited time offers',
          ],
          priorityRecommendations: [
            'Increase visibility of customer testimonials',
            'Add live chat for immediate support',
            'Create urgency with countdown timers',
          ],
          categories: {
            trustSignals: { score: 8, recommendations: ['Display security badges', 'Add more customer photos'] },
            callsToAction: { score: 7, recommendations: ['Make buttons more prominent', 'Test different CTA text'] },
            valueProposition: { score: 9, recommendations: ['Maintain current messaging'] },
          },
        },
        usage: {
          promptTokens: 1800,
          completionTokens: 1200,
          totalTokens: 3000,
        },
      };

      const mockUxAnalysis = {
        object: {
          type: 'ux_ui_analysis',
          overallScore: 7,
          keyFindings: [
            'Mobile-responsive design detected',
            'Good page loading performance',
            'Clear navigation structure',
          ],
          priorityRecommendations: [
            'Optimize product image sizes',
            'Add breadcrumb navigation',
            'Improve search functionality',
          ],
          categories: {
            mobileOptimization: { score: 8, recommendations: ['Test on more device sizes'] },
            navigation: { score: 7, recommendations: ['Add mega menu for categories'] },
            pageSpeed: { score: 6, recommendations: ['Compress images', 'Enable CDN'] },
          },
        },
        usage: {
          promptTokens: 1600,
          completionTokens: 1000,
          totalTokens: 2600,
        },
      };

      const mockSeoAnalysis = {
        object: {
          type: 'technical_seo',
          overallScore: 6,
          keyFindings: [
            'Good title tag optimization',
            'Missing schema markup for products',
            'Images lack descriptive alt text',
          ],
          priorityRecommendations: [
            'Add product schema markup',
            'Optimize meta descriptions',
            'Include alt text for all images',
          ],
          categories: {
            metaTags: { score: 7, recommendations: ['Improve meta descriptions'] },
            contentStructure: { score: 6, recommendations: ['Add more internal links'] },
            technicalSEO: { score: 5, recommendations: ['Implement schema markup', 'Fix broken links'] },
          },
        },
        usage: {
          promptTokens: 1400,
          completionTokens: 900,
          totalTokens: 2300,
        },
      };

      const mockExecutiveSummary = {
        text: `# Executive Summary - EXAMPLE-ECOMMERCE.COM

## Overall Score: 7/10

The website demonstrates strong conversion psychology with effective social proof and clear value propositions. However, there are opportunities for improvement in technical SEO and user experience optimization.

### TOP 4 PRIORITY RECOMMENDATIONS:

1. **Implement Product Schema Markup**
   - Add structured data for product listings
   - Include price, availability, and review information
   - Impact: 15-25% improvement in search visibility

2. **Enhance Mobile User Experience**
   - Optimize product images for mobile devices  
   - Implement mobile-specific navigation patterns
   - Impact: 10-20% increase in mobile conversions

3. **Strengthen Trust Signals**
   - Display security badges prominently
   - Add customer photos to testimonials
   - Impact: 5-15% conversion rate improvement

4. **Optimize Page Speed**
   - Compress and optimize product images
   - Enable content delivery network (CDN)
   - Impact: 8-12% improvement in user engagement

### QUICK WINS (2 weeks):
• Add alt text to all product images
• Display security badges on checkout pages
• Implement breadcrumb navigation

### REVENUE IMPACT POTENTIAL:
- Conservative: 12-18% increase in conversion rate
- Optimistic: 20-30% increase in conversion rate  
- Key drivers: Improved trust signals, better mobile experience`,
        usage: {
          promptTokens: 2200,
          completionTokens: 400,
          totalTokens: 2600,
        },
      };

      vi.mocked(generateObject)
        .mockResolvedValueOnce(mockConversionAnalysis)
        .mockResolvedValueOnce(mockUxAnalysis) 
        .mockResolvedValueOnce(mockSeoAnalysis);

      vi.mocked(generateText).mockResolvedValue(mockExecutiveSummary);

      const result = await provider.generateComprehensiveAnalysis(testUrls[0]);

      // Verify comprehensive analysis structure
      expect(result.conversionPsychology).toBeDefined();
      expect(result.uxAnalysis).toBeDefined(); 
      expect(result.technicalSeo).toBeDefined();
      expect(result.overallInsights).toBeDefined();
      expect(result.metadata).toBeDefined();

      // Check analysis quality and completeness
      expect(result.conversionPsychology.overallScore).toBeGreaterThan(0);
      expect(result.uxAnalysis.overallScore).toBeGreaterThan(0);
      expect(result.technicalSeo.overallScore).toBeGreaterThan(0);
      expect(result.metadata.confidence).toBeGreaterThan(0.8);
      expect(result.metadata.modelUsed).toBe('claude-3-5-sonnet-20241022');

      // Verify all AI SDK calls were made with v5 compatible parameters
      expect(generateObject).toHaveBeenCalledTimes(3);
      expect(generateText).toHaveBeenCalledTimes(1);
      
      // Check that no deprecated parameters were used
      const generateObjectCalls = vi.mocked(generateObject).mock.calls;
      generateObjectCalls.forEach(call => {
        const [config] = call;
        expect(config.model).toBeDefined();
        expect(config.system).toBeDefined(); 
        expect(config.prompt).toBeDefined();
        expect(config.schema).toBeDefined();
        expect(config.temperature).toBeDefined();
        // Ensure no deprecated parameters
        expect(config.toolCallStreaming).toBeUndefined();
      });
    });

    it('should handle end-to-end analysis with extraction data', async () => {
      const mockExtractionResults: ExtractionResults = {
        businessInfo: {
          name: 'Premium Store',
          description: 'E-commerce retailer',
          industry: 'Retail',
        },
        callsToAction: [
          { text: 'Shop Now', prominence: 'primary', position: 'header' },
          { text: 'Add to Cart', prominence: 'primary', position: 'product' },
          { text: 'Learn More', prominence: 'secondary', position: 'footer' },
        ],
        socialProof: {
          testimonials: [
            { content: 'Amazing products!', author: 'Sarah K.' },
            { content: 'Fast shipping', author: 'Mike D.' },
          ],
          reviews: [
            { rating: 5, content: 'Love this store' },
            { rating: 4, content: 'Great quality' },
          ],
          statistics: [
            { metric: 'customers', value: '10,000+' },
            { metric: 'satisfaction', value: '98%' },
          ],
          certifications: [
            { name: 'SSL Secure', issuer: 'Security Corp' },
          ],
        },
        psychologyTriggers: {
          scarcity: ['Limited stock', 'Only 3 left'],
          urgency: ['Sale ends soon', 'Order today'],
          authority: ['Expert choice', 'Award winning'],
          reciprocity: ['Free returns', '30-day guarantee'],
        },
        products: [
          { name: 'Premium Widget', price: '$299' },
          { name: 'Deluxe Kit', price: '$499' },
        ],
        technicalSeo: {
          pageTitle: 'Premium Store - Best Products Online',
          metaDescription: 'Shop premium products with fast shipping',
          headings: [
            { level: 'h1', text: 'Premium Products' },
            { level: 'h2', text: 'Customer Favorites' },
          ],
          keywords: ['premium', 'products', 'online', 'store'],
          wordCount: 850,
          contentTypes: ['text', 'images', 'videos'],
        },
      };

      // Mock enhanced analysis responses
      const mockEnhancedConversion = {
        object: {
          type: 'conversion_psychology_enhanced',
          overallScore: 9,
          keyFindings: [
            'Excellent CTA placement with 3 primary buttons detected',
            'Strong social proof with testimonials and statistics',
            'Effective psychology triggers across all categories',
          ],
          priorityRecommendations: [
            'Optimize scarcity indicators positioning',
            'A/B test testimonial display formats',
            'Add countdown timers to urgency triggers',
          ],
          categories: {},
        },
        usage: {
          promptTokens: 2500,
          completionTokens: 1500,
          totalTokens: 4000,
        },
      };

      vi.mocked(generateObject).mockResolvedValue(mockEnhancedConversion);
      vi.mocked(generateText).mockResolvedValue({
        text: 'Enhanced analysis with structured data insights shows significant optimization potential.',
      });

      const result = await provider.analyzeConversionPsychologyEnhanced(
        testUrls[0],
        mockExtractionResults
      );

      expect(result.analysis.type).toBe('conversion_psychology_enhanced');
      expect(result.metadata.isEnhanced).toBe(true);
      expect(result.metadata.extractionDataUsed).toBe(true);
      expect(result.metadata.confidence).toBe(0.95);
      expect(result.analysis.overallScore).toBe(9);
    });
  });

  describe('Cross-Site Analysis Consistency', () => {
    it('should maintain consistent analysis quality across different site types', async () => {
      const analysisResults = [];

      for (const crawlData of testUrls) {
        // Mock consistent response structure for each site
        const mockResult = {
          object: {
            type: 'conversion_psychology',
            overallScore: Math.floor(Math.random() * 4) + 6, // Score between 6-9
            keyFindings: [
              `Key finding 1 for ${crawlData.url}`,
              `Key finding 2 for ${crawlData.url}`,
              `Key finding 3 for ${crawlData.url}`,
            ],
            priorityRecommendations: [
              `Recommendation 1 for ${crawlData.url}`,
              `Recommendation 2 for ${crawlData.url}`,
              `Recommendation 3 for ${crawlData.url}`,
            ],
            categories: {
              trustSignals: { score: 7, recommendations: ['Trust rec 1', 'Trust rec 2'] },
              callsToAction: { score: 8, recommendations: ['CTA rec 1', 'CTA rec 2'] },
              valueProposition: { score: 9, recommendations: ['Value rec 1', 'Value rec 2'] },
            },
          },
        };

        vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

        const result = await provider.analyzeConversionPsychology(crawlData);
        analysisResults.push(result);

        // Validate result structure matches expected schema
        expect(result.analysis.overallScore).toBeGreaterThanOrEqual(1);
        expect(result.analysis.overallScore).toBeLessThanOrEqual(10);
        expect(result.analysis.keyFindings).toHaveLength(3);
        expect(result.analysis.priorityRecommendations).toHaveLength(3);
        expect(result.analysis.categories).toBeDefined();
        expect(result.metadata.modelUsed).toBe('claude-3-5-sonnet-20241022');
      }

      // Verify consistency across all results
      analysisResults.forEach(result => {
        expect(result.analysis.type).toBe('conversion_psychology');
        expect(result.metadata.confidence).toBeDefined();
        expect(result.metadata.processingTime).toBeDefined();
        
        // Ensure categories have consistent structure
        Object.entries(result.analysis.categories).forEach(([key, category]: [string, any]) => {
          expect(['trustSignals', 'callsToAction', 'valueProposition']).toContain(key);
          expect(category.score).toBeGreaterThanOrEqual(1);
          expect(category.score).toBeLessThanOrEqual(10);
          expect(Array.isArray(category.recommendations)).toBe(true);
          expect(category.recommendations.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Performance and Reliability Integration', () => {
    it('should handle multiple concurrent analyses', async () => {
      const mockResult = {
        object: {
          type: 'conversion_psychology',
          overallScore: 7,
          keyFindings: ['Finding 1', 'Finding 2', 'Finding 3'],
          priorityRecommendations: ['Rec 1', 'Rec 2', 'Rec 3'],
          categories: {
            trustSignals: { score: 7, recommendations: ['Trust 1'] },
            callsToAction: { score: 8, recommendations: ['CTA 1'] },
            valueProposition: { score: 9, recommendations: ['Value 1'] },
          },
        },
      };

      vi.mocked(generateObject).mockResolvedValue(mockResult);

      // Run multiple analyses concurrently
      const promises = testUrls.map(crawlData => 
        provider.analyzeConversionPsychology(crawlData)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(testUrls.length);
      results.forEach(result => {
        expect(result.analysis).toBeDefined();
        expect(result.metadata.modelUsed).toBe('claude-3-5-sonnet-20241022');
      });
    });

    it('should maintain performance standards with v5', async () => {
      const mockResult = {
        object: {
          type: 'conversion_psychology', 
          overallScore: 8,
          keyFindings: [],
          priorityRecommendations: [],
          categories: {},
        },
      };

      vi.mocked(generateObject).mockResolvedValue(mockResult);

      const startTime = Date.now();
      await provider.analyzeConversionPsychology(testUrls[0]);
      const endTime = Date.now();

      // Performance should be reasonable (accounting for mocked responses)
      expect(endTime - startTime).toBeLessThan(1000); // Under 1 second for mocked calls
    });
  });

  describe('Error Recovery Integration', () => {
    it('should gracefully degrade when some analyses fail', async () => {
      // Mock mixed success/failure scenarios
      vi.mocked(generateObject)
        .mockRejectedValueOnce(new Error('Conversion analysis API error'))
        .mockResolvedValueOnce({
          object: {
            type: 'ux_ui_analysis',
            overallScore: 7,
            keyFindings: ['UX finding'],
            priorityRecommendations: ['UX rec'],
            categories: {},
          },
        })
        .mockResolvedValueOnce({
          object: {
            type: 'technical_seo',
            overallScore: 6,
            keyFindings: ['SEO finding'],
            priorityRecommendations: ['SEO rec'],
            categories: {},
          },
        });

      vi.mocked(generateText).mockResolvedValue({
        text: 'Partial analysis summary with available data'
      });

      const result = await provider.generateComprehensiveAnalysis(testUrls[0]);

      // Should still provide useful results
      expect(result.conversionPsychology).toBeDefined(); // Fallback data
      expect(result.uxAnalysis).toBeDefined();
      expect(result.technicalSeo).toBeDefined();
      expect(result.metadata.isPartial).toBe(true);
      expect(result.metadata.failedSections).toBe(1);
      expect(result.metadata.confidence).toBeLessThan(0.85); // Reduced confidence
    });

    it('should retry failed requests with backoff', async () => {
      let callCount = 0;
      vi.mocked(generateObject).mockImplementation(async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary network error');
        }
        return {
          object: {
            type: 'conversion_psychology',
            overallScore: 8,
            keyFindings: ['Recovery finding'],
            priorityRecommendations: ['Recovery rec'],
            categories: {},
          },
        };
      });

      const result = await provider.analyzeConversionPsychology(testUrls[0]);

      expect(callCount).toBe(3); // Should have retried twice before success
      expect(result.analysis.overallScore).toBe(8);
      expect(result.metadata.retryAttempt).toBe(3);
    });
  });

  describe('Data Quality Validation', () => {
    it('should validate analysis output structure consistently', async () => {
      const mockResult = {
        object: {
          type: 'conversion_psychology',
          overallScore: 8,
          keyFindings: [
            'Comprehensive finding with detailed analysis',
            'Another finding with actionable insights',
            'Third finding with specific recommendations',
          ],
          priorityRecommendations: [
            'High-impact recommendation with clear implementation steps',
            'Medium-impact recommendation with measurable outcomes',
            'Quick-win recommendation with immediate benefits',
          ],
          categories: {
            trustSignals: { 
              score: 7, 
              recommendations: [
                'Add security badges to checkout process',
                'Display customer testimonials prominently',
              ]
            },
            callsToAction: { 
              score: 8, 
              recommendations: [
                'Test different button colors and text',
                'Optimize CTA placement above the fold',
              ]
            },
            valueProposition: { 
              score: 9, 
              recommendations: [
                'Maintain current clear messaging',
                'Add quantified benefits where possible',
              ]
            },
          },
        },
      };

      vi.mocked(generateObject).mockResolvedValue(mockResult);

      const result = await provider.analyzeConversionPsychology(testUrls[0]);

      // Validate data quality standards
      expect(result.analysis.keyFindings.every(finding => 
        finding.length > 20 && finding.length < 200
      )).toBe(true);

      expect(result.analysis.priorityRecommendations.every(rec => 
        rec.length > 30 && rec.length < 250
      )).toBe(true);

      // Validate category structure
      Object.values(result.analysis.categories).forEach((category: any) => {
        expect(category.score).toBeGreaterThanOrEqual(1);
        expect(category.score).toBeLessThanOrEqual(10);
        expect(category.recommendations.length).toBeGreaterThanOrEqual(1);
        expect(category.recommendations.length).toBeLessThanOrEqual(5);
      });
    });
  });
});