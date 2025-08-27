# Development Migration Scripts

This directory contains TypeScript migration scripts for the Firecrawl v2 & Enhanced Extraction database schema changes. These scripts are designed for **development environment only** and include comprehensive safety checks.

## ⚠️ IMPORTANT SAFETY WARNINGS

- **DEVELOPMENT ONLY**: These scripts are for development environments only
- **Production Protection**: Scripts will refuse to run if `NODE_ENV=production` or if the database URL doesn't appear to be a development database
- **Database Verification**: Always verify you're connected to the correct development database before running

## Migration Scripts Overview

### Phase 1: Core Firecrawl v2 Support (`firecrawl-v2-core.ts`)
- Updates enums for new analysis statuses (`extracting`, `analyzing`) and actions (`extract`, `crawl`, `batch`)
- Adds core Firecrawl v2 columns to `analyses` table
- Enhances `websites` table with comprehensive page type enum
- Creates essential performance indexes

### Phase 2: Extraction Tables (`extraction-tables.ts`)
- Creates 7 specialized extraction tables for structured data
- Implements comprehensive indexing strategy
- Establishes foreign key relationships with cascade deletes

### Phase 3: Enhanced Analytics (`enhanced-analytics.ts`)
- Adds analytics quality metrics table
- Creates analytical views for reporting
- Implements comprehensive scoring system

### Phase 4: Performance Optimization (`performance-optimization.ts`)
- Optimizes indexes with conditional WHERE clauses
- Creates HNSW vector similarity indexes
- Adds materialized views and maintenance functions

### Phase 5: Data Migration (Multiple Variants)
Three different data migration approaches available:

#### Data Migration (Comprehensive) (`data-migration.ts`) - **Recommended**
- Complete migration of existing analyses with rich metadata
- Comprehensive token usage estimation and processing metrics
- Sample extraction metadata and quality metrics generation
- Full preservation of legacy data with structured references

#### Data Migration (Simple) (`simple-data-migration.ts`)
- Minimal migration exactly as shown in documentation
- Basic page type inference from URLs
- Simple version marking (v1 for existing analyses)
- Lightweight approach for basic migration needs

#### Data Migration (Production) (`production-data-migration.ts`)
- Enterprise-grade migration with full transaction safety
- Comprehensive prerequisite validation before migration
- Advanced page type inference with 15+ URL patterns
- Detailed migration reporting and statistical analysis
- Full rollback capability with atomic operations

## Usage

### Quick Commands

```bash
# Run all migrations up
bun run db:migrate:dev:up

# Run all migrations down (rollback)
bun run db:migrate:dev:down

# Check migration status and history
bun run db:migrate:dev:status

# Validate all migrations
bun run db:migrate:dev:validate

# View help and available options
bun run db:migrate:dev

# Data migration variants (convenient shortcuts)
bun run db:migrate:dev:data              # Comprehensive (default)
bun run db:migrate:dev:data-simple       # Simple variant
bun run db:migrate:dev:data-production   # Production variant
```

### Advanced Usage

```bash
# Run single migration
bun run src/db/migrations/typescript/run-dev-migrations.ts single core up
bun run src/db/migrations/typescript/run-dev-migrations.ts single extraction down

# Available migration names:
# - core (Core Firecrawl v2 Support)
# - extraction (Extraction Tables)  
# - analytics (Enhanced Analytics)
# - performance (Performance Optimization)
# - data or comprehensive (Data Migration - Comprehensive)
# - simple (Data Migration - Simple)
# - production (Data Migration - Production)
```

### Migration Dependencies

**IMPORTANT**: Migrations must be run in the correct order due to dependencies:

1. **Core Firecrawl v2 Support** - Creates necessary columns and enums
2. **Extraction Tables** - Creates extraction-related tables
3. **Enhanced Analytics** - Creates analytics tables
4. **Performance Optimization** - Optimizes indexes
5. **Data Migration** - Migrates existing data (requires all above to be completed first)
   - Choose one: Comprehensive (recommended), Simple, or Production variant

**Safe Order:**
```bash
# Run all migrations in correct order
bun run db:migrate:dev:up

# Or run individually in this exact order:
bun run src/db/migrations/typescript/run-dev-migrations.ts single core up
bun run src/db/migrations/typescript/run-dev-migrations.ts single extraction up
bun run src/db/migrations/typescript/run-dev-migrations.ts single analytics up
bun run src/db/migrations/typescript/run-dev-migrations.ts single performance up

# Then choose ONE data migration variant:
bun run src/db/migrations/typescript/run-dev-migrations.ts single data up           # Comprehensive (recommended)
# OR
bun run src/db/migrations/typescript/run-dev-migrations.ts single simple up        # Simple
# OR  
bun run src/db/migrations/typescript/run-dev-migrations.ts single production up    # Production
```

## Safety Features

### Environment Protection
- Automatically detects production environments and refuses to run
- Validates database URLs to ensure development database usage
- Logs all migration attempts with success/failure status

### Migration Tracking
- Creates `dev_migration_log` table to track all migration attempts
- Records execution times, success status, and error messages
- Provides detailed migration history via `status` command

### Validation System
- Each migration script includes validation functions
- Verifies expected tables, columns, and indexes exist
- Reports validation results for troubleshooting

### Error Handling
- Comprehensive error catching and reporting
- Safe rollback capabilities for each migration
- Detailed error messages for troubleshooting

## Database Changes Summary

### New Tables Created
- `extraction_metadata` - Metadata for all extractions
- `extracted_business_info` - Business information data
- `extracted_products_services` - Products and services data
- `extracted_ctas` - Call-to-action elements
- `extracted_social_proof` - Social proof elements
- `extracted_psychology_elements` - Psychology trigger data
- `extracted_seo_elements` - SEO-related data
- `analysis_quality_metrics` - Analysis quality tracking

### Enhanced Existing Tables
- `analyses` table: Added 17+ new columns for Firecrawl v2 capabilities
- `websites` table: Enhanced page_type with comprehensive enum (23 types)

### Performance Improvements
- 30+ new indexes including conditional indexes for 80-95% storage savings
- HNSW vector similarity search index for embeddings
- Materialized views for complex reporting queries
- Database maintenance functions

## Development Workflow

### Initial Setup
1. Ensure you're on a development database branch
2. Run `bun run db:migrate:dev:validate` to check current state
3. Run `bun run db:migrate:dev:up` to apply all migrations

### Testing Changes
1. Use `bun run db:migrate:dev:status` to view recent migration history
2. Test your application with the new schema
3. Use `bun run db:migrate:dev:down` to rollback if issues occur

### Before Committing
1. Run `bun run db:migrate:dev:validate` to ensure all migrations are valid
2. Test rollback: `bun run db:migrate:dev:down && bun run db:migrate:dev:up`
3. Verify your application works with both migrated and clean schemas

## Troubleshooting

### Common Issues

**"Database connection failed"**
- Check your `DATABASE_URL` environment variable
- Ensure database server is running
- Verify network connectivity

**"Migration validation failed"**
- Run `bun run db:migrate:dev:status` to check recent migration history
- Use `bun run db:migrate:dev:validate` to see specific validation failures
- Check database logs for constraint or permission issues

**"Database URL does not appear to be development"**
- Ensure your `DATABASE_URL` contains 'localhost', 'dev', or 'development'
- Never run these scripts against production databases

### Getting Help
- Check migration logs: `bun run db:migrate:dev:status`
- Validate current state: `bun run db:migrate:dev:validate`
- Review error messages in the console output

## Files Structure

```
typescript/
├── README.md                     # This documentation
├── run-dev-migrations.ts         # Main migration runner
├── firecrawl-v2-core.ts         # Phase 1: Core schema changes
├── extraction-tables.ts         # Phase 2: Extraction tables
├── enhanced-analytics.ts        # Phase 3: Analytics support
└── performance-optimization.ts  # Phase 4: Performance indexes
```

## Integration with Drizzle

These TypeScript migration scripts complement the standard Drizzle migration files:
- Standard migrations: `src/db/migrations/00XX_*.sql` (generated by `bun run db:generate`)
- TypeScript migrations: Run via these scripts for development testing
- Both systems can coexist - use TypeScript for development iteration, Drizzle for production deployments

## Production Deployment

**NEVER use these scripts in production.** For production deployment:

1. Use the generated Drizzle migration files (`00XX_*.sql`)
2. Apply migrations using `bun run db:migrate` (standard Drizzle process)  
3. Test thoroughly in staging environment first
4. Have rollback plan ready

Remember: These TypeScript scripts are development tools for schema iteration and testing.