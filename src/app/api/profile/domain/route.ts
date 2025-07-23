import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/connection";
import { user } from "@/db/schema/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateDomainSchema = z.object({
  primaryDomain: z.string(),
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
    const validatedData = updateDomainSchema.parse(body);

    // TODO: Check if user can change domain based on billing cycle
    // This would require checking their subscription and current period end
    // For now, we'll allow the change but this should be implemented
    
    const domain = validatedData.primaryDomain.trim();
    const updateData: {
      primaryDomain?: string | null;
      updatedAt?: Date;
    } = {};

    if (domain) {
      // Ensure https:// prefix if domain is provided
      updateData.primaryDomain = domain.startsWith('http') ? domain : `https://${domain}`;
    } else {
      updateData.primaryDomain = null;
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
    console.error("Domain update error:", error);
    
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