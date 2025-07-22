import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/connection';
import { user } from '@/db/schema/auth';
import { eq } from 'drizzle-orm';

// GET /api/auth/check-onboarding - Check if user has completed onboarding
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Check onboarding API called');
    
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      console.log('❌ No session found in check onboarding');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ Session found, checking database for onboarding status...');

    // Query database directly for the most up-to-date onboarding status
    const [userData] = await db
      .select({
        id: user.id,
        onboardingCompleted: user.onboardingCompleted,
        primaryDomain: user.primaryDomain,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!userData) {
      console.error('❌ User not found in database');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('📋 Database onboarding status:', {
      userId: userData.id,
      onboardingCompleted: userData.onboardingCompleted,
      primaryDomain: userData.primaryDomain
    });

    return NextResponse.json({
      success: true,
      onboardingCompleted: userData.onboardingCompleted,
      primaryDomain: userData.primaryDomain,
    });

  } catch (error) {
    console.error('❌ Check onboarding error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to check onboarding status',
        success: false 
      },
      { status: 500 }
    );
  }
}