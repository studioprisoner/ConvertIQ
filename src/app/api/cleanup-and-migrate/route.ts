import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/connection';
import { user } from '@/db/schema/auth';
import { subscriptions, subscriptionEvents, usageTracking } from '@/db/schema/subscriptions';
import { polar } from '@/lib/polar';
import { eq } from 'drizzle-orm';

// POST /api/cleanup-and-migrate - Clean up mock subscriptions and create real Polar customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail = 'josh@studioprisoner.com' } = body;

    // Get the user
    const userData = await db
      .select()
      .from(user)
      .where(eq(user.email, userEmail))
      .limit(1);

    if (userData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      });
    }

    const userRecord = userData[0];
    console.log(`🔄 Cleaning up and migrating user: ${userEmail}`);

    // Step 1: Delete all existing mock subscriptions and related data
    console.log('🗑️ Deleting existing mock subscriptions...');
    
    // Delete usage tracking records
    await db.delete(usageTracking).where(eq(usageTracking.userId, userRecord.id));
    
    // Delete subscription events
    const userSubscriptions = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userRecord.id));
    
    for (const sub of userSubscriptions) {
      await db.delete(subscriptionEvents).where(eq(subscriptionEvents.subscriptionId, sub.id));
    }
    
    // Delete subscriptions
    await db.delete(subscriptions).where(eq(subscriptions.userId, userRecord.id));
    
    console.log(`✅ Deleted ${userSubscriptions.length} mock subscriptions`);

    // Step 2: Create real Polar customer
    console.log('👤 Creating real Polar customer...');
    
    let polarCustomer;
    try {
      polarCustomer = await polar.customers.create({
        email: userRecord.email,
        name: userRecord.name || undefined,
        metadata: {
          userId: userRecord.id,
          source: 'convertiq',
          migrated: true,
          migratedAt: new Date().toISOString()
        }
      });
      console.log(`✅ Created real Polar customer: ${polarCustomer.id}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        console.log('🔍 Customer already exists in Polar, attempting to find...');
        
        // Try to find existing customer
        const existingCustomers = await polar.customers.list({
          email: userRecord.email,
          limit: 1
        });
        
        // Convert iterator to array
        const customersArray = [];
        for await (const customer of existingCustomers) {
          customersArray.push(customer);
        }
        
        if (customersArray.length > 0) {
          polarCustomer = customersArray[0];
          console.log(`✅ Found existing Polar customer: ${polarCustomer.id}`);
        } else {
          throw new Error('Customer exists in Polar but could not be found via list API');
        }
      } else {
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cleanup and migration completed successfully',
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name
      },
      polarCustomer: {
        id: polarCustomer.id,
        email: polarCustomer.email,
        name: polarCustomer.name,
        metadata: polarCustomer.metadata
      },
      actions: {
        deletedSubscriptions: userSubscriptions.length,
        createdPolarCustomer: true
      }
    });

  } catch (error) {
    console.error('❌ Cleanup and migration failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      },
      { status: 500 }
    );
  }
}