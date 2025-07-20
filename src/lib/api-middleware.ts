import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { checkFeatureAccess, trackFeatureUsage, FeatureKey } from '@/lib/feature-gate';
import { headers } from 'next/headers';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

/**
 * Middleware to authenticate API requests
 */
export async function withAuth(request: NextRequest): Promise<{ user: any; error?: NextResponse }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return {
        user: null,
        error: NextResponse.json(
          { error: 'Authentication required' }, 
          { status: 401 }
        )
      };
    }

    return { user: session.user };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Authentication failed' }, 
        { status: 401 }
      )
    };
  }
}

/**
 * Middleware to check feature access
 */
export async function withFeatureGate(
  userId: string,
  featureKey: FeatureKey,
  sessionId?: string
): Promise<{ hasAccess: boolean; error?: NextResponse }> {
  try {
    const featureAccess = await checkFeatureAccess(userId, featureKey, sessionId);
    
    if (!featureAccess.hasAccess) {
      return {
        hasAccess: false,
        error: NextResponse.json(
          {
            error: 'Feature access denied',
            featureKey,
            reason: featureAccess.reason,
            upgradeRequired: featureAccess.upgradeRequired,
            currentUsage: featureAccess.currentUsage,
            limit: featureAccess.limit,
          },
          { status: 403 }
        )
      };
    }

    return { hasAccess: true };
  } catch (error) {
    console.error('Feature gate middleware error:', error);
    return {
      hasAccess: false,
      error: NextResponse.json(
        { error: 'Feature access check failed' },
        { status: 500 }
      )
    };
  }
}

/**
 * Combined middleware for authentication and feature gating
 */
export async function withAuthAndFeature(
  request: NextRequest,
  featureKey: FeatureKey
): Promise<{ user: any; hasAccess: boolean; error?: NextResponse }> {
  // First check auth
  const { user, error: authError } = await withAuth(request);
  if (authError) {
    return { user: null, hasAccess: false, error: authError };
  }

  // Then check feature access
  const sessionId = request.headers.get('x-session-id') || undefined;
  const { hasAccess, error: featureError } = await withFeatureGate(user.id, featureKey, sessionId);
  if (featureError) {
    return { user, hasAccess: false, error: featureError };
  }

  return { user, hasAccess: true };
}

/**
 * Helper function to track feature usage after successful API call
 */
export async function trackApiFeatureUsage(
  userId: string,
  featureName: string,
  increment: number = 1,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await trackFeatureUsage(userId, featureName, increment, metadata);
  } catch (error) {
    console.error('Error tracking API feature usage:', error);
    // Don't throw here as this shouldn't break the main API flow
  }
}

/**
 * Wrapper function for API routes that require authentication
 */
export function withAuthHandler(
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { user, error } = await withAuth(request);
    if (error) return error;
    
    return handler(request, user);
  };
}

/**
 * Wrapper function for API routes that require feature access
 */
export function withFeatureHandler(
  featureKey: FeatureKey,
  handler: (request: NextRequest, user: any) => Promise<NextResponse>,
  trackUsage: boolean = false,
  featureName?: string
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { user, hasAccess, error } = await withAuthAndFeature(request, featureKey);
    if (error) return error;
    
    const response = await handler(request, user);
    
    // Track usage if successful and requested
    if (trackUsage && response.status >= 200 && response.status < 300) {
      await trackApiFeatureUsage(
        user.id, 
        featureName || featureKey,
        1,
        { 
          endpoint: request.url,
          method: request.method,
          timestamp: new Date().toISOString()
        }
      );
    }
    
    return response;
  };
}

/**
 * Helper to check subscription limits in API routes
 */
export async function checkSubscriptionLimit(
  userId: string,
  action: 'add_website' | 'scan_website'
): Promise<{ allowed: boolean; reason?: string; upgradeRequired?: boolean }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/subscription`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'check_limits',
          action
        })
      }
    );

    if (!response.ok) {
      return { allowed: false, reason: 'Failed to check limits' };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking subscription limits:', error);
    return { allowed: false, reason: 'Failed to check limits' };
  }
}

/**
 * Rate limiting for API endpoints
 */
const rateLimitMap = new Map<string, number[]>();

export function rateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const requests = rateLimitMap.get(identifier) || [];
  
  // Remove old requests outside the window
  const validRequests = requests.filter(time => time > windowStart);
  
  if (validRequests.length >= maxRequests) {
    return false; // Rate limit exceeded
  }
  
  // Add current request
  validRequests.push(now);
  rateLimitMap.set(identifier, validRequests);
  
  return true; // Request allowed
}

/**
 * Wrapper to add rate limiting to API handlers
 */
export function withRateLimit(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  maxRequests: number = 100,
  windowMs: number = 60000
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    // Use IP address for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    if (!rateLimit(ip, maxRequests, windowMs)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    return handler(request, ...args);
  };
}