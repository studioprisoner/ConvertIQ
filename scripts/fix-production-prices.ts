#!/usr/bin/env bun

import { db } from '@/db/connection';
import { planPrices } from '@/db/schema/subscriptions';
import { eq } from 'drizzle-orm';

async function fixProductionPrices() {
  console.log('🔧 Fixing production price IDs in database...');
  
  try {
    // Get production price UUIDs from environment
    const productionPrices = {
      basic_monthly: process.env.price_basic_monthly_UUID || 'df0d68e6-a0e8-4e00-b2a8-38889bbecda7',
      basic_annual: process.env.price_basic_annual_UUID || 'f3d52f4f-1b66-46cb-a6e2-5b13f67e7a4f',
      pro_monthly: process.env.price_pro_monthly_UUID || '6c2e473b-ad5c-4374-a657-4ca6fe1df00a',
      pro_annual: process.env.price_pro_annual_UUID || '0b5d29ab-3e00-44e7-9260-0fd020b7590d'
    };

    console.log('📋 Target production price IDs:');
    console.log(`  Basic Monthly: ${productionPrices.basic_monthly}`);
    console.log(`  Basic Annual: ${productionPrices.basic_annual}`);
    console.log(`  Pro Monthly: ${productionPrices.pro_monthly}`);
    console.log(`  Pro Annual: ${productionPrices.pro_annual}`);

    // Get all current plan prices
    const currentPrices = await db.select().from(planPrices);
    console.log(`\n📊 Found ${currentPrices.length} existing price records:`);
    
    for (const price of currentPrices) {
      console.log(`  - ID: ${price.id}, Plan: ${price.planId}, Interval: ${price.billingInterval}, Polar ID: ${price.polarPriceId}`);
    }

    // Update each placeholder with the correct production ID
    const updates = [
      {
        old: 'price_basic_monthly_placeholder',
        new: productionPrices.basic_monthly,
        description: 'Basic Monthly'
      },
      {
        old: 'price_basic_annual_placeholder', 
        new: productionPrices.basic_annual,
        description: 'Basic Annual'
      },
      {
        old: 'price_pro_monthly_placeholder',
        new: productionPrices.pro_monthly,
        description: 'Pro Monthly'
      },
      {
        old: 'price_pro_annual_placeholder',
        new: productionPrices.pro_annual,
        description: 'Pro Annual'
      }
    ];

    console.log('\n🔄 Applying updates...');
    
    for (const update of updates) {
      const result = await db
        .update(planPrices)
        .set({ polarPriceId: update.new })
        .where(eq(planPrices.polarPriceId, update.old))
        .returning();

      if (result.length > 0) {
        console.log(`✅ Updated ${update.description}: ${update.old} → ${update.new}`);
      } else {
        console.log(`⚠️  No records found for ${update.description}: ${update.old}`);
      }
    }

    // Verify the updates
    console.log('\n🔍 Verification - Updated price records:');
    const finalPrices = await db.select().from(planPrices);
    for (const price of finalPrices) {
      const isProduction = !price.polarPriceId.includes('placeholder') && !price.polarPriceId.includes('sandbox');
      const status = isProduction ? '✅' : '⚠️';
      console.log(`  ${status} ${price.billingInterval}: ${price.polarPriceId}`);
    }

    console.log('\n✅ Production price IDs update completed!');

  } catch (error) {
    console.error('❌ Error fixing production prices:', error);
    throw error;
  }
}

// Run the fix
if (require.main === module) {
  fixProductionPrices()
    .then(() => {
      console.log('✅ Price fix completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fix failed:', error);
      process.exit(1);
    });
}