import { NextRequest, NextResponse } from 'next/server';
import { polar } from '@/lib/polar';

/**
 * Admin endpoint to list all webhook endpoints in Polar
 * This helps debug webhook configuration issues
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
    
    console.log('🔍 Admin listing all Polar webhook endpoints...');
    
    // List existing webhook endpoints
    const existingWebhooks = await polar.webhooks.list({
      limit: 100
    });
    
    const webhooksList = [];
    for await (const webhook of existingWebhooks) {
      webhooksList.push(webhook);
    }
    
    console.log(`📋 Found ${webhooksList.length} webhook endpoint(s)`);
    
    // Check for ConvertIQ webhooks specifically
    const convertiqWebhooks = webhooksList.filter(webhook => 
      webhook.url.includes('convertiq') || 
      webhook.url.includes('api/webhooks/polar')
    );
    
    const response = {
      success: true,
      total: webhooksList.length,
      webhooks: webhooksList.map(webhook => ({
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        hasSecret: !!webhook.secret,
        created_at: webhook.created_at,
        isConvertIQ: webhook.url.includes('convertiq') || webhook.url.includes('api/webhooks/polar'),
        potentialIssue: webhook.url.includes('convertiq.vercel.app') ? 'URL may not exist (causing 307 redirects)' : null
      })),
      convertiqWebhooks: convertiqWebhooks.length,
      summary: {
        totalWebhooks: webhooksList.length,
        convertiqWebhooks: convertiqWebhooks.length,
        possibleIssues: webhooksList.filter(w => w.url.includes('convertiq.vercel.app')).length
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Failed to list Polar webhooks:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to list webhooks',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}