import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/db/connection';
import { subscriptions, subscriptionEvents, usageTracking } from '@/db/schema/subscriptions';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import type { 
  PolarWebhookEvent, 
  SubscriptionCreatedData, 
  SubscriptionUpdatedData,
  PaymentEventData 
} from '@/types/polar';

// Verify Polar webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('polar-signature');
    
    if (!signature || !process.env.POLAR_WEBHOOK_SECRET) {
      console.error('Missing signature or webhook secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify webhook signature
    if (!verifySignature(body, signature, process.env.POLAR_WEBHOOK_SECRET)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event: PolarWebhookEvent = JSON.parse(body);
    const { type, data } = event;

    console.log('Polar webhook received:', { type, id: data?.id });

    // Store the event for audit trail
    await db.insert(subscriptionEvents).values({
      subscriptionId: data?.subscription_id || data?.id,
      eventType: type,
      eventData: data,
      polarEventId: event.id,
      processed: false,
    });

    // Handle different event types
    switch (type) {
      case 'subscription.created':
        await handleSubscriptionCreated(data);
        break;
      
      case 'subscription.updated':
        await handleSubscriptionUpdated(data);
        break;
      
      case 'subscription.canceled':
        await handleSubscriptionCanceled(data);
        break;
      
      case 'subscription.trial_will_end':
        await handleTrialWillEnd(data);
        break;
      
      case 'payment.succeeded':
        await handlePaymentSucceeded(data);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(data);
        break;
      
      default:
        console.log('Unhandled webhook event type:', type);
    }

    // Mark event as processed
    await db
      .update(subscriptionEvents)
      .set({ processed: true })
      .where(eq(subscriptionEvents.polarEventId, event.id));

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCreated(data: SubscriptionCreatedData) {
  try {
    // Find existing subscription or create new one
    const existingSubscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.polarSubscriptionId, data.id))
      .limit(1);

    if (existingSubscription.length === 0) {
      // Create new subscription record
      const [newSubscription] = await db
        .insert(subscriptions)
        .values({
          userId: data.metadata?.userId, // This should be set when creating the subscription
          planId: data.metadata?.planId,
          polarSubscriptionId: data.id,
          polarCustomerId: data.customer_id,
          polarProductId: data.product_id,
          polarPriceId: data.price_id,
          status: data.status,
          currentPeriodStart: new Date(data.current_period_start),
          currentPeriodEnd: new Date(data.current_period_end),
          trialStart: data.trial_start ? new Date(data.trial_start) : null,
          trialEnd: data.trial_end ? new Date(data.trial_end) : null,
          metadata: data,
        })
        .returning();

      // Initialize usage tracking for the new subscription
      await db.insert(usageTracking).values({
        userId: data.metadata?.userId,
        subscriptionId: newSubscription.id,
        websiteCount: 0,
        scansThisMonth: 0,
        periodStart: new Date(data.current_period_start),
        periodEnd: new Date(data.current_period_end),
      });
    }

    console.log('Subscription created:', data.id);
  } catch (error) {
    console.error('Error handling subscription created:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(data: SubscriptionUpdatedData) {
  try {
    await db
      .update(subscriptions)
      .set({
        status: data.status,
        currentPeriodStart: new Date(data.current_period_start),
        currentPeriodEnd: new Date(data.current_period_end),
        canceledAt: data.canceled_at ? new Date(data.canceled_at) : null,
        cancelAtPeriodEnd: data.cancel_at_period_end || false,
        metadata: data,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.polarSubscriptionId, data.id));

    console.log('Subscription updated:', data.id);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
    throw error;
  }
}

async function handleSubscriptionCanceled(data: SubscriptionUpdatedData) {
  try {
    await db
      .update(subscriptions)
      .set({
        status: 'canceled',
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.polarSubscriptionId, data.id));

    console.log('Subscription canceled:', data.id);
  } catch (error) {
    console.error('Error handling subscription canceled:', error);
    throw error;
  }
}

async function handleTrialWillEnd(data: SubscriptionUpdatedData) {
  // TODO: Send email notification to user about trial ending
  console.log('Trial will end for subscription:', data.id);
}

async function handlePaymentSucceeded(data: PaymentEventData) {
  // TODO: Update subscription status and send confirmation email
  console.log('Payment succeeded for subscription:', data.subscription_id);
}

async function handlePaymentFailed(data: PaymentEventData) {
  // TODO: Handle failed payment, send email notification
  console.log('Payment failed for subscription:', data.subscription_id);
}