# Production Migration Plan: Firecrawl v2 & Enhanced Extraction

## Overview

This document outlines the comprehensive plan for migrating ConvertIQ's production database to support Firecrawl v2 and Enhanced Extraction capabilities. Based on successful dev environment deployment, this plan ensures zero-downtime migration with full data integrity.

## Pre-Migration Requirements

### 1. Environment Preparation
- [ ] **Production Database Backup**: Full backup of production database before any changes
- [ ] **Staging Environment**: Deploy and test all changes in staging environment first
- [ ] **Monitoring Setup**: Enhanced monitoring for migration process and performance
- [ ] **Rollback Plan**: Prepared rollback scripts and procedures
- [ ] **Maintenance Window**: Schedule maintenance window (estimated 15-30 minutes)

### 2. Code Deployment Prerequisites
- [ ] **Feature Flags**: Implement feature flags for new Firecrawl v2 features
- [ ] **Backward Compatibility**: Ensure all existing API endpoints remain functional
- [ ] **Error Handling**: Enhanced error handling for migration edge cases
- [ ] **Health Checks**: Updated health check endpoints for new schema validation

### 3. Performance Baseline
- [ ] **Current Metrics**: Document current query performance and database size
- [ ] **Load Testing**: Perform load testing on staging with production-like data
- [ ] **Index Usage**: Analyze current index usage patterns
- [ ] **Connection Pool**: Verify connection pool configuration for migration load

## Migration Phases

### Phase 1: Non-Breaking Schema Changes (Zero Downtime)
**Estimated Duration**: 5-10 minutes
**Risk Level**: Low

#### 1.1 Database Structure Updates
```bash
# Execute via Drizzle migrations
bun run db:migrate

# Or via direct SQL execution
psql $PRODUCTION_DATABASE_URL -f migrations/001_firecrawl_v2_core.sql
```

**Changes Include:**
- Add new enum values to `analysis_status` and `analysis_actions`
- Add 17+ new nullable columns to `analyses` table
- Create enhanced `page_type_enum` with 23 page types
- Create 7 new extraction tables with full schema
- Add `analysis_quality_metrics` table
- Create all necessary indexes (conditional and regular)

#### 1.2 Validation Checkpoints
```sql
-- Verify enum updates
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'analysis_status'::regtype;

-- Verify new columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'analyses' AND column_name IN ('firecrawl_version', 'extraction_results');

-- Verify extraction tables
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'extracted_%';
```

### Phase 2: Application Deployment (Zero Downtime)
**Estimated Duration**: 10-15 minutes  
**Risk Level**: Medium

#### 2.1 Code Deployment Strategy
- [ ] **Feature Flag Disabled**: Deploy with Firecrawl v2 features disabled
- [ ] **Gradual Rollout**: Use blue-green deployment or rolling updates
- [ ] **Health Check Validation**: Verify all health checks pass with new schema
- [ ] **API Compatibility**: Ensure existing API endpoints function correctly

#### 2.2 Monitoring During Deployment
- [ ] **Response Times**: Monitor API response times during deployment
- [ ] **Error Rates**: Watch for increased error rates or failed requests
- [ ] **Database Connections**: Monitor database connection pool usage
- [ ] **Memory Usage**: Track application memory usage patterns

### Phase 3: Data Migration (Minimal Downtime)
**Estimated Duration**: 5-15 minutes depending on data volume
**Risk Level**: Medium-High

#### 3.1 Data Migration Execution
```bash
# Execute production-ready data migration
bun run src/db/migrations/typescript/production-data-migration.ts
```

**Migration Tasks:**
- Migrate existing analyses to `v1` format for backward compatibility
- Infer page types from existing website URLs using enhanced patterns
- Create extraction metadata for existing completed analyses
- Generate quality metrics with realistic scoring
- Estimate token usage for analyses without existing data
- Set default processing metrics

#### 3.2 Data Validation Queries
```sql
-- Validate migration results
SELECT 
  COUNT(*) as total_analyses,
  COUNT(*) FILTER (WHERE firecrawl_version = 'v1') as v1_analyses,
  AVG(extraction_confidence) as avg_confidence
FROM analyses;

-- Check page type distribution
SELECT page_type, COUNT(*) as count 
FROM websites 
WHERE page_type IS NOT NULL 
GROUP BY page_type 
ORDER BY count DESC;

-- Verify extraction metadata
SELECT extraction_type, COUNT(*) as count 
FROM extraction_metadata 
GROUP BY extraction_type;
```

### Phase 4: Feature Activation & Validation (Zero Downtime)
**Estimated Duration**: 5-10 minutes
**Risk Level**: Low-Medium

#### 4.1 Feature Flag Activation
- [ ] **Gradual Rollout**: Enable Firecrawl v2 features for percentage of users
- [ ] **A/B Testing**: Compare v1 vs v2 analysis results
- [ ] **Performance Monitoring**: Monitor new feature performance impact
- [ ] **User Feedback**: Collect initial user feedback on enhanced features

#### 4.2 System Validation
- [ ] **End-to-End Testing**: Test complete analysis workflow
- [ ] **Data Quality Checks**: Validate extraction results quality
- [ ] **Performance Benchmarks**: Compare against baseline metrics
- [ ] **Error Monitoring**: Ensure error rates remain within acceptable limits

## Risk Mitigation

### 1. Database Risks
**Risk**: Schema migration failure
**Mitigation**: 
- Full database backup before migration
- Test on production-sized staging data
- Atomic transactions for all schema changes
- Immediate rollback capability

**Risk**: Data corruption during migration
**Mitigation**:
- Transaction-safe migration scripts
- Comprehensive data validation queries
- Point-in-time recovery capability
- Checksums for critical data integrity

### 2. Application Risks
**Risk**: API compatibility breaks
**Mitigation**:
- Extensive backward compatibility testing
- Feature flags for gradual rollout
- Circuit breaker patterns for new features
- Monitoring and alerting on error rates

**Risk**: Performance degradation
**Mitigation**:
- Performance testing on staging
- Index optimization strategy
- Connection pool tuning
- Query performance monitoring

### 3. User Experience Risks
**Risk**: Service interruption
**Mitigation**:
- Zero-downtime deployment strategy
- Health check validation at each step
- Immediate rollback procedures
- User communication plan

## Rollback Strategy

### 1. Immediate Rollback (< 5 minutes)
```bash
# Rollback application deployment
vercel rollback --target=production

# Disable feature flags
# Update feature flag configuration to disable v2 features
```

### 2. Database Rollback (< 15 minutes)
```bash
# Rollback data migration
bun run src/db/migrations/typescript/run-migrations.ts down

# Restore from backup if necessary
pg_restore --clean --if-exists -d $DATABASE_URL backup.dump
```

### 3. Full System Rollback (< 30 minutes)
- Restore application to previous version
- Restore database from pre-migration backup
- Verify all systems operational
- Communicate status to users

## Monitoring & Alerting

### 1. Migration Monitoring
- [ ] **Database Query Performance**: Track query execution times
- [ ] **Migration Progress**: Real-time migration progress tracking
- [ ] **Error Rates**: Monitor and alert on migration errors
- [ ] **Resource Usage**: CPU, memory, and I/O monitoring

### 2. Post-Migration Monitoring
- [ ] **Analysis Quality**: Monitor extraction confidence scores
- [ ] **API Response Times**: Track response time changes
- [ ] **Feature Usage**: Monitor adoption of new features
- [ ] **Error Patterns**: Watch for new error patterns or edge cases

### 3. Business Metrics
- [ ] **Analysis Completion Rates**: Track successful analysis rates
- [ ] **User Engagement**: Monitor user interaction with new features
- [ ] **Performance Improvements**: Measure analysis quality improvements
- [ ] **System Stability**: Overall system health and stability metrics

## Success Criteria

### 1. Technical Success
- [ ] All database migrations complete without errors
- [ ] Application deployment successful with health checks passing
- [ ] No increase in error rates or significant performance degradation
- [ ] All existing functionality continues to work as expected

### 2. Data Integrity Success
- [ ] 100% of existing analyses migrated successfully
- [ ] All website page types properly inferred
- [ ] Extraction metadata created for historical analyses
- [ ] No data loss or corruption detected

### 3. Performance Success
- [ ] Query performance within 10% of baseline metrics
- [ ] Analysis processing times improved or maintained
- [ ] Database size increase within expected parameters
- [ ] Index utilization optimized for new query patterns

### 4. User Experience Success
- [ ] No service interruptions during migration
- [ ] Enhanced features available to users
- [ ] Improved analysis quality and insights
- [ ] Positive user feedback on new capabilities

## Communication Plan

### 1. Internal Communication
- [ ] **Engineering Team**: Detailed technical briefing and role assignments
- [ ] **Product Team**: Feature availability timeline and user impact
- [ ] **Support Team**: Training on new features and potential issues
- [ ] **Leadership**: Migration timeline, risks, and success metrics

### 2. User Communication
- [ ] **Advance Notice**: 48-hour advance notice of maintenance window
- [ ] **Status Updates**: Real-time status updates during migration
- [ ] **Feature Announcement**: Post-migration feature announcement
- [ ] **Support Documentation**: Updated documentation for new features

## Estimated Timeline

### Pre-Migration (1-2 weeks)
- Week 1: Staging environment testing and validation
- Week 2: Final preparations, backups, and team coordination

### Migration Day (1-2 hours total)
- **T-30 min**: Final system checks and backup verification
- **T-0**: Begin Phase 1 (Schema Changes)
- **T+10 min**: Begin Phase 2 (Application Deployment)
- **T+25 min**: Begin Phase 3 (Data Migration) 
- **T+45 min**: Begin Phase 4 (Feature Activation)
- **T+60 min**: Final validation and monitoring setup
- **T+90 min**: Post-migration analysis and documentation

### Post-Migration (1 week)
- 24 hours: Intensive monitoring and performance validation
- 7 days: Extended monitoring and user feedback collection
- Ongoing: Performance optimization and feature refinement

## Conclusion

This production migration plan provides a comprehensive, low-risk approach to deploying Firecrawl v2 and Enhanced Extraction capabilities. The phased approach minimizes downtime while ensuring data integrity and system stability.

Key success factors:
- Thorough testing in staging environment
- Comprehensive backup and rollback strategies  
- Real-time monitoring and validation at each phase
- Clear communication with all stakeholders
- Conservative timeline with buffer for unexpected issues

The migration will significantly enhance ConvertIQ's analysis capabilities while maintaining the reliability and performance that users expect from the platform.