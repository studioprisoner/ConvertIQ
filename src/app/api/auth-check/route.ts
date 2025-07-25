import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import * as Sentry from '@sentry/nextjs';

// GET /api/auth-check - Simple endpoint to check if user is authenticated
export async function GET(request: NextRequest) {
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
      return NextResponse.json(
        { 
          authenticated: false, 
          error: 'No session found' 
        },
        { status: 401 }
      );
    }

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
    Sentry.captureException(error);
    return NextResponse.json(
      { 
        authenticated: false, 
        error: 'Authentication check failed' 
      },
      { status: 500 }
    );
  }
}