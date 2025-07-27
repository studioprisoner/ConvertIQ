import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/connection';
import { user as userTable } from '@/db/schema/auth';
import { websites } from '@/db/schema/websites';
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

    // If primaryDomain was updated, also add it to the websites table if it doesn't exist
    if (primaryDomain) {
      try {
        console.log('🌐 Checking if primary domain exists in websites table...');
        
        // Check if this domain already exists for the user
        const existingWebsite = await db
          .select()
          .from(websites)
          .where(eq(websites.userId, session.user.id))
          .limit(1);

        // If user has no websites, add the primary domain as their first website
        if (existingWebsite.length === 0) {
          console.log('🆕 Adding primary domain to websites table...');
          
          // Extract domain name for the website name
          const domainName = primaryDomain.replace(/^https?:\/\//, '').replace(/^www\./, '');
          const websiteName = domainName.split('.')[0] || 'Primary Website';
          
          await db.insert(websites).values({
            userId: session.user.id,
            url: primaryDomain.trim(),
            name: websiteName.charAt(0).toUpperCase() + websiteName.slice(1),
            description: 'Primary domain from onboarding',
            isValidated: true,
            validationStatus: 'valid',
            lastValidatedAt: new Date(),
          });
          
          console.log('✅ Primary domain added to websites table');
        } else {
          console.log('ℹ️ User already has websites, skipping automatic domain addition');
        }
      } catch (websiteError) {
        console.error('⚠️ Error adding primary domain to websites table:', websiteError);
        // Don't fail the user update if website creation fails
      }
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