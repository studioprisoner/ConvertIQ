import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicAnalysisProvider } from '../providers/anthropic';
import type { CrawlData } from '@/lib/types/crawl';

// AI SDK and Anthropic SDK are mocked in test setup

describe('AI SDK v5 Performance Tests', () => {
  let provider: AnthropicAnalysisProvider;
  let mockCrawlData: CrawlData;
  
  beforeEach(() => {
    vi.clearAllMocks();
    provider = new AnthropicAnalysisProvider();
    
    mockCrawlData = {
      url: 'https://example.com',
      title: 'Example Page',
      content: 'Sample page content for performance testing',
      metadata: {
        description: 'Test description',
        keywords: 'test, performance',
        author: 'Test Author'
      },
      headings: {
        h1: ['Main Heading'],
        h2: ['Subheading 1', 'Subheading 2'],
        h3: ['Sub-subheading 1']
      },
      links: {
        internal: [
          { text: 'Internal Link', href: '/internal' }
        ],
        external: [
          { text: 'External Link', href: 'https://external.com' }
        ]
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

  describe('Response Time Performance', () => {
    it('should complete conversion psychology analysis within acceptable time limits', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      mockGenerateObject.mockResolvedValue({
        object: {
          analysis: {
            overallScore: 7,
            keyFindings: ['Good use of social proof'],
            priorityRecommendations: ['Add urgency elements']
          },
          metadata: {
            modelUsed: 'claude-3-5-sonnet-20241022',
            analysisVersion: '2.0',
            confidence: 0.85,
            tokensUsed: 1200,
            processingTime: 2.1
          }
        },
        usage: {
          promptTokens: 800,
          completionTokens: 400,
          totalTokens: 1200
        }
      });

      const startTime = Date.now();
      
      await provider.analyzeConversionPsychology(mockCrawlData);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 5 seconds for acceptable user experience
      expect(duration).toBeLessThan(5000);
    });

    it('should complete UX analysis with improved v5 performance', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      mockGenerateObject.mockResolvedValue({
        object: {
          analysis: {
            overallScore: 8,
            navigationClarity: 7,
            contentStructure: 8,
            mobileOptimization: 9
          },
          metadata: {
            confidence: 0.90,
            tokensUsed: 1000
          }
        },
        usage: {
          promptTokens: 700,
          completionTokens: 300,
          totalTokens: 1000
        }
      });

      const performances: number[] = [];
      
      // Run multiple iterations to get average performance
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await provider.analyzeUX(mockCrawlData);
        const endTime = Date.now();
        performances.push(endTime - startTime);
      }
      
      const averageTime = performances.reduce((a, b) => a + b) / performances.length;
      
      // Average should be under 3 seconds for good performance
      expect(averageTime).toBeLessThan(3000);
      
      // Performance should be consistent (low variance)
      const variance = performances.reduce((acc, time) => {
        return acc + Math.pow(time - averageTime, 2);
      }, 0) / performances.length;
      
      const standardDeviation = Math.sqrt(variance);
      
      // Standard deviation should be less than 1 second for consistent performance
      expect(standardDeviation).toBeLessThan(1000);
    });

    it('should handle concurrent analyses efficiently', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      mockGenerateObject.mockResolvedValue({
        object: {
          analysis: { overallScore: 7 },
          metadata: { tokensUsed: 800 }
        },
        usage: {
          promptTokens: 500,
          completionTokens: 300,
          totalTokens: 800
        }
      });

      const startTime = Date.now();
      
      // Run 3 concurrent analyses
      const promises = [
        provider.analyzeConversionPsychology(mockCrawlData),
        provider.analyzeUX(mockCrawlData),
        provider.analyzeTechnicalSEO(mockCrawlData)
      ];
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      // Concurrent execution should be more efficient than sequential
      // Should complete all 3 in less than 8 seconds (vs 15+ seconds sequential)
      expect(totalDuration).toBeLessThan(8000);
    });
  });

  describe('Token Usage Efficiency', () => {
    it('should optimize token usage compared to previous version expectations', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      mockGenerateObject.mockResolvedValue({
        object: {
          analysis: {
            overallScore: 8,
            detailedAnalysis: {
              sections: ['intro', 'main', 'conclusion'],
              recommendations: ['rec1', 'rec2', 'rec3']
            }
          },
          metadata: { tokensUsed: 950 }
        },
        usage: {
          promptTokens: 600,
          completionTokens: 350,
          totalTokens: 950
        }
      });

      const result = await provider.analyzeConversionPsychology(mockCrawlData);
      
      // Token usage should be efficient for the analysis quality provided
      expect(result.metadata.tokensUsed).toBeLessThan(1200); // Should use less than 1200 tokens
      expect(result.metadata.tokensUsed).toBeGreaterThan(500); // But still substantial enough for quality analysis
    });

    it('should track token usage across different analysis types', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      const tokenUsages = {
        conversion: 1000,
        ux: 800,
        seo: 900
      };
      
      mockGenerateObject
        .mockResolvedValueOnce({
          object: { analysis: { overallScore: 7 }, metadata: { tokensUsed: tokenUsages.conversion } },
          usage: { totalTokens: tokenUsages.conversion }
        })
        .mockResolvedValueOnce({
          object: { analysis: { overallScore: 8 }, metadata: { tokensUsed: tokenUsages.ux } },
          usage: { totalTokens: tokenUsages.ux }
        })
        .mockResolvedValueOnce({
          object: { analysis: { overallScore: 6 }, metadata: { tokensUsed: tokenUsages.seo } },
          usage: { totalTokens: tokenUsages.seo }
        });

      const conversionResult = await provider.analyzeConversionPsychology(mockCrawlData);
      const uxResult = await provider.analyzeUX(mockCrawlData);
      const seoResult = await provider.analyzeTechnicalSEO(mockCrawlData);
      
      const totalTokens = conversionResult.metadata.tokensUsed + 
                         uxResult.metadata.tokensUsed + 
                         seoResult.metadata.tokensUsed;
      
      // Total token usage should be within expected range for comprehensive analysis
      expect(totalTokens).toBeLessThan(3000);
      expect(totalTokens).toBeGreaterThan(2000);
      
      // Individual analysis token usage should be reasonable
      expect(conversionResult.metadata.tokensUsed).toBeLessThan(1200);
      expect(uxResult.metadata.tokensUsed).toBeLessThan(1000);
      expect(seoResult.metadata.tokensUsed).toBeLessThan(1100);
    });
  });

  describe('Memory Usage and Resource Management', () => {
    it('should handle large content efficiently without memory issues', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      mockGenerateObject.mockResolvedValue({
        object: {
          analysis: { overallScore: 7 },
          metadata: { tokensUsed: 1500 }
        },
        usage: { totalTokens: 1500 }
      });

      // Create large content mock
      const largeCrawlData = {
        ...mockCrawlData,
        content: 'Large content '.repeat(1000), // Simulate large page content
        headings: {
          h1: ['Main'].concat(Array(20).fill('Heading')),
          h2: Array(50).fill('Subheading'),
          h3: Array(100).fill('Sub-subheading')
        }
      };

      const startMemory = process.memoryUsage();
      
      await provider.analyzeConversionPsychology(largeCrawlData);
      
      const endMemory = process.memoryUsage();
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should clean up resources after analysis completion', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      mockGenerateObject.mockResolvedValue({
        object: {
          analysis: { overallScore: 7 },
          metadata: { tokensUsed: 800 }
        },
        usage: { totalTokens: 800 }
      });

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Run multiple analyses to check for memory leaks
      for (let i = 0; i < 10; i++) {
        await provider.analyzeConversionPsychology(mockCrawlData);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be minimal after multiple analyses
      expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024); // Less than 20MB growth
    });
  });

  describe('Error Recovery Performance', () => {
    it('should handle API failures with quick recovery', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      // First call fails, second succeeds
      mockGenerateObject
        .mockRejectedValueOnce(new Error('API temporarily unavailable'))
        .mockResolvedValueOnce({
          object: {
            analysis: { overallScore: 5 },
            metadata: { tokensUsed: 600 }
          },
          usage: { totalTokens: 600 }
        });

      const startTime = Date.now();
      
      // This should trigger fallback mechanism quickly
      const result = await provider.analyzeConversionPsychology(mockCrawlData);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should recover quickly with fallback
      expect(duration).toBeLessThan(2000);
      expect(result.analysis.overallScore).toBeDefined();
    });

    it('should maintain performance under timeout scenarios', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      // Mock a slow response that would timeout
      mockGenerateObject.mockImplementation(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve({
            object: { analysis: { overallScore: 5 }, metadata: { tokensUsed: 800 } },
            usage: { totalTokens: 800 }
          }), 40000) // 40 second delay - should trigger timeout
        )
      );

      const startTime = Date.now();
      
      const result = await provider.analyzeConversionPsychology(mockCrawlData);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should timeout and fallback within 35 seconds (as per anthropic.ts timeout)
      expect(duration).toBeLessThan(36000);
      expect(result.analysis.overallScore).toBeDefined();
    });
  });

  describe('Batch Analysis Performance', () => {
    it('should efficiently handle multiple page analyses', async () => {
      const { generateObject } = await import('ai');
      const mockGenerateObject = generateObject as any;
      
      mockGenerateObject.mockResolvedValue({
        object: {
          analysis: { overallScore: 7 },
          metadata: { tokensUsed: 800 }
        },
        usage: { totalTokens: 800 }
      });

      const pages = Array(5).fill(null).map((_, i) => ({
        ...mockCrawlData,
        url: `https://example.com/page-${i}`,
        title: `Page ${i}`
      }));

      const startTime = Date.now();
      
      const results = await Promise.all(
        pages.map(page => provider.analyzeConversionPsychology(page))
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete 5 page analyses in reasonable time
      expect(duration).toBeLessThan(15000); // Less than 15 seconds for 5 pages
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.analysis.overallScore).toBeDefined();
      });
    });
  });
});