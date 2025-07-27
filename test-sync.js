// Simple test script to sync the production user's subscription
const fetch = require('node-fetch');

async function syncSubscription() {
  try {
    console.log('🔄 Starting subscription sync for studioprisoner@gmail.com...');
    
    const response = await fetch('http://localhost:3000/api/sync-polar-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail: 'studioprisoner@gmail.com'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Sync successful!');
      console.log('📊 Summary:', result.summary);
      console.log('👤 User:', result.user);
      console.log('🎯 Results:', result.results);
    } else {
      console.log('❌ Sync failed:', result.error);
      if (result.stack) {
        console.log('📋 Stack trace:', result.stack);
      }
    }
    
  } catch (error) {
    console.error('💥 Request failed:', error.message);
  }
}

syncSubscription();