import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// POST /api/auth/refresh-session - Force refresh the user session
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Refresh session API called');
    
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      console.log('❌ No session found in refresh session');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ Current session found:', {
      userId: session.user.id,
      userEmail: session.user.email,
      onboardingCompleted: (session.user as any).onboardingCompleted
    });

    // Force session refresh by getting fresh user data
    const freshSession = await auth.api.getSession({
      headers: request.headers,
      query: { refresh: 'true' }
    });

    console.log('🆕 Fresh session data:', {
      userId: freshSession?.user.id,
      onboardingCompleted: (freshSession?.user as any).onboardingCompleted
    });

    return NextResponse.json({
      success: true,
      session: freshSession?.user,
    });

  } catch (error) {
    console.error('❌ Refresh session error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to refresh session',
        success: false 
      },
      { status: 500 }
    );
  }
}