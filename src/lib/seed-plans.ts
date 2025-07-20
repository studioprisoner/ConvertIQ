import { db } from '@/db/connection';
import { subscriptionPlans } from '@/db/schema/subscriptions';
import { POLAR_CONFIG } from './polar';

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
    await db.insert(subscriptionPlans).values({
      name: POLAR_CONFIG.plans.basic.name,
      slug: 'basic',
      priceMonthly: POLAR_CONFIG.plans.basic.priceMonthly,
      priceYearly: null, // We can add yearly pricing later
      features: POLAR_CONFIG.plans.basic.features,
      maxWebsites: 1,
      maxScansPerMonth: 1,
      isActive: true,
    });

    // Insert Pro Plan
    await db.insert(subscriptionPlans).values({
      name: POLAR_CONFIG.plans.pro.name,
      slug: 'pro',
      priceMonthly: POLAR_CONFIG.plans.pro.priceMonthly,
      priceYearly: null, // We can add yearly pricing later
      features: POLAR_CONFIG.plans.pro.features,
      maxWebsites: -1, // Unlimited
      maxScansPerMonth: -1, // Unlimited
      isActive: true,
    });

    console.log('Subscription plans seeded successfully');
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