#!/usr/bin/env bun

/**
 * Test script to verify profile update functionality
 * Run with: bun run src/scripts/test-profile-update.ts
 */

import { db } from '@/db/connection';
import { user } from '@/db/schema/auth';
import { eq } from 'drizzle-orm';

async function testProfileUpdate() {
  console.log('🔍 Testing Profile Update Functionality...\n');
  
  try {
    // First, let's see all users and their current names
    console.log('1. Current Users in Database:');
    const allUsers = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        updatedAt: user.updatedAt
      })
      .from(user);
    
    if (allUsers.length === 0) {
      console.log('   ❌ No users found in database');
      return;
    }
    
    allUsers.forEach((u, index) => {
      console.log(`   User ${index + 1}:`);
      console.log(`     ID: ${u.id}`);
      console.log(`     Name: ${u.name || 'null'}`);
      console.log(`     Email: ${u.email}`);
      console.log(`     Last Updated: ${u.updatedAt}`);
      console.log('');
    });
    
    // Test manual name update on a specific user (if you want to test database functionality)
    const testUser = allUsers[0]; // Take the first user
    
    if (testUser) {
      console.log(`2. Testing Manual Name Update for ${testUser.email}:`);
      console.log(`   Current name: "${testUser.name}"`);
      
      const originalName = testUser.name;
      const testName = `Test Name ${Date.now()}`;
      
      // Update the name
      const [updatedUserRecord] = await db
        .update(user)
        .set({
          name: testName,
          updatedAt: new Date()
        })
        .where(eq(user.id, testUser.id))
        .returning();
      
      console.log(`   ✅ Name updated to: "${updatedUserRecord.name}"`);
      console.log(`   Updated at: ${updatedUserRecord.updatedAt}`);
      
      // Verify the update
      const [verifyUser] = await db
        .select()
        .from(user)
        .where(eq(user.id, testUser.id))
        .limit(1);
      
      console.log(`   ✅ Verification - Name in DB: "${verifyUser.name}"`);
      
      // Restore original name
      await db
        .update(user)
        .set({
          name: originalName,
          updatedAt: new Date()
        })
        .where(eq(user.id, testUser.id));
      
      console.log(`   ✅ Restored original name: "${originalName}"`);
    }
    
    console.log('\n3. API Test Instructions:');
    console.log('   To test the API endpoint, try making this request while logged in:');
    console.log('   ```');
    console.log('   curl -X PUT http://localhost:3001/api/profile \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN" \\');
    console.log('     -d \'{"name": "New Test Name"}\'');
    console.log('   ```');
    console.log('');
    console.log('   Or test in browser console:');
    console.log('   ```');
    console.log('   fetch("/api/profile", {');
    console.log('     method: "PUT",');
    console.log('     headers: { "Content-Type": "application/json" },');
    console.log('     body: JSON.stringify({ name: "New Test Name" }),');
    console.log('     credentials: "include"');
    console.log('   }).then(r => r.json()).then(console.log);');
    console.log('   ```');
    
  } catch (error) {
    console.error('❌ Error testing profile update:', error);
  }
}

testProfileUpdate().catch(console.error);