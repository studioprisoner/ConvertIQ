// Page Type Detection System
// Phase 2 Implementation

import { Firecrawl } from '@mendable/firecrawl-js';
import type { PageType, PageTypeResult } from '../types';
import { extractionConfig } from '../config';

export interface PageTypeDetector {
  detectPageType(url: string, content?: string): Promise<PageTypeResult>;
}

export class IntelligentPageTypeDetector implements PageTypeDetector {
  private firecrawl: Firecrawl;
  
  constructor(firecrawl: Firecrawl) {
    this.firecrawl = firecrawl;
  }
  
  async detectPageType(url: string, content?: string): Promise<PageTypeResult> {
    const pageTypeDetectionSchema = {
      type: "object",
      properties: {
        pageType: { 
          type: "string", 
          enum: [
            "ecommerce-product", "ecommerce-category", "service-landing", 
            "corporate-homepage", "about-us", "contact", "blog-post", 
            "landing-page", "pricing", "case-study", "product-comparison"
          ]
        },
        confidence: { 
          type: "number", 
          minimum: 0, 
          maximum: 1,
          description: "Confidence score between 0 and 1"
        },
        reasoning: { 
          type: "string",
          description: "Brief explanation of why this page type was selected"
        },
        secondaryType: { 
          type: "string",
          description: "Alternative page type if primary detection is uncertain"
        },
        keyIndicators: {
          type: "array",
          items: { type: "string" },
          description: "Key elements that influenced the page type detection"
        }
      },
      required: ["pageType", "confidence", "reasoning"]
    };

    const detectionPrompt = `
    Analyze this webpage and determine its primary type. Consider:
    
    URL ANALYSIS:
    - URL structure and path patterns (e.g., /product/, /shop/, /services/, /about/)
    - Domain context and subdirectories
    - Query parameters that indicate page purpose
    
    CONTENT ANALYSIS:
    - Primary content focus and layout structure
    - Presence of product information, pricing, and purchase options
    - Service descriptions, contact forms, and lead generation elements
    - Company information, mission statements, and corporate messaging
    - Article content, blog structure, and publishing information
    
    USER INTENT INDICATORS:
    - Primary call-to-action types (buy, contact, learn more, subscribe)
    - Form types (contact, newsletter, purchase, quote request)
    - Navigation structure and menu items
    - Business objectives evident from content positioning
    
    PAGE TYPE DEFINITIONS:
    - ecommerce-product: Individual product pages with buy/add-to-cart options
    - ecommerce-category: Product listing/category pages
    - service-landing: Service-focused pages with lead generation
    - corporate-homepage: Main company pages with multiple services/products
    - about-us: Company background, team, history pages
    - contact: Contact information and contact forms
    - blog-post: Individual articles or blog content
    - landing-page: Marketing campaign or specific offer pages
    - pricing: Pricing tables and plan comparisons
    - case-study: Success stories and detailed project examples
    - product-comparison: Feature comparisons between products/services
    
    Return the most specific and accurate page type. Be confident in your assessment but honest about uncertainty.
    `;

    try {
      // Use Firecrawl v3 extract feature for intelligent detection
      const detection = await this.firecrawl.extract({
        urls: [url],
        prompt: detectionPrompt,
        schema: pageTypeDetectionSchema,
        timeout: extractionConfig.timeoutMs
      });
      
      if (!detection.success || !detection.data) {
        console.warn(`Page type detection failed for ${url}, falling back to URL-based detection`);
        return this.fallbackDetection(url);
      }

      const result = Array.isArray(detection.data) ? detection.data[0] : detection.data;
      
      return {
        pageType: result.pageType as PageType,
        confidence: Math.min(Math.max(result.confidence || 0.5, 0), 1),
        reasoning: result.reasoning || 'AI-powered page type detection',
        secondaryType: result.secondaryType,
        keyIndicators: result.keyIndicators || []
      };
    } catch (error) {
      console.error(`Page type detection error for ${url}:`, error);
      // Fallback: Basic URL-based detection
      return this.fallbackDetection(url);
    }
  }

  private fallbackDetection(url: string): PageTypeResult {
    // Enhanced URL-based heuristics as fallback
    const urlLower = url.toLowerCase();
    const urlPath = new URL(url).pathname.toLowerCase();
    
    // E-commerce patterns
    if (urlLower.includes('/product/') || urlLower.includes('/item/') || urlLower.includes('/p/')) {
      return { 
        pageType: 'ecommerce-product', 
        confidence: 0.7, 
        reasoning: 'URL contains product path indicators',
        keyIndicators: ['product URL path']
      };
    }
    
    if (urlLower.includes('/shop/') || urlLower.includes('/store/') || urlLower.includes('/category/')) {
      return { 
        pageType: 'ecommerce-category', 
        confidence: 0.6, 
        reasoning: 'URL contains shop/category path indicators',
        keyIndicators: ['shop/category URL path']
      };
    }
    
    // Root domain or homepage patterns (check early to avoid conflicts)
    if (urlPath === '/' || urlPath === '' || urlLower.includes('/home')) {
      return { 
        pageType: 'corporate-homepage', 
        confidence: 0.6, 
        reasoning: 'Root URL or homepage path',
        keyIndicators: ['root/homepage URL']
      };
    }
    
    // Content pages (check before corporate pages to avoid conflicts)
    if (urlLower.includes('/blog/') || urlLower.includes('/article/') || urlLower.includes('/news/') || urlLower.includes('/post/')) {
      return { 
        pageType: 'blog-post', 
        confidence: 0.7, 
        reasoning: 'URL contains blog/article path indicators',
        keyIndicators: ['blog/article URL path']
      };
    }
    
    // Pricing and comparison pages (check before service patterns to avoid conflicts)
    if (urlLower.includes('/pricing') || urlLower.includes('/plans') || urlLower.includes('/packages')) {
      return { 
        pageType: 'pricing', 
        confidence: 0.8, 
        reasoning: 'URL contains pricing path indicators',
        keyIndicators: ['pricing URL path']
      };
    }
    
    // Service business patterns
    if (urlLower.includes('/service') || urlLower.includes('/solutions/')) {
      return { 
        pageType: 'service-landing', 
        confidence: 0.7, 
        reasoning: 'URL contains service path indicators',
        keyIndicators: ['service URL path']
      };
    }
    
    // Corporate pages
    if (urlLower.includes('/about-') || urlLower.includes('/about/') || urlPath === '/about' || 
        urlLower.includes('/company') || urlLower.includes('/team')) {
      return { 
        pageType: 'about-us', 
        confidence: 0.8, 
        reasoning: 'URL contains about/company path indicators',
        keyIndicators: ['about/company URL path']
      };
    }
    
    if (urlLower.includes('/contact') || urlLower.includes('/reach-us') || urlLower.includes('/get-in-touch')) {
      return { 
        pageType: 'contact', 
        confidence: 0.8, 
        reasoning: 'URL contains contact path indicators',
        keyIndicators: ['contact URL path']
      };
    }
    
    if (urlLower.includes('/case-stud') || urlLower.includes('/success-stor') || urlLower.includes('/portfolio')) {
      return { 
        pageType: 'case-study', 
        confidence: 0.7, 
        reasoning: 'URL contains case study path indicators',
        keyIndicators: ['case study URL path']
      };
    }
    
    if (urlLower.includes('/compare') || urlLower.includes('/vs/') || urlLower.includes('/comparison')) {
      return { 
        pageType: 'product-comparison', 
        confidence: 0.6, 
        reasoning: 'URL contains comparison path indicators',
        keyIndicators: ['comparison URL path']
      };
    }
    
    // Landing page patterns (specific campaign or offer pages)
    if (urlLower.includes('/landing') || urlLower.includes('/lp/') || urlLower.includes('/offer') || urlLower.includes('/promo')) {
      return { 
        pageType: 'landing-page', 
        confidence: 0.6, 
        reasoning: 'URL contains landing page path indicators',
        keyIndicators: ['landing page URL path']
      };
    }
    
    // Default to homepage for unknown patterns
    return { 
      pageType: 'corporate-homepage', 
      confidence: 0.3, 
      reasoning: 'Default fallback - no clear URL patterns detected',
      keyIndicators: ['unknown URL pattern']
    };
  }

  /**
   * Validate page type detection result
   */
  validateDetectionResult(result: PageTypeResult): boolean {
    const validPageTypes: PageType[] = [
      'ecommerce-product', 'ecommerce-category', 'service-landing',
      'corporate-homepage', 'about-us', 'contact', 'blog-post',
      'landing-page', 'pricing', 'case-study', 'product-comparison'
    ];
    
    return (
      validPageTypes.includes(result.pageType) &&
      result.confidence >= 0 &&
      result.confidence <= 1 &&
      result.reasoning.length > 0
    );
  }

  /**
   * Get confidence threshold for page type accuracy
   */
  getConfidenceThreshold(): number {
    return extractionConfig.minConfidenceScore;
  }
}