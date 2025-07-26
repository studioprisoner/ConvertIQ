import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { handleApiError, addBreadcrumb, setUserContext } from '@/lib/sentry-utils';

// GET /api/auth-check - Simple endpoint to check if user is authenticated
export async function GET(request: NextRequest) {
  addBreadcrumb('Auth check initiated', 'auth.check');
  
  try {
    console.log('🔍 Auth check endpoint called');
    
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    console.log('📝 Auth check result:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      headers: {
        cookie: request.headers.get('cookie') ? '[present]' : '[missing]',
        authorization: request.headers.get('authorization') ? '[present]' : '[missing]'
      }
    });

    if (!session) {
      addBreadcrumb('Auth check failed - no session', 'auth.check.failure');
      return NextResponse.json(
        { 
          authenticated: false, 
          error: 'No session found' 
        },
        { status: 401 }
      );
    }

    // Set user context for Sentry
    setUserContext({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name || undefined,
    });

    addBreadcrumb(
      'Auth check successful', 
      'auth.check.success',
      { userId: session.user.id }
    );

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      }
    });

  } catch (error) {
    console.error('❌ Auth check error:', error);
    
    handleApiError(error, {
      component: 'auth-check',
      action: 'session-validation',
      url: request.url,
    });
    
    return NextResponse.json(
      { 
        authenticated: false, 
        error: 'Authentication check failed' 
      },
      { status: 500 }
    );
  }
}