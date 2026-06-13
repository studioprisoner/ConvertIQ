import { pgTable, text, timestamp, integer, boolean, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { user } from './auth';

// Subscription plans table
export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // 'Basic Plan', 'Pro Plan'
  slug: text('slug').notNull().unique(), // 'basic', 'pro'
  priceMonthly: integer('price_monthly').notNull(), // Price in cents
  priceYearly: integer('price_yearly'), // Optional yearly pricing
  features: jsonb('features').notNull(), // Array of feature strings
  maxWebsites: integer('max_websites').default(1), // 1 for basic, unlimited (-1) for pro
  maxScansPerMonth: integer('max_scans_per_month').default(1), // 1 for basic, unlimited (-1) for pro
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// User subscriptions table
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').notNull().references(() => subscriptionPlans.id),
  
  // Polar integration fields
  polarSubscriptionId: text('polar_subscription_id').unique(),
  polarCustomerId: text('polar_customer_id'),
  polarProductId: text('polar_product_id'),
  polarPriceId: text('polar_price_id'),
  
  // Subscription status
  status: text('status').notNull().default('active'), // active, canceled, past_due, incomplete, trialing
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  canceledAt: timestamp('canceled_at'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  
  // Billing cycle
  billingCycle: text('billing_cycle').default('monthly'), // monthly, annual
  
  // Trial information
  trialStart: timestamp('trial_start'),
  trialEnd: timestamp('trial_end'),
  
  // Metadata
  metadata: jsonb('metadata'), // Store additional Polar metadata

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  // FK checked on every feature-gated procedure
  index('subscriptions_user_id_idx').on(table.userId),
  // Common lookup: active subscription for a user
  index('subscriptions_user_status_idx').on(table.userId, table.status),
]);

// Plan prices mapping to Polar
export const planPrices = pgTable('plan_prices', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => subscriptionPlans.id, { onDelete: 'cascade' }),
  polarPriceId: text('polar_price_id').unique(),
  billingInterval: text('billing_interval').notNull(), // monthly, annual
  amount: integer('amount').notNull(), // in cents
  currency: text('currency').default('USD'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('plan_prices_plan_id_idx').on(table.planId),
]);

// Usage tracking table for monitoring plan limits
export const usageTracking = pgTable('usage_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'cascade' }),
  
  // Usage metrics
  websiteCount: integer('website_count').default(0),
  scansThisMonth: integer('scans_this_month').default(0),
  
  // Tracking period
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('usage_tracking_user_id_idx').on(table.userId),
]);

// Subscription events for audit trail
export const subscriptionEvents = pgTable('subscription_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscriptionId: uuid('subscription_id').notNull().references(() => subscriptions.id, { onDelete: 'cascade' }),
  
  // Event details
  eventType: text('event_type').notNull(), // subscription.created, subscription.updated, subscription.canceled, etc.
  eventData: jsonb('event_data'), // Store full webhook payload
  
  // Polar webhook info
  polarEventId: text('polar_event_id'),
  processed: boolean('processed').default(false),

  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('subscription_events_subscription_id_idx').on(table.subscriptionId),
]);

// Plan feature definitions for granular feature gating
export const planFeatures = pgTable('plan_features', {
  id: uuid('id').primaryKey().defaultRandom(),
  planSlug: text('plan_slug').notNull(), // 'basic', 'pro', 'enterprise'
  featureKey: text('feature_key').notNull(), // 'multiple_websites', 'task_management', 'integrations'
  isEnabled: boolean('is_enabled').default(true),
  usageLimit: integer('usage_limit'), // null = unlimited, number = specific limit
  featureType: text('feature_type').notNull().default('boolean'), // 'boolean', 'count', 'usage'
  metadata: jsonb('metadata'), // Additional feature configuration
  createdAt: timestamp('created_at').defaultNow(),
});

// Feature usage tracking for detailed analytics
export const featureUsage = pgTable('feature_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  featureName: text('feature_name').notNull(),
  usageCount: integer('usage_count').default(0),
  lastUsed: timestamp('last_used'),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  metadata: jsonb('metadata'), // Store additional usage context
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('feature_usage_user_id_idx').on(table.userId),
]);

// Feature access attempts for conversion analytics
export const featureAccessAttempts = pgTable('feature_access_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  featureKey: text('feature_key').notNull(),
  accessGranted: boolean('access_granted'),
  userPlan: text('user_plan'),
  upgradePromptShown: boolean('upgrade_prompt_shown').default(false),
  upgradeCompleted: boolean('upgrade_completed').default(false),
  sessionId: text('session_id'), // Track user session for funnel analysis
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('feature_access_attempts_user_id_idx').on(table.userId),
]);