import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/connection';
import { user } from '@/db/schema/auth';
import { subscriptions, subscriptionEvents, usageTracking } from '@/db/schema/subscriptions';
import { eq } from 'drizzle-orm';

// POST /api/remove-subscription - Remove all subscriptions for a user
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
    console.log(`🗑️ Removing all subscriptions for user: ${userEmail}`);

    // Step 1: Delete usage tracking records
    await db.delete(usageTracking).where(eq(usageTracking.userId, userRecord.id));
    
    // Step 2: Delete subscription events
    const userSubscriptions = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userRecord.id));
    
    for (const sub of userSubscriptions) {
      await db.delete(subscriptionEvents).where(eq(subscriptionEvents.subscriptionId, sub.id));
    }
    
    // Step 3: Delete subscriptions
    await db.delete(subscriptions).where(eq(subscriptions.userId, userRecord.id));
    
    console.log(`✅ Deleted ${userSubscriptions.length} subscriptions`);

    return NextResponse.json({
      success: true,
      message: 'All subscriptions removed successfully',
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name
      },
      actions: {
        deletedSubscriptions: userSubscriptions.length,
        deletedUsageRecords: true,
        deletedEvents: true
      }
    });

  } catch (error) {
    console.error('❌ Subscription removal failed:', error);
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