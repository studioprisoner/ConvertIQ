#!/usr/bin/env bun

import { db } from '@/db/connection';
import { planPrices } from '@/db/schema/subscriptions';
import { eq } from 'drizzle-orm';

async function updateProductionPrices() {
  console.log('🔄 Updating plan prices for production environment...');
  
  try {
    // Get production price UUIDs from environment
    const productionPrices = {
      basic_monthly: process.env.price_basic_monthly_UUID || 'df0d68e6-a0e8-4e00-b2a8-38889bbecda7',
      basic_annual: process.env.price_basic_annual_UUID || 'f3d52f4f-1b66-46cb-a6e2-5b13f67e7a4f',
      pro_monthly: process.env.price_pro_monthly_UUID || '6c2e473b-ad5c-4374-a657-4ca6fe1df00a',
      pro_annual: process.env.price_pro_annual_UUID || '0b5d29ab-3e00-44e7-9260-0fd020b7590d'
    };

    console.log('📋 Production price IDs:');
    console.log(`  Basic Monthly: ${productionPrices.basic_monthly}`);
    console.log(`  Basic Annual: ${productionPrices.basic_annual}`);
    console.log(`  Pro Monthly: ${productionPrices.pro_monthly}`);
    console.log(`  Pro Annual: ${productionPrices.pro_annual}`);

    // Get all current plan prices
    const currentPrices = await db.select().from(planPrices);
    console.log(`\n📊 Found ${currentPrices.length} existing price records`);

    // Update Basic Plan prices
    const basicMonthlyUpdate = await db
      .update(planPrices)
      .set({ polarPriceId: productionPrices.basic_monthly })
      .where(eq(planPrices.billingInterval, 'monthly'))
      .returning();

    const basicAnnualUpdate = await db
      .update(planPrices)
      .set({ polarPriceId: productionPrices.basic_annual })
      .where(eq(planPrices.billingInterval, 'annual'))
      .returning();

    console.log('✅ Updated Basic plan prices');

    // Update Pro Plan prices (we need to be more specific since both Basic and Pro have monthly/annual)
    // Let's get the plans and update them specifically
    const allUpdatedPrices = await db.select().from(planPrices);
    
    for (const price of allUpdatedPrices) {
      let newPriceId = null;
      
      // Determine which production price ID to use based on current price
      if (price.polarPriceId === 'cf92e066-a329-44d0-bd1a-1ebf63da9c9e') {
        // Basic monthly sandbox -> production
        newPriceId = productionPrices.basic_monthly;
      } else if (price.polarPriceId === '8cc86988-7517-4e25-9eb4-d563f97b7da0') {
        // Basic annual sandbox -> production
        newPriceId = productionPrices.basic_annual;
      } else if (price.polarPriceId === '4b1d68cb-d93e-43ae-85c7-9936b7b5b01c') {
        // Pro monthly sandbox -> production
        newPriceId = productionPrices.pro_monthly;
      } else if (price.polarPriceId === '621355c8-a343-450b-bd81-fc5ed3e4a575') {
        // Pro annual sandbox -> production
        newPriceId = productionPrices.pro_annual;
      }

      if (newPriceId && price.polarPriceId !== newPriceId) {
        await db
          .update(planPrices)
          .set({ polarPriceId: newPriceId })
          .where(eq(planPrices.id, price.id));
        
        console.log(`✅ Updated price ${price.id}: ${price.polarPriceId} -> ${newPriceId}`);
      }
    }

    // Verify the updates
    console.log('\n🔍 Verification - Updated prices:');
    const finalPrices = await db.select().from(planPrices);
    for (const price of finalPrices) {
      console.log(`  ${price.billingInterval}: ${price.polarPriceId} (Plan: ${price.planId})`);
    }

    console.log('✅ Production price IDs updated successfully!');

  } catch (error) {
    console.error('❌ Error updating production prices:', error);
    throw error;
  }
}

// Run the update
if (require.main === module) {
  updateProductionPrices()
    .then(() => {
      console.log('✅ Price update completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Update failed:', error);
      process.exit(1);
    });
}