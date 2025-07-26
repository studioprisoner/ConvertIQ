import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from './lib/edge-rate-limit';

/**
 * Next.js Middleware for security and performance
 * 
 * This middleware is Edge Runtime compatible and does not use Node.js APIs
 * or database connections.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Security headers (additional to vercel.json)
  const response = NextResponse.next();
  
  // Add security headers
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');
  response.headers.set('X-Powered-By', 'ConvertIQ');
  
  // API routes protection
  if (pathname.startsWith('/api/')) {
    // Rate limiting for API routes
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               request.ip || 
               'unknown';
    
    // Different rate limits for different endpoints
    let maxRequests = 100;
    let windowMs = 60000; // 1 minute
    
    if (pathname.startsWith('/api/auth/')) {
      // Stricter limits for auth endpoints
      maxRequests = 10;
      windowMs = 60000; // 10 requests per minute
    } else if (pathname.startsWith('/api/trpc/')) {
      // Moderate limits for tRPC endpoints
      maxRequests = 50;
      windowMs = 60000; // 50 requests per minute
    } else if (pathname.includes('scan') || pathname.includes('analysis')) {
      // Very strict limits for expensive operations
      maxRequests = 5;
      windowMs = 300000; // 5 requests per 5 minutes
    }
    
    if (!rateLimit(ip, maxRequests, windowMs)) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(windowMs / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil(windowMs / 1000).toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString(),
          }
        }
      );
    }
    
    // Add rate limit headers to successful requests
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());
  }
  
  // Bot protection (basic)
  const userAgent = request.headers.get('user-agent') || '';
  const suspiciousBots = [
    'curl', 'wget', 'python-requests', 'scrapy', 'selenium', 
    'phantomjs', 'headless', 'bot', 'crawler'
  ];
  
  if (pathname.startsWith('/api/') && 
      suspiciousBots.some(bot => userAgent.toLowerCase().includes(bot))) {
    // Allow legitimate crawlers but with restrictions
    if (!userAgent.includes('Googlebot') && 
        !userAgent.includes('Bingbot') && 
        !userAgent.includes('facebookexternalhit')) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
  }
  
  // Prevent access to sensitive files
  const sensitivePatterns = [
    /\.env/,
    /\.git/,
    /\.sql/,
    /backup/i,
    /\.log$/,
    /config\.json$/,
    /package\.json$/
  ];
  
  if (sensitivePatterns.some(pattern => pattern.test(pathname))) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }
  
  // Block suspicious request patterns
  const suspiciousPatterns = [
    /\.\./,           // Directory traversal
    /<script/i,       // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i,   // JavaScript protocol
    /vbscript:/i,     // VBScript protocol
    /data:/i,         // Data URLs (in path)
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(pathname))) {
    console.warn(`🚨 Suspicious request blocked: ${pathname} from ${request.ip}`);
    return NextResponse.json(
      { error: 'Bad request' },
      { status: 400 }
    );
  }
  
  // CORS preflight handling
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'https://convertiq.co',
      'https://www.convertiq.co',
      'https://app.convertiq.co',
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    ].filter(Boolean);
    
    if (origin && allowedOrigins.includes(origin)) {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID',
          'Access-Control-Max-Age': '86400',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }
  }
  
  return response;
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - monitoring (Sentry tunnel)
     */
    '/((?!_next/static|_next/image|favicon.ico|monitoring).*)',
  ],
};