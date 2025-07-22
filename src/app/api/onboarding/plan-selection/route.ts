import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { 
  createSubscription,
  trackPlanSelection,
  type UserSubscription
} from '@/lib/subscription-service';
import { z } from 'zod';

const planSelectionSchema = z.object({
  planType: z.enum(['basic', 'pro']),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
});

// POST /api/onboarding/plan-selection - Handle plan selection during registration
export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Onboarding plan selection API called');
    
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      console.log('❌ No session found in plan selection');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ Session found:', {
      userId: session.user.id,
      userEmail: session.user.email
    });

    const body = await request.json();
    const validatedData = planSelectionSchema.parse(body);

    console.log('📝 Plan selection data:', validatedData);

    // Track plan selection for analytics
    await trackPlanSelection(
      session.user.id, 
      validatedData.planType, 
      'registration_onboarding'
    );

    // Create subscription
    console.log('🆕 Creating subscription...');
    const subscription = await createSubscription(
      session.user.id,
      session.user.email,
      validatedData.planType,
      validatedData.billingCycle
    );

    console.log('✅ Subscription created successfully:', {
      subscriptionId: subscription?.id || 'N/A',
      planSlug: validatedData.planType,
      status: subscription?.status || 'N/A'
    });

    // Check if we need to redirect to checkout
    const subscriptionWithPayment = subscription as UserSubscription & {
      requiresPayment?: boolean;
      checkoutUrl?: string;
      message?: string;
    };
    
    if (subscriptionWithPayment.requiresPayment && subscriptionWithPayment.checkoutUrl) {
      return NextResponse.json({
        success: true,
        requiresPayment: true,
        checkoutUrl: subscriptionWithPayment.checkoutUrl,
        message: subscriptionWithPayment.message || 'Redirecting to payment...',
      });
    }
    
    return NextResponse.json({
      success: true,
      requiresPayment: false,
      subscription,
      message: 'Plan selected successfully',
    });

  } catch (error) {
    console.error('❌ Plan selection error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Plan selection failed',
        success: false 
      },
      { status: 500 }
    );
  }
}