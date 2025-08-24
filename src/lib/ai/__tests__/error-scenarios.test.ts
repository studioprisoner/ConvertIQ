import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicAnalysisProvider } from '../providers/anthropic';
import type { CrawlData } from '@/lib/types/crawl';

// AI SDK and Anthropic SDK are mocked in test setup

describe('AI SDK v5 Error Scenario Tests', () => {
  let provider: AnthropicAnalysisProvider;
  let mockCrawlData: CrawlData;
  
  beforeEach(() => {
    vi.clearAllMocks();
    provider = new AnthropicAnalysisProvider();
    
    mockCrawlData = {
      url: 'https://example.com',
      title: 'Example Page',
      content: 'Sample page content for error testing',
      metadata: {
        description: 'Test description',
        keywords: 'test, error',
        author: 'Test Author'
      },
      headings: {
        h1: ['Main Heading'],
        h2: ['Subheading 1', 'Subheading 2'],
        h3: ['Sub-subheading 1']
      },
      links: {
        internal: [{ text: 'Internal Link', href: '/internal' }],
        external: [{ text: 'External Link', href: 'https://external.com' }]
      },
      images: [
        { src: '/image1.jpg', alt: 'Test Image 1' },
        { src: '/image2.jpg', alt: 'Test Image 2' }
      ],
      forms: [],
      scripts: [],
      stylesheets: [],
      performance: {
        loadTime: 1200,
        domContentLoaded: 800,
        firstPaint: 600,
        firstContentfulPaint: 700
      },
      accessibility: {
        missingAltTags: 0,
        missingAriaLabels: 1,
        colorContrastIssues: 0
      },
      seo: {
        titleLength: 50,
        descriptionLength: 120,
        hasH1: true,
        hasMetaDescription: true
      }
    };
  });

  describe('API Error Handling', () => {
    it('should handle rate limiting errors gracefully', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      const rateLimitError = new Error('Rate limit exceeded - please try again later');
      rateLimitError.name = 'RateLimitError';
      
      mockGenerateObject.mockRejectedValue(rateLimitError);

      await expect(provider.analyzeConversionPsychology(mockCrawlData))
        .rejects
        .toThrow('Analysis failed: Rate limit exceeded - please try again later');
    });

    it('should handle network connectivity errors', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      const networkError = new Error('Network error: ECONNREFUSED');
      networkError.name = 'NetworkError';
      
      mockGenerateObject.mockRejectedValue(networkError);

      await expect(provider.analyzeUX(mockCrawlData))
        .rejects
        .toThrow('UX analysis failed: Network error: ECONNREFUSED');
    });

    it('should handle authentication errors', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      const authError = new Error('Invalid API key provided');
      authError.name = 'AuthenticationError';
      
      mockGenerateObject.mockRejectedValue(authError);

      await expect(provider.analyzeTechnicalSEO(mockCrawlData))
        .rejects
        .toThrow('SEO analysis failed: Invalid API key provided');
    });

    it('should handle server 500 errors', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      const serverError = new Error('Internal server error (500)');
      serverError.name = 'ServerError';
      
      mockGenerateObject.mockRejectedValue(serverError);

      await expect(provider.analyzeConversionPsychology(mockCrawlData))
        .rejects
        .toThrow('Analysis failed: Internal server error (500)');
    });

    it('should handle timeout errors and record token usage', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      // Mock a timeout that takes longer than the 35s limit
      mockGenerateObject.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout after 35s')), 36000)
        )
      );

      const startTime = Date.now();
      
      await expect(provider.analyzeConversionPsychology(mockCrawlData))
        .rejects
        .toThrow();
      
      const endTime = Date.now();
      
      // Should timeout within reasonable time (allowing for test overhead)
      expect(endTime - startTime).toBeLessThan(37000);
    });
  });

  describe('Invalid Response Handling', () => {
    it('should handle malformed JSON responses', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      mockGenerateObject.mockResolvedValue({
        object: null, // Invalid response structure
        usage: { promptTokens: 500, completionTokens: 200, totalTokens: 700 }
      });

      // Should handle malformed response gracefully
      const result = await provider.analyzeConversionPsychology(mockCrawlData);
      
      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
    });

    it('should handle responses with missing required fields', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      mockGenerateObject.mockResolvedValue({
        object: {
          // Missing required analysis fields
          incomplete: true
        },
        usage: { promptTokens: 400, completionTokens: 150, totalTokens: 550 }
      });

      const result = await provider.analyzeUX(mockCrawlData);
      
      expect(result.analysis).toBeDefined();
      expect(result.analysis.type).toBe('ux_ui_analysis');
    });

    it('should handle empty or null analysis responses', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      mockGenerateObject.mockResolvedValue({
        object: {},
        usage: { promptTokens: 300, completionTokens: 100, totalTokens: 400 }
      });

      const result = await provider.analyzeTechnicalSEO(mockCrawlData);
      
      expect(result.analysis).toBeDefined();
      expect(result.analysis.type).toBe('technical_seo');
    });

    it('should handle responses with invalid data types', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      mockGenerateObject.mockResolvedValue({
        object: {
          analysis: "invalid string instead of object",
          score: "not a number",
          recommendations: "not an array"
        },
        usage: { promptTokens: 450, completionTokens: 180, totalTokens: 630 }
      });

      const result = await provider.analyzeConversionPsychology(mockCrawlData);
      
      expect(result.analysis).toBeDefined();
      expect(result.metadata.tokensUsed).toBe(630);
    });
  });

  describe('Token Usage Error Recording', () => {
    it('should record token usage for failed analyses', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      mockGenerateObject.mockRejectedValue(new Error('API failure'));

      // Reset stats to get clean measurements
      provider.resetTokenUsageStats();

      await expect(provider.analyzeConversionPsychology(mockCrawlData))
        .rejects
        .toThrow();

      const stats = provider.getTokenUsageStats();
      
      expect(stats.session.totalCalls).toBe(1);
      expect(stats.recentCalls[0].success).toBe(false);
      expect(stats.recentCalls[0].operation).toBe('Conversion Psychology Analysis');
    });

    it('should track multiple failure types correctly', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      provider.resetTokenUsageStats();

      // Simulate different types of failures
      mockGenerateObject.mockRejectedValueOnce(new Error('Rate limit exceeded'));
      mockGenerateObject.mockRejectedValueOnce(new Error('Network timeout'));
      mockGenerateObject.mockRejectedValueOnce(new Error('Invalid response'));

      await expect(provider.analyzeConversionPsychology(mockCrawlData)).rejects.toThrow();
      await expect(provider.analyzeUX(mockCrawlData)).rejects.toThrow();
      await expect(provider.analyzeTechnicalSEO(mockCrawlData)).rejects.toThrow();

      const stats = provider.getTokenUsageStats();
      
      expect(stats.session.totalCalls).toBe(3);
      expect(stats.efficiency.successRate).toBe(0);
      expect(stats.recentCalls.every((call: any) => !call.success)).toBe(true);
    });

    it('should provide accurate cost estimates even for failed calls', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      provider.resetTokenUsageStats();

      // Mock partial usage data before failure
      mockGenerateObject.mockImplementation(() => {
        // Simulate some tokens were used before the failure
        const error = new Error('Request failed after processing');
        (error as any).usage = { promptTokens: 200, completionTokens: 0, totalTokens: 200 };
        throw error;
      });

      await expect(provider.analyzeConversionPsychology(mockCrawlData))
        .rejects
        .toThrow();

      const stats = provider.getTokenUsageStats();
      
      expect(stats.session.totalCalls).toBe(1);
      expect(stats.session.costEstimate).toBeGreaterThan(0);
    });
  });

  describe('Large Content Handling', () => {
    it('should handle extremely large content gracefully', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      // Create extremely large content
      const largeCrawlData = {
        ...mockCrawlData,
        content: 'Large content '.repeat(10000), // Very large content
        headings: {
          h1: Array(100).fill('Large heading'),
          h2: Array(500).fill('Large subheading'),
          h3: Array(1000).fill('Large sub-subheading')
        }
      };

      mockGenerateObject.mockResolvedValue({
        object: {
          analysis: { overallScore: 6 },
          metadata: { tokensUsed: 3000 }
        },
        usage: { promptTokens: 2500, completionTokens: 500, totalTokens: 3000 }
      });

      const result = await provider.analyzeConversionPsychology(largeCrawlData);
      
      expect(result.analysis).toBeDefined();
      expect(result.metadata.tokensUsed).toBe(3000);
    });

    it('should handle content that exceeds token limits', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      const tokenLimitError = new Error('Request exceeds maximum context length');
      tokenLimitError.name = 'ContextLengthError';
      
      mockGenerateObject.mockRejectedValue(tokenLimitError);

      await expect(provider.analyzeUX(mockCrawlData))
        .rejects
        .toThrow('UX analysis failed: Request exceeds maximum context length');
    });
  });

  describe('Concurrent Error Scenarios', () => {
    it('should handle mixed success/failure in concurrent analyses', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      provider.resetTokenUsageStats();

      // Mock mixed results: success, failure, success
      mockGenerateObject
        .mockResolvedValueOnce({
          object: { analysis: { overallScore: 7 } },
          usage: { promptTokens: 600, completionTokens: 300, totalTokens: 900 }
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          object: { analysis: { overallScore: 8 } },
          usage: { promptTokens: 550, completionTokens: 250, totalTokens: 800 }
        });

      const results = await Promise.allSettled([
        provider.analyzeConversionPsychology(mockCrawlData),
        provider.analyzeUX(mockCrawlData),
        provider.analyzeTechnicalSEO(mockCrawlData)
      ]);
      
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');

      const stats = provider.getTokenUsageStats();
      expect(stats.session.totalCalls).toBe(3);
      expect(stats.efficiency.successRate).toBeCloseTo(2/3);
    });

    it('should maintain token usage accuracy during concurrent failures', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      provider.resetTokenUsageStats();

      // All concurrent requests fail
      mockGenerateObject.mockRejectedValue(new Error('Service unavailable'));

      await Promise.allSettled([
        provider.analyzeConversionPsychology(mockCrawlData),
        provider.analyzeUX(mockCrawlData),
        provider.analyzeTechnicalSEO(mockCrawlData)
      ]);

      const stats = provider.getTokenUsageStats();
      
      expect(stats.session.totalCalls).toBe(3);
      expect(stats.efficiency.successRate).toBe(0);
      expect(stats.recentCalls).toHaveLength(3);
      expect(stats.recentCalls.every((call: any) => !call.success)).toBe(true);
    });
  });

  describe('Recovery and Fallback Scenarios', () => {
    it('should provide meaningful error messages for different failure types', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      const testCases = [
        { error: new Error('Rate limit exceeded'), expectedPattern: 'Rate limit exceeded' },
        { error: new Error('Invalid API key'), expectedPattern: 'Invalid API key' },
        { error: new Error('Timeout after 30s'), expectedPattern: 'Timeout after 30s' },
        { error: new Error('Service temporarily unavailable'), expectedPattern: 'Service temporarily unavailable' }
      ];

      for (const testCase of testCases) {
        mockGenerateObject.mockRejectedValueOnce(testCase.error);
        
        await expect(provider.analyzeConversionPsychology(mockCrawlData))
          .rejects
          .toThrow(testCase.expectedPattern);
      }
    });

    it('should handle connection test failures appropriately', async () => {
      const { generateText } = await import('ai');
      const mockGenerateText = generateText as any;
      
      mockGenerateText.mockRejectedValue(new Error('Connection failed'));

      const isConnected = await provider.testConnection();
      
      expect(isConnected).toBe(false);
    });

    it('should maintain error statistics across multiple failure types', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      provider.resetTokenUsageStats();

      const errorTypes = [
        'Rate limit exceeded',
        'Network timeout', 
        'Invalid response format',
        'Service unavailable',
        'Authentication failed'
      ];

      // Simulate various error types
      for (let i = 0; i < errorTypes.length; i++) {
        mockGenerateObject.mockRejectedValueOnce(new Error(errorTypes[i]));
        
        await expect(provider.analyzeConversionPsychology(mockCrawlData))
          .rejects
          .toThrow();
      }

      const stats = provider.getTokenUsageStats();
      
      expect(stats.session.totalCalls).toBe(5);
      expect(stats.efficiency.successRate).toBe(0);
      expect(stats.recommendations).toContain('Low success rate detected - review timeout settings and error handling');
    });
  });

  describe('Memory and Resource Management Under Error Conditions', () => {
    it('should not leak memory during repeated failures', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      provider.resetTokenUsageStats();
      
      mockGenerateObject.mockRejectedValue(new Error('Simulated failure'));

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simulate many failures
      for (let i = 0; i < 50; i++) {
        await expect(provider.analyzeConversionPsychology(mockCrawlData))
          .rejects
          .toThrow();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be reasonable even with many failures
      expect(memoryGrowth).toBeLessThan(30 * 1024 * 1024); // Less than 30MB growth

      // Should maintain proper call history limits
      const stats = provider.getTokenUsageStats();
      expect(stats.recentCalls).toHaveLength(10); // Last 10 calls only
    });

    it('should handle token usage history overflow correctly', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      provider.resetTokenUsageStats();

      // Alternate between success and failure to test history management
      for (let i = 0; i < 150; i++) {
        if (i % 2 === 0) {
          mockGenerateObject.mockResolvedValueOnce({
            object: { analysis: { overallScore: 5 } },
            usage: { promptTokens: 400, completionTokens: 200, totalTokens: 600 }
          });
          await provider.analyzeConversionPsychology(mockCrawlData);
        } else {
          mockGenerateObject.mockRejectedValueOnce(new Error('Intermittent failure'));
          await expect(provider.analyzeConversionPsychology(mockCrawlData))
            .rejects
            .toThrow();
        }
      }

      const stats = provider.getTokenUsageStats();
      
      // Should not exceed history limits despite 150 calls
      expect(stats.session.totalCalls).toBe(150);
      expect(stats.recentCalls).toHaveLength(10); // Should still be limited to 10
      expect(stats.efficiency.successRate).toBeCloseTo(0.5); // 50% success rate
    });
  });
});