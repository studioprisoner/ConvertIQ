#!/usr/bin/env bun

import { db } from '@/db/connection';
import { subscriptionPlans, planPrices } from '@/db/schema/subscriptions';
import { POLAR_CONFIG } from '@/lib/polar-config';

async function checkAndFixPrices() {
  console.log('🔍 Checking database state...');
  
  try {
    // Check existing plans
    const plans = await db.select().from(subscriptionPlans);
    console.log(`📊 Found ${plans.length} subscription plans:`);
    for (const plan of plans) {
      console.log(`  - ${plan.name} (${plan.slug}): ${plan.id}`);
    }

    // Check existing prices
    const prices = await db.select().from(planPrices);
    console.log(`💰 Found ${prices.length} price records:`);
    for (const price of prices) {
      console.log(`  - Plan ${price.planId}: ${price.polarPriceId} (${price.billingInterval})`);
    }

    // If we have plans but no prices, add them
    if (plans.length > 0 && prices.length === 0) {
      console.log('🔄 Adding missing price records...');
      
      const basicPlan = plans.find(p => p.slug === 'basic');
      const proPlan = plans.find(p => p.slug === 'pro');

      if (!basicPlan || !proPlan) {
        throw new Error('Could not find basic or pro plan');
      }

      // Get production price UUIDs from environment
      const productionPrices = {
        basic_monthly: process.env.price_basic_monthly_UUID || 'df0d68e6-a0e8-4e00-b2a8-38889bbecda7',
        basic_annual: process.env.price_basic_annual_UUID || 'f3d52f4f-1b66-46cb-a6e2-5b13f67e7a4f',
        pro_monthly: process.env.price_pro_monthly_UUID || '6c2e473b-ad5c-4374-a657-4ca6fe1df00a',
        pro_annual: process.env.price_pro_annual_UUID || '0b5d29ab-3e00-44e7-9260-0fd020b7590d'
      };

      // Add Basic Plan prices
      await db.insert(planPrices).values([
        {
          planId: basicPlan.id,
          polarPriceId: productionPrices.basic_monthly,
          billingInterval: 'monthly',
          amount: POLAR_CONFIG.plans.basic.priceMonthly,
          currency: 'USD',
          isActive: true,
        },
        {
          planId: basicPlan.id,
          polarPriceId: productionPrices.basic_annual,
          billingInterval: 'annual',
          amount: POLAR_CONFIG.plans.basic.priceMonthly * 10,
          currency: 'USD',
          isActive: true,
        }
      ]);

      // Add Pro Plan prices
      await db.insert(planPrices).values([
        {
          planId: proPlan.id,
          polarPriceId: productionPrices.pro_monthly,
          billingInterval: 'monthly',
          amount: POLAR_CONFIG.plans.pro.priceMonthly,
          currency: 'USD',
          isActive: true,
        },
        {
          planId: proPlan.id,
          polarPriceId: productionPrices.pro_annual,
          billingInterval: 'annual',
          amount: POLAR_CONFIG.plans.pro.priceMonthly * 10,
          currency: 'USD',
          isActive: true,
        }
      ]);

      console.log('✅ Added production price records');

      // Verify the additions
      const newPrices = await db.select().from(planPrices);
      console.log(`\n🔍 Updated price records (${newPrices.length} total):`);
      for (const price of newPrices) {
        const plan = plans.find(p => p.id === price.planId);
        console.log(`  - ${plan?.name} ${price.billingInterval}: ${price.polarPriceId}`);
      }
    }

    console.log('✅ Database check completed');

  } catch (error) {
    console.error('❌ Error checking database:', error);
    throw error;
  }
}

// Run the check
if (require.main === module) {
  checkAndFixPrices()
    .then(() => {
      console.log('✅ Check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Check failed:', error);
      process.exit(1);
    });
}