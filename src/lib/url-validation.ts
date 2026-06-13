import { z } from 'zod';
import { validateDomainAccess } from './domain-validation';

// ---------------------------------------------------------------------------
// SSRF guard (CON-94)
//
// This module is imported by client components (for the zod schema and
// detectPageType), so it must stay free of top-level Node imports. The pure
// IP checks below run anywhere; the DNS resolution in assertPublicTarget is
// dynamically imported and only runs server-side.
// ---------------------------------------------------------------------------

function parseIPv4(host: string): number[] | null {
  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return null;
  const octets = match.slice(1).map(Number);
  return octets.every(o => o <= 255) ? octets : null;
}

/** Returns true if the IP (v4 or v6) is private, loopback, link-local, or otherwise non-public. */
export function isPrivateIp(ip: string): boolean {
  const v4 = parseIPv4(ip);
  if (v4) {
    const [a, b] = v4;
    return (
      a === 0 ||                            // 0.0.0.0/8
      a === 10 ||                           // 10.0.0.0/8
      a === 127 ||                          // loopback
      (a === 169 && b === 254) ||           // link-local / cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||  // 172.16.0.0/12
      (a === 192 && b === 168) ||           // 192.168.0.0/16
      (a === 100 && b >= 64 && b <= 127)    // 100.64.0.0/10 CGNAT
    );
  }
  if (ip.includes(':')) {
    const lower = ip.toLowerCase();
    if (lower === '::' || lower === '::1') return true;                 // unspecified / loopback
    if (lower.startsWith('fe80:')) return true;                          // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;   // unique-local
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);          // IPv4-mapped IPv6
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }
  return false; // not an IP literal
}

/**
 * Async SSRF guard: rejects URLs whose hostname is an IP literal in a private
 * range, an obviously internal name, or whose DNS resolution includes any
 * private address. DNS resolution only runs server-side; in the browser the
 * pure checks still apply and the server re-validates.
 *
 * Known limitation: DNS is checked at validation time, not pinned into the
 * subsequent fetch, so a malicious resolver could still rebind. Closing that
 * requires a custom dispatcher and is deferred.
 */
export async function assertPublicTarget(url: string): Promise<{ safe: boolean; reason?: string }> {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.replace(/^\[|\]$/g, ''); // strip IPv6 brackets
  } catch {
    return { safe: false, reason: 'Invalid URL' };
  }

  // IP literals (the WHATWG URL parser normalises decimal/octal/hex encodings
  // like http://2130706433/ to dotted-quad form before we get here)
  if (parseIPv4(hostname) || hostname.includes(':')) {
    return isPrivateIp(hostname)
      ? { safe: false, reason: 'Cannot scan private or internal IP addresses' }
      : { safe: true };
  }

  // Obvious non-public hostnames, before DNS
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return { safe: false, reason: 'Cannot scan local or internal hostnames' };
  }

  // DNS resolution check — server-side only
  if (typeof window !== 'undefined') {
    return { safe: true };
  }
  try {
    const { lookup } = await import('node:dns/promises');
    const records = await lookup(hostname, { all: true, verbatim: true });
    for (const record of records) {
      if (isPrivateIp(record.address)) {
        return { safe: false, reason: 'Hostname resolves to a private or internal address' };
      }
    }
    return { safe: true };
  } catch {
    return { safe: false, reason: 'Hostname could not be resolved' };
  }
}

// URL validation schema
export const urlValidationSchema = z.object({
  url: z.string()
    .url('Please enter a valid URL')
    .refine(
      (url) => {
        try {
          const parsedUrl = new URL(url);
          return ['http:', 'https:'].includes(parsedUrl.protocol);
        } catch {
          return false;
        }
      },
      'URL must use HTTP or HTTPS protocol'
    )
    .refine(
      (url) => {
        try {
          const parsedUrl = new URL(url);
          return !['localhost', '127.0.0.1', '0.0.0.0'].includes(parsedUrl.hostname);
        } catch {
          return false;
        }
      },
      'Cannot scan localhost or local IP addresses'
    ),
  pageType: z.enum(['homepage', 'product', 'service', 'landing', 'other']).optional(),
});

export type UrlValidationInput = z.infer<typeof urlValidationSchema>;

// Page type detection based on URL patterns
export function detectPageType(url: string): string {
  const pathname = new URL(url).pathname.toLowerCase();
  
  // Homepage patterns
  if (pathname === '/' || pathname === '' || pathname === '/index.html') {
    return 'homepage';
  }
  
  // Product page patterns
  if (pathname.includes('/product') || pathname.includes('/shop') || pathname.includes('/store')) {
    return 'product';
  }
  
  // Service page patterns
  if (pathname.includes('/service') || pathname.includes('/services') || pathname.includes('/solutions')) {
    return 'service';
  }
  
  // Landing page patterns
  if (pathname.includes('/landing') || pathname.includes('/lp/') || pathname.includes('/campaign')) {
    return 'landing';
  }
  
  return 'other';
}

// URL accessibility check
export async function checkUrlAccessibility(url: string): Promise<{
  isAccessible: boolean;
  statusCode?: number;
  error?: string;
}> {
  try {
    console.log('🌐 Checking URL accessibility:', url);
    
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'ConvertIQ-Scanner/1.0',
      },
      // Don't follow redirects for now - we want to know about them
      redirect: 'manual',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    console.log('✅ URL accessibility check completed:', response.status);

    return {
      isAccessible: response.status < 400,
      statusCode: response.status,
    };
  } catch (error) {
    console.log('❌ URL accessibility check failed:', error);
    
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        isAccessible: false,
        error: 'Request timed out after 10 seconds',
      };
    }
    
    return {
      isAccessible: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  pageType: string;
  statusCode?: number;
  error?: string;
  message?: string;
  suggestedDomain?: string;
  requiresPrimaryDomain?: boolean;
}

// Main validation function
export async function validateUrl(
  url: string, 
  userPageType?: string,
  userPlan?: 'basic' | 'pro' | 'enterprise',
  userPrimaryDomain?: string | null,
  skipAccessibilityCheck?: boolean
): Promise<ValidationResult> {
  // First validate the URL format
  const urlValidation = urlValidationSchema.safeParse({ url, pageType: userPageType });
  
  if (!urlValidation.success) {
    return {
      isValid: false,
      pageType: 'unknown',
      error: urlValidation.error.errors[0].message,
    };
  }

  // Detect page type if not provided
  const detectedPageType = userPageType || detectPageType(url);

  // SSRF guard: block private/internal targets (IP literals, internal names,
  // and hostnames resolving to private addresses)
  const ssrfCheck = await assertPublicTarget(url);
  if (!ssrfCheck.safe) {
    return {
      isValid: false,
      pageType: detectedPageType,
      error: ssrfCheck.reason,
    };
  }

  // Check domain access for basic plan users
  if (userPlan === 'basic') {
    const domainValidation = validateDomainAccess(url, userPrimaryDomain, userPlan);
    
    if (!domainValidation.allowed) {
      return {
        isValid: false,
        pageType: detectedPageType,
        error: domainValidation.reason,
        suggestedDomain: domainValidation.suggestedDomain,
        requiresPrimaryDomain: !userPrimaryDomain,
      };
    }
  }

  // Check if URL is accessible (skip if requested)
  let accessibilityCheck = null;
  if (!skipAccessibilityCheck) {
    accessibilityCheck = await checkUrlAccessibility(url);
    
    if (!accessibilityCheck.isAccessible) {
      return {
        isValid: false,
        pageType: detectedPageType,
        statusCode: accessibilityCheck.statusCode,
        error: accessibilityCheck.error || 'URL is not accessible',
        message: `Failed to access URL: ${accessibilityCheck.error || 'HTTP ' + accessibilityCheck.statusCode}`,
      };
    }
  } else {
    console.log('⏭️ Skipping URL accessibility check as requested');
  }

  return {
    isValid: true,
    pageType: detectedPageType,
    statusCode: accessibilityCheck?.statusCode,
    message: skipAccessibilityCheck ? 'URL is valid (accessibility check skipped)' : 'URL is valid and accessible',
  };
}