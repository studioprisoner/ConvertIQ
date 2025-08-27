/**
 * Helper functions for working with Firecrawl v2 enhanced analysis data
 */

import type { 
  ExtractionResults, 
  EnhancedAnalysisResult, 
  BusinessInfo,
  CallToAction,
  SocialProof,
  PsychologyTriggers
} from '@/db/schema/analyses';
import { extractionConfigurations } from './extraction-schemas';

/**
 * Transform Firecrawl v2 extraction results into structured analysis data
 */
export function transformExtractionResults(
  firecrawlExtractionData: any
): ExtractionResults {
  return {
    businessInfo: firecrawlExtractionData.businessInfo as BusinessInfo,
    products: firecrawlExtractionData.products || [],
    callsToAction: firecrawlExtractionData.callsToAction as CallToAction[],
    socialProof: firecrawlExtractionData.socialProof as SocialProof,
    psychologyTriggers: firecrawlExtractionData.psychologyTriggers as PsychologyTriggers,
    technicalSeo: firecrawlExtractionData.seoElements,
    userExperience: firecrawlExtractionData.uxAnalysis,
  };
}

/**
 * Generate analysis summary from extraction results
 */
export function generateAnalysisSummary(extractionResults: ExtractionResults): string {
  const summary: string[] = [];
  
  if (extractionResults.businessInfo?.name) {
    summary.push(`Business: ${extractionResults.businessInfo.name}`);
  }
  
  if (extractionResults.callsToAction?.length) {
    const primaryCTAs = extractionResults.callsToAction.filter(cta => cta.prominence === 'primary').length;
    summary.push(`${extractionResults.callsToAction.length} CTAs found (${primaryCTAs} primary)`);
  }
  
  if (extractionResults.products?.length) {
    summary.push(`${extractionResults.products.length} products/services identified`);
  }
  
  if (extractionResults.socialProof) {
    const proofCount = [
      extractionResults.socialProof.testimonials?.length || 0,
      extractionResults.socialProof.reviews?.length || 0,
      extractionResults.socialProof.certifications?.length || 0,
      extractionResults.socialProof.statistics?.length || 0
    ].reduce((a, b) => a + b, 0);
    
    if (proofCount > 0) {
      summary.push(`${proofCount} social proof elements`);
    }
  }
  
  if (extractionResults.psychologyTriggers) {
    const triggers = Object.entries(extractionResults.psychologyTriggers)
      .filter(([_, values]) => values && values.length > 0)
      .map(([key]) => key);
    
    if (triggers.length > 0) {
      summary.push(`Psychology triggers: ${triggers.join(', ')}`);
    }
  }
  
  return summary.join(' | ') || 'Analysis completed';
}

/**
 * Get extraction configuration based on analysis type
 */
export function getExtractionConfig(analysisType: string) {
  switch (analysisType.toLowerCase()) {
    case 'conversion':
    case 'conversion_optimization':
      return extractionConfigurations.conversionAudit;
    
    case 'ecommerce':
    case 'e-commerce':
      return extractionConfigurations.ecommerceAnalysis;
    
    case 'seo':
    case 'technical_seo':
      return extractionConfigurations.technicalSeoAudit;
    
    case 'lead_generation':
    case 'lead_gen':
      return extractionConfigurations.leadGenAudit;
    
    case 'comprehensive':
    default:
      return extractionConfigurations.comprehensive;
  }
}

/**
 * Calculate extraction completeness score (0-100)
 */
export function calculateExtractionScore(extractionResults: ExtractionResults): number {
  let score = 0;
  let maxScore = 0;
  
  // Business info (20 points max)
  maxScore += 20;
  if (extractionResults.businessInfo) {
    const businessFields = ['name', 'description', 'industry', 'contactEmail'];
    const completedFields = businessFields.filter(field => 
      extractionResults.businessInfo?.[field as keyof BusinessInfo]
    ).length;
    score += (completedFields / businessFields.length) * 20;
  }
  
  // CTAs (15 points max)
  maxScore += 15;
  if (extractionResults.callsToAction?.length) {
    score += Math.min(extractionResults.callsToAction.length * 3, 15);
  }
  
  // Social proof (15 points max)
  maxScore += 15;
  if (extractionResults.socialProof) {
    const proofTypes = ['testimonials', 'reviews', 'certifications', 'statistics'];
    const foundTypes = proofTypes.filter(type => 
      extractionResults.socialProof?.[type as keyof SocialProof]?.length
    ).length;
    score += (foundTypes / proofTypes.length) * 15;
  }
  
  // Psychology triggers (15 points max)
  maxScore += 15;
  if (extractionResults.psychologyTriggers) {
    const triggerTypes = ['scarcity', 'urgency', 'authority', 'reciprocity'];
    const foundTriggers = triggerTypes.filter(type => 
      extractionResults.psychologyTriggers?.[type as keyof PsychologyTriggers]?.length
    ).length;
    score += (foundTriggers / triggerTypes.length) * 15;
  }
  
  // Products (10 points max)
  maxScore += 10;
  if (extractionResults.products?.length) {
    score += Math.min(extractionResults.products.length * 2, 10);
  }
  
  // Technical SEO (15 points max)
  maxScore += 15;
  if (extractionResults.technicalSeo) {
    const seoFields = ['pageTitle', 'metaDescription', 'headings', 'keywords'];
    const completedSeoFields = seoFields.filter(field => 
      extractionResults.technicalSeo?.[field as any]
    ).length;
    score += (completedSeoFields / seoFields.length) * 15;
  }
  
  // UX Data (10 points max)
  maxScore += 10;
  if (extractionResults.userExperience) {
    const uxFields = ['navigationClarity', 'contentStructure', 'mobileOptimization', 'loadingSpeed'];
    const completedUxFields = uxFields.filter(field => 
      extractionResults.userExperience?.[field as keyof typeof extractionResults.userExperience] != null
    ).length;
    score += (completedUxFields / uxFields.length) * 10;
  }
  
  return Math.round((score / maxScore) * 100);
}

/**
 * Validate extraction results against expected schema
 */
export function validateExtractionResults(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Extraction results must be an object');
    return { isValid: false, errors };
  }
  
  // Validate business info structure
  if (data.businessInfo && typeof data.businessInfo !== 'object') {
    errors.push('businessInfo must be an object');
  }
  
  // Validate CTAs structure
  if (data.callsToAction && !Array.isArray(data.callsToAction)) {
    errors.push('callsToAction must be an array');
  } else if (data.callsToAction) {
    data.callsToAction.forEach((cta: any, index: number) => {
      if (!cta.text) {
        errors.push(`CTA at index ${index} missing required 'text' field`);
      }
      if (cta.prominence && !['primary', 'secondary', 'tertiary'].includes(cta.prominence)) {
        errors.push(`CTA at index ${index} has invalid prominence value`);
      }
    });
  }
  
  // Validate products structure
  if (data.products && !Array.isArray(data.products)) {
    errors.push('products must be an array');
  }
  
  // Validate social proof structure
  if (data.socialProof && typeof data.socialProof !== 'object') {
    errors.push('socialProof must be an object');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Merge multiple extraction results (useful for batch processing)
 */
export function mergeExtractionResults(results: ExtractionResults[]): ExtractionResults {
  const merged: ExtractionResults = {
    businessInfo: {},
    products: [],
    callsToAction: [],
    socialProof: {
      testimonials: [],
      reviews: [],
      clientLogos: [],
      certifications: [],
      statistics: []
    },
    psychologyTriggers: {
      scarcity: [],
      urgency: [],
      authority: [],
      reciprocity: []
    }
  };
  
  results.forEach(result => {
    // Merge business info (first non-empty wins)
    if (result.businessInfo && Object.keys(result.businessInfo).length > 0) {
      merged.businessInfo = { ...merged.businessInfo, ...result.businessInfo };
    }
    
    // Concatenate arrays
    if (result.products) merged.products!.push(...result.products);
    if (result.callsToAction) merged.callsToAction!.push(...result.callsToAction);
    
    // Merge social proof arrays
    if (result.socialProof) {
      Object.entries(result.socialProof).forEach(([key, values]) => {
        if (Array.isArray(values) && merged.socialProof) {
          (merged.socialProof as any)[key].push(...values);
        }
      });
    }
    
    // Merge psychology triggers
    if (result.psychologyTriggers) {
      Object.entries(result.psychologyTriggers).forEach(([key, values]) => {
        if (Array.isArray(values) && merged.psychologyTriggers) {
          (merged.psychologyTriggers as any)[key].push(...values);
        }
      });
    }
  });
  
  // Remove duplicates from arrays
  if (merged.callsToAction) {
    merged.callsToAction = merged.callsToAction.filter((cta, index, self) => 
      index === self.findIndex(c => c.text === cta.text && c.url === cta.url)
    );
  }
  
  return merged;
}