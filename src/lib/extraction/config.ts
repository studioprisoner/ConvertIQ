// Enhanced Extraction System Configuration

export const extractionConfig = {
  // Feature flags
  enableEnhancedExtraction: process.env.ENABLE_ENHANCED_EXTRACTION === 'true',
  fallbackToV1: true,
  
  // Performance settings
  maxRetries: 3,
  timeoutMs: 30000,
  cacheExpirationHours: 24,
  
  // Quality thresholds
  minConfidenceScore: 0.3,
  minDataRichness: 0.2,
  
  // Cost management
  maxTokensPerExtraction: 4000,
  enableCostTracking: true,
  
  // Processing options
  batchSize: 5,
  concurrentExtractions: 3,
  
  // Default page type for unknown pages
  defaultPageType: 'corporate-homepage' as const,
  
  // Firecrawl configuration
  firecrawlOptions: {
    formats: ['markdown', 'html'],
    pageOptions: {
      onlyMainContent: true,
      includeLinks: true,
      includeImages: true,
      waitFor: 2000, // Wait for dynamic content
    },
  },
} as const;

export const isEnhancedExtractionEnabled = () => {
  return extractionConfig.enableEnhancedExtraction;
};

export const shouldFallbackToV1 = () => {
  return extractionConfig.fallbackToV1;
};