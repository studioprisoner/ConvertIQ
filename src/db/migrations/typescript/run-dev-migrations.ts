#!/usr/bin/env bun
// Development Migration Runner
// FOR DEVELOPMENT ENVIRONMENT ONLY - DO NOT RUN IN PRODUCTION

import { pool } from '../../connection';
import * as coreScript from './firecrawl-v2-core';
import * as extractionScript from './extraction-tables';
import * as analyticsScript from './enhanced-analytics';
import * as performanceScript from './performance-optimization';
import * as dataMigrationScript from './data-migration';
import * as simpleDataMigrationScript from './simple-data-migration';
import * as productionDataMigrationScript from './production-data-migration';

interface MigrationScript {
  name: string;
  script: {
    up: () => Promise<void>;
    down: () => Promise<void>;
    validateMigration?: () => Promise<boolean>;
  };
}

const migrations: MigrationScript[] = [
  { name: 'Core Firecrawl v2 Support', script: coreScript },
  { name: 'Extraction Tables', script: extractionScript },
  { name: 'Enhanced Analytics', script: analyticsScript },
  { name: 'Performance Optimization', script: performanceScript },
  { name: 'Data Migration (Comprehensive)', script: dataMigrationScript },
  { name: 'Data Migration (Simple)', script: simpleDataMigrationScript },
  { name: 'Data Migration (Production)', script: productionDataMigrationScript },
];

async function checkDatabaseConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

async function createMigrationTrackingTable() {
  try {
    const client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS dev_migration_log (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL,
        direction VARCHAR(10) NOT NULL, -- 'up' or 'down'
        executed_at TIMESTAMP DEFAULT NOW(),
        success BOOLEAN NOT NULL,
        error_message TEXT,
        execution_time INTEGER -- milliseconds
      );
    `);
    client.release();
    console.log('✅ Migration tracking table ready');
  } catch (error) {
    console.error('❌ Failed to create migration tracking table:', error);
    throw error;
  }
}

async function logMigration(name: string, direction: 'up' | 'down', success: boolean, executionTime: number, error?: any) {
  try {
    const client = await pool.connect();
    await client.query(
      'INSERT INTO dev_migration_log (migration_name, direction, success, execution_time, error_message) VALUES ($1, $2, $3, $4, $5)',
      [name, direction, success, executionTime, error?.message || null]
    );
    client.release();
  } catch (logError) {
    console.error('Warning: Failed to log migration:', logError);
  }
}

async function runMigration(migration: MigrationScript, direction: 'up' | 'down') {
  const startTime = Date.now();
  let success = false;
  let error: any = null;

  try {
    console.log(`\n🚀 Running ${direction} migration: ${migration.name}`);
    
    if (direction === 'up') {
      await migration.script.up();
    } else {
      await migration.script.down();
    }
    
    // Run validation if available
    if (direction === 'up' && migration.script.validateMigration) {
      const isValid = await migration.script.validateMigration();
      if (!isValid) {
        throw new Error('Migration validation failed');
      }
    }
    
    success = true;
    const executionTime = Date.now() - startTime;
    console.log(`✅ ${migration.name} ${direction} migration completed in ${executionTime}ms`);
    
    await logMigration(migration.name, direction, success, executionTime);
    
  } catch (migrationError) {
    error = migrationError;
    const executionTime = Date.now() - startTime;
    console.error(`❌ ${migration.name} ${direction} migration failed after ${executionTime}ms:`, migrationError);
    
    await logMigration(migration.name, direction, success, executionTime, error);
    throw migrationError;
  }
}

async function runAllMigrations(direction: 'up' | 'down') {
  console.log(`\n🔄 Running all migrations ${direction}...`);
  
  const migrationsToRun = direction === 'up' ? migrations : [...migrations].reverse();
  
  for (const migration of migrationsToRun) {
    await runMigration(migration, direction);
  }
}

async function checkMigrationStatus() {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        migration_name,
        direction,
        success,
        executed_at,
        execution_time,
        error_message
      FROM dev_migration_log 
      ORDER BY executed_at DESC 
      LIMIT 20
    `);
    client.release();
    
    console.log('\n📊 Recent migration history:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('Failed to check migration status:', error);
  }
}

async function validateAllMigrations() {
  console.log('\n🔍 Validating all migrations...');
  
  for (const migration of migrations) {
    if (migration.script.validateMigration) {
      try {
        const isValid = await migration.script.validateMigration();
        console.log(`${isValid ? '✅' : '❌'} ${migration.name}: ${isValid ? 'Valid' : 'Invalid'}`);
      } catch (error) {
        console.log(`❌ ${migration.name}: Validation failed - ${error.message}`);
      }
    } else {
      console.log(`⚪ ${migration.name}: No validation available`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Check environment safety
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ DANGER: This script is for development only. Do not run in production!');
    process.exit(1);
  }

  // Ensure we're using development database
  const dbUrl = process.env.DATABASE_URL;
  const isDevelopmentDb = dbUrl && (
    dbUrl.includes('localhost') || 
    dbUrl.includes('dev') || 
    dbUrl.includes('development') ||
    // Allow Neon development branches (common patterns for dev databases)
    (dbUrl.includes('neon.tech') && (
      dbUrl.includes('pooler') || // Neon pooler connection (common for dev)
      !dbUrl.includes('prod') // Not explicitly production
    ))
  );
  
  if (!isDevelopmentDb) {
    console.error('❌ DANGER: Database URL does not appear to be a development database');
    console.error('Current DATABASE_URL:', dbUrl?.substring(0, 50) + '...');
    console.error('Ensure you are using a development database before running migrations');
    console.error('');
    console.error('Development databases should contain one of:');
    console.error('  - localhost (local PostgreSQL)');
    console.error('  - dev/development (in hostname or database name)');
    console.error('  - neon.tech with pooler connection (Neon dev branch)');
    console.error('');
    console.error('If you are certain this is a development database, you can:');
    console.error('  1. Add "dev" to your database URL or name');
    console.error('  2. Or modify the safety check in this script');
    process.exit(1);
  }

  console.log('🔧 Development Migration Runner');
  console.log('Database:', dbUrl?.substring(0, 50) + '...');

  try {
    // Check database connection
    const connected = await checkDatabaseConnection();
    if (!connected) {
      process.exit(1);
    }

    // Create migration tracking table
    await createMigrationTrackingTable();

    switch (command) {
      case 'up':
        await runAllMigrations('up');
        await validateAllMigrations();
        break;
      
      case 'down':
        await runAllMigrations('down');
        break;
      
      case 'status':
        await checkMigrationStatus();
        break;
      
      case 'validate':
        await validateAllMigrations();
        break;
      
      case 'single':
        const migrationName = args[1];
        const direction = args[2] as 'up' | 'down';
        
        if (!migrationName || !direction) {
          console.error('Usage: bun run-dev-migrations.ts single <migration-name> <up|down>');
          process.exit(1);
        }
        
        const migration = migrations.find(m => {
          const queryLower = migrationName.toLowerCase();
          const nameLower = m.name.toLowerCase();
          
          // Direct name matches
          if (nameLower.includes(queryLower)) return true;
          
          // Special handling for data migrations
          if (queryLower.includes('data')) {
            if (queryLower.includes('simple') && nameLower.includes('simple')) return true;
            if (queryLower.includes('production') && nameLower.includes('production')) return true;
            if (queryLower.includes('comprehensive') && nameLower.includes('comprehensive')) return true;
            // Default data migration
            if (queryLower === 'data' && nameLower.includes('comprehensive')) return true;
          }
          
          return false;
        });
        
        if (!migration) {
          console.error(`Migration not found: ${migrationName}`);
          console.log('Available migrations:');
          migrations.forEach(m => console.log(`  - ${m.name}`));
          process.exit(1);
        }
        
        await runMigration(migration, direction);
        if (direction === 'up' && migration.script.validateMigration) {
          await migration.script.validateMigration();
        }
        break;
      
      default:
        console.log(`
Usage:
  bun run-dev-migrations.ts up          - Run all migrations up
  bun run-dev-migrations.ts down        - Run all migrations down (rollback)
  bun run-dev-migrations.ts status      - Show migration history
  bun run-dev-migrations.ts validate    - Validate all migrations
  bun run-dev-migrations.ts single <name> <up|down> - Run single migration

Available migrations:
${migrations.map(m => `  - ${m.name}`).join('\n')}

Examples:
  bun run-dev-migrations.ts up
  bun run-dev-migrations.ts single core up
  bun run-dev-migrations.ts validate
        `);
        process.exit(1);
    }

    console.log('\n✅ Migration operation completed successfully');
    
  } catch (error) {
    console.error('\n❌ Migration operation failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if this script is executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { main, migrations, runMigration, validateAllMigrations };