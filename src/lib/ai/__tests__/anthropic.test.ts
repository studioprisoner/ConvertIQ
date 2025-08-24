import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicAnalysisProvider } from '../providers/anthropic';
import { generateObject, generateText } from 'ai';
import type { CrawlResult } from '../../crawler/types';
import type { ExtractionResults } from '../../../db/schema/analyses';

// AI SDK and Anthropic SDK are mocked in test setup

describe('AnthropicAnalysisProvider - AI SDK v5 Compatibility', () => {
  let provider: AnthropicAnalysisProvider;
  let mockCrawlData: CrawlResult;
  let mockExtractionResults: ExtractionResults;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new AnthropicAnalysisProvider();
    
    // Mock crawl data
    mockCrawlData = {
      url: 'https://example.com',
      statusCode: 200,
      htmlAnalysis: {
        title: 'Test Website',
        description: 'A test website for AI analysis',
        content: 'This is the main content of the website with various elements.',
        headings: ['Main Heading', 'Subheading 1', 'Subheading 2'],
        images: ['image1.jpg', 'image2.jpg'],
        links: ['https://example.com/page1', 'https://example.com/page2'],
      },
    };

    // Mock extraction results
    mockExtractionResults = {
      businessInfo: {
        name: 'Test Business',
        description: 'A test business',
        industry: 'Technology',
      },
      callsToAction: [
        {
          text: 'Get Started',
          prominence: 'primary',
          position: 'header',
        },
        {
          text: 'Learn More',
          prominence: 'secondary', 
          position: 'body',
        },
      ],
      socialProof: {
        testimonials: [{ content: 'Great service!', author: 'John Doe' }],
        reviews: [{ rating: 5, content: 'Excellent product' }],
        statistics: [{ metric: 'customers', value: '1000+' }],
        certifications: [{ name: 'ISO 9001', issuer: 'ISO' }],
      },
      psychologyTriggers: {
        scarcity: ['Limited time offer'],
        urgency: ['Act now'],
        authority: ['Expert approved'],
        reciprocity: ['Free trial'],
      },
      products: [
        { name: 'Product 1', price: '$99' },
        { name: 'Product 2', price: '$149' },
      ],
      technicalSeo: {
        pageTitle: 'Test Website - AI Analysis',
        metaDescription: 'Test meta description',
        headings: [
          { level: 'h1', text: 'Main Heading' },
          { level: 'h2', text: 'Subheading 1' },
        ],
        keywords: ['ai', 'analysis', 'test'],
        wordCount: 150,
        contentTypes: ['text', 'images'],
      },
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('analyzeConversionPsychology', () => {
    it('should analyze conversion psychology correctly with v5', async () => {
      const mockResult = {
        object: {
          type: 'conversion_psychology',
          overallScore: 8,
          keyFindings: [
            'Strong value proposition present',
            'Clear call-to-action buttons',
            'Social proof elements visible',
          ],
          priorityRecommendations: [
            'Add urgency indicators',
            'Enhance testimonials section',
            'Optimize button colors',
          ],
          categories: {
            trustSignals: {
              score: 7,
              recommendations: ['Add security badges', 'Display certifications'],
            },
            callsToAction: {
              score: 8,
              recommendations: ['Test button text variations'],
            },
            valueProposition: {
              score: 9,
              recommendations: ['Maintain current messaging'],
            },
          },
        },
        usage: {
          promptTokens: 1500,
          completionTokens: 800,
          totalTokens: 2300,
        },
      };

      vi.mocked(generateObject).mockResolvedValue(mockResult);

      const result = await provider.analyzeConversionPsychology(mockCrawlData);

      expect(generateObject).toHaveBeenCalledWith({
        model: expect.any(String),
        system: expect.any(String),
        prompt: expect.any(String),
        schema: expect.any(Object),
        temperature: 0.3,
      });

      expect(result.analysis).toBeDefined();
      expect(result.analysis.type).toBe('conversion_psychology');
      expect(result.analysis.overallScore).toBe(8);
      expect(result.metadata.modelUsed).toBe('claude-3-5-sonnet-20241022');
      expect(result.metadata.confidence).toBe(0.9);
      expect(result.analysis.keyFindings).toHaveLength(3);
      expect(result.analysis.priorityRecommendations).toHaveLength(3);
    });

    it('should handle timeout scenarios gracefully', async () => {
      vi.mocked(generateObject).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 40000))
      );

      await expect(provider.analyzeConversionPsychology(mockCrawlData))
        .rejects.toThrow('Analysis failed: Conversion analysis timeout after 35s');
    });

    it('should handle AI response errors', async () => {
      vi.mocked(generateObject).mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(provider.analyzeConversionPsychology(mockCrawlData))
        .rejects.toThrow('Analysis failed: API rate limit exceeded');
    });
  });

  describe('analyzeUX', () => {
    it('should analyze UX correctly with v5', async () => {
      const mockResult = {
        object: {
          type: 'ux_ui_analysis',
          overallScore: 7,
          keyFindings: [
            'Mobile-responsive design',
            'Fast loading times',
            'Clear navigation structure',
          ],
          priorityRecommendations: [
            'Improve form usability',
            'Add breadcrumbs',
            'Optimize image sizes',
          ],
          categories: {
            mobileOptimization: {
              score: 8,
              recommendations: ['Test on more devices'],
            },
            navigation: {
              score: 7,
              recommendations: ['Add search functionality'],
            },
            pageSpeed: {
              score: 6,
              recommendations: ['Optimize images', 'Enable compression'],
            },
          },
        },
      };

      vi.mocked(generateObject).mockResolvedValue(mockResult);

      const result = await provider.analyzeUX(mockCrawlData);

      expect(result.analysis).toBeDefined();
      expect(result.analysis.type).toBe('ux_ui_analysis');
      expect(result.analysis.overallScore).toBe(7);
      expect(result.metadata.modelUsed).toBe('claude-3-5-sonnet-20241022');
    });
  });

  describe('analyzeTechnicalSEO', () => {
    it('should analyze technical SEO correctly with v5', async () => {
      const mockResult = {
        object: {
          type: 'technical_seo',
          overallScore: 6,
          keyFindings: [
            'Missing meta description',
            'Good heading structure',
            'Images lack alt text',
          ],
          priorityRecommendations: [
            'Add meta descriptions',
            'Include alt text for images',
            'Optimize page titles',
          ],
          categories: {
            metaTags: {
              score: 5,
              recommendations: ['Add meta descriptions', 'Optimize titles'],
            },
            contentStructure: {
              score: 7,
              recommendations: ['Improve internal linking'],
            },
            technicalSEO: {
              score: 6,
              recommendations: ['Add schema markup', 'Improve page speed'],
            },
          },
        },
      };

      vi.mocked(generateObject).mockResolvedValue(mockResult);

      const result = await provider.analyzeTechnicalSEO(mockCrawlData);

      expect(result.analysis).toBeDefined();
      expect(result.analysis.type).toBe('technical_seo');
      expect(result.analysis.overallScore).toBe(6);
      expect(result.metadata.modelUsed).toBe('claude-3-5-sonnet-20241022');
    });
  });

  describe('generateComprehensiveAnalysis', () => {
    it('should complete comprehensive analysis with v5', async () => {
      // Mock all individual analysis functions
      const mockConversionResult = {
        object: {
          type: 'conversion_psychology',
          overallScore: 8,
          keyFindings: ['Strong value proposition'],
          priorityRecommendations: ['Add urgency'],
          categories: {},
        },
      };

      const mockUxResult = {
        object: {
          type: 'ux_ui_analysis',
          overallScore: 7,
          keyFindings: ['Mobile responsive'],
          priorityRecommendations: ['Improve forms'],
          categories: {},
        },
      };

      const mockSeoResult = {
        object: {
          type: 'technical_seo',
          overallScore: 6,
          keyFindings: ['Good structure'],
          priorityRecommendations: ['Add meta tags'],
          categories: {},
        },
      };

      const mockOverallInsights = {
        text: '# Executive Summary\n\nOverall Score: 7/10\n\nThe website shows good potential with strong conversion elements.',
      };

      vi.mocked(generateObject)
        .mockResolvedValueOnce(mockConversionResult)
        .mockResolvedValueOnce(mockUxResult)
        .mockResolvedValueOnce(mockSeoResult);
      
      vi.mocked(generateText).mockResolvedValue(mockOverallInsights);

      const result = await provider.generateComprehensiveAnalysis(mockCrawlData);

      expect(result.conversionPsychology).toBeDefined();
      expect(result.uxAnalysis).toBeDefined();
      expect(result.technicalSeo).toBeDefined();
      expect(result.overallInsights).toBeDefined();
      expect(result.metadata.confidence).toBeGreaterThan(0.8);
      expect(result.metadata.modelUsed).toBe('claude-3-5-sonnet-20241022');
      expect(result.metadata.promptVersion).toContain('comprehensive');
    });

    it('should handle partial failures gracefully', async () => {
      vi.mocked(generateObject)
        .mockRejectedValueOnce(new Error('Conversion analysis failed'))
        .mockResolvedValueOnce({ 
          object: { 
            type: 'ux_ui_analysis', 
            overallScore: 7,
            keyFindings: [],
            priorityRecommendations: [],
            categories: {},
          }
        })
        .mockResolvedValueOnce({ 
          object: { 
            type: 'technical_seo', 
            overallScore: 6,
            keyFindings: [],
            priorityRecommendations: [],
            categories: {},
          }
        });

      vi.mocked(generateText).mockResolvedValue({ 
        text: 'Partial analysis completed'
      });

      const result = await provider.generateComprehensiveAnalysis(mockCrawlData);

      expect(result.conversionPsychology).toBeNull();
      expect(result.uxAnalysis).toBeDefined();
      expect(result.technicalSeo).toBeDefined();
      expect(result.metadata.isPartial).toBe(true);
      expect(result.metadata.failedSections).toBe(1);
    });
  });

  describe('Enhanced Analysis with Structured Data', () => {
    it('should perform enhanced conversion analysis with extraction data', async () => {
      const mockResult = {
        object: {
          type: 'conversion_psychology_enhanced',
          overallScore: 9,
          keyFindings: [
            'Strong CTA placement detected',
            'Multiple social proof elements found',
            'Clear value proposition',
          ],
          priorityRecommendations: [
            'Optimize CTA button text',
            'Add scarcity indicators',
            'Enhance testimonials display',
          ],
          categories: {},
        },
      };

      vi.mocked(generateObject).mockResolvedValue(mockResult);

      const result = await provider.analyzeConversionPsychologyEnhanced(
        mockCrawlData, 
        mockExtractionResults
      );

      expect(result.analysis.type).toBe('conversion_psychology_enhanced');
      expect(result.metadata.isEnhanced).toBe(true);
      expect(result.metadata.extractionDataUsed).toBe(true);
      expect(result.metadata.confidence).toBe(0.95);
    });

    it('should generate comprehensive enhanced analysis', async () => {
      const mockConversionResult = {
        object: {
          type: 'conversion_psychology_enhanced',
          overallScore: 9,
          keyFindings: [],
          priorityRecommendations: [],
          categories: {},
        },
      };

      vi.mocked(generateObject).mockResolvedValue(mockConversionResult);
      vi.mocked(generateText).mockResolvedValue({
        text: 'Enhanced analysis with structured data insights'
      });

      const result = await provider.generateComprehensiveAnalysisEnhanced(
        mockCrawlData,
        mockExtractionResults
      );

      expect(result.metadata.isEnhanced).toBe(true);
      expect(result.metadata.firecrawlVersion).toBe('v2');
      expect(result.metadata.structuredDataUsed).toBe(true);
      expect(result.metadata.dataQuality).toBeDefined();
    });
  });

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      vi.mocked(generateText).mockResolvedValue({ text: 'OK' });

      const isConnected = await provider.testConnection();

      expect(isConnected).toBe(true);
      expect(generateText).toHaveBeenCalledWith({
        model: expect.any(String),
        prompt: 'Respond with "OK" if you are working correctly.',
        maxTokens: 10,
      });
    });

    it('should handle connection failures', async () => {
      vi.mocked(generateText).mockRejectedValue(new Error('Connection timeout'));

      const isConnected = await provider.testConnection();

      expect(isConnected).toBe(false);
    });
  });

  describe('Token Usage Monitoring', () => {
    it('should track token usage in analysis results', async () => {
      const mockResultWithUsage = {
        object: {
          type: 'conversion_psychology',
          overallScore: 8,
          keyFindings: [],
          priorityRecommendations: [],
          categories: {},
        },
        usage: {
          promptTokens: 1200,
          completionTokens: 800,
          totalTokens: 2000,
        },
      };

      vi.mocked(generateObject).mockResolvedValue(mockResultWithUsage);

      const result = await provider.analyzeConversionPsychology(mockCrawlData);

      // The provider should handle usage data from the AI SDK v5 response
      expect(generateObject).toHaveBeenCalled();
      expect(result.analysis).toBeDefined();
    });
  });

  describe('Error Handling Compatibility', () => {
    it('should handle v5-specific error types', async () => {
      const v5Error = new Error('AI SDK v5 specific error');
      v5Error.name = 'AISDKError';
      
      vi.mocked(generateObject).mockRejectedValue(v5Error);

      await expect(provider.analyzeConversionPsychology(mockCrawlData))
        .rejects.toThrow('Analysis failed: AI SDK v5 specific error');
    });

    it('should maintain existing error handling patterns', async () => {
      vi.mocked(generateObject).mockRejectedValue(new Error('Generic AI error'));

      await expect(provider.analyzeConversionPsychology(mockCrawlData))
        .rejects.toThrow('Analysis failed: Generic AI error');
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should provide fallback analysis when AI fails', async () => {
      // Test that fallback data structures are correct
      const provider = new AnthropicAnalysisProvider();
      const fallback = (provider as any).createFallbackConversionAnalysis();

      expect(fallback.analysis.overallScore).toBe(5);
      expect(fallback.analysis.keyFindings).toBeDefined();
      expect(fallback.analysis.priorityRecommendations).toBeDefined();
      expect(fallback.metadata.isFallback).toBe(true);
      expect(fallback.metadata.confidence).toBe(0.3);
    });
  });

  describe('Regression Testing for Quality', () => {
    it('should maintain analysis quality standards', async () => {
      const mockResult = {
        object: {
          type: 'conversion_psychology',
          overallScore: 8,
          keyFindings: [
            'Finding 1',
            'Finding 2', 
            'Finding 3',
          ],
          priorityRecommendations: [
            'Recommendation 1',
            'Recommendation 2',
            'Recommendation 3',
          ],
          categories: {
            trustSignals: { score: 7, recommendations: ['Rec 1', 'Rec 2'] },
            callsToAction: { score: 8, recommendations: ['Rec 1', 'Rec 2'] },
            valueProposition: { score: 9, recommendations: ['Rec 1', 'Rec 2'] },
          },
        },
      };

      vi.mocked(generateObject).mockResolvedValue(mockResult);

      const result = await provider.analyzeConversionPsychology(mockCrawlData);

      // Validate result structure matches expected schema
      expect(result.analysis.overallScore).toBeGreaterThanOrEqual(1);
      expect(result.analysis.overallScore).toBeLessThanOrEqual(10);
      expect(result.analysis.keyFindings).toBeInstanceOf(Array);
      expect(result.analysis.priorityRecommendations).toBeInstanceOf(Array);
      expect(result.analysis.categories).toBeDefined();
      
      // Ensure each category has expected structure
      Object.values(result.analysis.categories).forEach((category: any) => {
        expect(category.score).toBeGreaterThanOrEqual(1);
        expect(category.score).toBeLessThanOrEqual(10);
        expect(category.recommendations).toBeInstanceOf(Array);
      });
    });
  });
});