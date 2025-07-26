/**
 * Edge Runtime-compatible rate limiting
 * 
 * This module provides rate limiting functionality that works in the Edge Runtime
 * without any Node.js dependencies or database connections.
 */

/**
 * Enhanced rate limiting for Edge Runtime with persistence and cleanup
 */
const rateLimitMap = new Map<string, {
  requests: number[];
  lastCleanup: number;
}>();

// Clean up old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;

export function rateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Get or create rate limit data
  let rateLimitData = rateLimitMap.get(identifier);
  if (!rateLimitData) {
    rateLimitData = { requests: [], lastCleanup: now };
    rateLimitMap.set(identifier, rateLimitData);
  }
  
  // Periodic cleanup to prevent memory leaks
  if (now - rateLimitData.lastCleanup > CLEANUP_INTERVAL) {
    // Clean up old identifiers
    for (const [key, data] of rateLimitMap.entries()) {
      const validRequests = data.requests.filter(time => time > windowStart);
      if (validRequests.length === 0 && now - data.lastCleanup > CLEANUP_INTERVAL) {
        rateLimitMap.delete(key);
      } else {
        data.requests = validRequests;
        data.lastCleanup = now;
      }
    }
    rateLimitData.lastCleanup = now;
  }
  
  // Remove old requests outside the window
  const validRequests = rateLimitData.requests.filter(time => time > windowStart);
  
  if (validRequests.length >= maxRequests) {
    return false; // Rate limit exceeded
  }
  
  // Add current request
  validRequests.push(now);
  rateLimitData.requests = validRequests;
  
  return true; // Request allowed
}

/**
 * Get rate limit status for an identifier
 */
export function getRateLimitStatus(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
} {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const rateLimitData = rateLimitMap.get(identifier);
  const requests = rateLimitData?.requests || [];
  const validRequests = requests.filter(time => time > windowStart);
  
  return {
    allowed: validRequests.length < maxRequests,
    remaining: Math.max(0, maxRequests - validRequests.length),
    resetTime: now + windowMs,
    totalHits: validRequests.length,
  };
}

/**
 * Get current memory usage statistics (for monitoring in development)
 */
export function getRateLimitStats(): {
  totalIdentifiers: number;
  totalRequests: number;
  memorySize: number;
} {
  let totalRequests = 0;
  let memorySize = 0;
  
  for (const [identifier, data] of rateLimitMap.entries()) {
    totalRequests += data.requests.length;
    // Rough memory calculation (each entry is roughly 50-100 bytes)
    memorySize += identifier.length + data.requests.length * 8 + 16;
  }
  
  return {
    totalIdentifiers: rateLimitMap.size,
    totalRequests,
    memorySize,
  };
}

/**
 * Clear all rate limit data (useful for testing)
 */
export function clearRateLimitData(): void {
  rateLimitMap.clear();
}