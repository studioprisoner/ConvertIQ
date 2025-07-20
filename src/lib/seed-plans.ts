import { db } from '@/db/connection';
import { subscriptionPlans, planPrices } from '@/db/schema/subscriptions';
import { POLAR_CONFIG } from './polar';
import { seedPlanFeatures } from './feature-gate';

/**
 * Seed the database with subscription plans
 * Run this after database migration to set up the plans
 */
export async function seedSubscriptionPlans() {
  try {
    // Check if plans already exist
    const existingPlans = await db.select().from(subscriptionPlans);
    
    if (existingPlans.length > 0) {
      console.log('Subscription plans already exist, skipping seed');
      return;
    }

    // Insert Basic Plan
    const [basicPlan] = await db.insert(subscriptionPlans).values({
      name: POLAR_CONFIG.plans.basic.name,
      slug: 'basic',
      priceMonthly: POLAR_CONFIG.plans.basic.priceMonthly,
      priceYearly: POLAR_CONFIG.plans.basic.priceMonthly * 10, // 20% discount for annual
      features: POLAR_CONFIG.plans.basic.features,
      maxWebsites: 1,
      maxScansPerMonth: 1,
      isActive: true,
    }).returning();

    // Insert Pro Plan
    const [proPlan] = await db.insert(subscriptionPlans).values({
      name: POLAR_CONFIG.plans.pro.name,
      slug: 'pro',
      priceMonthly: POLAR_CONFIG.plans.pro.priceMonthly,
      priceYearly: POLAR_CONFIG.plans.pro.priceMonthly * 10, // 20% discount for annual
      features: POLAR_CONFIG.plans.pro.features,
      maxWebsites: -1, // Unlimited
      maxScansPerMonth: -1, // Unlimited
      isActive: true,
    }).returning();

    // Insert plan prices for Basic Plan
    await db.insert(planPrices).values([
      {
        planId: basicPlan.id,
        polarPriceId: 'price_basic_monthly_placeholder', // Replace with real Polar price IDs
        billingInterval: 'monthly',
        amount: POLAR_CONFIG.plans.basic.priceMonthly,
        currency: 'USD',
        isActive: true,
      },
      {
        planId: basicPlan.id,
        polarPriceId: 'price_basic_annual_placeholder', // Replace with real Polar price IDs
        billingInterval: 'annual',
        amount: POLAR_CONFIG.plans.basic.priceMonthly * 10,
        currency: 'USD',
        isActive: true,
      }
    ]);

    // Insert plan prices for Pro Plan
    await db.insert(planPrices).values([
      {
        planId: proPlan.id,
        polarPriceId: 'price_pro_monthly_placeholder', // Replace with real Polar price IDs
        billingInterval: 'monthly',
        amount: POLAR_CONFIG.plans.pro.priceMonthly,
        currency: 'USD',
        isActive: true,
      },
      {
        planId: proPlan.id,
        polarPriceId: 'price_pro_annual_placeholder', // Replace with real Polar price IDs
        billingInterval: 'annual',
        amount: POLAR_CONFIG.plans.pro.priceMonthly * 10,
        currency: 'USD',
        isActive: true,
      }
    ]);

    console.log('Subscription plans seeded successfully');
    
    // Also seed plan features
    await seedPlanFeatures();
    console.log('Plan features seeded successfully');
  } catch (error) {
    console.error('Error seeding subscription plans:', error);
    throw error;
  }
}

// CLI script to run seeding
if (require.main === module) {
  seedSubscriptionPlans()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}