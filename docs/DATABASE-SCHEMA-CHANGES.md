# Database Schema Changes for Firecrawl v2 & Enhanced Extraction

## Overview

This document outlines all database schema changes required to support Firecrawl v2 integration and enhanced structured data extraction capabilities.

## Current Database State

### Existing Tables Analysis

ConvertIQ currently uses the following core tables for website analysis:

#### Current `websites` Table
```sql
CREATE TABLE websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL, 
  url varchar(500) NOT NULL,
  name varchar(255),
  description text,
  page_type varchar(50), -- homepage, product, service, landing
  is_validated boolean DEFAULT FALSE,
  validation_status varchar(50), -- pending, valid, invalid, error
  validation_message text,
  last_validated_at timestamp,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);
```

#### Current `analyses` Table 
```sql
CREATE TABLE analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  status analysis_status DEFAULT 'pending',
  actions analysis_actions DEFAULT 'none',
  raw_data text, -- Store scraped HTML/data (from crawler)
  ai_analysis text, -- Store AI analysis results
  embedding vector(1024), -- Voyage AI voyage-3.5 dimensions
  embedding_model varchar(100) DEFAULT 'voyage-3.5',
  embedding_created_at timestamp,
  error_message text,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);
```

#### Existing Enums
```sql
CREATE TYPE analysis_status AS ENUM('pending', 'processing', 'completed', 'failed', 'archived');
CREATE TYPE analysis_actions AS ENUM('none', 'rescan', 'retry');
```

## Required Schema Changes

### Phase 1: Core Firecrawl v2 Support

#### 1.1 Update Enums

```sql
-- Add new statuses for v2 capabilities
ALTER TYPE analysis_status ADD VALUE 'extracting';
ALTER TYPE analysis_status ADD VALUE 'analyzing';

-- Add new actions for v2 processing
ALTER TYPE analysis_actions ADD VALUE 'extract';
ALTER TYPE analysis_actions ADD VALUE 'crawl';
ALTER TYPE analysis_actions ADD VALUE 'batch';
```

#### 1.2 Add Core v2 Columns to `analyses` Table

```sql
-- Add Firecrawl v2 specific columns
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS firecrawl_version VARCHAR(20) DEFAULT 'v2';
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS extraction_results JSONB;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS extraction_confidence DECIMAL(3,2);
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS data_richness DECIMAL(3,2);
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS extraction_prompts JSONB;

-- Batch processing support
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS batch_job_id VARCHAR(255);
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS parent_analysis_id UUID REFERENCES analyses(id);
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS is_batch_child BOOLEAN DEFAULT FALSE;

-- Crawl processing support  
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS crawl_job_id VARCHAR(255);
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS crawl_depth INTEGER;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS crawl_page_count INTEGER;

-- Enhanced metadata
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS ai_processing_time INTEGER; -- milliseconds
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS token_usage JSONB;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS extraction_version VARCHAR(50) DEFAULT '1.0.0';

-- Processing metrics (moved from websites table)
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS load_time INTEGER;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS page_size INTEGER;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS resource_count INTEGER;
```

#### 1.3 Enhance `websites` Table for v2

```sql
-- Move page_type to enum for better validation
CREATE TYPE page_type_enum AS ENUM(
  'homepage', 'about', 'contact', 'pricing', 'blog-post', 'blog-category',
  'ecommerce-product', 'ecommerce-category', 'ecommerce-cart', 'ecommerce-checkout',
  'service-landing', 'service-detail', 'case-study', 'testimonials', 'portfolio',
  'landing-page', 'lead-magnet', 'thank-you', '404-error', 'legal', 'faq',
  'search-results', 'unknown'
);

-- Update websites table page_type to use enum
ALTER TABLE websites ALTER COLUMN page_type TYPE page_type_enum USING page_type::page_type_enum;
```

### Phase 2: Structured Data Support

#### 2.1 Create Extraction Results Tables

For better query performance and data organization, create separate tables for different extraction types:

```sql
-- Core extraction metadata
CREATE TABLE extraction_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  extraction_type VARCHAR(50) NOT NULL, -- 'business_info', 'products', 'social_proof', etc.
  confidence_score DECIMAL(3,2),
  processing_time INTEGER, -- milliseconds
  prompt_used TEXT,
  schema_version VARCHAR(20) DEFAULT '1.0.0',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Business information extractions
CREATE TABLE extracted_business_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  business_name VARCHAR(255),
  industry VARCHAR(100),
  description TEXT,
  mission_statement TEXT,
  value_proposition TEXT,
  founded_year INTEGER,
  size_indicator VARCHAR(50),
  location JSONB, -- {address, city, state, country, coordinates}
  contact_info JSONB, -- {phone, email, social_media}
  business_hours JSONB,
  services_offered JSONB, -- array of services
  target_audience TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Product/Service extractions
CREATE TABLE extracted_products_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'product' or 'service'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_info JSONB, -- {current, original, currency, discount}
  features JSONB, -- array of features
  specifications JSONB,
  benefits JSONB, -- array of benefits
  images JSONB, -- array of image URLs
  category VARCHAR(100),
  availability_status VARCHAR(50),
  sku VARCHAR(100),
  rating_info JSONB, -- {score, count, distribution}
  created_at TIMESTAMP DEFAULT NOW()
);

-- Call-to-action extractions
CREATE TABLE extracted_ctas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  text VARCHAR(255) NOT NULL,
  cta_type VARCHAR(50), -- 'buy', 'signup', 'contact', 'download', etc.
  prominence VARCHAR(20), -- 'primary', 'secondary', 'tertiary'
  position_on_page VARCHAR(50), -- 'header', 'hero', 'sidebar', 'footer', etc.
  urgency_level VARCHAR(20), -- 'high', 'medium', 'low', 'none'
  target_url TEXT,
  visual_style JSONB, -- {color, size, style_classes}
  psychology_triggers JSONB, -- array of triggers like 'scarcity', 'urgency'
  conversion_context TEXT, -- surrounding content context
  created_at TIMESTAMP DEFAULT NOW()
);

-- Social proof extractions
CREATE TABLE extracted_social_proof (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  proof_type VARCHAR(50), -- 'review', 'testimonial', 'trust_badge', 'client_logo', etc.
  content TEXT,
  source VARCHAR(255), -- author name, review platform, etc.
  rating DECIMAL(2,1), -- for reviews
  date_mentioned DATE,
  verification_status BOOLEAN DEFAULT FALSE,
  prominence VARCHAR(20), -- how prominently displayed
  credibility_indicators JSONB, -- verified purchase, real photo, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Psychology and conversion elements
CREATE TABLE extracted_psychology_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  trigger_type VARCHAR(50), -- 'scarcity', 'urgency', 'social_proof', 'authority', etc.
  element_text TEXT,
  position_on_page VARCHAR(50),
  effectiveness_score DECIMAL(3,2), -- AI-estimated effectiveness
  context TEXT, -- surrounding content
  recommendation TEXT, -- AI suggestion for improvement
  created_at TIMESTAMP DEFAULT NOW()
);

-- SEO-specific extractions
CREATE TABLE extracted_seo_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  element_type VARCHAR(50), -- 'title', 'meta_description', 'heading', 'schema', etc.
  content TEXT NOT NULL,
  html_tag VARCHAR(20), -- 'h1', 'h2', 'title', 'meta', etc.
  position INTEGER, -- order on page for headings
  character_count INTEGER,
  keyword_density JSONB, -- estimated keyword analysis
  optimization_score DECIMAL(3,2), -- AI-scored optimization level
  recommendations TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Phase 3: Enhanced Analytics Support

#### 3.1 Analysis Results Enhancement

```sql
-- Update existing analyses table to reference new extraction data
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS extraction_data_used BOOLEAN DEFAULT FALSE;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS data_richness_score DECIMAL(3,2);
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS analysis_version VARCHAR(50) DEFAULT '2.0.0';

-- Add indexes for extraction-enhanced analysis queries
CREATE INDEX IF NOT EXISTS idx_analyses_extraction_enhanced ON analyses(extraction_data_used);
CREATE INDEX IF NOT EXISTS idx_analyses_data_richness ON analyses(data_richness_score);
```

#### 3.2 Create Analysis Enhancement Tracking

```sql
-- Track improvements in analysis quality with structured data
CREATE TABLE analysis_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  
  -- Quality metrics
  recommendation_specificity DECIMAL(3,2), -- how specific recommendations are
  data_coverage DECIMAL(3,2), -- what % of page elements were analyzed
  accuracy_confidence DECIMAL(3,2), -- AI confidence in analysis
  
  -- Comparison with non-structured analysis
  improvement_over_basic JSONB, -- metrics comparing structured vs basic analysis
  
  -- Processing efficiency
  processing_time INTEGER, -- milliseconds
  token_efficiency DECIMAL(5,2), -- recommendations per token used
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Phase 4: Performance and Indexing

#### 4.1 Essential Indexes

```sql
-- Core performance indexes for analyses table
CREATE INDEX IF NOT EXISTS idx_analyses_firecrawl_version ON analyses(firecrawl_version);
CREATE INDEX IF NOT EXISTS idx_analyses_extraction_confidence ON analyses(extraction_confidence);
CREATE INDEX IF NOT EXISTS idx_analyses_data_richness ON analyses(data_richness);
CREATE INDEX IF NOT EXISTS idx_analyses_batch_job ON analyses(batch_job_id) WHERE batch_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analyses_crawl_job ON analyses(crawl_job_id) WHERE crawl_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analyses_parent_analysis ON analyses(parent_analysis_id) WHERE parent_analysis_id IS NOT NULL;

-- JSONB indexes for extraction results
CREATE INDEX IF NOT EXISTS idx_analyses_extraction_results ON analyses USING GIN(extraction_results);
CREATE INDEX IF NOT EXISTS idx_analyses_token_usage ON analyses USING GIN(token_usage);
CREATE INDEX IF NOT EXISTS idx_analyses_extraction_prompts ON analyses USING GIN(extraction_prompts);

-- Website page type index
CREATE INDEX IF NOT EXISTS idx_websites_page_type ON websites(page_type);

-- Extraction table indexes
CREATE INDEX IF NOT EXISTS idx_extraction_metadata_analysis ON extraction_metadata(analysis_id);
CREATE INDEX IF NOT EXISTS idx_extraction_metadata_type ON extraction_metadata(extraction_type);
CREATE INDEX IF NOT EXISTS idx_extracted_business_info_analysis ON extracted_business_info(analysis_id);
CREATE INDEX IF NOT EXISTS idx_extracted_products_analysis ON extracted_products_services(analysis_id);
CREATE INDEX IF NOT EXISTS idx_extracted_products_type ON extracted_products_services(type);
CREATE INDEX IF NOT EXISTS idx_extracted_ctas_analysis ON extracted_ctas(analysis_id);
CREATE INDEX IF NOT EXISTS idx_extracted_ctas_type ON extracted_ctas(cta_type);
CREATE INDEX IF NOT EXISTS idx_extracted_social_proof_analysis ON extracted_social_proof(analysis_id);
CREATE INDEX IF NOT EXISTS idx_extracted_social_proof_type ON extracted_social_proof(proof_type);
CREATE INDEX IF NOT EXISTS idx_extracted_psychology_analysis ON extracted_psychology_elements(analysis_id);
CREATE INDEX IF NOT EXISTS idx_extracted_psychology_type ON extracted_psychology_elements(trigger_type);
CREATE INDEX IF NOT EXISTS idx_extracted_seo_analysis ON extracted_seo_elements(analysis_id);
CREATE INDEX IF NOT EXISTS idx_extracted_seo_type ON extracted_seo_elements(element_type);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analyses_status_version ON analyses(status, firecrawl_version);
CREATE INDEX IF NOT EXISTS idx_analyses_website_status ON analyses(website_id, status);
CREATE INDEX IF NOT EXISTS idx_extracted_ctas_prominence_type ON extracted_ctas(prominence, cta_type);
```

## Migration Scripts

### Migration Script 1: Core Schema Updates

```typescript
// src/db/migrations/xxxx_firecrawl_v2_core.ts
import { sql } from 'drizzle-orm';
import { db } from '../connection';

export async function up() {
  console.log('🔄 Migrating to Firecrawl v2 schema...');

  // Add new enum values
  await db.execute(sql`
    ALTER TYPE scan_type ADD VALUE IF NOT EXISTS 'extraction';
    ALTER TYPE scan_type ADD VALUE IF NOT EXISTS 'crawl';
    ALTER TYPE scan_type ADD VALUE IF NOT EXISTS 'batch';
    ALTER TYPE scan_status ADD VALUE IF NOT EXISTS 'extracting';
    ALTER TYPE scan_status ADD VALUE IF NOT EXISTS 'analyzing';
  `);

  // Add core v2 columns to analyses table
  await db.execute(sql`
    ALTER TABLE analyses 
    ADD COLUMN IF NOT EXISTS firecrawl_version VARCHAR(20) DEFAULT 'v2',
    ADD COLUMN IF NOT EXISTS extraction_results JSONB,
    ADD COLUMN IF NOT EXISTS extraction_confidence DECIMAL(3,2),
    ADD COLUMN IF NOT EXISTS data_richness DECIMAL(3,2),
    ADD COLUMN IF NOT EXISTS extraction_prompts JSONB,
    ADD COLUMN IF NOT EXISTS batch_job_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS parent_analysis_id UUID REFERENCES analyses(id),
    ADD COLUMN IF NOT EXISTS is_batch_child BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS crawl_job_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS crawl_depth INTEGER,
    ADD COLUMN IF NOT EXISTS crawl_page_count INTEGER,
    ADD COLUMN IF NOT EXISTS ai_processing_time INTEGER,
    ADD COLUMN IF NOT EXISTS token_usage JSONB,
    ADD COLUMN IF NOT EXISTS extraction_version VARCHAR(50) DEFAULT '1.0.0',
    ADD COLUMN IF NOT EXISTS load_time INTEGER,
    ADD COLUMN IF NOT EXISTS page_size INTEGER,
    ADD COLUMN IF NOT EXISTS resource_count INTEGER;
  `);

  // Enhance websites table
  await db.execute(sql`
    CREATE TYPE page_type_enum AS ENUM(
      'homepage', 'about', 'contact', 'pricing', 'blog-post', 'blog-category',
      'ecommerce-product', 'ecommerce-category', 'ecommerce-cart', 'ecommerce-checkout',
      'service-landing', 'service-detail', 'case-study', 'testimonials', 'portfolio',
      'landing-page', 'lead-magnet', 'thank-you', '404-error', 'legal', 'faq',
      'search-results', 'unknown'
    );
    
    ALTER TABLE websites ALTER COLUMN page_type TYPE page_type_enum USING page_type::page_type_enum;
  `);

  // Create essential indexes
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_analyses_firecrawl_version ON analyses(firecrawl_version);
    CREATE INDEX IF NOT EXISTS idx_analyses_extraction_confidence ON analyses(extraction_confidence);
    CREATE INDEX IF NOT EXISTS idx_analyses_extraction_results ON analyses USING GIN(extraction_results);
    CREATE INDEX IF NOT EXISTS idx_websites_page_type ON websites(page_type);
  `);

  console.log('✅ Core Firecrawl v2 migration completed');
}

export async function down() {
  console.log('🔄 Rolling back Firecrawl v2 core migration...');
  
  // Remove added columns from analyses table
  await db.execute(sql`
    ALTER TABLE analyses 
    DROP COLUMN IF EXISTS firecrawl_version,
    DROP COLUMN IF EXISTS extraction_results,
    DROP COLUMN IF EXISTS extraction_confidence,
    DROP COLUMN IF EXISTS data_richness,
    DROP COLUMN IF EXISTS extraction_prompts,
    DROP COLUMN IF EXISTS batch_job_id,
    DROP COLUMN IF EXISTS parent_analysis_id,
    DROP COLUMN IF EXISTS is_batch_child,
    DROP COLUMN IF EXISTS crawl_job_id,
    DROP COLUMN IF EXISTS crawl_depth,
    DROP COLUMN IF EXISTS crawl_page_count,
    DROP COLUMN IF EXISTS ai_processing_time,
    DROP COLUMN IF EXISTS token_usage,
    DROP COLUMN IF EXISTS extraction_version,
    DROP COLUMN IF EXISTS load_time,
    DROP COLUMN IF EXISTS page_size,
    DROP COLUMN IF EXISTS resource_count;
  `);

  console.log('✅ Core migration rollback completed');
}
```

### Migration Script 2: Extraction Tables

```typescript
// src/db/migrations/xxxx_extraction_tables.ts
export async function up() {
  console.log('🔄 Creating extraction tables...');

  // Create page type enum
  await db.execute(sql`
    CREATE TYPE page_type_enum AS ENUM(
      'homepage', 'about', 'contact', 'pricing', 'blog-post', 'blog-category',
      'ecommerce-product', 'ecommerce-category', 'ecommerce-cart', 'ecommerce-checkout',
      'service-landing', 'service-detail', 'case-study', 'testimonials', 'portfolio',
      'landing-page', 'lead-magnet', 'thank-you', '404-error', 'legal', 'faq',
      'search-results', 'unknown'
    );
  `);

  // Create extraction metadata table
  await db.execute(sql`
    CREATE TABLE extraction_metadata (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
      extraction_type VARCHAR(50) NOT NULL,
      confidence_score DECIMAL(3,2),
      processing_time INTEGER,
      prompt_used TEXT,
      schema_version VARCHAR(20) DEFAULT '1.0.0',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create business info extraction table
  await db.execute(sql`
    CREATE TABLE extracted_business_info (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
      business_name VARCHAR(255),
      industry VARCHAR(100),
      description TEXT,
      mission_statement TEXT,
      value_proposition TEXT,
      founded_year INTEGER,
      size_indicator VARCHAR(50),
      location JSONB,
      contact_info JSONB,
      business_hours JSONB,
      services_offered JSONB,
      target_audience TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create other extraction tables (CTAs, social proof, etc.)
  // ... (include all table creation SQL from above)

  console.log('✅ Extraction tables created');
}
```

### Migration Script 3: Data Migration

```typescript
// src/db/migrations/xxxx_migrate_existing_data.ts
export async function up() {
  console.log('🔄 Migrating existing scan data to v2 format...');

  // Set firecrawl_version to 'v1' for existing scans
  await db.execute(sql`
    UPDATE scans 
    SET firecrawl_version = 'v1', extraction_version = '0.0.0'
    WHERE firecrawl_version IS NULL OR firecrawl_version = 'v2';
  `);

  // Attempt to infer page types from existing data
  await db.execute(sql`
    UPDATE scans 
    SET page_type = CASE 
      WHEN url ILIKE '%/product/%' OR url ILIKE '%/products/%' THEN 'ecommerce-product'
      WHEN url ILIKE '%/service/%' OR url ILIKE '%/services/%' THEN 'service-landing'
      WHEN url ILIKE '%/blog/%' OR url ILIKE '%/post/%' THEN 'blog-post'
      WHEN url ILIKE '%/about%' THEN 'about'
      WHEN url ILIKE '%/contact%' THEN 'contact'
      WHEN url ILIKE '%/pricing%' THEN 'pricing'
      WHEN url ~ '.*/$' OR url NOT ILIKE '%/%' THEN 'homepage'
      ELSE 'unknown'
    END::page_type_enum
    WHERE page_type IS NULL;
  `);

  console.log('✅ Existing data migration completed');
}
```

## Schema Update TypeScript Interfaces

### Updated Drizzle Schema Files

```typescript
// src/db/schema/scans.ts
import { pgTable, uuid, varchar, timestamp, text, jsonb, integer, decimal, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const scanStatus = pgEnum('scan_status', [
  'pending', 'in_progress', 'processing', 'completed', 'failed', 'archived', 'extracting', 'analyzing'
]);

export const scanType = pgEnum('scan_type', [
  'full', 'performance', 'seo', 'accessibility', 'security', 'extraction', 'crawl', 'batch'
]);

export const pageType = pgEnum('page_type_enum', [
  'homepage', 'about', 'contact', 'pricing', 'blog-post', 'blog-category',
  'ecommerce-product', 'ecommerce-category', 'ecommerce-cart', 'ecommerce-checkout',
  'service-landing', 'service-detail', 'case-study', 'testimonials', 'portfolio',
  'landing-page', 'lead-magnet', 'thank-you', '404-error', 'legal', 'faq',
  'search-results', 'unknown'
]);

export const scans = pgTable('scans', {
  id: uuid('id').primaryKey().defaultRandom(),
  websiteId: uuid('website_id').notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  scanType: scanType('scan_type').default('full'),
  status: scanStatus('status').default('pending'),
  
  // Core data
  rawData: text('raw_data'),
  result: jsonb('result'),
  metadata: jsonb('metadata'),
  error: text('error'),
  
  // Firecrawl v2 fields
  firecrawlVersion: varchar('firecrawl_version', { length: 20 }).default('v2'),
  extractionResults: jsonb('extraction_results'),
  pageType: pageType('page_type'),
  extractionConfidence: decimal('extraction_confidence', { precision: 3, scale: 2 }),
  dataRichness: decimal('data_richness', { precision: 3, scale: 2 }),
  extractionPrompts: jsonb('extraction_prompts'),
  
  // Batch processing
  batchJobId: varchar('batch_job_id', { length: 255 }),
  parentScanId: uuid('parent_scan_id'),
  isBatchChild: boolean('is_batch_child').default(false),
  
  // Crawl processing
  crawlJobId: varchar('crawl_job_id', { length: 255 }),
  crawlDepth: integer('crawl_depth'),
  crawlPageCount: integer('crawl_page_count'),
  
  // Performance metrics
  loadTime: integer('load_time'),
  pageSize: integer('page_size'),
  resourceCount: integer('resource_count'),
  
  // AI processing
  aiProcessingTime: integer('ai_processing_time'),
  tokenUsage: jsonb('token_usage'),
  extractionVersion: varchar('extraction_version', { length: 50 }).default('1.0.0'),
  
  // SEO metrics  
  titleLength: integer('title_length'),
  metaDescriptionLength: integer('meta_description_length'),
  headingCount: integer('heading_count'),
  imageCount: integer('image_count'),
  linkCount: integer('link_count'),
  
  // Accessibility
  accessibilityScore: decimal('accessibility_score', { precision: 3, scale: 1 }),
  
  // Error handling
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  
  // Timestamps
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Extraction tables
export const extractionMetadata = pgTable('extraction_metadata', {
  id: uuid('id').primaryKey().defaultRandom(),
  scanId: uuid('scan_id').notNull(),
  extractionType: varchar('extraction_type', { length: 50 }).notNull(),
  confidenceScore: decimal('confidence_score', { precision: 3, scale: 2 }),
  processingTime: integer('processing_time'),
  promptUsed: text('prompt_used'),
  schemaVersion: varchar('schema_version', { length: 20 }).default('1.0.0'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const scansRelations = relations(scans, ({ one, many }) => ({
  website: one(websites, {
    fields: [scans.websiteId],
    references: [websites.id],
  }),
  parentScan: one(scans, {
    fields: [scans.parentScanId],
    references: [scans.id],
  }),
  childScans: many(scans),
  extractionMetadata: many(extractionMetadata),
}));
```

## Deployment Strategy

### Phase 1: Add New Columns (Non-Breaking)
- Add all new columns as nullable
- Create new extraction tables
- Deploy to production without changing application logic

### Phase 2: Update Application Code
- Update TypeScript interfaces
- Modify scan processing to use new fields
- Deploy application changes

### Phase 3: Data Migration  
- Run migration scripts to populate new fields
- Set appropriate defaults for existing data
- Validate data integrity

### Phase 4: Cleanup
- Make critical fields non-nullable where appropriate
- Remove deprecated columns/tables if any
- Optimize indexes based on usage patterns

## Monitoring and Validation

### Data Quality Checks
```sql
-- Validate extraction results structure
SELECT 
  a.id as analysis_id,
  w.page_type,
  a.extraction_confidence,
  jsonb_typeof(a.extraction_results) as results_type,
  jsonb_array_length(a.extraction_results->'callsToAction') as cta_count,
  jsonb_array_length(a.extraction_results->'products') as product_count
FROM analyses a
JOIN websites w ON a.website_id = w.id
WHERE a.firecrawl_version = 'v2' 
  AND a.extraction_results IS NOT NULL;

-- Check page type distribution
SELECT w.page_type, COUNT(*) as count, 
       AVG(a.extraction_confidence) as avg_confidence
FROM analyses a
JOIN websites w ON a.website_id = w.id
WHERE a.firecrawl_version = 'v2'
GROUP BY w.page_type
ORDER BY count DESC;

-- Monitor extraction quality over time
SELECT 
  DATE_TRUNC('day', a.created_at) as date,
  AVG(a.extraction_confidence) as avg_confidence,
  AVG(a.data_richness) as avg_richness,
  COUNT(*) as analysis_count
FROM analyses a
WHERE a.firecrawl_version = 'v2'
  AND a.created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', a.created_at)
ORDER BY date;
```

### Performance Monitoring
```sql
-- Monitor processing times
SELECT 
  w.page_type,
  AVG(a.ai_processing_time) as avg_ai_time,
  AVG(a.load_time) as avg_load_time,
  AVG((a.token_usage->>'totalTokens')::integer) as avg_tokens
FROM analyses a
JOIN websites w ON a.website_id = w.id
WHERE a.firecrawl_version = 'v2'
  AND a.ai_processing_time IS NOT NULL
GROUP BY w.page_type;

-- Check extraction table usage
SELECT 
  schemaname, tablename, n_tup_ins as inserts, n_tup_upd as updates
FROM pg_stat_user_tables 
WHERE tablename LIKE 'extracted_%'
ORDER BY inserts DESC;
```

This comprehensive database schema update will provide the foundation for significantly enhanced website analysis capabilities while maintaining backward compatibility and supporting future growth.