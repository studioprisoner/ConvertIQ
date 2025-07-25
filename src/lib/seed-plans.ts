import { db } from '@/db/connection';
import { subscriptionPlans, planPrices } from '@/db/schema/subscriptions';
import { POLAR_CONFIG } from './polar-config';
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
        polarPriceId: process.env.POLAR_ENVIRONMENT === 'sandbox' 
          ? 'cf92e066-a329-44d0-bd1a-1ebf63da9c9e' 
          : process.env.price_basic_monthly_UUID || 'df0d68e6-a0e8-4e00-b2a8-38889bbecda7',
        billingInterval: 'monthly',
        amount: POLAR_CONFIG.plans.basic.priceMonthly,
        currency: 'USD',
        isActive: true,
      },
      {
        planId: basicPlan.id,
        polarPriceId: process.env.POLAR_ENVIRONMENT === 'sandbox' 
          ? '8cc86988-7517-4e25-9eb4-d563f97b7da0' 
          : process.env.price_basic_annual_UUID || 'f3d52f4f-1b66-46cb-a6e2-5b13f67e7a4f',
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
        polarPriceId: process.env.POLAR_ENVIRONMENT === 'sandbox' 
          ? '4b1d68cb-d93e-43ae-85c7-9936b7b5b01c' 
          : process.env.price_pro_monthly_UUID || '6c2e473b-ad5c-4374-a657-4ca6fe1df00a',
        billingInterval: 'monthly',
        amount: POLAR_CONFIG.plans.pro.priceMonthly,
        currency: 'USD',
        isActive: true,
      },
      {
        planId: proPlan.id,
        polarPriceId: process.env.POLAR_ENVIRONMENT === 'sandbox' 
          ? '621355c8-a343-450b-bd81-fc5ed3e4a575' 
          : process.env.price_pro_annual_UUID || '0b5d29ab-3e00-44e7-9260-0fd020b7590d',
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