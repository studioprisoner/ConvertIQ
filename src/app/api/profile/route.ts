import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/connection";
import { user } from "@/db/schema/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
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
      firstName?: string;
      lastName?: string;
      name?: string;
      email?: string;
      emailVerified?: boolean;
      updatedAt?: Date;
    } = {};
    
    if (validatedData.firstName !== undefined) {
      updateData.firstName = validatedData.firstName;
    }
    
    if (validatedData.lastName !== undefined) {
      updateData.lastName = validatedData.lastName;
    }

    // Generate display name if first/last name provided
    if (validatedData.firstName || validatedData.lastName) {
      const firstName = validatedData.firstName || session.user.firstName || "";
      const lastName = validatedData.lastName || session.user.lastName || "";
      updateData.name = `${firstName} ${lastName}`.trim() || session.user.name;
    }

    // Handle email change separately (requires verification)
    if (validatedData.email && validatedData.email !== session.user.email) {
      // For now, just update the email directly
      // TODO: Implement email verification workflow
      updateData.email = validatedData.email;
      updateData.emailVerified = false; // Reset verification status
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
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified,
        image: updatedUser.image,
        avatarUrl: updatedUser.avatarUrl,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}