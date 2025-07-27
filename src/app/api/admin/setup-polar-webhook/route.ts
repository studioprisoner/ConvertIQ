import { NextRequest, NextResponse } from 'next/server';
import { polar } from '@/lib/polar';

/**
 * Admin endpoint to set up webhook endpoint in Polar
 * This configures Polar to send webhook events to our application
 */
export async function POST(request: NextRequest) {
  try {
    const { adminKey } = await request.json();
    
    // Simple admin key check for security
    if (adminKey !== process.env.ADMIN_RECOVERY_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin key' },
        { status: 401 }
      );
    }
    
    console.log('🔄 Admin setting up Polar webhook endpoint...');
    
    const webhookUrl = `${process.env.NEXT_PUBLIC_URL}/api/webhooks/polar`;
    console.log(`📡 Webhook URL: ${webhookUrl}`);
    
    // List existing webhook endpoints
    console.log('🔍 Checking for existing webhook endpoints...');
    const existingWebhooks = await polar.webhooks.list({
      limit: 100
    });
    
    const webhooksList = [];
    for await (const webhook of existingWebhooks) {
      webhooksList.push(webhook);
    }
    
    console.log(`📋 Found ${webhooksList.length} existing webhook(s)`);
    
    // Check if we already have a webhook for our URL
    const existingWebhook = webhooksList.find(webhook => webhook.url === webhookUrl);
    
    if (existingWebhook) {
      console.log('✅ Webhook already exists for our URL');
      return NextResponse.json({
        success: true,
        message: 'Webhook already configured',
        webhook: {
          id: existingWebhook.id,
          url: existingWebhook.url,
          events: existingWebhook.events,
          hasSecret: !!existingWebhook.secret
        },
        existing: true
      });
    }
    
    // Create new webhook endpoint
    console.log('🚀 Creating new webhook endpoint...');
    
    const webhook = await polar.webhooks.create({
      url: webhookUrl,
      secret: process.env.POLAR_WEBHOOK_SECRET,
      events: [
        'subscription.created',
        'subscription.updated', 
        'subscription.canceled',
        'subscription.uncanceled',
        'subscription.revoked',
        'customer.created',
        'customer.updated',
        'checkout.created',
        'checkout.updated',
        'order.created'
      ]
    });
    
    console.log('✅ Webhook endpoint created successfully!');
    
    return NextResponse.json({
      success: true,
      message: 'Webhook endpoint created successfully',
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        hasSecret: !!webhook.secret
      },
      existing: false
    });
    
  } catch (error) {
    console.error('❌ Failed to set up Polar webhook:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to set up webhook',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}