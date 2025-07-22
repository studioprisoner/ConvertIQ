import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/connection";
import { user } from "@/db/schema/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email().optional(),
  primaryDomain: z.string().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    // Get session from BetterAuth
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Update user profile
    const updateData: {
      name?: string;
      email?: string;
      emailVerified?: boolean;
      primaryDomain?: string;
      updatedAt?: Date;
    } = {};
    
    // Handle name update
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name.trim();
    }

    // Handle email change separately (requires verification)
    if (validatedData.email && validatedData.email !== session.user.email) {
      // For now, just update the email directly
      // TODO: Implement email verification workflow
      updateData.email = validatedData.email;
      updateData.emailVerified = false; // Reset verification status
    }

    // Handle primary domain update
    if (validatedData.primaryDomain !== undefined) {
      const domain = validatedData.primaryDomain.trim();
      if (domain) {
        // Ensure https:// prefix if domain is provided
        updateData.primaryDomain = domain.startsWith('http') ? domain : `https://${domain}`;
      } else {
        updateData.primaryDomain = null;
      }
    }

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    // Update the user in the database
    const [updatedUser] = await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, session.user.id))
      .returning();

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified,
        image: updatedUser.image,
        avatarUrl: updatedUser.avatarUrl,
        primaryDomain: updatedUser.primaryDomain,
        onboardingCompleted: updatedUser.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}