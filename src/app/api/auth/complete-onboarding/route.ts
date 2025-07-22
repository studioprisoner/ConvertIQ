import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/connection';
import { user } from '@/db/schema/auth';
import { eq } from 'drizzle-orm';

// POST /api/auth/complete-onboarding - Mark user's onboarding as completed
export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Complete onboarding API called');
    
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      console.log('❌ No session found in complete onboarding');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ Session found:', {
      userId: session.user.id,
      userEmail: session.user.email
    });

    // Update user to mark onboarding as completed
    console.log('💾 Updating user onboarding status...');
    const updatedUsers = await db
      .update(user)
      .set({ 
        onboardingCompleted: true,
        updatedAt: new Date()
      })
      .where(eq(user.id, session.user.id))
      .returning();

    console.log('📋 Database update result:', {
      updatedCount: updatedUsers.length,
      updatedUser: updatedUsers.length > 0 ? {
        id: updatedUsers[0].id,
        onboardingCompleted: updatedUsers[0].onboardingCompleted
      } : 'No user updated'
    });

    if (updatedUsers.length === 0) {
      console.error('❌ No user was updated');
      return NextResponse.json(
        { error: 'User not found or update failed' },
        { status: 404 }
      );
    }

    console.log('✅ Onboarding completion successful');
    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
    });

  } catch (error) {
    console.error('❌ Complete onboarding error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to complete onboarding',
        success: false 
      },
      { status: 500 }
    );
  }
}