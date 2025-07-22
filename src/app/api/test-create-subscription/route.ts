import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSubscription } from '@/lib/subscription-service';

// POST /api/test-create-subscription - Create a test subscription for current user
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test subscription creation API called');
    
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Session found:', {
      userId: session.user.id,
      userEmail: session.user.email
    });

    // Create a basic subscription for testing
    console.log('🆕 Creating test subscription...');
    const subscription = await createSubscription(
      session.user.id,
      session.user.email,
      'basic', // plan type
      'monthly' // billing cycle
    );

    console.log('✅ Test subscription created');

    return NextResponse.json({
      success: true,
      subscription,
      message: 'Test subscription created successfully',
    });

  } catch (error) {
    console.error('❌ Test subscription creation failed:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Test subscription creation failed',
        success: false 
      },
      { status: 500 }
    );
  }
}