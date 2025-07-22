import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/connection';
import { 
  user, 
  session, 
  account, 
  verification 
} from '@/db/schema/auth';
import { 
  subscriptions, 
  usageTracking, 
  subscriptionEvents, 
  featureUsage, 
  featureAccessAttempts 
} from '@/db/schema/subscriptions';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const cleanupSchema = z.object({
  email: z.string().email(),
  confirmDelete: z.boolean().refine((val) => val === true, {
    message: "Must confirm deletion"
  })
});

// POST /api/admin/cleanup-user - Clean up test user data
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Basic admin check - only allow josh@studioprisoner.com to use this
    if (session.user.email !== 'josh@studioprisoner.com') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = cleanupSchema.parse(body);

    console.log(`🔍 Admin cleanup request for: ${validatedData.email}`);

    // Find the user
    const [targetUser] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.email, validatedData.email))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({
        success: true,
        message: `No user found with email: ${validatedData.email}`,
        deletedRecords: 0
      });
    }

    console.log(`✅ Found user: ${targetUser.id} (${targetUser.email})`);

    let totalDeleted = 0;

    // Clean up in reverse dependency order
    
    // 1. Feature usage and access attempts
    const deletedFeatureUsage = await db
      .delete(featureUsage)
      .where(eq(featureUsage.userId, targetUser.id))
      .returning({ id: featureUsage.id });
    totalDeleted += deletedFeatureUsage.length;

    const deletedAccessAttempts = await db
      .delete(featureAccessAttempts)
      .where(eq(featureAccessAttempts.userId, targetUser.id))
      .returning({ id: featureAccessAttempts.id });
    totalDeleted += deletedAccessAttempts.length;

    // 2. Usage tracking
    const deletedUsageTracking = await db
      .delete(usageTracking)
      .where(eq(usageTracking.userId, targetUser.id))
      .returning({ id: usageTracking.id });
    totalDeleted += deletedUsageTracking.length;

    // 3. Subscription-related data
    const userSubscriptions = await db
      .select({ id: subscriptions.id, polarSubscriptionId: subscriptions.polarSubscriptionId })
      .from(subscriptions)
      .where(eq(subscriptions.userId, targetUser.id));

    const polarWarnings: string[] = [];
    
    if (userSubscriptions.length > 0) {
      // Delete subscription events first
      for (const sub of userSubscriptions) {
        const deletedEvents = await db
          .delete(subscriptionEvents)
          .where(eq(subscriptionEvents.subscriptionId, sub.id))
          .returning({ id: subscriptionEvents.id });
        totalDeleted += deletedEvents.length;
        
        if (sub.polarSubscriptionId) {
          polarWarnings.push(sub.polarSubscriptionId);
        }
      }

      // Delete subscriptions
      const deletedSubscriptions = await db
        .delete(subscriptions)
        .where(eq(subscriptions.userId, targetUser.id))
        .returning({ id: subscriptions.id });
      totalDeleted += deletedSubscriptions.length;
    }

    // 4. Auth-related data
    const deletedAccounts = await db
      .delete(account)
      .where(eq(account.userId, targetUser.id))
      .returning({ id: account.id });
    totalDeleted += deletedAccounts.length;

    const deletedSessions = await db
      .delete(session)
      .where(eq(session.userId, targetUser.id))
      .returning({ id: session.id });
    totalDeleted += deletedSessions.length;

    const deletedVerifications = await db
      .delete(verification)
      .where(eq(verification.identifier, targetUser.email))
      .returning({ id: verification.id });
    totalDeleted += deletedVerifications.length;

    // 5. Finally, delete the user
    const deletedUsers = await db
      .delete(user)
      .where(eq(user.id, targetUser.id))
      .returning({ id: user.id, email: user.email });
    totalDeleted += deletedUsers.length;

    console.log(`🎉 Cleanup completed. Deleted ${totalDeleted} total records.`);

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up user: ${validatedData.email}`,
      deletedRecords: totalDeleted,
      warnings: polarWarnings.length > 0 ? [
        `Found ${polarWarnings.length} Polar subscription(s) that may need manual cleanup: ${polarWarnings.join(', ')}`
      ] : []
    });

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Cleanup failed',
        success: false 
      },
      { status: 500 }
    );
  }
}