import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/db/connection';
import { subscriptions, subscriptionEvents, usageTracking, subscriptionPlans, planPrices } from '@/db/schema/subscriptions';
import { user } from '@/db/schema/auth';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { polar } from '@/lib/polar';
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
    
    // Allow manual triggers to bypass signature verification
    const isManualTrigger = signature === 'manual-trigger';
    
    if (!isManualTrigger) {
      if (!signature || !process.env.POLAR_WEBHOOK_SECRET) {
        console.error('Missing signature or webhook secret');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Verify webhook signature for real webhooks
      if (!verifySignature(body, signature, process.env.POLAR_WEBHOOK_SECRET)) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      console.log('🔧 Processing manual webhook trigger (signature verification bypassed)');
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
        await handleSubscriptionCreated(data as any);
        break;
      
      case 'subscription.updated':
        await handleSubscriptionUpdated(data as any);
        break;
      
      case 'subscription.canceled':
        await handleSubscriptionCanceled(data as any);
        break;
      
      case 'subscription.trial_will_end':
        await handleTrialWillEnd(data as any);
        break;
      
      case 'payment.succeeded':
        await handlePaymentSucceeded(data as any);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(data as any);
        break;
      
      case 'order.paid':
        await handleOrderPaid(data as any);
        break;
      
      case 'customer.created':
      case 'customer.updated':
        await handleCustomerEvent(data as any, type);
        break;
      
      case 'checkout.created':
      case 'checkout.updated':
        await handleCheckoutEvent(data as any, type);
        break;
      
      case 'order.created':
        await handleOrderCreated(data as any);
        break;
      
      case 'subscription.uncanceled':
      case 'subscription.revoked':
      case 'subscription.active':
        await handleSubscriptionStatusChange(data as any, type);
        break;
      
      case 'customer.deleted':
      case 'customer.state_changed':
        await handleCustomerEvent(data as any, type);
        break;
      
      case 'order.updated':
      case 'order.refunded':
        await handleOrderEvent(data as any, type);
        break;
      
      case 'refund.created':
      case 'refund.updated':
        await handleRefundEvent(data as any, type);
        break;
      
      case 'product.created':
      case 'product.updated':
      case 'benefit.created':
      case 'benefit.updated':
      case 'benefit_grant.created':
      case 'benefit_grant.cycled':
      case 'benefit_grant.updated':
      case 'benefit_grant.revoked':
      case 'organization.updated':
        await handleInformationalEvent(data as any, type);
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
    console.log('🔄 Processing subscription.created webhook:', data.id);
    
    // Find existing subscription or create new one
    const existingSubscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.polarSubscriptionId, data.id))
      .limit(1);

    if (existingSubscription.length === 0) {
      console.log('📝 Creating new subscription record for:', data.id);
      
      // Get userId and planId from metadata or look them up
      let userId = (data.metadata as any)?.userId;
      let planId = (data.metadata as any)?.planId;
      
      // If userId is missing, try to find the user by customer email
      if (!userId) {
        console.log('⚠️ userId missing from metadata, looking up customer in Polar...');
        try {
          const customer = await polar.customers.get(data.customer_id);
          if (customer?.email) {
            console.log(`🔍 Found customer email: ${customer.email}`);
            const [dbUser] = await db
              .select()
              .from(user)
              .where(eq(user.email, customer.email))
              .limit(1);
            
            if (dbUser) {
              userId = dbUser.id;
              console.log(`✅ Found user in database: ${userId}`);
            } else {
              console.error(`❌ No user found in database for email: ${customer.email}`);
              throw new Error(`No user found for customer email: ${customer.email}`);
            }
          }
        } catch (error) {
          console.error('❌ Failed to lookup customer:', error);
          throw new Error(`Failed to lookup customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // If planId is missing, try to find it by priceId
      if (!planId) {
        console.log('⚠️ planId missing from metadata, looking up by priceId...');
        const [priceMapping] = await db
          .select({ planId: planPrices.planId })
          .from(planPrices)
          .where(eq(planPrices.polarPriceId, data.price_id))
          .limit(1);
        
        if (priceMapping) {
          planId = priceMapping.planId;
          console.log(`✅ Found plan via priceId: ${planId}`);
        } else {
          console.log('⚠️ No plan found via priceId, attempting to determine from product...');
          // Fallback: try to determine plan from product name or create mapping
          try {
            const product = await polar.products.get(data.product_id);
            const productName = product?.name?.toLowerCase() || '';
            const planSlug = productName.includes('pro') ? 'pro' : 'basic';
            
            console.log(`🎯 Determined plan slug from product name "${product?.name}": ${planSlug}`);
            
            const [plan] = await db
              .select()
              .from(subscriptionPlans)
              .where(eq(subscriptionPlans.slug, planSlug))
              .limit(1);
            
            if (plan) {
              planId = plan.id;
              console.log(`✅ Found plan by slug: ${planId}`);
            } else {
              console.error(`❌ No plan found for slug: ${planSlug}`);
              throw new Error(`No plan found for slug: ${planSlug}`);
            }
          } catch (error) {
            console.error('❌ Failed to determine plan:', error);
            throw new Error(`Failed to determine plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
      
      if (!userId || !planId) {
        console.error('❌ Missing required data:', { userId, planId });
        throw new Error(`Missing required data: userId=${userId}, planId=${planId}`);
      }
      
      console.log(`💾 Creating subscription with userId: ${userId}, planId: ${planId}`);
      
      // Create new subscription record
      const [newSubscription] = await db
        .insert(subscriptions)
        .values({
          userId: userId,
          planId: planId,
          polarSubscriptionId: data.id,
          polarCustomerId: data.customer_id,
          polarProductId: data.product_id,
          polarPriceId: data.price_id,
          status: data.status,
          currentPeriodStart: new Date(data.current_period_start),
          currentPeriodEnd: new Date(data.current_period_end),
          trialStart: data.trial_start ? new Date(data.trial_start) : null,
          trialEnd: data.trial_end ? new Date(data.trial_end) : null,
          metadata: {
            ...data,
            webhookProcessedAt: new Date().toISOString(),
            userLookupMethod: (data.metadata as any)?.userId ? 'metadata' : 'customer_email',
            planLookupMethod: (data.metadata as any)?.planId ? 'metadata' : 'price_mapping'
          },
        })
        .returning();

      console.log(`✅ Created subscription record: ${newSubscription.id}`);

      // Initialize usage tracking for the new subscription
      await db.insert(usageTracking).values({
        userId: userId,
        subscriptionId: newSubscription.id,
        websiteCount: 0,
        scansThisMonth: 0,
        periodStart: new Date(data.current_period_start),
        periodEnd: new Date(data.current_period_end),
      });
      
      console.log(`✅ Initialized usage tracking for subscription: ${newSubscription.id}`);
    } else {
      console.log(`ℹ️ Subscription already exists: ${data.id}`);
    }

    console.log('✅ Subscription created webhook processed successfully:', data.id);
  } catch (error) {
    console.error('❌ Error handling subscription created:', error);
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

async function handleOrderPaid(data: any) {
  try {
    console.log('🔄 Processing order.paid webhook:', data.id);
    
    // Check if this order has a subscription (subscription orders)
    if (!data.subscription_id || !data.subscription) {
      console.log('ℹ️ Order does not contain subscription, skipping');
      return;
    }
    
    const subscriptionData = data.subscription;
    console.log('📝 Creating subscription from order.paid event:', subscriptionData.id);
    
    // Use the same logic as subscription.created but with subscription data from the order
    await handleSubscriptionCreated(subscriptionData);
    
    console.log('✅ Order paid webhook processed successfully:', data.id);
  } catch (error) {
    console.error('❌ Error handling order paid:', error);
    throw error;
  }
}

async function handleCustomerEvent(data: any, eventType: string) {
  console.log(`ℹ️ Customer event ${eventType}:`, data.id);
  // We don't need to do anything special for customer events currently
  // Just log and acknowledge
}

async function handleCheckoutEvent(data: any, eventType: string) {
  console.log(`ℹ️ Checkout event ${eventType}:`, data.id);
  // We don't need to do anything special for checkout events currently
  // Just log and acknowledge
}

async function handleOrderCreated(data: any) {
  console.log('ℹ️ Order created:', data.id);
  // We don't need to do anything special for order creation currently
  // The important event is order.paid
}

async function handleSubscriptionStatusChange(data: any, eventType: string) {
  try {
    console.log(`🔄 Processing ${eventType} webhook:`, data.id);
    
    let newStatus = data.status || 'active';
    if (eventType === 'subscription.uncanceled' || eventType === 'subscription.active') {
      newStatus = 'active';
    } else if (eventType === 'subscription.revoked') {
      newStatus = 'canceled';
    }
    
    await db
      .update(subscriptions)
      .set({
        status: newStatus,
        canceledAt: eventType === 'subscription.revoked' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.polarSubscriptionId, data.id));

    console.log(`✅ Subscription ${eventType} processed:`, data.id);
  } catch (error) {
    console.error(`❌ Error handling ${eventType}:`, error);
    throw error;
  }
}

async function handleOrderEvent(data: any, eventType: string) {
  console.log(`ℹ️ Order event ${eventType}:`, data.id);
  // We don't need to do anything special for order updates/refunds currently
  // Just log and acknowledge
}

async function handleRefundEvent(data: any, eventType: string) {
  console.log(`ℹ️ Refund event ${eventType}:`, data.id);
  // TODO: In the future, we might want to handle refunds by updating subscription status
  // For now, just log and acknowledge
}

async function handleInformationalEvent(data: any, eventType: string) {
  console.log(`ℹ️ Informational event ${eventType}:`, data.id || 'N/A');
  // These are informational events that don't require action
  // Just log and acknowledge
}