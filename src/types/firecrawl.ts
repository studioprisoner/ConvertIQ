// Firecrawl-related type definitions
import { z } from 'zod';

// Firecrawl API Types
export type FirecrawlFormat = 'markdown' | 'html' | 'text' | 'extract';

export interface FirecrawlPageOptions {
  onlyMainContent?: boolean;
  includeLinks?: boolean;
  includeImages?: boolean;
  waitAfterLoad?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface FirecrawlScrapeOptions {
  formats?: FirecrawlFormat[];
  pageOptions?: FirecrawlPageOptions;
  extractorOptions?: {
    extractionSchema?: any;
    extractionPrompt?: string;
    mode?: 'llm-extraction' | 'llm-extraction-from-raw-html';
  };
}

export interface FirecrawlCrawlOptions extends FirecrawlScrapeOptions {
  maxDepth?: number;
  maxLinks?: number;
  onlyDomain?: boolean;
  excludePaths?: string[];
  includePaths?: string[];
  allowBackwardLinks?: boolean;
  allowExternalLinks?: boolean;
}

export interface FirecrawlExtractOptions {
  urls: string[];
  prompt: string;
  schema?: any;
  systemPrompt?: string;
  showSources?: boolean;
}

export interface FirecrawlMapOptions {
  url: string;
  search?: string;
  ignoreSitemap?: boolean;
  includeSubdomains?: boolean;
  limit?: number;
}

// Response Types
export interface FirecrawlPageData {
  url: string;
  markdown?: string;
  html?: string;
  rawHtml?: string;
  text?: string;
  screenshot?: string;
  metadata: {
    title?: string;
    description?: string;
    keywords?: string;
    robots?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogUrl?: string;
    twitterCard?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    sourceURL: string;
    statusCode: number;
    error?: string;
    wordCount?: number;
    pageType?: string;
    language?: string;
    timestamp: string;
  };
  extract?: any;
}

export interface FirecrawlScrapeResponse {
  success: boolean;
  data?: FirecrawlPageData;
  error?: string;
  warning?: string;
}

export interface FirecrawlCrawlResponse {
  success: boolean;
  data?: FirecrawlPageData[];
  error?: string;
  warning?: string;
}

export interface FirecrawlExtractResponse {
  success: boolean;
  data?: any;
  error?: string;
  warning?: string;
  metadata?: {
    tokensUsed?: number;
    cost?: number;
  };
}

export interface FirecrawlMapResponse {
  success: boolean;
  links?: string[];
  error?: string;
}

// Enhanced Types for ConvertIQ Integration
export interface FirecrawlJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  pagesProcessed: number;
  totalPages: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface FirecrawlBatchJob {
  id: string;
  type: 'scrape' | 'crawl' | 'extract';
  urls: string[];
  options: FirecrawlScrapeOptions | FirecrawlCrawlOptions | FirecrawlExtractOptions;
  status: FirecrawlJobStatus;
  results: FirecrawlPageData[];
  websiteId?: string;
  userId?: string;
}

// Rate Limiting Types
export interface FirecrawlRateLimit {
  scrapeLimit: number;
  scrapeUsed: number;
  scrapeReset: Date;
  crawlLimit: number;
  crawlUsed: number;
  crawlReset: Date;
  extractLimit: number;
  extractUsed: number;
  extractReset: Date;
}

// Error Types
export interface FirecrawlError {
  code: 'RATE_LIMITED' | 'INVALID_URL' | 'TIMEOUT' | 'PARSE_ERROR' | 'API_ERROR' | 'NETWORK_ERROR';
  message: string;
  details?: any;
  retryAfter?: number; // seconds
}

// Monitoring and Analytics
export interface FirecrawlUsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalCost: number;
  tokensUsed: number;
  period: {
    start: Date;
    end: Date;
  };
}

// Extraction Schemas
export const conversionExtractionSchema = z.object({
  businessInfo: z.object({
    name: z.string().describe('Business or website name'),
    description: z.string().describe('Brief description of what they do'),
    industry: z.string().describe('Industry or business category'),
  }),
  callsToAction: z.array(z.object({
    text: z.string().describe('CTA button/link text'),
    position: z.string().describe('Location on page (header, hero, footer, etc.)'),
    prominence: z.enum(['primary', 'secondary', 'tertiary']).describe('Visual prominence level'),
    type: z.enum(['button', 'link', 'form']).describe('CTA type'),
  })).describe('All call-to-action elements found'),
  socialProof: z.object({
    testimonials: z.array(z.string()).describe('Customer testimonials or reviews'),
    trustBadges: z.array(z.string()).describe('Trust badges, certifications, awards'),
    clientLogos: z.array(z.string()).describe('Client or partner logos'),
    statisticsOrNumbers: z.array(z.string()).describe('Impressive numbers or statistics'),
  }).describe('Social proof elements'),
  psychologyTriggers: z.object({
    scarcity: z.boolean().describe('Uses scarcity (limited time, stock, etc.)'),
    urgency: z.boolean().describe('Uses urgency (act now, hurry, etc.)'),
    authority: z.boolean().describe('Shows authority (expert status, credentials)'),
    reciprocity: z.boolean().describe('Uses reciprocity (free gifts, valuable content)'),
  }).describe('Psychological triggers used'),
});

export const seoExtractionSchema = z.object({
  metadata: z.object({
    title: z.string().describe('Page title tag'),
    description: z.string().describe('Meta description'),
    keywords: z.string().optional().describe('Meta keywords if present'),
  }),
  headings: z.array(z.object({
    level: z.number().describe('Heading level (1-6)'),
    text: z.string().describe('Heading text'),
  })).describe('All headings on the page'),
  internalLinks: z.number().describe('Count of internal links'),
  externalLinks: z.number().describe('Count of external links'),
  images: z.object({
    total: z.number().describe('Total number of images'),
    withAltText: z.number().describe('Images with alt text'),
    withoutAltText: z.number().describe('Images missing alt text'),
  }),
});

// Validation Schemas
export const firecrawlScrapeOptionsSchema = z.object({
  formats: z.array(z.enum(['markdown', 'html', 'text', 'extract'])).default(['markdown']),
  pageOptions: z.object({
    onlyMainContent: z.boolean().default(true),
    includeLinks: z.boolean().default(true),
    includeImages: z.boolean().default(true),
    waitAfterLoad: z.number().min(0).max(10000).optional(),
    timeout: z.number().min(1000).max(60000).default(30000),
  }).optional(),
}).optional();

export const firecrawlCrawlOptionsSchema = z.object({
  maxDepth: z.number().min(1).max(5).default(2),
  maxLinks: z.number().min(1).max(1000).default(100),
  onlyDomain: z.boolean().default(true),
  excludePaths: z.array(z.string()).optional(),
  includePaths: z.array(z.string()).optional(),
  formats: z.array(z.enum(['markdown', 'html', 'text', 'extract'])).default(['markdown']),
}).merge(firecrawlScrapeOptionsSchema.unwrap());

export const firecrawlExtractOptionsSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(50),
  prompt: z.string().min(10).max(2000),
  schema: z.any().optional(),
  systemPrompt: z.string().optional(),
  showSources: z.boolean().default(false),
});

// Type Guards
export function isFirecrawlError(error: any): error is FirecrawlError {
  return error && typeof error.code === 'string' && typeof error.message === 'string';
}

export function isFirecrawlPageData(data: any): data is FirecrawlPageData {
  return data && typeof data.url === 'string' && data.metadata && typeof data.metadata.sourceURL === 'string';
}