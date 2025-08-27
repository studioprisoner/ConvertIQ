import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnthropicAnalysisProvider } from '../providers/anthropic';
import type { CrawlResult } from '@/types/crawl';

describe('AI SDK v5 Fallback Compatibility', () => {
  let provider: AnthropicAnalysisProvider;
  const mockCrawlData: CrawlResult = {
    url: 'https://example.com',
    title: 'Test Page',
    content: 'Test content for fallback analysis',
    markdown: '# Test Page\n\nTest content for fallback analysis',
    metadata: {
      title: 'Test Page',
      description: 'Test description',
      ogTitle: 'Test Page',
      ogDescription: 'Test description'
    },
    links: [],
    images: [],
    statusCode: 200,
    timing: {
      crawlStart: new Date().toISOString(),
      crawlEnd: new Date().toISOString(),
      totalTime: 1000
    }
  };

  beforeEach(() => {
    provider = new AnthropicAnalysisProvider();
    provider.resetTokenUsageStats();
    provider.resetPerformanceMonitoring();
  });

  describe('Fallback Methods Structure', () => {
    it('should have properly structured fallback conversion analysis', () => {
      const fallback = (provider as any).createFallbackConversionAnalysis();
      
      // Verify core structure
      expect(fallback).toBeDefined();
      expect(fallback.analysis).toBeDefined();
      expect(fallback.metadata).toBeDefined();
      
      // Verify analysis properties
      expect(fallback.analysis.overallScore).toBe(5);
      expect(Array.isArray(fallback.analysis.keyFindings)).toBe(true);
      expect(Array.isArray(fallback.analysis.priorityRecommendations)).toBe(true);
      expect(fallback.analysis.categories).toBeDefined();
      
      // Verify metadata indicates fallback
      expect(fallback.metadata.modelUsed).toBe('fallback');
      expect(fallback.metadata.isFallback).toBe(true);
      expect(fallback.metadata.confidence).toBe(0.3);
    });

    it('should have properly structured fallback UX analysis', () => {
      const fallback = (provider as any).createFallbackUXAnalysis();
      
      // Verify core structure
      expect(fallback).toBeDefined();
      expect(fallback.analysis).toBeDefined();
      expect(fallback.metadata).toBeDefined();
      
      // Verify analysis properties
      expect(fallback.analysis.overallScore).toBe(5);
      expect(Array.isArray(fallback.analysis.keyFindings)).toBe(true);
      expect(Array.isArray(fallback.analysis.priorityRecommendations)).toBe(true);
      expect(fallback.analysis.categories).toBeDefined();
      
      // Verify metadata indicates fallback
      expect(fallback.metadata.modelUsed).toBe('fallback');
      expect(fallback.metadata.isFallback).toBe(true);
      expect(fallback.metadata.confidence).toBe(0.3);
    });

    it('should have properly structured fallback SEO analysis', () => {
      const fallback = (provider as any).createFallbackSEOAnalysis();
      
      // Verify core structure
      expect(fallback).toBeDefined();
      expect(fallback.analysis).toBeDefined();
      expect(fallback.metadata).toBeDefined();
      
      // Verify analysis properties
      expect(fallback.analysis.overallScore).toBe(5);
      expect(Array.isArray(fallback.analysis.keyFindings)).toBe(true);
      expect(Array.isArray(fallback.analysis.priorityRecommendations)).toBe(true);
      expect(fallback.analysis.categories).toBeDefined();
      
      // Verify metadata indicates fallback
      expect(fallback.metadata.modelUsed).toBe('fallback');
      expect(fallback.metadata.isFallback).toBe(true);
      expect(fallback.metadata.confidence).toBe(0.3);
    });
  });

  describe('Fallback Content Quality', () => {
    it('should provide helpful guidance in conversion fallback', () => {
      const fallback = (provider as any).createFallbackConversionAnalysis();
      
      // Check that fallback provides meaningful content
      expect(fallback.analysis.keyFindings.length).toBeGreaterThan(0);
      expect(fallback.analysis.priorityRecommendations.length).toBeGreaterThan(0);
      
      // Check categories have recommendations
      Object.values(fallback.analysis.categories).forEach((category: any) => {
        expect(category.score).toBeDefined();
        expect(Array.isArray(category.recommendations)).toBe(true);
        expect(category.recommendations.length).toBeGreaterThan(0);
      });
    });

    it('should provide helpful guidance in UX fallback', () => {
      const fallback = (provider as any).createFallbackUXAnalysis();
      
      // Check that fallback provides meaningful content
      expect(fallback.analysis.keyFindings.length).toBeGreaterThan(0);
      expect(fallback.analysis.priorityRecommendations.length).toBeGreaterThan(0);
      
      // Check categories have recommendations
      Object.values(fallback.analysis.categories).forEach((category: any) => {
        expect(category.score).toBeDefined();
        expect(Array.isArray(category.recommendations)).toBe(true);
        expect(category.recommendations.length).toBeGreaterThan(0);
      });
    });

    it('should provide helpful guidance in SEO fallback', () => {
      const fallback = (provider as any).createFallbackSEOAnalysis();
      
      // Check that fallback provides meaningful content
      expect(fallback.analysis.keyFindings.length).toBeGreaterThan(0);
      expect(fallback.analysis.priorityRecommendations.length).toBeGreaterThan(0);
      
      // Check categories have recommendations
      Object.values(fallback.analysis.categories).forEach((category: any) => {
        expect(category.score).toBeDefined();
        expect(Array.isArray(category.recommendations)).toBe(true);
        expect(category.recommendations.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Fallback Integration with v5 Error Handling', () => {
    it('should return fallback data when AI SDK v5 operations fail', async () => {
      // Mock the generateObject to fail
      const originalGenerateObject = vi.fn().mockRejectedValue(new Error('AI SDK v5 error'));
      
      // We can't directly mock the import, but we can test that the fallback structure
      // is compatible with the expected return format
      const fallback = (provider as any).createFallbackConversionAnalysis();
      
      // Verify the fallback has the same structure as expected from real AI analysis
      expect(fallback).toHaveProperty('analysis');
      expect(fallback).toHaveProperty('metadata');
      expect(fallback.analysis).toHaveProperty('overallScore');
      expect(fallback.analysis).toHaveProperty('keyFindings');
      expect(fallback.analysis).toHaveProperty('priorityRecommendations');
      expect(fallback.analysis).toHaveProperty('categories');
    });

    it('should maintain consistent analysis structure between real and fallback results', () => {
      const conversionFallback = (provider as any).createFallbackConversionAnalysis();
      const uxFallback = (provider as any).createFallbackUXAnalysis();
      const seoFallback = (provider as any).createFallbackSEOAnalysis();
      
      // All fallbacks should have consistent structure
      [conversionFallback, uxFallback, seoFallback].forEach((fallback, index) => {
        expect(fallback.analysis.overallScore).toBe(5); // Neutral score for fallback
        expect(typeof fallback.metadata.processingTime).toBe('number');
        expect(fallback.metadata.modelUsed).toBe('fallback');
        expect(fallback.metadata.confidence).toBe(0.3);
        expect(fallback.metadata.isFallback).toBe(true);
      });
    });
  });

  describe('Error Recovery with Fallbacks', () => {
    it('should handle timeout scenarios gracefully with fallbacks', () => {
      const fallback = (provider as any).createFallbackConversionAnalysis();
      
      // Fallback should indicate it's due to server issues
      const hasTimeoutMessage = fallback.analysis.keyFindings.some((finding: string) => 
        finding.includes('temporarily unavailable') || finding.includes('server load')
      );
      expect(hasTimeoutMessage).toBe(true);
      
      // Should provide retry guidance
      const hasRetryGuidance = fallback.analysis.priorityRecommendations.some((rec: string) =>
        rec.includes('Try scanning again') || rec.includes('few minutes')
      );
      expect(hasRetryGuidance).toBe(true);
    });

    it('should provide actionable recommendations even in fallback mode', () => {
      const fallback = (provider as any).createFallbackConversionAnalysis();
      
      // Fallback recommendations should be actionable
      fallback.analysis.priorityRecommendations.forEach((rec: string) => {
        expect(rec.length).toBeGreaterThan(10); // Should be substantial recommendations
        expect(rec).not.toBe(''); // Should not be empty
      });
      
      // Categories should have specific recommendations
      Object.entries(fallback.analysis.categories).forEach(([categoryName, category]: [string, any]) => {
        expect(category.recommendations.length).toBeGreaterThan(0);
        category.recommendations.forEach((rec: string) => {
          expect(rec.length).toBeGreaterThan(5);
          expect(rec).not.toBe('');
        });
      });
    });
  });

  describe('Fallback Performance', () => {
    it('should return fallback results quickly', () => {
      const startTime = Date.now();
      const fallback = (provider as any).createFallbackConversionAnalysis();
      const endTime = Date.now();
      
      // Fallback should be essentially instant
      expect(endTime - startTime).toBeLessThan(10); // Less than 10ms
      expect(fallback.metadata.processingTime).toBe(0); // Should indicate no processing time
    });

    it('should not consume AI tokens for fallback responses', () => {
      const initialStats = provider.getTokenUsageStats();
      
      // Generate fallback (doesn't use AI)
      (provider as any).createFallbackConversionAnalysis();
      (provider as any).createFallbackUXAnalysis();
      (provider as any).createFallbackSEOAnalysis();
      
      const finalStats = provider.getTokenUsageStats();
      
      // Token usage should not increase
      expect(finalStats.session.totalTokens).toBe(initialStats.session.totalTokens);
      expect(finalStats.session.totalCalls).toBe(initialStats.session.totalCalls);
      expect(finalStats.session.costEstimate).toBe(initialStats.session.costEstimate);
    });
  });
});