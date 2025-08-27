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

export interface PageTypeResult {
  pageType: PageType;
  confidence: number;
  reasoning: string;
  secondaryType?: string;
  keyIndicators?: string[];
}

export interface StructuredPageData {
  pageType: PageType;
  confidence: number;
  data: any; // Type will vary based on pageType
}

export interface ExtractionConfig {
  schema: object;
  prompt: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number;
}

export interface EnhancedScanResult {
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
    firecrawlVersion: 'v2' | 'v3';
    extractionVersion: string;
    aiAnalysisVersion: string;
    dataRichness: number;
    processingTime: number;
    tokenUsage: TokenUsage;
  };
}

// Enhanced analysis result types
export interface EnhancedConversionAnalysis {
  psychologyTriggers: {
    scarcity: { present: boolean; effectiveness: number; suggestions: string[] };
    urgency: { present: boolean; effectiveness: number; suggestions: string[] };
    socialProof: { present: boolean; effectiveness: number; suggestions: string[] };
    authority: { present: boolean; effectiveness: number; suggestions: string[] };
    reciprocity: { present: boolean; effectiveness: number; suggestions: string[] };
  };
  ctaAnalysis: {
    count: number;
    effectiveness: number;
    improvements: string[];
    testingOpportunities: string[];
  };
  trustSignals: {
    present: string[];
    missing: string[];
    suggestions: string[];
  };
  valueProposition: {
    clarity: number;
    improvements: string[];
    positioning: string[];
  };
}

export interface EnhancedUXAnalysis {
  navigationClarity: {
    score: number;
    issues: string[];
    improvements: string[];
  };
  contentAccessibility: {
    score: number;
    findability: number;
    scanability: number;
    mobileOptimization: number;
    suggestions: string[];
  };
  interactionDesign: {
    formUsability: number;
    ctaAccessibility: number;
    engagementElements: number;
    improvements: string[];
  };
  performanceIndicators: {
    loadOptimization: string[];
    mobileResponsiveness: string[];
    accessibilityCompliance: string[];
  };
}

export interface EnhancedSEOAnalysis {
  technicalElements: {
    title: { present: boolean; optimized: boolean; suggestions: string[] };
    metaDescription: { present: boolean; optimized: boolean; suggestions: string[] };
    headingStructure: { proper: boolean; suggestions: string[] };
    keywords: { optimized: boolean; suggestions: string[] };
  };
  contentOptimization: {
    wordCount: number;
    readability: number;
    topicCoverage: number;
    suggestions: string[];
  };
  onPageFactors: {
    internalLinking: number;
    imageOptimization: number;
    schemaMarkup: number;
    suggestions: string[];
  };
}

export interface EnhancedOverallAnalysis {
  overallScore: number;
  priorityAreas: string[];
  quickWins: Array<{
    title: string;
    impact: number;
    effort: number;
    description: string;
    implementation: string[];
  }>;
  longTermStrategy: string[];
  businessImpact: {
    estimatedConversionIncrease: string;
    revenueImpact: string;
    implementationTimeframe: string;
  };
}

// Page-specific data structures
export interface EcommerceProductData {
  product: {
    name: string;
    price: {
      current: string;
      original?: string;
      currency: string;
      discount?: string;
    };
    description: string;
    features: string[];
    specifications: Record<string, any>;
    images: string[];
    availability: string;
    sku?: string;
    category: string;
    brand?: string;
    rating?: {
      score: number;
      count: number;
      distribution: Record<string, number>;
    };
  };
  callsToAction: Array<{
    text: string;
    type: 'buy' | 'add-to-cart' | 'checkout' | 'contact' | 'learn-more';
    prominence: 'primary' | 'secondary' | 'tertiary';
    position: string;
    urgency?: string;
    offer?: string;
  }>;
  socialProof: {
    reviews?: Array<{
      rating: number;
      text: string;
      author: string;
      date: string;
      verified: boolean;
    }>;
    testimonials?: string[];
    trustBadges?: string[];
    securityFeatures?: string[];
    guarantees?: string[];
  };
  conversionElements: {
    scarcityIndicators?: string[];
    urgencyMessages?: string[];
    personalizedRecommendations?: string[];
    crossSells?: string[];
    upsells?: string[];
  };
}

export interface ServicePageData {
  service: {
    name: string;
    tagline: string;
    valueProposition: string;
    benefits: string[];
    features: string[];
    process: string[];
    pricing: {
      packages: Array<Record<string, any>>;
      startingPrice: string;
      pricingModel: string;
    };
  };
  businessInfo: {
    name: string;
    location: string;
    serviceArea: string;
    yearsInBusiness: string;
    teamSize: string;
    specializations: string[];
  };
  contactInfo: {
    phone: string;
    email: string;
    address: string;
    hours: string;
    contactMethods: string[];
  };
  credentialsAndProof: {
    certifications: string[];
    awards: string[];
    clientTestimonials: Array<Record<string, any>>;
    caseStudies: Array<Record<string, any>>;
    beforeAfterExamples: string[];
  };
  leadCapture: {
    primaryOffer: string;
    leadMagnets: string[];
    formFields: string[];
    guarantees: string[];
  };
}

export interface HomepageData {
  company: {
    name: string;
    mission: string;
    vision: string;
    values: string[];
    foundedYear: string;
    headquarters: string;
    size: string;
    industry: string;
  };
  navigation: {
    primaryMenu: string[];
    secondaryMenu: string[];
    footerLinks: string[];
    ctaButtons: Array<Record<string, any>>;
  };
  heroSection: {
    headline: string;
    subheadline: string;
    valueProposition: string;
    primaryCTA: Record<string, any>;
    secondaryCTA: Record<string, any>;
    heroImage: string;
  };
  productsServices: Array<{
    name: string;
    description: string;
    benefits: string[];
    link: string;
  }>;
  socialProofElements: {
    clientLogos: string[];
    testimonials: Array<Record<string, any>>;
    statistics: Array<Record<string, any>>;
    awards: string[];
    mediaMentions: string[];
  };
}

export interface ContentPageData {
  content: {
    title: string;
    subtitle: string;
    author: Record<string, any>;
    publishDate: string;
    lastUpdated: string;
    category: string;
    tags: string[];
    readTime: string;
    wordCount: number;
    headingStructure: Array<Record<string, any>>;
  };
  engagement: {
    socialSharing: string[];
    comments: Record<string, any>;
    relatedPosts: Array<Record<string, any>>;
    callsToAction: Array<Record<string, any>>;
    emailSignup: Record<string, any>;
    downloadOffers: Array<Record<string, any>>;
  };
  seoElements: {
    metaTitle: string;
    metaDescription: string;
    canonicalUrl: string;
    breadcrumbs: string[];
    internalLinks: Array<Record<string, any>>;
    externalLinks: Array<Record<string, any>>;
  };
}

// Union type for all page data types
export type PageSpecificData = 
  | EcommerceProductData 
  | ServicePageData 
  | HomepageData 
  | ContentPageData;

export interface ExtractionMetrics {
  processingTime: number;
  tokenUsage: TokenUsage;
  extractionErrors?: string[];
  dataQualityScore: number;
  fieldsExtracted: number;
  totalPossibleFields: number;
}