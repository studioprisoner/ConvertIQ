import { db } from '@/db/connection';
import { subscriptionPlans, planPrices } from '@/db/schema/subscriptions';
import { seedSubscriptionPlans } from './seed-plans';

/**
 * Clear existing plans and re-seed with current environment configuration
 */
async function reseedPlans() {
  try {
    console.log('🗑️ Clearing existing subscription plans...');
    
    // Delete existing plan prices and plans
    await db.delete(planPrices);
    await db.delete(subscriptionPlans);
    
    console.log('✅ Cleared existing data');
    console.log(`🔧 Environment: ${process.env.POLAR_ENVIRONMENT || 'sandbox'}`);
    
    // Re-seed with current environment
    await seedSubscriptionPlans();
    
    console.log('🎉 Successfully re-seeded subscription plans');
  } catch (error) {
    console.error('❌ Error re-seeding plans:', error);
    throw error;
  }
}

// CLI script to run re-seeding
if (require.main === module) {
  reseedPlans()
    .then(() => {
      console.log('Re-seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Re-seeding failed:', error);
      process.exit(1);
    });
}

export { reseedPlans };