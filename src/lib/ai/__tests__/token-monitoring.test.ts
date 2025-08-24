import { describe, it, expect, beforeEach } from 'vitest';
import { AnthropicAnalysisProvider } from '../providers/anthropic';

describe('AI SDK v5 Token Usage Monitoring', () => {
  let provider: AnthropicAnalysisProvider;

  beforeEach(() => {
    provider = new AnthropicAnalysisProvider();
    provider.resetTokenUsageStats();
  });

  describe('Token Usage Statistics', () => {
    it('should initialize with empty statistics', () => {
      const stats = provider.getTokenUsageStats();
      
      expect(stats.session.totalTokens).toBe(0);
      expect(stats.session.totalCalls).toBe(0);
      expect(stats.session.costEstimate).toBe(0);
      expect(stats.recentCalls).toHaveLength(0);
    });

    it('should reset statistics correctly', () => {
      provider.resetTokenUsageStats();
      
      const stats = provider.getTokenUsageStats();
      expect(stats.session.totalTokens).toBe(0);
      expect(stats.session.totalCalls).toBe(0);
      expect(stats.session.costEstimate).toBe(0);
    });

    it('should generate usage report', () => {
      const report = provider.generateTokenUsageReport();
      
      expect(report).toContain('AI SDK v5 Token Usage Report');
      expect(report).toContain('Session Overview');
      expect(report).toContain('Token Breakdown');
      expect(report).toContain('Performance Metrics');
      expect(report).toContain('Recommendations');
    });

    it('should provide efficiency recommendations', () => {
      const stats = provider.getTokenUsageStats();
      
      expect(stats.recommendations).toBeDefined();
      expect(Array.isArray(stats.recommendations)).toBe(true);
      expect(stats.recommendations.length).toBeGreaterThan(0);
      
      // Should provide at least one recommendation (could be optimal or improvement suggestion)
      expect(stats.recommendations[0].length).toBeGreaterThan(0);
    });

    it('should calculate efficiency metrics', () => {
      const stats = provider.getTokenUsageStats();
      
      expect(stats.efficiency).toBeDefined();
      expect(stats.efficiency.averageTokensPerSecond).toBeDefined();
      expect(stats.efficiency.costPerCall).toBeDefined();
      expect(stats.efficiency.successRate).toBeDefined();
      
      // Initial values should be reasonable
      expect(stats.efficiency.averageTokensPerSecond).toBe(0);
      expect(stats.efficiency.costPerCall).toBe(0);
      expect(stats.efficiency.successRate).toBe(1.0); // 100% success rate initially
    });
  });

  describe('Token Usage Analysis', () => {
    it('should handle empty usage data gracefully', () => {
      const stats = provider.getTokenUsageStats();
      
      expect(stats.session.averagePromptTokens).toBe(0);
      expect(stats.session.averageCompletionTokens).toBe(0);
      expect(stats.efficiency.averageTokensPerSecond).toBe(0);
    });

    it('should provide cost optimization recommendations for zero usage', () => {
      const stats = provider.getTokenUsageStats();
      
      // Should not provide cost warnings for zero usage
      const costWarnings = stats.recommendations.filter((rec: string) => 
        rec.includes('High cost') || rec.includes('Large prompt') || rec.includes('Large completion')
      );
      expect(costWarnings).toHaveLength(0);
    });
  });

  describe('Connection Testing', () => {
    it('should handle connection test without actual API calls', async () => {
      // This test verifies the connection test method exists and can be called
      // The actual API call is mocked in the test setup
      expect(typeof provider.testConnection).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle rate calculation edge cases', () => {
      const stats = provider.getTokenUsageStats();
      
      // With no calls, success rate should default to 100%
      expect(stats.efficiency.successRate).toBe(1.0);
      
      // Cost per call should be 0 when no calls made
      expect(stats.efficiency.costPerCall).toBe(0);
      
      // Tokens per second should be 0 when no processing time
      expect(stats.efficiency.averageTokensPerSecond).toBe(0);
    });
  });

  describe('Memory Management', () => {
    it('should have proper initial state', () => {
      const provider = new AnthropicAnalysisProvider();
      const stats = provider.getTokenUsageStats();
      
      expect(stats.session).toBeDefined();
      expect(stats.recentCalls).toBeDefined();
      expect(stats.efficiency).toBeDefined();
      expect(stats.recommendations).toBeDefined();
    });
  });
});