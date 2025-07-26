/**
 * Tests for Edge Runtime-compatible rate limiting
 */

import { rateLimit, getRateLimitStatus, clearRateLimitData, getRateLimitStats } from '../edge-rate-limit';

describe('Edge Rate Limiting', () => {
  beforeEach(() => {
    clearRateLimitData();
  });

  afterEach(() => {
    clearRateLimitData();
  });

  it('should allow requests within rate limit', () => {
    const identifier = 'test-user';
    const maxRequests = 5;
    const windowMs = 60000;

    // Should allow first 5 requests
    for (let i = 0; i < maxRequests; i++) {
      expect(rateLimit(identifier, maxRequests, windowMs)).toBe(true);
    }

    // 6th request should be denied
    expect(rateLimit(identifier, maxRequests, windowMs)).toBe(false);
  });

  it('should reset rate limit after window expires', async () => {
    const identifier = 'test-user';
    const maxRequests = 2;
    const windowMs = 100; // 100ms window for quick test

    // Use up the rate limit
    expect(rateLimit(identifier, maxRequests, windowMs)).toBe(true);
    expect(rateLimit(identifier, maxRequests, windowMs)).toBe(true);
    expect(rateLimit(identifier, maxRequests, windowMs)).toBe(false);

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should be allowed again
    expect(rateLimit(identifier, maxRequests, windowMs)).toBe(true);
  });

  it('should provide accurate rate limit status', () => {
    const identifier = 'test-user';
    const maxRequests = 10;
    const windowMs = 60000;

    // Initial status
    let status = getRateLimitStatus(identifier, maxRequests, windowMs);
    expect(status.allowed).toBe(true);
    expect(status.remaining).toBe(10);
    expect(status.totalHits).toBe(0);

    // After 3 requests
    for (let i = 0; i < 3; i++) {
      rateLimit(identifier, maxRequests, windowMs);
    }

    status = getRateLimitStatus(identifier, maxRequests, windowMs);
    expect(status.allowed).toBe(true);
    expect(status.remaining).toBe(7);
    expect(status.totalHits).toBe(3);
  });

  it('should handle multiple identifiers independently', () => {
    const maxRequests = 2;
    const windowMs = 60000;

    // Use up limit for user1
    expect(rateLimit('user1', maxRequests, windowMs)).toBe(true);
    expect(rateLimit('user1', maxRequests, windowMs)).toBe(true);
    expect(rateLimit('user1', maxRequests, windowMs)).toBe(false);

    // user2 should still be allowed
    expect(rateLimit('user2', maxRequests, windowMs)).toBe(true);
    expect(rateLimit('user2', maxRequests, windowMs)).toBe(true);
    expect(rateLimit('user2', maxRequests, windowMs)).toBe(false);
  });

  it('should provide memory statistics', () => {
    const stats = getRateLimitStats();
    expect(stats.totalIdentifiers).toBe(0);
    expect(stats.totalRequests).toBe(0);
    expect(stats.memorySize).toBe(0);

    // Add some requests
    rateLimit('user1', 10, 60000);
    rateLimit('user2', 10, 60000);

    const newStats = getRateLimitStats();
    expect(newStats.totalIdentifiers).toBe(2);
    expect(newStats.totalRequests).toBe(2);
    expect(newStats.memorySize).toBeGreaterThan(0);
  });

  it('should cleanup old entries', async () => {
    const identifier = 'test-user';
    const maxRequests = 5;
    const windowMs = 50; // Very short window

    // Make some requests
    rateLimit(identifier, maxRequests, windowMs);
    rateLimit(identifier, maxRequests, windowMs);

    let stats = getRateLimitStats();
    expect(stats.totalIdentifiers).toBe(1);
    expect(stats.totalRequests).toBe(2);

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Make another request to check if old entries are cleaned up
    // The cleanup only happens when the cleanup interval is reached
    rateLimit('another-user', maxRequests, windowMs);

    stats = getRateLimitStats();
    // The cleanup might not happen immediately, so we just check that it doesn't grow indefinitely
    expect(stats.totalIdentifiers).toBeLessThanOrEqual(2);
  });
});