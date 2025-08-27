// Migration Script 2: Extraction Tables Creation
// For development environment only - DO NOT RUN IN PRODUCTION
import { sql } from 'drizzle-orm';
import { db } from '../../connection';

export async function up() {
  console.log('🔄 Creating extraction tables (Phase 2)...');

  try {
    // Phase 2: Create extraction metadata table
    console.log('📝 Creating extraction metadata table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS extraction_metadata (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
        extraction_type VARCHAR(50) NOT NULL,
        confidence_score NUMERIC(3,2),
        processing_time INTEGER,
        prompt_used TEXT,
        schema_version VARCHAR(20) DEFAULT '1.0.0',
        ai_model VARCHAR(100),
        tokens_used INTEGER,
        cost_usd NUMERIC(10,6),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create business info extraction table
    console.log('📝 Creating extracted business info table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS extracted_business_info (
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
        unique_selling_points JSONB,
        brand_personality TEXT,
        company_culture TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create products/services extraction table
    console.log('📝 Creating extracted products/services table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS extracted_products_services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
        item_type VARCHAR(20) CHECK (item_type IN ('product', 'service')),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price_info JSONB,
        features JSONB,
        benefits JSONB,
        categories JSONB,
        images JSONB,
        availability_status VARCHAR(50),
        rating NUMERIC(2,1),
        review_count INTEGER,
        sku VARCHAR(100),
        variants JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create CTAs extraction table
    console.log('📝 Creating extracted CTAs table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS extracted_ctas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
        text VARCHAR(255) NOT NULL,
        type VARCHAR(50),
        prominence VARCHAR(20) CHECK (prominence IN ('primary', 'secondary', 'tertiary')),
        position VARCHAR(100),
        url TEXT,
        context TEXT,
        urgency_level VARCHAR(20),
        action_oriented BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create social proof extraction table
    console.log('📝 Creating extracted social proof table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS extracted_social_proof (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
        proof_type VARCHAR(50) NOT NULL,
        content TEXT,
        source VARCHAR(255),
        credibility_score NUMERIC(3,2),
        prominence VARCHAR(20),
        testimonials JSONB,
        reviews JSONB,
        certifications JSONB,
        awards JSONB,
        client_logos JSONB,
        statistics JSONB,
        media_mentions JSONB,
        case_studies JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create psychology elements extraction table
    console.log('📝 Creating extracted psychology elements table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS extracted_psychology_elements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
        trigger_type VARCHAR(50) NOT NULL,
        description TEXT,
        effectiveness_score NUMERIC(3,2),
        context VARCHAR(255),
        scarcity_elements JSONB,
        urgency_elements JSONB,
        social_proof_elements JSONB,
        authority_elements JSONB,
        reciprocity_elements JSONB,
        commitment_consistency JSONB,
        loss_aversion JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create SEO elements extraction table
    console.log('📝 Creating extracted SEO elements table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS extracted_seo_elements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
        page_title VARCHAR(255),
        meta_description TEXT,
        meta_keywords JSONB,
        headings JSONB,
        content_keywords JSONB,
        internal_links JSONB,
        external_links JSONB,
        image_alt_tags JSONB,
        schema_markup JSONB,
        canonical_url TEXT,
        robots_meta VARCHAR(100),
        word_count INTEGER,
        readability_score NUMERIC(3,2),
        content_quality_score NUMERIC(3,2),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes for all extraction tables
    console.log('📝 Creating indexes for extraction tables...');
    await db.execute(sql`
      -- Extraction metadata indexes
      CREATE INDEX IF NOT EXISTS idx_extraction_metadata_analysis ON extraction_metadata(analysis_id);
      CREATE INDEX IF NOT EXISTS idx_extraction_metadata_type ON extraction_metadata(extraction_type);
      CREATE INDEX IF NOT EXISTS idx_extraction_metadata_confidence ON extraction_metadata(confidence_score);

      -- Business info indexes
      CREATE INDEX IF NOT EXISTS idx_business_info_analysis ON extracted_business_info(analysis_id);
      CREATE INDEX IF NOT EXISTS idx_business_info_industry ON extracted_business_info(industry);
      CREATE INDEX IF NOT EXISTS idx_business_info_location ON extracted_business_info USING GIN(location);

      -- Products/services indexes
      CREATE INDEX IF NOT EXISTS idx_products_services_analysis ON extracted_products_services(analysis_id);
      CREATE INDEX IF NOT EXISTS idx_products_services_type ON extracted_products_services(item_type);
      CREATE INDEX IF NOT EXISTS idx_products_services_categories ON extracted_products_services USING GIN(categories);
      CREATE INDEX IF NOT EXISTS idx_products_services_price ON extracted_products_services USING GIN(price_info);

      -- CTAs indexes
      CREATE INDEX IF NOT EXISTS idx_ctas_analysis ON extracted_ctas(analysis_id);
      CREATE INDEX IF NOT EXISTS idx_ctas_prominence ON extracted_ctas(prominence);
      CREATE INDEX IF NOT EXISTS idx_ctas_type ON extracted_ctas(type);

      -- Social proof indexes
      CREATE INDEX IF NOT EXISTS idx_social_proof_analysis ON extracted_social_proof(analysis_id);
      CREATE INDEX IF NOT EXISTS idx_social_proof_type ON extracted_social_proof(proof_type);
      CREATE INDEX IF NOT EXISTS idx_social_proof_credibility ON extracted_social_proof(credibility_score);

      -- Psychology elements indexes
      CREATE INDEX IF NOT EXISTS idx_psychology_analysis ON extracted_psychology_elements(analysis_id);
      CREATE INDEX IF NOT EXISTS idx_psychology_trigger ON extracted_psychology_elements(trigger_type);
      CREATE INDEX IF NOT EXISTS idx_psychology_effectiveness ON extracted_psychology_elements(effectiveness_score);

      -- SEO elements indexes
      CREATE INDEX IF NOT EXISTS idx_seo_elements_analysis ON extracted_seo_elements(analysis_id);
      CREATE INDEX IF NOT EXISTS idx_seo_elements_word_count ON extracted_seo_elements(word_count);
      CREATE INDEX IF NOT EXISTS idx_seo_elements_readability ON extracted_seo_elements(readability_score);
      CREATE INDEX IF NOT EXISTS idx_seo_elements_keywords ON extracted_seo_elements USING GIN(content_keywords);
    `);

    console.log('✅ Extraction tables creation completed successfully');
    
  } catch (error) {
    console.error('❌ Extraction tables creation failed:', error);
    throw error;
  }
}

export async function down() {
  console.log('🔄 Rolling back extraction tables...');
  
  try {
    // Drop all extraction tables in reverse dependency order
    await db.execute(sql`
      DROP TABLE IF EXISTS extracted_seo_elements;
      DROP TABLE IF EXISTS extracted_psychology_elements;
      DROP TABLE IF EXISTS extracted_social_proof;
      DROP TABLE IF EXISTS extracted_ctas;
      DROP TABLE IF EXISTS extracted_products_services;
      DROP TABLE IF EXISTS extracted_business_info;
      DROP TABLE IF EXISTS extraction_metadata;
    `);

    console.log('✅ Extraction tables rollback completed');
    
  } catch (error) {
    console.error('❌ Extraction tables rollback failed:', error);
    throw error;
  }
}

// Development helper function
export async function validateMigration() {
  console.log('🔍 Validating extraction tables migration...');
  
  try {
    // Check if all tables exist
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN (
        'extraction_metadata',
        'extracted_business_info',
        'extracted_products_services',
        'extracted_ctas',
        'extracted_social_proof',
        'extracted_psychology_elements',
        'extracted_seo_elements'
      )
      AND table_schema = 'public';
    `);
    
    console.log('✅ Found', result.rowCount, 'extraction tables');
    
    // Check indexes
    const indexResult = await db.execute(sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE indexname LIKE 'idx_%extraction%' 
      OR indexname LIKE 'idx_%business%'
      OR indexname LIKE 'idx_%products%'
      OR indexname LIKE 'idx_%ctas%'
      OR indexname LIKE 'idx_%social%'
      OR indexname LIKE 'idx_%psychology%'
      OR indexname LIKE 'idx_%seo%';
    `);
    
    console.log('✅ Found', indexResult.rowCount, 'extraction table indexes');
    return true;
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  }
}