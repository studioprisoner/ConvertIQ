// Migration Script 4: Performance and Indexing Optimization
// For development environment only - DO NOT RUN IN PRODUCTION
import { sql } from 'drizzle-orm';
import { db } from '../../connection';

export async function up() {
  console.log('🔄 Optimizing performance and indexes (Phase 4)...');

  try {
    // Phase 4: Drop existing indexes and recreate with conditional WHERE clauses
    console.log('📝 Optimizing conditional indexes for better performance...');

    // Drop and recreate batch job index with conditional WHERE
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_analyses_batch_job;
      CREATE INDEX idx_analyses_batch_job ON analyses(batch_job_id) 
      WHERE batch_job_id IS NOT NULL;
    `);

    // Drop and recreate crawl job index with conditional WHERE
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_analyses_crawl_job;
      CREATE INDEX idx_analyses_crawl_job ON analyses(crawl_job_id) 
      WHERE crawl_job_id IS NOT NULL;
    `);

    // Drop and recreate parent analysis index with conditional WHERE
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_analyses_parent_analysis;
      CREATE INDEX idx_analyses_parent_analysis ON analyses(parent_analysis_id) 
      WHERE parent_analysis_id IS NOT NULL;
    `);

    // Create additional performance indexes for common query patterns
    console.log('📝 Creating additional performance indexes...');
    
    await db.execute(sql`
      -- Composite indexes for common filtering patterns
      CREATE INDEX IF NOT EXISTS idx_analyses_status_version ON analyses(status, firecrawl_version);
      CREATE INDEX IF NOT EXISTS idx_analyses_website_status ON analyses(website_id, status);
      CREATE INDEX IF NOT EXISTS idx_analyses_website_created ON analyses(website_id, created_at);
      
      -- Indexes for extraction confidence and data richness filtering
      CREATE INDEX IF NOT EXISTS idx_analyses_confidence_range ON analyses(extraction_confidence) 
      WHERE extraction_confidence IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_analyses_richness_range ON analyses(data_richness) 
      WHERE data_richness IS NOT NULL;
      
      -- Indexes for batch and crawl processing filtering
      CREATE INDEX IF NOT EXISTS idx_analyses_batch_children ON analyses(parent_analysis_id, is_batch_child) 
      WHERE is_batch_child = true;
      CREATE INDEX IF NOT EXISTS idx_analyses_crawl_depth ON analyses(crawl_job_id, crawl_depth) 
      WHERE crawl_job_id IS NOT NULL;
      
      -- Performance metrics indexes
      CREATE INDEX IF NOT EXISTS idx_analyses_processing_time ON analyses(ai_processing_time) 
      WHERE ai_processing_time IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_analyses_load_time ON analyses(load_time) 
      WHERE load_time IS NOT NULL;
      
      -- Enhanced analytics composite indexes
      CREATE INDEX IF NOT EXISTS idx_analyses_enhanced_filtering ON analyses(
        extraction_data_used, 
        data_richness_score, 
        analysis_version
      ) WHERE extraction_data_used = true;
    `);

    // Create HNSW index for vector similarity searches (if pgvector is available)
    console.log('📝 Creating vector similarity index...');
    await db.execute(sql`
      -- Create HNSW index for optimal performance on Neon PostgreSQL
      CREATE INDEX IF NOT EXISTS idx_analyses_embedding_hnsw 
      ON analyses 
      USING hnsw (embedding vector_cosine_ops)
      WHERE embedding IS NOT NULL;
    `);

    // Optimize extraction tables indexes
    console.log('📝 Optimizing extraction table indexes...');
    await db.execute(sql`
      -- Add conditional indexes for extraction tables where relevant
      CREATE INDEX IF NOT EXISTS idx_extraction_metadata_confidence_high 
      ON extraction_metadata(confidence_score) 
      WHERE confidence_score >= 0.8;
      
      CREATE INDEX IF NOT EXISTS idx_business_info_complete 
      ON extracted_business_info(analysis_id) 
      WHERE business_name IS NOT NULL AND description IS NOT NULL;
      
      CREATE INDEX IF NOT EXISTS idx_products_with_pricing 
      ON extracted_products_services(analysis_id, item_type) 
      WHERE price_info IS NOT NULL;
      
      CREATE INDEX IF NOT EXISTS idx_primary_ctas 
      ON extracted_ctas(analysis_id, prominence) 
      WHERE prominence = 'primary';
      
      CREATE INDEX IF NOT EXISTS idx_high_credibility_social_proof 
      ON extracted_social_proof(analysis_id, credibility_score) 
      WHERE credibility_score >= 0.7;
      
      CREATE INDEX IF NOT EXISTS idx_effective_psychology_triggers 
      ON extracted_psychology_elements(analysis_id, effectiveness_score) 
      WHERE effectiveness_score >= 0.6;
      
      CREATE INDEX IF NOT EXISTS idx_quality_seo_elements 
      ON extracted_seo_elements(analysis_id, content_quality_score) 
      WHERE content_quality_score >= 0.7;
    `);

    // Create materialized views for complex reporting queries
    console.log('📝 Creating materialized views for performance...');
    await db.execute(sql`
      -- Materialized view for analysis summary statistics
      CREATE MATERIALIZED VIEW IF NOT EXISTS analysis_summary_stats AS
      SELECT 
        DATE_TRUNC('day', created_at) as analysis_date,
        firecrawl_version,
        status,
        COUNT(*) as total_analyses,
        AVG(extraction_confidence) as avg_extraction_confidence,
        AVG(data_richness) as avg_data_richness,
        AVG(ai_processing_time) as avg_processing_time,
        COUNT(*) FILTER (WHERE extraction_data_used = true) as enhanced_analyses_count,
        AVG(data_richness_score) FILTER (WHERE extraction_data_used = true) as avg_richness_score
      FROM analyses
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at), firecrawl_version, status;

      -- Create index on the materialized view
      CREATE INDEX IF NOT EXISTS idx_analysis_summary_stats_date 
      ON analysis_summary_stats(analysis_date, firecrawl_version);
    `);

    // Add database maintenance recommendations
    console.log('📝 Setting up maintenance recommendations...');
    await db.execute(sql`
      -- Create a function to refresh materialized views (for scheduled maintenance)
      CREATE OR REPLACE FUNCTION refresh_analysis_stats() 
      RETURNS void 
      LANGUAGE plpgsql 
      AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW analysis_summary_stats;
      END;
      $$;

      -- Create a function to analyze table statistics (for query optimization)
      CREATE OR REPLACE FUNCTION update_analysis_statistics() 
      RETURNS void 
      LANGUAGE plpgsql 
      AS $$
      BEGIN
        ANALYZE analyses;
        ANALYZE extraction_metadata;
        ANALYZE extracted_business_info;
        ANALYZE extracted_products_services;
        ANALYZE extracted_ctas;
        ANALYZE extracted_social_proof;
        ANALYZE extracted_psychology_elements;
        ANALYZE extracted_seo_elements;
        ANALYZE analysis_quality_metrics;
      END;
      $$;
    `);

    console.log('✅ Performance optimization completed successfully');
    
  } catch (error) {
    console.error('❌ Performance optimization failed:', error);
    throw error;
  }
}

export async function down() {
  console.log('🔄 Rolling back performance optimization...');
  
  try {
    // Drop materialized views and functions
    await db.execute(sql`
      DROP FUNCTION IF EXISTS refresh_analysis_stats();
      DROP FUNCTION IF EXISTS update_analysis_statistics();
      DROP MATERIALIZED VIEW IF EXISTS analysis_summary_stats;
    `);

    // Drop all optimization indexes
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_analyses_batch_job;
      DROP INDEX IF EXISTS idx_analyses_crawl_job;
      DROP INDEX IF EXISTS idx_analyses_parent_analysis;
      DROP INDEX IF EXISTS idx_analyses_status_version;
      DROP INDEX IF EXISTS idx_analyses_website_status;
      DROP INDEX IF EXISTS idx_analyses_website_created;
      DROP INDEX IF EXISTS idx_analyses_confidence_range;
      DROP INDEX IF EXISTS idx_analyses_richness_range;
      DROP INDEX IF EXISTS idx_analyses_batch_children;
      DROP INDEX IF EXISTS idx_analyses_crawl_depth;
      DROP INDEX IF EXISTS idx_analyses_processing_time;
      DROP INDEX IF EXISTS idx_analyses_load_time;
      DROP INDEX IF EXISTS idx_analyses_enhanced_filtering;
      DROP INDEX IF EXISTS idx_analyses_embedding_hnsw;
      DROP INDEX IF EXISTS idx_extraction_metadata_confidence_high;
      DROP INDEX IF EXISTS idx_business_info_complete;
      DROP INDEX IF EXISTS idx_products_with_pricing;
      DROP INDEX IF EXISTS idx_primary_ctas;
      DROP INDEX IF EXISTS idx_high_credibility_social_proof;
      DROP INDEX IF EXISTS idx_effective_psychology_triggers;
      DROP INDEX IF EXISTS idx_quality_seo_elements;
    `);

    // Recreate basic indexes without WHERE clauses
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_analyses_batch_job ON analyses(batch_job_id);
      CREATE INDEX IF NOT EXISTS idx_analyses_crawl_job ON analyses(crawl_job_id);
      CREATE INDEX IF NOT EXISTS idx_analyses_parent_analysis ON analyses(parent_analysis_id);
    `);

    console.log('✅ Performance optimization rollback completed');
    
  } catch (error) {
    console.error('❌ Performance optimization rollback failed:', error);
    throw error;
  }
}

// Development helper function
export async function validateMigration() {
  console.log('🔍 Validating performance optimization...');
  
  try {
    // Check conditional indexes
    const conditionalIndexes = await db.execute(sql`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE indexdef LIKE '%WHERE%'
      AND indexname LIKE 'idx_analyses_%';
    `);
    
    console.log('✅ Found', conditionalIndexes.rowCount, 'conditional indexes');

    // Check materialized view
    const matViewResult = await db.execute(sql`
      SELECT matviewname 
      FROM pg_matviews 
      WHERE matviewname = 'analysis_summary_stats';
    `);
    
    console.log('✅ Materialized view exists:', matViewResult.rowCount > 0);

    // Check maintenance functions
    const functionsResult = await db.execute(sql`
      SELECT proname 
      FROM pg_proc 
      WHERE proname IN ('refresh_analysis_stats', 'update_analysis_statistics');
    `);
    
    console.log('✅ Found', functionsResult.rowCount, 'maintenance functions');

    return true;
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  }
}