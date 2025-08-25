import { pgTable, uuid, varchar, timestamp, text, pgEnum, vector, index, jsonb, decimal, boolean, integer } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { websites } from './websites';
// Note: Extraction relations are defined in extractions.ts to avoid circular imports

export const analysisStatusEnum = pgEnum('analysis_status', ['pending', 'processing', 'completed', 'failed', 'archived', 'extracting', 'analyzing']);
export const analysisActionsEnum = pgEnum('analysis_actions', ['none', 'rescan', 'retry', 'extract', 'crawl', 'batch']);

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
  firecrawlVersion: varchar('firecrawl_version', { length: 20 }).default('v2'),
  pageType: varchar('page_type', { length: 50 }),
  extractionResults: jsonb('extraction_results'),
  extractionConfidence: decimal('extraction_confidence', { precision: 3, scale: 2 }),
  dataRichness: decimal('data_richness', { precision: 3, scale: 2 }),
  extractionPrompts: jsonb('extraction_prompts'),
  
  // Batch processing support
  batchJobId: varchar('batch_job_id', { length: 255 }),
  parentAnalysisId: uuid('parent_analysis_id').references(() => analyses.id),
  isBatchChild: boolean('is_batch_child').default(false),
  
  // Crawl processing support
  crawlJobId: varchar('crawl_job_id', { length: 255 }),
  crawlDepth: integer('crawl_depth'),
  crawlPageCount: integer('crawl_page_count'),
  
  // Enhanced metadata
  aiProcessingTime: integer('ai_processing_time'), // milliseconds
  tokenUsage: jsonb('token_usage'),
  extractionVersion: varchar('extraction_version', { length: 50 }).default('1.0.0'),
  
  // Processing metrics (moved from websites table)
  loadTime: integer('load_time'),
  pageSize: integer('page_size'),
  resourceCount: integer('resource_count'),
  
  // Phase 3: Enhanced Analytics Support
  extractionDataUsed: boolean('extraction_data_used').default(false),
  dataRichnessScore: decimal('data_richness_score', { precision: 3, scale: 2 }),
  analysisVersion: varchar('analysis_version', { length: 50 }).default('2.0.0'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  // HNSW index for optimal performance on Neon PostgreSQL
  index('analyses_embedding_hnsw_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  // Core performance indexes for analyses table
  index('analyses_firecrawl_version_idx').on(table.firecrawlVersion),
  index('analyses_page_type_idx').on(table.pageType),
  index('analyses_extraction_confidence_idx').on(table.extractionConfidence),
  index('analyses_data_richness_idx').on(table.dataRichness),
  index('analyses_batch_job_idx').on(table.batchJobId).where(sql`${table.batchJobId} IS NOT NULL`),
  index('analyses_crawl_job_idx').on(table.crawlJobId).where(sql`${table.crawlJobId} IS NOT NULL`),
  index('analyses_parent_analysis_idx').on(table.parentAnalysisId).where(sql`${table.parentAnalysisId} IS NOT NULL`),
  // JSONB indexes for extraction results
  index('analyses_extraction_results_gin_idx').using('gin', table.extractionResults),
  index('analyses_token_usage_gin_idx').using('gin', table.tokenUsage),
  index('analyses_extraction_prompts_gin_idx').using('gin', table.extractionPrompts),
  // Phase 3: Enhanced Analytics indexes
  index('analyses_extraction_enhanced_idx').on(table.extractionDataUsed),
  index('analyses_data_richness_score_idx').on(table.dataRichnessScore),
  // Composite indexes for common queries
  index('analyses_status_version_idx').on(table.status, table.firecrawlVersion),
  index('analyses_website_status_idx').on(table.websiteId, table.status),
]);

// Relations - Note: Many-to-one relations to extraction tables are defined in extractions.ts
export const analysesRelations = relations(analyses, ({ one, many }) => ({
  website: one(websites, {
    fields: [analyses.websiteId],
    references: [websites.id],
  }),
  parentAnalysis: one(analyses, {
    fields: [analyses.parentAnalysisId],
    references: [analyses.id],
  }),
  childAnalyses: many(analyses),
  // Note: One-to-many relations with extraction tables would be defined here,
  // but we avoid circular imports by defining them in extractions.ts
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