import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { 
  getUserSubscription, 
  checkSubscriptionLimits, 
  getSubscriptionStats,
  createCheckoutSession,
  cancelSubscription,
  reactivateSubscription,
  createSubscriptionWithTrial,
  changeSubscriptionPlan,
  getSubscriptionEventHistory,
  getAvailablePlans,
  getSubscriptionAnalytics
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

    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation');

    switch (operation) {
      case 'analytics':
        const analytics = await getSubscriptionAnalytics(session.user.id);
        return NextResponse.json({ analytics });

      case 'plans':
        const plans = await getAvailablePlans();
        return NextResponse.json({ plans });

      case 'events':
        const limit = parseInt(searchParams.get('limit') || '10');
        const events = await getSubscriptionEventHistory(session.user.id, limit);
        return NextResponse.json({ events });

      default:
        // Default behavior - get subscription and stats
        const subscription = await getUserSubscription(session.user.id);
        const stats = await getSubscriptionStats(session.user.id);
        return NextResponse.json({
          subscription,
          stats,
        });
    }
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
  billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

const planSelectionSchema = z.object({
  planType: z.enum(['basic', 'pro']),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
});

// Removed unused schema

const createTrialSchema = z.object({
  planSlug: z.enum(['basic', 'pro']),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
});

const changePlanSchema = z.object({
  newPlanSlug: z.enum(['basic', 'pro']),
  newBillingCycle: z.enum(['monthly', 'annual']).optional(),
});

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
      
      case 'create_trial':
        return await handleCreateTrial(session.user.id, session.user.email, body);
      
      case 'change_plan':
        return await handleChangePlan(session.user.id, body);
      
      case 'cancel':
        return await handleCancelSubscription(session.user.id);
      
      case 'reactivate':
        return await handleReactivateSubscription(session.user.id);
      
      case 'check_limits':
        return await handleCheckLimits(session.user.id, body);
      
      default:
        // No operation specified - handle direct plan selection from pricing page
        return await handlePlanSelection(session.user.id, session.user.email, body);
    }
  } catch (error) {
    console.error('Error handling subscription operation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: errorMessage },
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
    validatedData.billingCycle,
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

async function handleCreateTrial(userId: string, userEmail: string, body: unknown) {
  const validatedData = createTrialSchema.parse(body);
  
  const subscription = await createSubscriptionWithTrial(
    userId,
    userEmail,
    validatedData.planSlug,
    validatedData.billingCycle
  );
  
  return NextResponse.json({
    success: true,
    subscription,
    message: 'Trial subscription created successfully',
  });
}

async function handleChangePlan(userId: string, body: unknown) {
  const validatedData = changePlanSchema.parse(body);
  
  const subscription = await changeSubscriptionPlan(
    userId,
    validatedData.newPlanSlug,
    validatedData.newBillingCycle
  );
  
  return NextResponse.json({
    success: true,
    subscription,
    message: 'Plan changed successfully',
  });
}

async function handleCheckLimits(userId: string, body: unknown) {
  const validatedData = checkLimitsSchema.parse(body);
  
  const result = await checkSubscriptionLimits(userId, validatedData.action);
  
  return NextResponse.json(result);
}

async function handlePlanSelection(userId: string, userEmail: string, body: unknown) {
  try {
    const validatedData = planSelectionSchema.parse(body);
    
    // Check if user already has a subscription
    const existingSubscription = await getUserSubscription(userId);
    
    if (existingSubscription) {
      // Existing user - change their plan
      const subscription = await changeSubscriptionPlan(
        userId, 
        validatedData.planType, 
        validatedData.billingCycle
      );
      
      return NextResponse.json({
        success: true,
        subscription,
        message: 'Plan changed successfully',
        checkoutUrl: null,
      });
    } else {
      // New user - create trial subscription
      const subscription = await createSubscriptionWithTrial(
        userId,
        userEmail,
        validatedData.planType,
        validatedData.billingCycle
      );
      
      return NextResponse.json({
        success: true,
        subscription,
        message: 'Trial subscription created successfully',
        checkoutUrl: null,
      });
    }
  } catch (error) {
    console.error('Error in plan selection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Plan selection failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}