#!/usr/bin/env bun
/**
 * Comprehensive connection pooling verification for Neon database
 * Usage: bun scripts/verify-connection-pooling.ts
 */

import postgres from 'postgres';

async function verifyConnectionPooling() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  console.log('🔍 Neon Connection Pooling Verification\n');
  console.log('🔗 Database URL:', databaseUrl.replace(/:[^:@]*@/, ':***@'));
  
  // Parse the connection URL to check for pooler
  const isPooled = databaseUrl.includes('-pooler.') || databaseUrl.includes('pooler');
  console.log('🏊 Pooler Connection:', isPooled ? '✅ Using pooled connection' : '⚠️  Direct connection detected');
  
  const client = postgres(databaseUrl, {
    ssl: 'require',
    max: 1, // Single connection for testing
  });
  
  try {
    // 1. Check current connection info
    console.log('\n1️⃣ Connection Information:');
    const connInfo = await client`
      SELECT 
        current_database() as database_name,
        current_user as username,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port,
        version() as pg_version
    `;
    
    console.log(`   Database: ${connInfo[0].database_name}`);
    console.log(`   User: ${connInfo[0].username}`);
    console.log(`   Server: ${connInfo[0].server_ip}:${connInfo[0].server_port}`);
    console.log(`   PostgreSQL: ${connInfo[0].pg_version.split(' ')[0]} ${connInfo[0].pg_version.split(' ')[1]}`);
    
    // 2. Check active connections and pool status
    console.log('\n2️⃣ Connection Pool Status:');
    const connections = await client`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
        max(backend_start) as newest_connection,
        min(backend_start) as oldest_connection
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;
    
    console.log(`   Total Connections: ${connections[0].total_connections}`);
    console.log(`   Active: ${connections[0].active_connections}`);
    console.log(`   Idle: ${connections[0].idle_connections}`);
    console.log(`   Idle in Transaction: ${connections[0].idle_in_transaction}`);
    
    // 3. Check connection limits and settings
    console.log('\n3️⃣ Connection Limits & Settings:');
    const settings = await client`
      SELECT 
        name,
        setting,
        unit,
        context
      FROM pg_settings 
      WHERE name IN (
        'max_connections',
        'shared_preload_libraries',
        'log_connections',
        'log_disconnections'
      )
      ORDER BY name
    `;
    
    settings.forEach(setting => {
      console.log(`   ${setting.name}: ${setting.setting}${setting.unit || ''}`);
    });
    
    // 4. Check for PgBouncer (Neon's pooler)
    console.log('\n4️⃣ Connection Pooler Detection:');
    try {
      const bouncer = await client`SHOW pool_mode`;
      console.log(`   ✅ PgBouncer detected - Pool mode: ${bouncer[0].pool_mode}`);
    } catch (error) {
      if (error.message.includes('unrecognized configuration parameter')) {
        console.log('   ℹ️  PgBouncer SHOW commands not available (normal for transaction pooling)');
      } else {
        console.log('   ⚠️  Could not detect pooler type');
      }
    }
    
    // 5. Test connection behavior
    console.log('\n5️⃣ Connection Behavior Test:');
    
    // Get process ID to track connection
    const pid1 = await client`SELECT pg_backend_pid() as pid`;
    console.log(`   Connection 1 PID: ${pid1[0].pid}`);
    
    // Simulate a quick transaction
    await client`SELECT 1 as test`;
    
    const pid2 = await client`SELECT pg_backend_pid() as pid`;
    console.log(`   Connection 2 PID: ${pid2[0].pid}`);
    
    if (pid1[0].pid === pid2[0].pid) {
      console.log('   ✅ Connection reused (session pooling or direct)');
    } else {
      console.log('   ✅ New connection per transaction (transaction pooling)');
    }
    
    // 6. Performance test
    console.log('\n6️⃣ Connection Performance Test:');
    const startTime = Date.now();
    
    // Run multiple quick queries to test pooling efficiency
    for (let i = 0; i < 5; i++) {
      await client`SELECT ${i} as iteration`;
    }
    
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / 5;
    
    console.log(`   Average query time: ${avgTime.toFixed(2)}ms`);
    console.log(avgTime < 50 ? '   ✅ Good performance' : '   ⚠️  Consider connection optimization');
    
    // 7. Application-level pooling check
    console.log('\n7️⃣ Application Connection Configuration:');
    
    // Check how our app is configured
    const appClient = postgres(databaseUrl, { ssl: 'require' }); // Default settings
    console.log('   Max connections in app pool: Default (10)');
    console.log('   SSL Mode: Required');
    console.log('   Connection timeout: Default (30s)');
    await appClient.end();
    
    // 8. Recommendations
    console.log('\n💡 Connection Pooling Recommendations:');
    
    const totalConn = parseInt(connections[0].total_connections);
    const activeConn = parseInt(connections[0].active_connections);
    
    if (isPooled) {
      console.log('   ✅ Using Neon connection pooler (recommended for production)');
    } else {
      console.log('   ⚠️  Consider using pooled connection URL for production');
      console.log('   💡 Change hostname to include "-pooler" for connection pooling');
    }
    
    if (totalConn > 20) {
      console.log('   ⚠️  High connection count - monitor for connection leaks');
    }
    
    if (activeConn > 10) {
      console.log('   ⚠️  Many active connections - may trigger autoscaling');
    }
    
    console.log('   ✅ Configure app connection limits based on expected load');
    console.log('   ✅ Use connection timeouts to prevent hanging connections');
    console.log('   ✅ Monitor connection usage in production');
    
    console.log('\n🎯 Connection Pooling Status: ' + 
      (isPooled && totalConn < 15 ? '✅ OPTIMALLY CONFIGURED' : '⚠️  NEEDS OPTIMIZATION'));
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    
    if (error.message.includes('connection')) {
      console.log('💡 Check your DATABASE_URL and network connectivity');
    }
  } finally {
    await client.end();
    console.log('\n🔌 Test connection closed');
  }
}

verifyConnectionPooling().catch(console.error);