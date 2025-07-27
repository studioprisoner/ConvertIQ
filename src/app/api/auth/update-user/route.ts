import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/connection';
import { user as userTable } from '@/db/schema/auth';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    console.log('👤 Update user endpoint called');
    
    // Get the current session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session || !session.user) {
      console.log('❌ No authenticated session found');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, primaryDomain } = body;

    // Validate that at least one field is being updated
    if (!name && !primaryDomain) {
      return NextResponse.json(
        { error: 'At least one field (name or primaryDomain) is required' },
        { status: 400 }
      );
    }

    // Validate name if provided
    if (name && (typeof name !== 'string' || name.trim().length < 1)) {
      return NextResponse.json(
        { error: 'Name must be a non-empty string' },
        { status: 400 }
      );
    }

    // Validate primaryDomain if provided
    if (primaryDomain && (typeof primaryDomain !== 'string' || primaryDomain.trim().length < 1)) {
      return NextResponse.json(
        { error: 'Primary domain must be a non-empty string' },
        { status: 400 }
      );
    }

    console.log('🔄 Updating user:', {
      userId: session.user.id,
      currentName: session.user.name,
      updates: { 
        ...(name && { name: name.trim() }),
        ...(primaryDomain && { primaryDomain: primaryDomain.trim() })
      }
    });

    // Prepare update object
    const updateData: {
      updatedAt: Date;
      name?: string;
      primaryDomain?: string;
      onboardingCompleted?: boolean;
    } = {
      updatedAt: new Date(),
    };

    if (name) {
      updateData.name = name.trim();
    }

    if (primaryDomain) {
      updateData.primaryDomain = primaryDomain.trim();
    }

    // Update the user in the database
    const updatedUser = await db
      .update(userTable)
      .set(updateData)
      .where(eq(userTable.id, session.user.id))
      .returning();

    if (updatedUser.length === 0) {
      console.error('❌ No user found to update');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('✅ User updated successfully:', {
      userId: updatedUser[0].id,
      name: updatedUser[0].name,
      primaryDomain: updatedUser[0].primaryDomain,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser[0].id,
        name: updatedUser[0].name,
        email: updatedUser[0].email,
        primaryDomain: updatedUser[0].primaryDomain,
      }
    });

  } catch (error) {
    console.error('❌ Update user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    );
  }
}