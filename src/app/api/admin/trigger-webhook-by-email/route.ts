import { NextRequest, NextResponse } from 'next/server';
import { polar } from '@/lib/polar';
import { db } from '@/db/connection';
import { user } from '@/db/schema/auth';
import { eq } from 'drizzle-orm';

/**
 * Admin endpoint to manually trigger webhook processing for a user by email
 * Used for recovery when webhooks fail
 */
export async function POST(request: NextRequest) {
  try {
    const { userEmail, adminKey } = await request.json();
    
    // Simple admin key check for security
    if (adminKey !== process.env.ADMIN_RECOVERY_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin key' },
        { status: 401 }
      );
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email required' },
        { status: 400 }
      );
    }
    
    console.log(`🔄 Admin triggering webhook processing for email: ${userEmail}`);

    // 1. Find the user in our database
    const [dbUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, userEmail))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found in database'
      });
    }

    console.log(`✅ Found user in database: ${dbUser.id}`);

    // 2. Find the customer in Polar
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

    // 3. Get active subscriptions for this customer
    const subscriptionsResponse = await polar.subscriptions.list({
      customerId: customer.id,
      limit: 10
    });

    const polarSubscriptions = subscriptionsResponse.items || [];
    const activeSubscriptions = polarSubscriptions.filter(sub => sub.status === 'active');

    if (activeSubscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active subscriptions found in Polar for this customer',
        allSubscriptions: polarSubscriptions.map(sub => ({
          id: sub.id,
          status: sub.status,
          productId: sub.productId
        }))
      });
    }

    const subscription = activeSubscriptions[0];
    console.log(`✅ Found active subscription: ${subscription.id}`);

    // 4. Manually process the subscription.created webhook
    const webhookUrl = `${process.env.NEXT_PUBLIC_URL}/api/webhooks/polar`;
    
    // Create a subscription.created webhook event payload
    const webhookPayload = {
      id: `admin_manual_${Date.now()}`,
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
          userId: dbUser.id,
          source: 'admin_manual_trigger',
          triggerReason: 'webhook_recovery',
          triggerTime: new Date().toISOString()
        }
      }
    };

    console.log(`🚀 Admin triggering webhook with payload for subscription: ${subscription.id}`);

    // 5. Call our own webhook handler directly
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'polar-signature': 'manual-trigger',
        'user-agent': 'ConvertIQ-Admin-Recovery'
      },
      body: JSON.stringify(webhookPayload)
    });

    const webhookResult = await webhookResponse.text();
    
    if (webhookResponse.ok) {
      console.log(`✅ Admin webhook processing successful for ${userEmail}`);
      return NextResponse.json({
        success: true,
        message: 'Admin webhook triggered successfully',
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name
        },
        subscription: {
          polarId: subscription.id,
          customerId: customer.id,
          status: subscription.status,
          productId: subscription.productId,
          priceId: subscription.priceId
        },
        webhookResult: webhookResult
      });
    } else {
      console.error(`❌ Admin webhook processing failed for ${userEmail}:`, webhookResult);
      return NextResponse.json({
        success: false,
        error: 'Webhook processing failed',
        details: webhookResult
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Admin webhook trigger error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger webhook',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}