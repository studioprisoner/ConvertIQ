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