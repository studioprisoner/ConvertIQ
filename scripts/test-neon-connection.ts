#!/usr/bin/env bun
/**
 * Test script for Neon PostgreSQL production database connectivity
 * Usage: bun scripts/test-neon-connection.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

async function testNeonConnection() {
  console.log('🧪 Testing Neon PostgreSQL Production Connection...\n');
  
  // Get DATABASE_URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('Set it with: export DATABASE_URL="postgresql://..."');
    process.exit(1);
  }
  
  console.log('🔗 Database URL detected:', databaseUrl.replace(/:[^:@]*@/, ':***@'));
  
  let client;
  
  try {
    // Create connection
    client = postgres(databaseUrl, {
      ssl: 'require',
      max: 1, // Single connection for testing
    });
    
    const db = drizzle(client);
    
    console.log('⏳ Testing basic connectivity...');
    
    // Test 1: Basic connection
    const result = await client`SELECT version(), current_database(), current_user`;
    console.log('✅ Connection successful!');
    console.log(`   PostgreSQL Version: ${result[0].version.split(' ')[0]} ${result[0].version.split(' ')[1]}`);
    console.log(`   Database: ${result[0].current_database}`);
    console.log(`   User: ${result[0].current_user}`);
    
    // Test 2: pgvector extension
    console.log('\n⏳ Testing pgvector extension...');
    const vectorResult = await client`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'vector'
    `;
    
    if (vectorResult.length > 0) {
      console.log('✅ pgvector extension found!');
      console.log(`   Version: ${vectorResult[0].extversion}`);
    } else {
      console.log('❌ pgvector extension not found - run: CREATE EXTENSION IF NOT EXISTS vector;');
    }
    
    // Test 3: Vector functionality
    console.log('\n⏳ Testing vector operations...');
    await client`CREATE TABLE IF NOT EXISTS test_vectors (id serial primary key, embedding vector(1024))`;
    
    // Create a test 1024-dimension vector (all zeros)
    const testVector = Array(1024).fill(0).map(() => Math.random());
    await client`INSERT INTO test_vectors (embedding) VALUES (${JSON.stringify(testVector)})`;
    
    const vectorTest = await client`
      SELECT id, embedding <=> ${JSON.stringify(testVector)} as distance 
      FROM test_vectors 
      ORDER BY distance 
      LIMIT 1
    `;
    
    console.log('✅ Vector operations working!');
    console.log(`   Vector similarity distance: ${vectorTest[0].distance}`);
    
    // Cleanup test table
    await client`DROP TABLE test_vectors`;
    
    // Test 4: Check existing schema (if migrated)
    console.log('\n⏳ Checking existing schema...');
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    if (tables.length > 0) {
      console.log('✅ Existing tables found:');
      tables.forEach(table => console.log(`   - ${table.table_name}`));
    } else {
      console.log('ℹ️  No tables found - database is ready for migration');
    }
    
    console.log('\n🎉 All tests passed! Neon database is ready for production.');
    
  } catch (error) {
    console.error('\n❌ Connection test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('password authentication failed')) {
        console.log('💡 Check your username and password in DATABASE_URL');
      } else if (error.message.includes('database') && error.message.includes('does not exist')) {
        console.log('💡 Check your database name in DATABASE_URL');
      } else if (error.message.includes('getaddrinfo ENOTFOUND')) {
        console.log('💡 Check your hostname in DATABASE_URL');
      }
    }
    
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
      console.log('\n🔌 Connection closed.');
    }
  }
}

// Run the test
testNeonConnection().catch(console.error);