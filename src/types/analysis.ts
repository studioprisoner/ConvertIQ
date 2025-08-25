// Analysis-related type definitions
import { z } from 'zod';

// Analysis Types
export type AnalysisType = 
  | 'conversion-analysis'
  | 'seo-analysis'
  | 'technical-analysis'
  | 'ux-analysis'
  | 'performance-analysis'
  | 'accessibility-analysis'
  | 'comprehensive-audit'
  | 'competitor-analysis';

export type AnalysisStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

// Analysis Configuration
export interface AnalysisConfig {
  type: AnalysisType;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  aiProvider?: 'anthropic' | 'openai' | 'google';
  customPrompt?: string;
  includeScreenshots?: boolean;
  maxDepth?: number;
  maxPages?: number;
}

// Analysis Results
export interface AnalysisResult {
  id: string;
  websiteId: string;
  type: AnalysisType;
  status: AnalysisStatus;
  score: number; // 0-100
  data: AnalysisData;
  recommendations: Recommendation[];
  metadata: AnalysisMetadata;
  createdAt: Date;
  completedAt?: Date;
}

export interface AnalysisData {
  // Conversion Analysis
  conversionElements?: {
    ctasFound: number;
    ctaEffectiveness: number;
    trustSignals: string[];
    socialProofElements: string[];
    psychologyTriggers: {
      scarcity: boolean;
      urgency: boolean;
      authority: boolean;
      reciprocity: boolean;
    };
  };

  // SEO Analysis
  seoElements?: {
    titleTags: { page: string; title: string; length: number; }[];
    metaDescriptions: { page: string; description: string; length: number; }[];
    headingStructure: { page: string; headings: { level: number; text: string; }[]; }[];
    internalLinks: number;
    externalLinks: number;
    imageAltText: { total: number; missing: number; };
  };

  // Technical Analysis
  technicalElements?: {
    loadSpeed: number;
    mobileOptimization: boolean;
    httpsEnabled: boolean;
    sitemapExists: boolean;
    robotsTxtExists: boolean;
    structuredData: string[];
    coreWebVitals: {
      lcp: number;
      fid: number;
      cls: number;
    };
  };

  // UX Analysis
  uxElements?: {
    navigationClarity: number;
    contentReadability: number;
    visualHierarchy: number;
    mobileUsability: number;
    accessibilityScore: number;
  };

  // Performance Analysis
  performanceElements?: {
    pageLoadTime: number;
    resourceSizes: { type: string; size: number; }[];
    compressionEnabled: boolean;
    cachingEnabled: boolean;
    cdnUsage: boolean;
  };
}

export interface Recommendation {
  id: string;
  category: 'conversion' | 'seo' | 'technical' | 'ux' | 'performance' | 'accessibility';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: number; // 1-10 scale
  effort: number; // 1-10 scale
  implementationSteps: string[];
  resources?: {
    title: string;
    url: string;
  }[];
  codeSnippet?: string;
  estimatedTimeToImplement?: string;
}

export interface AnalysisMetadata {
  pagesAnalyzed: number;
  tokensUsed: number;
  costUsd: number;
  processingTimeMs: number;
  aiProvider: string;
  aiModel: string;
  firecrawlVersion: 'v1' | 'v2';
  extractionVersion?: string;
}

// Streaming Analysis Types
export interface StreamingAnalysisUpdate {
  phase: 'crawling' | 'extraction' | 'analysis' | 'complete';
  progress: number; // 0-100
  message?: string;
  data?: Partial<AnalysisResult>;
  error?: string;
}

// Batch Analysis
export interface BatchAnalysisRequest {
  websiteIds: string[];
  analysisTypes: AnalysisType[];
  config: AnalysisConfig;
}

export interface BatchAnalysisResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results: AnalysisResult[];
  totalWebsites: number;
  completedWebsites: number;
  failedWebsites: number;
  estimatedCompletionTime?: Date;
}

// Analysis Schemas for validation
export const analysisConfigSchema = z.object({
  type: z.enum(['conversion-analysis', 'seo-analysis', 'technical-analysis', 'ux-analysis', 'performance-analysis', 'accessibility-analysis', 'comprehensive-audit', 'competitor-analysis']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  aiProvider: z.enum(['anthropic', 'openai', 'google']).optional(),
  customPrompt: z.string().optional(),
  includeScreenshots: z.boolean().default(false),
  maxDepth: z.number().min(1).max(5).default(2),
  maxPages: z.number().min(1).max(100).default(50),
});

export const recommendationSchema = z.object({
  id: z.string(),
  category: z.enum(['conversion', 'seo', 'technical', 'ux', 'performance', 'accessibility']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  impact: z.number().min(1).max(10),
  effort: z.number().min(1).max(10),
  implementationSteps: z.array(z.string()),
  resources: z.array(z.object({
    title: z.string(),
    url: z.string().url(),
  })).optional(),
  codeSnippet: z.string().optional(),
  estimatedTimeToImplement: z.string().optional(),
});