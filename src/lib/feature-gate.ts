import { db } from '@/db/connection';
import { 
  planFeatures, 
  featureUsage, 
  featureAccessAttempts,
  subscriptions,
  subscriptionPlans
} from '@/db/schema/subscriptions';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getUserSubscription } from './subscription-service';

export type FeatureKey = 
  | 'multiple_websites'
  | 'task_management'
  | 'team_collaboration'
  | 'integrations'
  | 'advanced_reports'
  | 'custom_branding'
  | 'priority_support'
  | 'unlimited_scans'
  | 'api_access'
  | 'white_label';

export type FeatureType = 'boolean' | 'count' | 'usage';

export interface FeatureGateResult {
  hasAccess: boolean;
  upgradeRequired: boolean;
  currentUsage?: number;
  limit?: number;
  usagePercentage?: number;
  reason?: string;
  featureType: FeatureType;
}

export interface PlanFeatureDefinition {
  featureKey: FeatureKey;
  isEnabled: boolean;
  usageLimit?: number | null; // null = unlimited
  featureType: FeatureType;
  metadata?: Record<string, any>;
}

// Default feature definitions for each plan
const DEFAULT_PLAN_FEATURES: Record<string, PlanFeatureDefinition[]> = {
  basic: [
    { featureKey: 'multiple_websites', isEnabled: false, usageLimit: 1, featureType: 'count' },
    { featureKey: 'task_management', isEnabled: false, featureType: 'boolean' },
    { featureKey: 'team_collaboration', isEnabled: false, featureType: 'boolean' },
    { featureKey: 'integrations', isEnabled: false, featureType: 'boolean' },
    { featureKey: 'advanced_reports', isEnabled: false, featureType: 'boolean' },
    { featureKey: 'custom_branding', isEnabled: false, featureType: 'boolean' },
    { featureKey: 'priority_support', isEnabled: false, featureType: 'boolean' },
    { featureKey: 'unlimited_scans', isEnabled: true, usageLimit: null, featureType: 'count' },
    { featureKey: 'api_access', isEnabled: false, featureType: 'boolean' },
    { featureKey: 'white_label', isEnabled: false, featureType: 'boolean' },
  ],
  pro: [
    { featureKey: 'multiple_websites', isEnabled: true, usageLimit: null, featureType: 'count' },
    { featureKey: 'task_management', isEnabled: true, featureType: 'boolean' },
    { featureKey: 'team_collaboration', isEnabled: true, featureType: 'boolean' },
    { featureKey: 'integrations', isEnabled: true, featureType: 'boolean' },
    { featureKey: 'advanced_reports', isEnabled: true, featureType: 'boolean' },
    { featureKey: 'custom_branding', isEnabled: true, featureType: 'boolean' },
    { featureKey: 'priority_support', isEnabled: true, featureType: 'boolean' },
    { featureKey: 'unlimited_scans', isEnabled: true, usageLimit: null, featureType: 'count' },
    { featureKey: 'api_access', isEnabled: true, featureType: 'boolean' },
    { featureKey: 'white_label', isEnabled: false, featureType: 'boolean' },
  ],
};

/**
 * Initialize plan features in the database
 */
export async function seedPlanFeatures(): Promise<void> {
  try {
    // Clear existing feature definitions
    await db.delete(planFeatures);
    
    // Insert features for each plan
    for (const [planSlug, features] of Object.entries(DEFAULT_PLAN_FEATURES)) {
      const featureRecords = features.map(feature => ({
        planSlug,
        featureKey: feature.featureKey,
        isEnabled: feature.isEnabled,
        usageLimit: feature.usageLimit,
        featureType: feature.featureType,
        metadata: feature.metadata || {},
      }));
      
      await db.insert(planFeatures).values(featureRecords);
    }
    
    console.log('Plan features seeded successfully');
  } catch (error) {
    console.error('Error seeding plan features:', error);
    throw error;
  }
}

/**
 * Get feature definition for a specific plan and feature
 */
export async function getPlanFeature(planSlug: string, featureKey: FeatureKey): Promise<PlanFeatureDefinition | null> {
  try {
    const [feature] = await db
      .select()
      .from(planFeatures)
      .where(
        and(
          eq(planFeatures.planSlug, planSlug),
          eq(planFeatures.featureKey, featureKey)
        )
      )
      .limit(1);
    
    if (!feature) {
      // Fallback to default definitions if not found in database
      const defaultFeatures = DEFAULT_PLAN_FEATURES[planSlug] || DEFAULT_PLAN_FEATURES.basic;
      return defaultFeatures.find(f => f.featureKey === featureKey) || null;
    }
    
    return {
      featureKey: feature.featureKey as FeatureKey,
      isEnabled: feature.isEnabled,
      usageLimit: feature.usageLimit,
      featureType: feature.featureType as FeatureType,
      metadata: feature.metadata as Record<string, any> || {},
    };
  } catch (error) {
    console.error('Error getting plan feature:', error);
    return null;
  }
}

/**
 * Get current usage for a feature
 */
export async function getFeatureUsage(userId: string, featureName: string): Promise<number> {
  try {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    const [usage] = await db
      .select()
      .from(featureUsage)
      .where(
        and(
          eq(featureUsage.userId, userId),
          eq(featureUsage.featureName, featureName),
          gte(featureUsage.periodStart, currentMonth),
          lte(featureUsage.periodEnd, nextMonth)
        )
      )
      .limit(1);
    
    return usage?.usageCount || 0;
  } catch (error) {
    console.error('Error getting feature usage:', error);
    return 0;
  }
}

/**
 * Track feature usage
 */
export async function trackFeatureUsage(
  userId: string, 
  featureName: string, 
  increment: number = 1,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    // Check if usage record exists for current period
    const [existingUsage] = await db
      .select()
      .from(featureUsage)
      .where(
        and(
          eq(featureUsage.userId, userId),
          eq(featureUsage.featureName, featureName),
          gte(featureUsage.periodStart, currentMonth),
          lte(featureUsage.periodEnd, nextMonth)
        )
      )
      .limit(1);
    
    if (existingUsage) {
      // Update existing usage
      await db
        .update(featureUsage)
        .set({
          usageCount: existingUsage.usageCount + increment,
          lastUsed: now,
          metadata: metadata ? { ...existingUsage.metadata as object, ...metadata } : existingUsage.metadata,
        })
        .where(eq(featureUsage.id, existingUsage.id));
    } else {
      // Create new usage record
      await db.insert(featureUsage).values({
        userId,
        featureName,
        usageCount: increment,
        lastUsed: now,
        periodStart: currentMonth,
        periodEnd: nextMonth,
        metadata: metadata || {},
      });
    }
  } catch (error) {
    console.error('Error tracking feature usage:', error);
    throw error;
  }
}

/**
 * Log feature access attempt for analytics
 */
export async function logFeatureAccessAttempt(
  userId: string,
  featureKey: FeatureKey,
  accessGranted: boolean,
  userPlan: string,
  upgradePromptShown: boolean = false,
  sessionId?: string
): Promise<void> {
  try {
    await db.insert(featureAccessAttempts).values({
      userId,
      featureKey,
      accessGranted,
      userPlan,
      upgradePromptShown,
      sessionId,
    });
  } catch (error) {
    console.error('Error logging feature access attempt:', error);
    // Don't throw here as this shouldn't break the main flow
  }
}

/**
 * Check if user has access to a specific feature
 */
export async function checkFeatureAccess(
  userId: string, 
  featureKey: FeatureKey,
  sessionId?: string
): Promise<FeatureGateResult> {
  try {
    // Get user's current subscription
    const subscription = await getUserSubscription(userId);
    
    if (!subscription || !subscription.plan) {
      await logFeatureAccessAttempt(userId, featureKey, false, 'none', false, sessionId);
      return {
        hasAccess: false,
        upgradeRequired: true,
        reason: 'No active subscription',
        featureType: 'boolean',
      };
    }
    
    const planSlug = subscription.plan.slug;
    
    // Get feature definition for user's plan
    const featureDefinition = await getPlanFeature(planSlug, featureKey);
    
    if (!featureDefinition) {
      await logFeatureAccessAttempt(userId, featureKey, false, planSlug, false, sessionId);
      return {
        hasAccess: false,
        upgradeRequired: true,
        reason: 'Feature not defined for plan',
        featureType: 'boolean',
      };
    }
    
    // Check if feature is enabled for this plan
    if (!featureDefinition.isEnabled) {
      await logFeatureAccessAttempt(userId, featureKey, false, planSlug, true, sessionId);
      return {
        hasAccess: false,
        upgradeRequired: true,
        reason: `Feature not available on ${planSlug} plan`,
        featureType: featureDefinition.featureType,
      };
    }
    
    // For boolean features, if enabled = access granted
    if (featureDefinition.featureType === 'boolean') {
      await logFeatureAccessAttempt(userId, featureKey, true, planSlug, false, sessionId);
      return {
        hasAccess: true,
        upgradeRequired: false,
        featureType: 'boolean',
      };
    }
    
    // For count/usage features, check limits
    if (featureDefinition.featureType === 'count' || featureDefinition.featureType === 'usage') {
      const currentUsage = await getFeatureUsage(userId, featureKey);
      const limit = featureDefinition.usageLimit;
      
      // Unlimited access
      if (limit === null || limit === -1) {
        await logFeatureAccessAttempt(userId, featureKey, true, planSlug, false, sessionId);
        return {
          hasAccess: true,
          upgradeRequired: false,
          currentUsage,
          limit: null,
          usagePercentage: 0,
          featureType: featureDefinition.featureType,
        };
      }
      
      // Check if usage is within limit
      const hasAccess = currentUsage < limit;
      const usagePercentage = Math.round((currentUsage / limit) * 100);
      
      await logFeatureAccessAttempt(userId, featureKey, hasAccess, planSlug, !hasAccess, sessionId);
      
      return {
        hasAccess,
        upgradeRequired: !hasAccess,
        currentUsage,
        limit,
        usagePercentage,
        reason: hasAccess ? undefined : `Usage limit reached (${currentUsage}/${limit})`,
        featureType: featureDefinition.featureType,
      };
    }
    
    // Default fallback
    await logFeatureAccessAttempt(userId, featureKey, false, planSlug, false, sessionId);
    return {
      hasAccess: false,
      upgradeRequired: true,
      reason: 'Unknown feature type',
      featureType: 'boolean',
    };
  } catch (error) {
    console.error('Error checking feature access:', error);
    return {
      hasAccess: false,
      upgradeRequired: true,
      reason: 'Error checking access',
      featureType: 'boolean',
    };
  }
}

/**
 * Get all features and their access status for a user
 */
export async function getUserFeatureMap(userId: string): Promise<Record<FeatureKey, FeatureGateResult>> {
  const features: FeatureKey[] = [
    'multiple_websites',
    'task_management', 
    'team_collaboration',
    'integrations',
    'advanced_reports',
    'custom_branding',
    'priority_support',
    'unlimited_scans',
    'api_access',
    'white_label'
  ];
  
  const featureMap: Record<FeatureKey, FeatureGateResult> = {} as Record<FeatureKey, FeatureGateResult>;
  
  for (const feature of features) {
    featureMap[feature] = await checkFeatureAccess(userId, feature);
  }
  
  return featureMap;
}

/**
 * Get feature access analytics for admin dashboard
 */
export async function getFeatureAccessAnalytics(days: number = 30) {
  try {
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const attempts = await db
      .select({
        featureKey: featureAccessAttempts.featureKey,
        accessGranted: featureAccessAttempts.accessGranted,
        userPlan: featureAccessAttempts.userPlan,
        upgradePromptShown: featureAccessAttempts.upgradePromptShown,
        upgradeCompleted: featureAccessAttempts.upgradeCompleted,
        createdAt: featureAccessAttempts.createdAt,
      })
      .from(featureAccessAttempts)
      .where(gte(featureAccessAttempts.createdAt, sinceDate))
      .orderBy(desc(featureAccessAttempts.createdAt));
    
    // Group by feature and analyze conversion rates
    const analytics = attempts.reduce((acc, attempt) => {
      const feature = attempt.featureKey;
      if (!acc[feature]) {
        acc[feature] = {
          totalAttempts: 0,
          deniedAttempts: 0,
          upgradePromptsShown: 0,
          upgradeCompletions: 0,
          conversionRate: 0,
        };
      }
      
      acc[feature].totalAttempts++;
      if (!attempt.accessGranted) {
        acc[feature].deniedAttempts++;
      }
      if (attempt.upgradePromptShown) {
        acc[feature].upgradePromptsShown++;
      }
      if (attempt.upgradeCompleted) {
        acc[feature].upgradeCompletions++;
      }
      
      // Calculate conversion rate
      if (acc[feature].upgradePromptsShown > 0) {
        acc[feature].conversionRate = 
          (acc[feature].upgradeCompletions / acc[feature].upgradePromptsShown) * 100;
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    return analytics;
  } catch (error) {
    console.error('Error getting feature access analytics:', error);
    return {};
  }
}