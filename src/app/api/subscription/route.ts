import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { 
  getUserSubscription, 
  checkSubscriptionLimits, 
  getSubscriptionStats,
  createCheckoutSession,
  cancelSubscription,
  reactivateSubscription
} from '@/lib/subscription-service';
import { z } from 'zod';

// GET /api/subscription - Get user's subscription details
export async function GET(request: NextRequest) {
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

    const subscription = await getUserSubscription(session.user.id);
    const stats = await getSubscriptionStats(session.user.id);

    return NextResponse.json({
      subscription,
      stats,
    });
  } catch (error) {
    console.error('Error getting subscription:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    );
  }
}

const createCheckoutSchema = z.object({
  planType: z.enum(['basic', 'pro']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

// Removed unused schema

const checkLimitsSchema = z.object({
  action: z.enum(['add_website', 'scan_website']),
});

// POST /api/subscription - Handle subscription actions
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

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation');

    switch (operation) {
      case 'create_checkout':
        return await handleCreateCheckout(session.user.id, body);
      
      case 'cancel':
        return await handleCancelSubscription(session.user.id);
      
      case 'reactivate':
        return await handleReactivateSubscription(session.user.id);
      
      case 'check_limits':
        return await handleCheckLimits(session.user.id, body);
      
      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error handling subscription operation:', error);
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    );
  }
}

async function handleCreateCheckout(userId: string, body: unknown) {
  const validatedData = createCheckoutSchema.parse(body);
  
  const defaultSuccessUrl = `${process.env.NEXT_PUBLIC_URL}/dashboard?success=true`;
  const defaultCancelUrl = `${process.env.NEXT_PUBLIC_URL}/dashboard/billing?canceled=true`;
  
  const checkoutSession = await createCheckoutSession(
    userId,
    validatedData.planType,
    validatedData.successUrl || defaultSuccessUrl,
    validatedData.cancelUrl || defaultCancelUrl
  );

  return NextResponse.json({
    checkoutUrl: checkoutSession.checkoutUrl,
    sessionId: checkoutSession.sessionId,
  });
}

async function handleCancelSubscription(userId: string) {
  const success = await cancelSubscription(userId);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Subscription will be canceled at the end of the current period',
  });
}

async function handleReactivateSubscription(userId: string) {
  const success = await reactivateSubscription(userId);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Subscription has been reactivated',
  });
}

async function handleCheckLimits(userId: string, body: unknown) {
  const validatedData = checkLimitsSchema.parse(body);
  
  const result = await checkSubscriptionLimits(userId, validatedData.action);
  
  return NextResponse.json(result);
}