import { db } from '@/db/connection';
import { polar, getPlanDetails } from './polar';
import { 
  subscriptions, 
  subscriptionPlans, 
  usageTracking
} from '@/db/schema/subscriptions';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export type PlanType = 'basic' | 'pro';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  plan?: {
    name: string;
    slug: string;
    maxWebsites: number;
    maxScansPerMonth: number;
  };
  usage?: {
    websiteCount: number;
    scansThisMonth: number;
  };
}

/**
 * Get user's current subscription with plan and usage details
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    const result = await db
      .select({
        subscription: subscriptions,
        plan: subscriptionPlans,
        usage: usageTracking,
      })
      .from(subscriptions)
      .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .leftJoin(usageTracking, eq(subscriptions.id, usageTracking.subscriptionId))
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active')
        )
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (!result.length) return null;

    const { subscription, plan, usage } = result[0];

    return {
      id: subscription.id,
      userId: subscription.userId,
      planId: subscription.planId,
      status: subscription.status as SubscriptionStatus,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEnd: subscription.trialEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      plan: plan ? {
        name: plan.name,
        slug: plan.slug,
        maxWebsites: plan.maxWebsites || 1,
        maxScansPerMonth: plan.maxScansPerMonth || 1,
      } : undefined,
      usage: usage ? {
        websiteCount: usage.websiteCount || 0,
        scansThisMonth: usage.scansThisMonth || 0,
      } : undefined,
    };
  } catch (error) {
    console.error('Error getting user subscription:', error);
    return null;
  }
}

/**
 * Check if user can perform an action based on their subscription limits
 */
export async function checkSubscriptionLimits(
  userId: string,
  action: 'add_website' | 'scan_website'
): Promise<{ allowed: boolean; reason?: string; upgradeRequired?: boolean }> {
  const subscription = await getUserSubscription(userId);

  // No subscription - only allow free tier limits
  if (!subscription) {
    return {
      allowed: false,
      reason: 'No active subscription found',
      upgradeRequired: true,
    };
  }

  const { plan, usage } = subscription;
  if (!plan || !usage) {
    return {
      allowed: false,
      reason: 'Subscription data incomplete',
      upgradeRequired: true,
    };
  }

  switch (action) {
    case 'add_website':
      if (plan.maxWebsites === -1) return { allowed: true }; // Unlimited
      if (usage.websiteCount >= plan.maxWebsites) {
        return {
          allowed: false,
          reason: `Website limit reached (${plan.maxWebsites})`,
          upgradeRequired: true,
        };
      }
      return { allowed: true };

    case 'scan_website':
      if (plan.maxScansPerMonth === -1) return { allowed: true }; // Unlimited
      if (usage.scansThisMonth >= plan.maxScansPerMonth) {
        return {
          allowed: false,
          reason: `Monthly scan limit reached (${plan.maxScansPerMonth})`,
          upgradeRequired: true,
        };
      }
      return { allowed: true };

    default:
      return { allowed: false, reason: 'Unknown action' };
  }
}

/**
 * Update usage tracking when user performs an action
 */
export async function trackUsage(
  userId: string,
  action: 'add_website' | 'scan_website',
  increment: number = 1
): Promise<void> {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription) return;

    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Get or create usage tracking for current month
    let [usage] = await db
      .select()
      .from(usageTracking)
      .where(
        and(
          eq(usageTracking.userId, userId),
          eq(usageTracking.subscriptionId, subscription.id),
          gte(usageTracking.periodStart, currentMonth),
          lte(usageTracking.periodStart, nextMonth)
        )
      )
      .limit(1);

    if (!usage) {
      // Create new usage tracking record for this month
      [usage] = await db
        .insert(usageTracking)
        .values({
          userId,
          subscriptionId: subscription.id,
          websiteCount: action === 'add_website' ? increment : 0,
          scansThisMonth: action === 'scan_website' ? increment : 0,
          periodStart: currentMonth,
          periodEnd: nextMonth,
        })
        .returning();
    } else {
      // Update existing usage tracking
      const updateData = {
        updatedAt: now,
        ...(action === 'add_website' && {
          websiteCount: (usage.websiteCount || 0) + increment,
        }),
        ...(action === 'scan_website' && {
          scansThisMonth: (usage.scansThisMonth || 0) + increment,
        }),
      };

      await db
        .update(usageTracking)
        .set(updateData)
        .where(eq(usageTracking.id, usage.id));
    }
  } catch (error) {
    console.error('Error tracking usage:', error);
    // Don't throw - usage tracking shouldn't block core functionality
  }
}

/**
 * Create a checkout session for subscription upgrade/downgrade
 */
export async function createCheckoutSession(
  userId: string,
  planType: PlanType,
  _successUrl: string,
  _cancelUrl: string
) {
  try {
    const planDetails = getPlanDetails(planType);
    
    // TODO: Implement Polar checkout session creation
    // This would involve creating a product and price in Polar if they don't exist
    // and then creating a checkout session
    
    console.log('Creating checkout session for plan:', planType);
    console.log('Plan details:', planDetails);
    
    // For now, return a placeholder
    return {
      checkoutUrl: `https://checkout.polar.sh/placeholder?plan=${planType}`,
      sessionId: 'placeholder-session-id',
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw new Error('Failed to create checkout session');
  }
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(userId: string): Promise<boolean> {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription || !subscription.id) {
      throw new Error('No active subscription found');
    }

    // Get the full subscription record to get Polar ID
    const [fullSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscription.id))
      .limit(1);

    if (!fullSubscription.polarSubscriptionId) {
      throw new Error('Polar subscription ID not found');
    }

    // Cancel subscription in Polar
    await polar.subscriptions.cancel({
      id: fullSubscription.polarSubscriptionId,
    });

    // Update local database
    await db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: true,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));

    return true;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw new Error('Failed to cancel subscription');
  }
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(userId: string): Promise<boolean> {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription) {
      throw new Error('No subscription found');
    }

    // Update local database
    await db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));

    return true;
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    throw new Error('Failed to reactivate subscription');
  }
}

/**
 * Get subscription analytics/stats
 */
export async function getSubscriptionStats(userId: string) {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription) return null;

    const now = new Date();
    const daysUntilRenewal = subscription.currentPeriodEnd 
      ? Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      planName: subscription.plan?.name || 'Unknown',
      status: subscription.status,
      renewalDate: subscription.currentPeriodEnd,
      daysUntilRenewal,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      isTrialing: subscription.status === 'trialing',
      trialEnd: subscription.trialEnd,
      usage: subscription.usage,
      limits: {
        websites: subscription.plan?.maxWebsites || 0,
        scansPerMonth: subscription.plan?.maxScansPerMonth || 0,
      },
    };
  } catch (error) {
    console.error('Error getting subscription stats:', error);
    return null;
  }
}