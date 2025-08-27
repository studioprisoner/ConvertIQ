// Migration Script 3: Simple Data Migration (Documentation Version)
// For development environment only - DO NOT RUN IN PRODUCTION
// This is the simplified version exactly as shown in the documentation
import { sql } from 'drizzle-orm';
import { db } from '../../connection';

export async function up() {
  console.log('🔄 Migrating existing analysis data to v2 format (Simple Version)...');

  try {
    // Set firecrawl_version to 'v1' for existing analyses
    console.log('📝 Setting firecrawl_version to v1 for existing analyses...');
    const updateAnalysesResult = await db.execute(sql`
      UPDATE analyses 
      SET firecrawl_version = 'v1', extraction_version = '0.0.0'
      WHERE firecrawl_version IS NULL OR firecrawl_version = 'v2';
    `);
    console.log(`✅ Updated ${updateAnalysesResult.rowCount || 0} existing analyses to v1`);

    // Attempt to infer page types from existing website data
    console.log('📝 Inferring page types from website URLs...');
    const updateWebsitesResult = await db.execute(sql`
      UPDATE websites 
      SET page_type = CASE 
        WHEN url ILIKE '%/product/%' OR url ILIKE '%/products/%' THEN 'ecommerce-product'::page_type_enum
        WHEN url ILIKE '%/service/%' OR url ILIKE '%/services/%' THEN 'service-landing'::page_type_enum
        WHEN url ILIKE '%/blog/%' OR url ILIKE '%/post/%' THEN 'blog-post'::page_type_enum
        WHEN url ILIKE '%/about%' THEN 'about'::page_type_enum
        WHEN url ILIKE '%/contact%' THEN 'contact'::page_type_enum
        WHEN url ILIKE '%/pricing%' THEN 'pricing'::page_type_enum
        WHEN url ~ '.*/$' OR url NOT LIKE '%/%' THEN 'homepage'::page_type_enum
        ELSE 'unknown'::page_type_enum
      END
      WHERE page_type IS NULL;
    `);
    console.log(`✅ Updated page types for ${updateWebsitesResult.rowCount || 0} websites`);

    console.log('✅ Existing data migration completed');
    
  } catch (error) {
    console.error('❌ Simple data migration failed:', error);
    throw error;
  }
}

export async function down() {
  console.log('🔄 Rolling back simple data migration...');
  
  try {
    // Reset firecrawl_version and extraction_version to NULL
    await db.execute(sql`
      UPDATE analyses 
      SET firecrawl_version = NULL, extraction_version = NULL
      WHERE firecrawl_version = 'v1';
    `);

    // Reset page types to NULL
    await db.execute(sql`
      UPDATE websites 
      SET page_type = NULL
      WHERE page_type != 'unknown'::page_type_enum;
    `);

    console.log('✅ Simple data migration rollback completed');
    
  } catch (error) {
    console.error('❌ Simple data migration rollback failed:', error);
    throw error;
  }
}

// Development helper function
export async function validateMigration() {
  console.log('🔍 Validating simple data migration...');
  
  try {
    // Check analyses with v1 version
    const v1Analyses = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM analyses 
      WHERE firecrawl_version = 'v1';
    `);
    console.log('✅ Found', v1Analyses.rows[0]?.count || 0, 'v1 analyses');

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

    return true;
    
  } catch (error) {
    console.error('❌ Simple data migration validation failed:', error);
    return false;
  }
}