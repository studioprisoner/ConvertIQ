import { db } from '@/db/connection';
import { planPrices } from '@/db/schema/subscriptions';
import { eq } from 'drizzle-orm';

const PRICE_UUID_MAPPING = {
  'price_sandbox_basic_monthly': 'cf92e066-a329-44d0-bd1a-1ebf63da9c9e',
  'price_sandbox_basic_annual': '8cc86988-7517-4e25-9eb4-d563f97b7da0',
  'price_sandbox_pro_monthly': '4b1d68cb-d93e-43ae-85c7-9936b7b5b01c',
  'price_sandbox_pro_annual': '621355c8-a343-450b-bd81-fc5ed3e4a575'
};

async function updatePolarUUIDs() {
  try {
    console.log('🔄 Updating Polar price IDs with real UUIDs...');
    
    for (const [oldId, newId] of Object.entries(PRICE_UUID_MAPPING)) {
      const result = await db
        .update(planPrices)
        .set({ polarPriceId: newId })
        .where(eq(planPrices.polarPriceId, oldId));
        
      console.log(`✅ Updated ${oldId} → ${newId}`);
    }
    
    // Verify updates
    const allPrices = await db.select().from(planPrices);
    console.log('\n📋 Current price IDs in database:');
    allPrices.forEach(price => {
      console.log(`  ${price.billingInterval} ${price.planId}: ${price.polarPriceId}`);
    });
    
    console.log('\n🎉 Polar UUID update completed successfully!');
  } catch (error) {
    console.error('❌ Error updating Polar UUIDs:', error);
    throw error;
  }
}

export { updatePolarUUIDs };

// Run if called directly
if (require.main === module) {
  updatePolarUUIDs()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}