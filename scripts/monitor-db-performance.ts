#!/usr/bin/env bun
/**
 * Database performance monitoring script
 * Usage: bun scripts/monitor-db-performance.ts
 */

import postgres from 'postgres';

async function monitorDatabasePerformance() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  const client = postgres(databaseUrl, {
    ssl: 'require',
    max: 1,
  });
  
  try {
    console.log('📊 ConvertIQ Database Performance Monitor\n');
    
    // 1. Connection and activity stats
    const activity = await client`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;
    
    console.log('🔌 Connection Stats:');
    console.log(`   Total Connections: ${activity[0].total_connections}`);
    console.log(`   Active: ${activity[0].active_connections}`);
    console.log(`   Idle: ${activity[0].idle_connections}`);
    
    // 2. Database size and growth
    const dbSize = await client`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        pg_size_pretty(pg_total_relation_size('analyses')) as analyses_table_size,
        pg_size_pretty(pg_total_relation_size('websites')) as websites_table_size
    `;
    
    console.log('\n💾 Storage Stats:');
    console.log(`   Database Size: ${dbSize[0].database_size}`);
    console.log(`   Analyses Table: ${dbSize[0].analyses_table_size}`);
    console.log(`   Websites Table: ${dbSize[0].websites_table_size}`);
    
    // 3. Query performance stats
    const queryStats = await client`
      SELECT 
        query,
        calls,
        mean_exec_time::numeric(10,2) as avg_time_ms,
        total_exec_time::numeric(10,2) as total_time_ms
      FROM pg_stat_statements 
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY total_exec_time DESC 
      LIMIT 5
    `;
    
    console.log('\n⚡ Top Queries by Total Time:');
    queryStats.forEach((stat, i) => {
      const shortQuery = stat.query.substring(0, 50) + '...';
      console.log(`   ${i+1}. ${shortQuery}`);
      console.log(`      Calls: ${stat.calls}, Avg: ${stat.avg_time_ms}ms`);
    });
    
    // 4. Vector operations performance
    try {
      const vectorStats = await client`
        SELECT 
          count(*) as total_analyses,
          count(*) FILTER (WHERE embedding IS NOT NULL) as with_embeddings,
          avg(array_length(string_to_array(rawdata, ' '), 1)) as avg_content_words
        FROM analyses 
        WHERE status = 'completed'
      `;
      
      console.log('\n🤖 AI & Vector Stats:');
      console.log(`   Total Analyses: ${vectorStats[0].total_analyses}`);
      console.log(`   With Embeddings: ${vectorStats[0].with_embeddings}`);
      console.log(`   Avg Content Words: ${Math.round(vectorStats[0].avg_content_words || 0)}`);
      
    } catch (error) {
      console.log('\n🤖 AI & Vector Stats: Tables not yet populated');
    }
    
    // 5. Index usage stats
    const indexStats = await client`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as scans,
        idx_tup_read as tuples_read
      FROM pg_stat_user_indexes 
      WHERE idx_scan > 0
      ORDER BY idx_scan DESC 
      LIMIT 5
    `;
    
    console.log('\n📇 Index Usage (Top 5):');
    indexStats.forEach((stat, i) => {
      console.log(`   ${i+1}. ${stat.tablename}.${stat.indexname}: ${stat.scans} scans`);
    });
    
    // 6. Performance recommendations
    console.log('\n💡 Performance Recommendations:');
    
    const totalConnections = parseInt(activity[0].total_connections);
    if (totalConnections > 15) {
      console.log('   ⚠️  High connection count - consider connection pooling optimization');
    }
    
    const activeConnections = parseInt(activity[0].active_connections);
    if (activeConnections > 10) {
      console.log('   ⚠️  Many active connections - potential for autoscaling trigger');
    }
    
    if (queryStats.length > 0 && parseFloat(queryStats[0].avg_time_ms) > 1000) {
      console.log('   ⚠️  Slow queries detected - consider optimization');
    }
    
    console.log('   ✅ Monitor scaling events in Neon Console');
    console.log('   ✅ Watch for costs increasing with traffic');
    
  } catch (error) {
    console.error('❌ Monitoring failed:', error);
  } finally {
    await client.end();
  }
}

monitorDatabasePerformance().catch(console.error);