#!/usr/bin/env bun

/**
 * Check the test environment and available users
 */

import { db } from '@/db/connection';
import { user } from '@/db/schema/auth';
import { websites } from '@/db/schema/websites';

async function main() {
  console.log('🔍 Checking Test Environment\n');

  try {
    // Check all users
    console.log('👥 All Users in Database:');
    const allUsers = await db.select().from(user);
    
    if (allUsers.length === 0) {
      console.log('  No users found in database');
    } else {
      allUsers.forEach((u, index) => {
        console.log(`  ${index + 1}. ${u.email} (ID: ${u.id})`);
      });
    }
    
    console.log(`\nTotal users: ${allUsers.length}\n`);

    // Check all websites
    console.log('🌐 All Websites in Database:');
    const allWebsites = await db
      .select({
        id: websites.id,
        url: websites.url,
        name: websites.name,
        userId: websites.userId,
      })
      .from(websites);
    
    if (allWebsites.length === 0) {
      console.log('  No websites found in database');
    } else {
      allWebsites.forEach((w, index) => {
        console.log(`  ${index + 1}. ${w.url} (ID: ${w.id}, User: ${w.userId})`);
      });
    }
    
    console.log(`\nTotal websites: ${allWebsites.length}\n`);

    // Check database connection
    console.log('🔗 Database Connection Info:');
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
    
    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      console.log(`Database Host: ${url.hostname}`);
      console.log(`Database Name: ${url.pathname.substring(1)}`);
    }

  } catch (error) {
    console.error('❌ Error checking environment:', error);
  }
}

if (import.meta.main) {
  main();
}