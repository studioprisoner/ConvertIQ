import { pgTable, uuid, varchar, timestamp, text, pgEnum, vector, index, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { websites } from './websites';

export const analysisStatusEnum = pgEnum('analysis_status', ['pending', 'processing', 'completed', 'failed', 'archived']);
export const analysisActionsEnum = pgEnum('analysis_actions', ['none', 'rescan', 'retry']);

export const analyses = pgTable('analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  websiteId: uuid('website_id').notNull().references(() => websites.id, { onDelete: 'cascade' }),
  status: analysisStatusEnum('status').default('pending'),
  actions: analysisActionsEnum('actions').default('none'),
  rawData: text('raw_data'), // Store scraped HTML/data
  aiAnalysis: text('ai_analysis'), // Store AI analysis results
  embedding: vector('embedding', { dimensions: 1024 }), // Voyage AI voyage-3.5 dimensions
  embeddingModel: varchar('embedding_model', { length: 100 }).default('voyage-3.5'),
  embeddingCreatedAt: timestamp('embedding_created_at'),
  errorMessage: text('error_message'),
  
  // Firecrawl v2 capabilities
  extractionResults: jsonb('extraction_results'), // Store structured data extraction results
  firecrawlVersion: varchar('firecrawl_version', { length: 20 }).default('v2'),
  extractionPrompts: jsonb('extraction_prompts'), // Store prompts used for extraction
  batchJobId: varchar('batch_job_id', { length: 255 }), // Track batch processing jobs
  crawlJobId: varchar('crawl_job_id', { length: 255 }), // Track website crawling jobs
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  // HNSW index for optimal performance on Neon PostgreSQL
  index('analyses_embedding_hnsw_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  // Indexes for v2 performance optimization
  index('analyses_firecrawl_version_idx').on(table.firecrawlVersion),
  index('analyses_extraction_results_gin_idx').using('gin', table.extractionResults),
  index('analyses_batch_job_id_idx').on(table.batchJobId),
  index('analyses_crawl_job_id_idx').on(table.crawlJobId),
]);

// Relations
export const analysesRelations = relations(analyses, ({ one, many }) => ({
  website: one(websites, {
    fields: [analyses.websiteId],
    references: [websites.id],
  }),
}));

// Zod schemas
export const insertAnalysisSchema = createInsertSchema(analyses);
export const selectAnalysisSchema = createSelectSchema(analyses);

export type Analysis = z.infer<typeof selectAnalysisSchema>;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;

// Enhanced data structures for Firecrawl v2 capabilities
export interface BusinessInfo {
  name?: string;
  description?: string;
  industry?: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  website?: string;
}

export interface Product {
  name: string;
  price?: string;
  description?: string;
  features?: string[];
  images?: string[];
}

export interface CallToAction {
  text: string;
  url?: string;
  prominence: 'primary' | 'secondary' | 'tertiary';
  position: string;
  type?: string;
}

export interface SocialProof {
  testimonials?: string[];
  reviews?: string[];
  clientLogos?: string[];
  certifications?: string[];
  statistics?: string[];
}

export interface PsychologyTriggers {
  scarcity?: string[];
  urgency?: string[];
  authority?: string[];
  reciprocity?: string[];
}

export interface TechnicalSeoData {
  pageTitle?: string;
  metaDescription?: string;
  headings?: Array<{
    level: string;
    text: string;
  }>;
  keywords?: string[];
  wordCount?: number;
  readabilityLevel?: string;
  contentTypes?: string[];
}

export interface UxData {
  navigationClarity?: number;
  contentStructure?: number;
  mobileOptimization?: number;
  loadingSpeed?: number;
}

export interface ExtractionResults {
  businessInfo?: BusinessInfo;
  products?: Product[];
  callsToAction?: CallToAction[];
  socialProof?: SocialProof;
  psychologyTriggers?: PsychologyTriggers;
  technicalSeo?: TechnicalSeoData;
  userExperience?: UxData;
}

export interface EnhancedAnalysisResult extends Analysis {
  // Enhanced fields for v2
  extractionResults?: ExtractionResults;
  
  // Processing metadata
  processingMetadata?: {
    extractionPrompts?: string[];
    aiProcessingTime?: number;
    embeddingGenerated?: boolean;
    batchJobId?: string;
    crawlJobId?: string;
  };
}