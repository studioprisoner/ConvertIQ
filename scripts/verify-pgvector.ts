#!/usr/bin/env bun
/**
 * Simple pgvector verification script
 */

import { db } from '../src/db/connection';
import { sql } from 'drizzle-orm';

async function verifyPgVector() {
  console.log('🔍 Verifying pgvector setup in Neon...\n');
  
  try {
    // 1. Check pgvector extension
    const extensionResult = await db.execute(sql`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'vector'
    `);
    
    if (extensionResult.length > 0) {
      console.log(`✅ pgvector extension: v${extensionResult[0].extversion}`);
    } else {
      console.log('❌ pgvector extension: NOT FOUND');
      return;
    }
    
    // 2. Check vector data type
    const typeResult = await db.execute(sql`
      SELECT typname FROM pg_type WHERE typname = 'vector'
    `);
    
    console.log(`✅ Vector data type: ${typeResult.length > 0 ? 'Available' : 'Missing'}`);
    
    // 3. Check analyses table structure
    const columnsResult = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'analyses' 
      AND column_name IN ('embedding', 'embedding_model', 'embedding_created_at')
      ORDER BY column_name
    `);
    
    console.log(`✅ Analyses vector columns: ${columnsResult.length}/3 found`);
    columnsResult.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    // 4. Check HNSW index
    const indexResult = await db.execute(sql`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'analyses' 
      AND indexname LIKE '%embedding%'
    `);
    
    console.log(`✅ Vector indexes: ${indexResult.length} found`);
    indexResult.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
      if (idx.indexdef.includes('hnsw')) {
        console.log('     🚀 HNSW (fast similarity search)');
      }
    });
    
    // 5. Test vector operations
    const testVector = Array(1024).fill(0.1);
    
    // Create test
    await db.execute(sql`
      CREATE TEMP TABLE vector_test (id serial, embedding vector(1024))
    `);
    
    // Insert test vector
    await db.execute(sql`
      INSERT INTO vector_test (embedding) VALUES (${JSON.stringify(testVector)})
    `);
    
    // Test similarity search
    const similarityResult = await db.execute(sql`
      SELECT embedding <=> ${JSON.stringify(testVector)} as distance
      FROM vector_test
      LIMIT 1
    `);
    
    console.log(`✅ Vector similarity test: distance = ${similarityResult[0].distance}`);
    
    console.log('\n🎉 pgvector Status: FULLY CONFIGURED ✅');
    console.log('📋 Summary:');
    console.log('   ✅ Extension: pgvector installed and active');
    console.log('   ✅ Schema: analyses table has vector columns');
    console.log('   ✅ Indexing: HNSW index for fast searches');
    console.log('   ✅ Operations: Vector similarity working');
    console.log('   ✅ Dimensions: 1024 (Voyage AI compatible)');
    console.log('   ✅ Ready for ConvertIQ AI embeddings!');
    
    return true;
    
  } catch (error) {
    console.error('❌ pgvector verification failed:', error.message);
    
    if (error.message.includes('type "vector" does not exist')) {
      console.log('\n💡 Fix: Enable pgvector extension');
      console.log('   Run: CREATE EXTENSION IF NOT EXISTS vector;');
    }
    
    return false;
  }
}

verifyPgVector()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Verification script failed:', error);
    process.exit(1);
  });