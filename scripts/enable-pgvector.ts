#!/usr/bin/env bun
/**
 * Enable pgvector extension in Neon database
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

async function enablePgVector() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  console.log('🔌 Connecting to Neon database...');
  
  const client = postgres(databaseUrl, {
    ssl: 'require',
    max: 1,
  });
  
  try {
    console.log('⏳ Enabling pgvector extension...');
    await client`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log('✅ pgvector extension enabled successfully!');
    
    // Verify it's installed
    const result = await client`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'vector'
    `;
    
    if (result.length > 0) {
      console.log(`✅ Verified: pgvector version ${result[0].extversion} is active`);
    }
    
  } catch (error) {
    console.error('❌ Failed to enable pgvector:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

enablePgVector().catch(console.error);