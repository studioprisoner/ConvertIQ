# Enhanced Website Data Extraction with Firecrawl v2

## Overview

This document outlines the implementation of advanced data extraction capabilities using Firecrawl v2's natural language extraction features. This system will dramatically improve the quality and structure of data input for AI analysis.

## Current Data Extraction Limitations

### Current State (Firecrawl v1 + Custom Crawler)
- **Raw HTML/Markdown**: Basic content extraction without structure
- **Manual Parsing**: CSS selector-based extraction in `src/lib/crawler/crawler.ts`
- **Limited Intelligence**: Heuristic-based element classification
- **Inconsistent Quality**: Varies greatly across different website structures

### Current Extraction in `crawler.ts`
```typescript
// Current basic extraction methods
private extractCTAs($: cheerio.CheerioAPI): CrawlResult['htmlAnalysis']['ctas'] {
  // Simple CSS selector approach
  $('button, .btn, .button, a[class*="btn"]').each((_, element) => {
    // Basic heuristics for CTA detection
  });
}

private extractForms($: cheerio.CheerioAPI): CrawlResult['htmlAnalysis']['forms'] {
  // Manual form field parsing
  $('form').each((_, element) => {
    // Extract fields one by one
  });
}
```

## Firecrawl v2 Enhanced Extraction

### Natural Language Extraction Capability

Firecrawl v2's **extract** feature allows using natural language prompts to extract structured data, making it far more intelligent and reliable than CSS selectors.

#### Basic Extract Usage
```typescript
const extractResult = await firecrawl.extract({
  urls: [url],
  prompt: "Extract business information, products, and conversion elements",
  schema: extractionSchema
});
```

## Extraction Templates by Page Type

### 1. E-commerce Product Pages

```typescript
const ecommerceProductSchema = {
  type: "object",
  properties: {
    product: {
      type: "object",
      properties: {
        name: { type: "string" },
        price: { 
          type: "object",
          properties: {
            current: { type: "string" },
            original: { type: "string" },
            currency: { type: "string" },
            discount: { type: "string" }
          }
        },
        description: { type: "string" },
        features: { type: "array", items: { type: "string" } },
        specifications: { type: "object" },
        images: { type: "array", items: { type: "string" } },
        availability: { type: "string" },
        sku: { type: "string" },
        category: { type: "string" },
        brand: { type: "string" },
        rating: {
          type: "object", 
          properties: {
            score: { type: "number" },
            count: { type: "number" },
            distribution: { type: "object" }
          }
        }
      }
    },
    callsToAction: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          type: { type: "string", enum: ["buy", "add-to-cart", "checkout", "contact", "learn-more"] },
          prominence: { type: "string", enum: ["primary", "secondary", "tertiary"] },
          position: { type: "string" },
          urgency: { type: "string" },
          offer: { type: "string" }
        }
      }
    },
    socialProof: {
      type: "object",
      properties: {
        reviews: {
          type: "array",
          items: {
            type: "object",
            properties: {
              rating: { type: "number" },
              text: { type: "string" },
              author: { type: "string" },
              date: { type: "string" },
              verified: { type: "boolean" }
            }
          }
        },
        testimonials: { type: "array", items: { type: "string" } },
        trustBadges: { type: "array", items: { type: "string" } },
        securityFeatures: { type: "array", items: { type: "string" } },
        guarantees: { type: "array", items: { type: "string" } }
      }
    },
    conversionElements: {
      type: "object",
      properties: {
        scarcityIndicators: { type: "array", items: { type: "string" } },
        urgencyMessages: { type: "array", items: { type: "string" } },
        personalizedRecommendations: { type: "array", items: { type: "string" } },
        crossSells: { type: "array", items: { type: "string" } },
        upsells: { type: "array", items: { type: "string" } }
      }
    }
  }
};

const ecommercePrompt = `
Extract detailed e-commerce product information from this page. Focus on:

PRODUCT DETAILS:
- Product name, pricing (including discounts), description, and key features
- Technical specifications and product variants
- Availability status and inventory indicators

CONVERSION ELEMENTS:
- All call-to-action buttons (buy now, add to cart, etc.)
- Urgency and scarcity messages ("Only 2 left!", "Sale ends soon!")
- Trust signals and security badges

SOCIAL PROOF:
- Customer reviews and ratings with specific details
- Testimonials and customer feedback
- Trust badges, certifications, and guarantees

PSYCHOLOGY TRIGGERS:
- Scarcity indicators and limited-time offers  
- Social proof elements and popularity indicators
- Risk-reduction elements (money-back guarantee, free shipping, etc.)

Be thorough and extract all relevant conversion-focused elements.
`;
```

### 2. Service Landing Pages

```typescript
const servicePageSchema = {
  type: "object", 
  properties: {
    service: {
      type: "object",
      properties: {
        name: { type: "string" },
        tagline: { type: "string" },
        valueProposition: { type: "string" },
        benefits: { type: "array", items: { type: "string" } },
        features: { type: "array", items: { type: "string" } },
        process: { type: "array", items: { type: "string" } },
        pricing: {
          type: "object",
          properties: {
            packages: { type: "array", items: { type: "object" } },
            startingPrice: { type: "string" },
            pricingModel: { type: "string" }
          }
        }
      }
    },
    businessInfo: {
      type: "object",
      properties: {
        name: { type: "string" },
        location: { type: "string" },
        serviceArea: { type: "string" },
        yearsInBusiness: { type: "string" },
        teamSize: { type: "string" },
        specializations: { type: "array", items: { type: "string" } }
      }
    },
    contactInfo: {
      type: "object",
      properties: {
        phone: { type: "string" },
        email: { type: "string" },
        address: { type: "string" },
        hours: { type: "string" },
        contactMethods: { type: "array", items: { type: "string" } }
      }
    },
    credentialsAndProof: {
      type: "object", 
      properties: {
        certifications: { type: "array", items: { type: "string" } },
        awards: { type: "array", items: { type: "string" } },
        clientTestimonials: { type: "array", items: { type: "object" } },
        caseStudies: { type: "array", items: { type: "object" } },
        beforeAfterExamples: { type: "array", items: { type: "string" } }
      }
    },
    leadCapture: {
      type: "object",
      properties: {
        primaryOffer: { type: "string" },
        leadMagnets: { type: "array", items: { type: "string" } },
        formFields: { type: "array", items: { type: "string" } },
        guarantees: { type: "array", items: { type: "string" } }
      }
    }
  }
};
```

### 3. Corporate/Homepage

```typescript
const homepageSchema = {
  type: "object",
  properties: {
    company: {
      type: "object", 
      properties: {
        name: { type: "string" },
        mission: { type: "string" },
        vision: { type: "string" },
        values: { type: "array", items: { type: "string" } },
        foundedYear: { type: "string" },
        headquarters: { type: "string" },
        size: { type: "string" },
        industry: { type: "string" }
      }
    },
    navigation: {
      type: "object",
      properties: {
        primaryMenu: { type: "array", items: { type: "string" } },
        secondaryMenu: { type: "array", items: { type: "string" } },
        footerLinks: { type: "array", items: { type: "string" } },
        ctaButtons: { type: "array", items: { type: "object" } }
      }
    },
    heroSection: {
      type: "object",
      properties: {
        headline: { type: "string" },
        subheadline: { type: "string" },
        valueProposition: { type: "string" },
        primaryCTA: { type: "object" },
        secondaryCTA: { type: "object" },
        heroImage: { type: "string" }
      }
    },
    productsServices: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          benefits: { type: "array", items: { type: "string" } },
          link: { type: "string" }
        }
      }
    },
    socialProofElements: {
      type: "object",
      properties: {
        clientLogos: { type: "array", items: { type: "string" } },
        testimonials: { type: "array", items: { type: "object" } },
        statistics: { type: "array", items: { type: "object" } },
        awards: { type: "array", items: { type: "string" } },
        mediaMentions: { type: "array", items: { type: "string" } }
      }
    }
  }
};
```

### 4. Blog/Content Pages

```typescript
const contentPageSchema = {
  type: "object",
  properties: {
    content: {
      type: "object",
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
        author: { type: "object" },
        publishDate: { type: "string" },
        lastUpdated: { type: "string" },
        category: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        readTime: { type: "string" },
        wordCount: { type: "number" },
        headingStructure: { type: "array", items: { type: "object" } }
      }
    },
    engagement: {
      type: "object",
      properties: {
        socialSharing: { type: "array", items: { type: "string" } },
        comments: { type: "object" },
        relatedPosts: { type: "array", items: { type: "object" } },
        callsToAction: { type: "array", items: { type: "object" } },
        emailSignup: { type: "object" },
        downloadOffers: { type: "array", items: { type: "object" } }
      }
    },
    seoElements: {
      type: "object",
      properties: {
        metaTitle: { type: "string" },
        metaDescription: { type: "string" },
        canonicalUrl: { type: "string" },
        breadcrumbs: { type: "array", items: { type: "string" } },
        internalLinks: { type: "array", items: { type: "object" } },
        externalLinks: { type: "array", items: { type: "object" } }
      }
    }
  }
};
```

## Implementation Architecture

### 1. Page Type Detection

```typescript
interface PageTypeDetector {
  detectPageType(url: string, content: string): PageType;
}

class IntelligentPageTypeDetector implements PageTypeDetector {
  async detectPageType(url: string, content: string): Promise<PageType> {
    // Use AI to intelligently detect page type
    const detection = await firecrawl.extract({
      urls: [url],
      prompt: `Analyze this webpage and determine its primary type. Consider:
        - URL structure and patterns
        - Content focus and layout
        - Primary purpose and user intent
        - Business objectives
        
        Return the most specific page type from: ecommerce-product, ecommerce-category, 
        service-landing, corporate-homepage, about-us, contact, blog-post, landing-page, 
        pricing, case-study, product-comparison`,
      schema: {
        type: "object",
        properties: {
          pageType: { type: "string" },
          confidence: { type: "number" },
          reasoning: { type: "string" },
          secondaryType: { type: "string" }
        }
      }
    });
    
    return detection.pageType as PageType;
  }
}
```

### 2. Extraction Engine

```typescript
class EnhancedExtractionEngine {
  private firecrawl: Firecrawl;
  private pageTypeDetector: PageTypeDetector;
  
  constructor() {
    this.firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });
    this.pageTypeDetector = new IntelligentPageTypeDetector();
  }
  
  async extractStructuredData(url: string): Promise<StructuredPageData> {
    // 1. Detect page type
    const content = await this.firecrawl.scrape(url, {
      formats: ['markdown', 'html'],
      pageOptions: { onlyMainContent: true }
    });
    
    const pageType = await this.pageTypeDetector.detectPageType(url, content.markdown);
    
    // 2. Select appropriate extraction schema and prompt
    const { schema, prompt } = this.getExtractionConfig(pageType);
    
    // 3. Extract structured data
    const extractResult = await this.firecrawl.extract({
      urls: [url],
      prompt,
      schema,
      scrapeOptions: {
        formats: ['markdown', 'html'],
        pageOptions: {
          onlyMainContent: true,
          includeLinks: true,
          includeImages: true
        }
      }
    });
    
    // 4. Post-process and validate
    return this.processExtractionResult(extractResult, pageType, content);
  }
  
  private getExtractionConfig(pageType: PageType): ExtractionConfig {
    const configs = {
      'ecommerce-product': {
        schema: ecommerceProductSchema,
        prompt: ecommercePrompt
      },
      'service-landing': {
        schema: servicePageSchema, 
        prompt: servicePrompt
      },
      'corporate-homepage': {
        schema: homepageSchema,
        prompt: homepagePrompt
      },
      'blog-post': {
        schema: contentPageSchema,
        prompt: contentPrompt
      }
      // ... more configurations
    };
    
    return configs[pageType] || configs['corporate-homepage']; // Default fallback
  }
}
```

### 3. Integration with AI Analysis

```typescript
class EnhancedAIAnalysisEngine {
  private extractionEngine: EnhancedExtractionEngine;
  private anthropicProvider: AnthropicAnalysisProvider;
  
  async analyzeWithEnhancedData(url: string): Promise<EnhancedAnalysisResult> {
    // 1. Extract structured data
    const structuredData = await this.extractionEngine.extractStructuredData(url);
    
    // 2. Combine with traditional crawling for comprehensive view
    const crawlData = await this.traditionalCrawl(url); // Fallback data
    
    // 3. Create enhanced analysis input
    const enhancedAnalysisInput = {
      ...crawlData,
      structuredData,
      extractionMetadata: {
        pageType: structuredData.pageType,
        extractionConfidence: structuredData.confidence,
        dataRichness: this.calculateDataRichness(structuredData)
      }
    };
    
    // 4. Run AI analysis with enhanced prompts
    const analysis = await this.anthropicProvider.generateEnhancedAnalysis(enhancedAnalysisInput);
    
    return analysis;
  }
  
  private calculateDataRichness(data: StructuredPageData): number {
    // Calculate how much structured data was successfully extracted
    const fields = this.countNonNullFields(data);
    const totalPossibleFields = this.getTotalFieldCount(data.pageType);
    
    return fields / totalPossibleFields;
  }
}
```

## Enhanced AI Analysis Prompts

### Conversion Psychology Analysis with Structured Data

```typescript
const enhancedConversionPrompt = (structuredData: StructuredPageData) => `
Analyze this website for conversion optimization using both the extracted structured data and raw content.

STRUCTURED BUSINESS DATA:
${JSON.stringify(structuredData.businessInfo, null, 2)}

EXTRACTED PRODUCTS/SERVICES:
${JSON.stringify(structuredData.products || structuredData.services, null, 2)}

IDENTIFIED CALLS-TO-ACTION:
${JSON.stringify(structuredData.callsToAction, null, 2)}

SOCIAL PROOF ELEMENTS:
${JSON.stringify(structuredData.socialProof, null, 2)}

CONVERSION ELEMENTS:
${JSON.stringify(structuredData.conversionElements, null, 2)}

Based on this structured analysis, provide specific recommendations for:

1. **Psychology Triggers Analysis**
   - Rate the effectiveness of existing scarcity/urgency elements
   - Identify missing psychological triggers
   - Analyze social proof implementation

2. **CTA Optimization**  
   - Evaluate current CTA placement and prominence
   - Suggest specific text and design improvements
   - Recommend A/B testing opportunities

3. **Trust Signal Enhancement**
   - Assess current trust-building elements
   - Identify missing credibility indicators
   - Suggest placement of additional trust signals

4. **Value Proposition Clarity**
   - Analyze how clearly benefits are communicated
   - Suggest improvements to messaging hierarchy
   - Recommend positioning enhancements

Provide specific, actionable recommendations with estimated impact percentages.
`;
```

### UX Analysis with Structured Data

```typescript
const enhancedUXPrompt = (structuredData: StructuredPageData) => `
Conduct a comprehensive UX analysis using the extracted structured data:

NAVIGATION STRUCTURE:
${JSON.stringify(structuredData.navigation, null, 2)}

CONTENT ORGANIZATION:
${JSON.stringify(structuredData.contentStructure, null, 2)}

USER FLOW ELEMENTS:
${JSON.stringify(structuredData.userFlow, null, 2)}

Analyze and provide recommendations for:

1. **Navigation Clarity**
   - Menu structure effectiveness
   - Information hierarchy
   - User path optimization

2. **Content Accessibility**  
   - Information findability
   - Content scan-ability
   - Mobile optimization

3. **Interaction Design**
   - Form usability
   - CTA accessibility
   - User engagement elements

4. **Performance Indicators**
   - Page load optimization opportunities
   - Mobile responsiveness issues
   - Accessibility compliance

Rate each area 1-10 and provide specific improvement recommendations.
`;
```

## Database Integration

### Enhanced Scans Table Structure

```sql
-- Add new columns for extraction results
ALTER TABLE scans ADD COLUMN IF NOT EXISTS extraction_results JSONB;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS page_type VARCHAR(50);
ALTER TABLE scans ADD COLUMN IF NOT EXISTS extraction_confidence DECIMAL(3,2);
ALTER TABLE scans ADD COLUMN IF NOT EXISTS data_richness DECIMAL(3,2);
ALTER TABLE scans ADD COLUMN IF NOT EXISTS extraction_version VARCHAR(20) DEFAULT 'v2';

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scans_page_type ON scans(page_type);
CREATE INDEX IF NOT EXISTS idx_scans_extraction_results ON scans USING GIN(extraction_results);
CREATE INDEX IF NOT EXISTS idx_scans_extraction_confidence ON scans(extraction_confidence);
```

### Data Storage Format

```typescript
interface EnhancedScanResult {
  // Standard fields
  id: string;
  websiteId: string;
  url: string;
  
  // Enhanced extraction data
  extractionResults: {
    pageType: PageType;
    confidence: number;
    structuredData: StructuredPageData;
    rawExtractionResponse: any;
    extractionPrompts: string[];
    processingTime: number;
  };
  
  // Analysis results enhanced with structured data
  analysisResults: {
    conversionPsychology: EnhancedConversionAnalysis;
    uxAnalysis: EnhancedUXAnalysis;
    technicalSeo: EnhancedSEOAnalysis;
    overallInsights: EnhancedOverallAnalysis;
  };
  
  // Metadata
  metadata: {
    firecrawlVersion: 'v2';
    extractionVersion: string;
    aiAnalysisVersion: string;
    dataRichness: number;
    processingTime: number;
    tokenUsage: TokenUsage;
  };
}
```

## Benefits of Enhanced Extraction

### 1. Dramatically Improved Analysis Quality
- **Structured Input**: AI receives clean, organized data instead of raw HTML
- **Context Awareness**: Page-type-specific analysis provides more relevant insights
- **Comprehensive Coverage**: Catches elements that CSS selectors might miss

### 2. Reduced AI Token Usage
- **Focused Prompts**: Only relevant data sent to AI models
- **Structured Context**: Less ambiguity means more efficient processing
- **Better Results**: Higher quality input leads to better output with fewer retries

### 3. Enhanced User Experience
- **More Accurate Recommendations**: Based on actual page elements, not guesswork
- **Specific Actionable Advice**: Can reference exact CTAs, prices, testimonials
- **Page-Type Optimization**: Recommendations tailored to specific page purposes

### 4. Scalability
- **Consistent Quality**: Works across diverse website structures  
- **Automated Intelligence**: Reduces manual configuration per site
- **Future-Proof**: Easy to extend with new page types and extraction schemas

### 5. Competitive Advantage
- **Deeper Insights**: Goes beyond surface-level analysis
- **Business Intelligence**: Extracts actual business data for strategic insights
- **Conversion Focus**: Specifically designed to identify revenue optimization opportunities

This enhanced extraction system will transform ConvertIQ from a basic website analyzer to an intelligent business optimization platform.

## Implementation Plan

### Phase 1: Foundation & Infrastructure (Week 1-2)

#### 1.1 Update Dependencies
```bash
# Update Firecrawl to v2
bun add @mendable/firecrawl-js@^2.0.0

# Verify current version
bun list | grep firecrawl
```

#### 1.2 Database Schema Updates
```sql
-- Migration: Add extraction results columns
ALTER TABLE scans ADD COLUMN IF NOT EXISTS extraction_results JSONB;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS page_type VARCHAR(50);
ALTER TABLE scans ADD COLUMN IF NOT EXISTS extraction_confidence DECIMAL(3,2);
ALTER TABLE scans ADD COLUMN IF NOT EXISTS data_richness DECIMAL(3,2);
ALTER TABLE scans ADD COLUMN IF NOT EXISTS extraction_version VARCHAR(20) DEFAULT 'v2';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_scans_page_type ON scans(page_type);
CREATE INDEX IF NOT EXISTS idx_scans_extraction_results ON scans USING GIN(extraction_results);
CREATE INDEX IF NOT EXISTS idx_scans_extraction_confidence ON scans(extraction_confidence);

-- Enhanced metadata tracking
ALTER TABLE scans ADD COLUMN IF NOT EXISTS processing_metrics JSONB;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS extraction_errors JSONB;
```

#### 1.3 Core Type Definitions
Create `src/lib/extraction/types.ts`:
```typescript
export type PageType = 
  | 'ecommerce-product'
  | 'ecommerce-category' 
  | 'service-landing'
  | 'corporate-homepage'
  | 'about-us'
  | 'contact'
  | 'blog-post'
  | 'landing-page'
  | 'pricing'
  | 'case-study'
  | 'product-comparison';

export interface StructuredPageData {
  pageType: PageType;
  confidence: number;
  data: any; // Type will vary based on pageType
}

export interface ExtractionConfig {
  schema: object;
  prompt: string;
}

export interface EnhancedScanResult {
  // ... interface from document
}
```

### Phase 2: Page Type Detection (Week 2)

#### 2.1 Create Page Type Detector
File: `src/lib/extraction/page-type-detector.ts`
```typescript
export class IntelligentPageTypeDetector {
  private firecrawl: Firecrawl;
  
  constructor(firecrawl: Firecrawl) {
    this.firecrawl = firecrawl;
  }
  
  async detectPageType(url: string): Promise<PageTypeResult> {
    // Implementation from document
  }
}
```

#### 2.2 Testing & Validation
- Create test suite for page type detection
- Test with 20+ representative URLs across different page types
- Validate confidence scoring accuracy
- Tune detection prompts based on test results

### Phase 3: Extraction Schemas & Prompts (Week 3)

#### 3.1 Create Schema Definitions
File: `src/lib/extraction/schemas/index.ts`
```typescript
export const ecommerceProductSchema = { /* from document */ };
export const servicePageSchema = { /* from document */ };
export const homepageSchema = { /* from document */ };
export const contentPageSchema = { /* from document */ };
```

#### 3.2 Create Extraction Prompts
File: `src/lib/extraction/prompts/index.ts`
```typescript
export const ecommercePrompt = `/* from document */`;
export const servicePrompt = `/* create based on schema */`;
export const homepagePrompt = `/* create based on schema */`;
export const contentPrompt = `/* create based on schema */`;
```

#### 3.3 Schema Validation
- Implement JSON schema validation for extraction results
- Create fallback handling for incomplete extractions
- Add data quality scoring

### Phase 4: Enhanced Extraction Engine (Week 4)

#### 4.1 Core Extraction Engine
File: `src/lib/extraction/enhanced-extraction-engine.ts`
```typescript
export class EnhancedExtractionEngine {
  // Implementation from document
  async extractStructuredData(url: string): Promise<StructuredPageData>
  private getExtractionConfig(pageType: PageType): ExtractionConfig
  private processExtractionResult(extractResult: any, pageType: PageType, content: any)
}
```

#### 4.2 Error Handling & Retry Logic
- Implement retry mechanism for failed extractions
- Fallback to v1 extraction if v2 fails
- Comprehensive error logging and monitoring

#### 4.3 Performance Optimization
- Add caching layer for extraction results
- Implement extraction result expiration (24-48 hours)
- Rate limiting for Firecrawl API calls

### Phase 5: AI Analysis Enhancement (Week 5)

#### 5.1 Enhanced AI Analysis Engine
File: `src/lib/analysis/enhanced-ai-analysis-engine.ts`
```typescript
export class EnhancedAIAnalysisEngine {
  async analyzeWithEnhancedData(url: string): Promise<EnhancedAnalysisResult>
  private calculateDataRichness(data: StructuredPageData): number
}
```

#### 5.2 Updated Analysis Prompts
Update existing analysis prompts in:
- `src/lib/ai/providers/anthropic/conversion-psychology-provider.ts`
- `src/lib/ai/providers/anthropic/ux-analysis-provider.ts`
- `src/lib/ai/providers/anthropic/seo-analysis-provider.ts`

#### 5.3 Enhanced Analysis Types
Add new analysis capabilities:
- Structured data-driven recommendations
- Page-type-specific optimization suggestions
- Business intelligence insights

### Phase 6: Integration & Migration (Week 6)

#### 6.1 Update Crawler Integration
Modify `src/lib/crawler/crawler.ts`:
- Replace manual extraction methods with enhanced extraction
- Maintain backward compatibility during transition
- Add feature flag for v1/v2 extraction switching

#### 6.2 Update Analysis Workflow
File: `src/lib/vectorization/analysis-engine.ts`
- Integrate enhanced extraction results
- Update analysis prompts to use structured data
- Enhance scoring and recommendation generation

#### 6.3 Database Migration Script
```typescript
// src/scripts/migrate-to-enhanced-extraction.ts
async function migrateExistingScans() {
  // Re-process existing scans with enhanced extraction
  // Update analysis results with enhanced data
  // Maintain historical data integrity
}
```

### Phase 7: UI/UX Updates (Week 7)

#### 7.1 Enhanced Results Display
Update report components:
- `src/components/analysis/analysis-results.tsx`
- `src/app/dashboard/reports/[reportId]/page.tsx`

#### 7.2 New Visualization Components
Create components for:
- Page type indicators
- Data richness visualizations
- Structured data previews
- Enhanced recommendation displays

#### 7.3 Admin Dashboard
Create admin interface for:
- Extraction monitoring
- Performance metrics
- Error tracking
- Configuration management

### Phase 8: Testing & Quality Assurance (Week 8)

#### 8.1 Comprehensive Testing
- Unit tests for all extraction components
- Integration tests with Firecrawl v2
- End-to-end testing of analysis workflow
- Performance testing with various page types

#### 8.2 Quality Validation
- Test with 100+ diverse websites
- Validate extraction accuracy across page types
- Compare v1 vs v2 analysis quality
- Performance benchmarking

#### 8.3 Error Monitoring
- Implement Sentry error tracking for extraction pipeline
- Add performance monitoring
- Create extraction success rate dashboards

### Phase 9: Deployment & Monitoring (Week 9)

#### 9.1 Gradual Rollout Strategy
1. **Internal Testing**: Deploy to dev environment
2. **Beta Users**: Limited rollout to select customers
3. **Feature Flag**: A/B test v1 vs v2 extraction
4. **Full Rollout**: Complete migration to v2

#### 9.2 Monitoring & Alerting
- Set up extraction success rate monitoring
- Alert on extraction failures or quality degradation
- Track token usage and cost implications
- Monitor user satisfaction metrics

#### 9.3 Documentation & Training
- Update internal documentation
- Create user-facing feature announcements
- Update help center with new capabilities
- Train customer support on new features

### Phase 10: Optimization & Iteration (Week 10+)

#### 10.1 Performance Optimization
- Optimize extraction prompts based on real usage
- Fine-tune schemas based on extraction results
- Implement caching strategies
- Reduce token usage through prompt optimization

#### 10.2 Feature Enhancement
- Add new page types based on user requests
- Implement extraction result confidence scoring
- Add extraction result manual review interface
- Create extraction analytics dashboard

#### 10.3 Continuous Improvement
- Regular schema updates based on extraction patterns
- Prompt optimization using A/B testing
- Integration with customer feedback
- Expansion to new website types and industries

## Implementation Checklist

### Prerequisites
- [ ] Verify Firecrawl v2 API access and quota
- [ ] Update development database with new schema
- [ ] Set up testing environment with diverse test URLs
- [ ] Create feature flag system for gradual rollout

### Week 1-2: Foundation
- [ ] Update Firecrawl dependency to v2
- [ ] Run database migration for new columns
- [ ] Create core type definitions
- [ ] Set up basic project structure for extraction system

### Week 3-4: Core Implementation
- [ ] Implement page type detection system
- [ ] Create extraction schemas for all page types
- [ ] Develop enhanced extraction engine
- [ ] Add comprehensive error handling

### Week 5-6: Integration
- [ ] Update AI analysis to use structured data
- [ ] Enhance analysis prompts with structured inputs
- [ ] Migrate existing crawler integration
- [ ] Create migration script for existing data

### Week 7-8: UI & Testing
- [ ] Update report display components
- [ ] Create new visualization components
- [ ] Implement comprehensive testing suite
- [ ] Validate extraction accuracy

### Week 9-10: Deployment & Optimization
- [ ] Deploy with feature flag system
- [ ] Monitor extraction performance
- [ ] Optimize based on real usage patterns
- [ ] Plan continuous improvement roadmap

## Success Metrics

### Technical Metrics
- **Extraction Success Rate**: >95% successful extractions
- **Data Richness**: Average >80% field completion
- **Processing Time**: <30 seconds per page extraction
- **Cost Efficiency**: <20% increase in token usage vs v1

### Business Metrics
- **Analysis Quality**: User satisfaction score >4.5/5
- **Recommendation Accuracy**: >85% relevance rating
- **User Engagement**: 30% increase in recommendation implementation
- **Revenue Impact**: Measurable improvement in user conversion tracking

### Quality Metrics
- **False Positive Rate**: <5% incorrect page type detection
- **Data Accuracy**: >90% extraction accuracy validation
- **Error Rate**: <2% system errors in extraction pipeline
- **Performance**: 99.9% uptime for extraction services

This implementation plan provides a structured approach to upgrading ConvertIQ's extraction capabilities while maintaining system stability and ensuring high-quality results.