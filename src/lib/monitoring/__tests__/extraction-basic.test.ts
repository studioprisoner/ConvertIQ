import { describe, it, expect } from 'vitest';

describe('Extraction Sentry Integration', () => {
  it('should load extraction sentry module', async () => {
    const module = await import('../extraction-sentry');
    
    expect(module.trackExtractionStart).toBeDefined();
    expect(module.trackExtractionSuccess).toBeDefined();
    expect(module.trackExtractionError).toBeDefined();
    expect(module.ExtractionPerformanceMonitor).toBeDefined();
  });

  it('should create performance monitor instance', () => {
    const { ExtractionPerformanceMonitor } = require('../extraction-sentry');
    
    const context = {
      userId: 'user-123',
      websiteId: 'website-456',
      url: 'https://example.com',
      extractionType: 'test',
      firecrawlVersion: 'v2' as const,
    };
    
    const monitor = new ExtractionPerformanceMonitor(context);
    expect(monitor).toBeDefined();
  });
});