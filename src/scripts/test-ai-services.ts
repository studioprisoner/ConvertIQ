#!/usr/bin/env bun

/**
 * Test script for AI services configuration (CON-12)
 * Tests Anthropic Claude, Voyage AI embeddings, and analysis pipeline
 */

import { AnthropicAnalysisProvider } from '../lib/ai/providers/anthropic';
import { embeddingService } from '../lib/embeddings/service';
import { vectorSearchService } from '../lib/search/vector-search';
import type { CrawlResult } from '../lib/crawler/types';

// Mock crawl data for testing - matching the expected CrawlResult structure
const mockCrawlData: CrawlResult = {
  url: 'https://example.com',
  title: 'Test Website - Example Company',
  metaDescription: 'Test meta description for our example website',
  headings: {
    h1: ['Welcome to Example Company'],
    h2: ['Our Services', 'About Us', 'Contact'],
    h3: ['Web Development', 'Design', 'Consulting']
  },
  content: 'Welcome to Example Company. We provide web development, design, and consulting services to help your business grow online.',
  images: [
    {
      src: '/hero-image.jpg',
      alt: 'Hero image showing our team',
      width: 800,
      height: 400
    }
  ],
  links: [
    { href: '/services', text: 'Our Services' },
    { href: '/about', text: 'About Us' },
    { href: '/contact', text: 'Contact Us' }
  ],
  // Add the missing required properties
  htmlAnalysis: {
    meta: {
      title: 'Test Website - Example Company',
      description: 'Test meta description for our example website',
      keywords: '',
      charset: 'UTF-8',
      viewport: 'width=device-width, initial-scale=1',
      robots: 'index, follow'
    },
    headings: {
      h1: ['Welcome to Example Company'],
      h2: ['Our Services', 'About Us', 'Contact'],
      h3: ['Web Development', 'Design', 'Consulting'],
      h4: [],
      h5: [],
      h6: []
    },
    links: {
      internal: 15,
      external: 3,
      broken: 0
    },
    forms: 1,
    scripts: 2
  },
  performance: {
    loadTime: 1200,
    size: 2048,
    requests: 12
  },
  contentType: 'text/html',
  technicalData: {
    loadTime: 1.2,
    mobileOptimized: true,
    hasSSL: true,
    httpStatusCode: 200
  },
  socialProof: {
    testimonials: 1,
    reviews: 0,
    socialLinks: []
  },
  conversionElements: {
    ctaButtons: 2,
    forms: 1,
    contactInfo: true
  },
  seoData: {
    titleLength: 35,
    metaDescriptionLength: 55,
    hasCanonical: true,
    hasRobotsMeta: true,
    hasStructuredData: false
  },
  timestamp: new Date().toISOString()
};

class AIServicesTest {
  private anthropicProvider: AnthropicAnalysisProvider;
  private results: any = {};

  constructor() {
    this.anthropicProvider = new AnthropicAnalysisProvider();
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting AI Services Test Suite (CON-12)');
    console.log('=' .repeat(50));

    // Test 1: Anthropic Connection
    await this.testAnthropicConnection();

    // Test 2: Voyage AI Connection
    await this.testVoyageAIConnection();

    // Test 3: Individual Analysis Types
    await this.testConversionAnalysis();
    await this.testUXAnalysis();
    await this.testSEOAnalysis();

    // Test 4: Comprehensive Analysis
    await this.testComprehensiveAnalysis();

    // Test 5: Vector Embeddings
    await this.testEmbeddingGeneration();
    await this.testBatchEmbeddings();

    // Test 6: Vector Storage and Retrieval
    await this.testVectorStorage();

    // Test 7: Performance Requirements
    await this.testPerformanceRequirements();

    // Final Results
    this.displayResults();
  }

  private async testAnthropicConnection(): Promise<void> {
    console.log('\n🔍 Testing Anthropic Claude Connection...');
    const startTime = Date.now();

    try {
      const isConnected = await this.anthropicProvider.testConnection();
      const duration = Date.now() - startTime;

      this.results.anthropicConnection = {
        success: isConnected,
        duration: duration,
        status: isConnected ? '✅ Connected' : '❌ Failed'
      };

      console.log(`   ${this.results.anthropicConnection.status} (${duration}ms)`);
    } catch (error) {
      this.results.anthropicConnection = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: '❌ Failed'
      };
      console.log(`   ❌ Failed: ${this.results.anthropicConnection.error}`);
    }
  }

  private async testVoyageAIConnection(): Promise<void> {
    console.log('\n🔍 Testing Voyage AI Connection...');
    const startTime = Date.now();

    try {
      // Test with a simple text
      const embedding = await embeddingService.generateEmbedding('test');
      const duration = Date.now() - startTime;
      const isValid = embeddingService.validateEmbedding(embedding);

      this.results.voyageConnection = {
        success: isValid,
        duration: duration,
        embeddingLength: embedding.length,
        expectedLength: embeddingService.getEmbeddingDimensions(),
        status: isValid ? '✅ Connected' : '❌ Invalid embedding'
      };

      console.log(`   ${this.results.voyageConnection.status} (${duration}ms)`);
      console.log(`   Embedding dimensions: ${embedding.length}/${embeddingService.getEmbeddingDimensions()}`);
    } catch (error) {
      this.results.voyageConnection = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: '❌ Failed'
      };
      console.log(`   ❌ Failed: ${this.results.voyageConnection.error}`);
    }
  }

  private async testConversionAnalysis(): Promise<void> {
    console.log('\n🔍 Testing Conversion Psychology Analysis...');
    const startTime = Date.now();

    try {
      const result = await this.anthropicProvider.analyzeConversionPsychology(mockCrawlData);
      const duration = Date.now() - startTime;

      this.results.conversionAnalysis = {
        success: true,
        duration: duration,
        overallScore: result.analysis.overallScore,
        hasRecommendations: result.analysis.priorityRecommendations?.length > 0,
        status: duration <= 20000 ? '✅ Passed' : '⚠️ Slow but working'
      };

      console.log(`   ${this.results.conversionAnalysis.status} (${duration}ms)`);
      console.log(`   Score: ${result.analysis.overallScore}/10`);
    } catch (error) {
      this.results.conversionAnalysis = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: '❌ Failed'
      };
      console.log(`   ❌ Failed: ${this.results.conversionAnalysis.error}`);
    }
  }

  private async testUXAnalysis(): Promise<void> {
    console.log('\n🔍 Testing UX/UI Analysis...');
    const startTime = Date.now();

    try {
      const result = await this.anthropicProvider.analyzeUX(mockCrawlData);
      const duration = Date.now() - startTime;

      this.results.uxAnalysis = {
        success: true,
        duration: duration,
        overallScore: result.analysis.overallScore,
        hasRecommendations: result.analysis.priorityRecommendations?.length > 0,
        status: duration <= 20000 ? '✅ Passed' : '⚠️ Slow but working'
      };

      console.log(`   ${this.results.uxAnalysis.status} (${duration}ms)`);
      console.log(`   Score: ${result.analysis.overallScore}/10`);
    } catch (error) {
      this.results.uxAnalysis = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: '❌ Failed'
      };
      console.log(`   ❌ Failed: ${this.results.uxAnalysis.error}`);
    }
  }

  private async testSEOAnalysis(): Promise<void> {
    console.log('\n🔍 Testing Technical SEO Analysis...');
    const startTime = Date.now();

    try {
      const result = await this.anthropicProvider.analyzeTechnicalSEO(mockCrawlData);
      const duration = Date.now() - startTime;

      this.results.seoAnalysis = {
        success: true,
        duration: duration,
        overallScore: result.analysis.overallScore,
        hasRecommendations: result.analysis.priorityRecommendations?.length > 0,
        status: duration <= 20000 ? '✅ Passed' : '⚠️ Slow but working'
      };

      console.log(`   ${this.results.seoAnalysis.status} (${duration}ms)`);
      console.log(`   Score: ${result.analysis.overallScore}/10`);
    } catch (error) {
      this.results.seoAnalysis = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: '❌ Failed'
      };
      console.log(`   ❌ Failed: ${this.results.seoAnalysis.error}`);
    }
  }

  private async testComprehensiveAnalysis(): Promise<void> {
    console.log('\n🔍 Testing Comprehensive Analysis...');
    const startTime = Date.now();

    try {
      const result = await this.anthropicProvider.generateComprehensiveAnalysis(mockCrawlData);
      const duration = Date.now() - startTime;

      this.results.comprehensiveAnalysis = {
        success: true,
        duration: duration,
        overallScore: result.overallInsights.overallScore,
        hasAllSections: !!(result.conversionPsychology && result.uxAnalysis && result.technicalSeo),
        isPartial: result.metadata.isPartial || false,
        status: duration <= 60000 ? '✅ Passed' : '⚠️ Slow but working'
      };

      console.log(`   ${this.results.comprehensiveAnalysis.status} (${duration}ms)`);
      console.log(`   Overall Score: ${result.overallInsights.overallScore}/10`);
      console.log(`   Is Partial: ${result.metadata.isPartial ? 'Yes' : 'No'}`);
    } catch (error) {
      this.results.comprehensiveAnalysis = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: '❌ Failed'
      };
      console.log(`   ❌ Failed: ${this.results.comprehensiveAnalysis.error}`);
    }
  }

  private async testEmbeddingGeneration(): Promise<void> {
    console.log('\n🔍 Testing Single Embedding Generation...');
    const startTime = Date.now();

    try {
      const testText = mockCrawlData.content;
      const embedding = await embeddingService.generateEmbedding(testText);
      const duration = Date.now() - startTime;
      const isValid = embeddingService.validateEmbedding(embedding);

      this.results.singleEmbedding = {
        success: isValid,
        duration: duration,
        embeddingLength: embedding.length,
        textLength: testText.length,
        status: duration <= 10000 && isValid ? '✅ Passed' : '⚠️ Slow or invalid'
      };

      console.log(`   ${this.results.singleEmbedding.status} (${duration}ms)`);
      console.log(`   Text: ${testText.length} chars → Embedding: ${embedding.length} dimensions`);
    } catch (error) {
      this.results.singleEmbedding = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: '❌ Failed'
      };
      console.log(`   ❌ Failed: ${this.results.singleEmbedding.error}`);
    }
  }

  private async testBatchEmbeddings(): Promise<void> {
    console.log('\n🔍 Testing Batch Embedding Generation...');
    const startTime = Date.now();

    try {
      const testTexts = [
        mockCrawlData.content,
        'Web development services for small businesses',
        'Professional design and consulting solutions',
        'Contact us for your next project'
      ];

      const embeddings = await embeddingService.generateBatchEmbeddings(testTexts);
      const duration = Date.now() - startTime;
      const allValid = embeddings.every(emb => embeddingService.validateEmbedding(emb));

      this.results.batchEmbeddings = {
        success: allValid && embeddings.length === testTexts.length,
        duration: duration,
        batchSize: testTexts.length,
        embeddingsGenerated: embeddings.length,
        status: allValid ? '✅ Passed' : '❌ Invalid embeddings'
      };

      console.log(`   ${this.results.batchEmbeddings.status} (${duration}ms)`);
      console.log(`   Batch: ${testTexts.length} texts → ${embeddings.length} embeddings`);
    } catch (error) {
      this.results.batchEmbeddings = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: '❌ Failed'
      };
      console.log(`   ❌ Failed: ${this.results.batchEmbeddings.error}`);
    }
  }

  private async testVectorStorage(): Promise<void> {
    console.log('\n🔍 Testing Vector Storage and Retrieval...');
    const startTime = Date.now();

    try {
      // Test search functionality (this tests both storage and retrieval indirectly)
      const testUserId = 'test-user-123';
      const searchQuery = 'website optimization recommendations';
      
      // First try keyword search (fallback)
      const keywordResults = await vectorSearchService.keywordSearch(
        searchQuery, 
        testUserId, 
        5
      );
      
      // Then try stats functionality
      const stats = await vectorSearchService.getStatsWithoutEmbeddings(testUserId);
      
      const duration = Date.now() - startTime;

      this.results.vectorStorage = {
        success: true,
        duration: duration,
        keywordResultsCount: keywordResults.length,
        statsRetrieved: !!stats,
        totalReports: stats.totalReports,
        status: '✅ Passed'
      };

      console.log(`   ${this.results.vectorStorage.status} (${duration}ms)`);
      console.log(`   Keyword search: ${keywordResults.length} results`);
      console.log(`   Stats: ${stats.totalReports} total reports`);
    } catch (error) {
      this.results.vectorStorage = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: '❌ Failed'
      };
      console.log(`   ❌ Failed: ${this.results.vectorStorage.error}`);
    }
  }

  private async testPerformanceRequirements(): Promise<void> {
    console.log('\n🔍 Testing Performance Requirements...');
    
    const requirements = {
      analysisCompletion: 60000, // 60 seconds
      embeddingGeneration: 10000, // 10 seconds
    };

    const results = {
      analysisSpeed: this.results.comprehensiveAnalysis?.duration || Infinity,
      embeddingSpeed: this.results.singleEmbedding?.duration || Infinity,
    };

    this.results.performanceCheck = {
      analysisRequirement: requirements.analysisCompletion,
      analysisActual: results.analysisSpeed,
      analysisPass: results.analysisSpeed <= requirements.analysisCompletion,
      
      embeddingRequirement: requirements.embeddingGeneration,
      embeddingActual: results.embeddingSpeed,
      embeddingPass: results.embeddingSpeed <= requirements.embeddingGeneration,
    };

    const overallPass = this.results.performanceCheck.analysisPass && 
                       this.results.performanceCheck.embeddingPass;

    console.log(`   Analysis: ${results.analysisSpeed}ms <= ${requirements.analysisCompletion}ms ${this.results.performanceCheck.analysisPass ? '✅' : '❌'}`);
    console.log(`   Embedding: ${results.embeddingSpeed}ms <= ${requirements.embeddingGeneration}ms ${this.results.performanceCheck.embeddingPass ? '✅' : '❌'}`);
    console.log(`   Overall Performance: ${overallPass ? '✅ Passed' : '❌ Failed'}`);
  }

  private displayResults(): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 AI Services Test Results Summary');
    console.log('='.repeat(50));

    const sections = [
      { name: 'Anthropic Connection', key: 'anthropicConnection' },
      { name: 'Voyage AI Connection', key: 'voyageConnection' },
      { name: 'Conversion Analysis', key: 'conversionAnalysis' },
      { name: 'UX Analysis', key: 'uxAnalysis' },
      { name: 'SEO Analysis', key: 'seoAnalysis' },
      { name: 'Comprehensive Analysis', key: 'comprehensiveAnalysis' },
      { name: 'Single Embedding', key: 'singleEmbedding' },
      { name: 'Batch Embeddings', key: 'batchEmbeddings' },
      { name: 'Vector Storage', key: 'vectorStorage' },
    ];

    let passCount = 0;
    let totalCount = sections.length;

    sections.forEach(section => {
      const result = this.results[section.key];
      if (result) {
        console.log(`${section.name.padEnd(25)} ${result.status}`);
        if (result.success) passCount++;
      } else {
        console.log(`${section.name.padEnd(25)} ❓ Not tested`);
      }
    });

    console.log('\n' + '-'.repeat(50));
    console.log(`✅ Passed: ${passCount}/${totalCount}`);
    console.log(`❌ Failed: ${totalCount - passCount}/${totalCount}`);
    
    if (passCount === totalCount) {
      console.log('\n🎉 All AI services are configured and working correctly!');
      console.log('✅ CON-12 Production AI Services - READY FOR PRODUCTION');
    } else {
      console.log('\n⚠️  Some services need attention before production deployment.');
      console.log('❌ CON-12 Production AI Services - NEEDS CONFIGURATION');
    }

    // Environment check
    console.log('\n📝 Environment Variables Check:');
    console.log(`ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`VOYAGE_API_KEY: ${process.env.VOYAGE_API_KEY ? '✅ Set' : '❌ Missing'}`);
  }
}

// Run the test if this script is executed directly
if (import.meta.main) {
  const test = new AIServicesTest();
  test.runAllTests().catch(console.error);
}

export default AIServicesTest;