// Migration Script 1: Core Firecrawl v2 Schema Updates
// For development environment only - DO NOT RUN IN PRODUCTION
import { sql } from 'drizzle-orm';
import { db } from '../../connection';

export async function up() {
  console.log('🔄 Migrating to Firecrawl v2 core schema (Phase 1)...');

  try {
    // Phase 1: Core Firecrawl v2 Support - Update Enums
    console.log('📝 Updating enums for v2 capabilities...');
    await db.execute(sql`
      ALTER TYPE analysis_status ADD VALUE IF NOT EXISTS 'extracting';
      ALTER TYPE analysis_status ADD VALUE IF NOT EXISTS 'analyzing';
      ALTER TYPE analysis_actions ADD VALUE IF NOT EXISTS 'extract';
      ALTER TYPE analysis_actions ADD VALUE IF NOT EXISTS 'crawl';
      ALTER TYPE analysis_actions ADD VALUE IF NOT EXISTS 'batch';
    `);

    // Phase 1: Add core v2 columns to analyses table
    console.log('📝 Adding Firecrawl v2 columns to analyses table...');
    await db.execute(sql`
      ALTER TABLE analyses 
      ADD COLUMN IF NOT EXISTS firecrawl_version VARCHAR(20) DEFAULT 'v2',
      ADD COLUMN IF NOT EXISTS extraction_results JSONB,
      ADD COLUMN IF NOT EXISTS extraction_confidence NUMERIC(3,2),
      ADD COLUMN IF NOT EXISTS data_richness NUMERIC(3,2),
      ADD COLUMN IF NOT EXISTS extraction_prompts JSONB,
      ADD COLUMN IF NOT EXISTS batch_job_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS parent_analysis_id UUID REFERENCES analyses(id),
      ADD COLUMN IF NOT EXISTS is_batch_child BOOLEAN DEFAULT false,
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

    // Enhance websites table with page type enum
    console.log('📝 Enhancing websites table with page type enum...');
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE page_type_enum AS ENUM(
          'homepage', 'about', 'contact', 'pricing', 'blog-post', 'blog-category',
          'ecommerce-product', 'ecommerce-category', 'ecommerce-cart', 'ecommerce-checkout',
          'service-landing', 'service-detail', 'case-study', 'testimonials', 'portfolio',
          'landing-page', 'lead-magnet', 'thank-you', '404-error', 'legal', 'faq',
          'search-results', 'unknown'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Update websites table to use the enum
    await db.execute(sql`
      ALTER TABLE websites 
      ALTER COLUMN page_type TYPE page_type_enum 
      USING CASE 
        WHEN page_type IS NULL THEN 'unknown'::page_type_enum
        WHEN page_type = 'homepage' THEN 'homepage'::page_type_enum
        WHEN page_type = 'product' THEN 'ecommerce-product'::page_type_enum
        WHEN page_type = 'service' THEN 'service-landing'::page_type_enum
        WHEN page_type = 'landing' THEN 'landing-page'::page_type_enum
        ELSE 'unknown'::page_type_enum
      END;
    `);

    // Create essential indexes for performance
    console.log('📝 Creating performance indexes...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_analyses_firecrawl_version ON analyses(firecrawl_version);
      CREATE INDEX IF NOT EXISTS idx_analyses_extraction_confidence ON analyses(extraction_confidence);
      CREATE INDEX IF NOT EXISTS idx_analyses_data_richness ON analyses(data_richness);
      CREATE INDEX IF NOT EXISTS idx_analyses_batch_job ON analyses(batch_job_id) WHERE batch_job_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_analyses_crawl_job ON analyses(crawl_job_id) WHERE crawl_job_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_analyses_parent_analysis ON analyses(parent_analysis_id) WHERE parent_analysis_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_analyses_extraction_results ON analyses USING GIN(extraction_results);
      CREATE INDEX IF NOT EXISTS idx_analyses_token_usage ON analyses USING GIN(token_usage);
      CREATE INDEX IF NOT EXISTS idx_analyses_extraction_prompts ON analyses USING GIN(extraction_prompts);
      CREATE INDEX IF NOT EXISTS idx_websites_page_type ON websites(page_type);
    `);

    console.log('✅ Core Firecrawl v2 migration completed successfully');
    
  } catch (error) {
    console.error('❌ Core migration failed:', error);
    throw error;
  }
}

export async function down() {
  console.log('🔄 Rolling back Firecrawl v2 core migration...');
  
  try {
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

    // Revert websites table page_type to varchar
    await db.execute(sql`
      ALTER TABLE websites 
      ALTER COLUMN page_type TYPE VARCHAR(50) 
      USING page_type::text;
    `);

    // Drop the enum type
    await db.execute(sql`
      DROP TYPE IF EXISTS page_type_enum;
    `);

    // Drop created indexes
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_analyses_firecrawl_version;
      DROP INDEX IF EXISTS idx_analyses_extraction_confidence;
      DROP INDEX IF EXISTS idx_analyses_data_richness;
      DROP INDEX IF EXISTS idx_analyses_batch_job;
      DROP INDEX IF EXISTS idx_analyses_crawl_job;
      DROP INDEX IF EXISTS idx_analyses_parent_analysis;
      DROP INDEX IF EXISTS idx_analyses_extraction_results;
      DROP INDEX IF EXISTS idx_analyses_token_usage;
      DROP INDEX IF EXISTS idx_analyses_extraction_prompts;
      DROP INDEX IF EXISTS idx_websites_page_type;
    `);

    console.log('✅ Core migration rollback completed');
    
  } catch (error) {
    console.error('❌ Core migration rollback failed:', error);
    throw error;
  }
}

// Development helper function
export async function validateMigration() {
  console.log('🔍 Validating core migration...');
  
  try {
    // Check if new columns exist
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'analyses' 
      AND column_name IN (
        'firecrawl_version', 'extraction_results', 'extraction_confidence',
        'data_richness', 'batch_job_id', 'crawl_job_id'
      );
    `);
    
    console.log('✅ Found', result.rowCount, 'new columns in analyses table');
    
    // Check enum values
    const enumResult = await db.execute(sql`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = 'analysis_status'::regtype
      AND enumlabel IN ('extracting', 'analyzing');
    `);
    
    console.log('✅ Found', enumResult.rowCount, 'new enum values');
    return true;
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  }
}