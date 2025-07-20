import { pgTable, text, timestamp, integer, boolean, uuid, jsonb } from 'drizzle-orm/pg-core';
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
  
  // Trial information
  trialStart: timestamp('trial_start'),
  trialEnd: timestamp('trial_end'),
  
  // Metadata
  metadata: jsonb('metadata'), // Store additional Polar metadata
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

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
});

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
});