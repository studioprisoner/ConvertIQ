# Comprehensive Testing Strategy for System Overhaul

## Overview

This document outlines the comprehensive testing strategy for the dual upgrade project involving Firecrawl v2 API migration and AI SDK v5 stable release upgrade. The strategy ensures system reliability, data integrity, and performance optimization throughout the transition.

## Testing Architecture

### Testing Phases

1. **Pre-Migration Testing** - Baseline establishment
2. **Component Testing** - Individual system component validation  
3. **Integration Testing** - Cross-system functionality validation
4. **Performance Testing** - System performance and optimization
5. **User Acceptance Testing** - End-to-end user experience validation
6. **Production Testing** - Gradual rollout and monitoring

### Test Environment Setup

#### Environment Configurations
```bash
# Test Environment Database Branches (Neon)
- testing-firecrawl-v2: Isolated branch for Firecrawl v2 testing
- testing-ai-sdk-v5: Isolated branch for AI SDK v5 testing  
- testing-integrated: Combined system testing environment
- staging-production: Pre-production validation environment

# Environment Variables
FIRECRAWL_API_KEY_V2=<test-api-key>
FIRECRAWL_API_KEY_V1=<fallback-api-key>
AI_SDK_VERSION=v5-stable
ANTHROPIC_API_KEY=<test-key-with-limits>
TEST_MODE=true
ENABLE_FEATURE_FLAGS=true
```

#### Test Data Setup
```typescript
// Test website URLs for comprehensive testing
const testWebsites = {
  ecommerce: [
    'https://demo-store.myshopify.com',
    'https://sample-ecommerce.com'
  ],
  service: [
    'https://demo-agency.com',
    'https://sample-consulting.com'
  ],
  blog: [
    'https://demo-blog.com',
    'https://sample-content-site.com'
  ],
  homepage: [
    'https://demo-startup.com',
    'https://sample-business.com'
  ]
};
```

## Phase 1: Pre-Migration Baseline Testing

### Current System Performance Baseline

#### Database Performance Metrics
```bash
# Establish baseline metrics for current system
bun run scripts/test-baseline-performance.ts

# Metrics to capture:
# - Average scan completion time
# - Database query performance
# - AI analysis response times
# - Memory usage patterns
# - API rate limit utilization
```

#### Current Analysis Quality Baseline
```typescript
// scripts/baseline-analysis-quality.ts
interface BaselineMetrics {
  conversionAnalysis: {
    averageScore: number;
    completionRate: number;
    analysisDepth: number;
    recommendationCount: number;
  };
  seoAnalysis: {
    elementDetectionAccuracy: number;
    technicalIssueIdentification: number;
    recommendationRelevance: number;
  };
  uxAnalysis: {
    usabilityScoreConsistency: number;
    issueIdentificationRate: number;
    actionabilityScore: number;
  };
}

// Run baseline tests on 50+ diverse websites
const baseline = await establishAnalysisBaseline(testWebsites);
```

### Firecrawl v1 Performance Metrics
```typescript
// Current performance benchmarks
interface V1Benchmarks {
  averageResponseTime: number;
  successRate: number;
  dataExtractionAccuracy: number;
  tokenConsumption: number;
  apiCallVolume: number;
  errorRate: number;
}
```

### AI SDK Beta Performance Metrics
```typescript
// Current AI SDK beta performance
interface AISDKBetaMetrics {
  generateObjectLatency: number;
  generateTextLatency: number;
  tokenUsageEfficiency: number;
  errorHandlingReliability: number;
  timeoutOccurrenceRate: number;
}
```

## Phase 2: Component Testing Strategy

### Firecrawl v2 API Testing

#### Unit Tests for New API Integration
```typescript
// tests/firecrawl-v2/api-integration.test.ts
describe('Firecrawl v2 API Integration', () => {
  describe('Basic Scraping', () => {
    it('should scrape URL with basic options', async () => {
      const result = await firecrawlV2.scrape(testUrl, {
        formats: ['markdown', 'html'],
        pageOptions: { onlyMainContent: true }
      });
      
      expect(result.success).toBe(true);
      expect(result.data.markdown).toBeDefined();
      expect(result.data.html).toBeDefined();
    });

    it('should handle timeout correctly', async () => {
      const result = await firecrawlV2.scrape(slowUrl, {
        pageOptions: { timeout: 5000 }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('Extract Feature', () => {
    it('should extract structured data for e-commerce pages', async () => {
      const schema = ecommerceExtractionSchema;
      const result = await firecrawlV2.extract({
        urls: [ecommerceTestUrl],
        prompt: "Extract product and business information",
        schema: schema
      });
      
      expect(result.success).toBe(true);
      expect(result.data[0].businessInfo).toBeDefined();
      expect(result.data[0].products).toBeInstanceOf(Array);
    });

    it('should validate extraction schema compliance', async () => {
      // Test each page type schema
      for (const pageType of ['ecommerce', 'service', 'homepage', 'blog']) {
        const result = await testExtractionSchema(pageType);
        expect(result.schemaValid).toBe(true);
      }
    });
  });

  describe('Batch Processing', () => {
    it('should handle batch URL processing', async () => {
      const urls = testWebsites.ecommerce.slice(0, 3);
      const result = await firecrawlV2.batchScrape(urls, {
        formats: ['markdown'],
        pageOptions: { onlyMainContent: true }
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(urls.length);
    });
  });
});
```

#### Performance Testing for Firecrawl v2
```typescript
// tests/firecrawl-v2/performance.test.ts
describe('Firecrawl v2 Performance', () => {
  it('should meet response time requirements', async () => {
    const startTime = Date.now();
    const result = await firecrawlV2.scrape(testUrl);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(30000); // 30 second max
    expect(result.success).toBe(true);
  });

  it('should handle concurrent requests efficiently', async () => {
    const urls = testWebsites.homepage.slice(0, 5);
    const promises = urls.map(url => firecrawlV2.scrape(url));
    
    const startTime = Date.now();
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    expect(results.every(r => r.success)).toBe(true);
    expect(duration).toBeLessThan(60000); // Should complete within 60s
  });
});
```

### AI SDK v5 Testing

#### API Compatibility Testing
```typescript
// tests/ai-sdk-v5/compatibility.test.ts
describe('AI SDK v5 Compatibility', () => {
  describe('generateObject Function', () => {
    it('should maintain existing generateObject behavior', async () => {
      const result = await generateObject({
        model: anthropic('claude-3-haiku-20240307'),
        system: testSystemPrompt,
        prompt: testPrompt,
        schema: testSchema,
        temperature: 0.3
      });
      
      expect(result.object).toBeDefined();
      expect(result.usage).toBeDefined();
      expect(typeof result.object.analysis).toBe('object');
    });

    it('should handle schema validation correctly', async () => {
      const invalidPrompt = "Return invalid data format";
      
      await expect(generateObject({
        model: anthropic('claude-3-haiku-20240307'),
        prompt: invalidPrompt,
        schema: strictTestSchema,
      })).rejects.toThrow(); // Should reject invalid schema
    });
  });

  describe('Error Handling Improvements', () => {
    it('should provide detailed error information', async () => {
      try {
        await generateObject({
          model: anthropic('invalid-model'),
          prompt: "test",
          schema: testSchema
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('model');
      }
    });
  });
});
```

#### Token Usage and Cost Analysis
```typescript
// tests/ai-sdk-v5/cost-analysis.test.ts
describe('AI SDK v5 Cost Analysis', () => {
  it('should track token usage accurately', async () => {
    const result = await generateObject({
      model: anthropic('claude-3-haiku-20240307'),
      prompt: longAnalysisPrompt,
      schema: complexAnalysisSchema
    });
    
    expect(result.usage.promptTokens).toBeGreaterThan(0);
    expect(result.usage.completionTokens).toBeGreaterThan(0);
    expect(result.usage.totalTokens).toBe(
      result.usage.promptTokens + result.usage.completionTokens
    );
  });

  it('should compare token usage between v5 beta and stable', async () => {
    // Run same analysis with both versions
    const betaResult = await runWithBetaSDK(testPrompt);
    const stableResult = await runWithStableSDK(testPrompt);
    
    // Log comparison for analysis
    console.log('Token usage comparison:', {
      beta: betaResult.usage,
      stable: stableResult.usage,
      difference: calculateUsageDifference(betaResult, stableResult)
    });
  });
});
```

## Phase 3: Integration Testing

### End-to-End Workflow Testing

#### Complete Scan Workflow
```typescript
// tests/integration/complete-workflow.test.ts
describe('Complete Scan Workflow Integration', () => {
  it('should complete full scan with v2 APIs', async () => {
    const testUser = await createTestUser();
    const testWebsite = await createTestWebsite(testUser.id);
    
    // Step 1: Initiate scan
    const scanResult = await startScan({
      websiteId: testWebsite.id,
      url: testUrl,
      scanType: 'full'
    });
    
    expect(scanResult.status).toBe('pending');
    
    // Step 2: Wait for completion
    const completedScan = await waitForScanCompletion(scanResult.id, 60000);
    
    expect(completedScan.status).toBe('completed');
    expect(completedScan.result).toBeDefined();
    expect(completedScan.extractionResults).toBeDefined();
    
    // Step 3: Verify AI analysis
    const analysisResult = await getAnalysisResults(completedScan.id);
    expect(analysisResult.conversionPsychology).toBeDefined();
    expect(analysisResult.technicalSeo).toBeDefined();
    expect(analysisResult.uxAnalysis).toBeDefined();
  });

  it('should handle page-specific analysis workflow', async () => {
    const pages = await getWebsitePages(testWebsite.id);
    const selectedPage = pages[0];
    
    const analysisResult = await startPageAnalysis({
      pageId: selectedPage.id,
      analysisTypes: ['conversion_optimization', 'seo_analysis']
    });
    
    expect(analysisResult.status).toBe('pending');
    
    const completedAnalysis = await waitForAnalysisCompletion(
      analysisResult.id, 
      120000
    );
    
    expect(completedAnalysis.status).toBe('completed');
    expect(completedAnalysis.analysisResult).toBeDefined();
  });
});
```

### Database Integration Testing

#### Enhanced Schema Testing
```typescript
// tests/integration/database-schema.test.ts
describe('Enhanced Database Schema Integration', () => {
  it('should store Firecrawl v2 results correctly', async () => {
    const scanResult = await firecrawlV2.scrape(testUrl, fullOptions);
    
    const storedScan = await db.insert(scans).values({
      websiteId: testWebsiteId,
      url: testUrl,
      result: scanResult.data,
      extractionResults: scanResult.extractedData,
      metadata: {
        firecrawlVersion: 'v2',
        processingTime: scanResult.processingTime,
        apiCallCount: scanResult.apiCallCount
      }
    }).returning();
    
    expect(storedScan[0]).toBeDefined();
    expect(storedScan[0].extractionResults).toBeDefined();
    expect(storedScan[0].metadata.firecrawlVersion).toBe('v2');
  });

  it('should handle page embeddings storage', async () => {
    const pageContent = await extractPageContent(testUrl);
    const embedding = await generateEmbedding(pageContent);
    
    const storedEmbedding = await db.insert(pageEmbeddings).values({
      pageId: testPageId,
      contentEmbedding: embedding.vector,
      embeddingProvider: 'voyage-ai',
      embeddingModel: 'voyage-large-2-instruct',
      chunkIndex: 0
    }).returning();
    
    expect(storedEmbedding[0]).toBeDefined();
    expect(storedEmbedding[0].contentEmbedding).toBeDefined();
  });
});
```

## Phase 4: Performance Testing

### Load Testing Strategy

#### API Performance Testing
```bash
# Load testing scripts using Artillery or similar
# artillery/firecrawl-v2-load-test.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 300  # 5 minutes
      arrivalRate: 2  # 2 requests per second
  payload:
    path: './test-urls.csv'

scenarios:
  - name: 'Scan Website Flow'
    weight: 70
    flow:
      - post:
          url: '/api/trpc/scan.initiateScan'
          json:
            url: '{{ url }}'
            scanType: 'full'
      - think: 30
      - get:
          url: '/api/trpc/scan.getScanStatus?id={{ scanId }}'

  - name: 'Page Analysis Flow'  
    weight: 30
    flow:
      - post:
          url: '/api/trpc/analysis.startAnalysis'
          json:
            pageIds: ['{{ pageId }}']
            analysisTypes: ['conversion_optimization']
```

#### Database Performance Testing
```typescript
// tests/performance/database-performance.test.ts
describe('Database Performance Under Load', () => {
  it('should handle concurrent scan insertions', async () => {
    const concurrentScans = 50;
    const scanPromises = [];
    
    for (let i = 0; i < concurrentScans; i++) {
      scanPromises.push(createTestScan({
        url: `https://test-${i}.com`,
        extractionResults: generateMockExtractionResults()
      }));
    }
    
    const startTime = Date.now();
    const results = await Promise.all(scanPromises);
    const duration = Date.now() - startTime;
    
    expect(results).toHaveLength(concurrentScans);
    expect(duration).toBeLessThan(10000); // Should complete within 10s
  });

  it('should query extraction results efficiently', async () => {
    // Create test data
    await seedExtractionTestData(1000);
    
    const startTime = Date.now();
    const results = await db.query.scans.findMany({
      where: eq(scans.status, 'completed'),
      with: {
        extractionResults: true
      },
      limit: 100
    });
    const duration = Date.now() - startTime;
    
    expect(results).toHaveLength(100);
    expect(duration).toBeLessThan(500); // Should complete within 500ms
  });
});
```

### Memory Usage and Optimization
```typescript
// tests/performance/memory-optimization.test.ts
describe('Memory Usage Optimization', () => {
  it('should not cause memory leaks during batch processing', async () => {
    const initialMemory = process.memoryUsage();
    
    // Process 100 URLs in batches
    for (let batch = 0; batch < 10; batch++) {
      const urls = generateTestUrls(10);
      await processBatchUrls(urls);
      
      // Force garbage collection if available
      if (global.gc) global.gc();
    }
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    // Memory increase should be reasonable (less than 100MB)
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
  });
});
```

## Phase 5: User Acceptance Testing

### User Interface Testing

#### Analysis Results Display
```typescript
// tests/e2e/user-interface.test.ts
describe('User Interface Experience', () => {
  it('should display enhanced analysis results correctly', async () => {
    await page.goto('/dashboard/reports/test-report-id/analysis');
    
    // Wait for analysis results to load
    await page.waitForSelector('[data-testid="analysis-results"]');
    
    // Verify extraction results are displayed
    const businessInfo = await page.textContent('[data-testid="business-info"]');
    expect(businessInfo).toContain('Business Name');
    
    // Verify structured CTAs are shown
    const ctaSection = await page.locator('[data-testid="cta-analysis"]');
    await expect(ctaSection).toBeVisible();
    
    // Test interaction with analysis details
    await page.click('[data-testid="expand-analysis"]');
    await page.waitForSelector('[data-testid="detailed-analysis"]');
  });

  it('should handle analysis initiation flow smoothly', async () => {
    await page.goto('/dashboard/reports/test-report-id');
    
    // Start analysis
    await page.click('[data-testid="start-analysis-btn"]');
    await page.waitForSelector('[data-testid="analysis-dialog"]');
    
    // Select pages and analysis types
    await page.check('[data-testid="page-selection-0"]');
    await page.check('[data-testid="analysis-type-conversion"]');
    
    // Submit analysis
    await page.click('[data-testid="start-analysis-submit"]');
    
    // Verify loading state
    await page.waitForSelector('[data-testid="analysis-in-progress"]');
    
    expect(await page.textContent('[data-testid="progress-message"]'))
      .toContain('Analysis in progress');
  });
});
```

### Performance User Experience
```typescript
// tests/e2e/performance-ux.test.ts
describe('Performance User Experience', () => {
  it('should provide responsive feedback during scan', async () => {
    await page.goto('/dashboard');
    
    // Start new scan
    await page.fill('[data-testid="url-input"]', testUrl);
    await page.click('[data-testid="start-scan-btn"]');
    
    // Verify immediate feedback
    await page.waitForSelector('[data-testid="scan-progress"]', { timeout: 2000 });
    
    // Check progress updates
    let progressUpdates = 0;
    page.on('websocket', ws => {
      ws.on('framereceived', event => {
        if (event.payload.includes('progress')) {
          progressUpdates++;
        }
      });
    });
    
    // Wait for completion
    await page.waitForSelector('[data-testid="scan-completed"]', { timeout: 60000 });
    
    expect(progressUpdates).toBeGreaterThan(0);
  });
});
```

## Phase 6: Production Testing Strategy

### Feature Flag Implementation
```typescript
// Feature flag configuration for gradual rollout
interface FeatureFlags {
  firecrawlV2Enabled: boolean;
  aiSdkV5Enabled: boolean;
  enhancedExtractionEnabled: boolean;
  batchProcessingEnabled: boolean;
}

// Gradual rollout strategy
const rolloutStrategy = {
  week1: { firecrawlV2Enabled: true, percentage: 5 },
  week2: { firecrawlV2Enabled: true, percentage: 25 },
  week3: { aiSdkV5Enabled: true, percentage: 10 },
  week4: { enhancedExtractionEnabled: true, percentage: 15 },
  week5: { allFeatures: true, percentage: 50 },
  week6: { allFeatures: true, percentage: 100 }
};
```

### Monitoring and Alerting
```typescript
// Production monitoring implementation
interface MonitoringMetrics {
  firecrawlV2: {
    successRate: number;
    averageResponseTime: number;
    errorTypes: Record<string, number>;
    extractionAccuracy: number;
  };
  aiSdkV5: {
    tokenUsageEfficiency: number;
    responseLatency: number;
    errorRate: number;
    qualityScore: number;
  };
  database: {
    queryPerformance: number;
    storageEfficiency: number;
    indexUtilization: number;
  };
}

// Alerting thresholds
const alertThresholds = {
  firecrawlErrorRate: 5,        // Alert if >5% error rate
  aiSdkLatency: 10000,         // Alert if >10s response time  
  dbQueryTime: 1000,           // Alert if >1s query time
  extractionFailureRate: 3     // Alert if >3% extraction failures
};
```

### A/B Testing Strategy
```typescript
// A/B testing configuration
interface ABTestConfig {
  testName: string;
  variants: {
    control: 'firecrawl-v1',
    treatment: 'firecrawl-v2'
  };
  splitRatio: { control: 50, treatment: 50 };
  successMetrics: [
    'analysisQualityScore',
    'extractionAccuracy', 
    'processingTime',
    'userSatisfaction'
  ];
  minimumSampleSize: 500;
  testDuration: '2weeks';
}

// Comparative analysis implementation
const runComparisonTest = async (config: ABTestConfig) => {
  const results = await Promise.all([
    processWithV1(testUrls.slice(0, 250)),
    processWithV2(testUrls.slice(250, 500))
  ]);
  
  return {
    controlMetrics: calculateMetrics(results[0]),
    treatmentMetrics: calculateMetrics(results[1]),
    statisticalSignificance: calculateSignificance(results[0], results[1])
  };
};
```

## Testing Tools and Infrastructure

### Required Testing Tools
```bash
# Testing framework setup
bun add -d vitest @testing-library/react @testing-library/jest-dom
bun add -d playwright @playwright/test
bun add -d artillery  # Load testing
bun add -d @faker-js/faker  # Test data generation
```

### Test Data Management
```typescript
// Test data factories
class TestDataFactory {
  static createWebsite(overrides = {}) {
    return {
      id: faker.datatype.uuid(),
      url: faker.internet.url(),
      domain: faker.internet.domainName(),
      userId: faker.datatype.uuid(),
      ...overrides
    };
  }

  static createExtractionResult(pageType: PageType) {
    const schemas = {
      ecommerce: () => ({
        businessInfo: {
          name: faker.company.name(),
          description: faker.company.catchPhrase()
        },
        products: Array.from({length: 3}, () => ({
          name: faker.commerce.productName(),
          price: faker.commerce.price()
        }))
      }),
      service: () => ({
        businessInfo: {
          name: faker.company.name(),
          services: Array.from({length: 2}, () => faker.commerce.department())
        }
      })
    };
    
    return schemas[pageType]();
  }
}
```

### Continuous Integration Testing
```yaml
# .github/workflows/system-overhaul-tests.yml
name: System Overhaul Testing

on:
  pull_request:
    branches: [ dev, main ]
  push:
    branches: [ dev ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test tests/firecrawl-v2
      - run: bun test tests/ai-sdk-v5
      
  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test tests/integration
      
  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun playwright install
      - run: bun test:e2e
      
  performance-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3  
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test:performance
```

## Success Criteria and Metrics

### Performance Benchmarks
- **Firecrawl v2**: 20% improvement in data extraction accuracy
- **AI SDK v5**: Maintain current analysis quality with improved stability  
- **Overall System**: <5% performance degradation during transition
- **User Experience**: No increase in user-reported issues

### Quality Assurance Metrics
- **Test Coverage**: Maintain >90% code coverage
- **Bug Rate**: <2% increase in production bugs during rollout
- **User Satisfaction**: Maintain >4.5/5 user satisfaction rating
- **System Reliability**: >99.9% uptime during transition

### Success Milestones
1. **Week 1-2**: All unit tests passing with new APIs
2. **Week 3-4**: Integration tests passing with enhanced features  
3. **Week 5-6**: E2E tests validating complete user workflows
4. **Week 7-8**: Performance tests showing acceptable metrics
5. **Week 9-10**: Production rollout with monitoring validation
6. **Week 11-12**: Full system migration completion and optimization

This comprehensive testing strategy ensures a reliable, well-validated upgrade path for both Firecrawl v2 and AI SDK v5 implementations while maintaining system integrity and user experience throughout the transition.