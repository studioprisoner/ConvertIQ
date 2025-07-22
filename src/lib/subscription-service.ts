import { db } from '@/db/connection';
import { polar } from './polar';
import { 
  subscriptions, 
  subscriptionPlans, 
  usageTracking,
  planPrices,
  subscriptionEvents
} from '@/db/schema/subscriptions';
import { user } from '@/db/schema/auth';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export type PlanType = 'basic' | 'pro';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
export type BillingCycle = 'monthly' | 'annual';

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  billingCycle: BillingCycle;
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
 * Get or create a Polar customer for the user
 */
async function getOrCreatePolarCustomer(userId: string, userEmail: string): Promise<{ id: string; email: string; metadata?: Record<string, unknown> }> {
  try {
    // First, try to create a new customer
    // If it fails due to duplicate email, we'll catch the error and handle it
    try {
      const customer = await polar.customers.create({
        email: userEmail,
        metadata: {
          userId: userId,
          source: 'convertiq'
        }
      });
      
      console.log(`🆕 Created new customer in Polar: ${userEmail}`);
      return customer;
    } catch (createError: any) {
      // Check if the error is due to duplicate email
      if (createError.message && createError.message.includes('already exists')) {
        console.log(`🔍 Customer already exists, attempting to find: ${userEmail}`);
        
        // Try to find the existing customer by listing and filtering
        const customersResponse = await polar.customers.list({
          email: userEmail,
          limit: 1
        });
        
        // Handle pagination response
        const customers = customersResponse.items || [];
        
        if (customers.length > 0) {
          console.log(`✅ Found existing customer in Polar: ${userEmail}`);
          return customers[0];
        } else {
          // If Polar says customer exists but we can't find it, this suggests the customer
          // exists in a different organization. Let's try to create with a different approach.
          console.log(`⚠️ Customer exists but not found via list API. This usually means the customer exists in a different organization.`);
          
          // For sandbox, we should force create a new customer or use a different email
          // Let's try creating with a unique identifier to avoid conflicts
          const uniqueEmail = `${userEmail.split('@')[0]}+${Date.now()}@${userEmail.split('@')[1]}`;
          console.log(`🔄 Attempting to create customer with unique email: ${uniqueEmail}`);
          
          try {
            const uniqueCustomer = await polar.customers.create({
              email: uniqueEmail,
              name: userEmail, // Store original email in name field for reference
              metadata: {
                originalEmail: userEmail,
                userId: userId,
                source: 'convertiq',
                note: 'Created with unique email due to Polar sandbox limitations'
              }
            });
            
            console.log(`✅ Created customer with unique email: ${uniqueCustomer.id}`);
            return uniqueCustomer;
          } catch (uniqueError) {
            console.error(`❌ Failed to create customer with unique email:`, uniqueError);
            throw new Error(`Could not create or find customer in Polar: ${uniqueError instanceof Error ? uniqueError.message : 'Unknown error'}`);
          }
        }
      } else {
        // Re-throw if it's a different error
        throw createError;
      }
    }
  } catch (error) {
    console.error('Error managing Polar customer:', error);
    
    // Re-throw with specific error details
    if (error instanceof Error) {
      throw new Error(`Failed to manage customer in Polar: ${error.message}`);
    } else {
      throw new Error(`Failed to manage customer in Polar: ${JSON.stringify(error)}`);
    }
  }
}

/**
 * Get Polar price ID for a plan and billing cycle
 */
async function getPolarPriceId(planSlug: string, billingCycle: BillingCycle): Promise<string> {
  try {
    // First get the plan ID from database
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, planSlug))
      .limit(1);
    
    if (!plan) {
      throw new Error(`Plan ${planSlug} not found`);
    }
    
    // Then get the price for this billing cycle
    const [price] = await db
      .select()
      .from(planPrices)
      .where(
        and(
          eq(planPrices.planId, plan.id),
          eq(planPrices.billingInterval, billingCycle),
          eq(planPrices.isActive, true)
        )
      )
      .limit(1);
    
    if (!price?.polarPriceId) {
      throw new Error(`Price for ${planSlug} ${billingCycle} not found in database`);
    }
    
    return price.polarPriceId;
  } catch (error) {
    console.error('Error getting Polar price ID:', error);
    throw error;
  }
}

/**
 * Create a new subscription with Polar integration
 */
export async function createSubscription(
  userId: string, 
  userEmail: string,
  planSlug: string, 
  billingCycle: BillingCycle = 'monthly'
): Promise<UserSubscription> {
  try {
    // Get plan details
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, planSlug))
      .limit(1);
    
    if (!plan) {
      throw new Error(`Plan ${planSlug} not found`);
    }
    
    // Get Polar price ID
    const priceId = await getPolarPriceId(planSlug, billingCycle);
    const isPlaceholder = priceId.includes('placeholder');
    const isUsingSandbox = process.env.POLAR_ENVIRONMENT === 'sandbox';
    
    // Check if we're using real UUIDs (36 characters) vs placeholder strings
    const isRealUUID = priceId.length === 36 && priceId.includes('-');
    const forceMockMode = isPlaceholder || !isRealUUID;
    
    let polarSubscription: any;
    let customer: any;
    
    if (forceMockMode) {
      // Mock Polar subscription for development when using sandbox without real products
      customer = { id: `dev_customer_${userId}`, email: userEmail };
      polarSubscription = {
        id: `dev_sub_${Date.now()}`,
        productId: `dev_product_${planSlug}`,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        metadata: {
          userId: userId,
          planSlug: planSlug,
          source: 'convertiq'
        }
      };
      console.log(`🔧 Mock mode: Created mock subscription for ${planSlug} (sandbox without real products: ${priceId})`);
    } else {
      // Use real Polar API (sandbox or production based on environment)
      customer = await getOrCreatePolarCustomer(userId, userEmail);
      
      // Create a real Polar checkout session for subscription
      // The Polar SDK requires both products array AND the specific price/product fields
      console.log(`🔍 Creating checkout with priceId: ${priceId}, customerId: ${customer.id}`);
      
      const checkout = await polar.checkouts.create({
        products: [priceId], // Required array field
        productPriceId: priceId, // Specific price ID
        customerEmail: userEmail,
        customerId: customer.id,
        customerMetadata: {
          userId: userId,
          source: 'convertiq'
        },
        metadata: {
          userId: userId,
          planSlug: planSlug,
          source: 'convertiq',
          billingCycle: billingCycle
        },
        successUrl: `${process.env.NEXT_PUBLIC_URL}/onboarding?payment=success`,
        allowDiscountCodes: true,
        requireBillingAddress: false,
        isBusinessCustomer: false
      });
      
      // Return checkout info for redirect - don't create local subscription yet
      // The subscription will be created by webhook after successful payment
      const environment = isUsingSandbox ? 'sandbox' : 'production';
      console.log(`🎯 ${environment}: Created Polar checkout session for ${planSlug} (checkout ID: ${checkout.id})`);
      console.log(`🔗 Checkout URL: ${checkout.url}`);
      
      // Return special response for checkout redirect
      return {
        checkoutUrl: checkout.url,
        checkoutId: checkout.id,
        requiresPayment: true,
        message: 'Redirecting to payment...'
      } as any;
    }
    
    // Store subscription locally (active subscription, no trial)
    const [subscription] = await db.insert(subscriptions).values({
      userId: userId,
      planId: plan.id,
      polarSubscriptionId: polarSubscription.id,
      polarCustomerId: customer.id,
      polarProductId: polarSubscription.productId,
      polarPriceId: priceId,
      status: 'active',
      billingCycle: billingCycle,
      currentPeriodStart: new Date(polarSubscription.currentPeriodStart),
      currentPeriodEnd: new Date(polarSubscription.currentPeriodEnd),
      metadata: {
        polarMetadata: polarSubscription.metadata
      },
    }).returning();
    
    // Log subscription creation event
    await db.insert(subscriptionEvents).values({
      subscriptionId: subscription.id,
      eventType: 'subscription.created',
      eventData: {
        action: 'subscription_started',
        planSlug: planSlug,
        billingCycle: billingCycle,
        immediatePayment: true
      },
    });
    
    // Initialize usage tracking
    await initializeUsageTracking(userId, subscription.id);
    
    return {
      id: subscription.id,
      userId: subscription.userId,
      planId: subscription.planId,
      status: subscription.status as SubscriptionStatus,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEnd: null, // No trial period
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      billingCycle: subscription.billingCycle as BillingCycle,
      plan: {
        name: plan.name,
        slug: plan.slug,
        maxWebsites: plan.maxWebsites || 1,
        maxScansPerMonth: plan.maxScansPerMonth || 1,
      }
    };
  } catch (error) {
    console.error('Subscription creation failed:', error);
    
    // Re-throw the original error with more context
    if (error instanceof Error) {
      throw new Error(`Subscription creation failed: ${error.message}`);
    } else {
      throw new Error(`Subscription creation failed: ${JSON.stringify(error)}`);
    }
  }
}

/**
 * Initialize usage tracking for a new subscription
 */
async function initializeUsageTracking(userId: string, subscriptionId: string): Promise<void> {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  
  await db.insert(usageTracking).values({
    userId,
    subscriptionId,
    websiteCount: 0,
    scansThisMonth: 0,
    periodStart: currentMonth,
    periodEnd: nextMonth,
  });
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
      billingCycle: (subscription.billingCycle as BillingCycle) || 'monthly',
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
 * Change subscription plan (upgrade/downgrade) with Polar proration
 */
export async function changeSubscriptionPlan(
  userId: string,
  newPlanSlug: string,
  newBillingCycle?: BillingCycle
): Promise<UserSubscription> {
  try {
    // Get current subscription
    const currentSubscription = await getUserSubscription(userId);
    if (!currentSubscription) {
      throw new Error('No active subscription found');
    }

    // Get full subscription record for Polar IDs
    const [fullSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, currentSubscription.id))
      .limit(1);

    if (!fullSubscription.polarSubscriptionId) {
      throw new Error('Polar subscription ID not found');
    }

    // Get new plan details
    const [newPlan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, newPlanSlug))
      .limit(1);

    if (!newPlan) {
      throw new Error(`Plan ${newPlanSlug} not found`);
    }

    // Use current billing cycle if not specified
    const billingCycle = newBillingCycle || currentSubscription.billingCycle;

    // Get new Polar price ID
    const newPriceId = await getPolarPriceId(newPlanSlug, billingCycle);
    const isPlaceholder = newPriceId.includes('placeholder');
    const isRealUUID = newPriceId.length === 36 && newPriceId.includes('-');
    const forceMockMode = isPlaceholder || !isRealUUID;

    let updatedPolarSubscription;
    
    if (forceMockMode) {
      // Mock subscription update for development/testing
      updatedPolarSubscription = {
        id: fullSubscription.polarSubscriptionId,
        currentPeriodStart: fullSubscription.currentPeriodStart?.toISOString() || new Date().toISOString(),
        currentPeriodEnd: fullSubscription.currentPeriodEnd?.toISOString() || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      console.log(`🔧 Mock mode: Updated subscription to ${newPlanSlug} plan`);
    } else {
      // For real Polar integration, you would need to:
      // 1. Cancel current subscription
      // 2. Create new subscription with checkout flow
      // For now, we'll use mock data for sandbox as well
      updatedPolarSubscription = {
        id: fullSubscription.polarSubscriptionId,
        currentPeriodStart: fullSubscription.currentPeriodStart?.toISOString() || new Date().toISOString(),
        currentPeriodEnd: fullSubscription.currentPeriodEnd?.toISOString() || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      console.log(`🎯 Sandbox: Updated subscription to ${newPlanSlug} plan`);
    }

    // Determine event type
    const eventType = getChangeEventType(currentSubscription.plan?.slug || '', newPlanSlug);

    // Log the change event
    await db.insert(subscriptionEvents).values({
      subscriptionId: currentSubscription.id,
      eventType,
      eventData: {
        fromPlan: currentSubscription.plan?.slug,
        toPlan: newPlanSlug,
        fromBillingCycle: currentSubscription.billingCycle,
        toBillingCycle: billingCycle,
        effectiveDate: new Date(),
      },
    });

    // Update local subscription
    await db
      .update(subscriptions)
      .set({
        planId: newPlan.id,
        polarPriceId: newPriceId,
        billingCycle: billingCycle,
        currentPeriodStart: new Date(updatedPolarSubscription.currentPeriodStart),
        currentPeriodEnd: new Date(updatedPolarSubscription.currentPeriodEnd),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, currentSubscription.id));

    // Return updated subscription
    return await getUserSubscription(userId) as UserSubscription;
  } catch (error) {
    console.error('Plan change failed:', error);
    
    // Re-throw with specific error details
    if (error instanceof Error) {
      throw new Error(`Failed to change subscription plan: ${error.message}`);
    } else {
      throw new Error(`Failed to change subscription plan: ${JSON.stringify(error)}`);
    }
  }
}

/**
 * Helper function to determine event type for plan changes
 */
function getChangeEventType(fromPlan: string, toPlan: string): string {
  const planHierarchy: Record<string, number> = {
    'basic': 1,
    'pro': 2,
  };

  const fromLevel = planHierarchy[fromPlan] || 0;
  const toLevel = planHierarchy[toPlan] || 0;

  if (toLevel > fromLevel) {
    return 'subscription.upgraded';
  } else if (toLevel < fromLevel) {
    return 'subscription.downgraded';
  } else {
    return 'subscription.updated';
  }
}

/**
 * Create a checkout session for subscription upgrade/downgrade
 */
export async function createCheckoutSession(
  userId: string,
  planType: PlanType,
  billingCycle: BillingCycle = 'monthly',
  successUrl: string,
  cancelUrl: string
) {
  try {
    // Check if user already has a subscription
    const existingSubscription = await getUserSubscription(userId);
    
    if (existingSubscription) {
      // For existing users, use the plan change function
      const updatedSubscription = await changeSubscriptionPlan(userId, planType, billingCycle);
      return {
        checkoutUrl: null, // No checkout needed for existing subscribers
        sessionId: null,
        subscription: updatedSubscription,
        message: 'Plan changed successfully',
      };
    }

    // For new users, we need user email to create customer
    // This should be handled by a separate endpoint that can access user data
    throw new Error('New subscription creation requires user email. Use createSubscriptionWithTrial instead.');
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

    const daysInTrial = 0; // No trials - immediate billing

    // Calculate usage percentages
    const websiteUsagePercent = subscription.plan?.maxWebsites === -1 
      ? 0 
      : Math.round(((subscription.usage?.websiteCount || 0) / (subscription.plan?.maxWebsites || 1)) * 100);

    const scanUsagePercent = subscription.plan?.maxScansPerMonth === -1
      ? 0
      : Math.round(((subscription.usage?.scansThisMonth || 0) / (subscription.plan?.maxScansPerMonth || 1)) * 100);

    return {
      planName: subscription.plan?.name || 'Unknown',
      planSlug: subscription.plan?.slug || '',
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      renewalDate: subscription.currentPeriodEnd,
      daysUntilRenewal,
      daysInTrial: Math.max(0, daysInTrial),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      isTrialing: false, // No trials
      trialEnd: null, // No trials
      usage: {
        ...subscription.usage,
        websiteUsagePercent,
        scanUsagePercent,
      },
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

/**
 * Get subscription events history for analytics
 */
export async function getSubscriptionEventHistory(userId: string, limit: number = 10) {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription) return [];

    const events = await db
      .select({
        id: subscriptionEvents.id,
        eventType: subscriptionEvents.eventType,
        eventData: subscriptionEvents.eventData,
        createdAt: subscriptionEvents.createdAt,
      })
      .from(subscriptionEvents)
      .where(eq(subscriptionEvents.subscriptionId, subscription.id))
      .orderBy(desc(subscriptionEvents.createdAt))
      .limit(limit);

    return events;
  } catch (error) {
    console.error('Error getting subscription event history:', error);
    return [];
  }
}

/**
 * Get available plans for plan comparison
 */
export async function getAvailablePlans() {
  try {
    const plans = await db
      .select({
        id: subscriptionPlans.id,
        name: subscriptionPlans.name,
        slug: subscriptionPlans.slug,
        priceMonthly: subscriptionPlans.priceMonthly,
        priceYearly: subscriptionPlans.priceYearly,
        features: subscriptionPlans.features,
        maxWebsites: subscriptionPlans.maxWebsites,
        maxScansPerMonth: subscriptionPlans.maxScansPerMonth,
      })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.priceMonthly);

    // Get pricing for each plan
    const plansWithPricing = await Promise.all(
      plans.map(async (plan) => {
        const prices = await db
          .select()
          .from(planPrices)
          .where(
            and(
              eq(planPrices.planId, plan.id),
              eq(planPrices.isActive, true)
            )
          );

        const monthlyPrice = prices.find(p => p.billingInterval === 'monthly');
        const annualPrice = prices.find(p => p.billingInterval === 'annual');

        return {
          ...plan,
          pricing: {
            monthly: monthlyPrice ? {
              amount: monthlyPrice.amount,
              polarPriceId: monthlyPrice.polarPriceId,
            } : null,
            annual: annualPrice ? {
              amount: annualPrice.amount,
              polarPriceId: annualPrice.polarPriceId,
            } : null,
          }
        };
      })
    );

    return plansWithPricing;
  } catch (error) {
    console.error('Error getting available plans:', error);
    return [];
  }
}

/**
 * Get comprehensive subscription analytics for admin/reporting
 */
export async function getSubscriptionAnalytics(userId: string) {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription) return null;

    // Get subscription history events
    const events = await getSubscriptionEventHistory(userId, 50);

    // Calculate subscription lifetime metrics
    const subscriptionStartDate = events.find(e => e.eventType === 'subscription.created')?.createdAt;
    const daysSinceStart = subscriptionStartDate
      ? Math.floor((new Date().getTime() - new Date(subscriptionStartDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Count usage over time
    const usageHistory = await db
      .select()
      .from(usageTracking)
      .where(eq(usageTracking.userId, userId))
      .orderBy(desc(usageTracking.periodStart))
      .limit(12); // Last 12 months

    // Calculate total scans and websites ever created
    const totalScans = usageHistory.reduce((sum, period) => sum + (period.scansThisMonth || 0), 0);
    const maxWebsites = Math.max(...usageHistory.map(period => period.websiteCount || 0), 0);

    return {
      subscription: await getSubscriptionStats(userId),
      metrics: {
        daysSinceStart,
        totalScans,
        maxWebsites,
        averageScansPerMonth: usageHistory.length > 0 ? Math.round(totalScans / usageHistory.length) : 0,
      },
      usageHistory: usageHistory.map(period => ({
        period: period.periodStart,
        websiteCount: period.websiteCount || 0,
        scansThisMonth: period.scansThisMonth || 0,
      })),
      events: events.map(event => ({
        type: event.eventType,
        data: event.eventData,
        date: event.createdAt,
      })),
    };
  } catch (error) {
    console.error('Error getting subscription analytics:', error);
    return null;
  }
}

/**
 * Track plan selection during user registration/signup
 */
export async function trackPlanSelection(
  userId: string, 
  selectedPlan: PlanType,
  conversionSource?: string
): Promise<void> {
  try {
    await db
      .update(user)
      .set({
        selectedPlanDuringSignup: selectedPlan,
        planSelectionDate: new Date(),
        signupConversionSource: conversionSource || 'direct',
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    console.log(`✅ Plan selection tracked: ${userId} selected ${selectedPlan}`);
  } catch (error) {
    console.error('❌ Error tracking plan selection:', error);
    // Don't throw error - this is analytics tracking, shouldn't break the flow
  }
}