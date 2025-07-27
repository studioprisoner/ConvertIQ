import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { polar } from '@/lib/polar';
import { db } from '@/db/connection';
import { user } from '@/db/schema/auth';
import { eq } from 'drizzle-orm';

/**
 * Manually trigger webhook processing for a user's Polar subscription
 * This helps when webhooks failed to fire or were missed
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    
    console.log(`🔄 Manually triggering webhook processing for user: ${userId} (${userEmail})`);

    // 1. Find the customer in Polar
    const customersResponse = await polar.customers.list({
      email: userEmail,
      limit: 10
    });

    const customers = customersResponse.items || [];
    if (customers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No customer found in Polar with this email'
      });
    }

    const customer = customers[0];
    console.log(`✅ Found Polar customer: ${customer.id}`);

    // 2. Get active subscriptions for this customer
    const subscriptionsResponse = await polar.subscriptions.list({
      customerId: customer.id,
      limit: 10
    });

    const polarSubscriptions = subscriptionsResponse.items || [];
    const activeSubscriptions = polarSubscriptions.filter(sub => sub.status === 'active');

    if (activeSubscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active subscriptions found in Polar for this customer'
      });
    }

    const subscription = activeSubscriptions[0];
    console.log(`✅ Found active subscription: ${subscription.id}`);

    // 3. Manually process the subscription.created webhook
    const webhookUrl = `${process.env.NEXT_PUBLIC_URL}/api/webhooks/polar`;
    
    // Create a subscription.created webhook event payload
    const webhookPayload = {
      id: `manual_${Date.now()}`,
      type: 'subscription.created',
      data: {
        id: subscription.id,
        customer_id: customer.id,
        product_id: subscription.productId,
        price_id: subscription.priceId,
        status: subscription.status,
        current_period_start: subscription.currentPeriodStart,
        current_period_end: subscription.currentPeriodEnd,
        trial_start: subscription.trialStart,
        trial_end: subscription.trialEnd,
        metadata: {
          userId: userId,
          source: 'manual_trigger',
          triggerReason: 'webhook_missed'
        }
      }
    };

    console.log(`🚀 Manually triggering webhook with payload:`, webhookPayload);

    // 4. Call our own webhook handler directly (bypassing signature verification for manual triggers)
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'polar-signature': 'manual-trigger', // This will be caught by our webhook handler
        'user-agent': 'ConvertIQ-Manual-Trigger'
      },
      body: JSON.stringify(webhookPayload)
    });

    const webhookResult = await webhookResponse.text();
    
    if (webhookResponse.ok) {
      console.log(`✅ Webhook processing successful`);
      return NextResponse.json({
        success: true,
        message: 'Webhook triggered successfully',
        subscription: {
          polarId: subscription.id,
          customerId: customer.id,
          status: subscription.status
        },
        webhookResult: webhookResult
      });
    } else {
      console.error(`❌ Webhook processing failed:`, webhookResult);
      return NextResponse.json({
        success: false,
        error: 'Webhook processing failed',
        details: webhookResult
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error triggering webhook:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger webhook',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}