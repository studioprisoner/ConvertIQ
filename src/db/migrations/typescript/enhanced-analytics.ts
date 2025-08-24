// Migration Script 3: Enhanced Analytics Support
// For development environment only - DO NOT RUN IN PRODUCTION
import { sql } from 'drizzle-orm';
import { db } from '../../connection';

export async function up() {
  console.log('🔄 Adding enhanced analytics support (Phase 3)...');

  try {
    // Phase 3: Create analysis quality metrics table
    console.log('📝 Creating analysis quality metrics table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS analysis_quality_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
        recommendation_specificity NUMERIC(3,2),
        data_coverage NUMERIC(3,2),
        accuracy_confidence NUMERIC(3,2),
        improvement_over_basic JSONB,
        processing_time INTEGER,
        token_efficiency NUMERIC(5,2),
        completeness_score NUMERIC(3,2),
        actionability_score NUMERIC(3,2),
        business_impact_potential NUMERIC(3,2),
        implementation_difficulty NUMERIC(3,2),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add enhanced analytics columns to analyses table
    console.log('📝 Adding enhanced analytics columns to analyses table...');
    await db.execute(sql`
      ALTER TABLE analyses 
      ADD COLUMN IF NOT EXISTS extraction_data_used BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS data_richness_score NUMERIC(3,2),
      ADD COLUMN IF NOT EXISTS analysis_version VARCHAR(50) DEFAULT '2.0.0';
    `);

    // Create indexes for the new analytics tables and columns
    console.log('📝 Creating analytics indexes...');
    await db.execute(sql`
      -- Analysis quality metrics indexes
      CREATE INDEX IF NOT EXISTS idx_quality_metrics_analysis ON analysis_quality_metrics(analysis_id);
      CREATE INDEX IF NOT EXISTS idx_quality_metrics_coverage ON analysis_quality_metrics(data_coverage);
      CREATE INDEX IF NOT EXISTS idx_quality_metrics_confidence ON analysis_quality_metrics(accuracy_confidence);
      CREATE INDEX IF NOT EXISTS idx_quality_metrics_specificity ON analysis_quality_metrics(recommendation_specificity);
      CREATE INDEX IF NOT EXISTS idx_quality_metrics_completeness ON analysis_quality_metrics(completeness_score);
      CREATE INDEX IF NOT EXISTS idx_quality_metrics_actionability ON analysis_quality_metrics(actionability_score);
      CREATE INDEX IF NOT EXISTS idx_quality_metrics_impact ON analysis_quality_metrics(business_impact_potential);
      CREATE INDEX IF NOT EXISTS idx_quality_metrics_difficulty ON analysis_quality_metrics(implementation_difficulty);

      -- Enhanced analytics indexes for analyses table
      CREATE INDEX IF NOT EXISTS idx_analyses_extraction_enhanced ON analyses(extraction_data_used);
      CREATE INDEX IF NOT EXISTS idx_analyses_data_richness_score ON analyses(data_richness_score);
      CREATE INDEX IF NOT EXISTS idx_analyses_version ON analyses(analysis_version);

      -- Composite indexes for common analytics queries
      CREATE INDEX IF NOT EXISTS idx_analyses_enhanced_composite ON analyses(extraction_data_used, data_richness_score, analysis_version);
      CREATE INDEX IF NOT EXISTS idx_quality_metrics_scores_composite ON analysis_quality_metrics(data_coverage, accuracy_confidence, completeness_score);
    `);

    // Create views for analytics reporting
    console.log('📝 Creating analytics views...');
    await db.execute(sql`
      -- View for comprehensive analysis quality overview
      CREATE OR REPLACE VIEW analysis_quality_overview AS
      SELECT 
        a.id as analysis_id,
        a.website_id,
        a.status,
        a.firecrawl_version,
        a.extraction_data_used,
        a.data_richness_score,
        a.analysis_version,
        aqm.recommendation_specificity,
        aqm.data_coverage,
        aqm.accuracy_confidence,
        aqm.completeness_score,
        aqm.actionability_score,
        aqm.business_impact_potential,
        aqm.implementation_difficulty,
        aqm.processing_time,
        aqm.token_efficiency,
        a.created_at as analysis_created_at,
        aqm.created_at as metrics_created_at
      FROM analyses a
      LEFT JOIN analysis_quality_metrics aqm ON a.id = aqm.analysis_id
      WHERE a.status = 'completed';

      -- View for extraction performance metrics
      CREATE OR REPLACE VIEW extraction_performance_metrics AS
      SELECT 
        a.id as analysis_id,
        a.website_id,
        a.extraction_confidence,
        a.data_richness,
        a.data_richness_score,
        a.extraction_data_used,
        a.ai_processing_time,
        a.token_usage,
        em.extraction_type,
        em.confidence_score as extraction_type_confidence,
        em.processing_time as extraction_type_time,
        em.tokens_used as extraction_type_tokens,
        em.cost_usd as extraction_type_cost
      FROM analyses a
      LEFT JOIN extraction_metadata em ON a.id = em.analysis_id
      WHERE a.firecrawl_version = 'v2';
    `);

    console.log('✅ Enhanced analytics migration completed successfully');
    
  } catch (error) {
    console.error('❌ Enhanced analytics migration failed:', error);
    throw error;
  }
}

export async function down() {
  console.log('🔄 Rolling back enhanced analytics migration...');
  
  try {
    // Drop views first
    await db.execute(sql`
      DROP VIEW IF EXISTS extraction_performance_metrics;
      DROP VIEW IF EXISTS analysis_quality_overview;
    `);

    // Drop analytics table
    await db.execute(sql`
      DROP TABLE IF EXISTS analysis_quality_metrics;
    `);

    // Remove enhanced analytics columns from analyses table
    await db.execute(sql`
      ALTER TABLE analyses 
      DROP COLUMN IF EXISTS extraction_data_used,
      DROP COLUMN IF EXISTS data_richness_score,
      DROP COLUMN IF EXISTS analysis_version;
    `);

    // Drop created indexes
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_quality_metrics_analysis;
      DROP INDEX IF EXISTS idx_quality_metrics_coverage;
      DROP INDEX IF EXISTS idx_quality_metrics_confidence;
      DROP INDEX IF EXISTS idx_quality_metrics_specificity;
      DROP INDEX IF EXISTS idx_quality_metrics_completeness;
      DROP INDEX IF EXISTS idx_quality_metrics_actionability;
      DROP INDEX IF EXISTS idx_quality_metrics_impact;
      DROP INDEX IF EXISTS idx_quality_metrics_difficulty;
      DROP INDEX IF EXISTS idx_analyses_extraction_enhanced;
      DROP INDEX IF EXISTS idx_analyses_data_richness_score;
      DROP INDEX IF EXISTS idx_analyses_version;
      DROP INDEX IF EXISTS idx_analyses_enhanced_composite;
      DROP INDEX IF EXISTS idx_quality_metrics_scores_composite;
    `);

    console.log('✅ Enhanced analytics rollback completed');
    
  } catch (error) {
    console.error('❌ Enhanced analytics rollback failed:', error);
    throw error;
  }
}

// Development helper function
export async function validateMigration() {
  console.log('🔍 Validating enhanced analytics migration...');
  
  try {
    // Check if analysis quality metrics table exists
    const tableResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'analysis_quality_metrics'
      AND table_schema = 'public';
    `);
    
    console.log('✅ Analysis quality metrics table exists:', tableResult.rowCount > 0);

    // Check if new columns exist in analyses table
    const columnResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'analyses' 
      AND column_name IN (
        'extraction_data_used', 'data_richness_score', 'analysis_version'
      );
    `);
    
    console.log('✅ Found', columnResult.rowCount, 'new analytics columns in analyses table');

    // Check if views exist
    const viewResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_name IN ('analysis_quality_overview', 'extraction_performance_metrics')
      AND table_schema = 'public';
    `);
    
    console.log('✅ Found', viewResult.rowCount, 'analytics views');

    return true;
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  }
}