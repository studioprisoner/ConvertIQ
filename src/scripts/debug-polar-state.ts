#!/usr/bin/env bun

/**
 * Debug script to see current state of Polar sandbox
 * Run with: bun run src/scripts/debug-polar-state.ts
 */

import { polar } from '@/lib/polar';

async function debugPolarState() {
  console.log('🔍 Debugging Polar Sandbox State...\n');
  
  try {
    // List all customers
    console.log('1. All Customers in Polar:');
    const customersResponse = await polar.customers.list({ limit: 50 });
    
    if (customersResponse.items && customersResponse.items.length > 0) {
      console.log(`   Found ${customersResponse.items.length} customers:`);
      customersResponse.items.forEach((customer, index) => {
        console.log(`   Customer ${index + 1}:`);
        console.log(`     ID: ${customer.id}`);
        console.log(`     Email: ${customer.email}`);
        console.log(`     Name: ${customer.name || 'null'}`);
        console.log(`     Created: ${customer.createdAt}`);
        if (customer.metadata) {
          console.log(`     Metadata:`, customer.metadata);
        }
        console.log('');
      });
    } else {
      console.log('   ❌ No customers found in Polar');
    }
    
    // List all subscriptions
    console.log('2. All Subscriptions in Polar:');
    const subscriptionsResponse = await polar.subscriptions.list({ limit: 50 });
    
    if (subscriptionsResponse.items && subscriptionsResponse.items.length > 0) {
      console.log(`   Found ${subscriptionsResponse.items.length} subscriptions:`);
      subscriptionsResponse.items.forEach((subscription, index) => {
        console.log(`   Subscription ${index + 1}:`);
        console.log(`     ID: ${subscription.id}`);
        console.log(`     Customer ID: ${subscription.customerId}`);
        console.log(`     Product ID: ${subscription.productId}`);
        console.log(`     Price ID: ${subscription.priceId}`);
        console.log(`     Status: ${subscription.status}`);
        console.log(`     Current Period: ${subscription.currentPeriodStart} to ${subscription.currentPeriodEnd}`);
        if (subscription.metadata) {
          console.log(`     Metadata:`, subscription.metadata);
        }
        console.log('');
      });
    } else {
      console.log('   ❌ No subscriptions found in Polar');
    }
    
    // List products for reference
    console.log('3. Available Products in Polar:');
    try {
      const productsResponse = await polar.products.list({ limit: 20 });
      
      if (productsResponse.items && productsResponse.items.length > 0) {
        console.log(`   Found ${productsResponse.items.length} products:`);
        productsResponse.items.forEach((product, index) => {
          console.log(`   Product ${index + 1}:`);
          console.log(`     ID: ${product.id}`);
          console.log(`     Name: ${product.name}`);
          console.log(`     Description: ${product.description || 'null'}`);
          if (product.prices && product.prices.length > 0) {
            console.log(`     Prices:`);
            product.prices.forEach(price => {
              console.log(`       - ${price.id}: ${price.priceAmount} ${price.priceCurrency} (${price.type})`);
            });
          }
          console.log('');
        });
      } else {
        console.log('   ❌ No products found in Polar');
      }
    } catch (error) {
      console.log('   ❌ Error fetching products:', error);
    }
    
  } catch (error) {
    console.error('❌ Error debugging Polar state:', error);
  }
}

debugPolarState().catch(console.error);