// Migration Script 2: Data Migration for Existing Records
// For development environment only - DO NOT RUN IN PRODUCTION
import { sql } from 'drizzle-orm';
import { db } from '../../connection';

export async function up() {
  console.log('🔄 Migrating existing data to v2 format (Migration Script 2)...');

  try {
    // Step 1: Set firecrawl_version to 'v1' for existing analyses
    console.log('📝 Updating existing analyses to mark as v1...');
    const updateExistingResult = await db.execute(sql`
      UPDATE analyses 
      SET 
        firecrawl_version = 'v1', 
        extraction_version = '0.0.0',
        analysis_version = '1.0.0'
      WHERE firecrawl_version IS NULL OR firecrawl_version = 'v2';
    `);
    console.log(`✅ Updated ${updateExistingResult.rowCount || 0} existing analyses to v1`);

    // Step 2: Attempt to infer page types from existing website data
    console.log('📝 Inferring page types from existing website URLs...');
    const inferPageTypesResult = await db.execute(sql`
      UPDATE websites 
      SET page_type = CASE 
        WHEN url ILIKE '%/product/%' OR url ILIKE '%/products/%' THEN 'ecommerce-product'::page_type_enum
        WHEN url ILIKE '%/service/%' OR url ILIKE '%/services/%' THEN 'service-landing'::page_type_enum
        WHEN url ILIKE '%/blog/%' OR url ILIKE '%/post/%' THEN 'blog-post'::page_type_enum
        WHEN url ILIKE '%/about%' THEN 'about'::page_type_enum
        WHEN url ILIKE '%/contact%' THEN 'contact'::page_type_enum
        WHEN url ILIKE '%/pricing%' THEN 'pricing'::page_type_enum
        WHEN url ILIKE '%/portfolio%' THEN 'portfolio'::page_type_enum
        WHEN url ILIKE '%/testimonial%' OR url ILIKE '%/review%' THEN 'testimonials'::page_type_enum
        WHEN url ILIKE '%/case-study%' OR url ILIKE '%/case_study%' THEN 'case-study'::page_type_enum
        WHEN url ILIKE '%/landing%' THEN 'landing-page'::page_type_enum
        WHEN url ILIKE '%/thank%' OR url ILIKE '%/success%' THEN 'thank-you'::page_type_enum
        WHEN url ILIKE '%/faq%' THEN 'faq'::page_type_enum
        WHEN url ILIKE '%/legal%' OR url ILIKE '%/terms%' OR url ILIKE '%/privacy%' THEN 'legal'::page_type_enum
        WHEN url ILIKE '%/search%' THEN 'search-results'::page_type_enum
        WHEN url ILIKE '%/404%' OR url ILIKE '%/error%' THEN '404-error'::page_type_enum
        WHEN url ~ '.*/$' OR url NOT LIKE '%/%' THEN 'homepage'::page_type_enum
        ELSE 'unknown'::page_type_enum
      END
      WHERE page_type IS NULL OR page_type = 'unknown'::page_type_enum;
    `);
    console.log(`✅ Inferred page types for ${inferPageTypesResult.rowCount || 0} websites`);

    // Step 3: Initialize default values for new columns in existing analyses
    console.log('📝 Initializing default values for new columns...');
    await db.execute(sql`
      UPDATE analyses 
      SET 
        extraction_data_used = false,
        data_richness_score = NULL,
        is_batch_child = false
      WHERE extraction_data_used IS NULL;
    `);

    // Step 4: Create sample extraction metadata for existing completed analyses (for testing purposes)
    console.log('📝 Creating sample extraction metadata for existing completed analyses...');
    const sampleMetadataResult = await db.execute(sql`
      INSERT INTO extraction_metadata (analysis_id, extraction_type, confidence_score, processing_time, schema_version)
      SELECT 
        a.id,
        'legacy_migration',
        0.5, -- Medium confidence for migrated data
        1000, -- Assume 1 second processing time
        '0.0.0'
      FROM analyses a
      WHERE a.status = 'completed'
        AND a.firecrawl_version = 'v1'
        AND NOT EXISTS (
          SELECT 1 FROM extraction_metadata em 
          WHERE em.analysis_id = a.id
        )
      LIMIT 100; -- Limit to avoid overwhelming the system
    `);
    console.log(`✅ Created sample metadata for ${sampleMetadataResult.rowCount || 0} existing analyses`);

    // Step 5: Migrate any existing AI analysis data to structured format (basic migration)
    console.log('📝 Basic migration of existing AI analysis data...');
    await db.execute(sql`
      UPDATE analyses 
      SET extraction_results = jsonb_build_object(
        'migrated_from', 'v1_analysis',
        'original_analysis', CASE 
          WHEN ai_analysis IS NOT NULL THEN left(ai_analysis, 1000)
          ELSE 'No analysis data available'
        END,
        'migration_timestamp', NOW()
      )
      WHERE firecrawl_version = 'v1' 
        AND ai_analysis IS NOT NULL 
        AND extraction_results IS NULL;
    `);

    // Step 6: Update token usage for existing analyses with estimation
    console.log('📝 Estimating token usage for existing analyses...');
    await db.execute(sql`
      UPDATE analyses 
      SET token_usage = jsonb_build_object(
        'estimated', true,
        'totalTokens', CASE 
          WHEN ai_analysis IS NOT NULL THEN length(ai_analysis) / 4 -- Rough token estimation
          ELSE 100
        END,
        'promptTokens', 50,
        'completionTokens', CASE 
          WHEN ai_analysis IS NOT NULL THEN length(ai_analysis) / 4 - 50
          ELSE 50
        END
      )
      WHERE firecrawl_version = 'v1' 
        AND token_usage IS NULL;
    `);

    // Step 7: Set reasonable defaults for processing metrics
    console.log('📝 Setting default processing metrics...');
    await db.execute(sql`
      UPDATE analyses 
      SET 
        ai_processing_time = CASE 
          WHEN ai_analysis IS NOT NULL THEN 2000 + (length(ai_analysis) / 10) -- Estimate based on analysis length
          ELSE 1000
        END,
        load_time = 3000, -- Default 3 second load time
        page_size = 50000, -- Default 50KB page size
        resource_count = 25 -- Default 25 resources
      WHERE firecrawl_version = 'v1' 
        AND ai_processing_time IS NULL;
    `);

    // Step 8: Create analysis quality metrics for existing completed analyses
    console.log('📝 Creating quality metrics for existing analyses...');
    const qualityMetricsResult = await db.execute(sql`
      INSERT INTO analysis_quality_metrics (
        analysis_id, 
        recommendation_specificity, 
        data_coverage, 
        accuracy_confidence,
        processing_time,
        token_efficiency
      )
      SELECT 
        a.id,
        0.6, -- Medium specificity for legacy analyses
        0.7, -- Good data coverage assumed
        0.5, -- Medium confidence for migrated data
        COALESCE(a.ai_processing_time, 1000),
        CASE 
          WHEN (a.token_usage->>'totalTokens')::integer > 0 
          THEN 3.0 -- Rough efficiency estimate
          ELSE 2.0
        END
      FROM analyses a
      WHERE a.status = 'completed'
        AND a.firecrawl_version = 'v1'
        AND NOT EXISTS (
          SELECT 1 FROM analysis_quality_metrics aqm 
          WHERE aqm.analysis_id = a.id
        )
      LIMIT 100; -- Limit to avoid overwhelming the system
    `);
    console.log(`✅ Created quality metrics for ${qualityMetricsResult.rowCount || 0} existing analyses`);

    console.log('✅ Existing data migration completed successfully');
    
  } catch (error) {
    console.error('❌ Data migration failed:', error);
    throw error;
  }
}

export async function down() {
  console.log('🔄 Rolling back data migration...');
  
  try {
    // Remove migrated extraction metadata
    await db.execute(sql`
      DELETE FROM extraction_metadata 
      WHERE extraction_type = 'legacy_migration';
    `);

    // Remove migrated quality metrics
    await db.execute(sql`
      DELETE FROM analysis_quality_metrics 
      WHERE analysis_id IN (
        SELECT id FROM analyses WHERE firecrawl_version = 'v1'
      );
    `);

    // Reset analyses columns to NULL
    await db.execute(sql`
      UPDATE analyses 
      SET 
        firecrawl_version = NULL,
        extraction_version = NULL,
        analysis_version = NULL,
        extraction_data_used = NULL,
        data_richness_score = NULL,
        extraction_results = NULL,
        token_usage = NULL,
        ai_processing_time = NULL,
        load_time = NULL,
        page_size = NULL,
        resource_count = NULL
      WHERE firecrawl_version = 'v1';
    `);

    // Reset websites page_type to NULL where we inferred them
    await db.execute(sql`
      UPDATE websites 
      SET page_type = NULL
      WHERE page_type != 'unknown'::page_type_enum;
    `);

    console.log('✅ Data migration rollback completed');
    
  } catch (error) {
    console.error('❌ Data migration rollback failed:', error);
    throw error;
  }
}

// Development helper function
export async function validateMigration() {
  console.log('🔍 Validating data migration...');
  
  try {
    // Check migrated analyses
    const migratedAnalyses = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM analyses 
      WHERE firecrawl_version = 'v1';
    `);
    console.log('✅ Found', migratedAnalyses.rows[0]?.count || 0, 'v1 analyses');

    // Check page type distribution
    const pageTypes = await db.execute(sql`
      SELECT page_type, COUNT(*) as count
      FROM websites
      WHERE page_type IS NOT NULL
      GROUP BY page_type
      ORDER BY count DESC;
    `);
    console.log('✅ Page type distribution:');
    pageTypes.rows.forEach(row => {
      console.log(`  - ${row.page_type}: ${row.count}`);
    });

    // Check extraction metadata (only if table exists)
    try {
      const extractionMeta = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM extraction_metadata 
        WHERE extraction_type = 'legacy_migration';
      `);
      console.log('✅ Found', extractionMeta.rows[0]?.count || 0, 'legacy extraction metadata records');
    } catch (error) {
      console.log('⚪ Extraction metadata table does not exist yet - this is expected before running extraction tables migration');
    }

    // Check quality metrics (only if table exists)
    try {
      const qualityMeta = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM analysis_quality_metrics
        WHERE analysis_id IN (
          SELECT id FROM analyses WHERE firecrawl_version = 'v1'
        );
      `);
      console.log('✅ Found', qualityMeta.rows[0]?.count || 0, 'quality metrics for v1 analyses');
    } catch (error) {
      console.log('⚪ Analysis quality metrics table does not exist yet - this is expected before running enhanced analytics migration');
    }

    // Check token usage statistics (only if columns exist)
    try {
      const tokenStats = await db.execute(sql`
        SELECT 
          AVG((token_usage->>'totalTokens')::integer) as avg_tokens,
          COUNT(*) as analyses_with_tokens
        FROM analyses 
        WHERE token_usage IS NOT NULL 
          AND firecrawl_version = 'v1';
      `);
      console.log('✅ Token statistics:', tokenStats.rows[0]);
    } catch (error) {
      console.log('⚪ Token usage column does not exist yet - this is expected before running core migration');
    }

    return true;
    
  } catch (error) {
    console.error('❌ Data migration validation failed:', error);
    return false;
  }
}

// Helper function to get migration summary
export async function getMigrationSummary() {
  console.log('📊 Migration Summary:');
  
  try {
    const summary = await db.execute(sql`
      SELECT 
        COUNT(*) as total_analyses,
        COUNT(*) FILTER (WHERE firecrawl_version = 'v1') as v1_analyses,
        COUNT(*) FILTER (WHERE firecrawl_version = 'v2') as v2_analyses,
        COUNT(*) FILTER (WHERE firecrawl_version IS NULL) as unmigrated_analyses
      FROM analyses;
    `);
    
    const websiteSummary = await db.execute(sql`
      SELECT 
        COUNT(*) as total_websites,
        COUNT(*) FILTER (WHERE page_type IS NOT NULL) as websites_with_page_type,
        COUNT(*) FILTER (WHERE page_type = 'unknown') as unknown_page_types
      FROM websites;
    `);

    console.table(summary.rows[0]);
    console.table(websiteSummary.rows[0]);
    
  } catch (error) {
    console.error('Failed to generate migration summary:', error);
  }
}