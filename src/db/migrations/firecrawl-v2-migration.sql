-- Firecrawl v2 Migration Script
-- This script adds the necessary columns and indexes for Firecrawl v2 capabilities
-- Run this migration to support enhanced extraction, batch processing, and crawling features

-- Add new columns for v2 capabilities to analyses table
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS extraction_results JSONB;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS firecrawl_version VARCHAR(20) DEFAULT 'v2';
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS extraction_prompts JSONB;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS batch_job_id VARCHAR(255);
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS crawl_job_id VARCHAR(255);

-- Add indexes for better query performance on new v2 fields
CREATE INDEX IF NOT EXISTS analyses_firecrawl_version_idx ON analyses(firecrawl_version);
CREATE INDEX IF NOT EXISTS analyses_extraction_results_gin_idx ON analyses USING GIN(extraction_results);
CREATE INDEX IF NOT EXISTS analyses_batch_job_id_idx ON analyses(batch_job_id);
CREATE INDEX IF NOT EXISTS analyses_crawl_job_id_idx ON analyses(crawl_job_id);

-- Add comments for documentation
COMMENT ON COLUMN analyses.extraction_results IS 'Structured data extracted using Firecrawl v2 extract feature - stores business info, products, CTAs, social proof, etc.';
COMMENT ON COLUMN analyses.firecrawl_version IS 'Version of Firecrawl API used for processing (v1/v2) - defaults to v2 for new analyses';
COMMENT ON COLUMN analyses.extraction_prompts IS 'Array of prompts used for structured data extraction';
COMMENT ON COLUMN analyses.batch_job_id IS 'Reference ID for batch processing jobs when multiple URLs are processed together';
COMMENT ON COLUMN analyses.crawl_job_id IS 'Reference ID for website crawling jobs when full site analysis is performed';

-- Update existing analyses to use v2 by default for future processing
UPDATE analyses 
SET firecrawl_version = 'v2' 
WHERE firecrawl_version IS NULL;

-- Create partial indexes for common queries
CREATE INDEX IF NOT EXISTS analyses_v2_with_extraction_idx 
ON analyses(created_at DESC) 
WHERE firecrawl_version = 'v2' AND extraction_results IS NOT NULL;

CREATE INDEX IF NOT EXISTS analyses_pending_v2_idx 
ON analyses(created_at DESC) 
WHERE status = 'pending' AND firecrawl_version = 'v2';

-- Verify the migration
DO $$
BEGIN
    -- Check if all columns were created successfully
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analyses' AND column_name = 'extraction_results'
    ) THEN
        RAISE EXCEPTION 'Migration failed: extraction_results column not created';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analyses' AND column_name = 'firecrawl_version'
    ) THEN
        RAISE EXCEPTION 'Migration failed: firecrawl_version column not created';
    END IF;
    
    RAISE NOTICE 'Firecrawl v2 migration completed successfully!';
    RAISE NOTICE 'Added columns: extraction_results, firecrawl_version, extraction_prompts, batch_job_id, crawl_job_id';
    RAISE NOTICE 'Added indexes: GIN index on extraction_results, B-tree indexes on job IDs and version';
END
$$;