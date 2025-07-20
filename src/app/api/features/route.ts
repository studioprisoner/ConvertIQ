import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/api-middleware';
import { 
  checkFeatureAccess, 
  getUserFeatureMap, 
  getFeatureAccessAnalytics,
  FeatureKey 
} from '@/lib/feature-gate';
import { z } from 'zod';

const checkFeatureSchema = z.object({
  featureKey: z.enum([
    'multiple_websites',
    'task_management', 
    'team_collaboration',
    'integrations',
    'advanced_reports',
    'custom_branding',
    'priority_support',
    'unlimited_scans',
    'api_access',
    'white_label'
  ]),
  sessionId: z.string().optional(),
});

// GET /api/features - Get user's feature access map
export const GET = withAuthHandler(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation');

    switch (operation) {
      case 'analytics': {
        // Admin-only feature analytics
        const days = parseInt(searchParams.get('days') || '30');
        const analytics = await getFeatureAccessAnalytics(days);
        return NextResponse.json({ analytics });
      }

      case 'check': {
        // Check specific feature access
        const featureKey = searchParams.get('featureKey') as FeatureKey;
        const sessionId = searchParams.get('sessionId') || undefined;

        if (!featureKey) {
          return NextResponse.json(
            { error: 'featureKey parameter required' },
            { status: 400 }
          );
        }

        const featureAccess = await checkFeatureAccess(user.id, featureKey, sessionId);
        return NextResponse.json({ featureAccess });
      }

      default: {
        // Default: Get full feature map
        const featureMap = await getUserFeatureMap(user.id);
        return NextResponse.json({ featureMap });
      }
    }
  } catch (error) {
    console.error('Error in features API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST /api/features - Check feature access or track usage
export const POST = withAuthHandler(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json();
    const { operation } = body;

    switch (operation) {
      case 'check': {
        const validatedData = checkFeatureSchema.parse(body);
        const featureAccess = await checkFeatureAccess(
          user.id, 
          validatedData.featureKey,
          validatedData.sessionId
        );
        
        return NextResponse.json({ 
          success: true,
          featureAccess 
        });
      }

      default: {
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in features API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});