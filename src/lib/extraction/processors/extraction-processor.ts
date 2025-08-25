// Extraction Result Processing Utilities
// Phase 4 Implementation

import type { 
  PageType, 
  StructuredPageData, 
  ExtractionMetrics,
  EcommerceProductData,
  ServicePageData,
  HomepageData,
  ContentPageData
} from '../types';

export interface ProcessingResult {
  isValid: boolean;
  cleanedData: any;
  qualityScore: number;
  issues: string[];
  suggestions: string[];
}

export class ExtractionProcessor {
  
  /**
   * Process and validate extraction results based on page type
   */
  static processExtractionData(
    rawData: any, 
    pageType: PageType, 
    confidence: number
  ): ProcessingResult {
    if (!rawData || typeof rawData !== 'object') {
      return {
        isValid: false,
        cleanedData: {},
        qualityScore: 0,
        issues: ['No data extracted'],
        suggestions: ['Check URL accessibility and content structure']
      };
    }

    switch (pageType) {
      case 'ecommerce-product':
      case 'ecommerce-category':
      case 'product-comparison':
        return this.processEcommerceData(rawData, confidence);
        
      case 'service-landing':
      case 'contact':
      case 'landing-page':
      case 'pricing':
        return this.processServiceData(rawData, confidence);
        
      case 'corporate-homepage':
      case 'about-us':
        return this.processHomepageData(rawData, confidence);
        
      case 'blog-post':
      case 'case-study':
        return this.processContentData(rawData, confidence);
        
      default:
        return this.processGenericData(rawData, confidence);
    }
  }

  /**
   * Process e-commerce page data
   */
  private static processEcommerceData(rawData: any, confidence: number): ProcessingResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let qualityScore = confidence;

    // Initialize structure
    const cleanedData: Partial<EcommerceProductData> = {
      product: {},
      callsToAction: [],
      socialProof: {},
      conversionElements: {}
    };

    // Process product information
    if (rawData.product) {
      cleanedData.product = this.processProductInfo(rawData.product, issues, suggestions);
      qualityScore += 0.1;
    } else {
      issues.push('No product information extracted');
      suggestions.push('Ensure page contains clear product details');
    }

    // Process calls to action
    if (rawData.callsToAction && Array.isArray(rawData.callsToAction)) {
      cleanedData.callsToAction = this.processCallsToAction(rawData.callsToAction, issues, suggestions);
      if (cleanedData.callsToAction.length > 0) qualityScore += 0.1;
    } else {
      issues.push('No calls-to-action found');
      suggestions.push('Add clear purchase or action buttons');
    }

    // Process social proof
    if (rawData.socialProof) {
      cleanedData.socialProof = this.processSocialProof(rawData.socialProof, issues, suggestions);
      if (Object.keys(cleanedData.socialProof).length > 0) qualityScore += 0.1;
    }

    // Process conversion elements
    if (rawData.conversionElements) {
      cleanedData.conversionElements = this.processConversionElements(rawData.conversionElements, issues, suggestions);
      if (Object.keys(cleanedData.conversionElements).length > 0) qualityScore += 0.1;
    }

    return {
      isValid: issues.length === 0,
      cleanedData,
      qualityScore: Math.min(qualityScore, 1.0),
      issues,
      suggestions
    };
  }

  /**
   * Process service page data
   */
  private static processServiceData(rawData: any, confidence: number): ProcessingResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let qualityScore = confidence;

    const cleanedData: Partial<ServicePageData> = {
      service: {},
      businessInfo: {},
      contactInfo: {},
      credentialsAndProof: {},
      leadCapture: {}
    };

    // Process service information
    if (rawData.service) {
      cleanedData.service = this.processServiceInfo(rawData.service, issues, suggestions);
      qualityScore += 0.15;
    } else {
      issues.push('No service information extracted');
      suggestions.push('Add clear service descriptions and value propositions');
    }

    // Process business information
    if (rawData.businessInfo) {
      cleanedData.businessInfo = rawData.businessInfo;
      qualityScore += 0.1;
    }

    // Process contact information
    if (rawData.contactInfo) {
      cleanedData.contactInfo = this.processContactInfo(rawData.contactInfo, issues, suggestions);
      qualityScore += 0.1;
    } else {
      issues.push('No contact information found');
      suggestions.push('Add clear contact details and methods');
    }

    return {
      isValid: issues.length === 0,
      cleanedData,
      qualityScore: Math.min(qualityScore, 1.0),
      issues,
      suggestions
    };
  }

  /**
   * Process homepage data
   */
  private static processHomepageData(rawData: any, confidence: number): ProcessingResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let qualityScore = confidence;

    const cleanedData: Partial<HomepageData> = {
      company: {},
      navigation: {},
      heroSection: {},
      productsServices: [],
      socialProofElements: {}
    };

    // Process company information
    if (rawData.company) {
      cleanedData.company = rawData.company;
      qualityScore += 0.1;
    } else {
      issues.push('No company information extracted');
      suggestions.push('Add clear company description and mission');
    }

    // Process hero section
    if (rawData.heroSection) {
      cleanedData.heroSection = this.processHeroSection(rawData.heroSection, issues, suggestions);
      qualityScore += 0.15;
    } else {
      issues.push('No hero section identified');
      suggestions.push('Add compelling hero section with clear value proposition');
    }

    return {
      isValid: issues.length === 0,
      cleanedData,
      qualityScore: Math.min(qualityScore, 1.0),
      issues,
      suggestions
    };
  }

  /**
   * Process content page data
   */
  private static processContentData(rawData: any, confidence: number): ProcessingResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let qualityScore = confidence;

    const cleanedData: Partial<ContentPageData> = {
      content: {},
      engagement: {},
      seoElements: {}
    };

    // Process content structure
    if (rawData.content) {
      cleanedData.content = this.processContentStructure(rawData.content, issues, suggestions);
      qualityScore += 0.15;
    } else {
      issues.push('No structured content found');
      suggestions.push('Improve content structure with clear headings and organization');
    }

    // Process engagement elements
    if (rawData.engagement) {
      cleanedData.engagement = rawData.engagement;
      qualityScore += 0.1;
    }

    return {
      isValid: issues.length === 0,
      cleanedData,
      qualityScore: Math.min(qualityScore, 1.0),
      issues,
      suggestions
    };
  }

  /**
   * Process generic data for unknown page types
   */
  private static processGenericData(rawData: any, confidence: number): ProcessingResult {
    return {
      isValid: true,
      cleanedData: rawData,
      qualityScore: confidence * 0.5, // Reduced score for unknown type
      issues: ['Unknown page type'],
      suggestions: ['Consider specifying page type for better extraction']
    };
  }

  // Helper methods for specific data processing

  private static processProductInfo(productData: any, issues: string[], suggestions: string[]): any {
    const product: any = {};

    if (productData.name) {
      product.name = String(productData.name);
    } else {
      issues.push('Missing product name');
      suggestions.push('Add clear product title');
    }

    if (productData.price) {
      product.price = this.normalizePrice(productData.price);
    } else {
      issues.push('Missing product pricing');
      suggestions.push('Display clear pricing information');
    }

    if (productData.description) {
      product.description = String(productData.description);
    } else {
      suggestions.push('Add detailed product description');
    }

    // Copy other valid fields
    ['features', 'specifications', 'images', 'availability', 'sku', 'category', 'brand', 'rating'].forEach(field => {
      if (productData[field]) {
        product[field] = productData[field];
      }
    });

    return product;
  }

  private static processCallsToAction(ctaData: any[], issues: string[], suggestions: string[]): any[] {
    if (!Array.isArray(ctaData)) return [];

    const validCTAs = ctaData.filter(cta => cta && cta.text);
    
    if (validCTAs.length === 0) {
      issues.push('No valid calls-to-action found');
      suggestions.push('Add clear action buttons with compelling text');
    }

    return validCTAs.map(cta => ({
      text: String(cta.text),
      type: cta.type || 'learn-more',
      prominence: cta.prominence || 'secondary',
      position: cta.position || 'unknown',
      urgency: cta.urgency,
      offer: cta.offer
    }));
  }

  private static processSocialProof(socialProofData: any, issues: string[], suggestions: string[]): any {
    const socialProof: any = {};

    if (socialProofData.reviews && Array.isArray(socialProofData.reviews)) {
      socialProof.reviews = socialProofData.reviews.filter((review: any) => review && review.text);
    }

    if (socialProofData.testimonials && Array.isArray(socialProofData.testimonials)) {
      socialProof.testimonials = socialProofData.testimonials.filter((t: any) => t);
    }

    ['trustBadges', 'securityFeatures', 'guarantees'].forEach(field => {
      if (socialProofData[field] && Array.isArray(socialProofData[field])) {
        socialProof[field] = socialProofData[field].filter((item: any) => item);
      }
    });

    if (Object.keys(socialProof).length === 0) {
      suggestions.push('Add customer reviews, testimonials, or trust badges');
    }

    return socialProof;
  }

  private static processConversionElements(conversionData: any, issues: string[], suggestions: string[]): any {
    const elements: any = {};

    ['scarcityIndicators', 'urgencyMessages', 'personalizedRecommendations', 'crossSells', 'upsells'].forEach(field => {
      if (conversionData[field] && Array.isArray(conversionData[field])) {
        elements[field] = conversionData[field].filter((item: any) => item);
      }
    });

    if (Object.keys(elements).length === 0) {
      suggestions.push('Consider adding urgency, scarcity, or personalization elements');
    }

    return elements;
  }

  private static processServiceInfo(serviceData: any, issues: string[], suggestions: string[]): any {
    const service: any = {};

    if (serviceData.name) {
      service.name = String(serviceData.name);
    } else {
      issues.push('Missing service name');
      suggestions.push('Add clear service title or heading');
    }

    if (serviceData.valueProposition) {
      service.valueProposition = String(serviceData.valueProposition);
    } else {
      suggestions.push('Add clear value proposition statement');
    }

    // Copy other fields
    ['tagline', 'benefits', 'features', 'process', 'pricing'].forEach(field => {
      if (serviceData[field]) {
        service[field] = serviceData[field];
      }
    });

    return service;
  }

  private static processContactInfo(contactData: any, issues: string[], suggestions: string[]): any {
    const contact: any = {};

    ['phone', 'email', 'address', 'hours'].forEach(field => {
      if (contactData[field]) {
        contact[field] = String(contactData[field]);
      }
    });

    if (contactData.contactMethods && Array.isArray(contactData.contactMethods)) {
      contact.contactMethods = contactData.contactMethods.filter((method: any) => method);
    }

    if (Object.keys(contact).length === 0) {
      issues.push('No contact information found');
      suggestions.push('Add phone, email, or contact form');
    }

    return contact;
  }

  private static processHeroSection(heroData: any, issues: string[], suggestions: string[]): any {
    const hero: any = {};

    if (heroData.headline) {
      hero.headline = String(heroData.headline);
    } else {
      issues.push('Missing hero headline');
      suggestions.push('Add compelling main headline');
    }

    if (heroData.valueProposition) {
      hero.valueProposition = String(heroData.valueProposition);
    } else {
      suggestions.push('Add clear value proposition in hero section');
    }

    // Copy other fields
    ['subheadline', 'primaryCTA', 'secondaryCTA', 'heroImage'].forEach(field => {
      if (heroData[field]) {
        hero[field] = heroData[field];
      }
    });

    return hero;
  }

  private static processContentStructure(contentData: any, issues: string[], suggestions: string[]): any {
    const content: any = {};

    if (contentData.title) {
      content.title = String(contentData.title);
    } else {
      issues.push('Missing content title');
      suggestions.push('Add clear article or page title');
    }

    // Copy other fields with validation
    if (contentData.author) content.author = contentData.author;
    if (contentData.publishDate) content.publishDate = String(contentData.publishDate);
    if (contentData.category) content.category = String(contentData.category);
    if (contentData.tags && Array.isArray(contentData.tags)) {
      content.tags = contentData.tags.filter((tag: any) => tag);
    }
    if (contentData.wordCount && typeof contentData.wordCount === 'number') {
      content.wordCount = contentData.wordCount;
    }

    return content;
  }

  /**
   * Normalize price data to consistent format
   */
  private static normalizePrice(priceData: any): any {
    if (typeof priceData === 'string') {
      return {
        current: priceData,
        currency: this.extractCurrency(priceData) || 'USD'
      };
    }

    if (typeof priceData === 'object' && priceData !== null) {
      return {
        current: priceData.current || priceData.price || '',
        original: priceData.original || priceData.was,
        currency: priceData.currency || 'USD',
        discount: priceData.discount || priceData.save
      };
    }

    return { current: '', currency: 'USD' };
  }

  /**
   * Extract currency from price string
   */
  private static extractCurrency(priceString: string): string | null {
    const currencySymbols: Record<string, string> = {
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP',
      '¥': 'JPY',
      '₹': 'INR'
    };

    for (const [symbol, code] of Object.entries(currencySymbols)) {
      if (priceString.includes(symbol)) {
        return code;
      }
    }

    // Check for currency codes
    const currencyMatch = priceString.match(/\b(USD|EUR|GBP|JPY|CAD|AUD|INR)\b/i);
    return currencyMatch ? currencyMatch[1].toUpperCase() : null;
  }

  /**
   * Calculate overall data quality score
   */
  static calculateQualityScore(
    structuredData: StructuredPageData,
    extractionMetrics: ExtractionMetrics
  ): number {
    const factors = [
      structuredData.confidence * 0.3, // Page type confidence
      extractionMetrics.dataQualityScore * 0.4, // Data richness
      this.calculateCompletenessScore(structuredData) * 0.2, // Field completeness
      this.calculateValidityScore(structuredData) * 0.1 // Data validity
    ];

    return factors.reduce((sum, factor) => sum + factor, 0);
  }

  /**
   * Calculate completeness score based on expected fields
   */
  private static calculateCompletenessScore(data: StructuredPageData): number {
    const extractedFields = this.countNonEmptyFields(data.data);
    const expectedFields = this.getExpectedFieldCount(data.pageType);
    
    return expectedFields > 0 ? Math.min(extractedFields / expectedFields, 1.0) : 0;
  }

  /**
   * Calculate validity score based on data types and structure
   */
  private static calculateValidityScore(data: StructuredPageData): number {
    // Simple validity check - could be enhanced
    try {
      JSON.stringify(data.data); // Check if data is serializable
      return data.data && typeof data.data === 'object' ? 1.0 : 0.5;
    } catch {
      return 0;
    }
  }

  /**
   * Count non-empty fields recursively
   */
  private static countNonEmptyFields(obj: any): number {
    if (!obj || typeof obj !== 'object') return 0;

    let count = 0;
    
    if (Array.isArray(obj)) {
      return obj.length > 0 ? 1 : 0;
    }

    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'object') {
          count += this.countNonEmptyFields(value);
        } else {
          count += 1;
        }
      }
    }

    return count;
  }

  /**
   * Get expected field count for page type
   */
  private static getExpectedFieldCount(pageType: PageType): number {
    const expectedCounts: Record<PageType, number> = {
      'ecommerce-product': 20,
      'ecommerce-category': 12,
      'service-landing': 25,
      'corporate-homepage': 30,
      'about-us': 15,
      'contact': 10,
      'blog-post': 18,
      'landing-page': 15,
      'pricing': 15,
      'case-study': 20,
      'product-comparison': 18
    };

    return expectedCounts[pageType] || 15;
  }

  /**
   * Generate recommendations based on extraction results
   */
  static generateRecommendations(
    processingResult: ProcessingResult,
    pageType: PageType
  ): string[] {
    const recommendations: string[] = [...processingResult.suggestions];

    // Add page-type specific recommendations
    switch (pageType) {
      case 'ecommerce-product':
        if (processingResult.qualityScore < 0.7) {
          recommendations.push(
            'Consider adding customer reviews and ratings',
            'Include clear product specifications',
            'Add urgency indicators like stock levels',
            'Display trust badges and guarantees'
          );
        }
        break;

      case 'service-landing':
        if (processingResult.qualityScore < 0.7) {
          recommendations.push(
            'Add client testimonials and case studies',
            'Include clear contact information',
            'Display professional certifications',
            'Add service process or methodology'
          );
        }
        break;

      case 'corporate-homepage':
        if (processingResult.qualityScore < 0.7) {
          recommendations.push(
            'Strengthen hero section with clear value proposition',
            'Add social proof elements like client logos',
            'Include company statistics and achievements',
            'Improve navigation structure'
          );
        }
        break;

      case 'blog-post':
        if (processingResult.qualityScore < 0.7) {
          recommendations.push(
            'Add author information and credentials',
            'Include related content recommendations',
            'Add social sharing options',
            'Include clear calls-to-action'
          );
        }
        break;
    }

    return recommendations;
  }
}