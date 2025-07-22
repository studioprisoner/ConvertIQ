#!/usr/bin/env bun

import { db } from '@/db/connection';
import { user, session, account, verification } from '@/db/schema/auth';

async function cleanupUsers() {
  try {
    console.log('🧹 Starting user cleanup...');
    
    // Delete in order to respect foreign key constraints
    console.log('🗑️ Deleting sessions...');
    const deletedSessions = await db.delete(session);
    console.log(`✅ Deleted ${deletedSessions.rowCount || 0} sessions`);
    
    console.log('🗑️ Deleting accounts...');
    const deletedAccounts = await db.delete(account);
    console.log(`✅ Deleted ${deletedAccounts.rowCount || 0} accounts`);
    
    console.log('🗑️ Deleting verification records...');
    const deletedVerifications = await db.delete(verification);
    console.log(`✅ Deleted ${deletedVerifications.rowCount || 0} verification records`);
    
    console.log('🗑️ Deleting users...');
    const deletedUsers = await db.delete(user);
    console.log(`✅ Deleted ${deletedUsers.rowCount || 0} users`);
    
    console.log('🎉 User cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during user cleanup:', error);
    process.exit(1);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

cleanupUsers();