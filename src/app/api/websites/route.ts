import { NextRequest, NextResponse } from 'next/server';
import { withFeatureHandler, withAuthHandler, trackApiFeatureUsage } from '@/lib/api-middleware';
import { db } from '@/db/connection';
import { websites } from '@/db/schema/websites';
import { eq, and, count } from 'drizzle-orm';
import { z } from 'zod';

const createWebsiteSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  name: z.string().min(1, 'Website name is required').max(100),
  description: z.string().max(500).optional(),
});

const updateWebsiteSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Website name is required').max(100).optional(),
  description: z.string().max(500).optional(),
});

// GET /api/websites - List user's websites
export const GET = withAuthHandler(async (request: NextRequest, user: any) => {
  try {
    const userWebsites = await db
      .select({
        id: websites.id,
        url: websites.url,
        name: websites.name,
        description: websites.description,
        createdAt: websites.createdAt,
        updatedAt: websites.updatedAt,
      })
      .from(websites)
      .where(eq(websites.userId, user.id))
      .orderBy(websites.createdAt);

    return NextResponse.json({
      success: true,
      websites: userWebsites,
      count: userWebsites.length,
    });
  } catch (error) {
    console.error('Error fetching websites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch websites' },
      { status: 500 }
    );
  }
});

// POST /api/websites - Create new website (requires multiple_websites feature for more than 1)
export const POST = withAuthHandler(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json();
    const validatedData = createWebsiteSchema.parse(body);

    // Check current website count
    const [websiteCount] = await db
      .select({ count: count() })
      .from(websites)
      .where(eq(websites.userId, user.id));

    const currentCount = websiteCount.count;

    // If user already has 1+ website, check multiple_websites feature
    if (currentCount >= 1) {
      const featureCheckResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/features/check`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': user.id,
          },
          body: JSON.stringify({
            operation: 'check',
            featureKey: 'multiple_websites',
          })
        }
      );

      if (!featureCheckResponse.ok) {
        const featureData = await featureCheckResponse.json();
        return NextResponse.json(
          {
            error: 'Feature access denied',
            reason: 'Multiple websites require Pro plan',
            featureKey: 'multiple_websites',
            upgradeRequired: true,
            currentCount,
            limit: 1,
          },
          { status: 403 }
        );
      }
    }

    // Create the website
    const [newWebsite] = await db
      .insert(websites)
      .values({
        userId: user.id,
        url: validatedData.url,
        name: validatedData.name,
        description: validatedData.description,
      })
      .returning();

    // Track feature usage
    await trackApiFeatureUsage(
      user.id,
      'add_website',
      1,
      {
        websiteUrl: validatedData.url,
        websiteName: validatedData.name,
        totalWebsites: currentCount + 1,
      }
    );

    return NextResponse.json({
      success: true,
      website: newWebsite,
      message: 'Website created successfully',
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid website data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating website:', error);
    return NextResponse.json(
      { error: 'Failed to create website' },
      { status: 500 }
    );
  }
});

// PUT /api/websites - Update website
export const PUT = withAuthHandler(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json();
    const validatedData = updateWebsiteSchema.parse(body);

    // Check if website belongs to user
    const [existingWebsite] = await db
      .select()
      .from(websites)
      .where(
        and(
          eq(websites.id, validatedData.id),
          eq(websites.userId, user.id)
        )
      )
      .limit(1);

    if (!existingWebsite) {
      return NextResponse.json(
        { error: 'Website not found or access denied' },
        { status: 404 }
      );
    }

    // Update the website
    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    
    updateData.updatedAt = new Date();

    const [updatedWebsite] = await db
      .update(websites)
      .set(updateData)
      .where(eq(websites.id, validatedData.id))
      .returning();

    return NextResponse.json({
      success: true,
      website: updatedWebsite,
      message: 'Website updated successfully',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid update data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating website:', error);
    return NextResponse.json(
      { error: 'Failed to update website' },
      { status: 500 }
    );
  }
});

// DELETE /api/websites - Delete website
export const DELETE = withAuthHandler(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get('id');

    if (!websiteId) {
      return NextResponse.json(
        { error: 'Website ID required' },
        { status: 400 }
      );
    }

    // Check if website belongs to user
    const [existingWebsite] = await db
      .select()
      .from(websites)
      .where(
        and(
          eq(websites.id, websiteId),
          eq(websites.userId, user.id)
        )
      )
      .limit(1);

    if (!existingWebsite) {
      return NextResponse.json(
        { error: 'Website not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the website
    await db
      .delete(websites)
      .where(eq(websites.id, websiteId));

    return NextResponse.json({
      success: true,
      message: 'Website deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting website:', error);
    return NextResponse.json(
      { error: 'Failed to delete website' },
      { status: 500 }
    );
  }
});