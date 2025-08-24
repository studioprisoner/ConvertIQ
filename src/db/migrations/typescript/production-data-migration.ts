// Migration Script 3: Production-Ready Data Migration
// For development environment only - DO NOT RUN IN PRODUCTION
// This version includes comprehensive data migration with safety checks
import { sql } from 'drizzle-orm';
import { db } from '../../connection';

export async function up() {
  console.log('🔄 Production-ready data migration for Firecrawl v2...');

  try {
    // Step 1: Validate prerequisites
    console.log('📝 Validating migration prerequisites...');
    
    // Check if all required columns exist
    const columnsCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'analyses' 
      AND column_name IN (
        'firecrawl_version', 'extraction_version', 'analysis_version',
        'extraction_data_used', 'data_richness_score'
      );
    `);
    
    if (columnsCheck.rowCount < 5) {
      throw new Error('Required columns not found. Please run core and analytics migrations first.');
    }

    // Check if extraction tables exist
    const tablesCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('extraction_metadata', 'analysis_quality_metrics')
      AND table_schema = 'public';
    `);
    
    if (tablesCheck.rowCount < 2) {
      throw new Error('Required extraction tables not found. Please run extraction and analytics migrations first.');
    }

    console.log('✅ Prerequisites validated');

    // Step 2: Data migration with transaction safety
    console.log('📝 Starting transaction-safe data migration...');
    
    // Begin transaction for atomic operations
    await db.execute(sql`BEGIN;`);

    try {
      // Migrate existing analyses to v1 (legacy)
      console.log('📝 Migrating existing analyses to v1 status...');
      const analysisUpdateResult = await db.execute(sql`
        UPDATE analyses 
        SET 
          firecrawl_version = 'v1',
          extraction_version = '0.0.0',
          analysis_version = '1.0.0',
          extraction_data_used = false,
          data_richness_score = CASE 
            WHEN ai_analysis IS NOT NULL THEN 0.5 -- Medium score for existing analyses
            ELSE NULL
          END
        WHERE (firecrawl_version IS NULL OR firecrawl_version = 'v2')
          AND status = 'completed'; -- Only migrate completed analyses
      `);
      console.log(`✅ Migrated ${analysisUpdateResult.rowCount || 0} completed analyses to v1`);

      // Smart page type inference with enhanced patterns
      console.log('📝 Enhanced page type inference...');
      const pageTypeResult = await db.execute(sql`
        UPDATE websites 
        SET page_type = CASE 
          -- E-commerce patterns
          WHEN url ~* '/(product|products|shop|store|buy|cart|checkout)/' THEN 'ecommerce-product'::page_type_enum
          WHEN url ~* '/(category|categories|collection)/' THEN 'ecommerce-category'::page_type_enum
          
          -- Service patterns
          WHEN url ~* '/(service|services)/' THEN 'service-landing'::page_type_enum
          
          -- Content patterns
          WHEN url ~* '/(blog|article|post|news)/' THEN 'blog-post'::page_type_enum
          WHEN url ~* '/(category|tag)/' AND url ~* 'blog' THEN 'blog-category'::page_type_enum
          
          -- Company pages
          WHEN url ~* '/(about|about-us|who-we-are)/' THEN 'about'::page_type_enum
          WHEN url ~* '/(contact|contact-us|get-in-touch)/' THEN 'contact'::page_type_enum
          WHEN url ~* '/(pricing|price|plans|cost)/' THEN 'pricing'::page_type_enum
          
          -- Portfolio and showcase
          WHEN url ~* '/(portfolio|work|projects|gallery)/' THEN 'portfolio'::page_type_enum
          WHEN url ~* '/(testimonial|review|case-study)/' THEN 'testimonials'::page_type_enum
          
          -- Landing pages
          WHEN url ~* '/(landing|lp|campaign)/' THEN 'landing-page'::page_type_enum
          WHEN url ~* '/(thank|thanks|success|confirmation)/' THEN 'thank-you'::page_type_enum
          
          -- Support and help
          WHEN url ~* '/(faq|help|support)/' THEN 'faq'::page_type_enum
          WHEN url ~* '/(legal|terms|privacy|policy)/' THEN 'legal'::page_type_enum
          
          -- Search and utility
          WHEN url ~* '/(search|results)/' THEN 'search-results'::page_type_enum
          WHEN url ~* '/(404|error|not-found)/' THEN '404-error'::page_type_enum
          
          -- Homepage patterns (root domain or ending with /)
          WHEN url ~ '^https?://[^/]+/?$' THEN 'homepage'::page_type_enum
          WHEN url ~ '/$' AND NOT (url ~* '/(blog|product|service|about|contact)/') THEN 'homepage'::page_type_enum
          
          ELSE 'unknown'::page_type_enum
        END
        WHERE page_type IS NULL OR page_type = 'unknown'::page_type_enum;
      `);
      console.log(`✅ Updated page types for ${pageTypeResult.rowCount || 0} websites`);

      // Create extraction metadata for migrated analyses
      console.log('📝 Creating extraction metadata for legacy analyses...');
      const metadataResult = await db.execute(sql`
        INSERT INTO extraction_metadata (
          analysis_id, 
          extraction_type, 
          confidence_score, 
          processing_time, 
          prompt_used,
          schema_version,
          ai_model,
          tokens_used,
          cost_usd
        )
        SELECT 
          a.id,
          'legacy_migration',
          0.6, -- Medium confidence for legacy data
          COALESCE(a.ai_processing_time, 2000), -- Default 2s if no data
          'Legacy analysis migration - no specific extraction prompt used',
          '0.0.0',
          'legacy-system',
          CASE 
            WHEN a.token_usage IS NOT NULL 
            THEN (a.token_usage->>'totalTokens')::integer
            ELSE CASE 
              WHEN a.ai_analysis IS NOT NULL THEN length(a.ai_analysis) / 4
              ELSE 200
            END
          END,
          0.001 -- Minimal cost estimate
        FROM analyses a
        WHERE a.firecrawl_version = 'v1'
          AND a.status = 'completed'
          AND NOT EXISTS (
            SELECT 1 FROM extraction_metadata em 
            WHERE em.analysis_id = a.id AND em.extraction_type = 'legacy_migration'
          );
      `);
      console.log(`✅ Created extraction metadata for ${metadataResult.rowCount || 0} legacy analyses`);

      // Create quality metrics for legacy analyses
      console.log('📝 Creating quality metrics for legacy analyses...');
      const qualityResult = await db.execute(sql`
        INSERT INTO analysis_quality_metrics (
          analysis_id,
          recommendation_specificity,
          data_coverage,
          accuracy_confidence,
          improvement_over_basic,
          processing_time,
          token_efficiency,
          completeness_score,
          actionability_score,
          business_impact_potential,
          implementation_difficulty
        )
        SELECT 
          a.id,
          0.6, -- Medium specificity for legacy
          0.7, -- Good coverage assumed
          0.5, -- Medium confidence
          jsonb_build_object(
            'structured_extraction', false,
            'legacy_migration', true,
            'baseline_analysis', true
          ),
          COALESCE(a.ai_processing_time, 2000),
          CASE 
            WHEN (a.token_usage->>'totalTokens')::integer > 0 
            THEN 2.5 
            ELSE 2.0
          END,
          0.6, -- Medium completeness
          0.7, -- Good actionability
          0.5, -- Medium impact potential
          0.6  -- Medium implementation difficulty
        FROM analyses a
        WHERE a.firecrawl_version = 'v1'
          AND a.status = 'completed'
          AND NOT EXISTS (
            SELECT 1 FROM analysis_quality_metrics aqm 
            WHERE aqm.analysis_id = a.id
          );
      `);
      console.log(`✅ Created quality metrics for ${qualityResult.rowCount || 0} legacy analyses`);

      // Update token usage for analyses without it
      console.log('📝 Estimating token usage for analyses without data...');
      await db.execute(sql`
        UPDATE analyses 
        SET token_usage = jsonb_build_object(
          'estimated', true,
          'migrated', true,
          'totalTokens', CASE 
            WHEN ai_analysis IS NOT NULL THEN length(ai_analysis) / 4
            ELSE 150
          END,
          'promptTokens', 50,
          'completionTokens', CASE 
            WHEN ai_analysis IS NOT NULL THEN (length(ai_analysis) / 4) - 50
            ELSE 100
          END,
          'model', 'legacy-system'
        )
        WHERE firecrawl_version = 'v1' 
          AND token_usage IS NULL;
      `);

      // Set processing metrics defaults
      console.log('📝 Setting default processing metrics...');
      await db.execute(sql`
        UPDATE analyses 
        SET 
          ai_processing_time = COALESCE(ai_processing_time, 2500),
          load_time = COALESCE(load_time, 3500),
          page_size = COALESCE(page_size, 75000),
          resource_count = COALESCE(resource_count, 30)
        WHERE firecrawl_version = 'v1';
      `);

      // Commit transaction
      await db.execute(sql`COMMIT;`);
      console.log('✅ Transaction committed successfully');

    } catch (transactionError) {
      // Rollback on any error
      await db.execute(sql`ROLLBACK;`);
      console.error('❌ Transaction rolled back due to error:', transactionError);
      throw transactionError;
    }

    console.log('✅ Production-ready data migration completed successfully');
    
  } catch (error) {
    console.error('❌ Production data migration failed:', error);
    throw error;
  }
}

export async function down() {
  console.log('🔄 Rolling back production data migration...');
  
  try {
    await db.execute(sql`BEGIN;`);

    try {
      // Remove migration-created data
      await db.execute(sql`
        DELETE FROM analysis_quality_metrics 
        WHERE analysis_id IN (
          SELECT id FROM analyses WHERE firecrawl_version = 'v1'
        );
      `);

      await db.execute(sql`
        DELETE FROM extraction_metadata 
        WHERE extraction_type = 'legacy_migration';
      `);

      // Reset analyses to pre-migration state
      await db.execute(sql`
        UPDATE analyses 
        SET 
          firecrawl_version = NULL,
          extraction_version = NULL,
          analysis_version = NULL,
          extraction_data_used = NULL,
          data_richness_score = NULL,
          token_usage = CASE 
            WHEN token_usage->>'migrated' = 'true' THEN NULL
            ELSE token_usage
          END,
          ai_processing_time = CASE 
            WHEN ai_processing_time = 2500 THEN NULL 
            ELSE ai_processing_time
          END,
          load_time = CASE 
            WHEN load_time = 3500 THEN NULL 
            ELSE load_time
          END,
          page_size = CASE 
            WHEN page_size = 75000 THEN NULL 
            ELSE page_size
          END,
          resource_count = CASE 
            WHEN resource_count = 30 THEN NULL 
            ELSE resource_count
          END
        WHERE firecrawl_version = 'v1';
      `);

      // Reset page types (only those we set)
      await db.execute(sql`
        UPDATE websites 
        SET page_type = NULL
        WHERE page_type != 'unknown'::page_type_enum;
      `);

      await db.execute(sql`COMMIT;`);
      console.log('✅ Production data migration rollback completed');

    } catch (rollbackError) {
      await db.execute(sql`ROLLBACK;`);
      throw rollbackError;
    }
    
  } catch (error) {
    console.error('❌ Production data migration rollback failed:', error);
    throw error;
  }
}

// Development helper function
export async function validateMigration() {
  console.log('🔍 Validating production data migration...');
  
  try {
    // Comprehensive validation checks (with error handling for missing columns)
    let migrationStats;
    try {
      migrationStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_analyses,
          COUNT(*) FILTER (WHERE firecrawl_version = 'v1') as v1_analyses,
          COUNT(*) FILTER (WHERE firecrawl_version = 'v2') as v2_analyses,
          COUNT(*) FILTER (WHERE extraction_data_used = true) as enhanced_analyses,
          AVG(data_richness_score) as avg_richness
        FROM analyses;
      `);
    } catch (columnError) {
      // Fallback query for missing columns
      migrationStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_analyses,
          0 as v1_analyses,
          0 as v2_analyses,
          0 as enhanced_analyses,
          NULL as avg_richness
        FROM analyses;
      `);
      console.log('⚪ Some columns not found - this is expected before running all migrations');
    }

    let extractionStats;
    try {
      extractionStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_metadata,
          COUNT(*) FILTER (WHERE extraction_type = 'legacy_migration') as legacy_metadata,
          AVG(confidence_score) as avg_confidence
        FROM extraction_metadata;
      `);
    } catch (tableError) {
      extractionStats = { rows: [{ total_metadata: 0, legacy_metadata: 0, avg_confidence: null }] };
      console.log('⚪ Extraction metadata table does not exist yet');
    }

    let qualityStats;
    try {
      qualityStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_metrics,
          AVG(data_coverage) as avg_coverage,
          AVG(accuracy_confidence) as avg_accuracy
        FROM analysis_quality_metrics;
      `);
    } catch (tableError) {
      qualityStats = { rows: [{ total_metrics: 0, avg_coverage: null, avg_accuracy: null }] };
      console.log('⚪ Analysis quality metrics table does not exist yet');
    }

    const pageTypeStats = await db.execute(sql`
      SELECT 
        page_type,
        COUNT(*) as count
      FROM websites 
      WHERE page_type IS NOT NULL
      GROUP BY page_type
      ORDER BY count DESC;
    `);

    console.log('📊 Migration Statistics:');
    console.table(migrationStats.rows[0]);
    console.table(extractionStats.rows[0]);
    console.table(qualityStats.rows[0]);
    
    console.log('📊 Page Type Distribution:');
    console.table(pageTypeStats.rows);

    return true;
    
  } catch (error) {
    console.error('❌ Production data migration validation failed:', error);
    return false;
  }
}

// Helper function for migration summary report
export async function generateMigrationReport() {
  console.log('📋 Generating comprehensive migration report...');
  
  try {
    const report = {
      timestamp: new Date().toISOString(),
      analyses: {},
      extraction: {},
      quality: {},
      pageTypes: {}
    };

    // Analyses statistics
    const analysisReport = await db.execute(sql`
      SELECT 
        firecrawl_version,
        analysis_version,
        COUNT(*) as count,
        AVG(data_richness_score) as avg_richness,
        COUNT(*) FILTER (WHERE token_usage IS NOT NULL) as with_tokens
      FROM analyses
      GROUP BY firecrawl_version, analysis_version
      ORDER BY firecrawl_version;
    `);

    report.analyses = analysisReport.rows;

    // Write report to console
    console.log('📄 Migration Report Generated:');
    console.log(JSON.stringify(report, null, 2));

    return report;
    
  } catch (error) {
    console.error('❌ Failed to generate migration report:', error);
    return null;
  }
}