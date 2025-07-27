#!/usr/bin/env bun

/**
 * Verify if customer was created in Polar by searching with specific email
 */

import { polar } from '@/lib/polar';

async function verifyCustomer() {
  console.log('🔍 Verifying Polar Customer Creation...\n');
  
  const testEmail = 'test@gmail.com';
  
  try {
    console.log('Searching for customer:', testEmail);
    
    // Try to find the customer by email
    const customersResponse = await polar.customers.list({
      email: testEmail,
      limit: 10
    });
    
    console.log('Search results:');
    console.log('  Total found:', customersResponse.items?.length || 0);
    
    // Also try listing all customers to see if any exist
    console.log('\nListing all customers (first 10):');
    const allCustomers = await polar.customers.list({ limit: 10 });
    console.log('  Total customers in org:', allCustomers.items?.length || 0);
    
    if (customersResponse.items && customersResponse.items.length > 0) {
      customersResponse.items.forEach((customer, index) => {
        console.log(`  Customer ${index + 1}:`);
        console.log(`    ID: ${customer.id}`);
        console.log(`    Email: ${customer.email}`);
        console.log(`    Created: ${customer.createdAt}`);
        console.log(`    Metadata:`, customer.metadata);
        console.log('');
      });
    } else {
      console.log('  No customers found with this email');
    }
    
  } catch (error) {
    console.error('❌ Error searching for customer:', error);
  }
}

verifyCustomer().catch(console.error);