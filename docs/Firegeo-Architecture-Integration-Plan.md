# ConvertIQ Architecture Overhaul Plan: Integrating Firegeo Patterns with Firecrawl APIs

**Date**: August 25, 2025  
**Author**: Claude Code Assistant  
**Status**: Planning Phase  

## Executive Summary

Based on analysis of the [Firegeo codebase](https://github.com/firecrawl/firegeo) and your current ConvertIQ architecture, this document outlines a comprehensive plan to modernize your application by adopting Firegeo's architectural patterns while maintaining AI SDK integration and leveraging Firecrawl APIs more effectively.

### Firegeo Analysis Key Findings

**Firegeo Strengths**:
- Modern Next.js 15 full-stack architecture with modular project structure
- Multi-provider AI integration (OpenAI, Anthropic, Google Gemini, Perplexity)
- Sophisticated Firecrawl integration with brand monitoring capabilities
- Comprehensive authentication with Better Auth
- One-command setup script and developer-friendly workflows
- Robust billing integration with Autumn (Stripe)

**Current ConvertIQ State**:
- Solid foundation with Next.js 15, tRPC, Drizzle ORM
- Existing Firecrawl integration but underutilized
- AI SDK v5 implementation with Anthropic focus
- Room for architectural improvements and enhanced Firecrawl utilization

## Phase 1: Core Architecture Modernization (1-2 weeks)

### 1.1 Directory Structure Reorganization

**Current Structure Issues**:
- Components organized by type rather than feature
- Configuration scattered across multiple locations
- Missing dedicated hooks and config directories

**Proposed New Structure**:
```
src/
├── app/ (Next.js app directory - maintain current)
├── components/
│   ├── ui/ (shadcn/ui components - enhanced)
│   ├── features/ (feature-specific components)
│   │   ├── analysis/
│   │   ├── dashboard/
│   │   ├── reports/
│   │   ├── scanning/
│   │   └── auth/
│   ├── layouts/ (layout components)
│   └── common/ (shared components)
├── lib/
│   ├── ai/ (AI providers and utilities)
│   ├── firecrawl/ (enhanced Firecrawl integration)
│   ├── config/ (centralized configuration)
│   ├── hooks/ (feature-specific hooks)
│   └── utils/ (utility functions)
├── hooks/ (global hooks)
├── config/ (application configuration)
├── types/ (TypeScript definitions - enhanced)
└── constants/ (application constants)
```

**Implementation Tasks**:
- [ ] Reorganize components by feature domain
- [ ] Create centralized config directory
- [ ] Extract custom hooks to dedicated directories
- [ ] Implement better TypeScript type organization

### 1.2 Configuration System Enhancement

**Adopt Firegeo's Config Patterns**:
```typescript
// config/index.ts
export const config = {
  app: {
    name: 'ConvertIQ',
    url: process.env.NEXT_PUBLIC_APP_URL,
    description: 'AI-powered website optimization platform'
  },
  ai: {
    providers: {
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-3-haiku-20240307'
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4'
      }
    }
  },
  firecrawl: {
    apiKey: process.env.FIRECRAWL_API_KEY,
    baseUrl: 'https://api.firecrawl.dev',
    rateLimits: {
      scrape: 100,
      crawl: 10,
      extract: 50
    }
  }
}
```

**Implementation Tasks**:
- [ ] Create centralized configuration system
- [ ] Implement environment-based config validation
- [ ] Add API key rotation capabilities
- [ ] Enhance feature flags system

### 1.3 Component Library Standardization

**Firegeo Component Patterns to Adopt**:
- Consistent shadcn/ui usage
- Component composition patterns
- Proper error boundaries
- Loading states standardization

**Implementation Tasks**:
- [ ] Standardize UI components using shadcn/ui patterns
- [ ] Implement reusable hooks for common functionality
- [ ] Create consistent error handling components
- [ ] Standardize loading states across the application

## Phase 2: Enhanced Firecrawl Integration (2-3 weeks)

### 2.1 Advanced Firecrawl API Utilization

**Current Limitations**:
- Basic scraping functionality only
- Limited error handling
- No batch processing
- Underutilized v2 features

**Enhanced Integration Plan**:

#### 2.1.1 Firecrawl v2 Extract API Implementation
```typescript
// lib/firecrawl/extract.ts
import { Firecrawl } from '@mendable/firecrawl-js';
import { z } from 'zod';

const conversionAuditSchema = z.object({
  businessInfo: z.object({
    name: z.string(),
    description: z.string(),
    industry: z.string()
  }),
  callsToAction: z.array(z.object({
    text: z.string(),
    position: z.string(),
    prominence: z.enum(['primary', 'secondary', 'tertiary'])
  })),
  socialProof: z.object({
    testimonials: z.array(z.string()),
    trustBadges: z.array(z.string()),
    clientLogos: z.array(z.string())
  }),
  psychologyTriggers: z.object({
    scarcity: z.boolean(),
    urgency: z.boolean(),
    authority: z.boolean(),
    socialProof: z.boolean()
  })
});

export class EnhancedFirecrawlService {
  private firecrawl: Firecrawl;

  constructor(apiKey: string) {
    this.firecrawl = new Firecrawl({ apiKey });
  }

  async extractStructuredData(urls: string[], extractionType: 'conversion' | 'seo' | 'technical') {
    const schema = this.getSchemaForType(extractionType);
    const prompt = this.getPromptForType(extractionType);

    return await this.firecrawl.extract({
      urls,
      prompt,
      schema: schema.parse,
      showSources: true
    });
  }

  async batchScrapeWithAnalysis(urls: string[]) {
    return await this.firecrawl.batchScrape(urls, {
      formats: ['markdown', 'extract'],
      pageOptions: {
        onlyMainContent: true,
        includeLinks: true,
        includeImages: true
      }
    });
  }

  async crawlWebsiteComplete(baseUrl: string, options: CrawlOptions) {
    return await this.firecrawl.crawl(baseUrl, {
      maxDepth: options.maxDepth || 3,
      maxLinks: options.maxLinks || 100,
      onlyDomain: true,
      formats: ['markdown', 'extract'],
      pageOptions: {
        onlyMainContent: true
      }
    });
  }
}
```

#### 2.1.2 Brand Monitoring Implementation (ConvertIQ-specific)
```typescript
// lib/firecrawl/monitoring.ts
export class WebsiteMonitoringService {
  async setupWebsiteMonitoring(websiteId: string, monitoringOptions: {
    checkFrequency: 'hourly' | 'daily' | 'weekly',
    alertOnChanges: boolean,
    competitorUrls?: string[]
  }) {
    // Implementation for automated website monitoring
    // Track changes in content, CTAs, pricing, etc.
  }

  async detectWebsiteChanges(previousScan: any, currentScan: any) {
    // AI-powered change detection
    // Highlight significant changes in conversion elements
  }
}
```

**Implementation Tasks**:
- [ ] Implement Firecrawl v2 Extract API integration
- [ ] Add batch processing capabilities
- [ ] Create website mapping and discovery features
- [ ] Implement brand monitoring and change detection
- [ ] Enhanced error handling and retry mechanisms

### 2.2 AI-Powered Data Processing Pipeline

**Multi-Provider AI Integration**:
```typescript
// lib/ai/providers.ts
export class AIProviderManager {
  private providers: Map<string, any> = new Map();

  constructor() {
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('gemini', new GeminiProvider());
  }

  async analyzeWithOptimalProvider(data: any, analysisType: string) {
    const provider = this.selectOptimalProvider(analysisType);
    return await provider.analyze(data);
  }

  private selectOptimalProvider(analysisType: string): AIProvider {
    // Cost and capability-based provider selection
    switch (analysisType) {
      case 'conversion-analysis':
        return this.providers.get('anthropic'); // Best for detailed analysis
      case 'seo-analysis':
        return this.providers.get('openai'); // Cost-effective for structured data
      case 'content-generation':
        return this.providers.get('gemini'); // Good for creative content
      default:
        return this.providers.get('anthropic');
    }
  }
}
```

**Implementation Tasks**:
- [ ] Implement multi-provider AI system
- [ ] Create intelligent provider selection logic
- [ ] Maintain AI SDK v5 integration
- [ ] Add cost optimization features
- [ ] Implement fallback mechanisms

## Phase 3: Advanced Analysis Capabilities (1-2 weeks)

### 3.1 Structured Data Extraction Enhancement

**Firegeo-Inspired Analysis Patterns**:
```typescript
// lib/analysis/extraction-engine.ts
export class AdvancedExtractionEngine {
  async performComprehensiveAnalysis(websiteUrl: string) {
    // 1. Firecrawl extraction
    const crawlData = await this.firecrawlService.crawlWebsiteComplete(websiteUrl);
    
    // 2. Structured data extraction
    const structuredData = await this.firecrawlService.extractStructuredData(
      crawlData.pages.map(p => p.url),
      'comprehensive'
    );
    
    // 3. AI-powered analysis
    const aiAnalysis = await this.aiProviderManager.analyzeWithOptimalProvider(
      structuredData,
      'comprehensive-audit'
    );
    
    // 4. Generate actionable recommendations
    const recommendations = await this.generateRecommendations(aiAnalysis);
    
    return {
      crawlData,
      structuredData,
      aiAnalysis,
      recommendations
    };
  }
}
```

**Implementation Tasks**:
- [ ] Enhanced structured data extraction with custom schemas
- [ ] Real-time analysis streaming capabilities
- [ ] Batch processing for large websites
- [ ] Advanced prompt engineering and templating

### 3.2 Real-Time Processing Pipeline

**Streaming Analysis Implementation**:
```typescript
// lib/analysis/streaming.ts
export class StreamingAnalysisService {
  async *streamWebsiteAnalysis(websiteUrl: string) {
    yield { phase: 'crawling', progress: 0 };
    
    const crawlResult = await this.firecrawl.crawl(websiteUrl);
    yield { phase: 'crawling', progress: 100, data: crawlResult };
    
    yield { phase: 'extraction', progress: 0 };
    
    for (const [index, page] of crawlResult.pages.entries()) {
      const pageAnalysis = await this.analyzePageWithAI(page);
      const progress = ((index + 1) / crawlResult.pages.length) * 100;
      
      yield { 
        phase: 'extraction', 
        progress, 
        data: { page: page.url, analysis: pageAnalysis } 
      };
    }
    
    yield { phase: 'complete', progress: 100 };
  }
}
```

**Implementation Tasks**:
- [ ] Implement streaming analysis pipeline
- [ ] Real-time progress updates
- [ ] WebSocket integration for live updates
- [ ] Background job processing optimization

## Phase 4: User Experience Modernization (2-3 weeks)

### 4.1 Dashboard Enhancement (Firegeo-Inspired)

**Modern Dashboard Features**:
- Real-time analytics with live updates
- Interactive charts and visualizations
- Responsive design improvements
- Better data presentation

**Implementation Tasks**:
- [ ] Implement real-time dashboard updates
- [ ] Add interactive analytics components
- [ ] Improve responsive design
- [ ] Enhanced data visualization

### 4.2 Workflow Optimization

**One-Command Setup (Like Firegeo)**:
```bash
# scripts/setup.ts
export async function setupConvertIQ() {
  console.log('🚀 Setting up ConvertIQ...');
  
  // 1. Environment validation
  await validateEnvironment();
  
  // 2. Database setup
  await setupDatabase();
  
  // 3. API key validation
  await validateAPIKeys();
  
  // 4. Initial data seeding
  await seedInitialData();
  
  console.log('✅ ConvertIQ setup complete!');
}
```

**Implementation Tasks**:
- [ ] Create one-command setup script
- [ ] Improve onboarding flow
- [ ] Better error handling and user feedback
- [ ] Progressive web app features

## Phase 5: Infrastructure & DevOps (1 week)

### 5.1 Development Workflow Enhancement

**GitHub Actions Improvements** (Based on Firegeo):
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline
on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      - name: Install dependencies
        run: bun install
      - name: Run tests
        run: bun test
      - name: Build application
        run: bun run build
        env:
          FIRECRAWL_API_KEY: ${{ secrets.FIRECRAWL_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

**Implementation Tasks**:
- [ ] Enhanced GitHub Actions workflows
- [ ] Automated testing strategies
- [ ] Deployment pipeline optimization
- [ ] Performance monitoring integration

### 5.2 Scalability Improvements

**Database and Performance Optimization**:
```typescript
// lib/database/optimization.ts
export class DatabaseOptimizer {
  async optimizeForLargeDatasets() {
    // Implement indexing strategies
    // Connection pooling optimization
    // Query optimization
  }
  
  async implementCaching() {
    // Redis caching layer
    // Application-level caching
    // CDN integration
  }
}
```

**Implementation Tasks**:
- [ ] Database optimization for larger datasets
- [ ] Caching strategies implementation
- [ ] API rate limiting and optimization
- [ ] Background job processing enhancement

## Implementation Strategy

### Technical Approach

1. **Maintain Current Functionality**: All changes will be additive initially
2. **Feature Flags**: Gradual rollout of new features
3. **Database Migrations**: Careful schema evolution strategy
4. **API Versioning**: Backward compatibility maintenance

### Risk Mitigation

- **Incremental Implementation**: Phase-by-phase rollout
- **Comprehensive Testing**: Unit, integration, and E2E tests
- **Database Backups**: Before any schema changes
- **Rollback Plans**: For each phase
- **Feature Flags**: Safe deployment and quick rollbacks

### Dependencies to Add

```json
{
  "dependencies": {
    "@mendable/firecrawl-js": "^3.2.0", // Already present, enhance usage
    "zod": "^3.25.17", // Already present
    "ai": "5.0.0", // Already present, maintain
    // New additions for multi-provider AI
    "@ai-sdk/openai": "2.0.0", // Already present
    "@ai-sdk/google": "^0.0.x", // Add for Gemini support
    // Enhanced UI components
    "framer-motion": "^12.23.6", // Already present
    "recharts": "^2.8.0", // For enhanced analytics
    // Real-time features
    "socket.io": "^4.7.0",
    "socket.io-client": "^4.7.0"
  }
}
```

## Success Metrics

### Development Metrics
- **Development Velocity**: Faster feature development due to better organization
- **Code Quality**: Improved maintainability and testability
- **Developer Experience**: Better tooling and workflows

### User Experience Metrics
- **Page Load Performance**: Improved through better architecture
- **User Engagement**: Enhanced through modern UI patterns
- **Feature Adoption**: Better discoverability and usability

### Technical Metrics
- **System Reliability**: Improved error handling and monitoring
- **Scalability**: Better performance under load
- **Cost Optimization**: Intelligent AI provider selection

## Timeline Summary

| Phase | Duration | Focus Area |
|-------|----------|------------|
| Phase 1 | 1-2 weeks | Core Architecture |
| Phase 2 | 2-3 weeks | Firecrawl Enhancement |
| Phase 3 | 1-2 weeks | AI Integration |
| Phase 4 | 2-3 weeks | UX Modernization |
| Phase 5 | 1 week | Infrastructure |
| **Total** | **7-11 weeks** | **Complete Overhaul** |

## Next Steps

1. **Review and Approve Plan**: Stakeholder review of this document
2. **Phase 1 Kickoff**: Begin with directory structure reorganization
3. **Proof of Concept**: Implement key Firegeo patterns in isolated environment
4. **Gradual Migration**: Phase-by-phase implementation with feature flags
5. **Testing and Optimization**: Continuous testing throughout implementation

## Conclusion

This comprehensive plan will transform ConvertIQ into a more scalable, maintainable, and user-friendly platform by adopting proven patterns from Firegeo while enhancing Firecrawl integration and maintaining the strengths of your current AI SDK implementation. The phased approach ensures minimal disruption while maximizing the benefits of modern architecture patterns.

---

*This document will be updated as implementation progresses and requirements evolve.*