import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { 
  getAvailablePlans
} from '@/lib/subscription-service';

// GET /api/test-subscription - Test subscription functionality
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

    // Test 1: Check if plans are available
    const plans = await getAvailablePlans();
    
    // Test 2: Check database connection
    const testResult = {
      user: {
        id: session.user.id,
        email: session.user.email,
      },
      plansCount: plans.length,
      plans: plans.map(p => ({ id: p.id, name: p.name, slug: p.slug })),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Subscription service test successful',
      data: testResult,
    });
  } catch (error) {
    console.error('Test subscription error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Test failed',
        stack: error instanceof Error ? error.stack : undefined 
      },
      { status: 500 }
    );
  }
}